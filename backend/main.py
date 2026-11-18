import json
import os
import ssl
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import certifi
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from unidecode import unidecode

from routes.data import router as data_router

# Charge les variables du fichier backend/.env (dont API_FOOTBALL_KEY)
# dans l'environnement du processus.
load_dotenv()

# Contexte SSL basé sur le magasin de certificats de `certifi`, à jour
_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

app = FastAPI(title="Gambeta API")


@app.on_event("startup")
def ensure_schema():
    """Met la base au niveau du code au démarrage : crée les tables manquantes."""
    from sqlalchemy import text

    from db.models import Base
    from db.session import engine

    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE players ADD COLUMN IF NOT EXISTS understat_id INTEGER"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Routes /api/data/* : nos propres données collectées (PostgreSQL), voir routes/data.py.
app.include_router(data_router)

# Hôte direct de l'API-Football (API-Sports), pas le proxy RapidAPI.
API_FOOTBALL_HOST = "https://v3.football.api-sports.io"

# Les 5 grands championnats à garder, indexés par leur id API-Football.
LEAGUES_WHITELIST = {
    61: {"slug": "ligue-1", "country": "France"},
    39: {"slug": "premier-league", "country": "England"},
    140: {"slug": "liga", "country": "Spain"},
    135: {"slug": "serie-a", "country": "Italy"},
    78: {"slug": "bundesliga", "country": "Germany"},
}

# Cache en mémoire très simple : un seul processus, une seule entrée.
CACHE_TTL_SECONDS = 24 * 60 * 60
_leagues_payload_cache = {"payload": None, "expires_at": 0.0}


@app.get("/")
def read_root():
    return {"message": "Gambeta API is running"}


def _fetch_leagues_from_api_football(api_key):
    """Appelle l'endpoint /leagues de l'API-Football et renvoie le payload JSON. Lève une
    HTTPException."""
    request = Request(
        f"{API_FOOTBALL_HOST}/leagues",
        headers={"x-apisports-key": api_key},
    )
    try:
        with urlopen(request, timeout=15, context=_SSL_CONTEXT) as response:
            return json.load(response)
    except HTTPError as error:
        # Ex : clé invalide -> souvent 403, mauvaise requête -> 400, etc.
        raise HTTPException(
            status_code=502,
            detail=f"L'API-Football a répondu une erreur HTTP {error.code}.",
        ) from error
    except URLError as error:
        # Pas de connexion internet, DNS injoignable, etc.
        raise HTTPException(
            status_code=502,
            detail="Impossible de joindre l'API-Football (vérifiez la connexion).",
        ) from error
    except (TimeoutError, json.JSONDecodeError) as error:
        raise HTTPException(
            status_code=502,
            detail="Réponse invalide ou trop lente de l'API-Football.",
        ) from error


def _get_leagues_payload():
    """Retourne le payload brut de /leagues de l'API-Football."""
    now = time.time()
    if _leagues_payload_cache["payload"] is not None and now < _leagues_payload_cache["expires_at"]:
        return _leagues_payload_cache["payload"], True

    api_key = os.getenv("API_FOOTBALL_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="API_FOOTBALL_KEY n'est pas configurée (vérifiez backend/.env).",
        )

    payload = _fetch_leagues_from_api_football(api_key)

    # L'API-Football répond parfois en 200 OK avec un champ "errors" rempli
    # (clé invalide, quota journalier dépassé...) plutôt qu'un vrai code d'erreur HTTP
    api_errors = payload.get("errors")
    if api_errors:
        raise HTTPException(
            status_code=502,
            detail=f"Erreur renvoyée par l'API-Football : {api_errors}",
        )

    _leagues_payload_cache["payload"] = payload
    _leagues_payload_cache["expires_at"] = now + CACHE_TTL_SECONDS
    return payload, False


def _filter_by_whitelist(payload, whitelist):
    """Filtre le payload brut de /leagues sur les ids présents dans `whitelist`."""
    results = []
    for item in payload.get("response", []):
        league = item.get("league", {})
        league_id = league.get("id")
        whitelist_entry = whitelist.get(league_id)
        if whitelist_entry is None:
            continue
        results.append(
            {
                "id": whitelist_entry["slug"],
                "name": league.get("name"),
                "country": item.get("country", {}).get("name"),
                "logo": league.get("logo"),
            }
        )
    return results


@app.get("/api/leagues")
def get_leagues():
    """Retourne les 5 grands championnats européens (nom, pays, logo, id)."""
    payload, cached = _get_leagues_payload()
    leagues = _filter_by_whitelist(payload, LEAGUES_WHITELIST)
    return {"leagues": leagues, "cached": cached}


# ---------------------------------------------------------------------------
# Photos des joueurs (visages en stickers sur les graphiques)
# ---------------------------------------------------------------------------
# Nos noms de joueurs viennent d'Understat/FBref, pas de l'API-Football
PHOTO_CACHE_FILE = Path(__file__).parent / "cache" / "player_photos.json"

# Plan gratuit API-Football : 10 appels par minute maximum.
MAX_CALLS_PER_MINUTE = 8
_photo_call_times = []


class _RateLimited(Exception):
    """Quota de la minute atteint, ou refus de l'API : réessayer plus tard."""


def _load_photo_cache():
    if PHOTO_CACHE_FILE.exists():
        return json.loads(PHOTO_CACHE_FILE.read_text(encoding="utf-8"))
    return {}


def _save_photo_cache(cache):
    PHOTO_CACHE_FILE.parent.mkdir(exist_ok=True)
    PHOTO_CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


def _name_tokens(name):
    """"Kylian Mbappé-Lottin" -> {"kylian", "mbappe", "lottin"}"""
    cleaned = unidecode(name or "").lower().replace("-", " ").replace(".", " ")
    return {token for token in cleaned.split() if len(token) > 1}


def _call_profiles_api(api_key, term):
    """Un appel à /players/profiles, en respectant la limite par minute."""
    now = time.time()
    _photo_call_times[:] = [t for t in _photo_call_times if now - t < 60]
    if len(_photo_call_times) >= MAX_CALLS_PER_MINUTE:
        raise _RateLimited()
    _photo_call_times.append(now)

    request = Request(
        f"{API_FOOTBALL_HOST}/players/profiles?{urlencode({'search': term})}",
        headers={"x-apisports-key": api_key},
    )
    try:
        with urlopen(request, timeout=15, context=_SSL_CONTEXT) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise _RateLimited() from error
    # L'API répond 200 avec un champ "errors" rempli en cas de problème
    errors = payload.get("errors")
    if errors:
        print(f"[player-photos] API-Football a refusé '{term}' : {errors}")
        if isinstance(errors, dict) and errors.keys() & {"rateLimit", "requests", "token"}:
            raise _RateLimited()
        return {"response": []}
    return payload


def _search_player_photo(api_key, name):
    """Renvoie l'URL de la photo de `name`, None si le joueur est introuvable."""
    tokens = _name_tokens(name)
    words = [w for w in name.replace("-", " ").split() if len(w) >= 3]
    if not tokens or not words:
        return None
    # Recherche sur le nom de famille : dernier mot, puis le plus long
    terms = [words[-1], max(words, key=len)]
    terms += [unidecode(t) for t in terms]
    # Dernier recours : sans les lettres non ASCII ("Ødegaard" -> "degaard")
    terms += ["".join(c for c in t if c.isascii()) for t in terms[:2]]
    terms = [t for t in terms if len(t) >= 3]
    for term in dict.fromkeys(terms):
        payload = _call_profiles_api(api_key, term)
        best_photo, best_score = None, 0
        for item in payload.get("response", []):
            profile = item.get("player", {})
            profile_tokens = _name_tokens(
                f"{profile.get('firstname', '')} {profile.get('lastname', '')} {profile.get('name', '')}"
            )
            score = len(tokens & profile_tokens)
            # Nom en un seul mot ("Pedri", "Thiago") : on exige que ce soit
            # exactement le nom d'usage du profil
            if len(tokens) == 1 and _name_tokens(profile.get("name", "")) != tokens:
                continue
            if score > best_score:
                best_photo, best_score = profile.get("photo"), score
        # 2 mots communs exigés pour un nom composé (évite le mauvais
        # "Silva"), 1 seul suffit pour un nom simple comme "Pedri".
        required = 1 if len(tokens) == 1 else 2
        if best_photo and best_score >= required:
            return best_photo
    return None


@app.get("/api/player-photos")
def get_player_photos(names: list[str] = Query(default=[])):
    """Renvoie {"photos": {nom: url_ou_null}}."""
    cache = _load_photo_cache()
    api_key = os.getenv("API_FOOTBALL_KEY")
    pending = []
    changed = False

    for name in names:
        if name in cache:
            continue
        if not api_key or pending:
            pending.append(name)
            continue
        try:
            cache[name] = _search_player_photo(api_key, name)
            changed = True
        except _RateLimited:
            pending.append(name)

    if changed:
        _save_photo_cache(cache)
    return {"photos": {name: cache.get(name) for name in names}, "pending": pending}


# ---------------------------------------------------------------------------
# Écussons des clubs (API-Football /teams), pour habiller le site
# ---------------------------------------------------------------------------
# Un appel par championnat et par saison (20 clubs d'un coup).
LOGO_CACHE_FILE = Path(__file__).parent / "cache" / "team_logos.json"
LOGO_SEASONS = [2024, 2023, 2022]  # seules saisons ouvertes au plan gratuit
SLUG_TO_LEAGUE_ID = {v["slug"]: k for k, v in LEAGUES_WHITELIST.items()}
_logo_errors = []  # derniers refus de l'API, renvoyés pour le diagnostic


def _fetch_league_teams(api_key, league_id, season):
    request = Request(
        f"{API_FOOTBALL_HOST}/teams?{urlencode({'league': league_id, 'season': season})}",
        headers={"x-apisports-key": api_key},
    )
    try:
        with urlopen(request, timeout=15, context=_SSL_CONTEXT) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return None
    errors = payload.get("errors")
    if errors:
        print(f"[team-logos] API-Football a refusé {league_id}/{season} : {errors}")
        _logo_errors.append(f"{league_id}/{season} : {errors}")
        if isinstance(errors, dict) and errors.keys() & {"requests", "rateLimit"}:
            raise _RateLimited()  # quota atteint : on arrête tout pour aujourd'hui
        return None
    return [
        {"name": t["team"]["name"], "logo": t["team"]["logo"]}
        for t in payload.get("response", [])
        if t.get("team", {}).get("logo")
    ]


@app.get("/api/team-logos")
def get_team_logos():
    """Renvoie {"logos": {nom_api_football: url}} pour les 5 championnats."""
    cache = json.loads(LOGO_CACHE_FILE.read_text(encoding="utf-8")) if LOGO_CACHE_FILE.exists() else {}
    api_key = os.getenv("API_FOOTBALL_KEY")
    changed = False
    for slug, league_id in SLUG_TO_LEAGUE_ID.items():
        done = cache.setdefault(slug, {"seasons": [], "logos": {}})
        for season in LOGO_SEASONS:
            if season in done["seasons"] or not api_key:
                continue
            try:
                teams = _fetch_league_teams(api_key, league_id, season)
            except _RateLimited:
                api_key = None  # plus aucun appel dans cette requête
                break
            if teams is None:
                continue
            done["seasons"].append(season)
            for t in teams:
                done["logos"].setdefault(t["name"], t["logo"])
            changed = True
            break  # une saison par championnat et par appel suffit ; les autres viendront au besoin
    if changed:
        LOGO_CACHE_FILE.parent.mkdir(exist_ok=True)
        LOGO_CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"logos": {slug: v["logos"] for slug, v in cache.items()}, "errors": _logo_errors[-5:]}


# ---------------------------------------------------------------------------
# Écussons introuvables par championnat
# ---------------------------------------------------------------------------
LOGO_SEARCH_CACHE_FILE = Path(__file__).parent / "cache" / "team_logo_search.json"


def _ascii(text):
    import unicodedata

    text = unicodedata.normalize("NFD", text)
    return "".join(c for c in text if unicodedata.category(c) != "Mn")


def _search_team_logo(api_key, name):
    """URL de l'écusson de `name`, None si introuvable ; lève _RateLimited."""
    term = " ".join(w for w in _ascii(name).replace(".", " ").split() if len(w) > 2 or w.isdigit()) or _ascii(name)
    now = time.time()
    _photo_call_times[:] = [t for t in _photo_call_times if now - t < 60]
    if len(_photo_call_times) >= MAX_CALLS_PER_MINUTE:
        raise _RateLimited()
    _photo_call_times.append(now)
    request = Request(
        f"{API_FOOTBALL_HOST}/teams?{urlencode({'search': term})}",
        headers={"x-apisports-key": api_key},
    )
    try:
        with urlopen(request, timeout=15, context=_SSL_CONTEXT) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise _RateLimited() from error
    errors = payload.get("errors")
    if errors:
        print(f"[team-logo-search] API-Football a refusé '{term}' : {errors}")
        if isinstance(errors, dict) and errors.keys() & {"rateLimit", "requests", "token"}:
            raise _RateLimited()
        return None
    teams = [t["team"] for t in payload.get("response", []) if not t["team"].get("national") and t["team"].get("logo")]
    if not teams:
        return None
    target = _ascii(name).lower()
    # Nom identique d'abord, puis le plus court qui contient le terme
    exact = [t for t in teams if _ascii(t["name"]).lower() == target]
    if exact:
        return exact[0]["logo"]
    teams.sort(key=lambda t: (" ii" in t["name"].lower() or "u19" in t["name"].lower() or "w" == t["name"][-1:].lower(), len(t["name"])))
    return teams[0]["logo"]


@app.get("/api/team-logo-search")
def search_team_logos(names: list[str] = Query(default=[])):
    """Renvoie {"logos": {nom: url|None}, "pending": [noms à redemander]}."""
    cache = (
        json.loads(LOGO_SEARCH_CACHE_FILE.read_text(encoding="utf-8")) if LOGO_SEARCH_CACHE_FILE.exists() else {}
    )
    api_key = os.getenv("API_FOOTBALL_KEY")
    pending, changed = [], False
    for name in names:
        if name in cache:
            continue
        if not api_key:
            pending.append(name)
            continue
        try:
            cache[name] = _search_team_logo(api_key, name)
            changed = True
        except _RateLimited:
            pending.append(name)
    if changed:
        LOGO_SEARCH_CACHE_FILE.parent.mkdir(exist_ok=True)
        LOGO_SEARCH_CACHE_FILE.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"logos": {n: cache.get(n) for n in names}, "pending": pending}

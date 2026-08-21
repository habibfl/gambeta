import json
import os
import ssl
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import certifi
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Charge les variables du fichier backend/.env (dont API_FOOTBALL_KEY)
# dans l'environnement du processus.
load_dotenv()

# Contexte SSL basé sur le magasin de certificats de `certifi`, à jour,
# plutôt que celui par défaut du système (qui peut contenir une racine
# expirée sur certaines machines et faire échouer tous les appels HTTPS
# avec "certificate has expired" alors que la clé/l'API sont valides).
_SSL_CONTEXT = ssl.create_default_context(cafile=certifi.where())

app = FastAPI(title="Gambeta API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Hôte direct de l'API-Football (API-Sports), pas le proxy RapidAPI.
API_FOOTBALL_HOST = "https://v3.football.api-sports.io"

# Les 5 grands championnats à garder, indexés par leur id API-Football.
# `slug` est l'identifiant utilisé côté frontend dans les URL
# (/championnats/<slug>) ; `country` sert à documenter/vérifier le mapping.
LEAGUES_WHITELIST = {
    61: {"slug": "ligue-1", "country": "France"},
    39: {"slug": "premier-league", "country": "England"},
    140: {"slug": "liga", "country": "Spain"},
    135: {"slug": "serie-a", "country": "Italy"},
    78: {"slug": "bundesliga", "country": "Germany"},
}

# Les 3 compétitions inter-clubs UEFA. Ids vérifiés directement auprès de
# l'API-Football (GET /leagues?search=...) au moment de l'implémentation :
# 2 = UEFA Champions League, 3 = UEFA Europa League, 848 = UEFA Europa
# Conference League. Toutes les trois ont "World" comme pays côté API
# (compétitions internationales, pas rattachées à un seul pays).
COMPETITIONS_WHITELIST = {
    2: {"slug": "ligue-des-champions"},
    3: {"slug": "europa-league"},
    848: {"slug": "europa-conference-league"},
}

# Cache en mémoire très simple : un seul processus, une seule entrée.
# Partagé entre /api/leagues et /api/competitions (les deux filtrent la
# même réponse brute de l'API-Football) : un seul appel API toutes les
# 24h suffit pour les deux routes, au lieu d'un par route.
CACHE_TTL_SECONDS = 24 * 60 * 60
_leagues_payload_cache = {"payload": None, "expires_at": 0.0}


@app.get("/")
def read_root():
    return {"message": "Gambeta API is running"}


def _fetch_leagues_from_api_football(api_key):
    """Appelle l'endpoint /leagues de l'API-Football et renvoie le payload JSON.

    Lève une HTTPException (avec un message clair) si l'appel échoue,
    plutôt que de laisser l'exception brute remonter et faire planter
    la route.
    """
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
    """Retourne le payload brut de /leagues de l'API-Football, en le
    récupérant depuis le cache 24h partagé si possible.

    Utilisé à la fois par /api/leagues et /api/competitions : les deux
    routes filtrent la même réponse brute, donc un seul appel API par
    tranche de 24h suffit pour les deux, plutôt qu'un appel par route.

    Renvoie (payload, depuis_le_cache).
    """
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
    # (clé invalide, quota journalier dépassé...) plutôt qu'un vrai code
    # d'erreur HTTP : il faut le vérifier explicitement.
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
    """Filtre le payload brut de /leagues sur les ids présents dans
    `whitelist`, et reformate chaque entrée retenue pour le frontend.
    """
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


@app.get("/api/competitions")
def get_competitions():
    """Retourne les 3 compétitions inter-clubs UEFA (nom, logo, id).

    Pas de "country" ici : ce sont des compétitions internationales, pas
    rattachées à un seul pays (l'API renvoie "World").
    """
    payload, cached = _get_leagues_payload()
    competitions = _filter_by_whitelist(payload, COMPETITIONS_WHITELIST)
    return {"competitions": competitions, "cached": cached}

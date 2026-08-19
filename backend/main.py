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

# Cache en mémoire très simple : un seul processus, une seule entrée.
# Évite de rappeler l'API-Football à chaque requête du frontend et de
# consommer le quota gratuit (100 requêtes/jour) pour rien.
CACHE_TTL_SECONDS = 24 * 60 * 60
_leagues_cache = {"data": None, "expires_at": 0.0}


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


@app.get("/api/leagues")
def get_leagues():
    """Retourne les 5 grands championnats européens (nom, pays, logo, id).

    Le résultat est mis en cache 24h en mémoire : la première requête
    après expiration (ou après redémarrage du serveur) va chercher les
    données fraîches, les suivantes réutilisent le cache.
    """
    now = time.time()
    if _leagues_cache["data"] is not None and now < _leagues_cache["expires_at"]:
        return {"leagues": _leagues_cache["data"], "cached": True}

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

    leagues = []
    for item in payload.get("response", []):
        league = item.get("league", {})
        league_id = league.get("id")
        whitelist_entry = LEAGUES_WHITELIST.get(league_id)
        if whitelist_entry is None:
            continue
        leagues.append(
            {
                "id": whitelist_entry["slug"],
                "name": league.get("name"),
                "country": item.get("country", {}).get("name"),
                "logo": league.get("logo"),
            }
        )

    _leagues_cache["data"] = leagues
    _leagues_cache["expires_at"] = now + CACHE_TTL_SECONDS
    return {"leagues": leagues, "cached": False}

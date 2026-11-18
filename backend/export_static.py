"""Exporte les réponses de l'API en fichiers JSON pour publier le site sans backend.

Prérequis : l'API tourne en local (uvicorn main:app). Usage, depuis backend/ :

    python export_static.py

Les fichiers sont écrits dans frontend/public/static-api/, avec la même règle de nommage
que frontend/src/lib/api.js (staticName).
"""
import json
import shutil
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import urlopen

API = "http://localhost:8000"
OUT = Path(__file__).resolve().parent.parent / "frontend" / "public" / "static-api"
CACHE = Path(__file__).resolve().parent / "cache"
LEAGUES = ["premier-league", "liga", "serie-a", "bundesliga", "ligue-1"]

written = 0
missing = []


def static_name(path: str) -> str:
    """'/api/data/standings/liga?seasons=2122,2223' -> 'data/standings/liga__seasons-2122_2223.json'."""
    base, _, query = path.removeprefix("/api/").partition("?")
    suffix = "__" + query.replace("=", "-").replace(",", "_").replace("&", "__") if query else ""
    return f"{base}{suffix}.json"


def get(path: str):
    try:
        with urlopen(API + quote(path, safe="/?=,&"), timeout=60) as response:
            return json.load(response)
    except HTTPError as error:
        missing.append(f"{path} ({error.code})")
        return None


def save(path: str, data=None):
    """Télécharge `path` (sauf si `data` est fourni) et l'écrit sous son nom statique."""
    global written
    if data is None:
        data = get(path)
    if data is None:
        return None
    target = OUT / static_name(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    written += 1
    return data


def ranges(seasons: list[str]) -> list[list[str]]:
    """Toutes les périodes continues : [a], [a, b], [a, b, c]..."""
    return [seasons[i : j + 1] for i in range(len(seasons)) for j in range(i, len(seasons))]


def team_query(period: list[str]) -> str:
    return f"?seasons={','.join(period)}" if len(period) > 1 else f"?season={period[0]}"


def main():
    try:
        urlopen(API + "/", timeout=5)
    except URLError:
        sys.exit("API injoignable : lancez d'abord `uvicorn main:app` dans backend/.")

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    # Sans clé API-Football, logos des championnats depuis leur adresse publique
    if save("/api/leagues") is None:
        fallback = [
            ("premier-league", "Premier League", "England", 39),
            ("liga", "La Liga", "Spain", 140),
            ("serie-a", "Serie A", "Italy", 135),
            ("bundesliga", "Bundesliga", "Germany", 78),
            ("ligue-1", "Ligue 1", "France", 61),
        ]
        leagues = [
            {"id": s, "name": n, "country": c, "logo": f"https://media.api-sports.io/football/leagues/{i}.png"}
            for s, n, c, i in fallback
        ]
        save("/api/leagues", {"leagues": leagues})
    save("/api/team-logos")
    players = save("/api/data/players")["players"]

    # Photos et logos recherchés : un seul fichier chacun (lus en entier par le site)
    for source, name in [("player_photos.json", "player-photos.json"), ("team_logo_search.json", "team-logo-search.json")]:
        cache = CACHE / source
        if cache.exists():
            (OUT / name).write_text(cache.read_text(encoding="utf-8"), encoding="utf-8")

    all_seasons = set()
    team_slugs = set()
    for league in LEAGUES:
        seasons = save(f"/api/data/seasons/{league}")["seasons"]
        all_seasons.update(seasons)
        save(f"/api/data/league-stats/{league}")
        for season in seasons:
            for route in ("top-scorers", "top-assists", "league-stats"):
                save(f"/api/data/{route}/{league}?season={season}")
        for period in ranges(seasons):
            standings = save(f"/api/data/standings/{league}{team_query(period)}")
            save(f"/api/data/rank-evolution/{league}{team_query(period)}")
            for row in (standings or {}).get("standings", []):
                team_slugs.add(row["team_slug"])
        print(f"{league} : {len(seasons)} saisons")

    for period in ranges(sorted(all_seasons)):
        save(f"/api/data/home-advantage?seasons={','.join(period)}")

    for i, slug in enumerate(sorted(team_slugs), 1):
        team = save(f"/api/data/team/{slug}")
        if not team:
            continue
        available = team.get("available_seasons", [])
        last = available[-1] if available else None
        for period in ranges(available):
            if period != [last]:
                save(f"/api/data/team/{slug}?seasons={','.join(period)}")
        save(f"/api/data/team/{slug}/matches")
        save(f"/api/data/team/{slug}/history")
        if i % 20 == 0:
            print(f"équipes : {i}/{len(team_slugs)}")

    for i, p in enumerate(players, 1):
        save(f"/api/data/player/{p['player_slug']}")
        save(f"/api/data/player/{p['player_slug']}/history")
        if i % 500 == 0:
            print(f"joueurs : {i}/{len(players)}")

    size = sum(f.stat().st_size for f in OUT.rglob("*.json")) / 1e6
    print(f"\n{written} fichiers écrits ({size:.1f} Mo) dans {OUT}")
    if missing:
        print(f"{len(missing)} réponses absentes, par exemple : {missing[:5]}")


if __name__ == "__main__":
    main()

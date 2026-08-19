import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Gambeta API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)

LEAGUE_IDS = {
    61: "ligue-1",
    39: "premier-league",
    140: "liga",
    135: "serie-a",
    78: "bundesliga",
}

@app.get("/")
def read_root():
    return {"message": "Gambeta API is running"}


@app.get("/api/leagues")
def get_leagues():
    api_key = os.getenv("API_FOOTBALL_KEY") or os.getenv("RAPIDAPI_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="API_FOOTBALL_KEY is not configured")

    request = Request(
        "https://api-football-v1.p.rapidapi.com/v3/leagues",
        headers={
            "x-rapidapi-key": api_key,
            "x-rapidapi-host": "api-football-v1.p.rapidapi.com",
        },
    )
    try:
        with urlopen(request, timeout=8) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError) as error:
        raise HTTPException(status_code=502, detail="API-Football unavailable") from error

    leagues = []
    for item in payload.get("response", []):
        league = item.get("league", {})
        league_id = league.get("id")
        if league_id in LEAGUE_IDS:
            leagues.append(
                {
                    "id": LEAGUE_IDS[league_id],
                    "name": league.get("name"),
                    "logo": league.get("logo"),
                }
            )
    return {"leagues": leagues}
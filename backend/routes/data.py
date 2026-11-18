"""Routes qui exposent les données collectées (classements, xG/xA) stockées en base PostgreSQL."""

import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from db.models import League, Match, Player, PlayerSeasonStat, Standing, Team
from db.session import SessionLocal

router = APIRouter(prefix="/api/data", tags=["data"])

# Cache en mémoire, même principe que celui de main.py pour /api/leagues
CACHE_TTL_SECONDS = 60 * 60  # 1h
_cache: dict[str, dict] = {}


def _get_cached(key: str, compute):
    """Renvoie (valeur, depuis_le_cache) pour `key`."""
    now = time.time()
    entry = _cache.get(key)
    if entry is not None and now < entry["expires_at"]:
        return entry["value"], True
    value = compute()
    _cache[key] = {"value": value, "expires_at": now + CACHE_TTL_SECONDS}
    return value, False


def get_db():
    """Dépendance FastAPI : une session SQLAlchemy par requête, toujours refermée à la fin."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_league_or_404(db: Session, league_slug: str) -> League:
    league = db.query(League).filter_by(slug=league_slug).first()
    if league is None:
        raise HTTPException(status_code=404, detail=f"Championnat inconnu : '{league_slug}'.")
    return league


def _latest_season(seasons: list[str]) -> str | None:
    """La saison la plus récente parmi une liste."""
    return max(seasons) if seasons else None


def _pick_season(seasons: list[str], requested: str | None) -> str | None:
    """La saison demandée si elle existe en base, sinon la plus récente."""
    if requested and requested in seasons:
        return requested
    return _latest_season(seasons)


def _parse_seasons(seasons: str | None, available: list[str]) -> list[str]:
    """`seasons` = "2223,2324" -> les saisons demandées qui existent, triées."""
    if not seasons:
        return []
    wanted = {s.strip() for s in seasons.split(",") if s.strip()}
    return sorted(s for s in available if s in wanted)


def _per90(value: float | int | None, minutes: int | None) -> float | None:
    """Ramène `value` à un rythme "par 90 minutes"."""
    if not minutes:
        return None
    return round(value * 90 / minutes, 3) if value is not None else None


def _stat_to_dict(stat: PlayerSeasonStat | None) -> dict:
    """Sérialise une ligne player_season_stats en dict JSON, brut ET par 90 minutes."""
    if stat is None:
        return {
            "season": None,
            "minutes": None, "matches_played": None, "starts": None,
            "xg": None, "xa": None, "np_xg": None, "xg_chain": None, "xg_buildup": None,
            "goals": None, "assists": None,
            "shots": None, "shots_on_target": None, "shots_on_target_pct": None,
            "tackles_won": None, "interceptions": None,
            "yellow_cards": None, "red_cards": None, "second_yellow_cards": None,
            "fouls_committed": None, "fouls_drawn": None,
            "per90": {},
        }

    minutes = stat.minutes
    return {
        "season": stat.season,
        "minutes": minutes,
        "matches_played": stat.matches_played,
        "starts": stat.starts,
        "xg": stat.xg,
        "xa": stat.xa,
        "np_xg": stat.np_xg,
        "xg_chain": stat.xg_chain,
        "xg_buildup": stat.xg_buildup,
        "goals": stat.goals,
        "assists": stat.assists,
        "shots": stat.shots,
        "shots_on_target": stat.shots_on_target,
        "shots_on_target_pct": stat.shots_on_target_pct,
        "tackles_won": stat.tackles_won,
        "interceptions": stat.interceptions,
        "yellow_cards": stat.yellow_cards,
        "red_cards": stat.red_cards,
        "second_yellow_cards": stat.second_yellow_cards,
        "fouls_committed": stat.fouls_committed,
        "fouls_drawn": stat.fouls_drawn,
        # TODO : "Passes" (passes progressives/clés) et "Possession"
        # (touches, dribbles, portées progressives) ne sont pas collectées
        "per90": {
            "xg": _per90(stat.xg, minutes),
            "xa": _per90(stat.xa, minutes),
            "goals": _per90(stat.goals, minutes),
            "assists": _per90(stat.assists, minutes),
            "shots": _per90(stat.shots, minutes),
            "shots_on_target": _per90(stat.shots_on_target, minutes),
            "tackles_won": _per90(stat.tackles_won, minutes),
            "interceptions": _per90(stat.interceptions, minutes),
            "fouls_committed": _per90(stat.fouls_committed, minutes),
        },
    }


@router.get("/standings/{league_slug}")
def get_standings(
    league_slug: str, season: str | None = None, seasons: str | None = None, db: Session = Depends(get_db)
):
    """Classement complet d'un championnat, trié par points décroissants."""

    seasons_param = seasons

    def compute():
        league = _get_league_or_404(db, league_slug)

        seasons = [
            s
            for (s,) in db.query(Standing.season)
            .join(Team, Standing.team_id == Team.id)
            .filter(Team.league_id == league.id)
            .distinct()
        ]
        period = _parse_seasons(seasons_param, seasons)
        if len(period) > 1:
            return _cumulated_standings(db, league, period)
        chosen = _pick_season(seasons, period[0] if period else season)
        if chosen is None:
            return {"league": league.slug, "season": None, "standings": []}

        rows = (
            db.query(Standing, Team)
            .join(Team, Standing.team_id == Team.id)
            .filter(Team.league_id == league.id, Standing.season == chosen)
            .order_by(
                Standing.points.desc(),
                (Standing.goals_for - Standing.goals_against).desc(),
                Standing.goals_for.desc(),
            )
            .all()
        )
        # Les matchs de barrage (ex : Saint-Étienne en Ligue 1, Paderborn en
        # Bundesliga) apparaissent dans le calendrier FBref et créent une "équipe" avec 2 matchs joués
        max_played = max((standing.matches_played or 0) for standing, _ in rows) if rows else 0
        rows = [(standing, team) for standing, team in rows if (standing.matches_played or 0) >= max_played / 2]

        standings = [
            {
                "rank": index + 1,
                "team": team.name,
                "team_slug": team.slug,
                "matches_played": standing.matches_played,
                "wins": standing.wins,
                "draws": standing.draws,
                "losses": standing.losses,
                "goals_for": standing.goals_for,
                "goals_against": standing.goals_against,
                "points": standing.points,
            }
            for index, (standing, team) in enumerate(rows)
        ]
        return {"league": league.slug, "season": chosen, "standings": standings}

    payload, cached = _get_cached(f"standings:{league_slug}:{season}:{seasons_param}", compute)
    return {**payload, "cached": cached}


def _top_players_by(db: Session, league: League, stat_field: str, limit: int = 10, season: str | None = None) -> dict:
    """Factorise top-scorers et top-assists (même requête, seule la colonne de tri change)."""
    seasons = [
        s
        for (s,) in db.query(PlayerSeasonStat.season)
        .join(Player, PlayerSeasonStat.player_id == Player.id)
        .join(Team, Player.team_id == Team.id)
        .filter(Team.league_id == league.id)
        .distinct()
    ]
    season = _pick_season(seasons, season)
    if season is None:
        return {"league": league.slug, "season": None, "players": []}

    sort_column = getattr(PlayerSeasonStat, stat_field)
    rows = (
        db.query(PlayerSeasonStat, Player, Team)
        .join(Player, PlayerSeasonStat.player_id == Player.id)
        .join(Team, Player.team_id == Team.id)
        .filter(Team.league_id == league.id, PlayerSeasonStat.season == season, sort_column.isnot(None))
        .order_by(sort_column.desc())
        .limit(limit)
        .all()
    )
    players = [
        {
            "player": player.name,
            "player_slug": player.slug,
            "team": team.name,
            "position": player.position,
            "xg": stat.xg,
            "xa": stat.xa,
            "goals": stat.goals,
            "assists": stat.assists,
        }
        for stat, player, team in rows
    ]
    return {"league": league.slug, "season": season, "players": players}


@router.get("/top-scorers/{league_slug}")
def get_top_scorers(league_slug: str, season: str | None = None, db: Session = Depends(get_db)):
    """Les 10 joueurs avec le plus haut xG pour ce championnat."""

    def compute():
        league = _get_league_or_404(db, league_slug)
        return _top_players_by(db, league, "xg", season=season)

    payload, cached = _get_cached(f"top-scorers:{league_slug}:{season}", compute)
    return {**payload, "cached": cached}


@router.get("/top-assists/{league_slug}")
def get_top_assists(league_slug: str, season: str | None = None, db: Session = Depends(get_db)):
    """Les 10 joueurs avec le plus haut xA pour ce championnat."""

    def compute():
        league = _get_league_or_404(db, league_slug)
        return _top_players_by(db, league, "xa", season=season)

    payload, cached = _get_cached(f"top-assists:{league_slug}:{season}", compute)
    return {**payload, "cached": cached}


@router.get("/player/{player_slug}")
def get_player(player_slug: str, db: Session = Depends(get_db)):
    """Détail complet d'un joueur : identité, équipe, championnat, et ses statistiques."""

    def compute():
        player = db.query(Player).filter_by(slug=player_slug).order_by(Player.id).first()
        if player is None:
            raise HTTPException(status_code=404, detail=f"Joueur inconnu : '{player_slug}'.")

        team = db.query(Team).filter_by(id=player.team_id).first()
        league = db.query(League).filter_by(id=team.league_id).first()
        stat = (
            db.query(PlayerSeasonStat)
            .filter_by(player_id=player.id)
            .order_by(PlayerSeasonStat.season.desc())
            .first()
        )

        return {
            "player": player.name,
            "player_slug": player.slug,
            "position": player.position,
            "team": team.name,
            "team_slug": team.slug,
            "league": league.name,
            "league_slug": league.slug,
            **_stat_to_dict(stat),
        }

    payload, cached = _get_cached(f"player:{player_slug}", compute)
    return {**payload, "cached": cached}


@router.get("/team/{team_slug}")
def get_team(team_slug: str, seasons: str | None = None, db: Session = Depends(get_db)):
    """Détail d'une équipe : identité, championnat, classement actuel (saison la plus récente)."""

    def compute():
        team = db.query(Team).filter_by(slug=team_slug).order_by(Team.id).first()
        if team is None:
            raise HTTPException(status_code=404, detail=f"Équipe inconnue : '{team_slug}'.")

        league = db.query(League).filter_by(id=team.league_id).first()
        # Saisons jouées par le club ; `seasons` (filtre de la page) en garde
        # une ou plusieurs, cumulées.
        rows = db.query(Standing).filter_by(team_id=team.id).order_by(Standing.season).all()
        available = [r.season for r in rows]
        period = _parse_seasons(seasons_param, available) or available[-1:]
        chosen_rows = [r for r in rows if r.season in period]
        standing = None
        if chosen_rows:
            standing = type("Cumul", (), {})()
            standing.season = period[-1]
            for key in ("matches_played", "wins", "draws", "losses", "goals_for", "goals_against", "points"):
                setattr(standing, key, sum(getattr(r, key) or 0 for r in chosen_rows))

        players = []
        for player in db.query(Player).filter_by(team_id=team.id).order_by(Player.name).all():
            stat = (
                db.query(PlayerSeasonStat)
                .filter_by(player_id=player.id)
                .order_by(PlayerSeasonStat.season.desc())
                .first()
            )
            players.append(
                {
                    "player": player.name,
                    "player_slug": player.slug,
                    "position": player.position,
                    **_stat_to_dict(stat),
                }
            )

        return {
            "team": team.name,
            "team_slug": team.slug,
            "league": league.name,
            "league_slug": league.slug,
            "available_seasons": available,
            "seasons": period,
            "standing": (
                {
                    "season": standing.season,
                    "matches_played": standing.matches_played,
                    "wins": standing.wins,
                    "draws": standing.draws,
                    "losses": standing.losses,
                    "goals_for": standing.goals_for,
                    "goals_against": standing.goals_against,
                    "points": standing.points,
                }
                if standing
                else None
            ),
            "players": players,
            **_team_match_summary(db, team, period),
        }

    seasons_param = seasons
    payload, cached = _get_cached(f"team:{team_slug}:{seasons}", compute)
    return {**payload, "cached": cached}


# Repli CSV pour les saisons passées
# Saisons sans stats joueurs en base : agrégats lus dans les CSV FBref (tirs, tacles, cartons).
from pathlib import Path as _Path

_OUTPUT_DIR = _Path(__file__).resolve().parent.parent / "data_collection" / "output"
_CSV_SLUGS = {"premier-league": "pl", "liga": "liga", "serie-a": "seriea", "bundesliga": "bundesliga", "ligue-1": "ligue1"}


def _canonical(name: str) -> str:
    try:
        from data_collection.team_name_mapping import canonical_fbref_name

        return canonical_fbref_name(name)
    except Exception:  # noqa: BLE001
        return name


def _league_stats_from_csv(db: Session, league, season: str) -> dict | None:
    import csv

    path = _OUTPUT_DIR / season / f"player_extra_{_CSV_SLUGS.get(league.slug, '')}.csv"
    if not path.exists():
        return None
    standings = {
        team.name: (team, st)
        for st, team in db.query(Standing, Team)
        .join(Team, Standing.team_id == Team.id)
        .filter(Team.league_id == league.id, Standing.season == season)
        .all()
    }
    fields = ["shots", "shots_on_target", "tackles_won", "interceptions", "yellow_cards", "red_cards", "fouls_committed"]
    buckets: dict = {}
    with open(path, encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            name = _canonical(row["team"])
            if name not in standings:
                continue
            team, st = standings[name]
            b = buckets.setdefault(
                team.id,
                {"team": team.name, "team_slug": team.slug, "matches_played": st.matches_played, "players_count": 0, **{f: 0 for f in fields}},
            )
            b["players_count"] += 1
            for f in fields:
                try:
                    b[f] += int(float(row.get(f) or 0))
                except ValueError:
                    pass
    teams = []
    for b in buckets.values():
        mp = b["matches_played"] or 0
        pm = {f: (round(b[f] / mp, 2) if mp else None) for f in fields}
        teams.append({**b, "xg": None, "xa": None, "per_match": {**pm, "xg": None, "xa": None}})
    teams.sort(key=lambda t: t["team"])
    return {"league": league.slug, "season": season, "teams": teams, "source": "fbref_csv"}


@router.get("/league-stats/{league_slug}")
def get_league_stats(league_slug: str, season: str | None = None, db: Session = Depends(get_db)):
    """Agrégats par équipe pour un championnat (tirs, tacles, discipline, xG/xA...)."""

    def compute():
        league = _get_league_or_404(db, league_slug)

        seasons = [
            s
            for (s,) in db.query(PlayerSeasonStat.season)
            .join(Player, PlayerSeasonStat.player_id == Player.id)
            .join(Team, Player.team_id == Team.id)
            .filter(Team.league_id == league.id)
            .distinct()
        ]
        if season and season not in seasons:
            fallback = _league_stats_from_csv(db, league, season)
            if fallback and fallback["teams"]:
                return fallback
        chosen = _pick_season(seasons, season)
        if chosen is None:
            return {"league": league.slug, "season": None, "teams": []}

        rows = (
            db.query(Team, Standing, PlayerSeasonStat)
            .join(Standing, Standing.team_id == Team.id)
            .join(Player, Player.team_id == Team.id)
            .join(PlayerSeasonStat, PlayerSeasonStat.player_id == Player.id)
            .filter(Team.league_id == league.id, Standing.season == chosen, PlayerSeasonStat.season == chosen)
            .all()
        )

        # Regroupe manuellement par équipe plutôt qu'un GROUP BY SQL : les
        # champs sommés sont nombreux et souvent NULL
        teams_data = {}
        for team, standing, stat in rows:
            bucket = teams_data.setdefault(
                team.id,
                {
                    "team": team.name,
                    "team_slug": team.slug,
                    "matches_played": standing.matches_played,
                    "players_count": 0,
                    "shots": 0,
                    "shots_on_target": 0,
                    "tackles_won": 0,
                    "interceptions": 0,
                    "yellow_cards": 0,
                    "red_cards": 0,
                    "fouls_committed": 0,
                    "xg": 0.0,
                    "xa": 0.0,
                },
            )
            bucket["players_count"] += 1
            bucket["shots"] += stat.shots or 0
            bucket["shots_on_target"] += stat.shots_on_target or 0
            bucket["tackles_won"] += stat.tackles_won or 0
            bucket["interceptions"] += stat.interceptions or 0
            bucket["yellow_cards"] += stat.yellow_cards or 0
            bucket["red_cards"] += stat.red_cards or 0
            bucket["fouls_committed"] += stat.fouls_committed or 0
            bucket["xg"] += stat.xg or 0.0
            bucket["xa"] += stat.xa or 0.0

        teams = []
        for bucket in teams_data.values():
            mp = bucket["matches_played"] or 0
            per_match = (lambda value: round(value / mp, 2) if mp else None)  # noqa: E731
            teams.append(
                {
                    **bucket,
                    "xg": round(bucket["xg"], 2),
                    "xa": round(bucket["xa"], 2),
                    "per_match": {
                        "shots": per_match(bucket["shots"]),
                        "shots_on_target": per_match(bucket["shots_on_target"]),
                        "tackles_won": per_match(bucket["tackles_won"]),
                        "interceptions": per_match(bucket["interceptions"]),
                        "yellow_cards": per_match(bucket["yellow_cards"]),
                        "red_cards": per_match(bucket["red_cards"]),
                        "fouls_committed": per_match(bucket["fouls_committed"]),
                        "xg": per_match(bucket["xg"]),
                        "xa": per_match(bucket["xa"]),
                    },
                }
            )
        teams.sort(key=lambda t: t["team"])

        return {"league": league.slug, "season": chosen, "teams": teams}

    payload, cached = _get_cached(f"league-stats:{league_slug}:{season}", compute)
    return {**payload, "cached": cached}


@router.get("/players")
def get_all_players(db: Session = Depends(get_db)):
    """Tous les joueurs des 5 championnats avec leurs statistiques de la saison la plus récente
    de leur championnat."""

    def compute():
        latest_by_league = {}
        for league_id, season in (
            db.query(Team.league_id, PlayerSeasonStat.season)
            .join(Player, Player.team_id == Team.id)
            .join(PlayerSeasonStat, PlayerSeasonStat.player_id == Player.id)
            .distinct()
        ):
            latest_by_league[league_id] = max(latest_by_league.get(league_id, season), season)

        rows = (
            db.query(PlayerSeasonStat, Player, Team, League)
            .join(Player, PlayerSeasonStat.player_id == Player.id)
            .join(Team, Player.team_id == Team.id)
            .join(League, Team.league_id == League.id)
            .all()
        )
        players = []
        for stat, player, team, league in rows:
            if stat.season != latest_by_league.get(league.id):
                continue
            players.append(
                {
                    "player": player.name,
                    "player_slug": player.slug,
                    "position": player.position,
                    "team": team.name,
                    "team_slug": team.slug,
                    "league": league.name,
                    "league_slug": league.slug,
                    "season": stat.season,
                    "minutes": stat.minutes,
                    "matches_played": stat.matches_played,
                    "goals": stat.goals,
                    "assists": stat.assists,
                    "xg": stat.xg,
                    "xa": stat.xa,
                    "np_xg": stat.np_xg,
                    "shots": stat.shots,
                    "shots_on_target": stat.shots_on_target,
                    "tackles_won": stat.tackles_won,
                    "interceptions": stat.interceptions,
                    "yellow_cards": stat.yellow_cards,
                    "red_cards": stat.red_cards,
                    "fouls_committed": stat.fouls_committed,
                    "xg_chain": stat.xg_chain,
                    "xg_buildup": stat.xg_buildup,
                    "fouls_drawn": stat.fouls_drawn,
                }
            )
        return {"count": len(players), "players": players}

    payload, cached = _get_cached("players:all", compute)
    return {**payload, "cached": cached}


# --- Données dérivées des matchs (table matches, voir collect_league.py) ---

def _result_for(team_id: int, match: Match) -> tuple[str, int, int]:
    """(résultat "V"/"N"/"D", buts pour, buts contre) du point de vue d'une équipe."""
    home = match.home_team_id == team_id
    gf, ga = (match.home_goals, match.away_goals) if home else (match.away_goals, match.home_goals)
    return ("V" if gf > ga else "N" if gf == ga else "D"), gf, ga


def _team_match_summary(db: Session, team: Team, period: list[str] | None = None) -> dict:
    """Forme récente (5 derniers matchs de championnat) et bilan domicile / extérieur pour la
    saison la plus récente."""
    season = db.query(Match.season).filter(
        (Match.home_team_id == team.id) | (Match.away_team_id == team.id)
    ).order_by(Match.season.desc()).limit(1).scalar()
    if season is None:
        return {"form": None, "home_away": None}
    period = period or [season]

    matches = (
        db.query(Match)
        .filter(Match.season.in_(period), Match.week.isnot(None))  # sans les barrages
        .filter((Match.home_team_id == team.id) | (Match.away_team_id == team.id))
        .order_by(Match.date)
        .all()
    )
    if not matches:
        return {"form": None, "home_away": None}

    last5 = [_result_for(team.id, m)[0] for m in matches[-5:]]
    split = {"home": {"w": 0, "d": 0, "l": 0, "gp": 0, "gf": 0, "ga": 0}, "away": {"w": 0, "d": 0, "l": 0, "gp": 0, "gf": 0, "ga": 0}}
    for m in matches:
        side = split["home" if m.home_team_id == team.id else "away"]
        result, gf, ga = _result_for(team.id, m)
        side["gp"] += 1
        side["gf"] += gf
        side["ga"] += ga
        side[{"V": "w", "N": "d", "D": "l"}[result]] += 1
    for side in split.values():
        side["pts"] = side["w"] * 3 + side["d"]
    return {
        "form": {"results": last5, "points": sum(3 if r == "V" else 1 if r == "N" else 0 for r in last5)},
        "home_away": split,
    }


@router.get("/rank-evolution/{league_slug}")
def get_rank_evolution(
    league_slug: str, top: int = 6, season: str | None = None, seasons: str | None = None, db: Session = Depends(get_db)
):
    """Position de chaque équipe après chaque journée (saison la plus récente)."""
    seasons_param = seasons

    def compute():
        league = _get_league_or_404(db, league_slug)
        available = [s for (s,) in db.query(Match.season).filter_by(league_id=league.id).distinct()]
        period = _parse_seasons(seasons_param, available)
        if len(period) > 1:
            return _rank_by_season(db, league, period, top)
        chosen = _pick_season(available, period[0] if period else season)
        if chosen is None:
            return {"league": league.slug, "season": None, "teams": []}
        matches = (
            db.query(Match)
            .filter(Match.league_id == league.id, Match.season == chosen, Match.week.isnot(None))
            .order_by(Match.week, Match.date)
            .all()
        )
        names = {t.id: t for t in db.query(Team).filter_by(league_id=league.id)}
        table = {}  # team_id -> [pts, gd, gf]
        ranks = {}  # team_id -> [rang après chaque journée]
        weeks = sorted({m.week for m in matches})
        by_week = {w: [m for m in matches if m.week == w] for w in weeks}
        for week in weeks:
            for m in by_week[week]:
                for team_id in (m.home_team_id, m.away_team_id):
                    result, gf, ga = _result_for(team_id, m)
                    row = table.setdefault(team_id, [0, 0, 0])
                    row[0] += 3 if result == "V" else 1 if result == "N" else 0
                    row[1] += gf - ga
                    row[2] += gf
            order = sorted(table, key=lambda t: table[t], reverse=True)
            for position, team_id in enumerate(order, start=1):
                ranks.setdefault(team_id, []).append(position)
        final = sorted(table, key=lambda t: table[t], reverse=True)[:top]
        return {
            "league": league.slug,
            "season": chosen,
            "weeks": len(weeks),
            "teams": [
                {"team": names[t].name, "team_slug": names[t].slug, "ranks": ranks[t][-len(weeks):]}
                for t in final
                if len(ranks.get(t, [])) == len(weeks)
            ],
        }

    payload, cached = _get_cached(f"rank-evolution:{league_slug}:{top}:{season}:{seasons_param}", compute)
    return {**payload, "cached": cached}


@router.get("/seasons")
def get_seasons(db: Session = Depends(get_db)):
    """Saisons disponibles en base (codes "2122", "2526"...), triées."""
    seasons = sorted({s for (s,) in db.query(PlayerSeasonStat.season).distinct()})
    return {"seasons": seasons}


@router.get("/player/{player_slug}/history")
def get_player_history(player_slug: str, db: Session = Depends(get_db)):
    """Statistiques saison par saison d'un joueur, tous clubs confondus."""

    def compute():
        player = db.query(Player).filter_by(slug=player_slug).order_by(Player.id).first()
        if player is None:
            raise HTTPException(status_code=404, detail=f"Joueur inconnu : '{player_slug}'.")
        same_player = (
            db.query(Player).filter_by(understat_id=player.understat_id).all() if player.understat_id else [player]
        )
        rows = []
        for p in same_player:
            team = db.query(Team).filter_by(id=p.team_id).first()
            league = db.query(League).filter_by(id=team.league_id).first()
            for stat in db.query(PlayerSeasonStat).filter_by(player_id=p.id).all():
                rows.append({"team": team.name, "team_slug": team.slug, "league": league.name, **_stat_to_dict(stat)})
        rows.sort(key=lambda r: r["season"])
        return {"player": player.name, "seasons": rows}

    payload, cached = _get_cached(f"player-history:{player_slug}", compute)
    return {**payload, "cached": cached}


@router.get("/team/{team_slug}/history")
def get_team_history(team_slug: str, db: Session = Depends(get_db)):
    """Classement final, points et buts d'un club saison par saison."""

    def compute():
        team = db.query(Team).filter_by(slug=team_slug).order_by(Team.id).first()
        if team is None:
            raise HTTPException(status_code=404, detail=f"Équipe inconnue : '{team_slug}'.")
        rows = []
        for standing in db.query(Standing).filter_by(team_id=team.id).order_by(Standing.season).all():
            league_rows = (
                db.query(Standing)
                .join(Team, Standing.team_id == Team.id)
                .filter(Team.league_id == team.league_id, Standing.season == standing.season)
                .all()
            )
            max_played = max(r.matches_played for r in league_rows)
            ranked = sorted(
                (r for r in league_rows if r.matches_played >= max_played / 2),
                key=lambda r: (r.points, r.goals_for - r.goals_against, r.goals_for),
                reverse=True,
            )
            rank = next((i + 1 for i, r in enumerate(ranked) if r.team_id == team.id), None)
            xg = (
                db.query(func.sum(PlayerSeasonStat.xg))
                .join(Player, PlayerSeasonStat.player_id == Player.id)
                .filter(Player.team_id == team.id, PlayerSeasonStat.season == standing.season)
                .scalar()
            )
            rows.append(
                {
                    "season": standing.season,
                    "rank": rank,
                    "teams": len(ranked),
                    "points": standing.points,
                    "goals_for": standing.goals_for,
                    "goals_against": standing.goals_against,
                    "xg": round(xg, 1) if xg is not None else None,
                }
            )
        return {"team": team.name, "seasons": rows}

    payload, cached = _get_cached(f"team-history:{team_slug}", compute)
    return {**payload, "cached": cached}


@router.get("/seasons/{league_slug}")
def get_league_seasons(league_slug: str, db: Session = Depends(get_db)):
    """Saisons disponibles pour un championnat : `seasons`."""
    league = _get_league_or_404(db, league_slug)
    seasons = sorted(
        {s for (s,) in db.query(Standing.season).join(Team, Standing.team_id == Team.id).filter(Team.league_id == league.id).distinct()}
    )
    xg_seasons = sorted(
        {
            s
            for (s,) in db.query(PlayerSeasonStat.season)
            .join(Player, PlayerSeasonStat.player_id == Player.id)
            .join(Team, Player.team_id == Team.id)
            .filter(Team.league_id == league.id, PlayerSeasonStat.xg.isnot(None))
            .distinct()
        }
    )
    return {"league": league.slug, "seasons": seasons, "xg_seasons": xg_seasons}


# --- Périodes de plusieurs saisons -----------------------------------------

def _season_rows(db: Session, league: League, season: str):
    """Classement d'une saison, sans les clubs des barrages (cf. get_standings)."""
    rows = (
        db.query(Standing, Team)
        .join(Team, Standing.team_id == Team.id)
        .filter(Team.league_id == league.id, Standing.season == season)
        .order_by(
            Standing.points.desc(),
            (Standing.goals_for - Standing.goals_against).desc(),
            Standing.goals_for.desc(),
        )
        .all()
    )
    max_played = max((st.matches_played or 0) for st, _ in rows) if rows else 0
    return [(st, t) for st, t in rows if (st.matches_played or 0) >= max_played / 2]


def _cumulated_standings(db: Session, league: League, period: list[str]) -> dict:
    """Classement cumulé sur plusieurs saisons (somme des points, buts...)."""
    table = {}
    for season in period:
        for st, team in _season_rows(db, league, season):
            row = table.setdefault(
                team.name,
                {"team": team.name, "team_slug": team.slug, "matches_played": 0, "wins": 0, "draws": 0,
                 "losses": 0, "goals_for": 0, "goals_against": 0, "points": 0, "seasons_played": 0},
            )
            row["seasons_played"] += 1
            for key in ("matches_played", "wins", "draws", "losses", "goals_for", "goals_against", "points"):
                row[key] += getattr(st, key) or 0
    ranked = sorted(table.values(), key=lambda r: (r["points"], r["goals_for"] - r["goals_against"], r["goals_for"]), reverse=True)
    for i, row in enumerate(ranked, start=1):
        row["rank"] = i
    return {"league": league.slug, "season": period[-1], "seasons": period, "aggregated": True, "standings": ranked}


def _rank_by_season(db: Session, league: League, period: list[str], top: int) -> dict:
    """Place finale de chaque club, saison par saison."""
    ranks, points = {}, {}
    slugs = {}
    for season in period:
        for rank, (st, team) in enumerate(_season_rows(db, league, season), start=1):
            ranks.setdefault(team.name, {})[season] = rank
            points[team.name] = points.get(team.name, 0) + (st.points or 0)
            slugs[team.name] = team.slug
    best = sorted(points, key=points.get, reverse=True)[:top]
    return {
        "league": league.slug,
        "season": period[-1],
        "seasons": period,
        "mode": "seasons",
        "teams": [{"team": t, "team_slug": slugs[t], "ranks": [ranks[t].get(s) for s in period]} for t in best],
    }


@router.get("/home-advantage")
def get_home_advantage(seasons: str | None = None, db: Session = Depends(get_db)):
    """Part de victoires à domicile, nuls et victoires à l'extérieur par championnat."""
    available = sorted({s for (s,) in db.query(Match.season).distinct()})
    period = _parse_seasons(seasons, available) or available
    out = []
    for league in db.query(League).all():
        matches = (
            db.query(Match.home_goals, Match.away_goals)
            .filter(Match.league_id == league.id, Match.season.in_(period), Match.week.isnot(None))
            .all()
        )
        n = len(matches)
        if not n:
            continue
        home = sum(1 for h, a in matches if h > a)
        draw = sum(1 for h, a in matches if h == a)
        goals = sum(h + a for h, a in matches)
        out.append(
            {"league": league.name, "slug": league.slug, "matches": n, "home": round(home / n, 3),
             "draw": round(draw / n, 3), "away": round((n - home - draw) / n, 3), "goals_per_match": round(goals / n, 2)}
        )
    return {"seasons": period, "leagues": out}


@router.get("/team/{team_slug}/matches")
def get_team_matches(team_slug: str, seasons: str | None = None, db: Session = Depends(get_db)):
    """Tous les matchs de championnat d'un club (saison régulière), dans l'ordre."""
    team = db.query(Team).filter_by(slug=team_slug).order_by(Team.id).first()
    if team is None:
        raise HTTPException(status_code=404, detail=f"Équipe inconnue : '{team_slug}'.")
    available = sorted(
        {s for (s,) in db.query(Match.season).filter((Match.home_team_id == team.id) | (Match.away_team_id == team.id)).distinct()}
    )
    period = _parse_seasons(seasons, available) or available
    names = {t.id: t for t in db.query(Team).filter_by(league_id=team.league_id)}
    rows = (
        db.query(Match)
        .filter(Match.season.in_(period), Match.week.isnot(None))
        .filter((Match.home_team_id == team.id) | (Match.away_team_id == team.id))
        .order_by(Match.date)
        .all()
    )
    matches = []
    for m in rows:
        home = m.home_team_id == team.id
        opp = names.get(m.away_team_id if home else m.home_team_id)
        result, gf, ga = _result_for(team.id, m)
        matches.append(
            {
                "season": m.season,
                "week": m.week,
                "date": m.date.isoformat() if m.date else None,
                "home": home,
                "opponent": opp.name if opp else "?",
                "opponent_slug": opp.slug if opp else None,
                "gf": gf,
                "ga": ga,
                "result": result,
            }
        )
    return {"team": team.name, "seasons": period, "matches": matches}

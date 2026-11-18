"""Charge dans PostgreSQL les CSV générés par collect_league.py."""

import re
import sys
from pathlib import Path

import pandas as pd
from unidecode import unidecode

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))  # pour `import db...`
from difflib import get_close_matches  # noqa: E402

from sqlalchemy import text  # noqa: E402

from db.models import Base, League, Match, Player, PlayerSeasonStat, Standing, Team  # noqa: E402
from db.session import SessionLocal, engine  # noqa: E402
from team_name_mapping import TEAM_NAME_MAPPING, canonical_fbref_name  # noqa: E402

OUTPUT_DIR = Path(__file__).parent / "output"

# Associe le suffixe de fichier CSV
LEAGUES_INFO = {
    "pl": {"slug": "premier-league", "name": "Premier League", "country": "Angleterre"},
    "ligue1": {"slug": "ligue-1", "name": "Ligue 1", "country": "France"},
    "liga": {"slug": "liga", "name": "Liga", "country": "Espagne"},
    "seriea": {"slug": "serie-a", "name": "Serie A", "country": "Italie"},
    "bundesliga": {"slug": "bundesliga", "name": "Bundesliga", "country": "Allemagne"},
}

# Utilisée uniquement pour standings_*.csv, qui ne contient pas de colonne "season"


def slugify(name: str) -> str:
    """Même logique que les registres frontend (accents retirés, minuscules, tirets)."""
    slug = unidecode(str(name)).lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug).strip("-")
    return slug


def safe_float(value) -> float | None:
    return None if pd.isna(value) else float(value)


def safe_int(value) -> int | None:
    return None if pd.isna(value) else int(value)


def normalize_name(name: str) -> str:
    """Nom de joueur normalisé."""
    return " ".join(unidecode(str(name)).lower().split())


def build_extra_stats_lookup(player_extra_df: pd.DataFrame) -> dict:
    """Index les stats étendues FBref par."""
    lookup = {}
    for _, row in player_extra_df.iterrows():
        key = (normalize_name(row["player"]), canonical_fbref_name(row["team"]))
        lookup[key] = row
    return lookup


def _tokens(name: str) -> set[str]:
    """"Kylian Mbappe-Lottin" -> {"kylian", "mbappe", "lottin"}"""
    return set(normalize_name(name).replace("-", " ").split())


def find_extra_stats(extra_lookup: dict, player_name: str, team_name: str):
    """Retrouve la ligne FBref d'un joueur Understat. 1."""
    exact = extra_lookup.get((normalize_name(player_name), team_name))
    if exact is not None:
        return exact
    tokens = _tokens(player_name)
    candidates = [
        row
        for (name, team), row in extra_lookup.items()
        if team == team_name and (tokens <= _tokens(name) or _tokens(name) <= tokens)
    ]
    return candidates[0] if len(candidates) == 1 else None


# --- get_or_create : évite les doublons sur les tables "dimension" --------

def get_or_create_league(session, slug: str, name: str, country: str) -> League:
    league = session.query(League).filter_by(slug=slug).first()
    if league is None:
        league = League(slug=slug, name=name, country=country)
        session.add(league)
        session.flush()  # attribue l'id sans attendre le commit final
    return league


def get_or_create_team(session, league: League, team_name: str) -> Team:
    slug = slugify(team_name)
    team = session.query(Team).filter_by(league_id=league.id, slug=slug).first()
    if team is None:
        team = Team(league_id=league.id, name=team_name, slug=slug)
        session.add(team)
        session.flush()
    return team


def get_or_create_player(session, team: Team, player_name: str, position: str | None, understat_id: int | None) -> Player:
    slug = slugify(player_name)
    player = session.query(Player).filter_by(team_id=team.id, slug=slug).first()
    if player is None:
        player = Player(team_id=team.id, name=player_name, slug=slug, position=position, understat_id=understat_id)
        session.add(player)
        session.flush()
    else:
        # Le poste peut changer d'une saison à l'autre : on garde le dernier.
        if position:
            player.position = position
        if understat_id and not player.understat_id:
            player.understat_id = understat_id
    return player


def main_position(raw) -> str | None:
    """"F M S" -> "F". Understat ajoute "S" (remplaçant) : on prend le premier vrai poste."""
    if pd.isna(raw):
        return None
    codes = [c for c in str(raw).split() if c != "S"]
    return codes[0] if codes else None


def resolve_team_names(csv_slug: str, understat_names, fbref_names) -> dict:
    """Associe chaque nom de club Understat à son nom FBref (référence). 1."""
    manual = TEAM_NAME_MAPPING.get(csv_slug, {})
    fbref_names = list(fbref_names)
    fbref_norm = {normalize_name(n): n for n in fbref_names}
    resolved = {}
    for name in sorted(set(understat_names)):
        if name in manual and manual[name] in fbref_names:
            resolved[name] = manual[name]
            continue
        if name in fbref_names:
            resolved[name] = name
            continue
        tokens = _tokens(name)
        contained = [n for n in fbref_names if _tokens(n) <= tokens or tokens <= _tokens(n)]
        close = get_close_matches(normalize_name(name), list(fbref_norm), n=1, cutoff=0.6)
        if len(contained) == 1:
            resolved[name] = contained[0]
        elif close:
            resolved[name] = fbref_norm[close[0]]
        else:
            print(f"  ! Club Understat sans équivalent FBref : '{name}' (à ajouter dans team_name_mapping.py)")
            resolved[name] = name
            continue
        print(f"  i Rapprochement automatique : '{name}' (Understat) -> '{resolved[name]}' (FBref)")
    return resolved


# --- upsert : insère ou met à jour les tables "fait" ------------------------

def upsert_standing(session, team: Team, season: str, row: pd.Series) -> None:
    standing = session.query(Standing).filter_by(team_id=team.id, season=season).first()
    if standing is None:
        standing = Standing(team_id=team.id, season=season)
        session.add(standing)
    standing.matches_played = safe_int(row["mp"])
    standing.wins = safe_int(row["w"])
    standing.draws = safe_int(row["d"])
    standing.losses = safe_int(row["l"])
    standing.goals_for = safe_int(row["gf"])
    standing.goals_against = safe_int(row["ga"])
    standing.points = safe_int(row["pts"])


def upsert_player_season_stat(session, player: Player, season: str, row: pd.Series, extra: pd.Series | None) -> None:
    """`row` = ligne xg_xa_*.csv (Understat, source principale du joueur)."""
    stat = session.query(PlayerSeasonStat).filter_by(player_id=player.id, season=season).first()
    if stat is None:
        stat = PlayerSeasonStat(player_id=player.id, season=season)
        session.add(stat)

    stat.xg = safe_float(row["xg"])
    stat.xa = safe_float(row["xa"])
    stat.np_xg = safe_float(row["np_xg"])
    stat.xg_chain = safe_float(row["xg_chain"])
    stat.xg_buildup = safe_float(row["xg_buildup"])
    stat.goals = safe_int(row["goals"])
    stat.assists = safe_int(row["assists"])

    # Understat fournit aussi matchs, minutes, tirs et cartons : ils servent de base
    stat.matches_played = safe_int(row.get("matches"))
    stat.minutes = safe_int(row.get("minutes"))
    stat.shots = safe_int(row.get("shots"))
    stat.yellow_cards = safe_int(row.get("yellow_cards"))
    stat.red_cards = safe_int(row.get("red_cards"))

    if extra is not None:
        stat.matches_played = safe_int(extra["mp"])
        stat.starts = safe_int(extra["starts"])
        stat.minutes = safe_int(extra["minutes"])
        stat.shots = safe_int(extra["shots"])
        stat.shots_on_target = safe_int(extra["shots_on_target"])
        stat.shots_on_target_pct = safe_float(extra["shots_on_target_pct"])
        stat.tackles_won = safe_int(extra["tackles_won"])
        stat.interceptions = safe_int(extra["interceptions"])
        stat.yellow_cards = safe_int(extra["yellow_cards"])
        stat.red_cards = safe_int(extra["red_cards"])
        stat.second_yellow_cards = safe_int(extra["second_yellow_cards"])
        stat.fouls_committed = safe_int(extra["fouls_committed"])
        stat.fouls_drawn = safe_int(extra["fouls_drawn"])


# --- chargement d'un championnat --------------------------------------------

def standings_from_matches(matches_df: pd.DataFrame) -> pd.DataFrame:
    """Classement (colonnes mp, w, d, l, gf, ga, pts) à partir des matchs de saison régulière."""
    m = matches_df[matches_df["week"].notna()]
    home = m.rename(columns={"home_team": "team", "home_goals": "gf", "away_goals": "ga"})
    away = m.rename(columns={"away_team": "team", "away_goals": "gf", "home_goals": "ga"})
    rows = pd.concat([home, away])[["team", "gf", "ga"]]
    rows["w"] = (rows["gf"] > rows["ga"]).astype(int)
    rows["d"] = (rows["gf"] == rows["ga"]).astype(int)
    rows["l"] = (rows["gf"] < rows["ga"]).astype(int)
    table = rows.groupby("team", as_index=False).agg(
        mp=("gf", "size"), w=("w", "sum"), d=("d", "sum"), l=("l", "sum"), gf=("gf", "sum"), ga=("ga", "sum")
    )
    table["pts"] = 3 * table["w"] + table["d"]
    return table


def load_matches(session, league: League, season: str, matches_df: pd.DataFrame) -> int:
    """Remplace les matchs de ce championnat/saison par ceux du CSV."""
    session.query(Match).filter_by(league_id=league.id, season=season).delete()
    count = 0
    for _, row in matches_df.iterrows():
        home = get_or_create_team(session, league, row["home_team"])
        away = get_or_create_team(session, league, row["away_team"])
        date = pd.to_datetime(row.get("date"), errors="coerce")
        session.add(
            Match(
                league_id=league.id,
                season=season,
                date=None if pd.isna(date) else date.date(),
                week=safe_int(pd.to_numeric(row.get("week"), errors="coerce")),
                home_team_id=home.id,
                away_team_id=away.id,
                home_goals=int(row["home_goals"]),
                away_goals=int(row["away_goals"]),
            )
        )
        count += 1
    return count


def load_league_season(session, season_dir: Path, csv_slug: str, info: dict) -> dict:
    season = season_dir.name
    summary = {"league": info["name"], "season": season, "standings": 0, "stats": 0, "matches": 0, "extra_matched": 0}
    paths = {
        "standings": season_dir / f"standings_{csv_slug}.csv",
        "xg_xa": season_dir / f"xg_xa_{csv_slug}.csv",
        "player_extra": season_dir / f"player_extra_{csv_slug}.csv",
        "matches": season_dir / f"matches_{csv_slug}.csv",
    }
    if not paths["standings"].exists():
        return summary  # championnat pas (encore) collecté pour cette saison
    has_players = paths["xg_xa"].exists()

    print(f"\n=== {info['name']} · {season} ===")
    league = get_or_create_league(session, info["slug"], info["name"], info["country"])
    standings_df = pd.read_csv(paths["standings"])
    # Saison sans xG (Understat indisponible) : classement et matchs
    # chargés quand même, joueurs ajoutés plus tard quand le CSV existera.
    xg_xa_df = pd.read_csv(paths["xg_xa"]) if has_players else pd.DataFrame(columns=["team", "player", "position"])
    if not has_players:
        print("  i xG Understat absents pour cette saison : classement et matchs seulement.")
    extra_lookup = build_extra_stats_lookup(pd.read_csv(paths["player_extra"])) if paths["player_extra"].exists() else {}

    # Classement recalculé à partir des seuls matchs de saison régulière
    # quand ils sont disponibles : les anciens standings_*.csv comptaient aussi les barrages
    if paths["matches"].exists():
        standings_df = standings_from_matches(pd.read_csv(paths["matches"]))
    standings_df["team"] = standings_df["team"].map(canonical_fbref_name)
    # Ancien format : les barragistes (2 matchs) étaient dans le classement.
    standings_df = standings_df[standings_df["mp"] >= standings_df["mp"].max() / 2]

    team_names = resolve_team_names(csv_slug, xg_xa_df["team"], standings_df["team"])

    for _, row in standings_df.iterrows():
        team = get_or_create_team(session, league, row["team"])
        upsert_standing(session, team, season, row)
        summary["standings"] += 1

    for _, row in xg_xa_df.iterrows():
        team_name = team_names.get(row["team"], row["team"])
        team = get_or_create_team(session, league, team_name)
        understat_id = safe_int(row["player_id"]) if "player_id" in row else None
        player = get_or_create_player(session, team, row["player"], main_position(row["position"]), understat_id)
        extra = find_extra_stats(extra_lookup, row["player"], team_name)
        if extra is not None:
            summary["extra_matched"] += 1
        upsert_player_season_stat(session, player, season, row, extra)
        summary["stats"] += 1

    if paths["matches"].exists():
        matches_df = pd.read_csv(paths["matches"])
        matches_df["home_team"] = matches_df["home_team"].map(canonical_fbref_name)
        matches_df["away_team"] = matches_df["away_team"].map(canonical_fbref_name)
        summary["matches"] = load_matches(session, league, season, matches_df)

    session.commit()
    pct = 100 * summary["extra_matched"] / summary["stats"] if summary["stats"] else 0
    print(
        f"  {summary['standings']} équipes · {summary['stats']} joueurs "
        f"({pct:.0f}% rapprochés avec FBref) · {summary['matches']} matchs"
    )
    return summary


def season_dirs() -> list[Path]:
    """Dossiers output/<saison>/ (4 chiffres), du plus ancien au plus récent."""
    return sorted(p for p in OUTPUT_DIR.iterdir() if p.is_dir() and re.fullmatch(r"\d{4}", p.name))


def main() -> None:
    seasons = season_dirs()
    if not seasons:
        print(f"Aucun dossier de saison dans {OUTPUT_DIR} : lancer d'abord collect_league.py.")
        sys.exit(1)

    # player_season_stats est entièrement régénérée depuis les CSV ; la
    # nouvelle colonne players.understat_id est ajoutée si besoin
    PlayerSeasonStat.__table__.drop(engine, checkfirst=True)
    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE players ADD COLUMN IF NOT EXISTS understat_id INTEGER"))
    print(f"Tables prêtes sur {engine.url.database}. Saisons trouvées : {', '.join(p.name for p in seasons)}")

    summaries = []
    session = SessionLocal()
    try:
        for season_dir in seasons:
            for csv_slug, info in LEAGUES_INFO.items():
                summary = load_league_season(session, season_dir, csv_slug, info)
                if summary["standings"]:
                    summaries.append(summary)
    finally:
        session.close()

    print("\n" + "=" * 70)
    print("Récapitulatif")
    print("=" * 70)
    for s in summaries:
        print(f"{s['season']}  {s['league']:<16} {s['standings']:>3} équipes  {s['stats']:>4} joueurs  {s['matches']:>4} matchs")

    session = SessionLocal()
    try:
        print("\nTotaux en base :")
        for label, model in [("leagues", League), ("teams", Team), ("players", Player),
                             ("player_season_stats", PlayerSeasonStat), ("standings", Standing), ("matches", Match)]:
            print(f"  {label:<20} : {session.query(model).count()}")
    finally:
        session.close()


if __name__ == "__main__":
    main()

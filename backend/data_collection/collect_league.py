"""Collecte classement, résultats match par match (FBref) et xG/xA."""

import argparse
import gc
import json
import sys
import time
from pathlib import Path

import pandas as pd
import soccerdata as sd

OUTPUT_DIR = Path(__file__).parent / "output"

# Identifiants confirmés en interrogeant directement soccerdata plutôt que devinés
LEAGUES = {
    "premier-league": {"soccerdata_id": "ENG-Premier League", "csv_slug": "pl"},
    "ligue-1": {"soccerdata_id": "FRA-Ligue 1", "csv_slug": "ligue1"},
    "liga": {"soccerdata_id": "ESP-La Liga", "csv_slug": "liga"},
    "serie-a": {"soccerdata_id": "ITA-Serie A", "csv_slug": "seriea"},
    "bundesliga": {"soccerdata_id": "GER-Bundesliga", "csv_slug": "bundesliga"},
}

# Codes de saison soccerdata : "2526" = saison 2025-2026.
DEFAULT_SEASONS = ["2526"]
PAUSE_BETWEEN_RUNS_SECONDS = 20


def get_schedule(fbref: sd.FBref) -> pd.DataFrame:
    """Calendrier FBref de la saison, limité aux matchs joués."""
    schedule = fbref.read_schedule().reset_index()
    schedule = schedule[schedule["score"].notna()].copy()
    # Score au format "4–2" (tiret cadratin, parfois tiret simple ou long).
    scores = schedule["score"].str.split(r"[-–—]", expand=True, regex=True)
    schedule["home_goals"] = pd.to_numeric(scores[0], errors="coerce")
    schedule["away_goals"] = pd.to_numeric(scores[1], errors="coerce")
    return schedule.dropna(subset=["home_goals", "away_goals"]).astype({"home_goals": int, "away_goals": int})


def build_matches(schedule: pd.DataFrame) -> pd.DataFrame:
    """Un match par ligne, colonnes stables pour load_to_db.py."""
    columns = {
        "date": "date",
        "week": "week",
        "home_team": "home_team",
        "away_team": "away_team",
        "home_goals": "home_goals",
        "away_goals": "away_goals",
        "home_xg": "home_xg",
        "away_xg": "away_xg",
    }
    present = {src: dst for src, dst in columns.items() if src in schedule.columns}
    matches = schedule[list(present)].rename(columns=present)
    return matches.sort_values("date").reset_index(drop=True)


def build_standings(schedule: pd.DataFrame) -> pd.DataFrame:
    """Classement final recalculé à partir des matchs de saison régulière."""
    if "week" in schedule.columns:
        schedule = schedule[schedule["week"].notna()]
    home = schedule.rename(columns={"home_team": "team", "home_goals": "gf", "away_goals": "ga"})[["team", "gf", "ga"]]
    away = schedule.rename(columns={"away_team": "team", "away_goals": "gf", "home_goals": "ga"})[["team", "gf", "ga"]]
    matches = pd.concat([home, away], ignore_index=True)

    matches["points"] = 0
    matches.loc[matches["gf"] > matches["ga"], "points"] = 3
    matches.loc[matches["gf"] == matches["ga"], "points"] = 1

    standings = (
        matches.groupby("team")
        .agg(
            mp=("team", "size"),
            w=("points", lambda s: (s == 3).sum()),
            d=("points", lambda s: (s == 1).sum()),
            l=("points", lambda s: (s == 0).sum()),
            gf=("gf", "sum"),
            ga=("ga", "sum"),
            pts=("points", "sum"),
        )
        .assign(gd=lambda df: df["gf"] - df["ga"])
    )
    # Barragistes de division inférieure (2 matchs seulement) : retirés du
    # classement. Le 16e garde ses 2 matchs de barrage en plus, comme sur FBref.
    standings = standings[standings["mp"] >= standings["mp"].max() / 2]
    standings = standings.sort_values(["pts", "gd", "gf"], ascending=False).reset_index()
    standings.insert(0, "rank", range(1, len(standings) + 1))
    return standings


def _flatten_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Aplatit les colonnes multi-niveaux de soccerdata (ex."""
    df = df.copy()
    df.columns = [sub if sub else top for top, sub in df.columns]
    return df.reset_index()


def get_player_extra_stats(fbref: sd.FBref) -> pd.DataFrame:
    """Récupère minutes, tirs et discipline/défense des joueurs via FBref."""
    standard = _flatten_columns(fbref.read_player_season_stats(stat_type="standard"))
    shooting = _flatten_columns(fbref.read_player_season_stats(stat_type="shooting"))
    misc = _flatten_columns(fbref.read_player_season_stats(stat_type="misc"))

    key = ["league", "season", "team", "player"]
    merged = standard[key + ["MP", "Starts", "Min"]].rename(
        columns={"MP": "mp", "Starts": "starts", "Min": "minutes"}
    )
    merged = merged.merge(
        shooting[key + ["Sh", "SoT", "SoT%"]].rename(
            columns={"Sh": "shots", "SoT": "shots_on_target", "SoT%": "shots_on_target_pct"}
        ),
        on=key,
        how="left",
    )
    merged = merged.merge(
        misc[key + ["TklW", "Int", "CrdY", "CrdR", "2CrdY", "Fls", "Fld"]].rename(
            columns={
                "TklW": "tackles_won",
                "Int": "interceptions",
                "CrdY": "yellow_cards",
                "CrdR": "red_cards",
                "2CrdY": "second_yellow_cards",
                "Fls": "fouls_committed",
                "Fld": "fouls_drawn",
            }
        ),
        on=key,
        how="left",
    )
    return merged


def _purge_bad_understat_cache(understat: sd.Understat) -> int:
    """Supprime les fichiers JSON du cache Understat vides ou illisibles."""
    # Sous Windows, un fichier encore ouvert ne peut pas être supprimé
    gc.collect()
    removed = 0
    for path in Path(understat.data_dir).glob("*.json"):
        try:
            json.loads(path.read_bytes() or b"")
        except ValueError:
            try:
                path.unlink()
                removed += 1
            except PermissionError:
                print(f"  ! Impossible de supprimer {path} (encore utilisé) : supprimez-le à la main.")
    return removed


def get_xg_xa_stats(understat: sd.Understat, retries: int = 3) -> pd.DataFrame:
    """Stats xG/xA des joueurs de la saison via Understat."""
    # Nettoyage préventif : un fichier vide laissé par une collecte
    # précédente ferait échouer celle-ci d'emblée.
    removed = _purge_bad_understat_cache(understat)
    if removed:
        print(f"  {removed} fichier(s) de cache Understat vide(s) supprimé(s) avant de commencer.")
    for attempt in range(1, retries + 1):
        try:
            return understat.read_player_season_stats().reset_index()
        except ValueError as exc:  # json.JSONDecodeError hérite de ValueError
            removed = _purge_bad_understat_cache(understat)
            if attempt == retries:
                raise
            wait = 30 * attempt
            print(f"  Réponse Understat invalide ({exc}). {removed} fichier(s) de cache supprimé(s), nouvel essai dans {wait} s...")
            time.sleep(wait)


def collect_league_season(league_key: str, season: str, force: bool = False, skip_understat: bool = False) -> dict:
    """Collecte un championnat pour une saison."""
    config = LEAGUES[league_key]
    soccerdata_id = config["soccerdata_id"]
    csv_slug = config["csv_slug"]
    out_dir = OUTPUT_DIR / season
    out_dir.mkdir(parents=True, exist_ok=True)

    paths = {
        "standings": out_dir / f"standings_{csv_slug}.csv",
        "matches": out_dir / f"matches_{csv_slug}.csv",
        "xg_xa": out_dir / f"xg_xa_{csv_slug}.csv",
        "player_extra": out_dir / f"player_extra_{csv_slug}.csv",
    }
    todo = {name for name, path in paths.items() if force or not path.exists()}
    if skip_understat and todo == {"xg_xa"}:
        print(f"\n{league_key} · {season} : FBref déjà collecté, xG Understat ignorés (--skip-understat).")
        return {"league_key": league_key, "season": season, "skipped": True, "understat_missing": True}

    print(f"\n{'=' * 60}")
    print(f"{league_key} · saison {season}  (soccerdata : '{soccerdata_id}')")
    print("=" * 60)
    if not todo:
        print("Déjà collecté (utiliser --force pour recommencer).")
        return {"league_key": league_key, "season": season, "skipped": True}

    fbref = None
    if todo & {"standings", "matches", "player_extra"}:
        fbref = sd.FBref(leagues=soccerdata_id, seasons=season, headless=True)

    if todo & {"standings", "matches"}:
        print("FBref : calendrier et résultats...")
        schedule = get_schedule(fbref)
        build_matches(schedule).to_csv(paths["matches"], index=False, encoding="utf-8")
        standings = build_standings(schedule)
        standings.to_csv(paths["standings"], index=False, encoding="utf-8")
        leader = standings.iloc[0]
        print(f"  {len(schedule)} matchs, {len(standings)} équipes, 1er : {leader['team']} ({leader['pts']} pts)")

    # FBref d'abord : ces stats ne dépendent pas d'Understat.
    if "player_extra" in todo:
        print("FBref : stats étendues (minutes, tirs, tacles, cartons)...")
        player_extra = get_player_extra_stats(fbref)
        player_extra.to_csv(paths["player_extra"], index=False, encoding="utf-8")
        print(f"  {len(player_extra)} joueurs")

    # Understat ensuite : s'il est indisponible (site en maintenance, refus
    # ponctuel), on garde tout ce qui vient de FBref et on signale la saison à relancer plus tard pour les xG
    if "xg_xa" in todo and not skip_understat:
        print("Understat : xG / xA des joueurs...")
        try:
            understat = sd.Understat(leagues=soccerdata_id, seasons=season)
            xg_xa = get_xg_xa_stats(understat)
        except Exception as exc:  # noqa: BLE001
            print(f"  ! Understat indisponible ({exc}). Les xG de cette saison seront à relancer plus tard.")
            return {"league_key": league_key, "season": season, "skipped": False, "understat_missing": True}
        xg_xa.to_csv(paths["xg_xa"], index=False, encoding="utf-8")
        print(f"  {len(xg_xa)} joueurs")
    elif "xg_xa" in todo:
        return {"league_key": league_key, "season": season, "skipped": False, "understat_missing": True}

    return {"league_key": league_key, "season": season, "skipped": False}


def main() -> None:
    parser = argparse.ArgumentParser(description="Collecte FBref + Understat par championnat et par saison.")
    parser.add_argument("league", choices=[*LEAGUES, "all"], help="Championnat à traiter, ou 'all' pour les 5")
    parser.add_argument(
        "--seasons",
        nargs="+",
        default=DEFAULT_SEASONS,
        help="Codes de saison soccerdata, ex : 2122 2223 2324 2425 2526 (défaut : 2526)",
    )
    parser.add_argument("--force", action="store_true", help="Recollecter même si les fichiers existent")
    parser.add_argument(
        "--skip-understat",
        action="store_true",
        help="Ne collecter que FBref (utile quand Understat est indisponible)",
    )
    args = parser.parse_args()

    leagues = list(LEAGUES) if args.league == "all" else [args.league]
    runs = [(league, season) for season in args.seasons for league in leagues]
    failures = []
    understat_missing = []

    for index, (league, season) in enumerate(runs):
        try:
            result = collect_league_season(league, season, force=args.force, skip_understat=args.skip_understat)
        except Exception as exc:  # noqa: BLE001 - on continue avec le suivant, l'erreur est affichée
            print(f"! Échec pour {league} {season} : {exc}")
            failures.append(f"{league} {season}")
            continue
        if result.get("understat_missing"):
            understat_missing.append(f"{league} {season}")
        # Pause entre deux collectes réelles, pour ménager l'anti-bot FBref.
        if not result["skipped"] and index < len(runs) - 1:
            time.sleep(PAUSE_BETWEEN_RUNS_SECONDS)

    print("\n" + "=" * 60)
    print(f"Terminé : {len(runs) - len(failures)}/{len(runs)} collectes réussies.")
    if understat_missing:
        print(
            "xG Understat manquants (à relancer quand le site sera de retour, même commande sans "
            "--skip-understat) : " + ", ".join(understat_missing)
        )
    if failures:
        print("À relancer (même commande, les fichiers déjà faits seront gardés) : " + ", ".join(failures))
        sys.exit(1)


if __name__ == "__main__":
    main()

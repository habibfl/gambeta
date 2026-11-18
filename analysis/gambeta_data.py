"""Chargement et nettoyage des données Gambeta pour l'analyse."""

from pathlib import Path

import numpy as np
import pandas as pd

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "backend" / "data_collection" / "output"

LEAGUES = {
    "pl": "Premier League",
    "liga": "Liga",
    "seriea": "Serie A",
    "bundesliga": "Bundesliga",
    "ligue1": "Ligue 1",
}

# FBref a changé l'orthographe de certains clubs d'une saison à l'autre.
FBREF_TEAM_ALIASES = {"Paris SG": "PSG"}

POSITIONS = {"F": "Attaquant", "M": "Milieu", "D": "Défenseur", "GK": "Gardien"}


def season_label(code: str) -> str:
    """'2122' -> '2021-22'"""
    return f"20{code[:2]}-{code[2:]}"


def _season_dirs(output_dir: Path = OUTPUT_DIR) -> list[Path]:
    return sorted(p for p in output_dir.iterdir() if p.is_dir() and p.name.isdigit() and len(p.name) == 4)


def _read_all(kind: str, output_dir: Path = OUTPUT_DIR) -> pd.DataFrame:
    """Concatène <saison>/<kind>_<ligue>.csv pour toutes les saisons et ligues."""
    frames = []
    for season_dir in _season_dirs(output_dir):
        for slug, league in LEAGUES.items():
            path = season_dir / f"{kind}_{slug}.csv"
            if path.exists():
                df = pd.read_csv(path)
                df["season"] = season_dir.name
                df["league"] = league
                frames.append(df)
    if not frames:
        raise FileNotFoundError(f"Aucun fichier {kind}_*.csv trouvé dans {output_dir}")
    return pd.concat(frames, ignore_index=True)


def load_matches(output_dir: Path = OUTPUT_DIR) -> pd.DataFrame:
    """Un match de championnat par ligne."""
    m = _read_all("matches", output_dir)
    m = m[m["week"].notna()].copy()
    for col in ("home_team", "away_team"):
        m[col] = m[col].replace(FBREF_TEAM_ALIASES)
    m["date"] = pd.to_datetime(m["date"])
    m["total_goals"] = m["home_goals"] + m["away_goals"]
    m["result"] = np.select(
        [m["home_goals"] > m["away_goals"], m["home_goals"] == m["away_goals"]],
        ["Domicile", "Nul"],
        "Extérieur",
    )
    return m


def load_standings(output_dir: Path = OUTPUT_DIR) -> pd.DataFrame:
    """Classements finaux, recalculés à partir des seuls matchs de saison régulière."""
    m = load_matches(output_dir)
    home = m.rename(columns={"home_team": "team", "home_goals": "gf", "away_goals": "ga"})
    away = m.rename(columns={"away_team": "team", "away_goals": "gf", "home_goals": "ga"})
    rows = pd.concat([home, away])[["league", "season", "team", "gf", "ga"]]
    rows["w"] = (rows["gf"] > rows["ga"]).astype(int)
    rows["d"] = (rows["gf"] == rows["ga"]).astype(int)
    rows["l"] = (rows["gf"] < rows["ga"]).astype(int)
    s = rows.groupby(["league", "season", "team"], as_index=False).agg(
        mp=("gf", "size"), w=("w", "sum"), d=("d", "sum"), l=("l", "sum"), gf=("gf", "sum"), ga=("ga", "sum")
    )
    s["pts"] = 3 * s["w"] + s["d"]
    s["gd"] = s["gf"] - s["ga"]
    s = s.sort_values(["league", "season", "pts", "gd", "gf"], ascending=[True, True, False, False, False])
    s["rank"] = s.groupby(["league", "season"]).cumcount() + 1
    s["pts_per_match"] = s["pts"] / s["mp"]
    s["gd_per_match"] = s["gd"] / s["mp"]
    return s.reset_index(drop=True)


def load_players(season: str = "2526", output_dir: Path = OUTPUT_DIR) -> pd.DataFrame:
    """Stats Understat (xG, xA...) d'une saison."""
    p = _read_all("xg_xa", output_dir)
    p = p[p["season"] == season].copy()
    codes = p["position"].fillna("").str.split().apply(lambda c: [x for x in c if x != "S"])
    p["position_code"] = codes.apply(lambda c: c[0] if c else None)
    p["poste"] = p["position_code"].map(POSITIONS)
    for col in ["goals", "xg", "np_goals", "np_xg", "assists", "xa", "shots", "key_passes", "xg_chain", "xg_buildup"]:
        p[f"{col}_90"] = np.where(p["minutes"] > 0, p[col] * 90 / p["minutes"], np.nan)
    p["goals_minus_xg"] = p["goals"] - p["xg"]
    return p.reset_index(drop=True)

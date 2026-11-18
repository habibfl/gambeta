"""Tests statistiques exportés vers le site (frontend/src/data/stats.json)."""

import json
from math import erfc, sqrt
from pathlib import Path

import pandas as pd

from gambeta_data import load_matches

OUT = Path(__file__).resolve().parent.parent / "frontend" / "src" / "data" / "stats.json"
Z = 1.959964  # quantile 97,5 % de la loi normale


def wilson(k, n):
    """Intervalle de confiance à 95 % d'une proportion (Wilson)."""
    if n == 0:
        return (0.0, 0.0)
    p = k / n
    denom = 1 + Z**2 / n
    centre = (p + Z**2 / (2 * n)) / denom
    half = Z * sqrt(p * (1 - p) / n + Z**2 / (4 * n**2)) / denom
    return centre - half, centre + half


def p_value_half(k, n):
    """p-valeur bilatérale du test « la proportion vaut 50 % »."""
    z = (k - n / 2) / sqrt(n / 4)
    return erfc(abs(z) / sqrt(2))


def mean_ci(values):
    s = pd.Series(values, dtype=float)
    m, sd, n = s.mean(), s.std(ddof=1), len(s)
    half = Z * sd / sqrt(n)
    return m, m - half, m + half


def summarize(df):
    n = len(df)
    home = int((df["home_goals"] > df["away_goals"]).sum())
    away = int((df["home_goals"] < df["away_goals"]).sum())
    decisive = home + away
    lo, hi = wilson(home, decisive)
    diff, dlo, dhi = mean_ci(df["home_goals"] - df["away_goals"])
    gpm, glo, ghi = mean_ci(df["home_goals"] + df["away_goals"])
    r = lambda v: round(float(v), 4)  # noqa: E731
    return {
        "matches": n,
        "home_wins": home,
        "away_wins": away,
        "draws": n - decisive,
        "home_share": r(home / decisive),
        "home_share_ci": [r(lo), r(hi)],
        "p_value": float(f"{p_value_half(home, decisive):.3g}"),
        "goal_diff": r(diff),
        "goal_diff_ci": [r(dlo), r(dhi)],
        "goals_per_match": r(gpm),
        "goals_per_match_ci": [r(glo), r(ghi)],
    }


def main():
    m = load_matches()
    rows = []
    for (league, season), g in m.groupby(["league", "season"]):
        rows.append({"league": league, "season": season, **summarize(g)})
    for league, g in m.groupby("league"):
        rows.append({"league": league, "season": "all", **summarize(g)})
    rows.append({"league": "all", "season": "all", **summarize(m)})
    OUT.write_text(json.dumps({"home_advantage": rows}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    sig = [x for x in rows if x["season"] != "all" and x["p_value"] >= 0.05]
    print(f"Écrit : {OUT} — {len(rows)} lignes ; saisons où l'avantage n'est PAS significatif (p >= 0,05) : {len(sig)}")
    for x in sig:
        print("   ", x["league"], x["season"], x["home_share"], x["home_share_ci"], x["p_value"])


if __name__ == "__main__":
    main()

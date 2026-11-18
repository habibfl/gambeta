"""Prépare les données de la simulation Monte Carlo du site."""

import json
from pathlib import Path

from gambeta_data import load_matches
from gambeta_models import fit_poisson

OUT = Path(__file__).resolve().parent.parent / "frontend" / "public" / "data" / "simulation.json"
RHO = -0.086  # paramètre de Dixon-Coles estimé dans export_models.py


def main():
    m = load_matches()
    t0 = m["date"].min().normalize()
    day = lambda d: int((d - t0).days)  # noqa: E731
    seasons = sorted(m["season"].unique())[1:]
    out = {"base_date": t0.strftime("%Y-%m-%d"), "rho": RHO, "leagues": {}}
    for league, lm in m.groupby("league"):
        out["leagues"][league] = {}
        for season in seasons:
            sm = lm[lm["season"] == season].sort_values("date")
            teams = sorted(set(sm["home_team"]) | set(sm["away_team"]))
            idx = {t: i for i, t in enumerate(teams)}
            matches = [
                [day(r.date), idx[r.home_team], idx[r.away_team], int(r.home_goals), int(r.away_goals)]
                for r in sm.itertuples()
            ]
            snapshots = []
            for week, wm in sm.groupby("week"):
                as_of = wm["date"].min()
                model = fit_poisson(lm, as_of)
                snapshots.append(
                    {
                        "week": int(week),
                        "day": day(as_of),
                        "mu": round(model["mu"], 4),
                        "home": round(model["home"], 4),
                        "att": [round(model["att"].get(t, 0.0), 3) for t in teams],
                        "def": [round(model["def"].get(t, 0.0), 3) for t in teams],
                    }
                )
            out["leagues"][league][season] = {"teams": teams, "matches": matches, "snapshots": snapshots}
        print(league, "ok")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Écrit : {OUT} ({OUT.stat().st_size // 1024} Ko)")


if __name__ == "__main__":
    main()

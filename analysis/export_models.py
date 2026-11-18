"""Exporte les résultats des modèles (Elo, Poisson, backtest) vers frontend/src/data/models.json."""

import json
from pathlib import Path

import numpy as np
import pandas as pd

from gambeta_data import load_matches
from gambeta_models import (
    ELO_REGRESS,
    HALF_LIFE_DAYS,
    RIDGE,
    backtest,
    expected_points,
    fit_poisson,
    fit_rho,
    run_elo,
    tune_elo,
)

OUT = Path(__file__).resolve().parent.parent / "frontend" / "src" / "data" / "models.json"
r = lambda v, d=3: round(float(v), d)  # noqa: E731


def main():
    m = load_matches()
    t0 = m["date"].min().normalize()
    day = lambda d: int((d - t0).days)  # noqa: E731
    seasons = sorted(m["season"].unique())
    latest = seasons[-1]

    # --- Elo -------------------------------------------------------------
    grid, k, h = tune_elo(m)
    hist, _ = run_elo(m, k, h)
    elo = {}
    for league, lh in hist.groupby("league"):
        teams = {
            team: [[day(row.date), int(round(row.elo))] for row in th.sort_values("date").itertuples()]
            for team, th in lh.groupby("team")
        }
        starts = [{"season": s, "day": day(m[(m.league == league) & (m.season == s)]["date"].min())} for s in seasons]
        now = (
            lh[lh["season"] == latest].sort_values("date").groupby("team").tail(1).sort_values("elo", ascending=False)
        )
        elo[league] = {
            "teams": teams,
            "season_starts": starts,
            "ranking": [{"team": t, "elo": int(round(e))} for t, e in zip(now["team"], now["elo"])],
        }

    # --- Poisson : rho estimé avant les saisons test, puis backtest -------
    test_start = m[m["season"] == "2425"]["date"].min()
    rhos = []
    for league, lm in m.groupby("league"):
        model = fit_poisson(lm, test_start)
        prev = lm[(lm["date"] < test_start) & (lm["date"] >= test_start - pd.Timedelta(days=365))]
        rhos.append(fit_rho(prev, model))
    rho_bt = float(np.mean(rhos))
    results, calib, preds = backtest(m, elo_k=k, elo_home=h, rho=rho_bt)

    # Forces actuelles (après le dernier match), pour le prédicteur de match
    as_of = m["date"].max() + pd.Timedelta(days=1)
    poisson = {}
    for league, lm in m.groupby("league"):
        model = fit_poisson(lm, as_of)
        rho = fit_rho(lm[lm["date"] >= as_of - pd.Timedelta(days=365)], model)
        current = sorted(set(lm[lm.season == latest]["home_team"]) | set(lm[lm.season == latest]["away_team"]))
        poisson[league] = {
            "mu": r(model["mu"], 4),
            "home": r(model["home"], 4),
            "rho": r(rho, 3),
            "teams": {t: {"att": r(model["att"][t], 4), "def": r(model["def"][t], 4)} for t in current},
        }

    # Points attendus (xPts) match par match, saisons test
    xp = expected_points(preds, m)
    xpts = [
        {"league": x.league, "season": x.season, "team": x.team, "xpts": r(x.xpts, 1), "pts": int(x.pts), "diff": r(x.diff, 1), "n": int(x.n)}
        for x in xp.sort_values(["league", "season", "pts"], ascending=[True, True, False]).itertuples()
    ]
    # Persistance : l'écart de 2024-25 se répète-t-il en 2025-26 ?
    wide = xp.pivot_table(index=["league", "team"], columns="season", values="diff").dropna()
    xpts_persistence = r(np.corrcoef(wide["2425"], wide["2526"])[0, 1], 3) if len(wide) > 5 else None
    rmse_xpts = r(np.sqrt((xp["diff"] ** 2).mean()), 2)

    # Les plus grosses surprises du backtest (résultat jugé le moins probable), 6 par championnat
    preds["p_actual"] = [p[o] for p, o in zip(preds["poisson"], preds["outcome"])]
    upsets = preds.sort_values("p_actual").groupby("league").head(6)
    labels = ["victoire à domicile", "nul", "victoire à l'extérieur"]
    data = {
        "generated_from": "analysis/export_models.py (modèles : analysis/gambeta_models.py)",
        "base_date": t0.strftime("%Y-%m-%d"),
        "matches": int(len(m)),
        "params": {
            "elo_k": k,
            "elo_home": h,
            "elo_regress": r(ELO_REGRESS, 3),
            "half_life_days": HALF_LIFE_DAYS,
            "ridge": RIDGE,
            "rho_backtest": r(rho_bt, 3),
        },
        "elo_grid": [{"k": int(g.k), "home": int(g.home), "brier": r(g.brier, 5)} for g in grid.itertuples()],
        "elo": elo,
        "poisson": poisson,
        "backtest": [
            {"season": x.season, "model": x.model, "log_loss": r(x.log_loss, 4), "brier": r(x.brier, 4), "accuracy": r(x.accuracy, 4), "n": int(x.n)}
            for x in results.itertuples()
        ],
        "xpts": xpts,
        "xpts_summary": {"persistence": xpts_persistence, "rmse": rmse_xpts, "pairs": int(len(wide))},
        "calibration": [{"bin": c.bin, "predicted": r(c.predicted), "observed": r(c.observed), "n": int(c.n)} for c in calib.itertuples()],
        "upsets": [
            {
                "league": u.league, "season": u.season, "week": int(u.week), "home": u.home, "away": u.away,
                "result": labels[u.outcome], "probability": r(u.p_actual),
                "score": m[(m.league == u.league) & (m.season == u.season) & (m.home_team == u.home) & (m.away_team == u.away)][["home_goals", "away_goals"]].iloc[0].astype(int).tolist(),
            }
            for u in upsets.itertuples()
        ],
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Écrit : {OUT} ({OUT.stat().st_size // 1024} Ko) — K={k}, domicile={h}, rho={rho_bt:.3f}")


if __name__ == "__main__":
    main()

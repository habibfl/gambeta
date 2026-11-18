"""Exporte les résultats des analyses."""

import json
from pathlib import Path

import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

import gambeta_data as gd

OUT = Path(__file__).resolve().parent.parent / "frontend" / "src" / "data" / "insights.json"
LEAGUE_ORDER = ["Premier League", "Liga", "Serie A", "Bundesliga", "Ligue 1"]


def r(x, n=2):
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), n)


def main():
    matches = gd.load_matches()
    standings = gd.load_standings()
    players = gd.load_players("2526")
    seasons = sorted(matches.season.unique())

    # --- Q1 : buts par match et avantage du terrain ---------------------------
    per = matches.groupby(["league", "season"]).agg(
        gpm=("total_goals", "mean"),
        home=("result", lambda x: (x == "Domicile").mean()),
        draw=("result", lambda x: (x == "Nul").mean()),
        away=("result", lambda x: (x == "Extérieur").mean()),
    )
    goals = [
        {"league": lg, "values": [{"season": s, "value": r(per.loc[(lg, s), "gpm"])} for s in seasons]}
        for lg in LEAGUE_ORDER
    ]
    res = matches.groupby("league")["result"].value_counts(normalize=True).unstack()
    home = [
        {"league": lg, "home": r(res.loc[lg, "Domicile"], 3), "draw": r(res.loc[lg, "Nul"], 3), "away": r(res.loc[lg, "Extérieur"], 3)}
        for lg in LEAGUE_ORDER
    ]

    # --- Q2 : écart entre le champion et son dauphin -------------------------
    titles = []
    for (lg, s), t in standings.groupby(["league", "season"]):
        t = t.sort_values("rank")
        titles.append({"league": lg, "season": s, "champion": t.team.iloc[0], "points": int(t.pts.iloc[0]),
                       "runner_up": t.team.iloc[1], "gap": int(t.pts.iloc[0] - t.pts.iloc[1])})

    # --- Q3 : points vs différence de buts, et persistance ------------------
    slope, intercept = np.polyfit(standings.gd_per_match, standings.pts_per_match, 1)
    r2 = np.corrcoef(standings.gd_per_match, standings.pts_per_match)[0, 1] ** 2
    standings["exp"] = (intercept + slope * standings.gd_per_match) * standings.mp
    standings["delta"] = standings.pts - standings.exp
    teams = [
        {"league": t.league, "season": t.season, "team": t.team, "rank": int(t["rank"]), "points": int(t.pts),
         "gd": int(t.gd), "gd_pm": r(t.gd_per_match, 3), "pts_pm": r(t.pts_per_match, 3), "delta": r(t.delta, 1)}
        for _, t in standings.iterrows()
    ]
    nxt = {"2122": "2223", "2223": "2324", "2324": "2425", "2425": "2526"}
    standings["next"] = standings.season.map(nxt)
    paired = standings.merge(standings[["league", "team", "season", "delta", "pts"]],
                             left_on=["league", "team", "next"], right_on=["league", "team", "season"], suffixes=("", "_n"))
    lucky, unlucky = paired[paired.delta >= 6], paired[paired.delta <= -6]
    persistence = {
        "pairs": int(len(paired)),
        "corr_delta": r(np.corrcoef(paired.delta, paired.delta_n)[0, 1]),
        "corr_points": r(np.corrcoef(paired.pts, paired.pts_n)[0, 1]),
        "lucky": {"n": int(len(lucky)), "delta": r(lucky.delta.mean(), 1), "delta_next": r(lucky.delta_n.mean(), 1),
                  "points_change": r((lucky.pts_n - lucky.pts).mean(), 1)},
        "unlucky": {"n": int(len(unlucky)), "delta": r(unlucky.delta.mean(), 1), "delta_next": r(unlucky.delta_n.mean(), 1),
                    "points_change": r((unlucky.pts_n - unlucky.pts).mean(), 1)},
    }

    # --- Q4 : finisseurs 2025-26 ---------------------------------------------
    regulars = players[(players.minutes >= 900) & (players.position_code != "GK")].copy()
    finishers = [
        {"player": p.player, "team": p.team, "league": p.league, "goals": int(p.goals), "xg": r(p.xg, 1),
         "diff": r(p.goals_minus_xg, 1), "minutes": int(p.minutes)}
        for _, p in regulars.iterrows()
    ]
    tot = players[["goals", "xg"]].sum()
    by_league = players.groupby("league")[["goals", "xg"]].sum()

    # --- Q5 : profils K-means (même paramétrage que le notebook) -------------
    features = {"np_xg_90": "Danger (npxG)", "xa_90": "Création (xA)", "shots_90": "Tirs", "key_passes_90": "Passes clés",
                "xg_chain_90": "Implication (xGChain)", "xg_buildup_90": "Construction (xGBuildup)"}
    X = StandardScaler().fit_transform(regulars[list(features)])
    km = KMeans(5, n_init=20, random_state=0).fit(X)
    regulars["groupe"] = km.labels_
    centers = km.cluster_centers_

    def name(c):
        d = dict(zip(features.values(), c))
        if d["Danger (npxG)"] > 1 and d["Création (xA)"] > 1:
            return "Stars offensives complètes"
        if d["Danger (npxG)"] > 0.8:
            return "Finisseurs"
        if d["Construction (xGBuildup)"] > 0.5 and d["Danger (npxG)"] < 0:
            return "Relanceurs / constructeurs"
        if d["Création (xA)"] > 0.2:
            return "Créateurs"
        return "Profils défensifs"

    order = ["Stars offensives complètes", "Finisseurs", "Créateurs", "Relanceurs / constructeurs", "Profils défensifs"]
    profiles = []
    for g, c in enumerate(centers):
        grp = regulars[regulars.groupe == g]
        profiles.append({
            "name": name(c),
            "players": int(len(grp)),
            "values": [r(v, 3) for v in c],
            "examples": grp.sort_values("xg_chain_90", ascending=False).player.head(6).tolist(),
            "positions": {k: int(round(v)) for k, v in grp.poste.value_counts(normalize=True).mul(100).items()},
        })
    profiles.sort(key=lambda p: order.index(p["name"]))
    assert len({p["name"] for p in profiles}) == 5

    data = {
        "generated_from": "analysis/export_insights.py (mêmes calculs que analysis/gambeta_analyses.ipynb)",
        "seasons": seasons,
        "counts": {"matches": int(len(matches)), "team_seasons": int(len(standings)), "players_2526": int(len(players)),
                   "regulars_2526": int(len(regulars))},
        "goals_per_match": goals,
        "home_advantage": home,
        "titles": titles,
        "points_model": {"intercept": r(intercept, 3), "slope": r(slope, 3), "r2": r(r2), "teams": teams},
        "persistence": persistence,
        "finishing": {"total_goals": int(tot.goals), "total_xg": r(tot.xg, 0),
                      "gap_pct": r(tot.goals / tot.xg - 1, 4),
                      "by_league": [{"league": lg, "gap_pct": r(by_league.loc[lg, "goals"] / by_league.loc[lg, "xg"] - 1, 4)} for lg in LEAGUE_ORDER],
                      "corr": r(np.corrcoef(regulars.goals, regulars.xg)[0, 1]),
                      "players": finishers},
        "profiles": {"features": list(features.values()), "groups": profiles},
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Écrit : {OUT} ({OUT.stat().st_size // 1024} Ko)")


if __name__ == "__main__":
    main()

"""Modèles prédictifs de Gambeta (Elo, Poisson Dixon-Coles, backtest), à partir des seuls résultats."""

from math import exp, factorial, log

import numpy as np
import pandas as pd

from gambeta_data import load_matches

# --------------------------------------------------------------------------
# 1. Elo
# --------------------------------------------------------------------------
ELO_START = 1500
ELO_REGRESS = 1 / 3  # entre deux saisons, on revient d'un tiers vers 1500


def _goal_multiplier(diff: int) -> float:
    """Une victoire large compte un peu plus (formule du World Football Elo)."""
    d = abs(diff)
    return 1.0 if d <= 1 else 1.5 if d == 2 else (11 + d) / 8


def run_elo(matches: pd.DataFrame, k: float = 20, home_adv: float = 60):
    """Parcourt les matchs dans l'ordre chronologique."""
    hist, pre = [], []
    for league, lm in matches.sort_values("date").groupby("league", sort=False):
        ratings, last_season, end_ratings = {}, {}, {}
        seasons = sorted(lm["season"].unique())
        for season in seasons:
            sm = lm[lm["season"] == season]
            teams = set(sm["home_team"]) | set(sm["away_team"])
            prev = end_ratings.get(seasons[seasons.index(season) - 1]) if seasons.index(season) else None
            promoted_level = float(np.mean(sorted(prev.values())[:3])) if prev else ELO_START
            for t in teams:
                if t in ratings and prev and t in prev:
                    ratings[t] = ELO_START + (ratings[t] - ELO_START) * (1 - ELO_REGRESS)
                else:
                    ratings[t] = promoted_level if prev else ELO_START
            for row in sm.itertuples(index=False):
                h, a = row.home_team, row.away_team
                e = 1 / (1 + 10 ** (-(ratings[h] + home_adv - ratings[a]) / 400))
                s = 1.0 if row.home_goals > row.away_goals else 0.5 if row.home_goals == row.away_goals else 0.0
                pre.append({"league": league, "season": season, "date": row.date, "home": h, "away": a, "e_home": e, "s_home": s})
                delta = k * _goal_multiplier(row.home_goals - row.away_goals) * (s - e)
                ratings[h] += delta
                ratings[a] -= delta
                hist.append({"league": league, "season": season, "date": row.date, "team": h, "elo": ratings[h]})
                hist.append({"league": league, "season": season, "date": row.date, "team": a, "elo": ratings[a]})
            end_ratings[season] = {t: ratings[t] for t in teams}
            last_season.update({t: season for t in teams})
    return pd.DataFrame(hist), pd.DataFrame(pre)


def tune_elo(matches: pd.DataFrame, ks=(10, 15, 20, 25, 30, 40), homes=(0, 30, 60, 90, 120)):
    """Recherche sur grille : erreur de Brier de l'espérance Elo."""
    first = sorted(matches["season"].unique())[0]
    grid = []
    for k in ks:
        for h in homes:
            _, pre = run_elo(matches, k, h)
            p = pre[pre["season"] != first]
            grid.append({"k": k, "home": h, "brier": float(((p["e_home"] - p["s_home"]) ** 2).mean())})
    grid = pd.DataFrame(grid)
    best = grid.loc[grid["brier"].idxmin()]
    return grid, int(best["k"]), int(best["home"])


# --------------------------------------------------------------------------
# 2. Modèle de Poisson (Dixon-Coles)
# --------------------------------------------------------------------------
HALF_LIFE_DAYS = 240  # un match d'il y a 8 mois compte moitié moins
RIDGE = 2.0  # pénalité sur les forces d'attaque / défense
MAX_GOALS = 10


def fit_poisson(train: pd.DataFrame, as_of: pd.Timestamp, half_life: float = HALF_LIFE_DAYS, ridge: float = RIDGE):
    """Régression de Poisson pondérée (IRLS)."""
    train = train[train["date"] < as_of]
    age = (as_of - train["date"]).dt.days.to_numpy()
    keep = age < 3 * half_life * 2  # au-delà, le poids est négligeable
    train, age = train[keep], age[keep]
    teams = sorted(set(train["home_team"]) | set(train["away_team"]))
    idx = {t: i for i, t in enumerate(teams)}
    n_t, n = len(teams), len(train)
    w = np.exp(-np.log(2) * age / half_life)

    # 2 observations par match : buts à domicile, buts à l'extérieur
    p = 2 + 2 * n_t
    X = np.zeros((2 * n, p))
    y = np.empty(2 * n)
    weights = np.concatenate([w, w])
    hi = train["home_team"].map(idx).to_numpy()
    ai = train["away_team"].map(idx).to_numpy()
    r = np.arange(n)
    X[:, 0] = 1
    X[r, 1] = 1  # avantage du terrain
    X[r, 2 + hi] = 1
    X[r, 2 + n_t + ai] = -1
    X[n + r, 2 + ai] = 1
    X[n + r, 2 + n_t + hi] = -1
    y[:n] = train["home_goals"].to_numpy()
    y[n:] = train["away_goals"].to_numpy()

    penalty = np.full(p, ridge)
    penalty[:2] = 0
    beta = np.zeros(p)
    beta[0] = np.log(max(y.mean(), 0.1))
    for _ in range(25):
        eta = X @ beta
        mu = np.exp(eta)
        z = eta + (y - mu) / mu
        W = weights * mu
        A = X.T @ (X * W[:, None]) + np.diag(penalty)
        new = np.linalg.solve(A, X.T @ (W * z))
        if np.max(np.abs(new - beta)) < 1e-6:
            beta = new
            break
        beta = new
    return {
        "mu": float(beta[0]),
        "home": float(beta[1]),
        "att": {t: float(beta[2 + i]) for t, i in idx.items()},
        "def": {t: float(beta[2 + n_t + i]) for t, i in idx.items()},
    }


def expected_goals(model, home, away):
    att, de = model["att"], model["def"]
    lh = exp(model["mu"] + model["home"] + att.get(home, 0) - de.get(away, 0))
    la = exp(model["mu"] + att.get(away, 0) - de.get(home, 0))
    return lh, la


def _pmf(k, lam):
    return exp(-lam) * lam**k / factorial(k)


def score_matrix(lh, la, rho=0.0):
    """Probabilité de chaque score (i buts à domicile, j à l'extérieur)."""
    m = np.array([[_pmf(i, lh) * _pmf(j, la) for j in range(MAX_GOALS + 1)] for i in range(MAX_GOALS + 1)])
    m[0, 0] *= 1 - lh * la * rho
    m[0, 1] *= 1 + lh * rho
    m[1, 0] *= 1 + la * rho
    m[1, 1] *= 1 - rho
    return m / m.sum()


def outcome_probs(m):
    return float(np.tril(m, -1).sum()), float(np.trace(m)), float(np.triu(m, 1).sum())


def fit_rho(train: pd.DataFrame, model, grid=np.linspace(-0.2, 0.1, 31)):
    """Paramètre de Dixon-Coles choisi par maximum de vraisemblance."""
    best, best_ll = 0.0, -np.inf
    rows = [(expected_goals(model, r.home_team, r.away_team), r.home_goals, r.away_goals) for r in train.itertuples()]
    for rho in grid:
        ll = 0.0
        for (lh, la), hg, ag in rows:
            tau = 1.0
            if hg == 0 and ag == 0:
                tau = 1 - lh * la * rho
            elif hg == 0 and ag == 1:
                tau = 1 + lh * rho
            elif hg == 1 and ag == 0:
                tau = 1 + la * rho
            elif hg == 1 and ag == 1:
                tau = 1 - rho
            ll += log(max(tau, 1e-9))
        if ll > best_ll:
            best, best_ll = float(rho), ll
    return best


# --------------------------------------------------------------------------
# 3. Backtest
# --------------------------------------------------------------------------
def _scores(probs: np.ndarray, outcome: np.ndarray):
    """probs : (n, 3) [domicile, nul, extérieur] ; outcome : indice 0/1/2."""
    n = len(outcome)
    onehot = np.zeros_like(probs)
    onehot[np.arange(n), outcome] = 1
    p_true = np.clip(probs[np.arange(n), outcome], 1e-12, 1)
    return {
        "log_loss": float(-np.log(p_true).mean()),
        "brier": float(((probs - onehot) ** 2).sum(axis=1).mean()),
        "accuracy": float((probs.argmax(axis=1) == outcome).mean()),
        "n": int(n),
    }


def backtest(matches: pd.DataFrame, test_seasons=("2425", "2526"), elo_k=20, elo_home=60, rho=-0.05):
    """Chaque journée des saisons test est prédite avec un modèle ajusté sur les seuls matchs
    déjà joués."""
    _, pre = run_elo(matches, elo_k, elo_home)
    pre = pre.set_index(["league", "date", "home", "away"])
    rows = []
    for league, lm in matches.groupby("league"):
        for season in test_seasons:
            sm = lm[lm["season"] == season]
            for week, wm in sm.groupby("week"):
                as_of = wm["date"].min()
                train = lm[lm["date"] < as_of]
                model = fit_poisson(train, as_of)
                hist = train[train["date"] >= as_of - pd.Timedelta(days=730)]
                base = hist["result"].value_counts(normalize=True)
                draw_rate = base.get("Nul", 0.25)
                for r in wm.itertuples():
                    lh, la = expected_goals(model, r.home_team, r.away_team)
                    ph, pd_, pa = outcome_probs(score_matrix(lh, la, rho))
                    e = pre.loc[(league, r.date, r.home_team, r.away_team), "e_home"]
                    e = float(e.iloc[0]) if hasattr(e, "iloc") else float(e)
                    eh = max(e - draw_rate / 2, 0.01)
                    ea = max(1 - e - draw_rate / 2, 0.01)
                    s = eh + draw_rate + ea
                    rows.append({
                        "league": league, "season": season, "week": week,
                        "home": r.home_team, "away": r.away_team,
                        "outcome": {"Domicile": 0, "Nul": 1, "Extérieur": 2}[r.result],
                        "poisson": (ph, pd_, pa),
                        "elo": (eh / s, draw_rate / s, ea / s),
                        "naive": (base.get("Domicile", 0.45), draw_rate, base.get("Extérieur", 0.3)),
                    })
    df = pd.DataFrame(rows)
    results = []
    for season, sd in [("Toutes", df)] + list(df.groupby("season")):
        out = sd["outcome"].to_numpy()
        for name, label in [("poisson", "Poisson (Dixon-Coles)"), ("elo", "Elo"), ("naive", "Référence naïve")]:
            probs = np.array(sd[name].tolist())
            results.append({"season": season, "model": label, **_scores(probs, out)})
    # Calibration : quand le modèle annonce X % de victoire à domicile, ça arrive-t-il X % du temps ?
    ph = np.array([p[0] for p in df["poisson"]])
    won = (df["outcome"] == 0).to_numpy()
    bins = np.linspace(0, 1, 11)
    calib = []
    for lo, hi in zip(bins[:-1], bins[1:]):
        mask = (ph >= lo) & (ph < hi)
        if mask.sum() >= 15:
            calib.append({"bin": f"{int(lo*100)}-{int(hi*100)} %", "predicted": float(ph[mask].mean()), "observed": float(won[mask].mean()), "n": int(mask.sum())})
    return pd.DataFrame(results), pd.DataFrame(calib), df


def expected_points(preds: pd.DataFrame, matches: pd.DataFrame) -> pd.DataFrame:
    """Points attendus (xPts) par équipe et par saison, à partir des probabilités d'avant-match.

    xPts d'un match = 3 x P(victoire) + P(nul), avec le modèle de Poisson ajusté sur les seuls
    matchs déjà joués (backtest). On compare ensuite aux points réellement obtenus.
    """
    rows = []
    for r in preds.itertuples():
        ph, pd_, pa = r.poisson
        pts_h = 3 if r.outcome == 0 else 1 if r.outcome == 1 else 0
        pts_a = 3 if r.outcome == 2 else 1 if r.outcome == 1 else 0
        rows.append((r.league, r.season, r.home, 3 * ph + pd_, pts_h))
        rows.append((r.league, r.season, r.away, 3 * pa + pd_, pts_a))
    df = pd.DataFrame(rows, columns=["league", "season", "team", "xpts", "pts"])
    out = df.groupby(["league", "season", "team"], as_index=False).agg(xpts=("xpts", "sum"), pts=("pts", "sum"), n=("pts", "size"))
    out["diff"] = out["pts"] - out["xpts"]
    return out


if __name__ == "__main__":
    m = load_matches()
    grid, k, h = tune_elo(m)
    print(f"Elo : K={k}, avantage du terrain={h}")
    res, calib, _ = backtest(m, elo_k=k, elo_home=h)
    print(res.to_string(index=False))
    print(calib.to_string(index=False))

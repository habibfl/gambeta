"""Propriétés des modèles prédictifs (Elo, Poisson Dixon-Coles, points attendus)."""
import numpy as np
import pandas as pd
import pytest

from gambeta_data import load_matches
from gambeta_models import _scores, expected_points, fit_poisson, outcome_probs, run_elo, score_matrix


@pytest.fixture(scope="module")
def one_league():
    m = load_matches()
    return m[(m["league"] == "Premier League") & (m["season"].isin(["2324", "2425"]))]


def test_matrice_de_scores_somme_a_un():
    for rho in (-0.1, 0.0, 0.05):
        m = score_matrix(1.6, 1.1, rho)
        assert m.sum() == pytest.approx(1.0)
        assert (m >= 0).all()


def test_probabilites_issue_somme_a_un():
    ph, pd_, pa = outcome_probs(score_matrix(1.8, 0.9, -0.08))
    assert ph + pd_ + pa == pytest.approx(1.0)
    assert ph > pa  # l'équipe qui attend le plus de buts est favorite


def test_elo_somme_nulle(one_league):
    # Sur une seule saison (pas de promus), chaque match transfère des points d'une équipe à l'autre :
    # la moyenne des classements reste exactement à 1500.
    season = one_league[one_league["season"] == "2324"]
    hist, pre = run_elo(season, k=20, home_adv=60)
    last = hist.sort_values("date").groupby("team").tail(1)
    assert last["elo"].mean() == pytest.approx(1500)
    assert pre["e_home"].between(0, 1).all()


def test_poisson_avantage_du_terrain_positif(one_league):
    as_of = one_league["date"].max() + pd.Timedelta(days=1)
    model = fit_poisson(one_league, as_of)
    assert model["home"] > 0
    assert np.isfinite(list(model["att"].values())).all()


def test_scores_backtest():
    probs = np.array([[0.6, 0.25, 0.15], [0.2, 0.3, 0.5]])
    s = _scores(probs, np.array([0, 2]))
    assert s["accuracy"] == 1.0
    assert s["log_loss"] == pytest.approx(-(np.log(0.6) + np.log(0.5)) / 2)


def test_points_attendus():
    preds = pd.DataFrame(
        [
            {"league": "L", "season": "S", "home": "A", "away": "B", "outcome": 0, "poisson": (0.5, 0.3, 0.2)},
            {"league": "L", "season": "S", "home": "B", "away": "A", "outcome": 1, "poisson": (0.4, 0.3, 0.3)},
        ]
    )
    xp = expected_points(preds, None).set_index("team")
    assert xp.loc["A", "xpts"] == pytest.approx(3 * 0.5 + 0.3 + 3 * 0.3 + 0.3)
    assert xp.loc["A", "pts"] == 4
    assert xp.loc["B", "pts"] == 1

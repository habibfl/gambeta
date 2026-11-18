"""Contrôles qualité des données collectées (mêmes règles que le notebook)."""
import pandas as pd
import pytest

from gambeta_data import LEAGUES, load_matches, load_players, load_standings


@pytest.fixture(scope="module")
def matches():
    return load_matches()


@pytest.fixture(scope="module")
def standings():
    return load_standings()


def test_cinq_championnats_cinq_saisons(matches):
    assert set(matches["league"]) == set(LEAGUES.values())
    assert sorted(matches["season"].unique()) == ["2122", "2223", "2324", "2425", "2526"]


def test_chaque_club_joue_le_bon_nombre_de_matchs(standings):
    for (league, season), s in standings.groupby(["league", "season"]):
        n = len(s)
        assert (s["mp"] == 2 * (n - 1)).all(), f"{league} {season} : nombre de matchs incohérent"


def test_pas_de_match_en_double(matches):
    assert not matches.duplicated(["league", "season", "home_team", "away_team"]).any()


def test_buts_classement_egaux_buts_matchs(matches, standings):
    for (league, season), s in standings.groupby(["league", "season"]):
        m = matches[(matches["league"] == league) & (matches["season"] == season)]
        assert s["gf"].sum() == m["total_goals"].sum()
        assert s["gf"].sum() == s["ga"].sum()


def test_points_coherents(standings):
    assert (standings["pts"] == 3 * standings["w"] + standings["d"]).all()
    assert (standings["mp"] == standings["w"] + standings["d"] + standings["l"]).all()


def test_scores_valides(matches):
    assert (matches[["home_goals", "away_goals"]] >= 0).all().all()
    assert matches["date"].notna().all()


def test_joueurs_2526(matches):
    p = load_players("2526")
    assert len(p) > 2000
    assert (p["minutes"] >= 0).all()
    assert (p["xg"] >= 0).all()
    assert p["position_code"].dropna().isin(["F", "M", "D", "GK"]).all()
    assert isinstance(p, pd.DataFrame)

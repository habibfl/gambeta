"""Nommage des fichiers du site statique (doit rester identique à frontend/src/lib/api.js)."""
from export_static import ranges, static_name


def test_static_name():
    assert static_name("/api/leagues") == "leagues.json"
    assert static_name("/api/data/standings/liga?seasons=2122,2223") == "data/standings/liga__seasons-2122_2223.json"
    assert static_name("/api/data/top-scorers/liga?season=2526") == "data/top-scorers/liga__season-2526.json"


def test_periodes_continues():
    assert ranges(["2122", "2223", "2324"]) == [
        ["2122"], ["2122", "2223"], ["2122", "2223", "2324"], ["2223"], ["2223", "2324"], ["2324"],
    ]

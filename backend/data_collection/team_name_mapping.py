"""Table de correspondance des noms de clubs entre Understat (source des xG/xA) et FBref."""

# Clé = suffixe de fichier CSV (voir collect_league.py, `csv_slug`).
TEAM_NAME_MAPPING = {
    "pl": {
        "Leeds": "Leeds United",
        "Manchester United": "Manchester Utd",
        "Newcastle United": "Newcastle",
        "Nottingham Forest": "Nottingham",
        "Wolverhampton Wanderers": "Wolves",
    },
    "ligue1": {
        "Paris Saint Germain": "PSG",
        # Saint-Étienne : voir note ci-dessus, aucune entrée Understat à mapper.
    },
    "liga": {
        "Alaves": "Alavés",
        "Atletico Madrid": "Atlético Madrid",
        "Real Oviedo": "Oviedo",
    },
    "seriea": {
        "AC Milan": "Milan",
        "Parma Calcio 1913": "Parma",
        "Verona": "Hellas Verona",
    },
    "bundesliga": {
        "Borussia Dortmund": "Dortmund",
        "Eintracht Frankfurt": "Frankfurt",
        "Borussia M.Gladbach": "Gladbach",
        "FC Heidenheim": "Heidenheim",
        "FC Cologne": "Köln",
        "Bayer Leverkusen": "Leverkusen",
        "RasenBallsport Leipzig": "RB Leipzig",
        "St. Pauli": "St Pauli",
        "VfB Stuttgart": "Stuttgart",
        # Paderborn 07 : voir note ci-dessus, aucune entrée Understat à mapper.
    },
}


def canonical_team_name(csv_slug: str, team_name: str) -> str:
    """Renvoie le nom canonique (FBref) pour un nom d'équipe venant d'Understat."""
    return TEAM_NAME_MAPPING.get(csv_slug, {}).get(team_name, team_name)


# Noms FBref qui changent d'une saison à l'autre pour un même club
FBREF_TEAM_ALIASES = {
    "Paris SG": "PSG",
}


def canonical_fbref_name(team_name: str) -> str:
    return FBREF_TEAM_ALIASES.get(team_name, team_name)

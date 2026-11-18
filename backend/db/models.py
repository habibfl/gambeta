"""Modèles SQLAlchemy pour le stockage des données collectées."""

from sqlalchemy import Column, Date, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class League(Base):
    """Un championnat (Premier League, Ligue 1...)."""

    __tablename__ = "leagues"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    # Même convention de slug que le frontend (Navbar.jsx, teamsRegistry.js) : "premier-league"
    slug = Column(String, nullable=False, unique=True)
    country = Column(String, nullable=False)

    teams = relationship("Team", back_populates="league")


class Team(Base):
    """Un club, rattaché à un championnat."""

    __tablename__ = "teams"
    __table_args__ = (
        # Un même nom de club ne peut apparaître qu'une fois par championnat
        UniqueConstraint("league_id", "slug", name="uq_team_league_slug"),
    )

    id = Column(Integer, primary_key=True)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=False)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False)

    league = relationship("League", back_populates="teams")
    players = relationship("Player", back_populates="team")
    standings = relationship("Standing", back_populates="team")


class Player(Base):
    """Un joueur, rattaché au club pour lequel il a des statistiques."""

    __tablename__ = "players"
    __table_args__ = (UniqueConstraint("team_id", "slug", name="uq_player_team_slug"),)

    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    name = Column(String, nullable=False)
    slug = Column(String, nullable=False)
    # Poste principal seulement (ex: "F", "M", "D", "GK")
    position = Column(String, nullable=True)
    # Identifiant Understat du joueur : stable d'une saison à l'autre, même
    # s'il change de club.
    understat_id = Column(Integer, nullable=True, index=True)

    team = relationship("Team", back_populates="players")
    season_stats = relationship("PlayerSeasonStat", back_populates="player")


class PlayerSeasonStat(Base):
    """Statistiques d'un joueur pour une saison donnée. xG/xA/buts/passes viennent d'Understat."""

    __tablename__ = "player_season_stats"
    __table_args__ = (UniqueConstraint("player_id", "season", name="uq_stat_player_season"),)

    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    season = Column(String, nullable=False)

    # --- xG / xA (Understat) ---
    xg = Column(Float, nullable=True)
    xa = Column(Float, nullable=True)
    np_xg = Column(Float, nullable=True)
    xg_chain = Column(Float, nullable=True)
    xg_buildup = Column(Float, nullable=True)
    goals = Column(Integer, nullable=True)
    assists = Column(Integer, nullable=True)

    # --- Minutes (FBref, stat_type "standard") ---
    matches_played = Column(Integer, nullable=True)
    starts = Column(Integer, nullable=True)
    minutes = Column(Integer, nullable=True)

    # Tir (FBref, stat_type "shooting") : pas de distance moyenne de
    # tir, colonne absente du HTML renvoyé par FBref actuellement.
    shots = Column(Integer, nullable=True)
    shots_on_target = Column(Integer, nullable=True)
    shots_on_target_pct = Column(Float, nullable=True)

    # Défense partielle (FBref, stat_type "misc") : ni tacles totaux, ni blocs, ni dégagements
    tackles_won = Column(Integer, nullable=True)
    interceptions = Column(Integer, nullable=True)

    # --- Discipline (FBref, stat_type "misc") ---
    yellow_cards = Column(Integer, nullable=True)
    red_cards = Column(Integer, nullable=True)
    second_yellow_cards = Column(Integer, nullable=True)
    fouls_committed = Column(Integer, nullable=True)
    fouls_drawn = Column(Integer, nullable=True)

    player = relationship("Player", back_populates="season_stats")


class Standing(Base):
    """Ligne de classement d'un club pour une saison donnée (source : FBref)."""

    __tablename__ = "standings"
    __table_args__ = (UniqueConstraint("team_id", "season", name="uq_standing_team_season"),)

    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    season = Column(String, nullable=False)
    matches_played = Column(Integer, nullable=False)
    wins = Column(Integer, nullable=False)
    draws = Column(Integer, nullable=False)
    losses = Column(Integer, nullable=False)
    goals_for = Column(Integer, nullable=False)
    goals_against = Column(Integer, nullable=False)
    points = Column(Integer, nullable=False)

    team = relationship("Team", back_populates="standings")


class Match(Base):
    """Un match joué (source : calendrier FBref)."""

    __tablename__ = "matches"
    __table_args__ = (
        UniqueConstraint("season", "home_team_id", "away_team_id", "date", name="uq_match"),
    )

    id = Column(Integer, primary_key=True)
    league_id = Column(Integer, ForeignKey("leagues.id"), nullable=False)
    season = Column(String, nullable=False, index=True)
    date = Column(Date, nullable=True)
    week = Column(Integer, nullable=True)  # journée (vide pour un barrage)
    home_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    away_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    home_goals = Column(Integer, nullable=False)
    away_goals = Column(Integer, nullable=False)

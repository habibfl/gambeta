"""Connexion à la base PostgreSQL : lit DATABASE_URL depuis backend/.env."""

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Chemin explicite vers backend/.env : fonctionne quel que soit le
# répertoire courant depuis lequel un script est lancé (contrairement à load_dotenv
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_ENV_PATH)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        f"DATABASE_URL manquant dans {_ENV_PATH}. "
        "Attendu : postgresql+psycopg2://utilisateur:motdepasse@hote:port/base"
    )

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

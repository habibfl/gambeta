"""Exécute toutes les requêtes du dossier et écrit RESULTATS.md (tableaux markdown).

Usage : python sql/run_all.py  (lit DATABASE_URL dans backend/.env)
"""
import os
import re
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent
load_dotenv(HERE.parent / "backend" / ".env")
url = re.sub(r"^postgresql\+psycopg2://", "postgresql://", os.environ["DATABASE_URL"])


def markdown(cols, rows):
    fmt = lambda v: "" if v is None else str(v)
    lines = ["| " + " | ".join(cols) + " |", "|" + "---|" * len(cols)]
    lines += ["| " + " | ".join(fmt(v) for v in r) + " |" for r in rows]
    return "\n".join(lines)


out = ["# Résultats des requêtes SQL", "", "Généré par `sql/run_all.py` sur la base du projet.", ""]
with psycopg2.connect(url) as conn, conn.cursor() as cur:
    for path in sorted(HERE.glob("*.sql")):
        sql = path.read_text(encoding="utf-8")
        title = sql.splitlines()[0].lstrip("- ").strip()
        cur.execute(sql)
        cols = [d.name for d in cur.description]
        out += [f"## {path.stem}", "", title, "", f"Requête : [`{path.name}`]({path.name})", "", markdown(cols, cur.fetchall()), ""]
(HERE / "RESULTATS.md").write_text("\n".join(out), encoding="utf-8")
print(f"RESULTATS.md écrit ({len(list(HERE.glob('*.sql')))} requêtes)")

# Requêtes SQL

Dix requêtes PostgreSQL sur la base du projet (tables `leagues`, `teams`, `players`,
`player_season_stats`, `standings`, `matches`). Chaque fichier commence par la question posée
et les techniques utilisées. Les résultats sont dans [RESULTATS.md](RESULTATS.md).

| Fichier | Question | Techniques |
|---|---|---|
| `01_classement_depuis_matchs.sql` | Le classement stocké correspond-il aux matchs ? | CTE, UNION ALL, agrégats conditionnels |
| `02_rang_et_ecart_au_titre.sql` | Quelles courses au titre ont été les plus serrées ? | ROW_NUMBER, LEAD |
| `03_buts_par_match_evolution.sql` | Comment évolue le nombre de buts par match ? | AVG, LAG |
| `04_avantage_du_terrain.sql` | Quel championnat favorise le plus l'équipe qui reçoit ? | agrégats FILTER |
| `05_plus_longues_series_invincibilite.sql` | Quelles sont les plus longues séries sans défaite ? | gaps and islands |
| `06_forme_glissante.sql` | Quels clubs finissent la saison le plus fort ? | moyenne mobile (ROWS BETWEEN) |
| `07_finition_joueurs.sql` | Qui marque le plus au-dessus de ses xG ? | per 90, PERCENT_RANK |
| `08_dependance_au_buteur.sql` | Quels clubs dépendent d'un seul buteur ? | RANK, ratios |
| `09_progressions.sql` | Quelles équipes ont le plus progressé ou chuté ? | LAG |
| `10_promus.sql` | Les promus se maintiennent-ils ? | NOT EXISTS, RANK, COUNT OVER |

Exécution : `python sql/run_all.py` (lit `DATABASE_URL` dans `backend/.env`, régénère RESULTATS.md).

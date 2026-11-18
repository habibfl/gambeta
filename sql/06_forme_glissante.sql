-- Forme sur les 5 derniers matchs (points par match) à la fin de la saison 2025-26.
-- Techniques : moyenne mobile (AVG ... ROWS BETWEEN 4 PRECEDING), dernière valeur par club.
WITH resultats AS (
    SELECT season, date, home_team_id AS team_id,
           CASE WHEN home_goals > away_goals THEN 3 WHEN home_goals = away_goals THEN 1 ELSE 0 END AS pts
    FROM matches WHERE week IS NOT NULL AND season = '2526'
    UNION ALL
    SELECT season, date, away_team_id,
           CASE WHEN away_goals > home_goals THEN 3 WHEN away_goals = home_goals THEN 1 ELSE 0 END
    FROM matches WHERE week IS NOT NULL AND season = '2526'
),
glissante AS (
    SELECT team_id,
           date,
           AVG(pts) OVER (PARTITION BY team_id ORDER BY date ROWS BETWEEN 4 PRECEDING AND CURRENT ROW) AS forme_5,
           ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY date DESC) AS depuis_la_fin
    FROM resultats
)
SELECT t.name AS club, l.name AS championnat, ROUND(g.forme_5::numeric, 2) AS points_par_match_5_derniers
FROM glissante g
JOIN teams t   ON t.id = g.team_id
JOIN leagues l ON l.id = t.league_id
WHERE g.depuis_la_fin = 1
ORDER BY g.forme_5 DESC, t.name
LIMIT 10;

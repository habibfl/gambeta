-- Classement recalculé à partir des matchs, puis comparé au classement stocké (contrôle qualité).
-- Techniques : CTE, UNION ALL, agrégats conditionnels, jointure de contrôle.
WITH resultats AS (
    SELECT season, home_team_id AS team_id, home_goals AS bp, away_goals AS bc FROM matches WHERE week IS NOT NULL
    UNION ALL
    SELECT season, away_team_id, away_goals, home_goals FROM matches WHERE week IS NOT NULL
),
recalcule AS (
    SELECT season,
           team_id,
           COUNT(*)                                   AS joues,
           SUM(CASE WHEN bp > bc THEN 3 WHEN bp = bc THEN 1 ELSE 0 END) AS points,
           SUM(bp)                                    AS buts_pour,
           SUM(bc)                                    AS buts_contre
    FROM resultats
    GROUP BY season, team_id
)
SELECT COUNT(*)                                                    AS clubs_saisons,
       SUM(CASE WHEN r.points = s.points THEN 1 ELSE 0 END)         AS points_identiques,
       SUM(CASE WHEN r.buts_pour = s.goals_for
                 AND r.buts_contre = s.goals_against THEN 1 ELSE 0 END) AS buts_identiques
FROM recalcule r
JOIN standings s ON s.team_id = r.team_id AND s.season = r.season;

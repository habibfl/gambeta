-- Bilan des clubs promus : points moyens et taux de maintien selon le championnat.
-- Techniques : détection par absence la saison précédente (NOT EXISTS), rang dans la saison, agrégats.
-- Approximation : maintien = finir hors des 3 dernières places (les barrages ne sont pas pris en compte).
WITH rangs AS (
    SELECT s.team_id,
           t.league_id,
           s.season,
           s.points,
           RANK() OVER (PARTITION BY t.league_id, s.season ORDER BY s.points DESC, s.goals_for - s.goals_against DESC) AS rang,
           COUNT(*) OVER (PARTITION BY t.league_id, s.season) AS nb_clubs
    FROM standings s
    JOIN teams t ON t.id = s.team_id
),
promus AS (
    SELECT r.*
    FROM rangs r
    WHERE r.season > '2122'
      AND NOT EXISTS (
          SELECT 1 FROM standings prev
          WHERE prev.team_id = r.team_id
            AND CAST(prev.season AS int) = CAST(r.season AS int) - 101
      )
)
SELECT l.name AS championnat,
       COUNT(*)                                              AS promus,
       ROUND(AVG(points), 1)                                 AS points_moyens,
       ROUND(100.0 * AVG(CASE WHEN rang <= nb_clubs - 3 THEN 1 ELSE 0 END), 0) AS pct_maintien
FROM promus p
JOIN leagues l ON l.id = p.league_id
GROUP BY l.name
ORDER BY pct_maintien DESC;

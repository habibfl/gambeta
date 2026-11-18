-- Plus fortes progressions et chutes de points d'une saison à la suivante.
-- Techniques : LAG sur la saison, filtrage des saisons consécutives, tri sur l'écart.
WITH points AS (
    SELECT t.name AS club,
           s.season,
           s.points,
           LAG(s.points) OVER (PARTITION BY s.team_id ORDER BY s.season) AS points_avant,
           LAG(s.season) OVER (PARTITION BY s.team_id ORDER BY s.season) AS saison_avant
    FROM standings s
    JOIN teams t ON t.id = s.team_id
)
SELECT club, saison_avant, season, points_avant, points, points - points_avant AS variation
FROM points
WHERE points_avant IS NOT NULL
  AND CAST(season AS int) - CAST(saison_avant AS int) = 101
ORDER BY ABS(points - points_avant) DESC
LIMIT 10;

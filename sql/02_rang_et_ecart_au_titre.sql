-- Champion, dauphin et écart de points pour chaque championnat et chaque saison.
-- Techniques : fonctions de fenêtre ROW_NUMBER et LEAD, départage par différence de buts.
WITH classement AS (
    SELECT l.name AS championnat,
           s.season,
           t.name AS club,
           s.points,
           ROW_NUMBER() OVER (
               PARTITION BY l.id, s.season
               ORDER BY s.points DESC, s.goals_for - s.goals_against DESC, s.goals_for DESC
           ) AS rang,
           LEAD(s.points) OVER (
               PARTITION BY l.id, s.season
               ORDER BY s.points DESC, s.goals_for - s.goals_against DESC, s.goals_for DESC
           ) AS points_suivant
    FROM standings s
    JOIN teams t   ON t.id = s.team_id
    JOIN leagues l ON l.id = t.league_id
)
SELECT championnat, season, club AS champion, points, points - points_suivant AS ecart_avec_le_2e
FROM classement
WHERE rang = 1
ORDER BY ecart_avec_le_2e ASC, season;

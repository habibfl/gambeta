-- Part des buts du club marqués par son meilleur buteur (2025-26) : quels clubs dépendent d'un seul joueur ?
-- Techniques : SUM et RANK sur partition, ratio, jointure avec le total du classement.
WITH buteurs AS (
    SELECT t.name AS club,
           p.team_id,
           p.name AS joueur,
           s.goals,
           RANK() OVER (PARTITION BY p.team_id ORDER BY s.goals DESC) AS rang
    FROM player_season_stats s
    JOIN players p ON p.id = s.player_id
    JOIN teams t   ON t.id = p.team_id
    WHERE s.season = '2526'
)
SELECT b.club, b.joueur, b.goals AS buts_joueur, st.goals_for AS buts_club,
       ROUND(100.0 * b.goals / st.goals_for, 1) AS part_pct
FROM buteurs b
JOIN standings st ON st.team_id = b.team_id AND st.season = '2526'
WHERE b.rang = 1 AND st.goals_for > 0
ORDER BY part_pct DESC
LIMIT 10;

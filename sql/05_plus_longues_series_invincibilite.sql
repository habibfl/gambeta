-- Plus longues séries sans défaite en championnat, sur une même saison.
-- Techniques : « gaps and islands » (différence de deux ROW_NUMBER), agrégation par îlot.
WITH resultats AS (
    SELECT season, date, home_team_id AS team_id, home_goals >= away_goals AS invaincu FROM matches WHERE week IS NOT NULL
    UNION ALL
    SELECT season, date, away_team_id, away_goals >= home_goals FROM matches WHERE week IS NOT NULL
),
numerotes AS (
    SELECT *,
           ROW_NUMBER() OVER (PARTITION BY team_id, season ORDER BY date)
         - ROW_NUMBER() OVER (PARTITION BY team_id, season, invaincu ORDER BY date) AS ilot
    FROM resultats
),
series AS (
    SELECT team_id, season, COUNT(*) AS matchs, MIN(date) AS debut, MAX(date) AS fin
    FROM numerotes
    WHERE invaincu
    GROUP BY team_id, season, ilot
)
SELECT t.name AS club, s.season, s.matchs AS matchs_sans_defaite, s.debut, s.fin
FROM series s
JOIN teams t ON t.id = s.team_id
ORDER BY s.matchs DESC
LIMIT 10;

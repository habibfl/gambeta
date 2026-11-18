-- Buts par match par championnat et par saison, et variation par rapport à la saison précédente.
-- Techniques : agrégation, fonction de fenêtre LAG, arrondi.
WITH par_saison AS (
    SELECT l.name AS championnat,
           m.season,
           ROUND(AVG(m.home_goals + m.away_goals)::numeric, 2) AS buts_par_match
    FROM matches m
    JOIN leagues l ON l.id = m.league_id
    WHERE m.week IS NOT NULL
    GROUP BY l.name, m.season
)
SELECT championnat,
       season,
       buts_par_match,
       buts_par_match - LAG(buts_par_match) OVER (PARTITION BY championnat ORDER BY season) AS variation
FROM par_saison
ORDER BY championnat, season;

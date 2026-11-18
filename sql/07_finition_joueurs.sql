-- Finisseurs 2025-26 : buts au-dessus des xG, ramenés à 90 minutes, avec rang centile par poste.
-- Techniques : calculs par 90 minutes, PERCENT_RANK par partition, filtre sur un seuil de minutes.
WITH base AS (
    SELECT p.name AS joueur,
           t.name AS club,
           CASE split_part(p.position, ' ', 1)
               WHEN 'F' THEN 'Attaquant' WHEN 'M' THEN 'Milieu' WHEN 'D' THEN 'Défenseur' WHEN 'GK' THEN 'Gardien'
               ELSE 'Autre' END AS poste,
           s.goals,
           ROUND(s.xg::numeric, 1)                         AS xg,
           ROUND((s.goals - s.xg)::numeric, 1)              AS ecart,
           (s.goals - s.xg) * 90.0 / s.minutes              AS ecart_90,
           s.minutes
    FROM player_season_stats s
    JOIN players p ON p.id = s.player_id
    JOIN teams t   ON t.id = p.team_id
    WHERE s.season = '2526' AND s.minutes >= 900 AND s.xg IS NOT NULL
)
SELECT joueur, club, poste, goals AS buts, xg, ecart,
       ROUND(ecart_90::numeric, 2) AS ecart_par_90,
       ROUND((100 * PERCENT_RANK() OVER (PARTITION BY poste ORDER BY ecart_90))::numeric) AS centile_poste
FROM base
ORDER BY ecart DESC
LIMIT 10;

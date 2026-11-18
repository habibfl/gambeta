-- Répartition victoires à domicile / nuls / victoires à l'extérieur par championnat (5 saisons).
-- Techniques : agrégats filtrés (FILTER), pourcentages.
SELECT l.name AS championnat,
       COUNT(*) AS matchs,
       ROUND(100.0 * COUNT(*) FILTER (WHERE home_goals > away_goals) / COUNT(*), 1) AS pct_domicile,
       ROUND(100.0 * COUNT(*) FILTER (WHERE home_goals = away_goals) / COUNT(*), 1) AS pct_nuls,
       ROUND(100.0 * COUNT(*) FILTER (WHERE home_goals < away_goals) / COUNT(*), 1) AS pct_exterieur
FROM matches m
JOIN leagues l ON l.id = m.league_id
WHERE m.week IS NOT NULL
GROUP BY l.name
ORDER BY pct_domicile DESC;

# Résultats des requêtes SQL

Généré par `sql/run_all.py` sur la base du projet.

## 01_classement_depuis_matchs

Classement recalculé à partir des matchs, puis comparé au classement stocké (contrôle qualité).

Requête : [`01_classement_depuis_matchs.sql`](01_classement_depuis_matchs.sql)

| clubs_saisons | points_identiques | buts_identiques |
|---|---|---|
| 484 | 484 | 484 |

## 02_rang_et_ecart_au_titre

Champion, dauphin et écart de points pour chaque championnat et chaque saison.

Requête : [`02_rang_et_ecart_au_titre.sql`](02_rang_et_ecart_au_titre.sql)

| championnat | season | champion | points | ecart_avec_le_2e |
|---|---|---|---|---|
| Bundesliga | 2223 | Bayern Munich | 71 | 0 |
| Premier League | 2122 | Manchester City | 93 | 1 |
| Ligue 1 | 2223 | PSG | 85 | 1 |
| Serie A | 2425 | Napoli | 82 | 1 |
| Serie A | 2122 | Milan | 86 | 2 |
| Premier League | 2324 | Manchester City | 91 | 2 |
| Liga | 2425 | Barcelona | 88 | 4 |
| Premier League | 2223 | Manchester City | 89 | 5 |
| Ligue 1 | 2526 | PSG | 76 | 6 |
| Premier League | 2526 | Arsenal | 85 | 7 |
| Bundesliga | 2122 | Bayern Munich | 77 | 8 |
| Liga | 2526 | Barcelona | 94 | 8 |
| Ligue 1 | 2324 | PSG | 76 | 9 |
| Liga | 2223 | Barcelona | 88 | 10 |
| Liga | 2324 | Real Madrid | 95 | 10 |
| Premier League | 2425 | Liverpool | 84 | 10 |
| Serie A | 2526 | Inter | 87 | 11 |
| Liga | 2122 | Real Madrid | 86 | 13 |
| Bundesliga | 2425 | Bayern Munich | 82 | 13 |
| Ligue 1 | 2122 | PSG | 86 | 15 |
| Serie A | 2223 | Napoli | 90 | 16 |
| Bundesliga | 2526 | Bayern Munich | 89 | 16 |
| Bundesliga | 2324 | Leverkusen | 90 | 17 |
| Serie A | 2324 | Inter | 94 | 19 |
| Ligue 1 | 2425 | PSG | 84 | 19 |

## 03_buts_par_match_evolution

Buts par match par championnat et par saison, et variation par rapport à la saison précédente.

Requête : [`03_buts_par_match_evolution.sql`](03_buts_par_match_evolution.sql)

| championnat | season | buts_par_match | variation |
|---|---|---|---|
| Bundesliga | 2122 | 3.12 |  |
| Bundesliga | 2223 | 3.17 | 0.05 |
| Bundesliga | 2324 | 3.22 | 0.05 |
| Bundesliga | 2425 | 3.13 | -0.09 |
| Bundesliga | 2526 | 3.24 | 0.11 |
| Liga | 2122 | 2.50 |  |
| Liga | 2223 | 2.51 | 0.01 |
| Liga | 2324 | 2.64 | 0.13 |
| Liga | 2425 | 2.62 | -0.02 |
| Liga | 2526 | 2.69 | 0.07 |
| Ligue 1 | 2122 | 2.81 |  |
| Ligue 1 | 2223 | 2.81 | 0.00 |
| Ligue 1 | 2324 | 2.70 | -0.11 |
| Ligue 1 | 2425 | 2.98 | 0.28 |
| Ligue 1 | 2526 | 2.82 | -0.16 |
| Premier League | 2122 | 2.82 |  |
| Premier League | 2223 | 2.85 | 0.03 |
| Premier League | 2324 | 3.28 | 0.43 |
| Premier League | 2425 | 2.93 | -0.35 |
| Premier League | 2526 | 2.75 | -0.18 |
| Serie A | 2122 | 2.87 |  |
| Serie A | 2223 | 2.56 | -0.31 |
| Serie A | 2324 | 2.61 | 0.05 |
| Serie A | 2425 | 2.56 | -0.05 |
| Serie A | 2526 | 2.43 | -0.13 |

## 04_avantage_du_terrain

Répartition victoires à domicile / nuls / victoires à l'extérieur par championnat (5 saisons).

Requête : [`04_avantage_du_terrain.sql`](04_avantage_du_terrain.sql)

| championnat | matchs | pct_domicile | pct_nuls | pct_exterieur |
|---|---|---|---|---|
| Liga | 1900 | 45.7 | 26.2 | 28.1 |
| Premier League | 1900 | 44.2 | 23.9 | 31.9 |
| Bundesliga | 1530 | 44.1 | 24.9 | 31.0 |
| Ligue 1 | 1678 | 43.4 | 24.6 | 32.0 |
| Serie A | 1900 | 40.4 | 27.2 | 32.4 |

## 05_plus_longues_series_invincibilite

Plus longues séries sans défaite en championnat, sur une même saison.

Requête : [`05_plus_longues_series_invincibilite.sql`](05_plus_longues_series_invincibilite.sql)

| club | season | matchs_sans_defaite | debut | fin |
|---|---|---|---|---|
| Leverkusen | 2324 | 34 | 2023-08-19 | 2024-05-18 |
| Real Madrid | 2324 | 32 | 2023-09-27 | 2024-05-25 |
| PSG | 2425 | 30 | 2024-08-16 | 2025-04-22 |
| Inter | 2324 | 28 | 2023-09-30 | 2024-04-28 |
| PSG | 2324 | 26 | 2023-09-24 | 2024-04-27 |
| Liverpool | 2425 | 26 | 2024-09-21 | 2025-04-02 |
| Milan | 2526 | 24 | 2025-08-29 | 2026-02-18 |
| Manchester City | 2324 | 23 | 2023-12-10 | 2024-05-19 |
| Leverkusen | 2425 | 22 | 2024-09-14 | 2025-03-01 |
| Juventus | 2425 | 21 | 2024-08-19 | 2025-01-18 |

## 06_forme_glissante

Forme sur les 5 derniers matchs (points par match) à la fin de la saison 2025-26.

Requête : [`06_forme_glissante.sql`](06_forme_glissante.sql)

| club | championnat | points_par_match_5_derniers |
|---|---|---|
| Arsenal | Premier League | 3.00 |
| Roma | Serie A | 3.00 |
| Bayern Munich | Bundesliga | 2.60 |
| Como | Serie A | 2.60 |
| Manchester Utd | Premier League | 2.60 |
| Real Madrid | Liga | 2.40 |
| Rayo Vallecano | Liga | 2.20 |
| Augsburg | Bundesliga | 2.00 |
| Auxerre | Ligue 1 | 2.00 |
| Cagliari | Serie A | 2.00 |

## 07_finition_joueurs

Finisseurs 2025-26 : buts au-dessus des xG, ramenés à 90 minutes, avec rang centile par poste.

Requête : [`07_finition_joueurs.sql`](07_finition_joueurs.sql)

| joueur | club | poste | buts | xg | ecart | ecart_par_90 | centile_poste |
|---|---|---|---|---|---|---|---|
| Harry Kane | Bayern Munich | Attaquant | 36 | 29.6 | 6.4 | 0.24 | 100 |
| Alberto Moleiro | Villarreal | Attaquant | 10 | 5.6 | 4.4 | 0.16 | 97 |
| Tajon Buchanan | Villarreal | Attaquant | 7 | 2.7 | 4.3 | 0.21 | 99 |
| Harry Wilson | Fulham | Milieu | 10 | 5.8 | 4.2 | 0.14 | 97 |
| Antoine Semenyo | Bournemouth | Attaquant | 17 | 12.8 | 4.2 | 0.21 | 99 |
| Eli Junior Kroupi | Bournemouth | Attaquant | 13 | 8.8 | 4.2 | 0.22 | 99 |
| Martin Baturina | Como | Attaquant | 6 | 1.9 | 4.1 | 0.24 | 99 |
| Pablo Fornals | Real Betis | Attaquant | 9 | 4.9 | 4.1 | 0.13 | 96 |
| Yan Diomande | RB Leipzig | Attaquant | 12 | 8.0 | 4.0 | 0.14 | 96 |
| Gonçalo Guedes | Real Sociedad | Attaquant | 8 | 4.1 | 3.9 | 0.19 | 98 |

## 08_dependance_au_buteur

Part des buts du club marqués par son meilleur buteur (2025-26) : quels clubs dépendent d'un seul joueur ?

Requête : [`08_dependance_au_buteur.sql`](08_dependance_au_buteur.sql)

| club | joueur | buts_joueur | buts_club | part_pct |
|---|---|---|---|---|
| Angers | Esteban Lepaul | 21 | 29 | 72.4 |
| Mallorca | Vedat Muriqi | 23 | 47 | 48.9 |
| Brentford | Thiago | 22 | 55 | 40.0 |
| Osasuna | Ante Budimir | 17 | 44 | 38.6 |
| Auxerre | Lassine Sinayoko | 12 | 34 | 35.3 |
| Manchester City | Erling Haaland | 27 | 77 | 35.1 |
| Oviedo | Federico Viñas | 9 | 26 | 34.6 |
| Real Madrid | Kylian Mbappe-Lottin | 25 | 77 | 32.5 |
| Parma | Mateo Pellegrino | 9 | 28 | 32.1 |
| Alavés | Antonio Martínez | 14 | 44 | 31.8 |

## 09_progressions

Plus fortes progressions et chutes de points d'une saison à la suivante.

Requête : [`09_progressions.sql`](09_progressions.sql)

| club | saison_avant | season | points_avant | points | variation |
|---|---|---|---|---|---|
| Stuttgart | 2223 | 2324 | 33 | 73 | 40 |
| Leverkusen | 2223 | 2324 | 50 | 90 | 40 |
| Girona | 2324 | 2425 | 81 | 41 | -40 |
| Napoli | 2223 | 2324 | 90 | 53 | -37 |
| Clermont Foot | 2223 | 2324 | 59 | 25 | -34 |
| Lens | 2223 | 2324 | 84 | 51 | -33 |
| Girona | 2223 | 2324 | 49 | 81 | 32 |
| Chelsea | 2122 | 2223 | 74 | 44 | -30 |
| Napoli | 2324 | 2425 | 53 | 82 | 29 |
| Manchester Utd | 2425 | 2526 | 42 | 71 | 29 |

## 10_promus

Bilan des clubs promus : points moyens et taux de maintien selon le championnat.

Requête : [`10_promus.sql`](10_promus.sql)

| championnat | promus | points_moyens | pct_maintien |
|---|---|---|---|
| Ligue 1 | 11 | 34.9 | 64 |
| Bundesliga | 8 | 31.6 | 63 |
| Serie A | 12 | 37.5 | 58 |
| Liga | 12 | 37.4 | 50 |
| Premier League | 12 | 31.4 | 42 |

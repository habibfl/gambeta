// Textes des pages championnat (LeagueOverview.jsx). Les données viennent de l'API.
import { LEAGUE_STARS } from "./leagueMedia";

// Textes communs : ils décrivent ce que montre chaque graphique.
function texts(name) {
  return {
    standings: `Le classement résume une saison de résultats sans distinguer la performance durable de la réussite ponctuelle. Il se lit donc avec la différence de buts et les buts attendus (xG). Voici le classement final de la saison 2025-2026.`,
    xg: `Le xG (buts attendus) mesure la qualité des occasions d'un joueur, indépendamment du résultat. Un écart important entre buts marqués et xG signale une finition au-dessus ou en dessous de la moyenne, qui tend à se résorber d'une saison à l'autre.`,
    xa: `Le xA (passes décisives attendues) mesure la qualité des occasions offertes à un coéquipier. Il valorise les créateurs dont le travail n'apparaît pas toujours dans le total de passes décisives.`,
    style: `Chaque club est placé selon son volume offensif (xG, ou tirs lorsque le xG n'est pas disponible) et son activité défensive (tacles gagnés par match). Les médianes du championnat découpent le graphique en quatre profils.`,
    evolution: `La position de chaque club journée après journée montre la trajectoire de la saison : séries, décrochages et remontées que le classement final ne laisse pas voir.`,
    discipline: `Cartons par match, un rouge comptant pour deux jaunes. Le classement va de l'équipe la plus disciplinée à la moins disciplinée de ${name}.`,
  };
}

function league({ slug, name, clubs, context }) {
  return {
    eyebrow: name,
    title: `${name} : la saison en données`,
    stars: LEAGUE_STARS[slug],
    intro: `${clubs}. ${context} Six graphiques pour lire la saison au-delà du classement.`,
    texts: texts(`la ${name}`),
    provisionalCases: [],
    playerJars: { title: `Les références de la ${name}` },
  };
}

export const LEAGUE_OVERVIEWS = {
  "premier-league": league({
    slug: "premier-league",
    name: "Premier League",
    clubs: "20 clubs, 38 journées",
    context: "La course au titre la plus serrée des cinq : 5 points d'écart en moyenne entre le champion et son dauphin sur la période.",
  }),
  "ligue-1": league({
    slug: "ligue-1",
    name: "Ligue 1",
    clubs: "18 clubs et 34 journées depuis 2023-24 (20 clubs auparavant)",
    context: "Un championnat dominé par le PSG, titré sur chacune des cinq saisons étudiées.",
  }),
  liga: league({
    slug: "liga",
    name: "Liga",
    clubs: "20 clubs, 38 journées",
    context: "Les cinq titres de la période se partagent entre le Real Madrid et le FC Barcelone.",
  }),
  "serie-a": league({
    slug: "serie-a",
    name: "Serie A",
    clubs: "20 clubs, 38 journées",
    context: "Trois champions différents sur la période (Milan, Napoli, Inter), sans titre conservé deux saisons de suite.",
  }),
  bundesliga: league({
    slug: "bundesliga",
    name: "Bundesliga",
    clubs: "18 clubs, 34 journées",
    context: "Le championnat le plus prolifique des cinq en moyenne, au-dessus de trois buts par match chaque saison.",
  }),
};

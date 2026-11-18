// Couleur fixe par championnat
export const LEAGUE_COLORS = {
  "Premier League": "#2a78d6",
  Liga: "#eb6834",
  "Serie A": "#1baf7a",
  Bundesliga: "#eda100",
  "Ligue 1": "#e87ba4",
};

export const LEAGUE_SLUGS = {
  "premier-league": "Premier League",
  liga: "Liga",
  "serie-a": "Serie A",
  bundesliga: "Bundesliga",
  "ligue-1": "Ligue 1",
};

// Couleur d'un championnat à partir de son nom OU de son slug.
export function leagueColor(leagueOrSlug) {
  return LEAGUE_COLORS[leagueOrSlug] ?? LEAGUE_COLORS[LEAGUE_SLUGS[leagueOrSlug]] ?? "#e86f2c";
}

// "2122" -> "2021-22"
export const seasonLabel = (code) => `20${code.slice(0, 2)}-${code.slice(2)}`;

// Photos des joueurs vedettes de chaque championnat (assets/league-stars/<id>/player-N.*)
const starModules = import.meta.glob("../assets/league-stars/*/*.{jpg,jpeg,webp,png}", {
  eager: true,
  import: "default",
});

// { "ligue-1": [urlJoueur1, urlJoueur2], ... }
export const LEAGUE_STARS = {};
for (const [path, url] of Object.entries(starModules)) {
  const match = path.match(/league-stars\/([^/]+)\/player-(\d+)\./);
  if (!match) continue;
  const [, leagueId, index] = match;
  if (!LEAGUE_STARS[leagueId]) LEAGUE_STARS[leagueId] = [];
  LEAGUE_STARS[leagueId][Number(index) - 1] = url;
}

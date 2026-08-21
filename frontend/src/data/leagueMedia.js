// Charge les photos déposées dans assets/league-stars/ et
// assets/competition-champions/. `import.meta.glob` évite de coder en dur
// une extension par fichier : elle a été vérifiée comme non uniforme d'un
// dossier à l'autre (jpg pour certains joueurs, webp pour d'autres), donc
// mieux vaut laisser Vite résoudre chaque fichier tel qu'il existe
// réellement plutôt que de deviner et risquer de casser le build.
const starModules = import.meta.glob("../assets/league-stars/*/*.{jpg,jpeg,webp,png}", {
  eager: true,
  import: "default",
});
const championModules = import.meta.glob("../assets/competition-champions/*/*.{jpg,jpeg,webp,png}", {
  eager: true,
  import: "default",
});

// Construit { "ligue-1": [urlPlayer1, urlPlayer2], ... } à partir des
// chemins de fichiers : le nom du dossier donne l'id du championnat, le
// numéro dans "player-1"/"player-2" donne l'ordre d'affichage.
export const LEAGUE_STARS = {};
for (const [path, url] of Object.entries(starModules)) {
  const match = path.match(/league-stars\/([^/]+)\/player-(\d+)\./);
  if (!match) continue;
  const [, leagueId, index] = match;
  if (!LEAGUE_STARS[leagueId]) LEAGUE_STARS[leagueId] = [];
  LEAGUE_STARS[leagueId][Number(index) - 1] = url;
}

// Construit { "ligue-des-champions": url, ... } pour la photo du champion
// de chaque compétition.
export const COMPETITION_CHAMPIONS = {};
for (const [path, url] of Object.entries(championModules)) {
  const match = path.match(/competition-champions\/([^/]+)\/champion\./);
  if (!match) continue;
  const [, competitionId] = match;
  COMPETITION_CHAMPIONS[competitionId] = url;
}

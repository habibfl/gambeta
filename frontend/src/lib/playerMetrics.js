// Calculs "data" sur les joueurs, tous à partir des vraies statistiques de /api/data/players

export const LEAGUE_FILTERS = [
  { id: "ligue-1", label: "Ligue 1" },
  { id: "premier-league", label: "Premier League" },
  { id: "liga", label: "Liga" },
  { id: "serie-a", label: "Serie A" },
  { id: "bundesliga", label: "Bundesliga" },
];

export const POSITIONS = ["Attaquant", "Milieu", "Défenseur", "Gardien"];

// Understat code le poste par une lettre (F, M, D, GK) : on la traduit.
const POSITION_LABELS = { F: "Attaquant", M: "Milieu", D: "Défenseur", GK: "Gardien" };
export function positionLabel(code) {
  return POSITION_LABELS[code] ?? "Joueur";
}

// En dessous de 450 minutes (5 matchs complets), les stats par 90 sont trop instables
export const MIN_MINUTES = 450;

// Transforme une ligne brute de l'API dans le format utilisé par les pages.
export function toPlayer(row) {
  const minutes = row.minutes ?? 0;
  const per90 = (value) => (minutes > 0 && value != null ? (value * 90) / minutes : null);
  return {
    slug: row.player_slug,
    name: row.player,
    team: row.team,
    teamSlug: row.team_slug,
    leagueId: row.league_slug,
    leagueLabel: row.league,
    position: positionLabel(row.position),
    minutes,
    raw: row, // ligne brute de l'API (utilisée par l'explorateur)
    stats: {
      xg: row.xg ?? 0,
      xa: row.xa ?? 0,
      goals: row.goals ?? 0,
      assists: row.assists ?? 0,
      shots: row.shots ?? 0,
      matches: row.matches_played ?? 0,
    },
    shotAccuracy: row.shots ? (100 * (row.shots_on_target ?? 0)) / row.shots : null,
    per90: {
      goals: per90(row.goals),
      npxg: per90(row.np_xg),
      xa: per90(row.xa),
      shots: per90(row.shots),
      defense: per90((row.tackles_won ?? 0) + (row.interceptions ?? 0)),
      // Finition : buts marqués au-delà (ou en deçà) des xG, par 90.
      finishing: per90((row.goals ?? 0) - (row.xg ?? 0)),
      // Discipline : cartons pondérés + fautes, par 90 (plus bas = mieux).
      fouls: per90((row.yellow_cards ?? 0) + 3 * (row.red_cards ?? 0) + (row.fouls_committed ?? 0) * 0.2),
    },
  };
}

// Les 6 axes du radar, chacun exprimé en percentile (0-100)
export const RADAR_AXES = [
  { key: "npxg", axis: "Danger" },
  { key: "xa", axis: "Création" },
  { key: "finishing", axis: "Finition" },
  { key: "shots", axis: "Tirs" },
  { key: "defense", axis: "Défense" },
  { key: "fouls", axis: "Discipline", invert: true },
];

// Prépare, une fois pour toutes, les valeurs triées de chaque axe sur l'échantillon de référence
export function buildReference(players) {
  const pool = players.filter((p) => p.minutes >= MIN_MINUTES);
  const sorted = {};
  RADAR_AXES.forEach(({ key }) => {
    sorted[key] = pool.map((p) => p.per90[key]).filter((v) => v != null).sort((a, b) => a - b);
  });
  return sorted;
}

function percentile(sortedValues, value) {
  if (value == null || !sortedValues.length) return null;
  let below = 0;
  for (const v of sortedValues) {
    if (v < value) below += 1;
    else break;
  }
  return Math.round((below / sortedValues.length) * 100);
}

export function percentileRadar(player, reference) {
  return RADAR_AXES.map(({ key, axis, invert }) => {
    const p = percentile(reference[key], player.per90[key]);
    return { axis, value: p == null ? 0 : invert ? 100 - p : p };
  });
}

// Joueurs similaires : même poste, >= 450 minutes
export function similarPlayers(player, players, reference, count = 3) {
  const target = percentileRadar(player, reference);
  return players
    .filter((p) => p.slug !== player.slug && p.position === player.position && p.minutes >= MIN_MINUTES)
    .map((p) => {
      const radar = percentileRadar(p, reference);
      const distance = Math.sqrt(radar.reduce((sum, a, i) => sum + (a.value - target[i].value) ** 2, 0));
      return { ...p, distance };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

// Retrouve un joueur malgré les écarts d'orthographe entre sources
const strip = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export function findPlayerByName(players, name) {
  const words = strip(name).split(/\s+/);
  return players.find((p) => {
    const target = strip(p.name).replace(/-/g, " ");
    return words.every((w) => target.includes(w));
  });
}

// Rapport de scout (style FBref)
// Percentiles calculés UNIQUEMENT face aux joueurs du même poste ayant joué au moins 450 minutes
export const SCOUT_METRICS = [
  { key: "goals", label: "Buts", unit: "/90", get: (p) => p.per90.goals, digits: 2 },
  { key: "npxg", label: "npxG (hors penalty)", unit: "/90", get: (p) => p.per90.npxg, digits: 2 },
  { key: "finishing", label: "Buts − xG", unit: "/90", get: (p) => p.per90.finishing, digits: 2 },
  { key: "shots", label: "Tirs", unit: "/90", get: (p) => p.per90.shots, digits: 2 },
  { key: "accuracy", label: "Tirs cadrés", unit: " %", get: (p) => p.shotAccuracy, digits: 0, minShots: 10 },
  { key: "xa", label: "xA (passes)", unit: "/90", get: (p) => p.per90.xa, digits: 2 },
  { key: "defense", label: "Tacles gagnés + interceptions", unit: "/90", get: (p) => p.per90.defense, digits: 2 },
  { key: "fouls", label: "Discipline (cartons, fautes)", unit: "", get: (p) => p.per90.fouls, digits: 2, invert: true },
];

export function scoutReport(player, players) {
  const pool = players.filter((p) => p.position === player.position && p.minutes >= MIN_MINUTES);
  return SCOUT_METRICS.map((m) => {
    const eligible = m.minShots ? pool.filter((p) => p.stats.shots >= m.minShots) : pool;
    const values = eligible.map(m.get).filter((v) => v != null).sort((a, b) => a - b);
    const value = m.get(player);
    const pct = percentile(values, value);
    return {
      ...m,
      value,
      percentile: pct == null ? null : m.invert ? 100 - pct : pct,
      poolSize: values.length,
    };
  });
}

// Similarité en % entre deux profils (100 = identiques)
export function similarityPercent(distance) {
  const maxDistance = Math.sqrt(RADAR_AXES.length * 100 * 100);
  return Math.max(0, Math.round(100 - (distance / maxDistance) * 100 * 2));
}

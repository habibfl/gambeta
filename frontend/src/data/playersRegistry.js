// Registre central des joueurs : fusionne tous les joueurs déjà connus du
// site (buteurs/passeurs xG et xA des 5 fichiers de données, + les joueurs
// clés déjà générés pour chaque fiche club dans teamsRegistry.js),
// dédoublonnés par nom. Aucun nouveau nom de joueur n'est inventé ici :
// ce fichier ne fait que rassembler ce qui existe déjà ailleurs et
// l'enrichit (position, radar, stats dérivées) pour alimenter la page de
// recherche et les fiches détaillées.
import * as premierLeague from "./premierLeagueProvisional";
import * as ligue1 from "./ligue1Provisional";
import * as laLiga from "./laLigaProvisional";
import * as serieA from "./serieAProvisional";
import * as bundesliga from "./bundesligaProvisional";
import { TEAMS, getTeamDetail, slugify, avatarUrl } from "./teamsRegistry";

export { slugify, avatarUrl };

const LEAGUES = [
  { id: "ligue-1", label: "Ligue 1", data: ligue1 },
  { id: "premier-league", label: "Premier League", data: premierLeague },
  { id: "liga", label: "Liga", data: laLiga },
  { id: "serie-a", label: "Serie A", data: serieA },
  { id: "bundesliga", label: "Bundesliga", data: bundesliga },
];

export const LEAGUE_FILTERS = LEAGUES.map(({ id, label }) => ({ id, label }));
export const POSITIONS = ["Attaquant", "Milieu", "Défenseur", "Gardien"];

// --- Petits utilitaires déterministes (mêmes principes que teamsRegistry.js,
// dupliqués ici pour garder ce fichier autonome) ---------------------------

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed;
  return function random() {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function normalize(value, min, max, outMin = 25, outMax = 98, invert = false) {
  if (max === min) return Math.round((outMin + outMax) / 2);
  let t = (value - min) / (max - min);
  if (invert) t = 1 - t;
  return Math.round(outMin + t * (outMax - outMin));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// --- Étape 1 : joueurs réels (déjà nommés dans XG_SCORERS / XA_CREATORS) --

// Un joueur qui marque (XG_SCORERS) est classé Attaquant, un joueur qui
// passe (XA_CREATORS) est classé Milieu, comme demandé ("selon son rôle
// xG ou xA"). Un joueur présent dans les deux listes (ex: Cole Palmer,
// Antoine Griezmann) reste Attaquant : c'est déjà un profil offensif réel,
// la présence en plus dans les passeurs ne fait que compléter sa fiche.
function collectRealPlayers() {
  const byName = new Map();

  LEAGUES.forEach(({ id: leagueId, label: leagueLabel, data }) => {
    data.XG_SCORERS.forEach((row) => {
      if (byName.has(row.player)) return;
      byName.set(row.player, {
        name: row.player,
        team: row.team,
        leagueId,
        leagueLabel,
        position: "Attaquant",
        xg: row.xg,
        goals: row.goals,
        xa: null,
        assists: null,
      });
    });

    data.XA_CREATORS.forEach((row) => {
      const existing = byName.get(row.player);
      if (existing) {
        // Déjà un attaquant connu par son xG : on complète juste avec son
        // vrai xA plutôt que d'en inventer un plus tard.
        existing.xa = row.xa;
        return;
      }
      byName.set(row.player, {
        name: row.player,
        team: row.team,
        leagueId,
        leagueLabel,
        position: "Milieu",
        xg: null,
        goals: null,
        xa: row.xa,
        assists: null,
      });
    });
  });

  return byName;
}

// --- Étape 2 : complète avec les joueurs clés déjà inventés par
// teamsRegistry.js pour les clubs qui n'ont aucun buteur/passeur dans les
// listes ci-dessus (la majorité des ~94 clubs). Pas de nouveau nom créé
// ici : on reprend tel quel ce que buildKeyPlayers a déjà généré. Faute de
// rôle xG/xA connu pour ces noms, la position est tirée de façon
// pondérée et déterministe (seedée par le nom du joueur).
const POSITION_WEIGHTS = [
  ["Attaquant", 0.25],
  ["Milieu", 0.3],
  ["Défenseur", 0.3],
  ["Gardien", 0.15],
];

function pickInventedPosition(rand) {
  const roll = rand();
  let acc = 0;
  for (const [position, weight] of POSITION_WEIGHTS) {
    acc += weight;
    if (roll < acc) return position;
  }
  return POSITION_WEIGHTS[POSITION_WEIGHTS.length - 1][0];
}

function mergeInventedKeyPlayers(byName) {
  TEAMS.forEach((team) => {
    const detail = getTeamDetail(team.slug);
    if (!detail) return;
    detail.keyPlayers.forEach((keyPlayer) => {
      if (!keyPlayer.invented) return; // les vrais sont déjà couverts à l'étape 1
      if (byName.has(keyPlayer.name)) return; // dédoublonnage par nom

      const rand = mulberry32(hashString(keyPlayer.name));
      byName.set(keyPlayer.name, {
        name: keyPlayer.name,
        team: team.name,
        leagueId: team.leagueId,
        leagueLabel: team.leagueLabel,
        position: pickInventedPosition(rand),
        xg: null,
        goals: null,
        xa: null,
        assists: null,
      });
    });
  });
}

// --- Étape 3 : stats et radar dérivés, cohérents avec ce qui est déjà
// connu (xG/xA réel) et déterministes sinon (seedés par le nom du joueur,
// donc stables d'un rendu à l'autre) ----------------------------------------

// Bornes plausibles par position, utilisées pour compléter la moitié
// manquante d'un profil connu (ex : un attaquant repéré par son xG mais
// sans xA) et pour les joueurs entièrement inventés.
const STAT_RANGES = {
  Attaquant: { xg: [4, 15], xa: [0.5, 4] },
  Milieu: { xg: [1, 6], xa: [3, 9] },
  Défenseur: { xg: [0, 3], xa: [0, 2.5] },
  Gardien: { xg: [0, 0], xa: [0, 0] },
};

function deriveStat([min, max], rand) {
  if (max === min) return 0;
  return Math.round((min + rand() * (max - min)) * 10) / 10;
}

// Le total réel (buts ou passes décisives) tourne autour de la valeur
// attendue (xG/xA), avec un peu de variance comme dans la vraie vie.
function deriveCount(expected, rand) {
  return Math.max(0, Math.round(expected * (0.7 + rand() * 0.6)));
}

const RADAR_AXES = {
  Attaquant: ["Finition", "Vitesse", "Dribble", "Passes", "Physique", "Pressing"],
  Milieu: ["Passes", "Vision", "Endurance", "Dribble", "Pressing", "Physique"],
  Défenseur: ["Tacle", "Anticipation", "Physique", "Relance", "Jeu aérien", "Pressing"],
  Gardien: ["Réflexes", "Relance", "Jeu au pied", "Sorties", "Anticipation", "Placement"],
};

// Construit le radar à 6 axes, adaptés à la position. Quand un axe peut se
// déduire d'une vraie statistique (finition <- ratio buts/xG, passes/vision
// <- xA), on s'en sert ; sinon, valeur seedée stable par joueur.
function buildRadar(position, stats, rand) {
  return RADAR_AXES[position].map((axis) => {
    if (axis === "Finition" && stats.xg > 0) {
      return { axis, value: normalize(stats.goals / stats.xg, 0.5, 1.6) };
    }
    if (axis === "Passes" && stats.xa > 0) {
      return { axis, value: normalize(stats.xa, 0, 9) };
    }
    if (axis === "Vision" && stats.xa > 0) {
      // Même base que "Passes" mais légèrement décorrélée, pour ne pas
      // afficher deux fois la même valeur sur le radar.
      return { axis, value: clamp(normalize(stats.xa, 0, 9) + Math.round((rand() - 0.5) * 18), 25, 98) };
    }
    return { axis, value: Math.round(45 + rand() * 50) };
  });
}

// --- Construction finale du registre ---------------------------------------

function buildPlayers() {
  const byName = collectRealPlayers();
  mergeInventedKeyPlayers(byName);

  return Array.from(byName.values()).map((info) => {
    const rand = mulberry32(hashString(info.name));
    const ranges = STAT_RANGES[info.position];

    const xg = info.xg ?? deriveStat(ranges.xg, rand);
    const goals = info.goals ?? deriveCount(xg, rand);
    const xa = info.xa ?? deriveStat(ranges.xa, rand);
    const assists = info.assists ?? deriveCount(xa, rand);
    const stats = { xg, goals, xa, assists };

    return {
      slug: slugify(info.name),
      name: info.name,
      team: info.team,
      teamSlug: slugify(info.team),
      leagueId: info.leagueId,
      leagueLabel: info.leagueLabel,
      position: info.position,
      knownXG: info.xg !== null,
      knownXA: info.xa !== null,
      stats,
      radar: buildRadar(info.position, stats, rand),
    };
  });
}

// Calculé une seule fois à l'import : la construction est déterministe et
// suffisamment légère (quelques centaines de joueurs) pour ne pas justifier
// de mémoïsation plus poussée.
export const PLAYERS = buildPlayers();

// Distance euclidienne entre deux profils radar : seuls des joueurs de
// même position sont comparés (mêmes 6 axes), sinon distance infinie pour
// ne jamais rapprocher un gardien d'un attaquant.
function radarDistance(a, b) {
  if (a.position !== b.position) return Infinity;
  return Math.sqrt(a.radar.reduce((sum, axis, i) => sum + (axis.value - b.radar[i].value) ** 2, 0));
}

// Point d'entrée principal pour une fiche joueur : le joueur lui-même,
// complété par ses 3 profils les plus proches (même position, radar le
// plus similaire).
export function getPlayerDetail(slug) {
  const player = PLAYERS.find((p) => p.slug === slug);
  if (!player) return null;

  const similar = PLAYERS
    .filter((p) => p.slug !== player.slug)
    .map((p) => ({ player: p, distance: radarDistance(player, p) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)
    .map((entry) => entry.player);

  return { ...player, similar };
}

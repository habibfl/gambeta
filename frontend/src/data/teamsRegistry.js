// Registre central des équipes : construit une liste unique de clubs à
// partir des 5 fichiers de classement déjà existants (aucun nom de club
// n'est inventé ici), et calcule pour chacun un jeu de statistiques
// "provisoires" (forme récente, profil radar, bilan domicile/extérieur,
// joueurs clés) utilisées par EquipeDetail.jsx. Tout est dérivé de façon
// déterministe à partir du slug du club : mêmes données à chaque rendu,
// sans avoir à stocker 90+ fiches écrites à la main.
import * as premierLeague from "./premierLeagueProvisional";
import * as ligue1 from "./ligue1Provisional";
import * as laLiga from "./laLigaProvisional";
import * as serieA from "./serieAProvisional";
import * as bundesliga from "./bundesligaProvisional";

// Les 5 championnats couverts, dans l'ordre d'affichage souhaité pour le
// filtre de la page Équipes.
const LEAGUES = [
  { id: "ligue-1", label: "Ligue 1", data: ligue1 },
  { id: "premier-league", label: "Premier League", data: premierLeague },
  { id: "liga", label: "Liga", data: laLiga },
  { id: "serie-a", label: "Serie A", data: serieA },
  { id: "bundesliga", label: "Bundesliga", data: bundesliga },
];

// --- Utilitaires génériques -------------------------------------------------

// Transforme un nom de club en identifiant d'URL ("Bayer Leverkusen" ->
// "bayer-leverkusen"), en retirant les accents pour rester lisible dans
// une URL.
export function slugify(name) {
  return name
    .normalize("NFD")
    // Retire les signes diacritiques isolés par la décomposition NFD
    // (accents, tréma...) : "Mönchengladbach" -> "Monchengladbach".
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Petit hash de chaîne (FNV-1a) -> entier 32 bits, utilisé comme graine.
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Générateur pseudo-aléatoire seedé (mulberry32) : mêmes tirages à chaque
// appel pour une même graine, ce qui rend toutes les données "inventées"
// ci-dessous stables d'un rendu à l'autre plutôt que de changer à chaque
// clic.
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

// Ramène `value` dans [outMin, outMax] en fonction de sa position dans
// [min, max] (min-max scaling). `invert` sert pour les statistiques où une
// valeur basse est en fait une bonne performance (ex : PPDA, buts encaissés).
function normalize(value, min, max, outMin = 25, outMax = 98, invert = false) {
  if (max === min) return Math.round((outMin + outMax) / 2);
  let t = (value - min) / (max - min);
  if (invert) t = 1 - t;
  return Math.round(outMin + t * (outMax - outMin));
}

// --- Liste plate de toutes les équipes (page Équipes) -----------------------

export const TEAMS = LEAGUES.flatMap(({ id, label, data }) =>
  data.STANDINGS.map((row) => ({
    slug: slugify(row.team),
    name: row.team,
    leagueId: id,
    leagueLabel: label,
    rank: row.rank,
    pts: row.pts,
    gp: row.gp,
  }))
);

export const LEAGUE_FILTERS = LEAGUES.map(({ id, label }) => ({ id, label }));

// --- Détail d'une équipe (page EquipeDetail) --------------------------------

// Répartit un total de résultats (w victoires, d nuls, l défaites sur gp
// matchs) entre domicile et extérieur, en gardant les totaux exacts (la
// somme domicile + extérieur redonne toujours le bilan de STANDINGS) tout
// en biaisant légèrement en faveur des victoires à domicile, comme c'est
// généralement le cas en vrai.
function splitHomeAway(w, d, l, gp, rand) {
  const gpHome = Math.ceil(gp / 2);
  const results = [
    ...Array(w).fill("W"),
    ...Array(d).fill("D"),
    ...Array(l).fill("L"),
  ];
  const ranked = results
    .map((result) => ({
      result,
      // Une victoire a plus de chances de tomber dans la moitié "domicile"
      // (clé plus petite = prise en premier), une défaite moins de chances.
      key: rand() - (result === "W" ? 0.18 : result === "L" ? -0.18 : 0),
    }))
    .sort((a, b) => a.key - b.key);

  const tally = (list) => {
    const w2 = list.filter((x) => x.result === "W").length;
    const d2 = list.filter((x) => x.result === "D").length;
    const l2 = list.filter((x) => x.result === "L").length;
    return { gp: list.length, w: w2, d: d2, l: l2, pts: w2 * 3 + d2 };
  };

  return {
    home: tally(ranked.slice(0, gpHome)),
    away: tally(ranked.slice(gpHome)),
  };
}

// Génère les 5 derniers résultats (indépendants du bilan domicile/extérieur
// ci-dessus, c'est une simple photo récente) à partir de la probabilité de
// victoire/nul/défaite du club sur la saison, pour rester cohérent avec son
// niveau réel sans être une simple suite aléatoire uniforme.
function recentForm(w, d, l, gp, rand) {
  const pWin = w / gp;
  const pDraw = d / gp;
  const results = [];
  for (let i = 0; i < 5; i++) {
    const roll = rand();
    if (roll < pWin) results.push("V");
    else if (roll < pWin + pDraw) results.push("N");
    else results.push("D");
  }
  const points = results.reduce((sum, r) => sum + (r === "V" ? 3 : r === "N" ? 1 : 0), 0);
  return { results, points };
}

// Petites réserves de noms plausibles par championnat, pour compléter la
// section "Joueurs clés" quand un club n'a pas (ou peu) de joueur dans les
// classements xG/xA déjà écrits (seuls les 9 meilleurs de chaque catégorie
// y figurent, la majorité des clubs n'y sont pas représentés).
const FALLBACK_NAME_POOLS = {
  "ligue-1": { firsts: ["Théo", "Enzo", "Loïc", "Yanis", "Maxence", "Bilal"], lasts: ["Rousseau", "Fontaine", "Mercier", "Ngoma", "Traoré", "Girard"] },
  "premier-league": { firsts: ["James", "Callum", "Ethan", "Harvey", "Reece", "Charlie"], lasts: ["Whitfield", "Osborne", "Marsh", "Kingsley", "Dunne", "Pearce"] },
  liga: { firsts: ["Pablo", "Diego", "Javier", "Marc", "Iker", "Adrián"], lasts: ["Serrano", "Molina", "Herrera", "Núñez", "Campos", "Delgado"] },
  "serie-a": { firsts: ["Matteo", "Luca", "Riccardo", "Davide", "Simone", "Andrea"], lasts: ["Ferrari", "Colombo", "Bruno", "Rinaldi", "Marchetti", "Greco"] },
  bundesliga: { firsts: ["Lukas", "Finn", "Maximilian", "Jonas", "Niklas", "Tim"], lasts: ["Hoffmann", "Weber", "Krause", "Schulz", "Becker", "Vogel"] },
};

function inventPlayer(leagueId, rand, taken) {
  const pool = FALLBACK_NAME_POOLS[leagueId] ?? FALLBACK_NAME_POOLS["premier-league"];
  let name;
  do {
    const first = pool.firsts[Math.floor(rand() * pool.firsts.length)];
    const last = pool.lasts[Math.floor(rand() * pool.lasts.length)];
    name = `${first} ${last}`;
  } while (taken.has(name));
  taken.add(name);
  const rating = (6 + rand() * 2.3).toFixed(1);
  return { name, stat: `${rating} de moyenne cette saison`, invented: true };
}

// Les 3 à 4 joueurs mis en avant sur la fiche club : d'abord les vrais noms
// déjà présents dans les données xG/xA du championnat (si le club y est
// représenté), complétés si besoin par des noms plausibles inventés.
function buildKeyPlayers(teamName, leagueId, xgScorers, xaCreators, rand) {
  const byName = new Map();
  xgScorers
    .filter((p) => p.team === teamName)
    .forEach((p) => byName.set(p.player, { name: p.player, stat: `${p.xg.toFixed(1)} xG (${p.goals} buts)` }));
  xaCreators
    .filter((p) => p.team === teamName)
    .forEach((p) => {
      if (byName.has(p.player)) {
        const existing = byName.get(p.player);
        existing.stat += ` · ${p.xa.toFixed(1)} xA`;
      } else {
        byName.set(p.player, { name: p.player, stat: `${p.xa.toFixed(1)} xA` });
      }
    });

  const players = Array.from(byName.values()).slice(0, 4);
  const taken = new Set(players.map((p) => p.name));
  while (players.length < 4) {
    players.push(inventPlayer(leagueId, rand, taken));
  }
  return players;
}

// Petite palette réutilisée pour le fond des avatars DiceBear (sans le
// dièse : c'est le format attendu par l'API DiceBear).
const AVATAR_COLORS = ["e86f2c", "6c5ce7", "221400", "2f6f4f", "b23a1f"];

export function avatarUrl(name, index) {
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=${bg}&fontFamily=Arial`;
}

// Point d'entrée principal : renvoie toute la fiche détaillée d'un club à
// partir de son slug, ou `null` si aucun club ne correspond.
export function getTeamDetail(slug) {
  for (const { id, label, data } of LEAGUES) {
    const standing = data.STANDINGS.find((row) => slugify(row.team) === slug);
    if (!standing) continue;

    const rand = mulberry32(hashString(slug));
    const possessionRow = data.POSSESSION_VS_PPDA.find((row) => row.team === standing.team);

    // Bornes du championnat, pour situer ce club par rapport aux autres sur
    // chaque statistique du radar (min-max scaling).
    const gfPerGpValues = data.STANDINGS.map((row) => row.gf / row.gp);
    const gaPerGpValues = data.STANDINGS.map((row) => row.ga / row.gp);
    const possessionValues = data.POSSESSION_VS_PPDA.map((row) => row.possession);
    const ppdaValues = data.POSSESSION_VS_PPDA.map((row) => row.ppda);

    const radar = [
      { axis: "Attaque", value: normalize(standing.gf / standing.gp, Math.min(...gfPerGpValues), Math.max(...gfPerGpValues)) },
      { axis: "Défense", value: normalize(standing.ga / standing.gp, Math.min(...gaPerGpValues), Math.max(...gaPerGpValues), 25, 98, true) },
      { axis: "Possession", value: possessionRow ? normalize(possessionRow.possession, Math.min(...possessionValues), Math.max(...possessionValues)) : 50 },
      { axis: "Pressing", value: possessionRow ? normalize(possessionRow.ppda, Math.min(...ppdaValues), Math.max(...ppdaValues), 25, 98, true) : 50 },
      // Pas de donnée réelle de discipline (cartons) pour l'instant :
      // valeur inventée, seedée pour rester stable par club.
      { axis: "Discipline", value: Math.round(40 + rand() * 55) },
    ];

    return {
      slug,
      name: standing.team,
      leagueId: id,
      leagueLabel: label,
      rank: standing.rank,
      pts: standing.pts,
      gp: standing.gp,
      w: standing.w,
      d: standing.d,
      l: standing.l,
      gf: standing.gf,
      ga: standing.ga,
      totalTeams: data.STANDINGS.length,
      form: recentForm(standing.w, standing.d, standing.l, standing.gp, rand),
      radar,
      homeAway: splitHomeAway(standing.w, standing.d, standing.l, standing.gp, rand),
      keyPlayers: buildKeyPlayers(standing.team, id, data.XG_SCORERS, data.XA_CREATORS, rand),
    };
  }
  return null;
}

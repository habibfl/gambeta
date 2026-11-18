// Catalogue des indicateurs de l'explorateur de joueurs

const per90 = (value, minutes) => (minutes > 0 && value != null ? (value * 90) / minutes : null);

export const METRICS = [
  // --- Attaque
  { key: "goals90", group: "Attaque", label: "Buts /90", digits: 2, get: (r) => per90(r.goals, r.minutes) },
  { key: "npxg90", group: "Attaque", label: "npxG /90 (xG hors penalty)", digits: 2, get: (r) => per90(r.np_xg, r.minutes) },
  { key: "xg90", group: "Attaque", label: "xG /90", digits: 2, get: (r) => per90(r.xg, r.minutes) },
  { key: "finish90", group: "Attaque", label: "Buts − xG /90 (finition)", digits: 2, get: (r) => per90((r.goals ?? 0) - (r.xg ?? 0), r.minutes) },
  { key: "shots90", group: "Attaque", label: "Tirs /90", digits: 2, get: (r) => per90(r.shots, r.minutes) },
  { key: "sot90", group: "Attaque", label: "Tirs cadrés /90", digits: 2, get: (r) => per90(r.shots_on_target, r.minutes) },
  { key: "xgPerShot", group: "Attaque", label: "xG par tir (qualité des tirs)", digits: 3, get: (r) => (r.shots >= 10 && r.xg != null ? r.xg / r.shots : null) },
  { key: "accuracy", group: "Attaque", label: "% de tirs cadrés", digits: 0, unit: " %", get: (r) => (r.shots >= 10 ? (100 * (r.shots_on_target ?? 0)) / r.shots : null) },
  // --- Création
  { key: "xa90", group: "Création", label: "xA /90 (passes décisives attendues)", digits: 2, get: (r) => per90(r.xa, r.minutes) },
  { key: "assists90", group: "Création", label: "Passes décisives /90", digits: 2, get: (r) => per90(r.assists, r.minutes) },
  { key: "chain90", group: "Création", label: "xGChain /90 (implication dans les actions)", digits: 2, get: (r) => per90(r.xg_chain, r.minutes) },
  { key: "buildup90", group: "Création", label: "xGBuildup /90 (construction)", digits: 2, get: (r) => per90(r.xg_buildup, r.minutes) },
  { key: "xgxa90", group: "Création", label: "xG + xA /90 (apport offensif)", digits: 2, get: (r) => per90((r.xg ?? 0) + (r.xa ?? 0), r.minutes) },
  // --- Défense / discipline
  { key: "tackles90", group: "Défense", label: "Tacles gagnés /90", digits: 2, get: (r) => per90(r.tackles_won, r.minutes) },
  { key: "inter90", group: "Défense", label: "Interceptions /90", digits: 2, get: (r) => per90(r.interceptions, r.minutes) },
  { key: "def90", group: "Défense", label: "Tacles + interceptions /90", digits: 2, get: (r) => per90((r.tackles_won ?? 0) + (r.interceptions ?? 0), r.minutes) },
  { key: "fouls90", group: "Défense", label: "Fautes commises /90", digits: 2, invert: true, get: (r) => per90(r.fouls_committed, r.minutes) },
  { key: "drawn90", group: "Défense", label: "Fautes subies /90", digits: 2, get: (r) => per90(r.fouls_drawn, r.minutes) },
  // --- Volume
  { key: "minutes", group: "Volume", label: "Minutes jouées", digits: 0, get: (r) => r.minutes },
  { key: "goals", group: "Volume", label: "Buts (total)", digits: 0, get: (r) => r.goals },
  { key: "xg", group: "Volume", label: "xG (total)", digits: 1, get: (r) => r.xg },
  { key: "xa", group: "Volume", label: "xA (total)", digits: 1, get: (r) => r.xa },
];

export const METRIC = Object.fromEntries(METRICS.map((m) => [m.key, m]));

// Questions toutes prêtes : un clic règle les deux axes et le poste.
export const PRESETS = [
  { label: "Qui convertit le mieux ?", x: "npxg90", y: "goals90", position: "Attaquant", note: "Au-dessus de la diagonale : plus de buts que d'occasions." },
  { label: "Les créateurs", x: "xa90", y: "chain90", position: null, note: "Passes dangereuses (xA) contre implication dans les actions (xGChain)." },
  { label: "Les récupérateurs", x: "tackles90", y: "inter90", position: "Milieu", note: "Deux façons de récupérer le ballon : aller au duel ou lire le jeu." },
  { label: "Volume ou qualité de tir ?", x: "shots90", y: "xgPerShot", position: "Attaquant", note: "Beaucoup de tirs moyens, ou peu de tirs très dangereux ?" },
  { label: "Les meneurs de jeu", x: "buildup90", y: "xa90", position: "Milieu", note: "Construction de l'action (xGBuildup) et dernière passe (xA)." },
];

export function formatMetric(key, value) {
  const m = METRIC[key];
  if (value == null || Number.isNaN(value)) return "–";
  return `${value.toFixed(m.digits).replace(".", ",")}${m.unit ?? ""}`;
}

// Percentile (0-100) de `value` dans un tableau trié ; inversé si « moins = mieux ».
export function percentileOf(sorted, value, invert = false) {
  if (value == null || !sorted.length) return null;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  const p = Math.round((lo / sorted.length) * 100);
  return invert ? 100 - p : p;
}

// Coefficient de corrélation de Pearson et droite des moindres carrés.
export function pearson(points) {
  const n = points.length;
  if (n < 3) return null;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  points.forEach((p) => {
    sxy += (p.x - mx) * (p.y - my);
    sxx += (p.x - mx) ** 2;
    syy += (p.y - my) ** 2;
  });
  if (!sxx || !syy) return null;
  const slope = sxy / sxx;
  return { r: sxy / Math.sqrt(sxx * syy), slope, intercept: my - slope * mx, n };
}

export function describeR(r) {
  const a = Math.round(Math.abs(r) * 100) / 100; // même arrondi que l'affichage
  const strength = a >= 0.7 ? "forte" : a >= 0.4 ? "modérée" : a >= 0.2 ? "faible" : "quasi nulle";
  return `relation ${strength}${a >= 0.2 ? (r > 0 ? ", positive" : ", négative") : ""}`;
}

// Export CSV (séparateur « ; » et virgule décimale, pour Excel en français).
export function toCSV(rows, columns) {
  const esc = (v) => {
    const s = v == null ? "" : typeof v === "number" ? String(Math.round(v * 1000) / 1000).replace(".", ",") : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map((c) => c.label).join(";"), ...rows.map((r) => columns.map((c) => esc(c.get(r))).join(";"))].join("\n");
}

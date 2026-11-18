import { METRICS, percentileOf } from "./metrics";

// Couleurs des joueurs comparés (mêmes que le radar)
export const PLAYER_COLORS = ["#e86f2c", "#6c5ce7", "#2f6f4f"];
export const PER90 = METRICS.filter((m) => m.group !== "Volume");
export const GROUPS = ["Attaque", "Création", "Défense"];

// Tableaux triés par indicateur, pour un ensemble de joueurs de référence
function sortedPools(pool) {
  const out = {};
  PER90.forEach((m) => {
    out[m.key] = pool
      .map((p) => m.get(p.raw))
      .filter((v) => v != null && Number.isFinite(v))
      .sort((a, b) => a - b);
  });
  return out;
}

// Valeurs et percentiles (référence : même poste, ou tous les joueurs réguliers)
export function computePercentiles(players, allPlayers, minMinutes, mode) {
  const regulars = allPlayers.filter((p) => p.minutes >= minMinutes);
  const cache = {};
  const poolFor = (p) => {
    const key = mode === "poste" ? p.position : "all";
    if (!cache[key])
      cache[key] = sortedPools(
        mode === "poste"
          ? regulars.filter((r) => r.position === p.position)
          : regulars,
      );
    return cache[key];
  };
  return players.map((p) => {
    const pool = poolFor(p);
    const values = {};
    const pct = {};
    PER90.forEach((m) => {
      values[m.key] = m.get(p.raw);
      pct[m.key] = percentileOf(pool[m.key], values[m.key], m.invert);
    });
    return { values, pct, poolSize: pool[PER90[0].key].length };
  });
}

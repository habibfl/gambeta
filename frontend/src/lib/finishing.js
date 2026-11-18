// Joueurs affichés en visage dans le nuage « buts vs xG »
export function finishingFaces(players, league) {
  const pool = league === "all" ? players : players.filter((p) => p.league === league);
  const big = pool.filter((p) => p.xg >= 8);
  const extremes = [...big].sort((a, b) => b.diff - a.diff).slice(0, 4).concat([...big].sort((a, b) => a.diff - b.diff).slice(0, 4));
  const scorers = [...pool].sort((a, b) => b.goals - a.goals).slice(0, 8);
  return { extremes, faces: [...new Set([...scorers, ...extremes])] };
}


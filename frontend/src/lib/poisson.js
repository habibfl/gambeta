// Prédiction d'un match avec le modèle de Poisson

const MAX = 10;

function pmf(k, lambda) {
  let f = 1;
  for (let i = 2; i <= k; i += 1) f *= i;
  return (Math.exp(-lambda) * lambda ** k) / f;
}

// Buts attendus de chaque équipe : exp(mu + domicile + attaque - défense adverse)
export function expectedGoals(model, home, away) {
  const h = model.teams[home];
  const a = model.teams[away];
  return {
    home: Math.exp(model.mu + model.home + h.att - a.def),
    away: Math.exp(model.mu + a.att - h.def),
  };
}

// Probabilité de chaque score (lignes = buts à domicile, colonnes = extérieur)
export function scoreMatrix(lh, la, rho = 0) {
  const m = [];
  let total = 0;
  for (let i = 0; i <= MAX; i += 1) {
    m.push([]);
    for (let j = 0; j <= MAX; j += 1) {
      let p = pmf(i, lh) * pmf(j, la);
      if (i === 0 && j === 0) p *= 1 - lh * la * rho;
      if (i === 0 && j === 1) p *= 1 + lh * rho;
      if (i === 1 && j === 0) p *= 1 + la * rho;
      if (i === 1 && j === 1) p *= 1 - rho;
      m[i].push(p);
      total += p;
    }
  }
  return m.map((row) => row.map((p) => p / total));
}

export function outcomes(m) {
  let home = 0;
  let draw = 0;
  let away = 0;
  m.forEach((row, i) =>
    row.forEach((p, j) => {
      if (i > j) home += p;
      else if (i === j) draw += p;
      else away += p;
    })
  );
  return { home, draw, away };
}

export function mostLikely(m) {
  let best = { i: 0, j: 0, p: 0 };
  m.forEach((row, i) => row.forEach((p, j) => p > best.p && (best = { i, j, p })));
  return best;
}

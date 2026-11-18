// Simulation Monte Carlo d'une fin de saison avec le modèle de Poisson.

// Générateur pseudo-aléatoire reproductible (mulberry32)
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tirage d'une loi de Poisson (méthode de Knuth, suffisante pour λ < 5)
function poisson(lambda, rand) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= rand();
  } while (p > L);
  return k - 1;
}

// Prépare une simulation : tableau de départ
export function prepare(season, snapshot) {
  const n = season.teams.length;
  const base = Array.from({ length: n }, () => ({ pts: 0, gf: 0, ga: 0, played: 0 }));
  const remaining = [];
  season.matches.forEach(([day, h, a, hg, ag]) => {
    if (day < snapshot.day) {
      base[h].gf += hg;
      base[h].ga += ag;
      base[a].gf += ag;
      base[a].ga += hg;
      base[h].played += 1;
      base[a].played += 1;
      if (hg > ag) base[h].pts += 3;
      else if (hg < ag) base[a].pts += 3;
      else {
        base[h].pts += 1;
        base[a].pts += 1;
      }
    } else {
      const { mu, home, att, def } = snapshot;
      remaining.push([h, a, Math.exp(mu + home + att[h] - def[a]), Math.exp(mu + att[a] - def[h])]);
    }
  });
  // Classement final réel (pour comparer)
  const final = Array.from({ length: n }, () => ({ pts: 0, gd: 0, gf: 0 }));
  season.matches.forEach(([, h, a, hg, ag]) => {
    final[h].gf += hg;
    final[a].gf += ag;
    final[h].gd += hg - ag;
    final[a].gd += ag - hg;
    if (hg > ag) final[h].pts += 3;
    else if (hg < ag) final[a].pts += 3;
    else {
      final[h].pts += 1;
      final[a].pts += 1;
    }
  });
  const order = [...final.keys()].sort((i, j) => final[j].pts - final[i].pts || final[j].gd - final[i].gd || final[j].gf - final[i].gf);
  const actualRank = new Array(n);
  order.forEach((t, r) => (actualRank[t] = r + 1));
  return { n, base, remaining, actualRank, finalPts: final.map((f) => f.pts) };
}

// Lance `count` saisons et ajoute les résultats dans `acc`
export function runBatch(prep, count, rand, acc) {
  const { n, base, remaining } = prep;
  const pts = new Float64Array(n);
  const gd = new Float64Array(n);
  const gf = new Float64Array(n);
  const order = [...Array(n).keys()];
  for (let s = 0; s < count; s += 1) {
    for (let t = 0; t < n; t += 1) {
      pts[t] = base[t].pts;
      gd[t] = base[t].gf - base[t].ga;
      gf[t] = base[t].gf;
    }
    for (const [h, a, lh, la] of remaining) {
      const hg = poisson(lh, rand);
      const ag = poisson(la, rand);
      gd[h] += hg - ag;
      gd[a] += ag - hg;
      gf[h] += hg;
      gf[a] += ag;
      if (hg > ag) pts[h] += 3;
      else if (hg < ag) pts[a] += 3;
      else {
        pts[h] += 1;
        pts[a] += 1;
      }
    }
    order.sort((i, j) => pts[j] - pts[i] || gd[j] - gd[i] || gf[j] - gf[i] || rand() - 0.5);
    for (let r = 0; r < n; r += 1) {
      acc.rank[order[r]][r] += 1;
      acc.pts[order[r]] += pts[order[r]];
    }
  }
  acc.done += count;
  return acc;
}

export const emptyAcc = (n) => ({ done: 0, rank: Array.from({ length: n }, () => new Array(n).fill(0)), pts: new Array(n).fill(0) });

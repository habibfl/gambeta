// Petits outils statistiques (mêmes formules que analysis/export_stats.py).

const Z = 1.959964; // quantile 97,5 % de la loi normale

// Intervalle de confiance à 95 % d'une proportion k/n (méthode de Wilson)
export function wilson(k, n) {
  if (!n) return [0, 0];
  const p = k / n;
  const denom = 1 + (Z * Z) / n;
  const centre = (p + (Z * Z) / (2 * n)) / denom;
  const half = (Z * Math.sqrt((p * (1 - p)) / n + (Z * Z) / (4 * n * n))) / denom;
  return [centre - half, centre + half];
}

// Fonction d'erreur complémentaire (approximation d'Abramowitz et Stegun, 7.1.26)
function erfc(x) {
  const t = 1 / (1 + 0.3275911 * x);
  const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return y * Math.exp(-x * x);
}

// p-valeur bilatérale du test « la proportion vaut 50 % » (approximation normale)
export function pValueHalf(k, n) {
  const z = (k - n / 2) / Math.sqrt(n / 4);
  return erfc(Math.abs(z) / Math.SQRT2);
}

export function formatP(p) {
  if (p < 0.001) return "p < 0,001";
  return `p = ${p.toFixed(3).replace(".", ",")}`;
}

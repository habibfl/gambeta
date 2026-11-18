// Accès aux données : API FastAPI en local, fichiers JSON exportés en production (site statique)
// En développement, localStorage « gambeta-static » = "1" simule le site publié.
const devStatic = () => {
  try {
    return import.meta.env.DEV && localStorage.getItem("gambeta-static") === "1";
  } catch {
    return false;
  }
};
export const STATIC = import.meta.env.VITE_STATIC === "1" || devStatic();
export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// "/api/data/standings/liga?seasons=2122,2223" -> "data/standings/liga__seasons-2122_2223.json"
// Même règle que backend/export_static.py.
export function staticName(path) {
  const [base, query] = path.replace(/^\/api\//, "").split("?");
  const suffix = query ? `__${query.replace(/=/g, "-").replace(/,/g, "_").replace(/&/g, "__")}` : "";
  return `${base}${suffix}.json`;
}

export function apiUrl(path) {
  return STATIC ? `/static-api/${staticName(path)}` : `${API_BASE}${path}`;
}

// En statique, les photos et logos recherchés tiennent dans un seul fichier chacun.
const whole = {};
export function loadWhole(file) {
  if (!whole[file]) {
    whole[file] = fetch(`/static-api/${file}`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return whole[file];
}

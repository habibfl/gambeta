import { useEffect, useState } from "react";
import { STATIC, apiUrl } from "../lib/api";

// En statique, les matchs d'un club sont exportés en un seul fichier (toutes saisons) et filtrés ici
const MATCHES = /^(\/api\/data\/team\/[^/?]+\/matches)\?seasons=([\d,]+)$/;
function request(path) {
  const m = STATIC && path.match(MATCHES);
  if (!m) return fetch(apiUrl(path));
  const wanted = m[2].split(",");
  return fetch(apiUrl(m[1])).then((response) =>
    !response.ok
      ? response
      : response.json().then((d) => ({
          ok: true,
          json: () => ({ ...d, seasons: wanted, matches: d.matches.filter((x) => wanted.includes(x.season)) }),
        }))
  );
}

// Hook générique : appelle un endpoint de nos propres données
export function useApiData(path) {
  const [result, setResult] = useState({ path: null, data: null, error: null, status: null });

  useEffect(() => {
    if (!path) return undefined;

    let cancelled = false;
    request(path)
      .then((response) => {
        if (response.ok) return response.json();
        const error = new Error(`Erreur ${response.status}`);
        error.status = response.status;
        return Promise.reject(error);
      })
      .then((data) => {
        if (!cancelled) setResult({ path, data, error: null, status: 200 });
      })
      .catch((error) => {
        if (!cancelled) setResult({ path, data: null, error, status: error.status ?? null });
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!path) return { data: null, loading: false, error: null, status: null };

  const loading = result.path !== path;
  if (loading) return { data: null, loading: true, error: null, status: null };

  return { data: result.data, loading: false, error: result.error, status: result.status };
}

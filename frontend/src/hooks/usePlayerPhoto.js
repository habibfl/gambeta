import { useEffect, useState } from "react";
import { API_BASE, STATIC, loadWhole } from "../lib/api";

// Photo d'un joueur (API-Football, via /api/player-photos, avec cache côté backend).
const cache = new Map();

export function usePlayerPhoto(name) {
  const [url, setUrl] = useState(() => cache.get(name) ?? null);
  useEffect(() => {
    if (!name || cache.has(name)) return undefined;
    let cancelled = false;
    const request = STATIC
      ? loadWhole("player-photos.json").then((all) => ({ photos: { [name]: all[name] ?? null }, pending: [] }))
      : fetch(`${API_BASE}/api/player-photos?names=${encodeURIComponent(name)}`).then((r) => (r.ok ? r.json() : { photos: {} }));
    request
      .then((d) => {
        const photo = d.photos?.[name] ?? null;
        if (photo || !(d.pending || []).includes(name)) cache.set(name, photo);
        if (!cancelled) setUrl(photo);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [name]);
  return url;
}

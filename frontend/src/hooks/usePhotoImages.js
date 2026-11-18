import { useEffect, useState } from "react";

import { API_BASE, STATIC, loadWhole } from "../lib/api";

// Récupère les photos de tous les joueurs affichés.
const PHOTO_RETRY_DELAY_MS = 65_000;
const PHOTO_MAX_RETRIES = 5;

export function usePhotoImages(names) {
  const [images, setImages] = useState({});
  const key = names.join("|");

  useEffect(() => {
    if (!names.length) return undefined;
    let cancelled = false;
    let timer;

    const load = (toFetch, attempt) => {
      const query = toFetch.map((n) => `names=${encodeURIComponent(n)}`).join("&");
      const request = STATIC
        ? loadWhole("player-photos.json").then((all) => ({
            photos: Object.fromEntries(toFetch.map((n) => [n, all[n] ?? null])),
            pending: [],
          }))
        : fetch(`${API_BASE}/api/player-photos?${query}`).then((res) => (res.ok ? res.json() : { photos: {}, pending: [] }));
      request
        .then(({ photos, pending }) => {
          if (cancelled) return;
          Object.entries(photos || {}).forEach(([name, url]) => {
            if (!url) return;
            const img = new Image();
            img.onload = () => {
              if (!cancelled) setImages((prev) => ({ ...prev, [name]: img }));
            };
            img.src = url;
          });
          if (pending?.length && attempt < PHOTO_MAX_RETRIES) {
            timer = setTimeout(() => load(pending, attempt + 1), PHOTO_RETRY_DELAY_MS);
          }
        })
        .catch(() => {}); // API éteinte : on garde simplement les initiales
    };
    load(names, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return images;
}

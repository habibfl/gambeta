import { useEffect, useState } from "react";
import { buildReference, toPlayer } from "../lib/playerMetrics";
import { apiUrl } from "../lib/api";

const API_URL = apiUrl("/api/data/players");

// Un seul téléchargement de la base joueurs par session de navigation
let cachedPromise = null;
function loadPlayers() {
  if (!cachedPromise) {
    cachedPromise = fetch(API_URL)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data) => {
        const players = data.players.map(toPlayer);
        return { players, reference: buildReference(players), season: data.players[0]?.season ?? null };
      })
      .catch((error) => {
        cachedPromise = null; // permet de réessayer plus tard
        throw error;
      });
  }
  return cachedPromise;
}

// Renvoie { players, reference, season, loading, error }.
export function usePlayers() {
  const [state, setState] = useState({ players: [], reference: null, season: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    loadPlayers()
      .then((data) => !cancelled && setState({ ...data, loading: false, error: null }))
      .catch((error) => !cancelled && setState((s) => ({ ...s, loading: false, error })));
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

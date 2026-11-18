import { useEffect, useState } from "react";

// Écussons des clubs (API-Football, via /api/team-logos).
import { API_BASE, STATIC, apiUrl, loadWhole } from "../lib/api";

const API_URL = apiUrl("/api/team-logos");

const ALIASES = {
  "manchester utd": "manchester united",
  nottingham: "nottingham forest",
  "newcastle": "newcastle",
  psg: "paris saint germain",
  "paris sg": "paris saint germain",
  milan: "ac milan",
  "bayern munich": "bayern munchen",
  leverkusen: "bayer leverkusen",
  gladbach: "borussia monchengladbach",
  dortmund: "borussia dortmund",
  frankfurt: "eintracht frankfurt",
  koln: "1. fc koln",
  "mainz 05": "fsv mainz 05",
  "st pauli": "fc st. pauli",
  heidenheim: "1. fc heidenheim",
  "hamburger sv": "hamburger sv",
  "rb leipzig": "rb leipzig",
  "atletico madrid": "atletico madrid",
  betis: "real betis",
  "hellas verona": "verona",
  "clermont foot": "clermont foot",
  brest: "stade brestois 29",
  "paris fc": "~paris fc", // à ne pas confondre avec le PSG : recherche dédiée
  "rasenballsport leipzig": "rb leipzig",
  "wolverhampton wanderers": "wolves",
  "paris saint germain": "paris saint germain",
};

const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9. ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Index {nom normalisé API-Football: url}, chargé une fois par session.
let promise = null;
let index = null;
function load() {
  if (!promise) {
    promise = fetch(API_URL)
      .then((r) => (r.ok ? r.json() : { logos: {} }))
      .then((d) => {
        const idx = {};
        Object.values(d.logos || {}).forEach((byName) =>
          Object.entries(byName).forEach(([name, url]) => {
            idx[norm(name)] = url;
          })
        );
        index = idx;
        return idx;
      })
      .catch(() => {
        promise = null;
        return {};
      });
  }
  return promise;
}

function find(idx, team) {
  const key = norm(team);
  const target = ALIASES[key] ?? key;
  if (idx[target]) return idx[target];
  const keys = Object.keys(idx);
  // Un nom contenu dans l'autre ("Brighton" / "Brighton & Hove Albion")...
  let hit = keys.find((k) => k.startsWith(target) || target.startsWith(k));
  // ... ou tous les mots de l'un présents dans l'autre ("Stuttgart" / "VfB Stuttgart")
  if (!hit) {
    const words = (s) => s.split(" ").filter((w) => w.length > 2);
    const tw = words(target);
    hit = keys.find((k) => {
      const kw = words(k);
      return tw.length && (tw.every((w) => kw.includes(w)) || (kw.length && kw.every((w) => tw.includes(w))));
    });
  }
  return hit ? idx[hit] : null;
}

// Clubs absents des listes par championnat (promus récents) : recherche par nom côté backend
const SEARCH_URL = `${API_BASE}/api/team-logo-search`;
const searched = {}; // nom -> url | null
const queued = new Set();
const listeners = new Set();
let flushTimer = null;
let attempts = 0;

function notify() {
  listeners.forEach((fn) => fn());
}

function flush() {
  flushTimer = null;
  const names = [...queued];
  if (!names.length) return;
  queued.clear();
  const request = STATIC
    ? loadWhole("team-logo-search.json").then((all) => ({ logos: Object.fromEntries(names.map((n) => [n, all[n] ?? null])), pending: [] }))
    : fetch(`${SEARCH_URL}?${names.map((n) => `names=${encodeURIComponent(n)}`).join("&")}`).then((r) =>
        r.ok ? r.json() : { logos: {}, pending: names }
      );
  request
    .then(({ logos = {}, pending = [] }) => {
      Object.entries(logos).forEach(([n, url]) => {
        if (!pending.includes(n)) searched[n] = url;
      });
      notify();
      if (pending.length && attempts < 5) {
        attempts += 1;
        pending.forEach((n) => queued.add(n));
        flushTimer = setTimeout(flush, 65_000);
      }
    })
    .catch(() => {});
}

function lookup(team) {
  if (!team || !index) return null;
  const url = find(index, team);
  if (url) return url;
  if (team in searched) return searched[team];
  if (!queued.has(team)) {
    queued.add(team);
    if (!flushTimer) flushTimer = setTimeout(flush, 300);
  }
  return null;
}

// Renvoie une fonction logoFor(nomDuClub) -> URL ou null.
export function useTeamLogos() {
  const [, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const bump = () => !cancelled && setVersion((v) => v + 1);
    listeners.add(bump);
    load().then(bump);
    return () => {
      cancelled = true;
      listeners.delete(bump);
    };
  }, []);
  return lookup;
}

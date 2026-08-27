import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageBackground from "../components/PageBackground";
import RadarChart from "../components/charts/RadarChart";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { PLAYERS, avatarUrl } from "../data/playersRegistry";

// --- Petits utilitaires déterministes (mêmes principes que
// playersRegistry.js/teamsRegistry.js, dupliqués ici pour rester autonome) --

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed;
  return function random() {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalize(value, min, max, outMin = 20, outMax = 98) {
  if (max === min) return Math.round((outMin + outMax) / 2);
  const t = (value - min) / (max - min);
  return Math.round(outMin + t * (outMax - outMin));
}

// --- Profil radar "universel", propre au comparateur ------------------------

// playersRegistry.js donne à chaque joueur un radar à 6 axes ADAPTÉS À SON
// POSTE (Finition/Dribble pour un attaquant, Tacle/Jeu aérien pour un
// défenseur...) : deux joueurs de postes différents n'ont donc pas les
// mêmes axes, impossible à superposer tel quel sur un seul radar. Pour le
// comparateur, on reconstruit ici 6 axes génériques, valables pour
// n'importe quel poste, à partir des mêmes statistiques déjà connues
// (xG/xA réels quand ils existent) complétées de traits seedés (donc
// stables par joueur) pondérés selon le poste.
const ALL_XG = PLAYERS.map((p) => p.stats.xg);
const ALL_XA = PLAYERS.map((p) => p.stats.xa);
const XG_RANGE = [Math.min(...ALL_XG), Math.max(...ALL_XG)];
const XA_RANGE = [Math.min(...ALL_XA), Math.max(...ALL_XA)];

const DEFENSE_BASELINE = { Attaquant: 25, Milieu: 45, Défenseur: 80, Gardien: 85 };
const PHYSIQUE_BASELINE = { Attaquant: 55, Milieu: 55, Défenseur: 65, Gardien: 50 };

function comparatorRadar(player) {
  const rand = mulberry32(hashString(`comparateur:${player.name}`));

  const finition =
    player.stats.xg > 0
      ? Math.round(clamp(50 + (player.stats.goals / player.stats.xg - 1) * 60, 20, 98))
      : Math.round(30 + rand() * 40);

  return [
    { axis: "Attaque", value: normalize(player.stats.xg, ...XG_RANGE) },
    { axis: "Création", value: normalize(player.stats.xa, ...XA_RANGE) },
    { axis: "Finition", value: finition },
    { axis: "Physique", value: clamp(PHYSIQUE_BASELINE[player.position] + Math.round((rand() - 0.5) * 30), 20, 98) },
    { axis: "Défense", value: clamp(DEFENSE_BASELINE[player.position] + Math.round((rand() - 0.5) * 24), 20, 98) },
    { axis: "Discipline", value: Math.round(40 + rand() * 55) },
  ];
}

// Comparaisons pré-remplies pour l'état vide : uniquement des noms qui
// existent réellement dans le registre (vérifiés puis filtrés ci-dessous,
// jamais supposés).
const PRESET_DEFINITIONS = [
  { label: "Mbappé vs Haaland", names: ["Kylian Mbappé", "Erling Haaland"] },
  { label: "Kane vs Lewandowski", names: ["Harry Kane", "Robert Lewandowski"] },
  { label: "Martínez vs Osimhen vs Vlahović", names: ["Lautaro Martínez", "Victor Osimhen", "Dušan Vlahović"] },
];

const PRESETS = PRESET_DEFINITIONS.map((preset) => ({
  ...preset,
  players: preset.names.map((name) => PLAYERS.find((p) => p.name === name)).filter(Boolean),
})).filter((preset) => preset.players.length >= 2);

// --- Sélecteur de joueur : Input + suggestions filtrées, comme sur
// Joueurs.jsx (pas de Combobox shadcn installé dans le projet) -------------

function PlayerPicker({ label, value, onSelect, onClear, excludeSlugs }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return PLAYERS.filter((p) => !excludeSlugs.includes(p.slug) && p.name.toLowerCase().includes(needle)).slice(0, 6);
  }, [query, excludeSlugs]);

  if (value) {
    return (
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-current/50">{label}</p>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-current/10 bg-current/[0.02] px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <img src={avatarUrl(value.name, 0)} alt={value.name} className="h-8 w-8 shrink-0 rounded-full" />
            <span className="truncate font-semibold">{value.name}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClear}>
            Changer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-current/50">{label}</p>
      <Input
        type="search"
        placeholder="Rechercher un joueur..."
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Délai avant fermeture : laisse le temps au clic sur une
        // suggestion (onMouseDown, plus bas) de s'exécuter avant que le
        // blur ne démonte la liste.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-current/10 bg-[var(--gambeta-paper)] shadow-lg">
          {suggestions.map((player) => (
            <button
              key={player.slug}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-current/5"
              onMouseDown={() => {
                onSelect(player);
                setQuery("");
                setOpen(false);
              }}
            >
              <img src={avatarUrl(player.name, 0)} alt="" className="h-6 w-6 rounded-full" />
              <span className="truncate text-sm font-medium">{player.name}</span>
              <span className="ml-auto shrink-0 text-xs text-current/50">{player.team}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- État vide ---------------------------------------------------------------

function EmptyState({ onPreset }) {
  return (
    <div className="rounded-2xl border border-dashed border-current/15 px-6 py-16 text-center">
      <p className="text-current/60">
        Choisissez au moins deux joueurs ci-dessus pour lancer la comparaison.
      </p>
      {PRESETS.length > 0 && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {PRESETS.map((preset) => (
            <Button key={preset.label} variant="outline" size="sm" onClick={() => onPreset(preset.players)}>
              {preset.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Tableau comparatif -------------------------------------------------------

const TABLE_ROWS = [
  { label: "xG", get: (p) => p.stats.xg, format: (v) => v.toFixed(1), numeric: true },
  { label: "Buts", get: (p) => p.stats.goals, numeric: true },
  { label: "xA", get: (p) => p.stats.xa, format: (v) => v.toFixed(1), numeric: true },
  { label: "Passes décisives", get: (p) => p.stats.assists, numeric: true },
  { label: "Club", get: (p) => p.team, numeric: false },
  { label: "Championnat", get: (p) => p.leagueLabel, numeric: false },
  { label: "Poste", get: (p) => p.position, numeric: false },
];

function ComparisonTable({ players }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-current/10">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-current/10 bg-current/[0.02]">
            <th className="py-3 pl-4 pr-2 text-xs font-semibold uppercase tracking-wide text-current/50">
              Statistique
            </th>
            {players.map((player) => (
              <th key={player.slug} className="px-4 py-3 font-semibold">
                <Link to={`/joueurs/${player.slug}`} className="hover:underline">
                  {player.name}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TABLE_ROWS.map((row) => {
            const values = players.map(row.get);
            const best = row.numeric ? Math.max(...values) : null;
            // Pas de mise en avant si tout le monde est à égalité (mise en
            // avant réservée à un vrai avantage comparatif).
            const allTied = row.numeric && values.every((v) => v === best);

            return (
              <tr key={row.label} className="border-t border-current/10">
                <td className="py-2.5 pl-4 pr-2 text-current/60">{row.label}</td>
                {players.map((player, index) => {
                  const raw = values[index];
                  const isBest = row.numeric && !allTied && raw === best;
                  return (
                    <td
                      key={player.slug}
                      className="px-4 py-2.5 tabular-nums"
                      style={isBest ? { color: "#e86f2c", fontWeight: 700 } : undefined}
                    >
                      {row.format ? row.format(raw) : raw}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Petit wrapper qui déclenche l'animation d'entrée du radar (démarre à 0,
// s'anime vers les vraies valeurs) : son propre état `active` démarre à
// `false` à chaque montage, donc le fait de lui passer une `key` liée à la
// sélection (voir plus bas) suffit à rejouer l'animation à chaque
// changement de joueurs, sans avoir à réinitialiser un état ailleurs.
function AnimatedRadar({ series }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setActive(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return <RadarChart series={series} active={active} />;
}

// --- Page ----------------------------------------------------------------------

// Comparateur de 2 à 3 joueurs, entièrement alimenté par playersRegistry.js
// (aucune nouvelle donnée créée ici, seulement un profil radar générique
// dérivé pour pouvoir superposer des joueurs de postes différents).
export default function Comparateur() {
  const [slots, setSlots] = useState([null, null]);

  const selected = slots.filter(Boolean);
  const selectionKey = slots.map((s) => s?.slug ?? "_").join("|");

  function setSlot(index, player) {
    setSlots((prev) => prev.map((s, i) => (i === index ? player : s)));
  }
  function clearSlot(index) {
    setSlots((prev) => prev.map((s, i) => (i === index ? null : s)));
  }
  function addSlot() {
    setSlots((prev) => [...prev, null]);
  }
  function removeThirdSlot() {
    setSlots((prev) => prev.slice(0, 2));
  }
  function applyPreset(players) {
    setSlots(players);
  }

  const series = selected.map((player) => ({
    name: player.name,
    values: comparatorRadar(player),
  }));

  return (
    <>
      <PageBackground />
      <section className="flex-1 px-6 py-32 md:px-12 text-[var(--gambeta-ink)]">
        <div className="mx-auto max-w-[1000px]">
          <div className="mb-10 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e86f2c] mb-2">
              Tête-à-tête
            </p>
            <h1 className="text-[32px] md:text-[42px] font-bold tracking-[-0.02em]">Comparateur</h1>
            <p className="mt-4 text-current/60">
              Comparez deux ou trois joueurs de la base Gambeta, profil de jeu et statistiques
              clés côte à côte.
            </p>
          </div>

          {/* Sélecteurs de joueurs */}
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {slots.map((slot, index) => (
              <PlayerPicker
                key={index}
                label={`Joueur ${String.fromCharCode(65 + index)}`}
                value={slot}
                onSelect={(player) => setSlot(index, player)}
                onClear={() => clearSlot(index)}
                excludeSlugs={selected.map((p) => p.slug)}
              />
            ))}
          </div>

          <div className="mb-10 flex justify-center">
            {slots.length < 3 ? (
              <Button variant="outline" size="sm" onClick={addSlot}>
                + Ajouter un 3e joueur
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={removeThirdSlot}>
                Retirer le 3e joueur
              </Button>
            )}
          </div>

          {selected.length < 2 ? (
            <EmptyState onPreset={applyPreset} />
          ) : (
            <div className="space-y-10">
              {/* Radar superposé */}
              <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-4 md:p-8">
                <div className="mx-auto max-w-[420px]">
                  <AnimatedRadar key={selectionKey} series={series} />
                </div>
              </div>

              {/* Tableau comparatif */}
              <ComparisonTable players={selected} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import RadarChart from "../components/charts/RadarChart";
import { PageBody, Section, ChartCard, FilterBar, FilterLabel, ChipGroup } from "../components/layout/PageKit";
import { PlayerHeaders, Verdict, PercentileMatrix, PlayerMap } from "../components/comparator/ComparatorBlocks";
import { computePercentiles, PER90 } from "../lib/comparator";

const PER90_COUNT = PER90.length;
import { inputClass } from "../lib/ui";
import PlayerPhoto from "../components/PlayerPhoto";
import Crest from "../components/Crest";
import { useTeamLogos } from "../hooks/useTeamLogos";
import { ApiError, ApiSkeleton } from "../components/ApiState";
import { usePlayers } from "../hooks/usePlayers";
import { avatarUrl } from "../lib/avatar";
import Term from "../components/Term";
import { findPlayerByName, percentileRadar, MIN_MINUTES } from "../lib/playerMetrics";

// Petits utilitaires déterministes

// Comparaisons proposées par défaut (retrouvées par nom dans la base).
const PRESET_DEFINITIONS = [
  { label: "Mbappé vs Haaland", names: ["Kylian Mbappé", "Erling Haaland"] },
  { label: "Kane vs Lewandowski", names: ["Harry Kane", "Robert Lewandowski"] },
  { label: "Salah vs Saka vs Yamal", names: ["Mohamed Salah", "Bukayo Saka", "Lamine Yamal"] },
];

function buildPresets(players) {
  return PRESET_DEFINITIONS.map((preset) => ({
    ...preset,
    players: preset.names.map((name) => findPlayerByName(players, name)).filter(Boolean),
  })).filter((preset) => preset.players.length >= 2);
}

function PlayerPicker({ label, value, onSelect, onClear, excludeSlugs, players }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return players
      .filter((p) => !excludeSlugs.includes(p.slug) && p.name.toLowerCase().includes(needle))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 6);
  }, [query, excludeSlugs, players]);

  if (value) {
    return (
      <div className="flex min-w-[220px] flex-col gap-1">
        <FilterLabel>{label}</FilterLabel>
        <div className="flex items-center justify-between gap-2 rounded-lg border border-current/20 px-2 py-1">
          <div className="flex min-w-0 items-center gap-2">
            <PlayerPhoto name={value.name} league={value.leagueLabel} size={26} ring={false} fetchPhoto />
            <span className="truncate text-[13px] font-semibold">{value.name}</span>
          </div>
          <button type="button" onClick={onClear} className="text-[12px] text-current/60 hover:text-current">
            Changer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-w-[220px] flex-col gap-1">
      <FilterLabel>{label}</FilterLabel>
      <input
        className={inputClass}
        type="search"
        placeholder="Rechercher un joueur"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Délai avant fermeture : laisse le temps au clic sur une suggestion
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

// État vide

function EmptyState() {
  return (
    <div className="mt-10 rounded-2xl border border-dashed border-current/15 px-6 py-16 text-center text-current/60">
      Choisissez au moins deux joueurs, ou une comparaison proposée dans la barre ci-dessus.
    </div>
  );
}

// Tableau comparatif

const fmt1 = (v) => (v == null ? "-" : v.toFixed(1));

const TABLE_ROWS = [
  { label: "Matchs joués", get: (p) => p.stats.matches, numeric: true },
  { label: "Minutes jouées", get: (p) => p.minutes, numeric: true },
  { label: "Buts", get: (p) => p.stats.goals, numeric: true },
  { label: "xG", get: (p) => p.stats.xg, format: fmt1, numeric: true },
  { label: "Passes décisives", get: (p) => p.stats.assists, numeric: true },
  { label: "xA", get: (p) => p.stats.xa, format: fmt1, numeric: true },
  { label: "Tirs (total)", get: (p) => p.raw.shots, numeric: true },
  { label: "Tirs cadrés", get: (p) => p.raw.shots_on_target, numeric: true },
  { label: "Tacles gagnés", get: (p) => p.raw.tackles_won, numeric: true },
  { label: "Interceptions", get: (p) => p.raw.interceptions, numeric: true },
  { label: "Fautes subies", get: (p) => p.raw.fouls_drawn, numeric: true },
  { label: "Fautes commises", get: (p) => p.raw.fouls_committed, numeric: true, lower: true },
  { label: "Cartons jaunes", get: (p) => p.raw.yellow_cards, numeric: true, lower: true },
  { label: "Cartons rouges", get: (p) => p.raw.red_cards, numeric: true, lower: true },
  { label: "Club", get: (p) => p.team, numeric: false },
  { label: "Championnat", get: (p) => p.leagueLabel, numeric: false },
  { label: "Poste", get: (p) => p.position, numeric: false },
];

function ComparisonTable({ players, logoFor }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-current/10">
      <table className="w-full min-w-[480px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-current/10 bg-current/[0.02]">
            <th className="py-3 pl-4 pr-2 font-mono text-[11px] font-normal uppercase tracking-wide text-current/50">
              Statistique
            </th>
            {players.map((player) => (
              <th key={player.slug} className="px-4 py-3 font-semibold">
                <Link to={`/joueurs/${player.slug}`} className="flex items-center gap-2 hover:text-[#e86f2c]">
                  <Crest team={player.team} league={player.leagueLabel} logo={logoFor(player.team)} size={20} />
                  {player.name}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TABLE_ROWS.map((row) => {
            const values = players.map(row.get);
            const nums = values.filter((v) => v != null);
            const best = row.numeric ? (row.lower ? Math.min(...nums) : Math.max(...nums)) : null;
            // Pas de mise en avant si tout le monde est à égalité
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

// Petit wrapper qui déclenche l'animation d'entrée du radar
function AnimatedRadar({ series }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setActive(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return <RadarChart series={series} active={active} />;
}

// Page

// Comparateur de 2 à 3 joueurs, entièrement alimenté par playersRegistry.js
export default function Comparateur() {
  const [slots, setSlots] = useState([null, null]);
  const { players, reference, loading, error } = usePlayers();
  const presets = useMemo(() => buildPresets(players), [players]);
  const logoFor = useTeamLogos();
  const [refMode, setRefMode] = useState("poste");

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

  const pctData = useMemo(
    () => computePercentiles(selected, players, MIN_MINUTES, refMode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectionKey, players, refMode]
  );

  const series = selected.map((player) => ({
    name: player.name,
    league: player.leagueLabel,
    values: percentileRadar(player, reference),
  }));

  return (
    <>
      <PageHero
        eyebrow="Tête-à-tête"
        title="Comparateur"
        subtitle="Deux ou trois joueurs des 5 grands championnats : synthèse, radar, 18 indicateurs par 90 minutes en percentiles, position parmi tous les joueurs et totaux de la saison."
        accent="#6c5ce7"
      />
      <FilterBar>
        {presets.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterLabel>Comparaisons</FilterLabel>
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.players)}
                className="rounded-full border border-current/15 px-3 py-1 text-[12px] font-semibold transition hover:border-current/40"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          {slots.map((slot, index) => (
            <PlayerPicker
              key={index}
              label={`Joueur ${String.fromCharCode(65 + index)}`}
              value={slot}
              onSelect={(player) => setSlot(index, player)}
              onClear={() => clearSlot(index)}
              excludeSlugs={selected.map((p) => p.slug)}
              players={players}
            />
          ))}
          <button
            type="button"
            onClick={slots.length < 3 ? addSlot : removeThirdSlot}
            className="mb-0.5 rounded-full border border-current/20 px-3 py-1.5 text-[12px] font-semibold hover:border-current/50"
          >
            {slots.length < 3 ? "Ajouter un 3e joueur" : "Retirer le 3e joueur"}
          </button>
        </div>
      </FilterBar>

      <PageBody>
        {loading ? (
          <ApiSkeleton className="mt-10 h-64 w-full" />
        ) : error ? (
          <ApiError message="Impossible de charger les joueurs depuis l'API." />
        ) : selected.length < 2 ? (
          <EmptyState />
        ) : (
          <>
            <section className="pt-10">
              <PlayerHeaders players={selected} logoFor={logoFor} />
            </section>

            <Section
              kicker="Synthèse"
              title={`${selected.map((p) => p.name.split(" ").slice(-1)[0]).join(" ou ")} ?`}
              intro={`Nombre d'indicateurs par 90 minutes où chaque joueur est devant, et ses trois meilleurs percentiles. Référence : ${
                refMode === "poste" ? "joueurs du même poste" : "tous les joueurs"
              } avec au moins ${MIN_MINUTES} minutes.`}
            >
              <ChipGroup
                label="Référence"
                value={refMode}
                onChange={setRefMode}
                options={[
                  { value: "poste", label: "Même poste" },
                  { value: "all", label: "Tous les joueurs" },
                ]}
              />
              <Verdict players={selected} data={pctData} />
            </Section>

            <Section
              layout="split"
              kicker="Profil"
              title="Radar de percentiles"
              intro={
                <>
                  Six axes de synthèse. Chaque axe est un <Term id="percentile">percentile</Term> : 80 signifie « meilleur que
                  80 % des joueurs ayant joué au moins {MIN_MINUTES} minutes ». Valeurs ramenées <Term id="per90">à 90 minutes</Term>.
                </>
              }
            >
              <ChartCard>
                <div className="mx-auto max-w-[420px]">
                  <AnimatedRadar key={selectionKey} series={series} />
                </div>
              </ChartCard>
            </Section>

            <Section
              kicker="Profil complet"
              title={`${PER90_COUNT} indicateurs par 90 minutes`}
              intro="Pour chaque indicateur : la barre donne le percentile (longueur), suivie de la valeur par 90 minutes et du percentile. Les fautes commises sont inversées : une barre longue signifie peu de fautes."
            >
              <PercentileMatrix players={selected} data={pctData} />
            </Section>

            <Section
              kicker="Position dans le championnat"
              title="Où se situent-ils parmi tous les joueurs ?"
              intro="Chaque point gris est un joueur des 5 championnats. Choisissez la paire d'indicateurs à croiser ; survolez un point pour son détail."
            >
              <ChartCard>
                <PlayerMap players={selected} allPlayers={players} minMinutes={MIN_MINUTES} />
              </ChartCard>
            </Section>

            <Section kicker="Volumes" title="Totaux de la saison" intro="En corail : la meilleure valeur de la comparaison (pour les fautes et cartons, la plus basse).">
              <ComparisonTable players={selected} logoFor={logoFor} />
            </Section>
          </>
        )}
      </PageBody>
    </>
  );
}

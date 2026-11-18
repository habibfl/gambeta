import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeftRight } from "lucide-react";
import { inputClass } from "../lib/ui";
import PageHero, { HeroStat } from "../components/PageHero";
import ExplorerScatter from "../components/explorer/ExplorerScatter";
import LeagueFilter from "../components/story/LeagueFilter";
import PlayerPhoto from "../components/PlayerPhoto";
import Crest from "../components/Crest";
import Term from "../components/Term";
import { ApiError, ApiSkeleton } from "../components/ApiState";
import { usePlayers } from "../hooks/usePlayers";
import { usePhotoImages } from "../hooks/usePhotoImages";
import { useTeamLogos } from "../hooks/useTeamLogos";
import { POSITIONS, MIN_MINUTES } from "../lib/playerMetrics";
import { METRICS, METRIC, PRESETS, formatMetric, percentileOf, pearson, describeR, toCSV } from "../lib/metrics";
import { fr } from "../components/story/hooks";

const GROUPS = [...new Set(METRICS.map((m) => m.group))];
// Indicateurs du profil (barres de percentiles), dans l'ordre d'affichage
const PROFILE_KEYS = ["goals90", "npxg90", "finish90", "shots90", "xgPerShot", "xa90", "chain90", "buildup90", "tackles90", "inter90", "fouls90"];

// Couleur d'un percentile, du rouge (bas) au vert (haut), comme sur les outils de scouting
function pctColor(p) {
  if (p == null) return "rgba(128,128,128,.25)";
  if (p >= 80) return "#1a9a5b";
  if (p >= 60) return "#7cc47f";
  if (p >= 40) return "#e9c46a";
  if (p >= 20) return "#f08a5d";
  return "#d64545";
}

function PctChip({ p }) {
  return (
    <span
      className="inline-flex min-w-[2.4rem] justify-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold text-white"
      style={{ background: pctColor(p), color: p != null && p >= 40 && p < 60 ? "#221400" : undefined }}
    >
      {p ?? "–"}
    </span>
  );
}

function MetricSelect({ value, onChange, label }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-mono uppercase tracking-wide text-current/55">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[230px] rounded-lg border border-current/20 bg-[var(--gambeta-paper)] px-2 py-1.5 font-sans text-[13px] normal-case tracking-normal text-[var(--gambeta-ink)]"
      >
        {GROUPS.map((g) => (
          <optgroup key={g} label={g}>
            {METRICS.filter((m) => m.group === g).map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

// Explorateur de joueurs, façon outil de scouting : l'utilisateur choisit les deux indicateurs
export default function Explorer() {
  const { players, loading, error } = usePlayers();
  const logoFor = useTeamLogos();
  const [params, setParams] = useSearchParams();
  const [sortKey, setSortKey] = useState(null);

  const xKey = METRIC[params.get("x")] ? params.get("x") : "npxg90";
  const yKey = METRIC[params.get("y")] ? params.get("y") : "goals90";
  const league = params.get("lg") || null;
  const position = params.get("pos") || null;
  const minMinutes = Number(params.get("min") ?? 900);
  const team = params.get("team") || null;
  const selected = params.get("p") || null;
  const showFit = params.get("fit") === "1";
  const query = params.get("q") || "";
  const needle = query.trim().toLowerCase();

  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v == null || v === "" ? next.delete(k) : next.set(k, String(v))));
    setParams(next, { replace: true });
  };

  // Percentiles : chaque joueur comparé aux joueurs de son poste (>= 450 min)
  const pools = useMemo(() => {
    const out = {};
    POSITIONS.forEach((pos) => {
      const pool = players.filter((p) => p.position === pos && p.minutes >= MIN_MINUTES);
      out[pos] = Object.fromEntries(
        METRICS.map((m) => [m.key, pool.map((p) => m.get(p.raw)).filter((v) => v != null).sort((a, b) => a - b)])
      );
    });
    return out;
  }, [players]);
  const pct = (p, key) => percentileOf(pools[p.position]?.[key] ?? [], METRIC[key].get(p.raw), METRIC[key].invert);

  const teams = useMemo(
    () => [...new Set(players.filter((p) => !league || p.leagueLabel === league).map((p) => p.team))].sort(),
    [players, league]
  );

  const filtered = useMemo(
    () =>
      players.filter(
        (p) =>
          (needle ? p.name.toLowerCase().includes(needle) : p.minutes >= minMinutes) &&
          (!league || p.leagueLabel === league) &&
          (!position || p.position === position) &&
          (!team || p.team === team)
      ),
    [players, minMinutes, league, position, team, needle]
  );

  const points = useMemo(
    () =>
      filtered
        .map((p) => ({ p, x: METRIC[xKey].get(p.raw), y: METRIC[yKey].get(p.raw) }))
        .filter((d) => d.x != null && d.y != null),
    [filtered, xKey, yKey]
  );
  const fit = useMemo(() => pearson(points), [points]);

  // Les 12 joueurs les plus remarquables sur les deux axes (+ le joueur sélectionné)
  const stars = useMemo(() => {
    if (!points.length) return [];
    const xs = points.map((d) => d.x).sort((a, b) => a - b);
    const ys = points.map((d) => d.y).sort((a, b) => a - b);
    const score = (d) =>
      percentileOf(xs, d.x, METRIC[xKey].invert) + percentileOf(ys, d.y, METRIC[yKey].invert);
    // On prend les meilleurs, en sautant ceux qui tomberaient presque au même endroit qu'un visage déjà placé
    const xr = xs[xs.length - 1] - xs[0] || 1;
    const yr = ys[ys.length - 1] - ys[0] || 1;
    const top = [];
    for (const d of [...points].sort((a, b) => score(b) - score(a)).slice(0, 60)) {
      const close = top.some((t) => Math.hypot((t.x - d.x) / xr, (t.y - d.y) / yr) < 0.045);
      if (!close) top.push(d);
      if (top.length === 12) break;
    }
    const sel = points.find((d) => d.p.slug === selected);
    return sel && !top.includes(sel) ? [...top, sel] : top;
  }, [points, selected, xKey, yKey]);

  const faces = usePhotoImages(stars.map((d) => d.p.name));
  const photoFor = (name) => faces[name]?.src ?? null;
  const selPlayer = players.find((p) => p.slug === selected) ?? null;

  const tableKey = sortKey ?? xKey;
  const tableRows = useMemo(() => {
    const m = METRIC[tableKey];
    return [...filtered]
      .filter((p) => m.get(p.raw) != null)
      .sort((a, b) => (m.invert ? 1 : -1) * (m.get(a.raw) - m.get(b.raw)))
      .slice(0, 25);
  }, [filtered, tableKey]);
  const tableCols = [...new Set([xKey, yKey, "goals90", "npxg90", "xa90", "def90"])];

  function exportCSV() {
    const cols = [
      { label: "Joueur", get: (p) => p.name },
      { label: "Club", get: (p) => p.team },
      { label: "Championnat", get: (p) => p.leagueLabel },
      { label: "Poste", get: (p) => p.position },
      ...METRICS.map((m) => ({ label: m.label, get: (p) => m.get(p.raw) })),
    ];
    const blob = new Blob(["﻿" + toCSV(filtered, cols)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gambeta_joueurs_${xKey}_${yKey}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const preset = PRESETS.find((p) => p.x === xKey && p.y === yKey);

  return (
    <>
      <PageHero
        eyebrow="Outil · Scouting"
        title="Explorateur de joueurs"
        subtitle="Choisissez deux indicateurs parmi 22, filtrez par championnat, poste, club et temps de jeu : le nuage, la corrélation et le classement se recalculent instantanément. Chaque vue a son propre lien, à partager tel quel."
        accent="#1a9a5b"
      >
        <div className="grid max-w-[640px] grid-cols-3 gap-3">
          <HeroStat value={players.length ? players.length.toLocaleString("fr-FR") : "…"} label="joueurs 2025-26" />
          <HeroStat value={METRICS.length} label="indicateurs" />
          <HeroStat value={filtered.length || "…"} label="dans la sélection" />
        </div>
      </PageHero>

      <div className="text-[var(--gambeta-ink)]">
        {/* Réglages (en haut de page : ils s'appliquent au nuage ET au classement) */}
        <div className="relative z-30 border-b border-current/10 bg-current/[0.02]">
          <div className="mx-auto max-w-[1200px] space-y-3 px-6 py-3 md:px-12">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-current/50">Questions</span>
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => set({ x: p.x, y: p.y, pos: p.position, p: null })}
                  className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
                    preset === p ? "border-[#1a9a5b] bg-[#1a9a5b] text-white" : "border-current/15 hover:border-current/40"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
              <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wide text-current/55">
                Joueur
                <input
                  type="search"
                  value={query}
                  onChange={(e) => set({ q: e.target.value })}
                  placeholder="Rechercher un nom"
                  className={`${inputClass} w-48 font-sans normal-case tracking-normal`}
                />
              </label>
              <MetricSelect label="Axe horizontal (X)" value={xKey} onChange={(v) => set({ x: v })} />
              <button
                type="button"
                onClick={() => set({ x: yKey, y: xKey })}
                className="mb-0.5 rounded-full border border-current/20 px-2.5 py-1.5 text-[13px] hover:border-current/50"
                title="Inverser les axes"
              >
                <ArrowLeftRight size={14} aria-hidden />
              </button>
              <MetricSelect label="Axe vertical (Y)" value={yKey} onChange={(v) => set({ y: v })} />
              <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wide text-current/55">
                Minutes min : <b className="text-current">{minMinutes}</b>
                <input
                  type="range"
                  min={0}
                  max={3000}
                  step={90}
                  value={minMinutes}
                  onChange={(e) => set({ min: e.target.value })}
                  className="w-40 accent-[#1a9a5b]"
                />
              </label>
              <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wide text-current/55">
                Club
                <select
                  value={team ?? ""}
                  onChange={(e) => set({ team: e.target.value || null })}
                  className="max-w-[180px] rounded-lg border border-current/20 bg-[var(--gambeta-paper)] px-2 py-1.5 font-sans text-[13px] normal-case tracking-normal"
                >
                  <option value="">Tous les clubs</option>
                  {teams.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mb-1 flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={showFit} onChange={(e) => set({ fit: e.target.checked ? "1" : null })} className="accent-[#e86f2c]" />
                Droite de tendance
              </label>
            </div>
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <LeagueFilter value={league} onChange={(v) => set({ lg: v, team: null })} label="Championnat" />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-current/50">Poste</span>
                {[null, ...POSITIONS].map((pos) => (
                  <button
                    key={pos ?? "all"}
                    type="button"
                    onClick={() => set({ pos })}
                    className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
                      position === pos
                        ? "border-[var(--gambeta-ink)] bg-[var(--gambeta-ink)] text-[var(--gambeta-paper)]"
                        : "border-current/15 hover:border-current/40"
                    }`}
                  >
                    {pos ?? "Tous"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1200px] px-6 pb-24 pt-8 md:px-12">
          {loading ? (
            <ApiSkeleton className="h-[520px] w-full" />
          ) : error ? (
            <ApiError message="Impossible de charger les joueurs depuis l'API." />
          ) : (
            <>
              {/* Lecture statistique de la vue */}
              <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <p className="text-[15px]">
                  <b>{points.length}</b> joueurs
                  {fit && (
                    <>
                      {" "}
                      · corrélation <b>r = {fr(fit.r, 2)}</b> ({describeR(fit.r)})
                    </>
                  )}
                </p>
                {preset && <p className="text-[14px] text-current/65">{preset.note}</p>}
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
                <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-3 md:p-5">
                  <p className="mb-2 text-[13px] leading-relaxed text-current/70">
                    <b className="text-current">Comment lire :</b> un point = un joueur, couleur = son championnat. En
                    visage : les 12 meilleurs sur les deux axes à la fois. Pointillés = médianes de la sélection.
                    Survolez un point pour son nom, cliquez pour son profil.
                  </p>
                  <ExplorerScatter
                    points={points}
                    xKey={xKey}
                    yKey={yKey}
                    stars={stars}
                    photoFor={photoFor}
                    selected={selected}
                    onSelect={(slug) => set({ p: slug === selected ? null : slug })}
                    fit={fit}
                    showFit={showFit}
                  />
                </div>

                {/* Profil du joueur sélectionné */}
                <aside className="rounded-2xl border border-current/10 bg-current/[0.02] p-5">
                  {selPlayer ? (
                    <>
                      <div className="flex items-center gap-3">
                        <PlayerPhoto name={selPlayer.name} league={selPlayer.leagueLabel} size={56} />
                        <div className="min-w-0">
                          <p className="truncate text-lg font-extrabold leading-tight">{selPlayer.name}</p>
                          <p className="flex items-center gap-1.5 text-[12px] text-current/60">
                            <Crest team={selPlayer.team} league={selPlayer.leagueLabel} logo={logoFor(selPlayer.team)} size={16} sticker />
                            {selPlayer.team} · {selPlayer.position}
                          </p>
                          <p className="text-[12px] text-current/60">{selPlayer.minutes} minutes</p>
                        </div>
                      </div>
                      <p className="mt-4 font-mono text-[11px] uppercase tracking-wide text-current/50">
                        Percentiles face aux {selPlayer.position.toLowerCase()}s
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {PROFILE_KEYS.map((k) => {
                          const p = pct(selPlayer, k);
                          return (
                            <li key={k} className="text-[12px]">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`truncate ${k === xKey || k === yKey ? "font-bold" : "text-current/75"}`}>
                                  {METRIC[k].label.split(" (")[0]}
                                </span>
                                <span className="flex items-center gap-1.5">
                                  <span className="font-mono text-[11px] text-current/55">{formatMetric(k, METRIC[k].get(selPlayer.raw))}</span>
                                  <PctChip p={p} />
                                </span>
                              </div>
                              <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-current/10">
                                <div className="h-full rounded-full" style={{ width: `${p ?? 0}%`, background: pctColor(p) }} />
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                      <Link
                        to={`/joueurs/${selPlayer.slug}`}
                        className="mt-4 inline-block rounded-full bg-[#1a9a5b] px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-white"
                      >
                        Fiche complète →
                      </Link>
                    </>
                  ) : (
                    <div className="text-[14px] leading-relaxed text-current/70">
                      <p className="font-semibold text-current">Cliquez sur un joueur</p>
                      <p className="mt-2">
                        Son profil s&apos;affiche ici : chaque indicateur en <Term id="percentile">percentile</Term> face aux
                        joueurs de son poste (au moins {MIN_MINUTES} minutes), du rouge (bas) au vert (haut).
                      </p>
                    </div>
                  )}
                </aside>
              </div>

              {/* Classement */}
              <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#1a9a5b]">Classement de la sélection</p>
                  <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">Top 25 · {METRIC[tableKey].label}</h2>
                  <p className="mt-1 text-[13px] text-current/60">
                    Cliquez un en-tête pour trier. La pastille = percentile face au même poste.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportCSV}
                  className="rounded-full border border-current/25 px-4 py-2 text-[12px] font-bold uppercase tracking-wide hover:bg-current/5"
                >
                  Exporter la sélection ({filtered.length}) en CSV
                </button>
              </div>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-current/10">
                <table className="w-full min-w-[760px] text-[13px]">
                  <thead className="bg-current/[0.04] text-left text-[11px] uppercase tracking-wide text-current/60">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Joueur</th>
                      {tableCols.map((k) => (
                        <th key={k} className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => setSortKey(k)}
                            className={`text-left uppercase ${tableKey === k ? "font-bold text-[#1a9a5b]" : ""}`}
                          >
                            {METRIC[k].label.split(" (")[0]}
                            {tableKey === k ? " ↓" : ""}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((p, i) => (
                      <tr
                        key={p.slug}
                        onClick={() => set({ p: p.slug })}
                        className={`cursor-pointer border-t border-current/5 hover:bg-current/[0.03] ${selected === p.slug ? "bg-[#1a9a5b]/10" : ""}`}
                      >
                        <td className="px-3 py-2 font-mono text-current/50">{i + 1}</td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-2">
                            <Crest team={p.team} league={p.leagueLabel} logo={logoFor(p.team)} size={18} sticker />
                            <span className="font-semibold">{p.name}</span>
                            <span className="text-[11px] text-current/50">{p.position}</span>
                          </span>
                        </td>
                        {tableCols.map((k) => (
                          <td key={k} className="px-3 py-2">
                            <span className="flex items-center gap-2">
                              <span className="w-12 font-mono">{formatMetric(k, METRIC[k].get(p.raw))}</span>
                              <PctChip p={pct(p, k)} />
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[12px] text-current/55">
                Données : saison 2025-26 (Understat pour xG/xA/xGChain/xGBuildup, FBref pour minutes, tirs, tacles,
                interceptions et fautes). Les saisons passées seront ajoutées dès que les xG joueurs auront été collectés.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

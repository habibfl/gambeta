import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Crest from "../Crest";
import PlayerPhoto from "../PlayerPhoto";
import { METRIC, formatMetric } from "../../lib/metrics";
import { PLAYER_COLORS, PER90, GROUPS } from "../../lib/comparator";
import { leagueColor } from "../../lib/leagues";
import { fr } from "../story/hooks";


// Fiches d'identité des joueurs comparés
export function PlayerHeaders({ players, logoFor }) {
  return (
    <div className={`grid grid-cols-1 gap-4 ${players.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
      {players.map((p, i) => (
        <Link
          key={p.slug}
          to={`/joueurs/${p.slug}`}
          className="group flex items-center gap-4 rounded-2xl border-2 bg-current/[0.02] p-4 transition hover:bg-current/[0.04]"
          style={{ borderColor: `${PLAYER_COLORS[i]}66` }}
        >
          <div className="relative shrink-0">
            <PlayerPhoto name={p.name} league={p.leagueLabel} size={64} ring={false} />
            <span className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 shadow">
              <Crest team={p.team} league={p.leagueLabel} logo={logoFor(p.team)} size={22} />
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold group-hover:underline" style={{ color: PLAYER_COLORS[i] }}>
              {p.name}
            </p>
            <p className="truncate text-[13px] text-current/65">{p.team}</p>
            <p className="mt-1 flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wide text-current/50">
              <span className="h-2 w-2 rounded-full" style={{ background: leagueColor(p.leagueLabel) }} />
              {p.leagueLabel} · {p.position} · {p.minutes.toLocaleString("fr-FR")} min · {p.stats.matches} matchs
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

// Synthèse : indicateurs remportés et points forts de chaque joueur
export function Verdict({ players, data }) {
  const wins = players.map(() => 0);
  PER90.forEach((m) => {
    const vals = data.map((d) => d.values[m.key]);
    if (vals.some((v) => v == null)) return;
    const best = m.invert ? Math.min(...vals) : Math.max(...vals);
    if (vals.filter((v) => v === best).length > 1) return;
    wins[vals.indexOf(best)] += 1;
  });
  return (
    <div className={`grid grid-cols-1 gap-4 ${players.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
      {players.map((p, i) => {
        const top = PER90.filter((m) => data[i].pct[m.key] != null)
          .sort((a, b) => data[i].pct[b.key] - data[i].pct[a.key])
          .slice(0, 3);
        return (
          <div key={p.slug} className="rounded-2xl border border-current/10 bg-current/[0.02] p-5">
            <p className="font-mono text-[11px] uppercase tracking-wide" style={{ color: PLAYER_COLORS[i] }}>
              {p.name}
            </p>
            <p className="mt-2 text-3xl font-extrabold tabular-nums">
              {wins[i]}
              <span className="ml-1 text-sm font-semibold text-current/55">/ {PER90.length} indicateurs en tête</span>
            </p>
            <p className="mt-3 text-[13px] text-current/60">Points forts (percentile)</p>
            <ul className="mt-1 space-y-1 text-[13px]">
              {top.map((m) => (
                <li key={m.key} className="flex justify-between gap-3">
                  <span className="truncate">{m.label.replace(/ \(.*\)$/, "")}</span>
                  <b className="tabular-nums">{data[i].pct[m.key]}</b>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// Tous les indicateurs par 90 minutes : valeur + barre de percentile par joueur
export function PercentileMatrix({ players, data }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {GROUPS.map((g) => (
        <div key={g} className="rounded-2xl border border-current/10 bg-current/[0.02] p-4 md:p-5">
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[#e86f2c]">{g}</p>
          <div className="space-y-4">
            {PER90.filter((m) => m.group === g).map((m) => (
              <div key={m.key}>
                <p className="mb-1.5 text-[12.5px] font-semibold leading-snug">{m.label}</p>
                <div className="space-y-1">
                  {players.map((p, i) => {
                    const pc = data[i].pct[m.key];
                    return (
                      <div key={p.slug} className="flex items-center gap-2" title={`${p.name} : percentile ${pc ?? "–"}`}>
                        <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-current/[0.08]">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pc ?? 0}%`, background: PLAYER_COLORS[i] }} />
                        </div>
                        <span className="w-12 text-right font-mono text-[11px] tabular-nums">{formatMetric(m.key, data[i].values[m.key])}</span>
                        <span className="w-6 text-right font-mono text-[10px] text-current/45">{pc ?? "–"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Nuage : les joueurs comparés au milieu de tous les joueurs réguliers
const MAP_AXES = [
  { label: "Occasions et création", x: "npxg90", y: "xa90" },
  { label: "Finition", x: "npxg90", y: "goals90" },
  { label: "Volume et qualité de tir", x: "shots90", y: "xgPerShot" },
  { label: "Récupération", x: "tackles90", y: "inter90" },
  { label: "Construction", x: "buildup90", y: "chain90" },
];

export function MapAxesPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-current/50">Axes</span>
      {MAP_AXES.map((a, i) => (
        <button
          key={a.label}
          type="button"
          onClick={() => onChange(i)}
          className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
            value === i ? "border-[var(--gambeta-ink)] bg-[var(--gambeta-ink)] text-[var(--gambeta-paper)]" : "border-current/15 hover:border-current/40"
          }`}
        >
          {a.label}
        </button>
      ))}
    </div>
  );
}

export function PlayerMap({ players, allPlayers, minMinutes }) {
  const [axes, setAxes] = useState(0);
  const [hover, setHover] = useState(null);
  const { x: xk, y: yk } = MAP_AXES[axes];
  const W = 720;
  const H = 420;
  const m = { l: 52, r: 20, t: 16, b: 44 };
  const cloud = useMemo(
    () =>
      allPlayers
        .filter((p) => p.minutes >= minMinutes)
        .map((p) => ({ p, x: METRIC[xk].get(p.raw), y: METRIC[yk].get(p.raw) }))
        .filter((d) => d.x != null && d.y != null && Number.isFinite(d.x) && Number.isFinite(d.y)),
    [allPlayers, minMinutes, xk, yk]
  );
  const sel = players.map((p) => ({ p, x: METRIC[xk].get(p.raw), y: METRIC[yk].get(p.raw) }));
  const all = [...cloud, ...sel.filter((d) => d.x != null && d.y != null)];
  const q = (arr, t) => arr[Math.floor(t * (arr.length - 1))];
  const xs = all.map((d) => d.x).sort((a, b) => a - b);
  const ys = all.map((d) => d.y).sort((a, b) => a - b);
  const x0 = Math.min(xs[0] ?? 0, 0);
  const x1 = Math.max(q(xs, 0.995) ?? 1, ...sel.map((d) => d.x ?? 0)) * 1.05 || 1;
  const y0 = Math.min(ys[0] ?? 0, 0);
  const y1 = Math.max(q(ys, 0.995) ?? 1, ...sel.map((d) => d.y ?? 0)) * 1.05 || 1;
  const sx = (v) => m.l + ((Math.min(v, x1) - x0) / (x1 - x0)) * (W - m.l - m.r);
  const sy = (v) => H - m.b - ((Math.min(v, y1) - y0) / (y1 - y0)) * (H - m.t - m.b);
  const ticks = (a, b) => Array.from({ length: 5 }, (_, i) => a + ((b - a) * i) / 4);
  const medX = q(cloud.map((d) => d.x).sort((a, b) => a - b), 0.5);
  const medY = q(cloud.map((d) => d.y).sort((a, b) => a - b), 0.5);

  return (
    <div className="space-y-3">
      <MapAxesPicker value={axes} onChange={setAxes} />
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-[var(--gambeta-ink)]" onMouseLeave={() => setHover(null)}>
          {ticks(x0, x1).map((t) => (
            <g key={`x${t}`}>
              <line x1={sx(t)} x2={sx(t)} y1={m.t} y2={H - m.b} stroke="currentColor" strokeOpacity={0.06} />
              <text x={sx(t)} y={H - m.b + 16} textAnchor="middle" className="fill-current font-mono text-[10px] opacity-50">
                {fr(t, 2)}
              </text>
            </g>
          ))}
          {ticks(y0, y1).map((t) => (
            <g key={`y${t}`}>
              <line x1={m.l} x2={W - m.r} y1={sy(t)} y2={sy(t)} stroke="currentColor" strokeOpacity={0.06} />
              <text x={m.l - 8} y={sy(t)} dy="0.32em" textAnchor="end" className="fill-current font-mono text-[10px] opacity-50">
                {fr(t, 2)}
              </text>
            </g>
          ))}
          {medX != null && <line x1={sx(medX)} x2={sx(medX)} y1={m.t} y2={H - m.b} stroke="currentColor" strokeOpacity={0.3} strokeDasharray="4 4" />}
          {medY != null && <line x1={m.l} x2={W - m.r} y1={sy(medY)} y2={sy(medY)} stroke="currentColor" strokeOpacity={0.3} strokeDasharray="4 4" />}
          {cloud.map((d) => (
            <circle
              key={d.p.slug + d.p.team}
              cx={sx(d.x)}
              cy={sy(d.y)}
              r={3}
              fill="currentColor"
              fillOpacity={0.14}
              onMouseEnter={() => setHover(d)}
            />
          ))}
          {sel.map((d, i) =>
            d.x == null || d.y == null ? null : (
              <g key={d.p.slug} onMouseEnter={() => setHover(d)}>
                <circle cx={sx(d.x)} cy={sy(d.y)} r={9} fill={PLAYER_COLORS[i]} stroke="var(--gambeta-paper)" strokeWidth={2} />
                <text x={sx(d.x) + 13} y={sy(d.y)} dy="0.32em" className="text-[12px] font-bold" fill={PLAYER_COLORS[i]}>
                  {d.p.name}
                </text>
              </g>
            )
          )}
          <text x={(W + m.l) / 2} y={H - 6} textAnchor="middle" className="fill-current font-mono text-[11px] opacity-60">
            {METRIC[xk].label} →
          </text>
          <text transform={`translate(13 ${(H - m.b) / 2}) rotate(-90)`} textAnchor="middle" className="fill-current font-mono text-[11px] opacity-60">
            ↑ {METRIC[yk].label}
          </text>
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute rounded-lg border border-current/15 bg-[var(--gambeta-paper)] px-3 py-2 text-[12px] shadow-lg"
            style={{ left: `${(sx(hover.x) / W) * 100}%`, top: `${(sy(hover.y) / H) * 100}%`, transform: "translate(10px, -110%)" }}
          >
            <b>{hover.p.name}</b> · {hover.p.team}
            <br />
            {formatMetric(xk, hover.x)} · {formatMetric(yk, hover.y)}
          </div>
        )}
      </div>
      <p className="text-[12px] text-current/55">
        {cloud.length.toLocaleString("fr-FR")} joueurs avec au moins {minMinutes} minutes, en gris. Pointillés : médianes.
      </p>
    </div>
  );
}

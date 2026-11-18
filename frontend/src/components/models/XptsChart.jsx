import { useState } from "react";
import Crest from "../Crest";
import { fr } from "../story/hooks";

const UP = "#1a9a5b";
const DOWN = "#d64545";

// Points attendus (avant match) contre points réels : un segment par club, trié par écart
export default function XptsChart({ rows, league, logoFor }) {
  const [hover, setHover] = useState(null);
  const data = [...rows].sort((a, b) => b.diff - a.diff);
  const W = 720;
  const rowH = 24;
  const m = { l: 170, r: 70, t: 28, b: 30 };
  const H = m.t + m.b + data.length * rowH;
  const max = Math.max(...data.map((d) => Math.max(d.xpts, d.pts))) * 1.05;
  const sx = (v) => m.l + (v / max) * (W - m.l - m.r);
  const ticks = [0, 20, 40, 60, 80, 100].filter((t) => t <= max);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-[var(--gambeta-ink)]" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={sx(t)} x2={sx(t)} y1={m.t - 6} y2={H - m.b} stroke="currentColor" strokeOpacity={0.07} />
            <text x={sx(t)} y={H - m.b + 16} textAnchor="middle" className="fill-current font-mono text-[10px] opacity-50">
              {t}
            </text>
          </g>
        ))}
        <text x={sx(0)} y={14} className="fill-current font-mono text-[10px] opacity-55">
          ○ points attendus · ● points réels
        </text>
        {data.map((d, i) => {
          const y = m.t + i * rowH + rowH / 2;
          const c = d.diff >= 0 ? UP : DOWN;
          return (
            <g key={d.team} onMouseEnter={() => setHover({ d, y })}>
              <rect x={0} y={y - rowH / 2} width={W} height={rowH} fill="transparent" />
              <text x={m.l - 34} y={y} dy="0.32em" textAnchor="end" className="fill-current text-[11.5px]">
                {d.team}
              </text>
              <line x1={sx(d.xpts)} x2={sx(d.pts)} y1={y} y2={y} stroke={c} strokeWidth={3} strokeOpacity={0.55} />
              <circle cx={sx(d.xpts)} cy={y} r={5} fill="var(--gambeta-paper)" stroke="currentColor" strokeOpacity={0.6} strokeWidth={1.5} />
              <circle cx={sx(d.pts)} cy={y} r={5} fill={c} />
              <text x={W - 6} y={y} dy="0.32em" textAnchor="end" className="font-mono text-[11px] font-bold" fill={c}>
                {d.diff > 0 ? "+" : ""}
                {fr(d.diff, 1)}
              </text>
            </g>
          );
        })}
        <text x={(W + m.l - m.r) / 2} y={H - 4} textAnchor="middle" className="fill-current font-mono text-[11px] opacity-60">
          Points sur la saison →
        </text>
      </svg>
      {data.map((d, i) => (
        <span
          key={d.team}
          className="pointer-events-none absolute"
          style={{ left: `${((m.l - 26) / W) * 100}%`, top: `${((m.t + i * rowH + rowH / 2) / H) * 100}%`, transform: "translate(0,-50%)" }}
        >
          <Crest team={d.team} league={league} logo={logoFor(d.team)} size={16} />
        </span>
      ))}
      {hover && (
        <div
          className="pointer-events-none absolute rounded-lg border border-current/15 bg-[var(--gambeta-paper)] px-3 py-2 text-[12px] shadow-lg"
          style={{ left: "55%", top: `${(hover.y / H) * 100}%`, transform: "translate(0, -120%)" }}
        >
          <b>{hover.d.team}</b> : {hover.d.pts} points pour {fr(hover.d.xpts, 1)} attendus sur {hover.d.n} matchs
        </div>
      )}
    </div>
  );
}

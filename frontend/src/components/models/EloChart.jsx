import { useMemo, useState } from "react";
import * as d3 from "d3";
import Crest from "../Crest";
import { useSize } from "../story/hooks";
import { seasonLabel } from "../../lib/leagues";
import { TEAM_COLORS } from "../../lib/teamColors";

const H = 440;
const M = { top: 16, right: 150, bottom: 36, left: 48 };

// Courbes Elo : la force de chaque club sélectionné, match après match.
export default function EloChart({ series, teams, range, seasonStarts, baseDate, league, logoFor }) {
  const [ref, { width }] = useSize();
  const [hoverDay, setHoverDay] = useState(null);
  const base = useMemo(() => new Date(baseDate), [baseDate]);
  const dateOf = (d) => new Date(base.getTime() + d * 86400000);

  const data = useMemo(
    () =>
      teams
        .filter((t) => series[t])
        .map((t) => ({ team: t, pts: series[t].filter(([d]) => d >= range[0] && d <= range[1]) }))
        .filter((s) => s.pts.length),
    [teams, series, range]
  );

  const scales = useMemo(() => {
    if (!width || !data.length) return null;
    const all = data.flatMap((s) => s.pts.map((p) => p[1]));
    const x = d3.scaleLinear().domain(range).range([M.left, width - M.right]);
    const y = d3.scaleLinear().domain([d3.min(all) - 20, d3.max(all) + 20]).nice().range([H - M.bottom, M.top]);
    return { x, y };
  }, [data, width, range]);

  const line = scales ? d3.line().x((p) => scales.x(p[0])).y((p) => scales.y(p[1])).curve(d3.curveStepAfter) : null;
  const valueAt = (pts, day) => {
    let v = null;
    for (const p of pts) {
      if (p[0] <= day) v = p[1];
      else break;
    }
    return v;
  };
  // Étiquettes de fin de courbe, écartées verticalement si elles se touchent
  const ends = scales
    ? data
        .map((s, i) => ({ ...s, i, y: scales.y(s.pts[s.pts.length - 1][1]), x: scales.x(s.pts[s.pts.length - 1][0]) }))
        .sort((a, b) => a.y - b.y)
        .reduce((acc, e) => {
          const prev = acc[acc.length - 1];
          acc.push({ ...e, ly: prev ? Math.max(e.y, prev.ly + 22) : e.y });
          return acc;
        }, [])
    : [];

  return (
    <div ref={ref} className="relative w-full" style={{ height: H }}>
      {scales && (
        <svg
          width={width}
          height={H}
          className="overflow-visible"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const day = scales.x.invert(e.clientX - r.left);
            setHoverDay(day >= range[0] && day <= range[1] ? day : null);
          }}
          onMouseLeave={() => setHoverDay(null)}
        >
          {scales.y.ticks(6).map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={scales.y(t)} y2={scales.y(t)} stroke="currentColor" strokeOpacity={0.07} />
              <text x={M.left - 8} y={scales.y(t)} dy="0.32em" textAnchor="end" className="fill-current font-mono text-[11px] opacity-50">
                {t}
              </text>
            </g>
          ))}
          {/* Débuts de saison */}
          {seasonStarts
            .filter((s) => s.day >= range[0] && s.day <= range[1])
            .map((s) => (
              <g key={s.season}>
                <line x1={scales.x(s.day)} x2={scales.x(s.day)} y1={M.top} y2={H - M.bottom} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 4" />
                <text x={scales.x(s.day) + 4} y={H - M.bottom + 18} className="fill-current font-mono text-[11px] opacity-55">
                  {seasonLabel(s.season)}
                </text>
              </g>
            ))}
          <line x1={M.left} x2={width - M.right} y1={scales.y(1500)} y2={scales.y(1500)} stroke="currentColor" strokeOpacity={0.3} />
          <text x={M.left + 4} y={scales.y(1500) - 5} className="fill-current text-[10px] opacity-55">
            1500 = niveau moyen
          </text>
          {data.map((s) => (
            <path
              key={s.team}
              d={line(s.pts)}
              fill="none"
              stroke={TEAM_COLORS[teams.indexOf(s.team) % TEAM_COLORS.length]}
              strokeWidth={2.2}
              strokeLinejoin="round"
            />
          ))}
          {hoverDay != null && (
            <line x1={scales.x(hoverDay)} x2={scales.x(hoverDay)} y1={M.top} y2={H - M.bottom} stroke="currentColor" strokeOpacity={0.4} />
          )}
        </svg>
      )}
      {/* Écussons + nom au bout des courbes */}
      {ends.map((e) => (
        <div key={e.team} className="pointer-events-none absolute flex items-center gap-1.5" style={{ left: e.x + 6, top: e.ly - 11 }}>
          <Crest team={e.team} league={league} logo={logoFor(e.team)} size={22} sticker />
          <span className="whitespace-nowrap text-[11px] font-bold" style={{ color: TEAM_COLORS[teams.indexOf(e.team) % TEAM_COLORS.length] }}>
            {e.team} {e.pts[e.pts.length - 1][1]}
          </span>
        </div>
      ))}
      {hoverDay != null && scales && (
        <div
          className="pointer-events-none absolute z-20 w-52 rounded-xl bg-[#07160f] p-3 text-xs text-white shadow-xl"
          style={{ left: Math.min(scales.x(hoverDay) + 12, width - 215), top: M.top }}
        >
          <div className="mb-1 font-mono text-[11px] text-white/60">{dateOf(hoverDay).toLocaleDateString("fr-FR")}</div>
          {data
            .map((s) => ({ team: s.team, v: valueAt(s.pts, hoverDay) }))
            .filter((s) => s.v != null)
            .sort((a, b) => b.v - a.v)
            .map((s) => (
              <div key={s.team} className="flex justify-between gap-2">
                <span style={{ color: TEAM_COLORS[teams.indexOf(s.team) % TEAM_COLORS.length] }}>{s.team}</span>
                <span className="font-mono">{s.v}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

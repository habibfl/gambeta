import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as d3 from "d3";
import Crest from "../Crest";
import { useSize } from "../story/hooks";
import { seasonLabel } from "../../lib/leagues";

const COLORS = { V: "#1a9a5b", N: "#b9b2a6", D: "#d64545" };
const PTS = { V: 3, N: 1, D: 0 };

// Calendrier des résultats : une case par journée (vert = victoire, gris = nul, rouge = défaite)
export function ResultsCalendar({ matches, league, logoFor }) {
  const navigate = useNavigate();
  const [hover, setHover] = useState(null);
  const seasons = [...new Set(matches.map((m) => m.season))];
  const maxWeek = Math.max(...matches.map((m) => m.week));
  return (
    <div className="relative">
      <div className="space-y-1.5">
        {seasons.map((s) => {
          const ms = matches.filter((m) => m.season === s);
          const byWeek = Object.fromEntries(ms.map((m) => [m.week, m]));
          const w = ms.filter((m) => m.result === "V").length;
          const d = ms.filter((m) => m.result === "N").length;
          const pts = 3 * w + d;
          return (
            <div key={s} className="flex items-center gap-2">
              <span className="w-16 shrink-0 font-mono text-[11px] text-current/60">{seasonLabel(s)}</span>
              <div className="grid flex-1 gap-[3px]" style={{ gridTemplateColumns: `repeat(${maxWeek}, minmax(0,1fr))` }}>
                {Array.from({ length: maxWeek }, (_, i) => {
                  const m = byWeek[i + 1];
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!m}
                      onMouseEnter={() => m && setHover(m)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => m?.opponent_slug && navigate(`/equipes/${m.opponent_slug}`)}
                      className="aspect-square rounded-[3px] transition-transform hover:scale-125"
                      style={{ background: m ? COLORS[m.result] : "rgba(128,128,128,.08)", opacity: m ? (m.home ? 1 : 0.75) : 1 }}
                      aria-label={m ? `J${m.week} ${m.home ? "contre" : "chez"} ${m.opponent} : ${m.gf}-${m.ga}` : "pas de match"}
                    />
                  );
                })}
              </div>
              <span className="w-32 shrink-0 whitespace-nowrap text-right font-mono text-[11px] text-current/60">
                {w}V {d}N · <b className="text-current">{pts} pts</b>
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[12px] text-current/60">
        {Object.entries({ V: "Victoire", N: "Nul", D: "Défaite" }).map(([k, label]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-[3px]" style={{ background: COLORS[k] }} /> {label}
          </span>
        ))}
        <span>Case plus pâle = match à l&apos;extérieur · clic = fiche de l&apos;adversaire</span>
      </div>
      {hover && (
        <div className="pointer-events-none absolute right-0 top-0 z-20 flex items-center gap-3 rounded-xl bg-[#07160f] px-3 py-2 text-xs text-white shadow-xl">
          <Crest team={hover.opponent} league={league} logo={logoFor(hover.opponent)} size={26} sticker />
          <div>
            <div className="font-bold">
              J{hover.week} · {hover.home ? "contre" : "chez"} {hover.opponent}
            </div>
            <div className="font-mono text-white/70">
              {hover.gf}-{hover.ga} ({hover.result === "V" ? "victoire" : hover.result === "N" ? "nul" : "défaite"}) ·{" "}
              {hover.date ? new Date(hover.date).toLocaleDateString("fr-FR") : ""}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Forme glissante : points par match sur les 5 derniers matchs, au fil des journées.
export function RollingForm({ matches, window = 5 }) {
  const [ref, { width }] = useSize();
  const H = 220;
  const M = { top: 14, right: 16, bottom: 28, left: 34 };
  const pts = useMemo(
    () =>
      matches.map((m, i) => {
        const slice = matches.slice(Math.max(0, i - window + 1), i + 1);
        return { i, season: m.season, v: slice.reduce((s, x) => s + PTS[x.result], 0) / slice.length, full: slice.length === window };
      }),
    [matches, window]
  );
  const avg = matches.reduce((s, m) => s + PTS[m.result], 0) / Math.max(matches.length, 1);
  if (!width) return <div ref={ref} style={{ height: H }} />;
  const x = d3.scaleLinear().domain([0, Math.max(pts.length - 1, 1)]).range([M.left, width - M.right]);
  const y = d3.scaleLinear().domain([0, 3]).range([H - M.bottom, M.top]);
  const line = d3.line().x((d) => x(d.i)).y((d) => y(d.v)).curve(d3.curveMonotoneX);
  const area = d3.area().x((d) => x(d.i)).y0(y(avg)).y1((d) => y(d.v)).curve(d3.curveMonotoneX);
  const starts = pts.filter((p, i) => i === 0 || pts[i - 1].season !== p.season);
  return (
    <div ref={ref} className="w-full">
      <svg width={width} height={H} className="overflow-visible">
        <defs>
          <clipPath id="above">
            <rect x={0} y={0} width={width} height={y(avg)} />
          </clipPath>
          <clipPath id="below">
            <rect x={0} y={y(avg)} width={width} height={H} />
          </clipPath>
        </defs>
        {[0, 1, 2, 3].map((t) => (
          <g key={t}>
            <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} stroke="currentColor" strokeOpacity={0.07} />
            <text x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-current font-mono text-[10px] opacity-50">
              {t}
            </text>
          </g>
        ))}
        {starts.map((s) => (
          <g key={s.season}>
            <line x1={x(s.i)} x2={x(s.i)} y1={M.top} y2={H - M.bottom} stroke="currentColor" strokeOpacity={0.15} strokeDasharray="3 4" />
            <text x={x(s.i) + 4} y={H - 8} className="fill-current font-mono text-[10px] opacity-55">
              {seasonLabel(s.season)}
            </text>
          </g>
        ))}
        <path d={area(pts)} fill="#1a9a5b" fillOpacity={0.18} clipPath="url(#above)" />
        <path d={area(pts)} fill="#d64545" fillOpacity={0.18} clipPath="url(#below)" />
        <line x1={M.left} x2={width - M.right} y1={y(avg)} y2={y(avg)} stroke="currentColor" strokeOpacity={0.5} strokeDasharray="5 4" />
        <text x={width - M.right} y={y(avg) - 5} textAnchor="end" className="fill-current text-[10px] opacity-60">
          moyenne {avg.toFixed(2).replace(".", ",")} pt/match
        </text>
        <path d={line(pts)} fill="none" stroke="currentColor" strokeWidth={1.8} />
      </svg>
    </div>
  );
}

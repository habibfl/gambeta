import { useMemo, useState } from "react";
import * as d3 from "d3";
import { useSize } from "../story/hooks";
import { LEAGUE_COLORS } from "../../lib/leagues";
import { METRIC, formatMetric } from "../../lib/metrics";

const H = 520;
const M = { top: 20, right: 24, bottom: 46, left: 56 };

// Nuage de points de l'explorateur : chaque point = un joueur (couleur de son championnat)
export default function ExplorerScatter({ points, xKey, yKey, stars, photoFor, selected, onSelect, fit, showFit }) {
  const [ref, { width }] = useSize();
  const [hover, setHover] = useState(null);

  const scales = useMemo(() => {
    if (!width || !points.length) return null;
    const xs = points.map((d) => d.x);
    const ys = points.map((d) => d.y);
    const pad = (lo, hi) => [lo - (hi - lo) * 0.04, hi + (hi - lo) * 0.06];
    const x = d3.scaleLinear().domain(pad(d3.min(xs), d3.max(xs))).nice().range([M.left, width - M.right]);
    const y = d3.scaleLinear().domain(pad(d3.min(ys), d3.max(ys))).nice().range([H - M.bottom, M.top]);
    return { x, y, mx: d3.median(xs), my: d3.median(ys) };
  }, [points, width]);

  const starSet = new Set(stars.map((s) => s.p.slug));
  const faceR = width < 600 ? 12 : 15;

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height: H }}>
      {scales && (
        <>
          <svg width={width} height={H} className="absolute inset-0 overflow-visible">
            {/* Grille + axes */}
            {scales.y.ticks(6).map((t) => (
              <g key={`gy${t}`}>
                <line x1={M.left} x2={width - M.right} y1={scales.y(t)} y2={scales.y(t)} stroke="currentColor" strokeOpacity={0.07} />
                <text x={M.left - 8} y={scales.y(t)} dy="0.32em" textAnchor="end" className="fill-current font-mono text-[11px] opacity-50">
                  {formatMetric(yKey, t).replace(" %", "")}
                </text>
              </g>
            ))}
            {scales.x.ticks(7).map((t) => (
              <text key={`gx${t}`} x={scales.x(t)} y={H - M.bottom + 18} textAnchor="middle" className="fill-current font-mono text-[11px] opacity-50">
                {formatMetric(xKey, t).replace(" %", "")}
              </text>
            ))}
            <text x={width - M.right} y={H - 8} textAnchor="end" className="fill-current text-[12px] font-semibold opacity-70">
              {METRIC[xKey].label} →
            </text>
            <text x={M.left} y={M.top - 6} className="fill-current text-[12px] font-semibold opacity-70">
              ↑ {METRIC[yKey].label}
            </text>

            {/* Médianes */}
            <line x1={scales.x(scales.mx)} x2={scales.x(scales.mx)} y1={M.top} y2={H - M.bottom} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="4 4" />
            <line x1={M.left} x2={width - M.right} y1={scales.y(scales.my)} y2={scales.y(scales.my)} stroke="currentColor" strokeOpacity={0.25} strokeDasharray="4 4" />
            <text x={width - M.right - 4} y={M.top + 14} textAnchor="end" className="fill-[#e86f2c] text-[10px] font-bold uppercase tracking-wide">
              Au-dessus des médianes sur les deux axes
            </text>

            {/* Droite de régression */}
            {showFit && fit && (
              <line
                x1={scales.x(scales.x.domain()[0])}
                x2={scales.x(scales.x.domain()[1])}
                y1={scales.y(fit.intercept + fit.slope * scales.x.domain()[0])}
                y2={scales.y(fit.intercept + fit.slope * scales.x.domain()[1])}
                stroke="#e86f2c"
                strokeWidth={2}
                strokeOpacity={0.8}
              />
            )}

            {/* Tous les joueurs filtrés */}
            {points.map((d) =>
              starSet.has(d.p.slug) ? null : (
                <circle
                  key={d.p.slug}
                  cx={scales.x(d.x)}
                  cy={scales.y(d.y)}
                  r={selected === d.p.slug ? 7 : 4}
                  fill={LEAGUE_COLORS[d.p.leagueLabel] ?? "#888"}
                  fillOpacity={selected && selected !== d.p.slug ? 0.35 : 0.65}
                  stroke={selected === d.p.slug ? "var(--gambeta-ink)" : "none"}
                  strokeWidth={2}
                  className="cursor-pointer"
                  onMouseEnter={() => setHover(d)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onSelect(d.p.slug)}
                />
              )
            )}
          </svg>

          {/* Les joueurs remarquables : leur visage */}
          {stars.map((d) => {
            const photo = photoFor(d.p.name);
            const cx = scales.x(d.x);
            const cy = scales.y(d.y);
            const sel = selected === d.p.slug;
            return (
              <button
                key={`f-${d.p.slug}`}
                type="button"
                onClick={() => onSelect(d.p.slug)}
                onMouseEnter={() => setHover(d)}
                onMouseLeave={() => setHover(null)}
                className="absolute flex items-center justify-center overflow-hidden rounded-full text-[10px] font-extrabold text-white transition-transform hover:z-30 hover:scale-125"
                style={{
                  left: cx - faceR,
                  top: cy - faceR,
                  width: faceR * 2,
                  height: faceR * 2,
                  zIndex: sel ? 25 : 10,
                  background: LEAGUE_COLORS[d.p.leagueLabel] ?? "#888",
                  boxShadow: `0 0 0 2px #fff, 0 0 0 ${sel ? 5 : 3.5}px ${sel ? "var(--gambeta-ink)" : LEAGUE_COLORS[d.p.leagueLabel] ?? "#888"}, 0 2px 6px rgba(0,0,0,.3)`,
                }}
                aria-label={d.p.name}
              >
                {photo ? (
                  <img src={photo} alt="" className="h-full w-full object-cover object-top" />
                ) : (
                  d.p.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                )}
              </button>
            );
          })}
          {/* Nom des visages (masqué s'il chevauche un nom déjà placé) */}
          {(() => {
            const placed = [];
            return stars.map((d) => {
              const cx = scales.x(d.x);
              const cy = scales.y(d.y);
              const right = cx < width * 0.8;
              const name = d.p.name.split(" ").slice(-1)[0];
              const w = name.length * 6.5 + 6;
              const x0 = right ? cx + faceR + 5 : cx - faceR - 5 - w;
              const box = { x0, x1: x0 + w, y0: cy - 8, y1: cy + 8 };
              const hit = placed.some((b) => box.x0 < b.x1 && b.x0 < box.x1 && box.y0 < b.y1 && b.y0 < box.y1);
              if (hit && selected !== d.p.slug) return null;
              placed.push(box);
              return (
                <span
                  key={`l-${d.p.slug}`}
                  className="pointer-events-none absolute z-20 whitespace-nowrap text-[11px] font-bold"
                  style={{
                    top: cy - 8,
                    left: x0,
                    textShadow: "0 0 3px var(--gambeta-paper), 0 0 3px var(--gambeta-paper), 0 0 3px var(--gambeta-paper)",
                  }}
                >
                  {name}
                </span>
              );
            });
          })()}
          {hover && (
            <div
              className="pointer-events-none absolute z-40 w-56 rounded-xl bg-[#07160f] p-3 text-xs text-white shadow-xl"
              style={{
                left: Math.min(scales.x(hover.x) + 16, width - 230),
                top: Math.max(scales.y(hover.y) - 110, 0),
              }}
            >
              <div className="font-bold">{hover.p.name}</div>
              <div className="text-[11px] text-white/60">
                {hover.p.team} · {hover.p.position} · {hover.p.minutes} min
              </div>
              <div className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 font-mono text-[11px]">
                <span className="text-white/70">{METRIC[xKey].label}</span>
                <span>{formatMetric(xKey, hover.x)}</span>
                <span className="text-white/70">{METRIC[yKey].label}</span>
                <span>{formatMetric(yKey, hover.y)}</span>
              </div>
              <div className="mt-2 text-[10px] text-white/50">Cliquer pour voir son profil</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

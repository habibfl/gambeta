import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import Crest from "../Crest";
import { useSize, fr } from "./hooks";
import { seasonLabel } from "../../lib/leagues";

const LUCKY = "#e86f2c";
const UNLUCKY = "#2a6fd6";

// Légende affichée au-dessus du graphique, selon l'étape en cours.
const LEGENDS = [
  [{ dot: "currentColor", label: "1 point = 1 équipe sur 1 saison (2021-22 à 2025-26)" }],
  [
    { dot: "currentColor", label: "1 point = 1 équipe-saison" },
    { line: true, label: "points attendus d'après la différence de buts" },
  ],
  [
    { crest: true, label: "club (période choisie)" },
    { ring: LUCKY, label: "plus de points que prévu" },
    { ring: UNLUCKY, label: "moins que prévu" },
  ],
  [
    { crest: true, label: "club, saison choisie" },
    { line: true, label: "points attendus" },
  ],
];

// Nuage de points « points par match vs différence de buts par match » qui évolue au fil du scroll
export default function LuckScatter({ model, steps, period, league = null, logoFor }) {
  const [active, setActive] = useState(0);
  // Mises en avant de la saison choisie : les 2 plus chanceux, les 2 plus malchanceux
  const { highlights, ceilingTeam } = useMemo(() => {
    const st = model.teams.filter((t) => period.includes(t.season) && (!league || t.league === league));
    const ceiling = st.reduce((a, b) => (b.gd_pm > a.gd_pm ? b : a), st[0]);
    const sorted = [...st].sort((a, b) => b.delta - a.delta);
    const rest = sorted.filter((t) => t !== ceiling);
    return {
      highlights: [...rest.slice(0, 2), ...rest.slice(-2)].map((t) => `${t.league}|${t.team}|${t.season}`),
      ceilingTeam: ceiling ? `${ceiling.league}|${ceiling.team}|${ceiling.season}` : null,
    };
  }, [model.teams, period, league]);
  const stepRefs = useRef([]);
  const [chartRef, { width, height }] = useSize();
  const [hover, setHover] = useState(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.dataset.step));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    stepRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const m = { top: 24, right: 20, bottom: 44, left: 44 };
  const scales = useMemo(() => {
    if (!width || !height) return null;
    const x = d3.scaleLinear().domain([-2.2, 2.8]).range([m.left, width - m.right]);
    const y = d3.scaleLinear().domain([0, 3]).range([height - m.bottom, m.top]);
    return { x, y };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  const current = (t) => period.includes(t.season);
  const id = (t) => `${t.league}|${t.team}|${t.season}`;
  const inLeague = (t) => !league || t.league === league;
  const isHighlight = (t) => current(t) && highlights.includes(id(t));
  const isCeiling = (t) => current(t) && id(t) === ceilingTeam;
  const line = (gd) => model.intercept + model.slope * gd;
  const showCrests = active >= 2;
  const crestTeams0 = model.teams.filter((t) => period.includes(t.season));
  const crestSize = width < 500 || crestTeams0.length > 150 ? 15 : 22;

  function dotStyle(t) {
    const dim = inLeague(t) ? 1 : 0.15;
    if (showCrests && current(t)) return { fill: "currentColor", opacity: 0, r: 0 };
    if (active === 0) return { fill: "currentColor", opacity: 0.35 * dim, r: 3.5 };
    if (active === 1) return { fill: "currentColor", opacity: 0.25 * dim, r: 3.5 };
    return { fill: "currentColor", opacity: 0.08 * dim, r: 3 };
  }

  function crestStyle(t) {
    if (!showCrests || !inLeague(t)) return { opacity: 0, scale: 0.3 };
    if (active === 3) return isCeiling(t) ? { opacity: 1, scale: 1.6 } : { opacity: 0.3, scale: 0.85 };
    return { opacity: 1, scale: isHighlight(t) ? 1.35 : 1 };
  }

  const labelled = model.teams.filter(
    (t) => inLeague(t) && ((active === 2 && isHighlight(t)) || (active === 3 && isCeiling(t)))
  );
  const crestTeams = crestTeams0;

  return (
    <div className="relative">
      {/* Graphique fixe */}
      <div className="sticky top-[calc(var(--nav-offset)+74px)] transition-[top] duration-300 flex h-[calc(100vh-170px)] flex-col md:pl-[38%]">
        {/* Légende de l'étape (les filtres sont en haut de la page) */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-2">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-current/70">
            {LEGENDS[active].map((item) => (
              <li key={item.label} className="flex items-center gap-1.5">
                {item.dot && <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.dot, opacity: item.dot === "currentColor" ? 0.5 : 1 }} />}
                {item.line && <span className="h-0.5 w-5 rounded bg-current" />}
                {item.ring && <span className="h-3.5 w-3.5 rounded-full bg-white" style={{ boxShadow: `0 0 0 2.5px ${item.ring}` }} />}
                {item.crest && <span className="h-3.5 w-3.5 rounded-full bg-white shadow ring-1 ring-black/10" />}
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <div ref={chartRef} className="relative min-h-0 w-full flex-1">
          {scales && (
            <svg width={width} height={height} className="overflow-visible">
              {/* Grille */}
              {scales.y.ticks(6).map((t) => (
                <g key={`y${t}`}>
                  <line x1={m.left} x2={width - m.right} y1={scales.y(t)} y2={scales.y(t)} stroke="currentColor" strokeOpacity={0.08} />
                  <text x={m.left - 8} y={scales.y(t)} dy="0.32em" textAnchor="end" className="fill-current font-mono text-[11px] opacity-50">
                    {fr(t, 1)}
                  </text>
                </g>
              ))}
              {scales.x.ticks(6).map((t) => (
                <text key={`x${t}`} x={scales.x(t)} y={height - m.bottom + 18} textAnchor="middle" className="fill-current font-mono text-[11px] opacity-50">
                  {t > 0 ? `+${fr(t, 1)}` : fr(t, 1)}
                </text>
              ))}
              <text x={width - m.right} y={height - 6} textAnchor="end" className="fill-current font-mono text-[11px] uppercase tracking-wide opacity-60">
                Différence de buts par match →
              </text>
              <text x={m.left} y={m.top - 10} className="fill-current font-mono text-[11px] uppercase tracking-wide opacity-60">
                ↑ Points par match
              </text>

              {/* Résidus des équipes mises en avant */}
              {labelled.map((t) => (
                <line
                  key={`res-${t.team}`}
                  x1={scales.x(t.gd_pm)}
                  x2={scales.x(t.gd_pm)}
                  y1={scales.y(t.pts_pm)}
                  y2={scales.y(line(t.gd_pm))}
                  stroke={t.delta >= 0 ? LUCKY : UNLUCKY}
                  strokeWidth={2.5}
                  strokeDasharray="4 3"
                />
              ))}

              {/* Points (toutes les saisons) */}
              {model.teams.map((t) => {
                const s = dotStyle(t);
                return (
                  <circle
                    key={`${t.league}-${t.season}-${t.team}`}
                    cx={scales.x(t.gd_pm)}
                    cy={scales.y(t.pts_pm)}
                    r={s.r}
                    fill={s.fill}
                    fillOpacity={s.opacity}
                    className="cursor-pointer transition-all duration-700 motion-reduce:transition-none"
                    onMouseEnter={() => setHover(t)}
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}

              {/* Droite de régression */}
              <line
                x1={scales.x(-2.2)}
                x2={scales.x(2.8)}
                y1={scales.y(line(-2.2))}
                y2={scales.y(line(2.8))}
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={active >= 1 ? 0 : 1}
                className="pointer-events-none transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
              />
              {active >= 1 && (
                <text x={m.left + 10} y={m.top + 18} className="fill-current text-[13px] font-bold">
                  Droite : R² = {fr(model.r2, 2)}
                </text>
              )}
            </svg>
          )}

          {/* Écussons-autocollants des clubs 2025-26 */}
          {scales &&
            crestTeams.map((t) => {
              const s = crestStyle(t);
              return (
                <button
                  key={`crest-${t.league}-${t.team}-${t.season}`}
                  type="button"
                  tabIndex={s.opacity ? 0 : -1}
                  className="absolute rounded-full transition-all duration-700 hover:z-30 motion-reduce:transition-none"
                  style={{
                    left: scales.x(t.gd_pm) - crestSize / 2,
                    top: scales.y(t.pts_pm) - crestSize / 2,
                    opacity: s.opacity,
                    transform: `scale(${s.scale})`,
                    pointerEvents: s.opacity ? "auto" : "none",
                    // Anneau orange / bleu : au-dessus ou en dessous de la droite
                    boxShadow: active === 2 ? `0 0 0 ${2.5}px ${t.delta >= 0 ? LUCKY : UNLUCKY}` : "none",
                    zIndex: isHighlight(t) || isCeiling(t) ? 20 : 10,
                  }}
                  onMouseEnter={() => setHover(t)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(t)}
                  onBlur={() => setHover(null)}
                  aria-label={t.team}
                >
                  <Crest team={t.team} league={t.league} logo={logoFor(t.team)} size={crestSize} sticker />
                </button>
              );
            })}

          {/* Étiquettes des clubs mis en avant (écartées si elles se chevauchent) */}
          {scales &&
            (() => {
              const items = labelled
                .map((t) => {
                  const cx = scales.x(t.gd_pm);
                  return { t, cx, cy: scales.y(t.pts_pm), right: cx < width * 0.6 };
                })
                .sort((a, b) => a.cy - b.cy);
              [true, false].forEach((side) => {
                let last = -Infinity;
                items
                  .filter((it) => it.right === side)
                  .forEach((it) => {
                    it.ly = Math.max(it.cy, last + 26);
                    last = it.ly;
                  });
              });
              return items.map(({ t, cx, ly, right }) => (
                <span
                  key={`lab-${t.league}-${t.team}`}
                  className="pointer-events-none absolute z-30 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-bold text-white shadow"
                  style={{
                    top: ly - 11,
                    left: right ? cx + crestSize : undefined,
                    right: right ? undefined : width - cx + crestSize,
                    background: t.delta >= 0 ? LUCKY : UNLUCKY,
                  }}
                >
                  {t.team}
                  {period.length > 1 ? ` ${t.season.slice(0, 2)}-${t.season.slice(2)}` : ""} {fr(t.delta, 1, true)} pts
                </span>
              ));
            })()}

          {hover && scales && (
            <div
              className="pointer-events-none absolute z-40 w-52 rounded-xl bg-[#07160f] p-3 text-xs text-white shadow-xl"
              style={{
                left: Math.min(scales.x(hover.gd_pm) + 14, width - 216),
                top: Math.max(scales.y(hover.pts_pm) - 96, 0),
              }}
            >
              <div className="flex items-center gap-2">
                <Crest team={hover.team} league={hover.league} logo={logoFor(hover.team)} size={20} sticker />
                <span className="font-bold">{hover.team}</span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-white/60">
                {hover.league} · {seasonLabel(hover.season)}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-[11px] text-white/70">
                <span>Points</span>
                <span className="text-right text-white">{hover.points}</span>
                <span>Attendus</span>
                <span className="text-right text-white">{fr(hover.points - hover.delta)}</span>
                <span>Diff. de buts</span>
                <span className="text-right text-white">{hover.gd > 0 ? `+${hover.gd}` : hover.gd}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cartes de texte qui défilent par-dessus */}
      <div className="pointer-events-none relative -mt-[calc(100vh-170px)]">
        {steps.map((step, i) => (
          <div
            key={i}
            ref={(el) => {
              stepRefs.current[i] = el;
            }}
            data-step={i}
            className="flex min-h-[90vh] items-center first:pt-[8vh] last:min-h-[100vh]"
          >
            <div
              className={`pointer-events-auto max-w-[24rem] rounded-2xl border border-current/10 bg-[var(--gambeta-paper)]/95 p-6 text-[17px] leading-relaxed shadow-lg backdrop-blur transition-opacity duration-500 md:max-w-[33%] ${
                active === i ? "opacity-100" : "opacity-40"
              }`}
            >
              {step}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

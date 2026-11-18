import { useMemo, useState } from "react";
import * as d3 from "d3";
import Crest from "../Crest";
import { useInView, useSize, fr } from "./hooks";

// Nuage d'écussons (beeswarm)
export default function CrestSwarm({ teams, league = null, label, logoFor }) {
  const [sizeRef, { width }] = useSize();
  const [viewRef, inView] = useInView({ threshold: 0.3 });
  const [hover, setHover] = useState(null);

  const r = width < 640 ? 11 : 15;
  const { nodes, height, x } = useMemo(() => {
    if (!width) return { nodes: [], height: 0, x: null };
    const ext = d3.extent(teams, (t) => t.delta);
    const x = d3
      .scaleLinear()
      .domain([Math.floor(ext[0] / 2) * 2, Math.ceil(ext[1] / 2) * 2])
      .range([r + 4, width - r - 4]);
    const nodes = teams.map((t) => ({ ...t, x: x(t.delta), y: 0 }));
    const sim = d3
      .forceSimulation(nodes)
      .force("x", d3.forceX((d) => x(d.delta)).strength(1))
      .force("y", d3.forceY(0).strength(0.06))
      .force("collide", d3.forceCollide(r + 3))
      .stop();
    for (let i = 0; i < 260; i += 1) sim.tick();
    const [minY, maxY] = d3.extent(nodes, (n) => n.y);
    const pad = r + 8;
    nodes.forEach((n) => {
      n.y = n.y - minY + pad;
    });
    return { nodes, height: maxY - minY + pad * 2, x };
  }, [teams, width, r]);

  const ticks = x ? x.ticks(width < 640 ? 5 : 9) : [];

  return (
    <div ref={viewRef} className="w-full">
      <p className="mb-5 max-w-2xl text-[13px] leading-relaxed text-current/70">
        <b className="text-current">Comment lire :</b> un écusson = un club. Plus il est à droite, plus il a pris de
        points par rapport à ce que sa différence de buts laissait prévoir (cumulé si plusieurs saisons). Survolez un
        écusson pour le détail.
      </p>
      <div ref={sizeRef} className="relative w-full" style={{ height: height + 44 }}>
        {x && (
          <>
            {/* Ligne du zéro : autant de points que prévu */}
            <div
              className="absolute top-0 border-l-2 border-dashed border-current/25"
              style={{ left: x(0), height }}
            />
            {nodes.map((n, i) => (
              <button
                key={`${n.league}-${n.team}`}
                type="button"
                className="absolute rounded-full transition-[opacity,transform,filter,left,top] duration-700 ease-out hover:z-10 hover:scale-150 focus:z-10 focus:scale-150 motion-reduce:transition-none"
                style={{
                  left: n.x - r,
                  top: n.y - r,
                  opacity: !inView ? 0 : league && n.league !== league ? 0.12 : 1,
                  filter: league && n.league !== league ? "grayscale(1)" : "none",
                  transform: inView ? "scale(1)" : "scale(0.2)",
                  transitionDelay: inView ? `${(n.x / width) * 900 + (i % 7) * 15}ms` : "0ms",
                }}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(n)}
                onBlur={() => setHover(null)}
                aria-label={`${n.team} : ${fr(n.delta, 1, true)} points par rapport aux attentes`}
              >
                <Crest team={n.team} league={n.league} logo={logoFor(n.team)} size={r * 2} sticker />
              </button>
            ))}

            {/* Axe */}
            <div className="absolute left-0 right-0 border-t border-current/15" style={{ top: height + 4 }} />
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute -translate-x-1/2 font-mono text-[11px] text-current/50"
                style={{ left: x(t), top: height + 10 }}
              >
                {t > 0 ? `+${t}` : t < 0 ? `−${-t}` : "0"}
              </span>
            ))}

            {hover && (
              <div
                className="pointer-events-none absolute z-20 w-56 -translate-x-1/2 rounded-xl bg-[#07160f] p-3 text-xs text-white shadow-xl"
                style={{ left: Math.min(Math.max(hover.x, 112), width - 112), top: Math.max(hover.y - r - 96, -60) }}
              >
                <div className="flex items-center gap-2">
                  <Crest team={hover.team} league={hover.league} logo={logoFor(hover.team)} size={22} sticker />
                  <span className="ml-auto font-mono text-[10px] text-white/50">{hover.league}</span>
                  <span className="font-bold">{hover.team}</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-[11px] text-white/70">
                  <span>Points réels</span>
                  <span className="text-right text-white">{hover.points}</span>
                  <span>Points attendus</span>
                  <span className="text-right text-white">{fr(hover.points - hover.delta)}</span>
                  <span>Saisons</span>
                  <span className="text-right text-white">{hover.nSeasons}</span>
                  <span>Écart</span>
                  <span className={`text-right font-bold ${hover.delta >= 0 ? "text-[#ff9a5c]" : "text-[#7fb2ff]"}`}>
                    {fr(hover.delta, 1, true)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[11px] uppercase tracking-wide text-current/60">
        <span>← moins de points que prévu</span>
        <span className="hidden sm:inline">Écart en points · {label}</span>
        <span>plus de points que prévu →</span>
      </div>
    </div>
  );
}

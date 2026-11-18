import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as d3 from "d3";
import Crest from "../Crest";
import { appendSticker } from "../../lib/svgSticker";

// Petit hook partagé : D3 dessine directement dans le <svg> référencé
function useD3(renderFn, dependencies) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) renderFn(d3.select(ref.current));
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}

// Couleurs communes aux graphiques : corail pour la donnée "réelle" mise en avant, un ton neutre
const CORAL = "#e86f2c";
const CORAL_SOFT = "#e86f2c66";

// Case 1 : classement — simple tableau, pas besoin de D3
// `scrollable`
export function StandingsTable({ data, active, scrollable = true, getHref, logoFor, league, zones = false }) {
  const navigate = useNavigate();
  return (
    <div className={scrollable ? "max-h-[420px] overflow-y-auto rounded-lg" : "overflow-x-auto rounded-lg"}>
      <table className="w-full border-collapse text-left text-[13px]">
        <thead className={`${scrollable ? "sticky top-0 " : ""}bg-[var(--gambeta-paper)] text-current/50`}>
          <tr className="text-[11px] uppercase tracking-wider">
            <th className="py-2 pr-2 font-semibold">#</th>
            <th className="py-2 pr-2 font-semibold">Équipe</th>
            <th className="py-2 pr-2 text-right font-semibold">J</th>
            <th className="py-2 pr-2 text-right font-semibold">V-N-D</th>
            <th className="py-2 pr-2 text-right font-semibold">Buts</th>
            <th className="py-2 text-right font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={row.team}
              className={`border-t border-current/10 transition-all duration-300 ease-out ${
                getHref ? "cursor-pointer hover:bg-current/[0.04]" : ""
              }`}
              style={{
                transitionDelay: `${index * 25}ms`,
                opacity: active ? 1 : 0,
                transform: active ? "translateX(0)" : "translateX(-8px)",
              }}
              onClick={getHref ? () => navigate(getHref(row)) : undefined}
              role={getHref ? "link" : undefined}
              tabIndex={getHref ? 0 : undefined}
              onKeyDown={
                getHref
                  ? (event) => {
                      if (event.key === "Enter") navigate(getHref(row));
                    }
                  : undefined
              }
            >
              <td
                className="py-1.5 pl-2 pr-2 tabular-nums text-current/60"
                style={
                  zones
                    ? {
                        boxShadow:
                          row.rank <= 4
                            ? "inset 3px 0 0 #2a78d6"
                            : row.rank > data.length - 3
                              ? "inset 3px 0 0 #d94f27"
                              : undefined,
                      }
                    : undefined
                }
              >
                {row.rank}
              </td>
              <td className="py-1.5 pr-2 font-medium">
                {logoFor ? (
                  <span className="flex items-center gap-2.5">
                    <Crest team={row.team} league={league} logo={logoFor(row.team)} size={22} />
                    {row.team}
                  </span>
                ) : (
                  row.team
                )}
              </td>
              <td className="py-1.5 pr-2 text-right tabular-nums text-current/60">{row.gp}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums text-current/60">{row.w}-{row.d}-{row.l}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums text-current/60">{row.gf}-{row.ga}</td>
              <td className="py-1.5 text-right font-bold tabular-nums" style={{ color: CORAL }}>{row.pts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Case 2 : lollipop chart (xG vs buts réels)
const WIDTH = 560;

export function LollipopChart({ data, active, photoFor = () => null, league }) {
  const height = data.length * 38 + 30;
  // Signature des photos disponibles : redessine quand un visage arrive
  const photoSig = data.map((d) => photoFor(d.player) || "").join("|");

  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      const margin = { top: 10, right: 52, bottom: 24, left: 130 };
      const innerWidth = WIDTH - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3
        .scaleLinear()
        .domain([0, d3.max(data, (d) => Math.max(d.xg, d.goals)) * 1.15])
        .range([0, innerWidth]);
      const y = d3
        .scaleBand()
        .domain(data.map((d) => d.player))
        .range([0, innerHeight])
        .padding(0.4);

      // Grille verticale légère
      g.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(5).tickSize(-innerHeight).tickFormat(""))
        .call((axisGroup) => axisGroup.select(".domain").remove())
        .selectAll("line")
        .attr("stroke", "currentColor")
        .attr("stroke-opacity", 0.08);

      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(5))
        .call((axisGroup) => axisGroup.select(".domain").attr("stroke", "currentColor").attr("stroke-opacity", 0.2))
        .selectAll("text")
        .attr("fill", "currentColor")
        .attr("opacity", 0.5)
        .style("font-size", "10px");

      g.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .call((axisGroup) => axisGroup.select(".domain").remove())
        .selectAll("text")
        .attr("fill", "currentColor")
        .style("font-size", "11px")
        .style("font-weight", 600);

      const rows = g
        .selectAll(".row")
        .data(data)
        .join("g")
        .attr("class", "row")
        .attr("transform", (d) => `translate(0,${y(d.player) + y.bandwidth() / 2})`);

      // Écart buts - xG affiché au bout de la ligne : corail si le joueur marque plus que prévu
      rows
        .append("text")
        .attr("x", innerWidth + 8)
        .attr("y", 4)
        .attr("fill", (d) => (d.goals - d.xg >= 0 ? "#e86f2c" : "currentColor"))
        .attr("opacity", 0)
        .style("font-size", "11px")
        .style("font-weight", 700)
        .text((d) => {
          const diff = d.goals - d.xg;
          return `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)}`;
        })
        .transition()
        .duration(active ? 400 : 0)
        .delay((_, i) => 300 + i * 40)
        .attr("opacity", (d) => (d.goals - d.xg >= 0 ? 1 : 0.55));

      // Ligne reliant xG (attendu) et buts réels
      rows
        .append("line")
        .attr("x1", (d) => x(d.xg))
        .attr("x2", (d) => x(d.xg))
        .attr("stroke", "currentColor")
        .attr("stroke-opacity", 0.3)
        .attr("stroke-width", 2)
        .transition()
        .duration(active ? 600 : 0)
        .delay((_, i) => i * 40)
        .attr("x2", (d) => x(d.goals));

      // Point xG (attendu) — creux, ton neutre
      rows
        .append("circle")
        .attr("cx", (d) => x(d.xg))
        .attr("r", 0)
        .attr("fill", "var(--gambeta-paper)")
        .attr("stroke", "currentColor")
        .attr("stroke-opacity", 0.5)
        .attr("stroke-width", 2)
        .transition()
        .duration(active ? 400 : 0)
        .delay((_, i) => i * 40)
        .attr("r", 6);

      // Buts réels : le visage du joueur en autocollant
      const faces = rows
        .append("g")
        .attr("transform", (d) => `translate(${x(d.xg)},0) scale(0.2)`)
        .attr("opacity", 0);
      appendSticker(faces, (d) => ({ href: photoFor(d.player), label: d.player, league, kind: "face", ring: CORAL }), 12);
      faces
        .transition()
        .duration(active ? 600 : 0)
        .delay((_, i) => i * 40 + 200)
        .attr("transform", (d) => `translate(${x(d.goals)},0) scale(1)`)
        .attr("opacity", 1);
    },
    [active, data, height, photoSig]
  );

  return (
    <>
      <svg ref={ref} viewBox={`0 0 ${WIDTH} ${height}`} className="w-full text-[var(--gambeta-ink)]" />
      <div className="mt-2 flex items-center gap-4 text-[11px] text-current/50">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-current/50" /> xG (attendu)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-white" style={{ boxShadow: `0 0 0 2px ${CORAL}` }} /> Buts réels (visage du joueur)
        </span>
      </div>
    </>
  );
}

// Case 3 : classement horizontal (barres) par xA
export function HorizontalBarChart({ data, active, photoFor = () => null, league }) {
  const height = data.length * 36 + 20;
  const photoSig = data.map((d) => photoFor(d.player) || "").join("|");

  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      const margin = { top: 10, right: 60, bottom: 10, left: 140 };
      const innerWidth = WIDTH - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear().domain([0, d3.max(data, (d) => d.xa) * 1.1]).range([0, innerWidth]);
      const y = d3.scaleBand().domain(data.map((d) => d.player)).range([0, innerHeight]).padding(0.35);

      g.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .call((axisGroup) => axisGroup.select(".domain").remove())
        .selectAll("text")
        .attr("fill", "currentColor")
        .style("font-size", "11px")
        .style("font-weight", 600);

      g.selectAll(".bar")
        .data(data)
        .join("rect")
        .attr("y", (d) => y(d.player))
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("rx", 4)
        .attr("fill", CORAL_SOFT)
        .attr("width", 0)
        .transition()
        .duration(active ? 700 : 0)
        .delay((_, i) => i * 50)
        .attr("width", (d) => x(d.xa));

      g.selectAll(".value")
        .data(data)
        .join("text")
        .attr("y", (d) => y(d.player) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("fill", "currentColor")
        .style("font-size", "11px")
        .style("font-weight", 700)
        .attr("x", 0)
        .attr("opacity", 0)
        .text((d) => d.xa.toFixed(1))
        .transition()
        .duration(active ? 400 : 0)
        .delay((_, i) => i * 50 + 400)
        .attr("x", (d) => x(d.xa) + 30)
        .attr("opacity", 1);

      // Visage du passeur au bout de sa barre
      const faces = g
        .selectAll(".face")
        .data(data)
        .join("g")
        .attr("transform", (d) => `translate(12,${y(d.player) + y.bandwidth() / 2})`)
        .attr("opacity", 0);
      appendSticker(faces, (d) => ({ href: photoFor(d.player), label: d.player, league, kind: "face" }), 12);
      faces
        .transition()
        .duration(active ? 700 : 0)
        .delay((_, i) => i * 50)
        .attr("transform", (d) => `translate(${Math.max(x(d.xa), 12)},${y(d.player) + y.bandwidth() / 2})`)
        .attr("opacity", 1);
    },
    [active, data, height, photoSig]
  );

  return <svg ref={ref} viewBox={`0 0 ${WIDTH} ${height}`} className="w-full text-[var(--gambeta-ink)]" />;
}

// Case 4 : nuage de points possession × PPDA
export function ScatterPlot({ data, active }) {
  const height = 420;

  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      // right généreux : les points à forte possession affichent leur étiquette juste à droite du point
      const margin = { top: 16, right: 70, bottom: 40, left: 40 };
      const innerWidth = WIDTH - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear().domain(d3.extent(data, (d) => d.possession)).nice().range([0, innerWidth]);
      // PPDA inversé : un pressing plus intense (PPDA bas) apparaît en haut.
      const y = d3.scaleLinear().domain(d3.extent(data, (d) => d.ppda)).nice().range([0, innerHeight]);

      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat((d) => `${d}%`))
        .call((axisGroup) => axisGroup.select(".domain").attr("stroke", "currentColor").attr("stroke-opacity", 0.2))
        .selectAll("text")
        .attr("fill", "currentColor")
        .attr("opacity", 0.5)
        .style("font-size", "10px");

      g.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .call((axisGroup) => axisGroup.select(".domain").attr("stroke", "currentColor").attr("stroke-opacity", 0.2))
        .selectAll("text")
        .attr("fill", "currentColor")
        .attr("opacity", 0.5)
        .style("font-size", "10px");

      g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 34)
        .attr("text-anchor", "middle")
        .attr("fill", "currentColor")
        .attr("opacity", 0.5)
        .style("font-size", "10px")
        .text("Possession moyenne →");

      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -28)
        .attr("text-anchor", "middle")
        .attr("fill", "currentColor")
        .attr("opacity", 0.5)
        .style("font-size", "10px")
        .text("PPDA (pressing plus intense ↑)");

      const points = g
        .selectAll(".point")
        .data(data)
        .join("g")
        .attr("transform", (d) => `translate(${x(d.possession)},${y(d.ppda)})`);

      points
        .append("circle")
        .attr("r", 0)
        .attr("fill", CORAL_SOFT)
        .attr("stroke", CORAL)
        .attr("stroke-width", 1.5)
        .transition()
        .duration(active ? 500 : 0)
        .delay((_, i) => i * 25)
        .attr("r", 5);

      points
        .append("text")
        .attr("x", 8)
        .attr("y", 3)
        .attr("fill", "currentColor")
        .attr("opacity", 0)
        .style("font-size", "9px")
        .text((d) => d.team)
        .transition()
        .duration(active ? 400 : 0)
        .delay((_, i) => i * 25 + 200)
        .attr("opacity", 0.6);
    },
    [active, data]
  );

  return <svg ref={ref} viewBox={`0 0 ${WIDTH} ${height}`} className="w-full text-[var(--gambeta-ink)]" />;
}

// Case 5 : évolution du classement journée par journée
const LINE_COLORS = ["#e86f2c", "#221400", "#6c5ce7", "#8a5a3a", "#2f6f4f", "#b23a1f"];

export function RankLineChart({ data, active, logoFor = () => null, league, xLabels = null }) {
  const logoSig = data.map((d) => logoFor(d.team) || "").join("|");
  const height = 420;
  const matchdays = data[0]?.ranks.length ?? 0;

  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      const margin = { top: 20, right: 110, bottom: 30, left: 30 };
      const innerWidth = WIDTH - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear().domain([1, matchdays]).range([0, innerWidth]);
      // Classement inversé : la 1ère place tout en haut du graphique.
      const y = d3.scaleLinear().domain([20, 1]).range([innerHeight, 0]);

      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
          xLabels
            ? d3.axisBottom(x).tickValues(xLabels.map((_, i) => i + 1)).tickFormat((d) => xLabels[d - 1])
            : d3.axisBottom(x).ticks(Math.min(matchdays, 10)).tickFormat((d) => `J${d}`)
        )
        .call((axisGroup) => axisGroup.select(".domain").attr("stroke", "currentColor").attr("stroke-opacity", 0.2))
        .selectAll("text")
        .attr("fill", "currentColor")
        .attr("opacity", 0.5)
        .style("font-size", "9px");

      g.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .call((axisGroup) => axisGroup.select(".domain").attr("stroke", "currentColor").attr("stroke-opacity", 0.2))
        .selectAll("text")
        .attr("fill", "currentColor")
        .attr("opacity", 0.5)
        .style("font-size", "9px");

      const line = d3
        .line()
        .defined((d) => d != null)
        .x((_, i) => x(i + 1))
        .y((d) => y(d))
        .curve(d3.curveMonotoneX);

      data.forEach((series, seriesIndex) => {
        const color = LINE_COLORS[seriesIndex % LINE_COLORS.length];
        const path = g
          .append("path")
          .datum(series.ranks)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 2.5)
          .attr("d", line);

        // Effet "tracé au crayon" : la ligne se dessine de gauche à droite.
        const length = path.node().getTotalLength();
        path
          .attr("stroke-dasharray", `${length} ${length}`)
          .attr("stroke-dashoffset", active ? length : 0)
          .transition()
          .duration(900)
          .delay(seriesIndex * 120)
          .attr("stroke-dashoffset", 0);

        // Saisons : un écusson à chaque saison jouée ; journées : à l'arrivée
        if (xLabels) {
          const dots = g
            .selectAll(null)
            .data(series.ranks.map((r, i) => ({ r, i, team: series.team })).filter((d) => d.r != null))
            .join("g")
            .attr("transform", (d) => `translate(${x(d.i + 1)},${y(d.r)})`)
            .attr("opacity", 0);
          appendSticker(dots, (d) => ({ href: logoFor(d.team), label: `${d.team} : ${d.r}ᵉ`, league, ring: color }), 9);
          dots.transition().duration(400).delay(seriesIndex * 120 + 500).attr("opacity", 1);
        }
        const lastRank = [...series.ranks].reverse().find((r) => r != null);
        const end = g
          .append("g")
          .datum(series)
          .attr("transform", `translate(${innerWidth},${y(lastRank)})`)
          .attr("opacity", 0);
        appendSticker(end, (d) => ({ href: logoFor(d.team), label: d.team, league, ring: color }), 11);
        end.transition().duration(400).delay(seriesIndex * 120 + 700).attr("opacity", 1);

        g.append("text")
          .attr("x", innerWidth + 18)
          .attr("y", y(lastRank))
          .attr("dy", "0.35em")
          .attr("fill", color)
          .style("font-size", "10px")
          .style("font-weight", 700)
          .attr("opacity", 0)
          .text(series.team)
          .transition()
          .duration(400)
          .delay(seriesIndex * 120 + 700)
          .attr("opacity", 1);
      });
    },
    [active, data, matchdays, logoSig]
  );

  return <svg ref={ref} viewBox={`0 0 ${WIDTH} ${height}`} className="w-full text-[var(--gambeta-ink)]" />;
}

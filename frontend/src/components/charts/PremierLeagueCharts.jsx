import { useEffect, useRef } from "react";
import * as d3 from "d3";

// Petit hook partagé : D3 dessine directement dans le <svg> référencé,
// React se contente de fournir le conteneur et de relancer le dessin
// quand les dépendances changent (typiquement `active`, pour ne dessiner
// qu'une fois le graphique visible à l'écran).
function useD3(renderFn, dependencies) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) renderFn(d3.select(ref.current));
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}

// Couleurs communes aux graphiques : corail pour la donnée "réelle" mise
// en avant, un ton neutre (dérivé du texte via currentColor) pour tout
// le reste — ainsi les axes/labels suivent automatiquement le mode sombre
// sans dessiner deux fois le graphique.
const CORAL = "#e86f2c";
const CORAL_SOFT = "#e86f2c66";

// --- Case 1 : classement — simple tableau, pas besoin de D3 ---------------
export function StandingsTable({ data, active }) {
  return (
    <div className="max-h-[420px] overflow-y-auto rounded-lg">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead className="sticky top-0 bg-[var(--gambeta-paper)] text-current/50">
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
              className="border-t border-current/10 transition-all duration-300 ease-out"
              style={{
                transitionDelay: `${index * 25}ms`,
                opacity: active ? 1 : 0,
                transform: active ? "translateX(0)" : "translateX(-8px)",
              }}
            >
              <td className="py-1.5 pr-2 tabular-nums text-current/60">{row.rank}</td>
              <td className="py-1.5 pr-2 font-medium">{row.team}</td>
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

// --- Case 2 : lollipop chart (xG vs buts réels) ---------------------------
const WIDTH = 560;

export function LollipopChart({ data, active }) {
  const height = data.length * 34 + 30;

  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      const margin = { top: 10, right: 20, bottom: 24, left: 130 };
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

      // Point buts réels — plein, corail
      rows
        .append("circle")
        .attr("cx", (d) => x(d.goals))
        .attr("r", 0)
        .attr("fill", CORAL)
        .transition()
        .duration(active ? 400 : 0)
        .delay((_, i) => i * 40 + 200)
        .attr("r", 6);
    },
    [active, data, height]
  );

  return (
    <>
      <svg ref={ref} viewBox={`0 0 ${WIDTH} ${height}`} className="w-full text-[var(--gambeta-ink)]" />
      <div className="mt-2 flex items-center gap-4 text-[11px] text-current/50">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-2 border-current/50" /> xG (attendu)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CORAL }} /> Buts réels
        </span>
      </div>
    </>
  );
}

// --- Case 3 : classement horizontal (barres) par xA -----------------------
export function HorizontalBarChart({ data, active }) {
  const height = data.length * 32 + 20;

  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      const margin = { top: 10, right: 36, bottom: 10, left: 140 };
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
        .attr("x", (d) => x(d.xa) + 8)
        .attr("opacity", 1);
    },
    [active, data, height]
  );

  return <svg ref={ref} viewBox={`0 0 ${WIDTH} ${height}`} className="w-full text-[var(--gambeta-ink)]" />;
}

// --- Case 4 : nuage de points possession × PPDA ----------------------------
export function ScatterPlot({ data, active }) {
  const height = 420;

  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      // right généreux : les points à forte possession affichent leur
      // étiquette juste à droite du point, il leur faut de la place pour
      // ne pas être rognés par le bord du viewBox (ex: "Man City").
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

// --- Case 5 : évolution du classement journée par journée -----------------
const LINE_COLORS = ["#e86f2c", "#221400", "#8a5a3a", "#c98a5f", "#b23a1f"];

export function RankLineChart({ data, active }) {
  const height = 420;
  const matchdays = data[0]?.ranks.length ?? 0;

  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      const margin = { top: 16, right: 90, bottom: 30, left: 30 };
      const innerWidth = WIDTH - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear().domain([1, matchdays]).range([0, innerWidth]);
      // Classement inversé : la 1ère place tout en haut du graphique.
      const y = d3.scaleLinear().domain([20, 1]).range([innerHeight, 0]);

      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(Math.min(matchdays, 10)).tickFormat((d) => `J${d}`))
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

        g.append("text")
          .attr("x", innerWidth + 8)
          .attr("y", y(series.ranks[series.ranks.length - 1]))
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
    [active, data, matchdays]
  );

  return <svg ref={ref} viewBox={`0 0 ${WIDTH} ${height}`} className="w-full text-[var(--gambeta-ink)]" />;
}

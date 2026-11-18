import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { appendSticker } from "../../lib/svgSticker";

// Même petit hook que dans les autres fichiers charts/.
function useD3(renderFn, dependencies) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) renderFn(d3.select(ref.current));
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}

const CORAL = "#e86f2c";
const RED = "#c1440e";
const WIDTH = 480;

// Discipline collective : cartons jaunes/rouges cumulés par joueur, en barres empilées horizontales
// `data` = [{ player, yellow, red }], déjà triés/filtrés par l'appelant
export function TeamCardsBarChart({ data, active, photoFor = () => null, league }) {
  const height = data.length * 34 + 20;
  const photoSig = data.map((d) => photoFor(d.player) || "").join("|");

  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      const margin = { top: 10, right: 30, bottom: 10, left: 160 };
      const innerWidth = WIDTH - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear().domain([0, d3.max(data, (d) => d.yellow + d.red) * 1.15 || 1]).range([0, innerWidth]);
      const y = d3.scaleBand().domain(data.map((d) => d.player)).range([0, innerHeight]).padding(0.35);

      g.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .call((axisGroup) => axisGroup.select(".domain").remove())
        .selectAll("text")
        .attr("fill", "currentColor")
        .attr("x", -30)
        .style("font-size", "11px")
        .style("font-weight", 600);

      // Visage de chaque joueur devant sa barre
      const faces = g
        .selectAll(".face")
        .data(data)
        .join("g")
        .attr("transform", (d) => `translate(-15,${y(d.player) + y.bandwidth() / 2})`);
      appendSticker(faces, (d) => ({ href: photoFor(d.player), label: d.player, league, kind: "face" }), 11);

      const rows = g.selectAll(".card-row").data(data).join("g").attr("transform", (d) => `translate(0,${y(d.player)})`);

      rows
        .append("rect")
        .attr("y", 0)
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("width", 0)
        .attr("rx", 3)
        .attr("fill", CORAL)
        .transition()
        .duration(active ? 600 : 0)
        .attr("width", (d) => x(d.yellow));

      rows
        .append("rect")
        .attr("y", 0)
        .attr("height", y.bandwidth())
        .attr("x", (d) => x(d.yellow))
        .attr("width", 0)
        .attr("rx", 3)
        .attr("fill", RED)
        .transition()
        .duration(active ? 600 : 0)
        .delay(150)
        .attr("width", (d) => x(d.red));

      rows
        .append("text")
        .attr("x", (d) => x(d.yellow + d.red) + 6)
        .attr("y", y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("fill", "currentColor")
        .attr("opacity", 0)
        .style("font-size", "11px")
        .style("font-weight", 700)
        .text((d) => d.yellow + d.red)
        .transition()
        .duration(active ? 400 : 0)
        .delay(650)
        .attr("opacity", 0.7);
    },
    [active, data, height, photoSig]
  );

  return (
    <>
      <svg ref={ref} viewBox={`0 0 ${WIDTH} ${height}`} className="w-full text-[var(--gambeta-ink)]" />
      <div className="mt-2 flex items-center gap-4 text-[11px] text-current/50">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: CORAL }} /> Jaunes
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: RED }} /> Rouges
        </span>
      </div>
    </>
  );
}

// Classement de discipline collective : toutes les équipes d'un championnat
// `data` = [{ team, score }], déjà trié par l'appelant
export function DisciplineRankingChart({ data, active, logoFor = () => null, league }) {
  const height = data.length * 28 + 20;
  const logoSig = data.map((d) => logoFor(d.team) || "").join("|");

  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      const margin = { top: 10, right: 40, bottom: 10, left: 170 };
      const innerWidth = WIDTH - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear().domain([0, d3.max(data, (d) => d.score) * 1.1 || 1]).range([0, innerWidth]);
      const y = d3.scaleBand().domain(data.map((d) => d.team)).range([0, innerHeight]).padding(0.3);

      g.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .call((axisGroup) => axisGroup.select(".domain").remove())
        .selectAll("text")
        .attr("fill", "currentColor")
        .attr("x", -30)
        .style("font-size", "10px")
        .style("font-weight", 600);

      // Écusson de chaque club devant sa barre
      const crests = g
        .selectAll(".crest")
        .data(data)
        .join("g")
        .attr("transform", (d) => `translate(-15,${y(d.team) + y.bandwidth() / 2})`);
      appendSticker(crests, (d) => ({ href: logoFor(d.team), label: d.team, league }), 9);

      g.selectAll(".discipline-bar")
        .data(data)
        .join("rect")
        .attr("y", (d) => y(d.team))
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("rx", 3)
        // Dégradé de couleur simple : plus le score de cartons est élevé, plus le rouge domine
        .attr("fill", (d) => {
          const t = Math.min(d.score / (d3.max(data, (r) => r.score) || 1), 1);
          return d3.interpolateRgb(CORAL, RED)(t);
        })
        .attr("width", 0)
        .transition()
        .duration(active ? 600 : 0)
        .delay((_, i) => i * 15)
        .attr("width", (d) => Math.max(x(d.score), 1));

      g.selectAll(".discipline-value")
        .data(data)
        .join("text")
        .attr("x", (d) => x(d.score) + 6)
        .attr("y", (d) => y(d.team) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("fill", "currentColor")
        .attr("opacity", 0)
        .style("font-size", "10px")
        .text((d) => d.score.toFixed(2))
        .transition()
        .duration(active ? 300 : 0)
        .delay((_, i) => i * 15 + 400)
        .attr("opacity", 0.6);
    },
    [active, data, height, logoSig]
  );

  return <svg ref={ref} viewBox={`0 0 ${WIDTH} ${height}`} className="w-full text-[var(--gambeta-ink)]" />;
}

// Nuage de points : l'équipe comparée au reste du championnat sur 2 axes
// `data` = toutes les équipes du championnat (voir /api/data/league-stats)
export function TeamComparisonScatter({ data, highlightSlug, xField, yField, xLabel, yLabel, active, quadrantLabels, logoFor = () => null, league }) {
  const height = 400;
  const logoSig = data.map((d) => logoFor(d.team) || "").join("|");

  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      const margin = { top: 16, right: 20, bottom: 40, left: 46 };
      const innerWidth = WIDTH - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear().domain(d3.extent(data, (d) => d[xField])).nice().range([0, innerWidth]);
      const y = d3.scaleLinear().domain(d3.extent(data, (d) => d[yField])).nice().range([innerHeight, 0]);

      g.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(5))
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
        .text(xLabel);

      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -32)
        .attr("text-anchor", "middle")
        .attr("fill", "currentColor")
        .attr("opacity", 0.5)
        .style("font-size", "10px")
        .text(yLabel);

      // Lignes de médiane (style Opta Analyst) : elles coupent le graphique en 4 zones
      const medX = d3.median(data, (d) => d[xField]);
      const medY = d3.median(data, (d) => d[yField]);
      [
        { x1: x(medX), x2: x(medX), y1: 0, y2: innerHeight },
        { x1: 0, x2: innerWidth, y1: y(medY), y2: y(medY) },
      ].forEach((l) =>
        g.append("line")
          .attr("x1", l.x1).attr("x2", l.x2).attr("y1", l.y1).attr("y2", l.y2)
          .attr("stroke", "currentColor").attr("stroke-opacity", 0.18).attr("stroke-dasharray", "4 4")
      );
      if (quadrantLabels) {
        const corners = [
          { text: quadrantLabels.topRight, x: innerWidth - 4, y: 10, anchor: "end" },
          { text: quadrantLabels.topLeft, x: 4, y: 10, anchor: "start" },
          { text: quadrantLabels.bottomRight, x: innerWidth - 4, y: innerHeight - 6, anchor: "end" },
          { text: quadrantLabels.bottomLeft, x: 4, y: innerHeight - 6, anchor: "start" },
        ];
        corners.forEach((c) =>
          g.append("text")
            .attr("x", c.x).attr("y", c.y).attr("text-anchor", c.anchor)
            .attr("fill", CORAL).attr("opacity", 0.7)
            .style("font-size", "9.5px").style("font-weight", 700).style("text-transform", "uppercase")
            .text(c.text)
        );
      }

      const points = g.selectAll(".team-point").data(data).join("g").attr("transform", (d) => `translate(${x(d[xField])},${y(d[yField])})`);

      // Chaque club = son écusson en autocollant (aucun point anonyme).
      const isHi = (d) => d.team_slug === highlightSlug;
      points.sort((a, b) => (isHi(a) ? 1 : 0) - (isHi(b) ? 1 : 0)).order();
      const stickers = points.append("g").attr("transform", "scale(0.2)").attr("opacity", 0);
      appendSticker(
        stickers,
        (d) => ({ href: logoFor(d.team), label: d.team, league, ring: isHi(d) ? CORAL : undefined }),
        (d) => (isHi(d) ? 15 : 10)
      );
      stickers
        .transition()
        .duration(active ? 500 : 0)
        .delay((_, i) => i * 20)
        .attr("transform", "scale(1)")
        .attr("opacity", (d) => (highlightSlug && !isHi(d) ? 0.75 : 1));

      points
        .filter((d) => isHi(d))
        .append("text")
        .attr("x", (d) => (x(d[xField]) > innerWidth * 0.75 ? -20 : 20))
        .attr("text-anchor", (d) => (x(d[xField]) > innerWidth * 0.75 ? "end" : "start"))
        .attr("y", 4)
        .attr("fill", CORAL)
        .attr("stroke", "var(--gambeta-paper)")
        .attr("stroke-width", 3)
        .attr("paint-order", "stroke")
        .style("font-size", "12px")
        .style("font-weight", 800)
        .text((d) => d.team);
    },
    [active, data, highlightSlug, xField, yField, xLabel, yLabel, quadrantLabels, logoSig]
  );

  return <svg ref={ref} viewBox={`0 0 ${WIDTH} ${height}`} className="w-full text-[var(--gambeta-ink)]" />;
}

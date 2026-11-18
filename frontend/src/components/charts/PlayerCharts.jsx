import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { appendSticker } from "../../lib/svgSticker";

// Même petit hook que dans les autres fichiers charts/ : D3 dessine dans le <svg> référencé
function useD3(renderFn, dependencies) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) renderFn(d3.select(ref.current));
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}

const CORAL = "#e86f2c";
const CORAL_SOFT = "#e86f2c66";
const WIDTH = 420;

// xG vs buts réels / xA vs passes décisives réelles : sur/sous-performance
// `data` = [{ label, expected, real }] (2 lignes : xG/Buts, xA/Passes déc.)
export function PerformanceBarChart({ data, active }) {
  const height = data.length * 90 + 20;

  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      const margin = { top: 10, right: 30, bottom: 10, left: 90 };
      const innerWidth = WIDTH - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

      const maxValue = d3.max(data, (d) => Math.max(d.expected, d.real)) * 1.15 || 1;
      const x = d3.scaleLinear().domain([0, maxValue]).range([0, innerWidth]);
      const y = d3
        .scaleBand()
        .domain(data.map((d) => d.label))
        .range([0, innerHeight])
        .padding(0.35);
      const yBar = d3.scaleBand().domain(["expected", "real"]).range([0, y.bandwidth()]).padding(0.15);

      g.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .call((axisGroup) => axisGroup.select(".domain").remove())
        .selectAll("text")
        .attr("fill", "currentColor")
        .style("font-size", "12px")
        .style("font-weight", 600);

      const rows = g.selectAll(".perf-row").data(data).join("g").attr("transform", (d) => `translate(0,${y(d.label)})`);

      // Barre "attendu" (xG ou xA), contour seul, ton neutre.
      rows
        .append("rect")
        .attr("y", yBar("expected"))
        .attr("height", yBar.bandwidth())
        .attr("x", 0)
        .attr("width", 0)
        .attr("rx", 4)
        .attr("fill", "none")
        .attr("stroke", "currentColor")
        .attr("stroke-opacity", 0.5)
        .attr("stroke-width", 1.5)
        .transition()
        .duration(active ? 600 : 0)
        .attr("width", (d) => Math.max(x(d.expected), 1));

      // Barre "réel" (buts ou passes décisives), pleine, corail.
      rows
        .append("rect")
        .attr("y", yBar("real"))
        .attr("height", yBar.bandwidth())
        .attr("x", 0)
        .attr("width", 0)
        .attr("rx", 4)
        .attr("fill", CORAL)
        .transition()
        .duration(active ? 600 : 0)
        .delay(150)
        .attr("width", (d) => Math.max(x(d.real), 1));

      rows
        .append("text")
        .attr("x", (d) => x(d.expected) + 6)
        .attr("y", yBar("expected") + yBar.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("fill", "currentColor")
        .attr("opacity", 0)
        .style("font-size", "11px")
        .text((d) => `${d.expected.toFixed(1)} attendu`)
        .transition()
        .duration(active ? 400 : 0)
        .delay(500)
        .attr("opacity", 0.6);

      rows
        .append("text")
        .attr("x", (d) => x(d.real) + 6)
        .attr("y", yBar("real") + yBar.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("fill", CORAL)
        .attr("opacity", 0)
        .style("font-size", "11px")
        .style("font-weight", 700)
        .text((d) => `${d.real} réel`)
        .transition()
        .duration(active ? 400 : 0)
        .delay(650)
        .attr("opacity", 1);
    },
    [active, data, height]
  );

  return <svg ref={ref} viewBox={`0 0 ${WIDTH} ${height}`} className="w-full text-[var(--gambeta-ink)]" />;
}

// Répartition des tirs : cadrés transformés (buts), cadrés non transformés, non cadrés
// `data` = { shots, shotsOnTarget, goals }
export function ShotDistributionChart({ data, active, photo = null, name, league }) {
  const size = 260;
  const radius = size / 2 - 10;

  const segments = [
    { label: "Buts", value: Math.min(data.goals, data.shotsOnTarget), color: CORAL },
    { label: "Cadrés non transformés", value: Math.max(data.shotsOnTarget - data.goals, 0), color: CORAL_SOFT },
    { label: "Non cadrés", value: Math.max(data.shots - data.shotsOnTarget, 0), color: "currentColor" },
  ];

  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      const g = svg.append("g").attr("transform", `translate(${size / 2},${size / 2})`);

      const pie = d3.pie().value((d) => d.value).sort(null);
      const arc = d3.arc().innerRadius(radius * 0.55).outerRadius(radius);
      const arcHover = d3.arc().innerRadius(radius * 0.55).outerRadius(radius + 6);

      const arcs = g.selectAll(".slice").data(pie(segments)).join("path").attr("class", "slice");
      arcs
        .attr("fill", (d) => d.data.color)
        .attr("fill-opacity", (d) => (d.data.label === "Non cadrés" ? 0.12 : 1))
        .attr("stroke", "var(--gambeta-paper)")
        .attr("stroke-width", 2)
        .attr("d", (d) => arc({ ...d, endAngle: d.startAngle }))
        .transition()
        .duration(active ? 700 : 0)
        .attrTween("d", function tween(d) {
          const interpolate = d3.interpolate({ ...d, endAngle: d.startAngle }, d);
          return (t) => arc(interpolate(t));
        });

      // Visage du joueur au centre du donut, puis le total de tirs.
      const face = g.append("g").attr("transform", "translate(0,-22)");
      appendSticker(face, () => ({ href: photo, label: name ?? "", league, kind: "face" }), 22);
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "1.5em")
        .attr("fill", "currentColor")
        .style("font-size", "22px")
        .style("font-weight", 700)
        .text(data.shots);
      g.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "3.6em")
        .attr("fill", "currentColor")
        .attr("opacity", 0.5)
        .style("font-size", "10px")
        .text("tirs au total");

      arcs.on("mouseenter", function onEnter(_event, d) {
        d3.select(this).transition().duration(150).attr("d", arcHover(d));
      });
      arcs.on("mouseleave", function onLeave(_event, d) {
        d3.select(this).transition().duration(150).attr("d", arc(d));
      });
    },
    [active, data, photo]
  );

  return (
    <div>
      <svg ref={ref} viewBox={`0 0 ${size} ${size}`} className="mx-auto block w-full max-w-[260px] text-[var(--gambeta-ink)]" />
      <div className="mt-3 flex flex-wrap justify-center gap-3 text-[11px] text-current/60">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: s.color, opacity: s.label === "Non cadrés" ? 0.3 : 1 }}
            />
            {s.label} ({s.value})
          </span>
        ))}
      </div>
    </div>
  );
}

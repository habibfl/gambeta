import { useEffect, useRef } from "react";
import * as d3 from "d3";

// Même petit hook que dans PremierLeagueCharts.jsx : D3 dessine dans le
// <svg> référencé, React ne fait que fournir le conteneur et relance le
// dessin quand `active` passe à vrai (visibilité au scroll).
function useD3(renderFn, dependencies) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) renderFn(d3.select(ref.current));
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}

const CORAL = "#e86f2c";
const SIZE = 360;
const CENTER = SIZE / 2;
const RADIUS = 130;

// Radar à 5 axes (Attaque, Défense, Possession, Pressing, Discipline),
// valeurs attendues sur 100. Calcul manuel des positions par trigonométrie
// plutôt que d3.lineRadial, pour rester simple avec seulement 5 points fixes.
export default function RadarChart({ data, active }) {
  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      const g = svg.append("g").attr("transform", `translate(${CENTER},${CENTER})`);
      const total = data.length;

      // Angle de l'axe i, 0 en haut puis dans le sens horaire.
      const angleFor = (i) => (Math.PI * 2 * i) / total - Math.PI / 2;
      const pointFor = (i, ratio) => {
        const angle = angleFor(i);
        const r = ratio * RADIUS;
        return [Math.cos(angle) * r, Math.sin(angle) * r];
      };

      // Grille : 4 anneaux concentriques (25/50/75/100) + les 5 axes eux-mêmes.
      const rings = [0.25, 0.5, 0.75, 1];
      rings.forEach((ratio) => {
        const points = d3.range(total).map((i) => pointFor(i, ratio));
        g.append("polygon")
          .attr("points", points.map((p) => p.join(",")).join(" "))
          .attr("fill", "none")
          .attr("stroke", "currentColor")
          .attr("stroke-opacity", ratio === 1 ? 0.25 : 0.1);
      });

      data.forEach((_, i) => {
        const [x, y] = pointFor(i, 1);
        g.append("line")
          .attr("x1", 0)
          .attr("y1", 0)
          .attr("x2", x)
          .attr("y2", y)
          .attr("stroke", "currentColor")
          .attr("stroke-opacity", 0.1);
      });

      // Étiquettes des axes, légèrement décalées vers l'extérieur du dernier
      // anneau pour ne jamais chevaucher le tracé des valeurs.
      data.forEach((d, i) => {
        const [x, y] = pointFor(i, 1.22);
        g.append("text")
          .attr("x", x)
          .attr("y", y)
          .attr("text-anchor", "middle")
          .attr("dy", "0.32em")
          .attr("fill", "currentColor")
          .attr("opacity", 0.7)
          .style("font-size", "11px")
          .style("font-weight", 600)
          .text(d.axis);

        g.append("text")
          .attr("x", x)
          .attr("y", y + 14)
          .attr("text-anchor", "middle")
          .attr("fill", CORAL)
          .attr("opacity", 0)
          .style("font-size", "11px")
          .style("font-weight", 700)
          .text(d.value)
          .transition()
          .duration(active ? 400 : 0)
          .delay(active ? 500 : 0)
          .attr("opacity", 1);
      });

      // Le tracé de la forme part du centre (toutes valeurs à 0) puis
      // s'anime vers ses vraies valeurs, une fois la section active.
      const shapePoints = (ratioFn) => data.map((d, i) => pointFor(i, ratioFn(d))).map((p) => p.join(",")).join(" ");

      const shape = g
        .append("polygon")
        .attr("points", shapePoints(() => 0))
        .attr("fill", CORAL)
        .attr("fill-opacity", 0.22)
        .attr("stroke", CORAL)
        .attr("stroke-width", 2);

      shape
        .transition()
        .duration(active ? 700 : 0)
        .attr("points", shapePoints((d) => d.value / 100));

      const points = g.selectAll(".radar-point").data(data).join("circle").attr("class", "radar-point");
      points
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 3.5)
        .attr("fill", CORAL)
        .transition()
        .duration(active ? 700 : 0)
        .attr("cx", (d, i) => pointFor(i, d.value / 100)[0])
        .attr("cy", (d, i) => pointFor(i, d.value / 100)[1]);
    },
    [active, data]
  );

  return <svg ref={ref} viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full text-[var(--gambeta-ink)]" />;
}

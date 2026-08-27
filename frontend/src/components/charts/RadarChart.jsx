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

// Couleurs par défaut pour le mode multi-séries (comparateur) : corail pour
// le 1er joueur, puis les teintes secondaires déjà utilisées ailleurs sur
// le site (violet des bocaux xA de PlayerJars, vert des avatars de
// teamsRegistry.js) pour rester cohérent avec la palette existante.
const SERIES_COLORS = [CORAL, "#6c5ce7", "#2f6f4f"];

// Radar générique, à N axes (5 pour un club, 6 pour un joueur), valeurs
// attendues sur 100. Calcul manuel des positions par trigonométrie plutôt
// que d3.lineRadial, pour rester simple avec un nombre de points fixe.
//
// Deux modes :
// - `data` (tableau de {axis, value}) : un seul profil, comportement
//   historique inchangé (EquipeDetail.jsx, JoueurDetail.jsx).
// - `series` (tableau de {name, color, values}) : plusieurs profils
//   superposés avec une légende, pour le comparateur de joueurs. Tous les
//   éléments de `series` doivent partager les mêmes axes (mêmes libellés,
//   même ordre).
export default function RadarChart({ data, series, active }) {
  const axes = series ? series[0].values.map((v) => v.axis) : data.map((d) => d.axis);

  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      const g = svg.append("g").attr("transform", `translate(${CENTER},${CENTER})`);
      const total = axes.length;

      // Angle de l'axe i, 0 en haut puis dans le sens horaire.
      const angleFor = (i) => (Math.PI * 2 * i) / total - Math.PI / 2;
      const pointFor = (i, ratio) => {
        const angle = angleFor(i);
        const r = ratio * RADIUS;
        return [Math.cos(angle) * r, Math.sin(angle) * r];
      };

      // Grille : 4 anneaux concentriques (25/50/75/100) + les axes eux-mêmes.
      const rings = [0.25, 0.5, 0.75, 1];
      rings.forEach((ratio) => {
        const points = d3.range(total).map((i) => pointFor(i, ratio));
        g.append("polygon")
          .attr("points", points.map((p) => p.join(",")).join(" "))
          .attr("fill", "none")
          .attr("stroke", "currentColor")
          .attr("stroke-opacity", ratio === 1 ? 0.25 : 0.1);
      });

      axes.forEach((_, i) => {
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
      axes.forEach((axis, i) => {
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
          .text(axis);
      });

      const shapePointsFor = (values, ratioFn) =>
        values.map((v, i) => pointFor(i, ratioFn(v))).map((p) => p.join(",")).join(" ");

      if (series) {
        // Mode comparateur : une forme + un jeu de points par joueur, pas
        // d'étiquette de valeur individuelle sur les axes (ça deviendrait
        // illisible à 2-3 profils superposés) : la légende HTML sous le
        // graphique et le tableau comparatif suffisent à lire les chiffres.
        series.forEach((s, si) => {
          const color = s.color ?? SERIES_COLORS[si % SERIES_COLORS.length];

          const shape = g
            .append("polygon")
            .attr("points", shapePointsFor(s.values, () => 0))
            .attr("fill", color)
            .attr("fill-opacity", 0.16)
            .attr("stroke", color)
            .attr("stroke-width", 2);

          shape
            .transition()
            .duration(active ? 700 : 0)
            .delay(si * 120)
            .attr("points", shapePointsFor(s.values, (v) => v.value / 100));

          g.selectAll(`.radar-point-${si}`)
            .data(s.values)
            .join("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 3.5)
            .attr("fill", color)
            .transition()
            .duration(active ? 700 : 0)
            .delay(si * 120)
            .attr("cx", (d, i) => pointFor(i, d.value / 100)[0])
            .attr("cy", (d, i) => pointFor(i, d.value / 100)[1]);
        });
        return;
      }

      // Mode simple : le tracé part du centre (toutes valeurs à 0) puis
      // s'anime vers ses vraies valeurs, avec la valeur numérique affichée
      // sous chaque étiquette d'axe une fois active.
      data.forEach((d, i) => {
        const [x, y] = pointFor(i, 1.22);
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

      const shape = g
        .append("polygon")
        .attr("points", shapePointsFor(data, () => 0))
        .attr("fill", CORAL)
        .attr("fill-opacity", 0.22)
        .attr("stroke", CORAL)
        .attr("stroke-width", 2);

      shape
        .transition()
        .duration(active ? 700 : 0)
        .attr("points", shapePointsFor(data, (d) => d.value / 100));

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
    [active, data, series]
  );

  return (
    <>
      <svg ref={ref} viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full text-[var(--gambeta-ink)]" />
      {series && (
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
          {series.map((s, i) => (
            <span key={s.name} className="flex items-center gap-1.5 font-medium">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: s.color ?? SERIES_COLORS[i % SERIES_COLORS.length] }}
              />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

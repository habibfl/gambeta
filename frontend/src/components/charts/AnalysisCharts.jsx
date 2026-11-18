import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { LEAGUE_COLORS, seasonLabel } from "../../lib/leagues";
import { appendSticker } from "../../lib/svgSticker";
import Crest from "../Crest";
import PlayerPhoto from "../PlayerPhoto";
import { finishingFaces } from "../../lib/finishing";

// Graphiques de la page « Analyses ».

const CORAL = "#e86f2c";
const INK_SOFT = "currentColor";

const fr = (v, digits = 2) => v.toFixed(digits).replace(".", ",");

function useD3(render, deps) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) render(d3.select(ref.current));
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}

// Infobulle HTML positionnée au-dessus du point survolé.
function Tooltip({ tip }) {
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-current/10 bg-[var(--gambeta-paper)] px-3 py-2 text-xs shadow-lg"
      style={{ left: tip.x, top: tip.y - 10 }}
    >
      {tip.lines.map((line, i) => (
        <p key={i} className={i === 0 ? "font-semibold" : "text-current/70"}>
          {line}
        </p>
      ))}
    </div>
  );
}

function axisStyle(g) {
  g.select(".domain").attr("stroke", INK_SOFT).attr("stroke-opacity", 0.2);
  g.selectAll(".tick line").remove();
  g.selectAll("text").attr("fill", INK_SOFT).attr("opacity", 0.55).style("font-size", "11px");
}

function gridStyle(g) {
  g.select(".domain").remove();
  g.selectAll("text").remove();
  g.selectAll("line").attr("stroke", INK_SOFT).attr("stroke-opacity", 0.08);
}

// Position (en px) d'un point SVG dans le conteneur, pour l'infobulle.
function tipPosition(svgNode, event) {
  const rect = svgNode.parentNode.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

// Écarte verticalement les étiquettes qui se chevauchent
function dodgeLabels(selection) {
  const nodes = selection.nodes().sort((a, b) => a.getBBox().y - b.getBBox().y);
  const placed = [];
  nodes.forEach((node) => {
    let box = node.getBBox();
    let guard = 0;
    while (
      guard < 20 &&
      placed.some(
        (p) => box.x < p.x + p.width && p.x < box.x + box.width && box.y < p.y + p.height + 3 && p.y < box.y + box.height + 3
      )
    ) {
      node.setAttribute("y", Number(node.getAttribute("y")) + 4);
      box = node.getBBox();
      guard += 1;
    }
    placed.push(box);
  });
}

// 1. Buts par match, 5 championnats x 5 saisons
export function GoalsLineChart({ data, seasons }) {
  const [tip, setTip] = useState(null);
  const W = 720;
  const H = 360;
  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      const m = { top: 16, right: 150, bottom: 32, left: 44 };
      const iw = W - m.left - m.right;
      const ih = H - m.top - m.bottom;
      const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
      const all = data.flatMap((d) => d.values.map((v) => v.value));
      const x = d3.scalePoint().domain(seasons).range([0, iw]).padding(0.1);
      const y = d3.scaleLinear().domain([d3.min(all) - 0.1, d3.max(all) + 0.1]).range([ih, 0]);
      g.append("g").call(d3.axisLeft(y).ticks(5).tickSize(-iw)).call(gridStyle);
      g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).tickFormat(seasonLabel)).call(axisStyle);
      g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((v) => fr(v, 1))).call(axisStyle);

      const line = d3.line().x((v) => x(v.season)).y((v) => y(v.value));
      data.forEach((serie) => {
        const color = LEAGUE_COLORS[serie.league];
        g.append("path").datum(serie.values).attr("fill", "none").attr("stroke", color).attr("stroke-width", 2.2).attr("d", line);
        g.selectAll(null)
          .data(serie.values)
          .join("circle")
          .attr("cx", (v) => x(v.season))
          .attr("cy", (v) => y(v.value))
          .attr("r", 5)
          .attr("fill", color)
          .attr("stroke", "var(--gambeta-paper)")
          .attr("stroke-width", 2)
          .style("cursor", "pointer")
          .on("mouseenter", (event, v) =>
            setTip({ ...tipPosition(svg.node(), event), lines: [serie.league, `${seasonLabel(v.season)} : ${fr(v.value)} buts par match`] })
          )
          .on("mouseleave", () => setTip(null));
        const last = serie.values[serie.values.length - 1];
        g.append("text")
          .attr("x", x(last.season) + 10)
          .attr("y", y(last.value) + 4)
          .attr("fill", INK_SOFT)
          .style("font-size", "12px")
          .text(`${serie.league}  ${fr(last.value)}`);
      });
    },
    [data, seasons]
  );
  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full text-[var(--gambeta-ink)]" />
      <Tooltip tip={tip} />
    </div>
  );
}

// 2. Avantage du terrain (barres empilées HTML)
export function HomeAdvantageBars({ data }) {
  const parts = [
    { key: "home", label: "Victoire à domicile", color: CORAL, text: "text-white" },
    { key: "draw", label: "Nul", color: "rgba(150,140,128,0.35)", text: "" },
    { key: "away", label: "Victoire à l'extérieur", color: "#221400", text: "text-white" },
  ];
  return (
    <div>
      <div className="space-y-3">
        {data.map((row) => (
          <div key={row.league} className="grid grid-cols-[110px_1fr] items-center gap-3 text-sm">
            <span className="text-current/70">{row.league}</span>
            <div className="flex h-8 overflow-hidden rounded-md">
              {parts.map((p) => (
                <div
                  key={p.key}
                  title={`${p.label} : ${Math.round(row[p.key] * 100)} %`}
                  className={`flex items-center justify-center border-r-2 border-[var(--gambeta-paper)] text-xs font-bold last:border-r-0 ${p.text}`}
                  style={{ width: `${row[p.key] * 100}%`, background: p.color }}
                >
                  {Math.round(row[p.key] * 100)} %
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-current/60">
        {parts.map((p) => (
          <span key={p.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// 3. Écart champion / dauphin (grille)
export function TitleGapGrid({ titles, seasons, leagues, logoFor = () => null }) {
  const max = Math.max(...titles.map((t) => t.gap));
  const color = (gap) => d3.interpolateRgb("#fbe9dd", "#8f3a10")(gap / max);
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[620px] gap-1" style={{ gridTemplateColumns: `120px repeat(${seasons.length}, 1fr)` }}>
        <span />
        {seasons.map((s) => (
          <span key={s} className="pb-1 text-center text-xs text-current/50">
            {seasonLabel(s)}
          </span>
        ))}
        {leagues.map((lg) => (
          <div key={lg} className="contents">
            <span className="flex items-center text-sm text-current/70">{lg}</span>
            {seasons.map((s) => {
              const t = titles.find((x) => x.league === lg && x.season === s);
              const dark = t.gap > max * 0.55;
              return (
                <div
                  key={s}
                  title={`${t.champion} champion avec ${t.points} pts, devant ${t.runner_up}`}
                  className={`rounded-md px-2 py-2.5 text-center ${dark ? "text-white" : "text-[#221400]"}`}
                  style={{ background: color(t.gap) }}
                >
                  <span className="mx-auto mb-1 flex justify-center">
                    <Crest team={t.champion} league={lg} logo={logoFor(t.champion)} size={26} sticker />
                  </span>
                  <p className="text-sm font-bold">{t.gap === 0 ? "égalité" : `+${t.gap} pt${t.gap > 1 ? "s" : ""}`}</p>
                  <p className="truncate text-[11px] opacity-80">{t.champion}</p>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. Points par match vs différence de buts par match
// `seasons` : saisons de la période choisie (filtre global de la page).
export function PointsScatter({ model, league, seasons: period, logoFor = () => null }) {
  const [tip, setTip] = useState(null);
  const W = 720;
  const H = 440;
  const logoSig = model.teams.filter((t) => period.includes(t.season)).map((t) => logoFor(t.team) || "").join("|");
  const periodKey = period.join(",");
  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      const m = { top: 14, right: 18, bottom: 42, left: 48 };
      const iw = W - m.left - m.right;
      const ih = H - m.top - m.bottom;
      const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
      const teams = model.teams;
      const x = d3.scaleLinear().domain(d3.extent(teams, (t) => t.gd_pm)).nice().range([0, iw]);
      const y = d3.scaleLinear().domain(d3.extent(teams, (t) => t.pts_pm)).nice().range([ih, 0]);
      g.append("g").call(d3.axisLeft(y).ticks(6).tickSize(-iw)).call(gridStyle);
      g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).ticks(6)).call(axisStyle);
      g.append("g").call(d3.axisLeft(y).ticks(6)).call(axisStyle);
      g.append("text").attr("x", iw / 2).attr("y", ih + 36).attr("text-anchor", "middle").attr("fill", INK_SOFT).attr("opacity", 0.55).style("font-size", "11px").text("Différence de buts par match →");
      g.append("text").attr("transform", "rotate(-90)").attr("x", -ih / 2).attr("y", -36).attr("text-anchor", "middle").attr("fill", INK_SOFT).attr("opacity", 0.55).style("font-size", "11px").text("Points par match ↑");

      const [x0, x1] = x.domain();
      g.append("line")
        .attr("x1", x(x0)).attr("x2", x(x1))
        .attr("y1", y(model.intercept + model.slope * x0)).attr("y2", y(model.intercept + model.slope * x1))
        .attr("stroke", INK_SOFT).attr("stroke-opacity", 0.6).attr("stroke-dasharray", "5 4");

      const inScope = (t) => (league === "all" || t.league === league) && period.includes(t.season);
      const visible = teams.filter(inScope);
      const extremes = new Set(
        [...visible].sort((a, b) => b.delta - a.delta).slice(0, 4).concat([...visible].sort((a, b) => a.delta - b.delta).slice(0, 4))
      );
      // Plus de 200 équipes-saisons : écussons pour les 8 cas extrêmes seulement (illisible sinon)
      const crested = visible.length > 200 ? [...extremes] : visible;
      const crestSet = new Set(crested);

      // Fond : les autres équipes-saisons, en gris très léger (contexte)
      g.selectAll(null)
        .data(teams.filter((t) => !crestSet.has(t)))
        .join("circle")
        .attr("cx", (t) => x(t.gd_pm))
        .attr("cy", (t) => y(t.pts_pm))
        .attr("r", 3)
        .attr("fill", INK_SOFT)
        .attr("fill-opacity", (t) => (inScope(t) ? 0.22 : 0.06))
        .style("pointer-events", "none");

      const tipFor = (event, t) =>
        setTip({
          ...tipPosition(svg.node(), event),
          lines: [
            `${t.team} · ${seasonLabel(t.season)}`,
            `${t.league}, ${t.rank}ᵉ avec ${t.points} pts (diff. de buts ${t.gd > 0 ? "+" : ""}${t.gd})`,
            `${t.delta > 0 ? "+" : ""}${fr(t.delta, 1)} pts par rapport à la tendance`,
          ],
        });

      const stickers = g
        .selectAll(null)
        .data([...crested].sort((a, b) => extremes.has(a) - extremes.has(b)))
        .join("g")
        .attr("transform", (t) => `translate(${x(t.gd_pm)},${y(t.pts_pm)})`)
        .style("cursor", "pointer")
        .on("mouseenter", tipFor)
        .on("mouseleave", () => setTip(null));
      appendSticker(
        stickers,
        (t) => ({
          href: logoFor(t.team),
          label: `${t.team} ${seasonLabel(t.season)}`,
          league: t.league,
          ring: extremes.has(t) ? (t.delta > 0 ? CORAL : "#3d6fb6") : undefined,
        }),
        (t) => (extremes.has(t) ? 12 : 9)
      );

      g.selectAll(null)
        .data([...extremes])
        .join("text")
        .attr("x", (t) => x(t.gd_pm) + (x(t.gd_pm) > iw * 0.75 ? -18 : 18))
        .attr("y", (t) => y(t.pts_pm) + 4)
        .attr("text-anchor", (t) => (x(t.gd_pm) > iw * 0.75 ? "end" : "start"))
        .attr("fill", (t) => (t.delta > 0 ? CORAL : "#3d6fb6"))
        .attr("stroke", "var(--gambeta-paper)")
        .attr("stroke-width", 3)
        .attr("paint-order", "stroke")
        .style("font-size", "10.5px")
        .style("font-weight", 700)
        .style("pointer-events", "none")
        .text((t) => `${t.team}${period.length > 1 ? ` ${t.season.slice(0, 2)}-${t.season.slice(2)}` : ""} ${t.delta > 0 ? "+" : ""}${fr(t.delta, 1)}`)
        .call(dodgeLabels);
    },
    [model, league, periodKey, logoSig]
  );
  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full text-[var(--gambeta-ink)]" />
      <Tooltip tip={tip} />
    </div>
  );
}

// 5. Buts réels vs xG (joueurs 2025-26)
export function FinishingScatter({ players, league, photoFor = () => null }) {
  const [tip, setTip] = useState(null);
  const photoSig = finishingFaces(players, league).faces.map((p) => photoFor(p.player) || "").join("|");
  const W = 720;
  const H = 440;
  const ref = useD3(
    (svg) => {
      svg.selectAll("*").remove();
      const m = { top: 12, right: 16, bottom: 42, left: 44 };
      const iw = W - m.left - m.right;
      const ih = H - m.top - m.bottom;
      const g = svg.append("g").attr("transform", `translate(${m.left},${m.top})`);
      const lim = Math.ceil(Math.max(...players.map((p) => Math.max(p.xg, p.goals))) + 2);
      const x = d3.scaleLinear().domain([0, lim]).range([0, iw]);
      const y = d3.scaleLinear().domain([0, lim]).range([ih, 0]);
      g.append("g").call(d3.axisLeft(y).ticks(7).tickSize(-iw)).call(gridStyle);
      g.append("g").attr("transform", `translate(0,${ih})`).call(d3.axisBottom(x).ticks(7)).call(axisStyle);
      g.append("g").call(d3.axisLeft(y).ticks(7)).call(axisStyle);
      g.append("text").attr("x", iw / 2).attr("y", ih + 36).attr("text-anchor", "middle").attr("fill", INK_SOFT).attr("opacity", 0.55).style("font-size", "11px").text("Buts attendus (xG) →");
      g.append("text").attr("transform", "rotate(-90)").attr("x", -ih / 2).attr("y", -32).attr("text-anchor", "middle").attr("fill", INK_SOFT).attr("opacity", 0.55).style("font-size", "11px").text("Buts réels ↑");
      g.append("line").attr("x1", x(0)).attr("y1", y(0)).attr("x2", x(lim)).attr("y2", y(lim)).attr("stroke", INK_SOFT).attr("stroke-opacity", 0.55).attr("stroke-dasharray", "5 4");
      g.append("text").attr("x", x(lim * 0.82)).attr("y", y(lim * 0.82) + 16).attr("fill", INK_SOFT).attr("opacity", 0.6).style("font-size", "10px").text("buts = xG");

      const { extremes: ext, faces } = finishingFaces(players, league);
      const extremes = new Set(ext);
      const faceSet = new Set(faces);
      const inPool = (p) => league === "all" || p.league === league;

      // Fond : tous les autres joueurs, en petits points gris (la densité)
      g.selectAll(null)
        .data(players.filter((p) => !faceSet.has(p)))
        .join("circle")
        .attr("cx", (p) => x(p.xg))
        .attr("cy", (p) => y(p.goals))
        .attr("r", 2.6)
        .attr("fill", INK_SOFT)
        .attr("fill-opacity", (p) => (inPool(p) ? 0.2 : 0.04))
        .style("pointer-events", "none");

      const stickers = g
        .selectAll(null)
        .data(faces)
        .join("g")
        .attr("transform", (p) => `translate(${x(p.xg)},${y(p.goals)})`)
        .style("cursor", "pointer")
        .on("mouseenter", (event, p) =>
          setTip({
            ...tipPosition(svg.node(), event),
            lines: [`${p.player} (${p.team})`, `${p.goals} buts pour ${fr(p.xg, 1)} xG`, `${p.diff > 0 ? "+" : ""}${fr(p.diff, 1)} buts · ${p.minutes} min`],
          })
        )
        .on("mouseleave", () => setTip(null));
      appendSticker(
        stickers,
        (p) => ({
          href: photoFor(p.player),
          label: p.player,
          league: p.league,
          kind: "face",
          ring: extremes.has(p) ? (p.diff > 0 ? CORAL : "#3d6fb6") : undefined,
        }),
        13
      );
      g.selectAll(null)
        .data(faces)
        .join("text")
        .attr("x", (p) => x(p.xg) + (x(p.xg) > iw * 0.75 ? -18 : 18))
        .attr("y", (p) => y(p.goals) + 4)
        .attr("text-anchor", (p) => (x(p.xg) > iw * 0.75 ? "end" : "start"))
        .attr("fill", (p) => (!extremes.has(p) ? INK_SOFT : p.diff > 0 ? CORAL : "#3d6fb6"))
        .attr("stroke", "var(--gambeta-paper)")
        .attr("stroke-width", 3)
        .attr("paint-order", "stroke")
        .style("font-size", "10.5px")
        .style("font-weight", 700)
        .style("pointer-events", "none")
        .text((p) => `${p.player.split(" ").slice(-1)[0]} (${p.diff > 0 ? "+" : ""}${fr(p.diff, 1)})`)
        .call(dodgeLabels);
    },
    [players, league, photoSig]
  );
  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full text-[var(--gambeta-ink)]" />
      <Tooltip tip={tip} />
    </div>
  );
}

// 6. Profils K-means (grille divergente)
export function ProfilesGrid({ profiles }) {
  const lim = Math.max(...profiles.groups.flatMap((g) => g.values.map(Math.abs)));
  const color = (v) =>
    v >= 0 ? d3.interpolateRgb("#f0efec", CORAL)(v / lim) : d3.interpolateRgb("#f0efec", "#3d6fb6")(-v / lim);
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[640px] gap-1" style={{ gridTemplateColumns: `200px repeat(${profiles.features.length}, 1fr)` }}>
        <span />
        {profiles.features.map((f) => (
          <span key={f} className="pb-1 text-center text-[11px] leading-tight text-current/55">
            {f}
          </span>
        ))}
        {profiles.groups.map((grp) => (
          <div key={grp.name} className="contents">
            <span className="flex flex-col justify-center pr-2 text-sm">
              <span className="font-semibold">{grp.name}</span>
              <span className="mt-1 flex items-center gap-1">
                {grp.examples.slice(0, 3).map((name) => (
                  <span key={name} title={name}>
                    <PlayerPhoto name={name} size={24} ring={false} />
                  </span>
                ))}
                <span className="ml-1 text-[11px] text-current/50">{grp.players} joueurs</span>
              </span>
            </span>
            {grp.values.map((v, i) => (
              <div
                key={i}
                title={`${grp.name} · ${profiles.features[i]} : ${v > 0 ? "+" : ""}${fr(v, 1)} écart-type`}
                className={`flex items-center justify-center rounded-md py-3 text-sm tabular-nums ${Math.abs(v) > lim * 0.75 ? "text-white" : "text-[#221400]"}`}
                style={{ background: color(v) }}
              >
                {v > 0 ? "+" : ""}
                {fr(v, 1)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

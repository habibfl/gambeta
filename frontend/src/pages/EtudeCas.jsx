import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageHero, { HeroStat } from "../components/PageHero";
import { PageBody, Section, ChartCard, FilterBar, ChipGroup, FilterLabel, Takeaways } from "../components/layout/PageKit";
import { ApiError, ApiSkeleton } from "../components/ApiState";
import Crest from "../components/Crest";
import PlayerPhoto from "../components/PlayerPhoto";
import { PlayerMap } from "../components/comparator/ComparatorBlocks";
import { usePlayers } from "../hooks/usePlayers";
import { useTeamLogos } from "../hooks/useTeamLogos";
import { METRIC, formatMetric, percentileOf } from "../lib/metrics";
import insights from "../data/insights.json";

// Critères du profil recherché et pondérations par défaut
const CRITERIA = [
  { key: "xa90", short: "Création", weight: 3, why: "qualité des passes qui mènent à un tir" },
  { key: "chain90", short: "Implication", weight: 2, why: "présence dans les actions dangereuses" },
  { key: "npxg90", short: "Menace", weight: 2, why: "qualité des tirs, hors penalty" },
  { key: "drawn90", short: "Percussion", weight: 1, why: "fautes provoquées, indicateur de dribble" },
  { key: "def90", short: "Repli", weight: 1, why: "tacles gagnés et interceptions" },
];

// Classement final 2025-26 de chaque club (rang et taille du championnat)
const RANKS = (() => {
  const teams = insights.points_model.teams.filter((t) => t.season === "2526");
  const size = {};
  teams.forEach((t) => (size[t.league] = (size[t.league] ?? 0) + 1));
  return Object.fromEntries(teams.map((t) => [t.team, { rank: t.rank, size: size[t.league] }]));
})();

const MIN_MINUTES = 1500;

function Weight({ c, value, onChange }) {
  return (
    <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wide text-current/55">
      {c.short} : <b className="text-current">{value}</b>
      <input type="range" min={0} max={5} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-28 accent-[#e86f2c]" />
    </label>
  );
}

export default function EtudeCas() {
  const { players, loading, error } = usePlayers();
  const logoFor = useTeamLogos();
  const [weights, setWeights] = useState(() => Object.fromEntries(CRITERIA.map((c) => [c.key, c.weight])));
  const [scope, setScope] = useState("basse");
  const [roles, setRoles] = useState("both");

  const result = useMemo(() => {
    const pool = players.filter(
      (p) => p.minutes >= MIN_MINUTES && (roles === "both" ? ["Attaquant", "Milieu"].includes(p.position) : p.position === roles)
    );
    const sorted = Object.fromEntries(
      CRITERIA.map((c) => [c.key, pool.map((p) => METRIC[c.key].get(p.raw)).filter((v) => v != null).sort((a, b) => a - b)])
    );
    const total = CRITERIA.reduce((s, c) => s + weights[c.key], 0) || 1;
    const scored = pool.map((p) => {
      const pct = Object.fromEntries(CRITERIA.map((c) => [c.key, percentileOf(sorted[c.key], METRIC[c.key].get(p.raw)) ?? 0]));
      const score = CRITERIA.reduce((s, c) => s + weights[c.key] * pct[c.key], 0) / total;
      const club = RANKS[p.team];
      return { p, pct, score, club, lowerHalf: club ? club.rank > club.size / 2 : false };
    });
    const candidates = scored.filter((d) => (scope === "basse" ? d.lowerHalf : true)).sort((a, b) => b.score - a.score);
    return { poolSize: pool.length, candidates, shortlist: candidates.slice(0, 10) };
  }, [players, weights, scope, roles]);

  const top = result.shortlist[0];
  const best3 = top ? [...CRITERIA].sort((a, b) => top.pct[b.key] - top.pct[a.key]).slice(0, 3) : [];

  return (
    <>
      <PageHero
        eyebrow="Étude de cas · Recrutement"
        title="Trouver un ailier créateur à moindre coût"
        subtitle="Un club de milieu de tableau doit remplacer son meilleur passeur. Méthode : définir le profil, le traduire en indicateurs, classer les candidats et formuler une recommandation."
        accent="#1a9a5b"
      >
        <div className="flex flex-wrap gap-3">
          <HeroStat value={result.poolSize || "…"} label={`joueurs (${MIN_MINUTES} min +)`} />
          <HeroStat value={CRITERIA.length} label="critères pondérés" />
          <HeroStat value={result.candidates.length || "…"} label="candidats retenus" />
        </div>
      </PageHero>

      <FilterBar>
        <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
          <FilterLabel>Pondérations</FilterLabel>
          {CRITERIA.map((c) => (
            <Weight key={c.key} c={c} value={weights[c.key]} onChange={(v) => setWeights((w) => ({ ...w, [c.key]: v }))} />
          ))}
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <ChipGroup
            label="Clubs"
            value={scope}
            onChange={setScope}
            options={[
              { value: "basse", label: "Moitié basse du classement" },
              { value: "tous", label: "Tous les clubs" },
            ]}
          />
          <ChipGroup
            label="Poste"
            value={roles}
            onChange={setRoles}
            options={[
              { value: "both", label: "Attaquants et milieux" },
              { value: "Attaquant", label: "Attaquants" },
              { value: "Milieu", label: "Milieux" },
            ]}
          />
        </div>
      </FilterBar>

      <PageBody>
        {loading ? (
          <ApiSkeleton className="mt-10 h-96 w-full" />
        ) : error ? (
          <ApiError message="Impossible de charger les joueurs." />
        ) : (
          <>
            <Section kicker="1 · Le besoin" title="Traduire un profil en indicateurs">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ChartCard title="Hypothèses">
                  <ul className="space-y-2 text-[14px] leading-relaxed text-current/75">
                    <li>Profil recherché : un joueur offensif qui crée des occasions, participe au jeu et menace le but.</li>
                    <li>
                      Budget limité : sans données de valeur marchande, les candidats sont cherchés par défaut dans les clubs
                      de la moitié basse du classement 2025-26, plus susceptibles de vendre.
                    </li>
                    <li>Fiabilité : au moins {MIN_MINUTES} minutes jouées en 2025-26.</li>
                    <li>Les données ne distinguent pas les ailiers des autres attaquants : le profil est défini par les statistiques, le poste exact se vérifie ensuite en vidéo.</li>
                  </ul>
                </ChartCard>
                <ChartCard title="Critères (percentiles parmi les joueurs comparables)">
                  <ul className="space-y-2 text-[14px]">
                    {CRITERIA.map((c) => (
                      <li key={c.key} className="flex justify-between gap-4">
                        <span>
                          <b>{c.short}</b> <span className="text-current/60">· {c.why}</span>
                        </span>
                        <span className="font-mono text-[12px] text-current/55">poids {weights[c.key]}</span>
                      </li>
                    ))}
                  </ul>
                </ChartCard>
              </div>
            </Section>

            <Section
              kicker="2 · Classement"
              title="Les dix meilleurs candidats"
              intro="Score = moyenne pondérée des percentiles. Modifiez les pondérations dans la barre du haut pour tester la sensibilité du classement."
            >
              <div className="overflow-x-auto rounded-2xl border border-current/10">
                <table className="w-full min-w-[760px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-current/10 bg-current/[0.02] text-left font-mono text-[11px] uppercase tracking-wide text-current/50">
                      <th className="px-3 py-3">#</th>
                      <th className="px-3 py-3">Joueur</th>
                      <th className="px-3 py-3">Club (rang)</th>
                      {CRITERIA.map((c) => (
                        <th key={c.key} className="px-3 py-3 text-right">
                          {c.short}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.shortlist.map((d, i) => (
                      <tr key={d.p.slug + d.p.team} className="border-t border-current/5">
                        <td className="px-3 py-2.5 font-mono text-current/50">{i + 1}</td>
                        <td className="px-3 py-2.5">
                          <Link to={`/joueurs/${d.p.slug}`} className="flex items-center gap-2 font-semibold hover:text-[#e86f2c]">
                            <PlayerPhoto name={d.p.name} league={d.p.leagueLabel} size={28} ring={false} fetchPhoto={i < 5} />
                            {d.p.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="flex items-center gap-2">
                            <Crest team={d.p.team} league={d.p.leagueLabel} logo={logoFor(d.p.team)} size={18} />
                            {d.p.team}
                            {d.club && <span className="text-current/50">({d.club.rank}ᵉ)</span>}
                          </span>
                        </td>
                        {CRITERIA.map((c) => (
                          <td key={c.key} className="px-3 py-2.5 text-right tabular-nums" style={{ color: d.pct[c.key] >= 90 ? "#e86f2c" : undefined, fontWeight: d.pct[c.key] >= 90 ? 700 : 400 }}>
                            {d.pct[c.key]}
                          </td>
                        ))}
                        <td className="px-3 py-2.5 text-right font-bold tabular-nums">{d.score.toFixed(1).replace(".", ",")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section
              kicker="3 · Position"
              title="Les trois premiers parmi tous les joueurs"
              intro="Les trois meilleurs candidats placés dans le nuage de tous les joueurs ayant joué au moins 450 minutes."
            >
              <ChartCard>
                <PlayerMap players={result.shortlist.slice(0, 3).map((d) => d.p)} allPlayers={players} minMinutes={450} />
              </ChartCard>
            </Section>

            {top && (
              <Section kicker="4 · Recommandation" title={`Priorité : ${top.p.name}`}>
                <Takeaways
                  title="Synthèse"
                  items={[
                    `${top.p.name} (${top.p.team}, ${top.club?.rank ?? "?"}ᵉ de ${top.p.leagueLabel}) obtient le meilleur score, ${top.score
                      .toFixed(1)
                      .replace(".", ",")} sur 100, avec ses meilleurs percentiles en ${best3.map((c) => c.short.toLowerCase()).join(", ")}.`,
                    `Alternatives à suivre : ${result.shortlist
                      .slice(1, 3)
                      .map((d) => `${d.p.name} (${d.p.team})`)
                      .join(" et ")}.`,
                    `Valeurs clés : ${CRITERIA.slice(0, 3)
                      .map((c) => `${METRIC[c.key].label.replace(/ \(.*\)$/, "")} ${formatMetric(c.key, METRIC[c.key].get(top.p.raw))}`)
                      .join(" · ")}.`,
                    "Limites : pas de données d'âge, de contrat ni de valeur marchande, et une seule saison de xG. La liste sert à prioriser le travail de scouting vidéo, pas à le remplacer.",
                  ]}
                />
              </Section>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}

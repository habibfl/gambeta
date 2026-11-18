import { Section as KitSection, ChartCard } from "../components/layout/PageKit";
import { useState } from "react";
import { useTeamLogos } from "../hooks/useTeamLogos";
import { usePhotoImages } from "../hooks/usePhotoImages";
import { finishingFaces } from "../lib/finishing";
import PeriodFilter from "../components/story/PeriodFilter";
import { periodSeasons, periodLabel } from "../lib/period";
import { useApiData } from "../hooks/useApiData";
import SignificancePlot from "../components/charts/SignificancePlot";
import SampleSizeDemo from "../components/explainers/SampleSizeDemo";
import stats from "../data/stats.json";
import { LEAGUE_SLUGS } from "../lib/leagues";
import { Link } from "react-router-dom";
import PageHero, { HeroStat } from "../components/PageHero";
import Term from "../components/Term";
import insights from "../data/insights.json";
import {
  FinishingScatter,
  GoalsLineChart,
  HomeAdvantageBars,
  PointsScatter,
  ProfilesGrid,
  TitleGapGrid,
} from "../components/charts/AnalysisCharts";
import { LEAGUE_COLORS, seasonLabel } from "../lib/leagues";

// Page « Analyses » : les 5 questions du notebook (analysis/ gambeta_analyses.ipynb)

const LEAGUES = Object.keys(LEAGUE_COLORS);
const fr = (v, d = 1) => v.toFixed(d).replace(".", ",");
const pct = (v) => `${v > 0 ? "+" : "−"}${Math.round(Math.abs(v) * 100)} %`;

function Section({ id, number, question, intro, children, takeaways }) {
  return (
    <KitSection id={id} kicker={`Question ${number}`} title={question} intro={intro} takeaways={takeaways}>
      {children}
    </KitSection>
  );
}

function LeagueFilter({ value, onChange }) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {["all", ...LEAGUES].map((lg) => (
        <button
          key={lg}
          type="button"
          onClick={() => onChange(lg)}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${
            value === lg ? "border-[#e86f2c] bg-[#e86f2c] text-white" : "border-current/15 hover:border-current/40"
          }`}
        >
          {lg === "all" ? "Tous les championnats" : lg}
        </button>
      ))}
    </div>
  );
}

function StatTile({ value, label }) {
  return (
    <div className="rounded-xl border border-current/10 bg-current/[0.02] px-4 py-4 text-center">
      <p className="text-2xl font-bold tabular-nums md:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-current/60">{label}</p>
    </div>
  );
}

export default function Analyses() {
  // Filtre global de la page : période + championnat, appliqués à toutes les questions
  const [period, setPeriod] = useState({ from: insights.seasons[0], to: insights.seasons[insights.seasons.length - 1] });
  const [pageLeague, setPageLeague] = useState("all");
  const chosen = periodSeasons(insights.seasons, period);
  const scatterLeague = pageLeague;
  const finishLeague = pageLeague;
  const leaguesShown = pageLeague === "all" ? LEAGUES : [pageLeague];
  const has2526 = chosen.includes("2526");
  // Avantage du terrain recalculé par l'API pour la période choisie
  const homeApi = useApiData(`/api/data/home-advantage?seasons=${chosen.join(",")}`);
  const homeRows = homeApi.data
    ? homeApi.data.leagues.map((r) => ({ ...r, league: LEAGUE_SLUGS[r.slug] ?? r.league }))
    : chosen.length === insights.seasons.length
      ? insights.home_advantage
      : null;
  const logoFor = useTeamLogos();
  // Visages : joueurs annotés du nuage de finition + exemples des profils
  const faceNames = [
    ...finishingFaces(insights.finishing.players, finishLeague).faces.map((p) => p.player),
  ];
  const faces = usePhotoImages(faceNames);
  const photoFor = (name) => faces[name]?.src ?? null;
  const { seasons, counts, persistence: per, points_model: model, finishing } = insights;

  // Quelques chiffres calculés ici pour les textes, à partir du JSON.
  const goals = Object.fromEntries(insights.goals_per_match.map((g) => [g.league, g.values]));
  const first = (lg) => goals[lg][0].value;
  const last = (lg) => goals[lg][goals[lg].length - 1].value;
  const gapAvg = (lg) => {
    const t = insights.titles.filter((x) => x.league === lg);
    return t.reduce((s, x) => s + x.gap, 0) / t.length;
  };
  const champions = (lg) => new Set(insights.titles.filter((x) => x.league === lg).map((x) => x.champion)).size;
  const top = (arr, key, n, dir = -1) => [...arr].sort((a, b) => dir * (a[key] - b[key])).slice(0, n);
  const bestFinisher = top(finishing.players, "diff", 1)[0];
  const worstFinisher = top(finishing.players, "diff", 1, 1)[0];
  const luckiest = top(model.teams, "delta", 1)[0];
  const unluckiest = top(model.teams, "delta", 1, 1)[0];
  const home = Object.fromEntries(insights.home_advantage.map((h) => [h.league, h]));

  const sections = [
    ["q1", "Buts et avantage du terrain"],
    ["q2", "Course au titre"],
    ["q3", "Chance ou niveau ?"],
    ["q4", "Les finisseurs"],
    ["q5", "Profils de joueurs"],
  ];

  return (
    <>
      <PageHero
        eyebrow="Analyses"
        title="Ce que les données disent des 5 grands championnats"
        subtitle={
          <>
            Cinq questions, cinq réponses chiffrées, de {seasonLabel(seasons[0])} à {seasonLabel(seasons[seasons.length - 1])}.
            Chaque graphique est interactif : survolez un point pour voir le détail. Tout est reproductible dans le{" "}
            <a
              href="https://github.com/habibfl/gambeta/blob/main/analysis/gambeta_analyses.ipynb"
              className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
            >
              notebook Python du projet
            </a>
            .
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <HeroStat value={counts.matches.toLocaleString("fr-FR")} label="matchs analysés" />
          <HeroStat value={seasons.length} label="saisons" />
          <HeroStat value={counts.team_seasons} label="équipes-saisons" />
          <HeroStat value={counts.players_2526.toLocaleString("fr-FR")} label="joueurs (2025-26)" />
        </div>
      </PageHero>
      <div className="flex-1 px-6 pb-24 pt-10 text-[var(--gambeta-ink)] md:px-12">
        <div className="mx-auto max-w-[1000px]">
          {/* Sommaire */}
          <nav className="sticky sticky-under-nav z-30 -mx-2 space-y-2 border-b border-current/10 bg-[var(--gambeta-paper)]/95 px-2 py-3 backdrop-blur">
            <div className="flex flex-wrap gap-2">
              {sections.map(([id, label], i) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className="rounded-full border border-current/15 px-3 py-1 text-[13px] hover:border-[#e86f2c] hover:text-[#e86f2c]"
                >
                  {i + 1}. {label}
                </a>
              ))}
            </div>
            {/* Filtre global : s'applique à tous les graphiques de la page */}
            <div className="flex flex-col gap-2 border-t border-current/10 pt-2 lg:flex-row lg:items-center lg:justify-between">
              <PeriodFilter seasons={insights.seasons} value={period} onChange={setPeriod} />
              <LeagueFilter value={pageLeague} onChange={setPageLeague} />
            </div>
            <p className="text-[11px] text-current/55">
              Graphiques : {periodLabel(period)}
              {pageLeague !== "all" ? ` · ${pageLeague}` : ""}. Les encadrés « à retenir » résument les 5 saisons.
            </p>
          </nav>

          {/* Q1 */}
          <Section
            id="q1"
            number={1}
            question="Les championnats ont-ils changé en 5 saisons ?"
            intro="Le nombre moyen de buts par match, saison après saison, puis la répartition des résultats entre victoires à domicile, nuls et victoires à l'extérieur."
            takeaways={[
              `La Bundesliga est le championnat le plus prolifique : plus de 3,1 buts par match chaque saison (${fr(last("Bundesliga"), 2)} en 2025-26).`,
              `La Serie A marque de moins en moins : de ${fr(first("Serie A"), 2)} à ${fr(last("Serie A"), 2)} buts par match, soit ${Math.round((1 - last("Serie A") / first("Serie A")) * 100)} % de buts en moins en 5 saisons.`,
              `Jouer à domicile reste un vrai avantage partout. Il est le plus fort en Liga (${Math.round(home.Liga.home * 100)} % de victoires à domicile contre ${Math.round(home.Liga.away * 100)} % à l'extérieur) et le plus faible en Serie A, qui compte aussi le plus de nuls (${Math.round(home["Serie A"].draw * 100)} %).`,
            ]}
          >
            <ChartCard title="Buts par match, saison par saison">
              <GoalsLineChart
                data={insights.goals_per_match
                  .filter((g) => leaguesShown.includes(g.league))
                  .map((g) => ({ ...g, values: g.values.filter((v) => chosen.includes(v.season)) }))}
                seasons={chosen}
              />
            </ChartCard>
            <ChartCard title={`Répartition des résultats (${periodLabel(period)})`}>
              {homeRows ? (
                <HomeAdvantageBars data={homeRows.filter((r) => leaguesShown.includes(r.league))} />
              ) : (
                <p className="text-sm text-current/60">Chargement de la période depuis l'API…</p>
              )}
            </ChartCard>
            <ChartCard
              title="Significativité : part des victoires à domicile (hors nuls), intervalle de confiance à 95 %"
              note="Méthode : intervalle de Wilson et test binomial « 50/50 » (approximation normale), calculés en Python (analysis/export_stats.py) puis recalculés ici pour la période choisie."
            >
              <p className="mb-4 text-[13px] leading-relaxed text-current/70">
                <b className="text-current">Comment lire :</b> le point = la part des matchs gagnés par l&apos;équipe à
                domicile, parmi ceux qui ont un vainqueur. La barre = la marge d&apos;incertitude (intervalle de confiance
                à 95 %). Si elle ne touche pas le trait des 50 %, l&apos;avantage du terrain ne peut pas venir du hasard.
              </p>
              <SignificancePlot rows={stats.home_advantage} leagues={leaguesShown} seasons={chosen} />
            </ChartCard>
            <SampleSizeDemo />
          </Section>

          {/* Q2 */}
          <Section
            id="q2"
            number={2}
            question="Où la course au titre est-elle la plus disputée ?"
            intro="L'écart de points entre le champion et son dauphin : plus il est faible, plus la fin de saison a été serrée. Survolez une case pour voir le dauphin."
            takeaways={[
              `La Premier League est la plus disputée : ${fr(gapAvg("Premier League"))} points d'écart en moyenne entre le 1er et le 2e, et ${champions("Premier League")} champions différents en 5 saisons.`,
              `La Ligue 1 est la moins ouverte : le PSG a remporté les 5 titres. En Bundesliga, le Bayern en a gagné 4 ; seul Leverkusen l'a privé du titre, en 2023-24.`,
              `Fin de saison la plus serrée : la Bundesliga 2022-23, où le Bayern et Dortmund ont fini à égalité de points. Le Bayern a été sacré à la différence de buts.`,
            ]}
          >
            <ChartCard>
              <TitleGapGrid titles={insights.titles} seasons={chosen} leagues={leaguesShown} logoFor={logoFor} />
            </ChartCard>
          </Section>

          {/* Q3 */}
          <Section
            id="q3"
            number={3}
            question="Le classement reflète-t-il le vrai niveau des équipes ?"
            intro={
              <>
                Chaque écusson est une équipe sur une saison. La <Term id="gd">différence de buts</Term> mesure sa supériorité
                sur l&apos;ensemble de ses matchs ; la ligne en pointillés donne les points « attendus » pour chaque
                différence de buts (régression linéaire). En corail : les équipes qui ont pris le plus de points en plus ;
                en bleu : celles qui en ont pris le moins.
              </>
            }
            takeaways={[
              `La différence de buts explique ${Math.round(model.r2 * 100)} % des écarts de points (R² = ${fr(model.r2, 2)}).`,
              `Plus gros écarts : ${luckiest.team} ${seasonLabel(luckiest.season)} (${luckiest.rank}ᵉ, ${luckiest.delta > 0 ? "+" : ""}${fr(luckiest.delta)} pts par rapport à la tendance) et ${unluckiest.team} ${seasonLabel(unluckiest.season)} (${unluckiest.rank}ᵉ, ${fr(unluckiest.delta)} pts).`,
              `Ces écarts relèvent surtout de la chance : les ${per.lucky.n} équipes qui ont pris au moins 6 points « en trop » perdent en moyenne ${fr(Math.abs(per.lucky.points_change))} points la saison suivante, et les ${per.unlucky.n} « malchanceuses » en regagnent ${fr(per.unlucky.points_change)}.`,
              `Pour un analyste : la différence de buts prédit mieux la saison suivante que le classement lui-même.`,
            ]}
          >
            <ChartCard note="Limite : pour les équipes ultra-dominantes, le modèle linéaire surestime les points attendus (gagner 6-0 ne rapporte pas plus que 1-0).">
              <p className="mb-3 text-[13px] leading-relaxed text-current/70">
                <b className="text-current">Comment lire :</b> un écusson = un club sur une saison de la période choisie (au-delà de 200, seuls les 8 cas extrêmes gardent leur écusson). Au-dessus de la
                ligne en pointillés : plus de points que sa différence de buts ne le laissait prévoir. Anneau corail / bleu :
                les 4 plus gros écarts de chaque côté. Points gris : les équipes hors filtre, pour le contexte.
              </p>
              <PointsScatter model={model} league={scatterLeague} seasons={chosen} logoFor={logoFor} />
            </ChartCard>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile value={fr(per.corr_delta, 2)} label="corrélation de l'écart d'une saison à l'autre (presque aucune)" />
              <StatTile value={`${fr(per.lucky.points_change)} pts`} label={`la saison suivante pour les ${per.lucky.n} équipes « chanceuses »`} />
              <StatTile value={`+${fr(per.unlucky.points_change)} pts`} label={`la saison suivante pour les ${per.unlucky.n} « malchanceuses »`} />
            </div>
          </Section>

          {/* Q4 */}
          <Section
            id="q4"
            number={4}
            question="Qui marque plus (ou moins) que ses occasions ne le valent ?"
            intro={
              <>
                Saison 2025-26, joueurs de champ ayant joué au moins 900 minutes ({counts.regulars_2526.toLocaleString("fr-FR")} joueurs).
                Au-dessus de la diagonale : le joueur a marqué plus que ses <Term id="xg">xG</Term> ; en dessous, moins.
              </>
            }
            takeaways={[
              `Les xG prédisent très bien les buts : corrélation de ${fr(finishing.corr, 2)} entre buts réels et buts attendus.`,
              `Meilleur finisseur : ${bestFinisher.player} (${bestFinisher.goals} buts pour ${fr(bestFinisher.xg)} xG, +${fr(bestFinisher.diff)}). Le plus en dessous : ${worstFinisher.player} (${worstFinisher.goals} buts pour ${fr(worstFinisher.xg)} xG, ${fr(worstFinisher.diff)}).`,
              `Surprise : il y a eu ${Math.round(Math.abs(finishing.gap_pct) * 100)} % de buts en moins que les xG sur les 5 championnats (${finishing.total_goals.toLocaleString("fr-FR")} buts pour ${finishing.total_xg.toLocaleString("fr-FR")} xG), de ${pct(finishing.by_league.find((l) => l.league === "Bundesliga").gap_pct)} en Bundesliga à ${pct(finishing.by_league.find((l) => l.league === "Serie A").gap_pct)} en Serie A.`,
            ]}
          >
            <ChartCard note="En visage : les 8 meilleurs buteurs du périmètre, et les 4 joueurs au-dessus et en dessous de leurs xG les plus marqués, parmi ceux à 8 xG ou plus.">
              <p className="mb-3 text-[13px] leading-relaxed text-current/70">
                <b className="text-current">Comment lire :</b> chaque visage est un joueur (les meilleurs buteurs et les
                plus gros écarts). Au-dessus de la diagonale, il marque plus que ses xG. Anneau corail : bien au-dessus ;
                bleu : bien en dessous. Petits points gris : les autres joueurs. Survolez un visage pour le détail.
              </p>
              {!has2526 && (
                <p className="mb-3 rounded-xl border border-[#e86f2c]/30 bg-[#e86f2c]/[0.06] px-3 py-2 text-[13px]">
                  Les xG des joueurs n&apos;existent que pour <b>2025-26</b> : ce graphique reste sur cette saison.
                </p>
              )}
              <FinishingScatter players={finishing.players} league={finishLeague} photoFor={photoFor} />
            </ChartCard>
          </Section>

          {/* Q5 */}
          <Section
            id="q5"
            number={5}
            question="Peut-on regrouper les joueurs en profils de jeu ?"
            intro={
              <>
                L&apos;algorithme <Term id="kmeans">K-means</Term> a regroupé les {counts.regulars_2526.toLocaleString("fr-FR")} joueurs réguliers selon 6
                indicateurs <Term id="per90">par 90 minutes</Term>. Chaque case indique l&apos;écart à la moyenne du groupe, en
                écarts-types : corail au-dessus, bleu en dessous.
              </>
            }
            takeaways={[
              "L'algorithme retrouve 5 profils parlants : stars offensives complètes, finisseurs, créateurs, relanceurs / constructeurs et profils défensifs.",
              `Exemples : ${insights.profiles.groups[0].examples.slice(0, 4).join(", ")} chez les stars offensives ; ${insights.profiles.groups[1].examples.slice(0, 3).join(", ")} chez les finisseurs.`,
              "Le profil décrit ce que fait un joueur, pas son poste : le groupe « Créateurs » mélange attaquants, latéraux offensifs et milieux.",
            ]}
          >
            <ChartCard note="Choix assumé : 5 groupes, plus faciles à interpréter que 3, pour une qualité de séparation un peu plus faible (silhouette 0,33 contre 0,39).">
              {!has2526 && (
                <p className="mb-3 rounded-xl border border-[#e86f2c]/30 bg-[#e86f2c]/[0.06] px-3 py-2 text-[13px]">
                  Profils calculés sur la saison <b>2025-26</b> (seule saison avec les xG des joueurs).
                </p>
              )}
              <ProfilesGrid profiles={insights.profiles} />
            </ChartCard>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {insights.profiles.groups.map((g) => (
                <div key={g.name} className="rounded-xl border border-current/10 bg-current/[0.02] p-4">
                  <p className="font-semibold">{g.name}</p>
                  <p className="mt-1 text-xs text-current/50">
                    {g.players} joueurs ·{" "}
                    {Object.entries(g.positions)
                      .map(([poste, p]) => `${poste} ${p} %`)
                      .join(", ")}
                  </p>
                  <p className="mt-2 text-sm text-current/70">{g.examples.slice(0, 4).join(", ")}</p>
                </div>
              ))}
            </div>
          </Section>

          <p className="border-t border-current/10 pt-10 text-sm text-current/60">
            Sources, méthode, contrôles qualité et limites : voir la{" "}
            <Link to="/methodologie" className="font-semibold underline decoration-current/30 underline-offset-4">
              page Méthodologie
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}

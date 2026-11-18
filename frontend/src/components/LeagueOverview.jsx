import { useEffect, useRef, useState } from "react";
import { StandingsTable, LollipopChart, HorizontalBarChart, RankLineChart } from "./charts/PremierLeagueCharts";
import { TeamComparisonScatter, DisciplineRankingChart } from "./charts/TeamCharts";
import { ApiSkeleton, ApiError } from "./ApiState";
import PageHero from "./PageHero";
import { useTeamLogos } from "../hooks/useTeamLogos";
import { leagueColor, LEAGUE_SLUGS, seasonLabel } from "../lib/leagues";
import { usePhotoImages } from "../hooks/usePhotoImages";
import PeriodFilter from "./story/PeriodFilter";
import { periodLabel } from "../lib/period";

// Photo qui alterne toutes les 5 secondes entre les joueurs vedettes du championnat
function AlternatingStarPhoto({ images, alt }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length < 2) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images]);

  if (!images || images.length === 0) return null;

  return (
    <div className="relative h-64 w-48 shrink-0 overflow-hidden rounded-2xl border border-current/10 shadow-lg md:h-80 md:w-60">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
    </div>
  );
}

// Une Case = graphique collé (sticky) à gauche pendant que son texte défile à droite.
function Case({ index, title, text, Chart, data, loading, error, insights, howTo, shownLabel, notice }) {
  const sectionRef = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="border-t border-current/10 bg-[var(--gambeta-paper)] text-[var(--gambeta-ink)]"
    >
      {/* `md:items-start` est essentiel : sans lui, `align-items: stretch` */}
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-12 md:flex-row md:items-start md:gap-10 md:px-12 md:py-0">
        {/* Graphique : ~60%, collé (sticky) sur desktop tant que la Case défile */}
        <div className="md:sticky md:top-32 md:h-fit md:w-[60%] md:py-16">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#e86f2c]">
            {String(index + 1).padStart(2, "0")} · {shownLabel || "…"}
          </p>
          <h3 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight md:text-4xl">{title}</h3>
          {/* La saison demandée n'existe pas pour ces stats : on le dit clairement */}
          {notice && (
            <p className="mt-3 rounded-xl border border-[#e86f2c]/30 bg-[#e86f2c]/[0.06] px-3 py-2 text-[13px] leading-snug">
              {notice}
            </p>
          )}
          {howTo && (
            <p className="mt-4 text-[13px] leading-relaxed text-current/70">
              <b className="text-current">Comment lire :</b> {howTo}
            </p>
          )}
          <div className="mt-4 rounded-2xl border border-current/10 bg-current/[0.02] p-4 md:p-6">
            {loading ? (
              <ApiSkeleton className="h-72 w-full" />
            ) : error ? (
              <ApiError message="Impossible de charger ces données depuis l'API pour le moment." />
            ) : (
              <Chart data={data} active={active} />
            )}
          </div>
        </div>

        {/* Texte : ~40% */}
        <div className="flex flex-col justify-center md:min-h-[110vh] md:w-[40%]">
          <p
            className="text-[18px] leading-[1.7] transition-all duration-500 ease-out md:text-[20px]"
            style={{
              opacity: active ? 1 : 0,
              transform: active ? "translateY(0)" : "translateY(16px)",
            }}
          >
            {text}
          </p>
          {insights?.length > 0 && (
            <div
              className="mt-8 rounded-2xl border border-[#e86f2c]/25 bg-[#e86f2c]/[0.04] p-5 transition-all duration-500 ease-out"
              style={{ opacity: active ? 1 : 0, transitionDelay: "200ms" }}
            >
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[#e86f2c]">
                Les chiffres à retenir
              </p>
              <ul className="space-y-2 text-sm leading-relaxed md:text-[15px]">
                {insights.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e86f2c]" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Transforme une ligne de /api/data/standings/{slug}
function mapStandingRow(row) {
  return {
    rank: row.rank,
    team: row.team,
    teamSlug: row.team_slug,
    gp: row.matches_played,
    w: row.wins,
    d: row.draws,
    l: row.losses,
    gf: row.goals_for,
    ga: row.goals_against,
    pts: row.points,
  };
}

// Équipe comparée au reste du championnat, sans mise en évidence particulière
function mapLeagueStatsRow(row) {
  return {
    team: row.team,
    team_slug: row.team_slug,
    // Saisons passées : pas de xG (Understat), on prend les tirs FBref
    xg: row.per_match.xg ?? row.per_match.shots,
    tackles_won: row.per_match.tackles_won,
  };
}

// Score de discipline = cartons pondérés par match (rouge = 2 jaunes)
function buildDisciplineRanking(teams) {
  return [...teams]
    .map((t) => ({ team: t.team, score: t.per_match.yellow_cards + 2 * t.per_match.red_cards }))
    .sort((a, b) => a.score - b.score);
}

const QUADRANTS_STYLE = {
  topRight: "Dangereux et agressifs",
  topLeft: "Combatifs, peu d'occasions",
  bottomRight: "Dangereux, peu de duels",
  bottomLeft: "En difficulté",
};

// "Les chiffres à retenir" : phrases générées à partir des vraies données de chaque Case
const fmt1 = (v) => v.toFixed(1).replace(".", ",");
const signed = (v) => `${v >= 0 ? "+" : "−"}${fmt1(Math.abs(v))}`;

function standingsInsights(rows) {
  if (!rows?.length) return [];
  const [first, second] = rows;
  const bestAttack = [...rows].sort((a, b) => b.goals_for - a.goals_for)[0];
  const bestDefense = [...rows].sort((a, b) => a.goals_against - b.goals_against)[0];
  const last = rows[rows.length - 1];
  return [
    `${first.team} termine en tête avec ${first.points} points, ${first.points - second.points} de plus que ${second.team}.`,
    `Meilleure attaque : ${bestAttack.team} (${bestAttack.goals_for} buts). Meilleure défense : ${bestDefense.team} (${bestDefense.goals_against} encaissés).`,
    `Lanterne rouge : ${last.team}, avec ${last.points} points en ${last.matches_played} matchs.`,
  ];
}

function scorersInsights(players) {
  if (!players?.length) return [];
  const withDiff = players.map((p) => ({ ...p, diff: (p.goals ?? 0) - (p.xg ?? 0) }));
  const over = [...withDiff].sort((a, b) => b.diff - a.diff)[0];
  const under = [...withDiff].sort((a, b) => a.diff - b.diff)[0];
  const top = players[0];
  return [
    `Plus gros xG du championnat : ${top.player} (${fmt1(top.xg)} xG pour ${top.goals} buts).`,
    `Meilleur finisseur du top 10 : ${over.player}, ${signed(over.diff)} buts par rapport à ses xG.`,
    under.diff < 0
      ? `À l'inverse, ${under.player} reste à ${signed(under.diff)} buts de ce que ses occasions laissaient espérer.`
      : `Tous les joueurs du top 10 marquent au moins autant que leurs xG : une saison de finisseurs.`,
  ];
}

function assistsInsights(players) {
  if (!players?.length) return [];
  const top = players[0];
  const unlucky = [...players].sort((a, b) => (a.assists ?? 0) - (a.xa ?? 0) - ((b.assists ?? 0) - (b.xa ?? 0)))[0];
  return [
    `${top.player} est le créateur n°1 avec ${fmt1(top.xa)} xA (${top.assists} passes décisives réelles).`,
    `${unlucky.player} a le plus grand écart entre occasions créées et passes décisives (${signed((unlucky.assists ?? 0) - (unlucky.xa ?? 0))}) : ses coéquipiers ont souvent manqué le cadre.`,
  ];
}

function styleInsights(teams) {
  if (!teams?.length) return [];
  const hasXg = teams[0].per_match.xg != null;
  const key = hasXg ? "xg" : "shots";
  const mostXg = [...teams].sort((a, b) => b.per_match[key] - a.per_match[key])[0];
  const leastXg = [...teams].sort((a, b) => a.per_match[key] - b.per_match[key])[0];
  const mostDef = [...teams].sort(
    (a, b) => b.per_match.tackles_won + b.per_match.interceptions - (a.per_match.tackles_won + a.per_match.interceptions)
  )[0];
  return [
    hasXg
      ? `${mostXg.team} crée le plus d'occasions : ${fmt1(mostXg.per_match.xg)} xG par match, contre ${fmt1(leastXg.per_match.xg)} pour ${leastXg.team}.`
      : `${mostXg.team} tire le plus : ${fmt1(mostXg.per_match.shots)} tirs par match, contre ${fmt1(leastXg.per_match.shots)} pour ${leastXg.team}.`,
    `${mostDef.team} est l'équipe la plus active sans ballon : ${fmt1(mostDef.per_match.tackles_won + mostDef.per_match.interceptions)} tacles gagnés et interceptions par match.`,
  ];
}

function evolutionInsights(teams) {
  if (!teams?.length) return [];
  const champion = teams[0];
  const weeksAtTop = champion.ranks.filter((r) => r === 1).length;
  const firstTop = champion.ranks.indexOf(1) + 1;
  const biggestClimb = [...teams]
    .map((t) => ({ team: t.team, climb: Math.max(...t.ranks) - t.ranks[t.ranks.length - 1] }))
    .sort((a, b) => b.climb - a.climb)[0];
  return [
    `${champion.team} a passé ${weeksAtTop} journée${weeksAtTop > 1 ? "s" : ""} en tête, pour la première fois à la ${firstTop}ᵉ journée.`,
    biggestClimb.climb > 0
      ? `Plus belle remontée du top ${teams.length} : ${biggestClimb.team}, revenu de la ${biggestClimb.climb + teams.find((t) => t.team === biggestClimb.team).ranks.slice(-1)[0]}ᵉ place.`
      : `Le top ${teams.length} n'a presque pas bougé de la saison.`,
  ];
}

function seasonsInsights(teams, seasons) {
  if (!teams?.length) return [];
  const champs = {};
  teams.forEach((t) => t.ranks.forEach((r) => r === 1 && (champs[t.team] = (champs[t.team] || 0) + 1)));
  const best = Object.entries(champs).sort((a, b) => b[1] - a[1])[0];
  const steady = [...teams]
    .filter((t) => t.ranks.every((r) => r != null))
    .map((t) => ({ team: t.team, spread: Math.max(...t.ranks) - Math.min(...t.ranks) }))
    .sort((a, b) => a.spread - b.spread)[0];
  return [
    best
      ? `${best[0]} a fini champion ${best[1]} fois sur ${seasons.length} saisons parmi ces clubs.`
      : `Aucun de ces clubs n'a été champion sur la période.`,
    steady ? `Le plus régulier : ${steady.team}, toujours entre la ${Math.min(...teams.find((t) => t.team === steady.team).ranks)}ᵉ et la ${Math.max(...teams.find((t) => t.team === steady.team).ranks)}ᵉ place.` : null,
  ].filter(Boolean);
}

function disciplineInsights(teams) {
  if (!teams?.length) return [];
  const ranking = buildDisciplineRanking(teams);
  const clean = ranking[0];
  const dirty = ranking[ranking.length - 1];
  const reds = [...teams].sort((a, b) => b.per_match.red_cards - a.per_match.red_cards)[0];
  return [
    `Équipe la plus disciplinée : ${clean.team} (${fmt1(clean.score)} carton pondéré par match).`,
    `La moins disciplinée : ${dirty.team} (${fmt1(dirty.score)} par match, un rouge comptant double).`,
    `Le plus de cartons rouges par match : ${reds.team}.`,
  ];
}

// Version générique de la page de détail d'un championnat : introduction puis les Cases
export default function LeagueOverview({
  eyebrow,
  title,
  intro,
  texts,
  provisionalCases,
  stars,
  standings,
  topScorers,
  topAssists,
  leagueStats,
  rankEvolution,
  leagueId,
  period,
  chosen = [],
  seasons = [],
  onPeriodChange,
}) {
  const logoFor = useTeamLogos();
  const leagueName = LEAGUE_SLUGS[leagueId] ?? leagueId;
  // Visages des buteurs et passeurs (autocollants des graphiques)
  const playerNames = [...(topScorers.data?.players ?? []), ...(topAssists.data?.players ?? [])].map((p) => p.player);
  const faces = usePhotoImages([...new Set(playerNames)]);
  const photoFor = (name) => faces[name]?.src ?? null;
  const isRange = chosen.length > 1;
  const label = periodLabel(period) || "2025-26";
  const withSeason = (txt) =>
    txt?.replace(/Voici le classement final de la saison 2025-2026\./g, isRange ? `Voici le classement cumulé de ${label}.` : `Voici le classement final de la saison ${label}.`);
  // Stats joueurs / équipes : une seule saison, et seulement si elle est en base
  const playerNotice = (shown) => {
    if (!shown) return null;
    if (shown !== period?.to)
      return `Pas de xG joueurs (Understat) pour ${seasonLabel(period.to)} : on affiche ${seasonLabel(shown)}, la seule saison disponible pour ce graphique.`;
    if (isRange) return `Ces stats ne se cumulent pas : on affiche la dernière saison de la période, ${seasonLabel(shown)}.`;
    return null;
  };
  const statsHaveXg = leagueStats.data?.teams?.[0]?.per_match?.xg != null;
  const seasonOf = (api) => (api.data?.season ? seasonLabel(api.data.season) : null);
  const liveCases = [
    {
      title: isRange ? "Le classement cumulé de la période" : "Le classement de la saison",
      text: withSeason(texts.standings),
      howTo: "un écusson = un club. La bordure bleue marque le top 4, la rouge les 3 relégables. Cliquez une ligne pour ouvrir la fiche du club.",
      shownLabel: standings.data?.aggregated ? `Cumul ${label}` : seasonOf(standings) && `Saison ${seasonOf(standings)}`,
      Chart: (props) => <StandingsTable {...props} logoFor={logoFor} league={leagueId} zones getHref={(row) => `/equipes/${row.teamSlug}`} />,
      data: standings.data?.standings.map(mapStandingRow),
      insights: standingsInsights(standings.data?.standings),
      loading: standings.loading,
      error: standings.error,
    },
    {
      title: "Buteurs : buts marqués et xG",
      text: texts.xg,
      howTo: "le cercle creux = les buts attendus (xG) du joueur, son visage = ses buts réels. Visage à droite du cercle : il marque plus que prévu.",
      shownLabel: seasonOf(topScorers) && `Saison ${seasonOf(topScorers)}`,
      notice: playerNotice(topScorers.data?.season),
      Chart: (props) => <LollipopChart {...props} photoFor={photoFor} league={leagueName} />,
      data: topScorers.data?.players,
      insights: scorersInsights(topScorers.data?.players),
      loading: topScorers.loading,
      error: topScorers.error,
    },
    {
      title: "Passeurs : passes décisives et xA",
      text: texts.xa,
      howTo: "la longueur de la barre = les passes décisives attendues (xA), au bout le visage du passeur.",
      shownLabel: seasonOf(topAssists) && `Saison ${seasonOf(topAssists)}`,
      notice: playerNotice(topAssists.data?.season),
      Chart: (props) => <HorizontalBarChart {...props} photoFor={photoFor} league={leagueName} />,
      data: topAssists.data?.players,
      insights: assistsInsights(topAssists.data?.players),
      loading: topAssists.loading,
      error: topAssists.error,
    },
    {
      title: "Profil offensif et défensif des clubs",
      text: texts.style,
      howTo: `chaque écusson = un club. Plus il est à droite, plus il ${statsHaveXg ? "se crée d'occasions (xG)" : "tire (xG indisponible pour cette saison)"} ; plus il est haut, plus il gagne de tacles. Les pointillés = la médiane du championnat.`,
      shownLabel: seasonOf(leagueStats) && `Saison ${seasonOf(leagueStats)}`,
      notice: playerNotice(leagueStats.data?.season),
      Chart: (props) => (
        <TeamComparisonScatter
          {...props}
          logoFor={logoFor}
          league={leagueName}
          highlightSlug={null}
          xField="xg"
          yField="tackles_won"
          xLabel={statsHaveXg ? "xG par match →" : "Tirs par match →"}
          yLabel="Tacles gagnés par match ↑"
          quadrantLabels={QUADRANTS_STYLE}
        />
      ),
      data: leagueStats.data?.teams.map(mapLeagueStatsRow),
      insights: styleInsights(leagueStats.data?.teams),
      loading: leagueStats.loading,
      error: leagueStats.error,
    },
  ];

  const disciplineCase = {
    title: "Discipline collective",
    text: texts.discipline,
    howTo: "cartons par match, un rouge comptant comme deux jaunes. Du plus discipliné (en haut) au moins discipliné.",
    shownLabel: seasonOf(leagueStats) && `Saison ${seasonOf(leagueStats)}`,
    notice: playerNotice(leagueStats.data?.season),
    Chart: (props) => <DisciplineRankingChart {...props} logoFor={logoFor} league={leagueName} />,
    data: leagueStats.data?.teams ? buildDisciplineRanking(leagueStats.data.teams) : undefined,
    insights: disciplineInsights(leagueStats.data?.teams),
    loading: leagueStats.loading,
    error: leagueStats.error,
  };

  // Évolution du classement journée par journée : seulement si les matchs ont été collectés
  const evolutionTeams = rankEvolution?.data?.teams ?? [];
  const isSeasonsMode = rankEvolution?.data?.mode === "seasons";
  const evolutionCase =
    evolutionTeams.length > 0
      ? [
          {
            title: isSeasonsMode ? "Les places, saison après saison" : "Évolution du classement",
            text: texts.evolution,
            howTo: isSeasonsMode
              ? "une courbe par club parmi les 6 qui ont pris le plus de points sur la période : sa place finale à chaque saison (1re en haut). Une courbe coupée = club absent du championnat cette saison-là."
              : "une courbe par club du top 6 final, sa place au classement après chaque journée (1re place en haut). L'écusson marque l'arrivée.",
            shownLabel: isSeasonsMode ? `Période ${label}` : seasonOf(rankEvolution) && `Saison ${seasonOf(rankEvolution)}`,
            Chart: (props) => (
              <RankLineChart
                {...props}
                logoFor={logoFor}
                league={leagueName}
                xLabels={isSeasonsMode ? rankEvolution.data.seasons.map(seasonLabel) : null}
              />
            ),
            data: evolutionTeams,
            insights: isSeasonsMode ? seasonsInsights(evolutionTeams, rankEvolution.data.seasons) : evolutionInsights(evolutionTeams),
            loading: false,
            error: null,
          },
        ]
      : [];

  const allCases = [...liveCases, ...provisionalCases, ...evolutionCase, disciplineCase];

  return (
    <div>
      {/* Introduction : bandeau « terrain » aux couleurs du championnat */}
      <PageHero
        eyebrow={eyebrow}
        title={title}
        subtitle={intro}
        accent={leagueColor(leagueId)}
        aside={<AlternatingStarPhoto images={stars} alt={`Joueur vedette de ${eyebrow}`} />}
      />

      {/* Filtre global (saison ou période), collé en haut : il s'applique à toute la page */}
      {seasons.length > 1 && period?.from && (
        <div className="sticky sticky-under-nav z-30 border-b border-current/10 bg-[var(--gambeta-paper)]/90 text-[var(--gambeta-ink)] backdrop-blur">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-3 md:px-12">
            <PeriodFilter seasons={seasons} value={period} onChange={onPeriodChange} />
            <span className="text-[12px] text-current/60">
              S'applique à toute la page · stats joueurs : 2025-26 uniquement
            </span>
          </div>
        </div>
      )}

      {allCases.map((c, index) => (
        <Case key={`${index}-${c.title}`} index={index} {...c} />
      ))}
    </div>
  );
}

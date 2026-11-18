import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import PageBackground from "../components/PageBackground";
import PageHero, { HeroStat } from "../components/PageHero";
import Crest from "../components/Crest";
import PlayerPhoto from "../components/PlayerPhoto";
import { usePlayerPhoto } from "../hooks/usePlayerPhoto";
import PlayerCard from "../components/PlayerCard";
import { useTeamLogos } from "../hooks/useTeamLogos";
import { leagueColor } from "../lib/leagues";
import RadarChart from "../components/charts/RadarChart";
import { PerformanceBarChart, ShotDistributionChart } from "../components/charts/PlayerCharts";
import { ApiSkeleton, ApiFallbackNotice } from "../components/ApiState";
import { useApiData } from "../hooks/useApiData";
import { usePlayers } from "../hooks/usePlayers";
import PercentileBars from "../components/charts/PercentileBars";
import SeasonBars from "../components/charts/SeasonBars";
import { PageBody, Section, ChartCard, StatTile } from "../components/layout/PageKit";
import { fr } from "../components/story/hooks";
import {
  buildReference,
  percentileRadar,
  scoutReport,
  similarityPercent,
  similarPlayers,
  toPlayer,
  MIN_MINUTES,
} from "../lib/playerMetrics";

// Petite phrase par poste, pour varier l'intro sans écrire une fiche par joueur
const POSITION_PHRASES = {
  Attaquant: "en pointe de l'attaque",
  Milieu: "au cœur du milieu de terrain",
  Défenseur: "au sein de la défense",
  Gardien: "dans les buts",
};

// L'API renvoie un code de poste court
const API_POSITION_LABELS = { F: "Attaquant", M: "Milieu", D: "Défenseur", GK: "Gardien" };

// Intro écrite à partir des vrais chiffres du joueur
function buildIntro(player) {
  const posPhrase = POSITION_PHRASES[player.position] ?? "sur le terrain";
  const r = player.raw;
  const first = `${player.name} évolue ${posPhrase} de ${player.team}, en ${player.leagueLabel}.`;
  if (!r || r.minutes == null) return first;
  const f = (v) => (v ?? 0).toFixed(1).replace(".", ",");
  const parts = [
    first,
    `Cette saison : ${r.matches_played ?? "?"} matchs, ${r.minutes} minutes, ${r.goals ?? 0} buts et ${r.assists ?? 0} passes décisives.`,
  ];
  if ((r.xg ?? 0) >= 2) {
    const diff = (r.goals ?? 0) - r.xg;
    parts.push(
      Math.abs(diff) < 1
        ? `Ses ${r.goals} buts collent à ses ${f(r.xg)} xG : il marque à peu près ce que ses occasions valent.`
        : diff > 0
          ? `Avec ${r.goals} buts pour ${f(r.xg)} xG, il marque ${f(diff)} buts de plus que la qualité de ses occasions ne le laissait prévoir.`
          : `Avec ${r.goals} buts pour ${f(r.xg)} xG, il reste ${f(-diff)} buts sous ce que ses occasions laissaient espérer.`
    );
  }
  return parts.join(" ");
}

// Radar "vrai" : construit à partir des statistiques réellement collectées

// Ramène une valeur "par 90" dans [15,98] par rapport à une borne haute raisonnable pour ce type de statistique.
function scale(value, max, invert = false) {
  if (value == null) return 50;
  let t = Math.min(Math.max(value / max, 0), 1);
  if (invert) t = 1 - t;
  return Math.round(15 + t * 83);
}

function buildRealRadar(player) {
  const per90 = player.per90 ?? {};
  const cardsPer90 =
    player.minutes ? ((player.yellow_cards ?? 0) + 2 * (player.red_cards ?? 0)) * 90 / player.minutes : null;
  const discipline = scale(cardsPer90, 0.3, true); // moins de cartons/90 -> meilleure discipline

  const finition =
    player.xg > 0 ? Math.round(Math.min(Math.max(50 + (player.goals / player.xg - 1) * 60, 15), 98)) : 50;

  const byPosition = {
    Attaquant: [
      { axis: "Finition", value: finition },
      { axis: "Tir", value: scale(per90.shots, 5) },
      { axis: "Précision", value: player.shots_on_target_pct != null ? Math.round(player.shots_on_target_pct) : 50 },
      { axis: "Création", value: scale(per90.xa, 0.6) },
      { axis: "Discipline", value: discipline },
    ],
    Milieu: [
      { axis: "Création", value: scale(per90.xa, 0.5) },
      { axis: "Finition", value: scale(per90.xg, 0.5) },
      { axis: "Pressing", value: scale((per90.tackles_won ?? 0) + (per90.interceptions ?? 0), 3) },
      { axis: "Discipline", value: discipline },
      { axis: "Activité", value: scale(per90.shots, 2) },
    ],
    Défenseur: [
      { axis: "Tacles", value: scale(per90.tackles_won, 3) },
      { axis: "Interceptions", value: scale(per90.interceptions, 2.5) },
      { axis: "Discipline", value: discipline },
      { axis: "Agressivité", value: scale(per90.fouls_committed, 2) },
    ],
    Gardien: [
      { axis: "Discipline", value: discipline },
      {
        axis: "Implication",
        value: player.matches_played ? scale(player.minutes / player.matches_played, 90) : 50,
      },
      {
        axis: "Régularité",
        value: player.matches_played ? scale((player.starts / player.matches_played) * 90, 90) : 50,
      },
    ],
  };

  return byPosition[player.position] ?? byPosition.Milieu;
}

function NotFoundPlayer() {
  return (
    <>
      <PageBackground />
      <section className="flex-1 flex items-center justify-center px-6 py-32 text-center text-[var(--gambeta-ink)]">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e86f2c] mb-3">
            Joueur
          </p>
          <h1 className="text-[28px] md:text-[34px] font-bold tracking-[-0.02em]">
            Ce joueur n'existe pas.
          </h1>
          <Link to="/explorateur" className="mt-6 inline-block text-sm underline text-current/60">
            Retour à l'explorateur
          </Link>
        </div>
      </section>
    </>
  );
}

function HeaderSkeleton() {
  return (
    <div className="mx-auto max-w-[880px] px-6 py-12 text-center md:px-12 md:py-16">
      <ApiSkeleton className="mx-auto h-28 w-28 rounded-full md:h-32 md:w-32" />
      <ApiSkeleton className="mx-auto mt-5 h-9 w-56" />
      <ApiSkeleton className="mx-auto mt-4 h-16 w-full max-w-[600px]" />
    </div>
  );
}

// Une ligne du tableau de stats détaillées : libellé + valeur
function StatRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-current/5 py-2 text-sm last:border-0">
      <span className="text-current/60">{label}</span>
      <span className="font-semibold tabular-nums">{value ?? "-"}</span>
    </div>
  );
}

// Catégorie de stats détaillées, éventuellement "non disponible"
function StatCategory({ title, rows, unavailable }) {
  return (
    <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-5">
      <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[#e86f2c]">{title}</p>
      {unavailable ? (
        <p className="text-sm text-current/50">Donnée pas encore collectée pour cette catégorie.</p>
      ) : (
        rows.map((row) => <StatRow key={row.label} {...row} />)
      )}
    </div>
  );
}

// Page détail d'un joueur (route /joueurs/:slug)
export default function JoueurDetail() {
  const { slug } = useParams();
  const logoFor = useTeamLogos();
  const playerApi = useApiData(`/api/data/player/${slug}`);
  const { players: allPlayers, reference } = usePlayers();
  const historyApi = useApiData(`/api/data/player/${slug}/history`);
  // Photo du joueur (sticker au centre du graphique des tirs)
  const playerPhotoUrl = usePlayerPhoto(playerApi.data?.player ?? playerApi.data?.name ?? null);

  // Calculs "data" dès que la base joueurs est chargée : joueurs similaires
  const analysis = useMemo(() => {
    if (!playerApi.data || !reference || !allPlayers.length) return null;
    const me =
      allPlayers.find((p) => p.slug === playerApi.data.player_slug && p.team === playerApi.data.team) ??
      toPlayer(playerApi.data);
    const samePosition = allPlayers.filter((p) => p.position === me.position);
    const positionReference = buildReference(samePosition);
    const similar = similarPlayers(me, allPlayers, reference, 3).map((p) => ({
      ...p,
      similarity: similarityPercent(p.distance),
    }));
    return {
      me,
      enoughMinutes: me.minutes >= MIN_MINUTES,
      scout: scoutReport(me, allPlayers),
      radar: percentileRadar(me, positionReference),
      similar: similar.length ? similar : null,
    };
  }, [playerApi.data, allPlayers, reference]);
  const similar = analysis?.enoughMinutes ? analysis.similar : null;

  if (playerApi.loading) {
    return (
      <>
        <PageBackground />
        <div className="pt-24 text-[var(--gambeta-ink)]">
          <HeaderSkeleton />
        </div>
      </>
    );
  }

  let player = null;
  let fallbackNotice = null;
  let hasRealStats = false;

  if (playerApi.data) {
    const api = playerApi.data;
    hasRealStats = api.minutes != null;
    player = {
      name: api.player,
      team: api.team,
      teamSlug: api.team_slug,
      leagueLabel: api.league,
      position: API_POSITION_LABELS[api.position] ?? "Joueur",
      knownXG: api.xg != null,
      knownXA: api.xa != null,
      stats: {
        xg: api.xg ?? 0,
        xa: api.xa ?? 0,
        goals: api.goals ?? 0,
        assists: api.assists ?? 0,
      },
      // Toutes les stats brutes + par 90, telles que renvoyées par l'API
      raw: api,
      similar,
    };
  } else if (playerApi.error && playerApi.status !== 404) {
    fallbackNotice = "Impossible de joindre l'API.";
  }

  if (fallbackNotice) {
    return (
      <>
        <PageBackground />
        <div className="pt-32 text-[var(--gambeta-ink)]">
          <ApiFallbackNotice message={fallbackNotice} />
        </div>
      </>
    );
  }

  if (!player) return <NotFoundPlayer />;

  const intro = buildIntro(player);
  // Radar réel si assez de stats réelles (minutes connues)
  const radar = analysis?.enoughMinutes
    ? analysis.radar
    : hasRealStats
      ? buildRealRadar({ ...player.raw, position: player.position })
      : null;

  return (
    <>
      <div className="text-[var(--gambeta-ink)]">
        {fallbackNotice && <ApiFallbackNotice message={fallbackNotice} />}

        {/* En-tête « terrain » : photo, nom, club, championnat, poste, chiffres */}
        <PageHero
          eyebrow={`${player.position} · ${player.leagueLabel}`}
          accent={leagueColor(player.leagueLabel)}
          title={player.name}
          subtitle={
            <>
              <Link to={`/equipes/${player.teamSlug}`} className="inline-flex items-center gap-2 font-semibold text-white hover:underline">
                <Crest team={player.team} league={player.leagueLabel} logo={logoFor(player.team)} size={26} />
                {player.team}
              </Link>
              <p className="mt-4">{intro}</p>
            </>
          }
          aside={
            <div className="relative">
              <PlayerPhoto name={player.name} league={player.leagueLabel} size={190} ring={false} />
              <span className="absolute -bottom-2 -right-2 rounded-2xl bg-white p-2 shadow-xl">
                <Crest team={player.team} league={player.leagueLabel} logo={logoFor(player.team)} size={48} />
              </span>
            </div>
          }
        >
          {player.raw?.minutes != null && (
            <div className="flex flex-wrap gap-3">
              <HeroStat value={player.raw.goals ?? 0} label="buts" />
              <HeroStat value={(player.raw.xg ?? 0).toFixed(1)} label="xG" />
              <HeroStat value={player.raw.assists ?? 0} label="passes déc." />
              <HeroStat value={(player.raw.minutes ?? 0).toLocaleString("fr-FR")} label="minutes" />
            </div>
          )}
        </PageHero>

        <PageBody>
          {!radar ? (
            <Section kicker="Profil de jeu" title="Pas encore disponible" intro={`Le profil de jeu détaillé de ${player.name} n'est pas encore calculé.`} />
          ) : (
            <Section
              layout="split"
              kicker="Profil de jeu"
              title="Forces et faiblesses"
              intro={
                analysis?.enoughMinutes
                  ? `Chaque axe est un percentile face aux ${player.position.toLowerCase()}s des 5 grands championnats (au moins ${MIN_MINUTES} minutes) : 80 signifie « meilleur que 80 % d'entre eux ». Statistiques ramenées à 90 minutes.`
                  : `Profil calculé sur les statistiques de ${player.name} ramenées à 90 minutes. Moins de ${MIN_MINUTES} minutes jouées : une comparaison en percentiles ne serait pas fiable.`
              }
            >
              {(active) => (
                <ChartCard>
                  <RadarChart data={radar} active={active} />
                </ChartCard>
              )}
            </Section>
          )}

          {analysis?.enoughMinutes && (
            <Section
              layout="split"
              kicker="Rapport de scout"
              title={`${player.name} face à son poste`}
              intro={
                <>
                  <p>
                    Percentile face aux {analysis.scout[0].poolSize} {player.position.toLowerCase()}s comparables. Corail
                    plein : top 30 %. Gris : moitié basse.
                  </p>
                  <p className="mt-4 text-[15px] text-current/65">
                    Points forts :{" "}
                    <span className="font-semibold text-current">
                      {analysis.scout
                        .filter((r) => r.percentile >= 70)
                        .map((r) => r.label.replace(/^[A-Z][a-zé]/, (m) => m.toLowerCase()))
                        .join(", ") || "aucun indicateur dans le top 30 %"}
                    </span>
                    .
                  </p>
                </>
              }
            >
              {(active) => (
                <ChartCard>
                  <PercentileBars rows={analysis.scout} active={active} />
                </ChartCard>
              )}
            </Section>
          )}

          <Section kicker="Statistiques clés" title="La saison en chiffres">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatTile value={fr(player.stats.xg, 1)} label="xG" />
              <StatTile value={player.stats.goals} label="Buts" />
              <StatTile value={fr(player.stats.xa, 1)} label="xA" />
              <StatTile value={player.stats.assists} label="Passes décisives" />
            </div>
          </Section>

          {hasRealStats && (
            <Section
              layout="split"
              kicker="Efficacité"
              title="Attendu contre réalisé"
              intro={`Une barre pleine au-delà du contour indique que ${player.name} convertit mieux que la qualité de ses occasions ne le laissait prévoir. L'inverse traduit une finition sous la moyenne, qui tend à se corriger sur une saison.`}
            >
              {(active) => (
                <ChartCard>
                  <PerformanceBarChart
                    active={active}
                    data={[
                      { label: "Buts", expected: player.stats.xg, real: player.stats.goals },
                      { label: "Passes déc.", expected: player.stats.xa, real: player.stats.assists },
                    ]}
                  />
                </ChartCard>
              )}
            </Section>
          )}

          {hasRealStats && player.raw.shots > 0 && (
            <Section
              layout="split"
              kicker="Volume de tir"
              title="Issue des tirs"
              intro={`${player.raw.shots} tirs tentés, dont ${player.raw.shots_on_target} cadrés (${fr(player.raw.shots_on_target_pct ?? 0, 1)} %) et ${player.stats.goals} transformés.`}
            >
              {(active) => (
                <ChartCard>
                  <ShotDistributionChart
                    active={active}
                    data={{ shots: player.raw.shots, shotsOnTarget: player.raw.shots_on_target, goals: player.stats.goals }}
                    photo={playerPhotoUrl}
                    name={player.name}
                    league={player.leagueLabel}
                  />
                </ChartCard>
              )}
            </Section>
          )}

          {hasRealStats && (
            <Section kicker="Toutes les statistiques" title="Détail de la saison">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCategory
                  title="Temps de jeu"
                  rows={[
                    { label: "Matchs joués", value: player.raw.matches_played },
                    { label: "Titularisations", value: player.raw.starts },
                    { label: "Minutes", value: player.raw.minutes },
                  ]}
                />
                <StatCategory
                  title="Tir"
                  rows={[
                    { label: "Tirs", value: player.raw.shots },
                    { label: "Tirs cadrés", value: player.raw.shots_on_target },
                    { label: "% cadrés", value: player.raw.shots_on_target_pct != null ? `${fr(player.raw.shots_on_target_pct, 1)} %` : null },
                    { label: "Tirs / 90", value: player.raw.per90?.shots != null ? fr(player.raw.per90.shots, 2) : null },
                  ]}
                />
                <StatCategory
                  title="Défense"
                  rows={[
                    { label: "Tacles gagnés", value: player.raw.tackles_won },
                    { label: "Interceptions", value: player.raw.interceptions },
                    { label: "Tacles + int. / 90", value: player.raw.per90 ? fr((player.raw.per90.tackles_won ?? 0) + (player.raw.per90.interceptions ?? 0), 2) : null },
                  ]}
                />
                <StatCategory
                  title="Discipline"
                  rows={[
                    { label: "Cartons jaunes", value: player.raw.yellow_cards },
                    { label: "Cartons rouges", value: player.raw.red_cards },
                    { label: "Fautes commises", value: player.raw.fouls_committed },
                    { label: "Fautes subies", value: player.raw.fouls_drawn },
                  ]}
                />
              </div>
            </Section>
          )}

          {historyApi.data?.seasons?.length >= 2 && (
            <Section
              layout="split"
              kicker="Historique"
              title="Évolution saison par saison"
              intro={`Buts et xG par saison collectée, tous clubs confondus (${[...new Set(historyApi.data.seasons.map((h) => h.team))].join(", ")}).`}
            >
              {(active) => (
                <ChartCard>
                  <SeasonBars
                    active={active}
                    rows={historyApi.data.seasons}
                    format={(v) => (Number.isInteger(v) ? v : v.toFixed(1))}
                    series={[
                      { key: "goals", label: "Buts", color: "#e86f2c" },
                      { key: "xg", label: "xG", color: "rgba(232,111,44,0.35)" },
                    ]}
                  />
                </ChartCard>
              )}
            </Section>
          )}

          <Section
            kicker="Joueurs similaires"
            title={player.similar ? "Profils statistiques les plus proches" : "Pas encore disponible"}
            intro={
              player.similar
                ? "Même poste, distance calculée sur 6 indicateurs en percentiles : danger, création, finition, tirs, défense, discipline."
                : `Moins de ${MIN_MINUTES} minutes jouées : comparaison non fiable.`
            }
          >
            {player.similar &&
              ((active) => (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {player.similar.map((sim, index) => (
                    <div
                      key={sim.slug}
                      className="transition-all duration-300 ease-out"
                      style={{ transitionDelay: `${index * 100}ms`, opacity: active ? 1 : 0, transform: active ? "none" : "translateY(12px)" }}
                    >
                      <PlayerCard
                        player={sim}
                        logo={logoFor(sim.team)}
                        fetchPhoto
                        extra={
                          sim.similarity != null && (
                            <div className="mt-3">
                              <div className="flex justify-between text-xs">
                                <span className="text-current/60">Similarité</span>
                                <span className="font-bold text-[#e86f2c]">{sim.similarity} %</span>
                              </div>
                              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-current/10">
                                <div className="h-full rounded-full bg-[#e86f2c]" style={{ width: `${sim.similarity}%` }} />
                              </div>
                            </div>
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              ))}
          </Section>
        </PageBody>
      </div>
    </>
  );
}

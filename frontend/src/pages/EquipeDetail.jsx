import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageBackground from "../components/PageBackground";
import PageHero, { HeroStat } from "../components/PageHero";
import Crest from "../components/Crest";
import PlayerPhoto from "../components/PlayerPhoto";
import { useTeamLogos } from "../hooks/useTeamLogos";
import { usePhotoImages } from "../hooks/usePhotoImages";
import { ResultsCalendar, RollingForm } from "../components/charts/TeamCalendar";
import PeriodFilter from "../components/story/PeriodFilter";
import { periodSeasons, periodLabel } from "../lib/period";
import { seasonLabel } from "../lib/leagues";
import { leagueColor } from "../lib/leagues";
import RadarChart from "../components/charts/RadarChart";
import { TeamCardsBarChart, TeamComparisonScatter } from "../components/charts/TeamCharts";
import { ApiSkeleton, ApiFallbackNotice } from "../components/ApiState";
import { useApiData } from "../hooks/useApiData";
import SeasonBars from "../components/charts/SeasonBars";
import { PageBody, Section, ChartCard, HowTo, StatTile, FilterBar } from "../components/layout/PageKit";

// Couleurs des pastilles de forme récente : victoire en vert, nul en ambre, défaite en rouge.
const FORM_STYLES = {
  V: "bg-emerald-500 text-white",
  N: "bg-amber-400 text-white",
  D: "bg-rose-500 text-white",
};

// Texte d'intro court, généré à partir de la position actuelle du club plutôt qu'écrit à la main
// pour chacun des ~98 clubs couverts par le site
function buildIntro(team) {
  const ordinal = team.rank === 1 ? "1ʳᵉ" : `${team.rank}ᵉ`;
  const st = team.standing;
  const parts = [
    team.isRange
      ? `De ${team.periodText}, ${team.name} est ${ordinal} du classement cumulé de ${team.leagueLabel} avec ${team.pts} points.`
      : `${team.name} termine la saison ${team.periodText} à la ${ordinal} place de ${team.leagueLabel} avec ${team.pts} points.`,
  ];
  if (st) {
    parts.push(
      `Bilan : ${st.wins} victoires, ${st.draws} nuls et ${st.losses} défaites, ${st.goals_for} buts marqués pour ${st.goals_against} encaissés.`
    );
  }
  if (team.players?.length && team.showPlayers) {
    const xg = team.players.reduce((sum, p) => sum + (p.xg ?? 0), 0);
    const goals = team.players.reduce((sum, p) => sum + (p.goals ?? 0), 0);
    const diff = goals - xg;
    const top = [...team.players].sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
    parts.push(
      `L'effectif a généré ${xg.toFixed(1).replace(".", ",")} xG pour ${goals} buts, soit ${Math.abs(diff).toFixed(1).replace(".", ",")} buts ${diff >= 0 ? "de plus" : "de moins"} que prévu.`
    );
    if (top) parts.push(`Meilleur buteur : ${top.player} (${top.goals} buts).`);
  }
  return parts.join(" ");
}

// Tableau d'effectif triable, inspiré des tableaux "Standard Stats" de FBref
const SQUAD_COLUMNS = [
  { key: "player", label: "Joueur", numeric: false },
  { key: "position", label: "Poste", numeric: false },
  { key: "minutes", label: "Min", numeric: true },
  { key: "goals", label: "Buts", numeric: true },
  { key: "xg", label: "xG", numeric: true, digits: 1 },
  { key: "assists", label: "PD", numeric: true },
  { key: "xa", label: "xA", numeric: true, digits: 1 },
  { key: "shots", label: "Tirs", numeric: true },
  { key: "yellow_cards", label: "CJ", numeric: true },
  { key: "red_cards", label: "CR", numeric: true },
];
const POSITION_SHORT = { F: "ATT", M: "MIL", D: "DEF", GK: "GB" };

function SquadTable({ players }) {
  const [sort, setSort] = useState({ key: "minutes", dir: -1 });
  const rows = [...players]
    .filter((p) => (p.minutes ?? 0) > 0)
    .sort((a, b) => {
      const col = SQUAD_COLUMNS.find((c) => c.key === sort.key);
      const va = a[sort.key] ?? (col.numeric ? -1 : "");
      const vb = b[sort.key] ?? (col.numeric ? -1 : "");
      return col.numeric ? (va - vb) * sort.dir : String(va).localeCompare(String(vb)) * sort.dir;
    });
  const maxOf = (key) => Math.max(...rows.map((r) => r[key] ?? 0));

  return (
    <div className="overflow-x-auto rounded-2xl border border-current/10">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-current/10 bg-current/[0.03]">
            {SQUAD_COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => setSort((s) => ({ key: col.key, dir: s.key === col.key ? -s.dir : -1 }))}
                className={`cursor-pointer select-none px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-current/50 hover:text-current ${col.numeric ? "text-right" : "text-left"}`}
              >
                {col.label}
                {sort.key === col.key ? (sort.dir === -1 ? " ↓" : " ↑") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.player_slug} className="border-t border-current/5 hover:bg-current/[0.03]">
              {SQUAD_COLUMNS.map((col) => {
                const value = p[col.key];
                if (col.key === "player") {
                  return (
                    <td key={col.key} className="px-3 py-2 font-medium">
                      <Link to={`/joueurs/${p.player_slug}`} className="hover:underline">
                        {value}
                      </Link>
                    </td>
                  );
                }
                if (col.key === "position") {
                  return (
                    <td key={col.key} className="px-3 py-2 text-xs text-current/60">
                      {POSITION_SHORT[value] ?? "-"}
                    </td>
                  );
                }
                // Meilleure valeur de l'effectif en gras corail (sauf cartons).
                const isBest = !["yellow_cards", "red_cards"].includes(col.key) && value != null && value > 0 && value === maxOf(col.key);
                return (
                  <td
                    key={col.key}
                    className="px-3 py-2 text-right tabular-nums"
                    style={isBest ? { color: "#e86f2c", fontWeight: 700 } : undefined}
                  >
                    {value == null ? "-" : col.digits ? value.toFixed(col.digits) : value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Barre de chiffres clés sous le titre (style fiche club FotMob).
function KeyFigures({ team }) {
  const st = team.standing;
  if (!st) return null;
  const xg = team.showPlayers ? team.players?.reduce((sum, p) => sum + (p.xg ?? 0), 0) ?? null : null;
  const items = [
    ["Classement", `${team.rank}${team.rank === 1 ? "ᵉʳ" : "ᵉ"}`],
    ["Points", team.pts],
    ["V-N-D", `${st.wins}-${st.draws}-${st.losses}`],
    ["Buts", `${st.goals_for}-${st.goals_against}`],
    ["xG effectif", xg == null ? "-" : xg.toFixed(1)],
  ];
  return (
    <div className="mt-8 grid max-w-[720px] grid-cols-2 gap-3 sm:grid-cols-5">
      {items.map(([label, value]) => (
        <HeroStat key={label} value={value} label={label} />
      ))}
    </div>
  );
}

// Les 4 joueurs les plus déterminants de l'effectif réel (API), classés par apport offensif combiné
function topPlayersFromApi(players) {
  return [...players]
    .sort((a, b) => (b.xg ?? 0) + (b.xa ?? 0) - ((a.xg ?? 0) + (a.xa ?? 0)))
    .slice(0, 4)
    .map((p) => ({
      name: p.player,
      slug: p.player_slug,
      goals: p.goals ?? 0,
      assists: p.assists ?? 0,
      stat: `${(p.xg ?? 0).toFixed(1)} xG · ${(p.xa ?? 0).toFixed(1)} xA`,
    }));
}

// Ramène `value` dans [outMin,outMax] selon sa position entre le min et le max observés sur tout le championnat
function normalize(value, min, max, outMin = 15, outMax = 98, invert = false) {
  if (max === min || value == null) return 50;
  let t = (value - min) / (max - min);
  if (invert) t = 1 - t;
  return Math.round(outMin + t * (outMax - outMin));
}

// Radar "vrai" de style de jeu, à partir des agrégats d'équipe réels
function buildStyleRadar(teamStats, allTeams) {
  const values = (field) => allTeams.map((t) => t.per_match[field]).filter((v) => v != null);
  const range = (field) => [Math.min(...values(field)), Math.max(...values(field))];

  const [xgMin, xgMax] = range("xg");
  const [shotsMin, shotsMax] = range("shots");
  const [tacklesMin, tacklesMax] = range("tackles_won");
  const [intMin, intMax] = range("interceptions");
  const [cardsMin, cardsMax] = range("yellow_cards");

  return [
    { axis: "Attaque", value: normalize(teamStats.per_match.xg, xgMin, xgMax) },
    { axis: "Tirs", value: normalize(teamStats.per_match.shots, shotsMin, shotsMax) },
    { axis: "Tacles", value: normalize(teamStats.per_match.tackles_won, tacklesMin, tacklesMax) },
    { axis: "Interceptions", value: normalize(teamStats.per_match.interceptions, intMin, intMax) },
    { axis: "Discipline", value: normalize(teamStats.per_match.yellow_cards, cardsMin, cardsMax, 15, 98, true) },
  ];
}

function NotFoundTeam() {
  return (
    <>
      <PageBackground />
      <section className="flex-1 flex items-center justify-center px-6 py-32 text-center text-[var(--gambeta-ink)]">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e86f2c] mb-3">
            Équipe
          </p>
          <h1 className="text-[28px] md:text-[34px] font-bold tracking-[-0.02em]">
            Ce club n'existe pas.
          </h1>
          <Link to="/equipes" className="mt-6 inline-block text-sm underline text-current/60">
            Retour à la liste des équipes
          </Link>
        </div>
      </section>
    </>
  );
}

function HeaderSkeleton() {
  return (
    <div className="mx-auto max-w-[880px] px-6 py-12 text-center md:px-12 md:py-16">
      <ApiSkeleton className="mx-auto h-6 w-40" />
      <ApiSkeleton className="mx-auto mt-4 h-10 w-64" />
      <ApiSkeleton className="mx-auto mt-4 h-16 w-full max-w-[600px]" />
    </div>
  );
}

// Page détail d'un club (route /equipes/:slug) : alimentée par de vraies données
export default function EquipeDetail() {
  const { slug } = useParams();
  const logoFor = useTeamLogos();

  const teamApi = useApiData(`/api/data/team/${slug}`);
  const leagueSlug = teamApi.data?.league_slug ?? null;
  // Filtre global de la page : une saison ou une période parmi celles jouées par le club
  const [periodChoice, setPeriod] = useState(null);
  const available = teamApi.data?.available_seasons ?? [];
  const lastSeason = available[available.length - 1] ?? null;
  const period = periodChoice ?? { from: lastSeason, to: lastSeason };
  const chosen = periodSeasons(available, period);
  const isDefault = !periodChoice || (chosen.length === 1 && chosen[0] === lastSeason);
  const periodApi = useApiData(!isDefault && chosen.length ? `/api/data/team/${slug}?seasons=${chosen.join(",")}` : null);
  const qStand = chosen.length > 1 ? `?seasons=${chosen.join(",")}` : chosen.length ? `?season=${chosen[0]}` : "";
  const standingsApi = useApiData(leagueSlug ? `/api/data/standings/${leagueSlug}${qStand}` : null);
  // Tous les matchs de la période : calendrier des résultats et forme glissante
  const matchesApi = useApiData(chosen.length ? `/api/data/team/${slug}/matches?seasons=${chosen.join(",")}` : null);
  const leagueStatsApi = useApiData(leagueSlug ? `/api/data/league-stats/${leagueSlug}` : null);
  const historyApi = useApiData(`/api/data/team/${slug}/history`);
  // Visages des joueurs les plus avertis (autocollants du graphique discipline)
  const cardedNames = (teamApi.data?.players ?? [])
    .filter((p) => (p.yellow_cards ?? 0) + (p.red_cards ?? 0) > 0)
    .sort((a, b) => (b.yellow_cards ?? 0) + (b.red_cards ?? 0) - ((a.yellow_cards ?? 0) + (a.red_cards ?? 0)))
    .slice(0, 6)
    .map((p) => p.player);
  const cardFaces = usePhotoImages(cardedNames);

  if (teamApi.loading) {
    return (
      <>
        <PageBackground />
        <div className="pt-24 text-[var(--gambeta-ink)]">
          <HeaderSkeleton />
        </div>
      </>
    );
  }

  let team = null;
  let fallbackNotice = null;

  if (teamApi.data) {
    // Classement, forme et domicile/extérieur : ceux de la période choisie
    const pd = !isDefault && periodApi.data ? periodApi.data : teamApi.data;
    const rankIndex = standingsApi.data?.standings.findIndex((row) => row.team_slug === teamApi.data.team_slug);
    const allTeamsStats = leagueStatsApi.data?.teams ?? null;
    const teamStats = allTeamsStats?.find((t) => t.team_slug === teamApi.data.team_slug) ?? null;

    team = {
      slug,
      name: teamApi.data.team,
      leagueLabel: teamApi.data.league,
      rank: rankIndex != null && rankIndex >= 0 ? rankIndex + 1 : null,
      pts: pd.standing?.points ?? 0,
      isRange: chosen.length > 1,
      periodText: chosen.length > 1 ? `${seasonLabel(chosen[0])} à ${seasonLabel(chosen[chosen.length - 1])}` : seasonLabel(chosen[0] ?? lastSeason ?? "2526"),
      // Stats des joueurs : uniquement la dernière saison en base
      showPlayers: isDefault,
      totalTeams: standingsApi.data?.standings.length ?? null,
      standing: pd.standing,
      form: pd.form,
      homeAway: pd.home_away,
      radar: teamStats && allTeamsStats ? buildStyleRadar(teamStats, allTeamsStats) : null,
      keyPlayers: topPlayersFromApi(teamApi.data.players),
      players: teamApi.data.players,
      teamStats,
      allTeamsStats,
    };
  } else if (teamApi.error && teamApi.status !== 404) {
    fallbackNotice = "Impossible de joindre l'API.";
  }

  if (!team && fallbackNotice) {
    return (
      <>
        <PageBackground />
        <div className="pt-32 text-[var(--gambeta-ink)]">
          <ApiFallbackNotice message={fallbackNotice} />
        </div>
      </>
    );
  }
  if (!team) return <NotFoundTeam />;

  const introReady = team.rank != null && team.totalTeams != null;
  const intro = introReady ? buildIntro(team) : null;

  // Top 6 joueurs les plus avertis de l'effectif
  const cardedPlayers = team.players
    ? [...team.players]
        .filter((p) => (p.yellow_cards ?? 0) + (p.red_cards ?? 0) > 0)
        .sort((a, b) => (b.yellow_cards ?? 0) + (b.red_cards ?? 0) - ((a.yellow_cards ?? 0) + (a.red_cards ?? 0)))
        .slice(0, 6)
        .map((p) => ({ player: p.player, yellow: p.yellow_cards ?? 0, red: p.red_cards ?? 0 }))
    : [];

  return (
    <>
      <div className="text-[var(--gambeta-ink)]">
        {fallbackNotice && <ApiFallbackNotice message={fallbackNotice} />}

        {/* En-tête « terrain » : écusson, nom, championnat, chiffres clés */}
        <PageHero
          eyebrow={team.leagueLabel}
          accent={leagueColor(team.leagueLabel)}
          title={team.name}
          subtitle={introReady ? intro : <ApiSkeleton className="h-6 w-full max-w-[500px] bg-white/20" />}
          aside={
            <div className="flex h-40 w-40 items-center justify-center rounded-[2rem] bg-white/95 p-5 shadow-2xl md:h-48 md:w-48">
              <Crest team={team.name} league={team.leagueLabel} logo={logoFor(team.name)} size={140} />
            </div>
          }
        >
          {introReady && <KeyFigures team={team} />}
        </PageHero>

        {/* Filtre global, collé en haut : s'applique à toute la fiche */}
        {available.length > 1 && (
          <FilterBar>
            <PeriodFilter seasons={available} value={period} onChange={setPeriod} />
            <p className="text-[11px] text-current/55">
              {periodLabel(period)} : classement, bilan, forme et domicile/extérieur
              {isDefault ? "." : ` · profil de jeu, discipline et joueurs : ${seasonLabel(lastSeason)} (seule saison avec les stats joueurs).`}
            </p>
          </FilterBar>
        )}

        <PageBody>
          {matchesApi.data?.matches?.length > 0 && (
            <Section
              kicker="Calendrier"
              title="Tous les matchs de la période"
              intro={`Chaque case est un match de championnat (${periodLabel(period)}). La courbe lisse les résultats sur 5 matchs.`}
            >
              <ChartCard>
                <ResultsCalendar matches={matchesApi.data.matches} league={team.leagueLabel} logoFor={logoFor} />
              </ChartCard>
              <ChartCard>
                <div className="mb-2">
                  <HowTo>
                    points par match sur les 5 derniers matchs (3 = cinq victoires). En vert au-dessus de la moyenne de la
                    période, en rouge en dessous.
                  </HowTo>
                </div>
                <RollingForm matches={matchesApi.data.matches} />
              </ChartCard>
            </Section>
          )}

          {team.form && (
            <Section kicker="Forme récente" title={`Les 5 derniers matchs${chosen.length ? ` de ${seasonLabel(chosen[chosen.length - 1])}` : ""}`}>
              {(active) => (
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex gap-2">
                    {team.form.results.map((result, index) => (
                      <span
                        key={index}
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ease-out ${FORM_STYLES[result]}`}
                        style={{ transitionDelay: `${index * 80}ms`, opacity: active ? 1 : 0, transform: active ? "scale(1)" : "scale(0.6)" }}
                      >
                        {result}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-current/60">
                    <span className="font-bold text-current">{team.form.points} pts</span> sur 15 possibles
                  </p>
                </div>
              )}
            </Section>
          )}

          {team.radar && (
            <Section
              layout="split"
              kicker="Profil de jeu"
              title="Forces et faiblesses"
              intro={`Attaque, tirs, tacles, interceptions et discipline de l'effectif de ${team.name}, situés par rapport au reste de la ${team.leagueLabel}.`}
            >
              {(active) => (
                <ChartCard>
                  <RadarChart data={team.radar} active={active} />
                </ChartCard>
              )}
            </Section>
          )}

          {team.homeAway && (
            <Section kicker="Domicile et extérieur" title="Bilan selon le lieu du match">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { label: "Domicile", stats: team.homeAway.home },
                  { label: "Extérieur", stats: team.homeAway.away },
                ].map(({ label, stats }) => (
                  <StatTile key={label} value={`${stats.pts} pts`} label={`${label} · ${stats.w}V ${stats.d}N ${stats.l}D sur ${stats.gp} matchs`} />
                ))}
              </div>
            </Section>
          )}

          {cardedPlayers.length > 0 && (
            <Section
              layout="split"
              kicker="Discipline"
              title="Les joueurs les plus sanctionnés"
              intro={`Cartons jaunes et rouges cumulés cette saison par les joueurs de ${team.name}.`}
            >
              {(active) => (
                <ChartCard>
                  <TeamCardsBarChart
                    data={cardedPlayers}
                    active={active}
                    photoFor={(n) => cardFaces[n]?.src ?? null}
                    league={team.leagueLabel}
                  />
                </ChartCard>
              )}
            </Section>
          )}

          {team.allTeamsStats && (
            <Section
              layout="split"
              kicker="Comparaison"
              title="Tacles et interceptions"
              intro={`Chaque écusson est un club de la ${team.leagueLabel} ; ${team.name} est mis en évidence. Valeurs par match, pointillés à la médiane du championnat.`}
            >
              {(active) => (
                <ChartCard>
                  <TeamComparisonScatter
                    active={active}
                    data={team.allTeamsStats.map((t) => ({
                      team: t.team,
                      team_slug: t.team_slug,
                      tackles_won: t.per_match.tackles_won,
                      interceptions: t.per_match.interceptions,
                    }))}
                    highlightSlug={team.slug}
                    logoFor={logoFor}
                    league={team.leagueLabel}
                    xField="tackles_won"
                    yField="interceptions"
                    xLabel="Tacles gagnés / match →"
                    yLabel="Interceptions / match ↑"
                    quadrantLabels={{
                      topRight: "Récupèrent beaucoup",
                      topLeft: "Lisent le jeu",
                      bottomRight: "Vont au duel",
                      bottomLeft: "Récupèrent peu",
                    }}
                  />
                </ChartCard>
              )}
            </Section>
          )}

          <Section kicker="Joueurs clés" title="Les plus décisifs de l'effectif" intro="Classés par xG + xA cette saison.">
            {(active) => (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {team.keyPlayers.map((player, index) => (
                  <Link
                    key={player.name}
                    to={`/joueurs/${player.slug}`}
                    className="group flex flex-col items-center gap-3 rounded-2xl border border-current/10 bg-current/[0.02] p-5 text-center transition-all duration-300 ease-out hover:border-current/30"
                    style={{ transitionDelay: `${index * 100}ms`, opacity: active ? 1 : 0, transform: active ? "none" : "translateY(12px)" }}
                  >
                    <PlayerPhoto name={player.name} league={team.leagueLabel} size={72} />
                    <div>
                      <p className="text-sm font-bold group-hover:text-[#e86f2c]">{player.name}</p>
                      <p className="mt-0.5 text-xs text-current/60">
                        {player.goals} buts · {player.assists} PD
                      </p>
                      <p className="font-mono text-[11px] text-current/45">{player.stat}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          {historyApi.data?.seasons?.length >= 2 && (
            <Section
              layout="split"
              kicker="Historique"
              title="Saison par saison"
              intro={`Points et buts marqués sur ${historyApi.data.seasons.length} saisons. Classements finaux : ${historyApi.data.seasons
                .map((h) => `${h.rank ?? "?"}ᵉ en ${h.season.slice(0, 2)}-${h.season.slice(2)}`)
                .join(", ")}.`}
            >
              {(active) => (
                <ChartCard>
                  <SeasonBars
                    active={active}
                    rows={historyApi.data.seasons}
                    series={[
                      { key: "points", label: "Points", color: "#e86f2c" },
                      { key: "goals_for", label: "Buts marqués", color: "rgba(232,111,44,0.4)" },
                    ]}
                  />
                </ChartCard>
              )}
            </Section>
          )}

          {team.players?.length > 0 && (
            <Section
              kicker="Effectif"
              title="Statistiques individuelles"
              intro="Cliquez sur un en-tête pour trier. En corail : la meilleure valeur de l'effectif. PD = passes décisives, CJ / CR = cartons jaunes / rouges."
            >
              <SquadTable players={team.players} />
            </Section>
          )}
        </PageBody>
      </div>
    </>
  );
}

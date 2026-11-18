import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageBackground from "../components/PageBackground";
import LeagueOverview from "../components/LeagueOverview";
import PlayerJars from "../components/PlayerJars";
import { ApiSkeleton, ApiError } from "../components/ApiState";
import { useApiData } from "../hooks/useApiData";
import { periodSeasons } from "../lib/period";
import { LEAGUE_OVERVIEWS } from "../data/leagueOverviews";

// Déduit les initiales d'un nom complet ("Kylian Mbappé" -> "KM")
function initialsFromName(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Page détail d'un championnat (route /championnats/:id).
export default function ChampionnatDetail() {
  const { id } = useParams();
  const overview = LEAGUE_OVERVIEWS[id];

  // Vraies données (backend/routes/data.py) pour les Cases 1/2/3 et PlayerJars
  const [periodChoice, setPeriod] = useState(null);
  const seasonsData = useApiData(overview ? `/api/data/seasons/${id}` : null);
  const seasons = seasonsData.data?.seasons ?? [];
  const last = seasons[seasons.length - 1] ?? null;
  const period = periodChoice ?? { from: last, to: last };
  const chosen = periodSeasons(seasons, period);
  // Classement et évolution : saison seule ou période cumulée.
  const qTeams = !last ? "" : chosen.length > 1 ? `?seasons=${chosen.join(",")}` : `?season=${period.to}`;
  const qPlayers = last ? `?season=${period.to}` : "";
  const ready = overview && (seasonsData.data || seasonsData.error);
  // Tant que la liste des saisons n'est pas arrivée, les graphiques restent en chargement
  const pending = { data: null, loading: true, error: null, status: null };
  const wait = (api) => (ready ? api : pending);
  const standings = wait(useApiData(ready ? `/api/data/standings/${id}${qTeams}` : null));
  const topScorers = wait(useApiData(ready ? `/api/data/top-scorers/${id}${qPlayers}` : null));
  const topAssists = wait(useApiData(ready ? `/api/data/top-assists/${id}${qPlayers}` : null));
  const leagueStats = wait(useApiData(ready ? `/api/data/league-stats/${id}${qPlayers}` : null));
  const rankEvolution = wait(useApiData(ready ? `/api/data/rank-evolution/${id}${qTeams}` : null));

  if (overview) {
    const playersXG = topScorers.data?.players.map((p) => ({ name: p.player, initials: initialsFromName(p.player), value: p.xg }));
    const playersXA = topAssists.data?.players.map((p) => ({ name: p.player, initials: initialsFromName(p.player), value: p.xa }));
    const jarsLoading = topScorers.loading || topAssists.loading;
    const jarsError = topScorers.error || topAssists.error;

    return (
      <>
        <LeagueOverview
          leagueId={id}
          eyebrow={overview.eyebrow}
          title={overview.title}
          intro={overview.intro}
          texts={overview.texts}
          provisionalCases={overview.provisionalCases}
          stars={overview.stars}
          standings={standings}
          topScorers={topScorers}
          topAssists={topAssists}
          leagueStats={leagueStats}
          rankEvolution={rankEvolution}
          period={period}
          chosen={chosen}
          seasons={seasons}
          onPeriodChange={setPeriod}
        />
        {jarsLoading ? (
          <div className="bg-[var(--gambeta-paper)] px-6 py-24 md:px-12">
            <ApiSkeleton className="mx-auto h-80 w-full max-w-[1200px]" />
          </div>
        ) : jarsError ? (
          <div className="bg-[var(--gambeta-paper)] px-6 py-24 md:px-12">
            <ApiError message="Impossible de charger les meilleurs buteurs/passeurs depuis l'API." />
          </div>
        ) : (
          <PlayerJars title={overview.playerJars.title} playersXG={playersXG} playersXA={playersXA} />
        )}
      </>
    );
  }

  return (
    <>
      <PageBackground />
      <section className="flex flex-1 items-center justify-center px-6 py-32 text-center text-[var(--gambeta-ink)]">
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-[0.2em] text-[#e86f2c]">Championnat</p>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">Championnat introuvable</h1>
          <Link to="/championnats" className="mt-6 inline-block text-sm text-current/60 underline">
            Retour aux championnats
          </Link>
        </div>
      </section>
    </>
  );
}

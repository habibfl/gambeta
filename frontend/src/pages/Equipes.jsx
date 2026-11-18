import { useEffect, useRef, useState } from "react";
import { apiUrl } from "../lib/api";
import PageHero, { HeroStat } from "../components/PageHero";
import { useTeamLogos } from "../hooks/useTeamLogos";
import { StandingsTable } from "../components/charts/PremierLeagueCharts";
import { ApiError, ApiSkeleton } from "../components/ApiState";
import { useApiData } from "../hooks/useApiData";
import insights from "../data/insights.json";
import PeriodFilter from "../components/story/PeriodFilter";
import { PageBody, FilterBar } from "../components/layout/PageKit";
import { periodSeasons, periodLabel, lastSeasonPeriod } from "../lib/period";

const LEAGUES_API_URL = apiUrl("/api/leagues");

// Même repli que Navbar.jsx (même ids, mêmes initiales)
const LEAGUES_FALLBACK = [
  { id: "ligue-1", name: "Ligue 1", logo: null, initials: "L1" },
  { id: "premier-league", name: "Premier League", logo: null, initials: "PL" },
  { id: "liga", name: "Liga", logo: null, initials: "LIGA" },
  { id: "serie-a", name: "Serie A", logo: null, initials: "SA" },
  { id: "bundesliga", name: "Bundesliga", logo: null, initials: "BL" },
];

// Adapte une ligne de /api/data/standings/{slug} au format attendu par StandingsTable
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

// Un tableau de classement = une section qui déclenche sa propre animation d'entrée
function LeagueSection({ league, chosen, label }) {
  // Une saison : son classement final ; une période : le classement cumulé
  const query = chosen.length > 1 ? `?seasons=${chosen.join(",")}` : `?season=${chosen[0]}`;
  const standings = useApiData(`/api/data/standings/${league.id}${query}`);
  const logoFor = useTeamLogos();
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
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="border-t border-current/10 py-14 first:border-t-0 md:py-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#e86f2c]">
            {chosen.length > 1 ? `Classement cumulé · ${label}` : `Classement · ${label}`}
          </p>
          <h2 className="mt-2 flex items-center gap-3 text-3xl font-extrabold leading-[1.1] tracking-tight md:text-4xl">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
              {league.logo ? (
                <img src={league.logo} alt="" className="h-full w-full object-contain" />
              ) : (
                <span className="text-[9px] font-bold text-[#221400]/60">{league.initials}</span>
              )}
            </span>
            {league.name}
          </h2>
        </div>
        <span className="flex gap-3 font-mono text-[11px] uppercase tracking-wide text-current/55">
          <span className="flex items-center gap-1.5"><span className="h-3 w-1 rounded-full bg-[#2a78d6]" /> Top 4</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-1 rounded-full bg-[#d94f27]" /> Relégation</span>
        </span>
      </div>
      <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-4 md:p-6">
        {standings.loading ? (
          <ApiSkeleton className="h-96 w-full" />
        ) : standings.error ? (
          <ApiError message={`Impossible de charger le classement ${league.name} depuis l'API.`} />
        ) : (
          <StandingsTable
            data={standings.data.standings.map(mapStandingRow)}
            active={active}
            scrollable={false}
            getHref={(row) => `/equipes/${row.teamSlug}`}
            logoFor={logoFor}
            league={league.id}
            zones
          />
        )}
      </div>
    </section>
  );
}

// Page "Équipes" : les 5 classements des grands championnats, empilés verticalement
export default function Equipes() {
  const [leagues, setLeagues] = useState(LEAGUES_FALLBACK);
  const [period, setPeriod] = useState(() => lastSeasonPeriod(insights.seasons));
  const chosen = periodSeasons(insights.seasons, period);
  const label = periodLabel(period);

  useEffect(() => {
    let cancelled = false;
    fetch(LEAGUES_API_URL)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("API indisponible"))))
      .then((data) => {
        if (cancelled) return;
        setLeagues(data.leagues?.length ? data.leagues : LEAGUES_FALLBACK);
      })
      .catch(() => { if (!cancelled) setLeagues(LEAGUES_FALLBACK); });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHero
        eyebrow="Les classements"
        title="Équipes"
        subtitle="Les classements des cinq grands championnats, de 2021-22 à 2025-26 : choisissez une saison, ou une période pour un classement cumulé. Cliquez sur un club pour ouvrir sa fiche : forme, bilan domicile/extérieur, historique sur 5 saisons et effectif complet."
      >
        <div className="flex flex-wrap gap-3">
          <HeroStat value="96" label="clubs" />
          <HeroStat value="5" label="championnats" />
          <HeroStat value="5" label="saisons d'historique" />
        </div>
      </PageHero>
      <FilterBar>
        <PeriodFilter seasons={insights.seasons} value={period} onChange={setPeriod} />
      </FilterBar>
      <PageBody>
        {LEAGUES_FALLBACK.map(({ id }, index) => {
          const league = leagues.find((item) => item.id === id) ?? LEAGUES_FALLBACK[index];
          return <LeagueSection key={id} league={league} chosen={chosen} label={label} />;
        })}
      </PageBody>
    </>
  );
}

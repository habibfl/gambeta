import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import { ApiError, ApiSkeleton } from "../components/ApiState";
import { usePlayers } from "../hooks/usePlayers";
import insights from "../data/insights.json";
import PeriodFilter from "../components/story/PeriodFilter";
import { PageBody, Section, FilterBar } from "../components/layout/PageKit";
import { periodSeasons, periodLabel, lastSeasonPeriod } from "../lib/period";

const LEAGUES_API_URL = apiUrl("/api/leagues");

// Repli si l'API (backend éteint, clé API-Football absente...) ne répond pas
const LEAGUES_FALLBACK = [
  { id: "ligue-1", name: "Ligue 1", country: "France", logo: null, initials: "L1" },
  { id: "premier-league", name: "Premier League", country: "Angleterre", logo: null, initials: "PL" },
  { id: "liga", name: "Liga", country: "Espagne", logo: null, initials: "LIGA" },
  { id: "serie-a", name: "Serie A", country: "Italie", logo: null, initials: "SA" },
  { id: "bundesliga", name: "Bundesliga", country: "Allemagne", logo: null, initials: "BL" },
];

// Page liste : les 5 grands championnats, chacun en carte cliquable vers sa page de détail
// Tableau comparatif des 5 championnats
// Calculé à partir des classements (buts, champion, écart) et de la base joueurs
const LEAGUE_IDS = ["premier-league", "liga", "serie-a", "bundesliga", "ligue-1"];
const LEAGUE_NAMES = {
  "premier-league": "Premier League",
  liga: "Liga",
  "serie-a": "Serie A",
  bundesliga: "Bundesliga",
  "ligue-1": "Ligue 1",
};

function Bar({ value, max, label }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="tabular-nums">{label}</span>
      <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-current/[0.08] sm:block">
        <span className="block h-full rounded-full bg-[#e86f2c]" style={{ width: `${(value / max) * 100}%` }} />
      </span>
    </div>
  );
}

// Données par saison (classements FBref, 2021-22 → 2025-26)
const GOALS_BY_LEAGUE = Object.fromEntries(insights.goals_per_match.map((g) => [g.league, g.values]));
const TITLES = insights.titles;

function LeagueComparison({ chosen }) {
  // xG et meilleur buteur : base joueurs Understat, disponible pour 2025-26 seulement
  const { players, loading: playersLoading, error: playersError } = usePlayers();
  const onlyLast = chosen.length === 1 && chosen[0] === "2526";
  const single = chosen.length === 1;

  if (onlyLast && playersLoading) return <ApiSkeleton className="h-72 w-full" />;
  if (onlyLast && playersError) return <ApiError message="Impossible de charger les joueurs." />;

  const rows = LEAGUE_IDS.map((id) => {
    const name = LEAGUE_NAMES[id];
    const goals = (GOALS_BY_LEAGUE[name] ?? []).filter((v) => chosen.includes(v.season));
    const titles = TITLES.filter((t) => t.league === name && chosen.includes(t.season));
    const goalsPerMatch = goals.reduce((sum, v) => sum + v.value, 0) / (goals.length || 1);
    const gap = titles.reduce((sum, t) => sum + t.gap, 0) / (titles.length || 1);
    // Titres sur la période : "Manchester City ×3, Liverpool"
    const counts = {};
    titles.forEach((t) => {
      counts[t.champion] = (counts[t.champion] ?? 0) + 1;
    });
    const champions = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    let xgPerMatch = null;
    let topScorer = null;
    if (onlyLast && players) {
      const leaguePlayers = players.filter((p) => p.leagueId === id);
      const nMatches = id === "bundesliga" || id === "ligue-1" ? 306 : 380;
      xgPerMatch = leaguePlayers.reduce((sum, p) => sum + p.stats.xg, 0) / nMatches;
      topScorer = [...leaguePlayers].sort((a, b) => b.stats.goals - a.stats.goals)[0];
    }
    return { id, name, goalsPerMatch, gap, titles, champions, xgPerMatch, topScorer };
  });
  const maxGoals = Math.max(...rows.map((r) => r.goalsPerMatch));
  const maxXg = Math.max(...rows.map((r) => r.xgPerMatch ?? 0));
  const mostGoals = [...rows].sort((a, b) => b.goalsPerMatch - a.goalsPerMatch)[0];
  const tightest = [...rows].sort((a, b) => a.gap - b.gap)[0];
  const f2 = (v) => v.toFixed(2).replace(".", ",");
  const f1 = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ","));

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-current/10 bg-current/[0.02]">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-current/10 text-[11px] uppercase tracking-wide text-current/50">
              <th className="px-4 py-3 text-left font-semibold">Championnat</th>
              <th className="px-4 py-3 text-right font-semibold">Buts / match</th>
              <th className="px-4 py-3 text-right font-semibold">xG / match</th>
              <th className="px-4 py-3 text-left font-semibold">{single ? "Champion" : "Champions"}</th>
              <th className="px-4 py-3 text-right font-semibold">{single ? "Écart avec le 2ᵉ" : "Écart moyen avec le 2ᵉ"}</th>
              <th className="px-4 py-3 text-left font-semibold">Meilleur buteur</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-current/5">
                <td className="px-4 py-3 font-semibold">
                  <Link to={`/championnats/${r.id}`} className="hover:underline">
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Bar value={r.goalsPerMatch} max={maxGoals} label={f2(r.goalsPerMatch)} />
                </td>
                <td className="px-4 py-3">
                  {r.xgPerMatch != null ? (
                    <Bar value={r.xgPerMatch} max={maxXg} label={f2(r.xgPerMatch)} />
                  ) : (
                    <span className="block text-right text-current/35">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {single && r.titles[0] ? (
                    <>
                      {r.titles[0].champion} <span className="text-current/50">({r.titles[0].points} pts)</span>
                    </>
                  ) : (
                    r.champions.map(([team, n], i) => (
                      <span key={team}>
                        {i > 0 && ", "}
                        {team}
                        {n > 1 && <span className="text-current/50"> ×{n}</span>}
                      </span>
                    ))
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{f1(Math.round(r.gap * 10) / 10)} pt{r.gap > 1 ? "s" : ""}</td>
                <td className="px-4 py-3">
                  {r.topScorer ? (
                    <>
                      <Link to={`/joueurs/${r.topScorer.slug}`} className="hover:underline">
                        {r.topScorer.name}
                      </Link>{" "}
                      <span className="text-current/50">({r.topScorer.stats.goals} buts)</span>
                    </>
                  ) : (
                    <span className="text-current/35">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-sm text-current/60">
        Sur {single ? "cette saison" : "cette période"}, le championnat le plus prolifique est la{" "}
        <strong>{mostGoals.name}</strong> ({f2(mostGoals.goalsPerMatch)} buts par match). Course au titre la plus
        serrée : <strong>{tightest.name}</strong>
        {single && tightest.titles[0]
          ? `, avec ${tightest.gap} point${tightest.gap > 1 ? "s" : ""} d'écart entre ${tightest.titles[0].champion} et ${tightest.titles[0].runner_up}.`
          : `, avec ${f1(Math.round(tightest.gap * 10) / 10)} points d'écart en moyenne entre le champion et son dauphin.`}{" "}
        {onlyLast
          ? "Le xG par match additionne les xG de tous les joueurs (source : Understat)."
          : "xG et meilleur buteur : données joueurs disponibles pour 2025-26 uniquement."}
      </p>
    </div>
  );
}

export default function Championnats() {
  const [leagues, setLeagues] = useState(LEAGUES_FALLBACK);
  const [period, setPeriod] = useState(() => lastSeasonPeriod(insights.seasons));
  const chosen = periodSeasons(insights.seasons, period);

  useEffect(() => {
    let cancelled = false;
    fetch(LEAGUES_API_URL)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("API indisponible"))))
      .then((data) => {
        if (!cancelled) setLeagues(data.leagues?.length ? data.leagues : LEAGUES_FALLBACK);
      })
      .catch(() => {
        if (!cancelled) setLeagues(LEAGUES_FALLBACK);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHero
        eyebrow="Championnats"
        title="Les 5 grands championnats européens"
        subtitle="Premier League, Liga, Serie A, Bundesliga et Ligue 1 : une page détaillée par championnat et une comparaison sur la saison ou la période choisie."
      />
      <FilterBar>
        <PeriodFilter seasons={insights.seasons} value={period} onChange={setPeriod} />
      </FilterBar>
      <PageBody>
        <Section kicker="Championnats" title="Une page par championnat" intro="Classement, buteurs, profil des clubs, évolution de la saison et discipline.">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {leagues.map((league) => (
              <Link
                key={league.id}
                to={`/championnats/${league.id}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-current/10 bg-current/[0.02] px-4 py-7 text-center transition hover:border-current/30 hover:bg-current/[0.04]"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white p-2.5 shadow-sm">
                  {league.logo ? (
                    <img src={league.logo} alt={`${league.name} logo`} className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs font-bold text-[#221400]/50">{league.initials}</span>
                  )}
                </span>
                <span className="text-sm font-semibold group-hover:text-[#e86f2c]">{league.name}</span>
                {league.country && <span className="font-mono text-[11px] uppercase tracking-wide text-current/50">{league.country}</span>}
              </Link>
            ))}
          </div>
        </Section>

        <Section kicker={`Comparaison · ${periodLabel(period)}`} title="Les 5 championnats face à face">
          <LeagueComparison chosen={chosen} />
        </Section>
      </PageBody>
    </>
  );
}

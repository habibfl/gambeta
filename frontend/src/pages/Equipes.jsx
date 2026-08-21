import { useEffect, useRef, useState } from "react";
import PageBackground from "../components/PageBackground";
import { StandingsTable } from "../components/charts/PremierLeagueCharts";
import { slugify } from "../data/teamsRegistry";
import * as ligue1 from "../data/ligue1Provisional";
import * as premierLeague from "../data/premierLeagueProvisional";
import * as laLiga from "../data/laLigaProvisional";
import * as serieA from "../data/serieAProvisional";
import * as bundesliga from "../data/bundesligaProvisional";

const LEAGUES_API_URL = "http://localhost:8000/api/leagues";

// Même repli que Navbar.jsx (même ids, mêmes initiales) : garantit un
// affichage correct même si le backend ou la clé API-Football manque.
const LEAGUES_FALLBACK = [
  { id: "ligue-1", name: "Ligue 1", logo: null, initials: "L1" },
  { id: "premier-league", name: "Premier League", logo: null, initials: "PL" },
  { id: "liga", name: "Liga", logo: null, initials: "LIGA" },
  { id: "serie-a", name: "Serie A", logo: null, initials: "SA" },
  { id: "bundesliga", name: "Bundesliga", logo: null, initials: "BL" },
];

// Classement de chaque championnat, repris tel quel des fichiers de
// données déjà existants (aucune donnée recréée ici).
const LEAGUE_STANDINGS = {
  "ligue-1": ligue1.STANDINGS,
  "premier-league": premierLeague.STANDINGS,
  liga: laLiga.STANDINGS,
  "serie-a": serieA.STANDINGS,
  bundesliga: bundesliga.STANDINGS,
};

// Un tableau de classement = une section qui déclenche sa propre animation
// d'entrée (lignes qui glissent depuis la gauche) une fois visible à
// l'écran, même mécanique IntersectionObserver que les autres pages.
function LeagueSection({ league, standings }) {
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
    <section ref={sectionRef}>
      {/* Titre de section : logo du championnat (récupéré via l'API, avec
          repli sur les initiales) + nom */}
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-current/10 bg-current/[0.03] p-1.5">
          {league.logo ? (
            <img src={league.logo} alt={`${league.name} logo`} className="h-full w-full object-contain" />
          ) : (
            <span className="text-[9px] font-bold text-current/50">{league.initials}</span>
          )}
        </span>
        <h2 className="text-xl font-bold md:text-2xl">{league.name}</h2>
      </div>

      {/* Tableau pleine largeur, sans plafond de hauteur : c'est le contenu
          principal de la page, contrairement à la Case 1 de LeagueOverview
          où le même composant tient dans une petite colonne sticky. */}
      <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-4 md:p-6">
        <StandingsTable
          data={standings}
          active={active}
          scrollable={false}
          getHref={(row) => `/equipes/${slugify(row.team)}`}
        />
      </div>
    </section>
  );
}

// Page "Équipes" : les 5 classements des grands championnats, empilés
// verticalement, chacun avec le même tableau que la Case 1 de
// LeagueOverview.jsx mais affiché en pleine largeur. Chaque ligne d'équipe
// mène vers sa fiche détaillée (/equipes/:slug, EquipeDetail.jsx).
export default function Equipes() {
  const [leagues, setLeagues] = useState(LEAGUES_FALLBACK);

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
      <PageBackground />
      <section className="flex-1 px-6 py-32 md:px-12 text-[var(--gambeta-ink)]">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-14 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e86f2c] mb-2">
              Les classements
            </p>
            <h1 className="text-[32px] md:text-[42px] font-bold tracking-[-0.02em]">Équipes</h1>
            <p className="mt-4 text-current/60">
              Le classement des cinq grands championnats couverts par Gambeta. Cliquez sur une
              équipe pour ouvrir sa fiche détaillée.
            </p>
          </div>

          {/* Les 5 classements, un par championnat, avec un espacement
              généreux et une ligne de séparation entre chacun pour que la
              page reste lisible plutôt qu'un simple mur de chiffres. */}
          <div className="space-y-16">
            {LEAGUES_FALLBACK.map(({ id }, index) => {
              const league = leagues.find((item) => item.id === id) ?? LEAGUES_FALLBACK[index];
              return (
                <div key={id} className={index > 0 ? "border-t border-current/10 pt-16" : ""}>
                  <LeagueSection league={league} standings={LEAGUE_STANDINGS[id]} />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

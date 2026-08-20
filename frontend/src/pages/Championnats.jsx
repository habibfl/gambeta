import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageBackground from "../components/PageBackground";

const LEAGUES_API_URL = "http://localhost:8000/api/leagues";

// Repli si l'API (backend éteint, clé API-Football absente...) ne répond
// pas : mêmes 5 championnats et mêmes initiales que le repli de la Navbar,
// pour que la page ne soit jamais vide.
const LEAGUES_FALLBACK = [
  { id: "ligue-1", name: "Ligue 1", country: "France", logo: null, initials: "L1" },
  { id: "premier-league", name: "Premier League", country: "Angleterre", logo: null, initials: "PL" },
  { id: "liga", name: "Liga", country: "Espagne", logo: null, initials: "LIGA" },
  { id: "serie-a", name: "Serie A", country: "Italie", logo: null, initials: "SA" },
  { id: "bundesliga", name: "Bundesliga", country: "Allemagne", logo: null, initials: "BL" },
];

// Page liste : les 5 grands championnats, chacun en carte cliquable vers
// sa page de détail (/championnats/:id).
export default function Championnats() {
  const [leagues, setLeagues] = useState(LEAGUES_FALLBACK);

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
      <PageBackground />
      <section className="flex-1 text-[var(--gambeta-ink)] px-6 md:px-12 pt-32 pb-24">
        <div className="max-w-[1200px] mx-auto">
          <div className="mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e86f2c] mb-2">
              Championnats
            </p>
            <h1 className="text-[32px] md:text-[42px] font-bold tracking-[-0.02em]">
              Les 5 grands championnats européens.
            </h1>
          </div>

          {/* Grille de cartes : 2 colonnes en mobile jusqu'à 5 en desktop,
              même langage visuel que les cartes du menu "Ligues" de la Navbar. */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
            {leagues.map((league) => (
              <Link
                key={league.id}
                to={`/championnats/${league.id}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-current/10 bg-current/[0.02] px-4 py-8 text-center transition-all duration-200 hover:-translate-y-1 hover:border-[#e86f2c]/40 hover:shadow-[0_16px_40px_rgba(34,20,0,0.1)]"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white p-3 shadow-sm">
                  {league.logo ? (
                    <img
                      src={league.logo}
                      alt={`${league.name} logo`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    // Repli à initiales tant que le vrai logo n'est pas disponible
                    <span className="text-xs font-bold text-[#221400]/50">{league.initials}</span>
                  )}
                </span>
                <span className="text-sm font-semibold">{league.name}</span>
                {league.country && <span className="text-xs text-current/50">{league.country}</span>}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

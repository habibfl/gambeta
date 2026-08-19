import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const LEAGUES_API_URL = "http://localhost:8000/api/leagues";

// Transforme un identifiant d'URL en titre lisible (ex: "ligue-des-champions"
// -> "Ligue Des Champions"). Sert de repli pour les compétitions inter-clubs
// (Ligue des Champions, Europa League) qui ne font pas partie des 5
// championnats renvoyés par /api/leagues.
function humanizeSlug(slug) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Page détail d'un championnat (route /championnats/:id) : pour l'instant,
// juste le nom (récupéré via l'API si possible) + un message d'attente.
export default function ChampionnatDetail() {
  const { id } = useParams();
  const [leagues, setLeagues] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(LEAGUES_API_URL)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("API indisponible"))))
      .then((data) => {
        if (!cancelled) setLeagues(data.leagues || []);
      })
      .catch(() => {
        if (!cancelled) setLeagues([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const league = leagues?.find((item) => item.id === id);
  const displayName = league?.name ?? humanizeSlug(id);

  return (
    <section className="flex-1 flex items-center justify-center px-6 py-32 text-center bg-[var(--gambeta-paper)] text-[var(--gambeta-ink)]">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e86f2c] mb-3">
          Championnat
        </p>

        {loading ? (
          <h1 className="text-[28px] md:text-[34px] font-bold tracking-[-0.02em]">
            Chargement...
          </h1>
        ) : (
          <>
            <h1 className="text-[32px] md:text-[42px] font-bold tracking-[-0.02em]">
              {displayName}
            </h1>
            {league?.country && <p className="mt-2 text-current/60">{league.country}</p>}
            <p className="mt-6 text-current/60">Classement et statistiques à venir</p>
          </>
        )}
      </div>
    </section>
  );
}

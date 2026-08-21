import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageBackground from "../components/PageBackground";
import PremierLeagueOverview from "../components/PremierLeagueOverview";
import PlayerJars from "../components/PlayerJars";
import { PL_PLAYERS_XG, PL_PLAYERS_XA } from "../data/premierLeagueProvisional";

const LEAGUES_API_URL = "http://localhost:8000/api/leagues";
const COMPETITIONS_API_URL = "http://localhost:8000/api/competitions";

// Transforme un identifiant d'URL en titre lisible (ex: "ligue-des-champions"
// -> "Ligue Des Champions"). Ne sert plus que de tout dernier repli, si les
// deux appels API ont échoué (avant, c'était systématique pour les
// compétitions inter-clubs puisqu'elles n'existaient que dans la Navbar,
// pas dans les données récupérées ici).
function humanizeSlug(slug) {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Petit utilitaire : récupère un endpoint JSON, renvoie [] si ça échoue
// plutôt que de faire planter la page (chaque source est indépendante).
function fetchItems(url, key) {
  return fetch(url)
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error("API indisponible"))))
    .then((data) => data[key] || [])
    .catch(() => []);
}

// Page détail d'un championnat OU d'une compétition (route
// /championnats/:id). Pour l'instant, un seul cas a un vrai contenu
// détaillé : la Premier League (voir PremierLeagueOverview.jsx, la
// structure "Cases" façon pudding.cool). Tous les autres championnats
// gardent la page générique (nom récupéré via l'API + message d'attente),
// prête à recevoir le même traitement plus tard.
export default function ChampionnatDetail() {
  const { id } = useParams();
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // La Premier League n'a pas besoin de ces données (son contenu est
    // déjà écrit "en dur" dans PremierLeagueOverview, `loading` n'est
    // même jamais affiché sur cette branche) : pas la peine d'appeler
    // l'API pour rien.
    if (id === "premier-league") return undefined;

    let cancelled = false;
    // Les deux routes sont indépendantes (une ligue ou une compétition
    // suffit à afficher la page), donc on les récupère en parallèle et on
    // fusionne les deux listes plutôt que de dépendre d'une seule.
    Promise.all([
      fetchItems(LEAGUES_API_URL, "leagues"),
      fetchItems(COMPETITIONS_API_URL, "competitions"),
    ]).then(([leagues, competitions]) => {
      if (cancelled) return;
      setItems([...leagues, ...competitions]);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (id === "premier-league") {
    return (
      <>
        <PremierLeagueOverview />
        <PlayerJars
          title="Les références de la Premier League"
          playersXG={PL_PLAYERS_XG}
          playersXA={PL_PLAYERS_XA}
        />
      </>
    );
  }

  const item = items?.find((entry) => entry.id === id);
  const displayName = item?.name ?? humanizeSlug(id);

  return (
    <>
      <PageBackground />
      <section className="flex-1 flex items-center justify-center px-6 py-32 text-center text-[var(--gambeta-ink)]">
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
              {item?.country && <p className="mt-2 text-current/60">{item.country}</p>}
              <p className="mt-6 text-current/60">Classement et statistiques à venir</p>
            </>
          )}
        </div>
      </section>
    </>
  );
}

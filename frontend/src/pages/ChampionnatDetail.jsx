import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PageBackground from "../components/PageBackground";
import LeagueOverview from "../components/LeagueOverview";
import PlayerJars from "../components/PlayerJars";
import { LEAGUE_OVERVIEWS } from "../data/leagueOverviews";
import { COMPETITION_CHAMPIONS } from "../data/leagueMedia";

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
// /championnats/:id). Les 5 grands championnats (Ligue 1, Premier
// League, Liga, Serie A, Bundesliga) ont un vrai contenu détaillé, tous
// construits par le même composant générique LeagueOverview.jsx (la
// structure "Cases" façon pudding.cool), chacun alimenté par sa propre
// config dans data/leagueOverviews.js. Les compétitions inter-clubs
// (Ligue des champions, etc.) gardent pour l'instant la page générique
// (nom récupéré via l'API + message d'attente), prête à recevoir le
// même traitement plus tard.
export default function ChampionnatDetail() {
  const { id } = useParams();
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(true);
  const overview = LEAGUE_OVERVIEWS[id];

  useEffect(() => {
    // Un championnat avec une config détaillée n'a pas besoin de ces
    // données (son contenu vient déjà de data/leagueOverviews.js,
    // `loading` n'est même jamais affiché sur cette branche) : pas la
    // peine d'appeler l'API pour rien.
    if (overview) return undefined;

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
  }, [id, overview]);

  if (overview) {
    return (
      <>
        <LeagueOverview
          eyebrow={overview.eyebrow}
          title={overview.title}
          intro={overview.intro}
          cases={overview.cases}
          stars={overview.stars}
        />
        <PlayerJars
          title={overview.playerJars.title}
          playersXG={overview.playerJars.playersXG}
          playersXA={overview.playerJars.playersXA}
        />
      </>
    );
  }

  const item = items?.find((entry) => entry.id === id);
  const displayName = item?.name ?? humanizeSlug(id);
  // Seules les 3 compétitions inter-clubs ont une photo de champion pour
  // l'instant : les autres ids (championnats sans config détaillée, s'il y
  // en avait) gardent la page générique telle quelle, sans logo ni photo.
  const championPhoto = COMPETITION_CHAMPIONS[id];

  return (
    <>
      <PageBackground />
      <section className="flex-1 flex items-center justify-center px-6 py-32 text-center text-[var(--gambeta-ink)]">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e86f2c] mb-3">
            {championPhoto ? "Compétition" : "Championnat"}
          </p>

          {loading ? (
            <h1 className="text-[28px] md:text-[34px] font-bold tracking-[-0.02em]">
              Chargement...
            </h1>
          ) : (
            <>
              {championPhoto && (
                <div className="mb-4 flex justify-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-current/10 bg-current/[0.03] p-2">
                    {item?.logo ? (
                      <img src={item.logo} alt={`${displayName} logo`} className="h-full w-full object-contain" />
                    ) : (
                      // Repli tant que le vrai logo (API) n'est pas disponible
                      <span className="text-[10px] font-bold text-current/50">
                        {displayName.split(" ").map((word) => word[0]).join("").slice(0, 3).toUpperCase()}
                      </span>
                    )}
                  </span>
                </div>
              )}

              <h1 className="text-[32px] md:text-[42px] font-bold tracking-[-0.02em]">
                {displayName}
              </h1>
              {item?.country && <p className="mt-2 text-current/60">{item.country}</p>}

              {championPhoto && (
                <figure className="mt-10">
                  <img
                    src={championPhoto}
                    alt={`Vainqueur de l'édition précédente de ${displayName}`}
                    className="mx-auto h-72 w-56 rounded-2xl border border-current/10 object-cover shadow-lg md:h-96 md:w-72"
                  />
                  <figcaption className="mt-3 text-sm text-current/60">
                    Vainqueur de l'édition précédente
                  </figcaption>
                </figure>
              )}

              <p className="mt-6 text-current/60">Classement et statistiques à venir</p>
            </>
          )}
        </div>
      </section>
    </>
  );
}

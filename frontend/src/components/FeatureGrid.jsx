import { useEffect, useRef, useState } from "react";

// Les 3 fonctionnalités mises en avant, avec leur contenu inchangé.
const FEATURES = [
  {
    title: "Comparer les championnats",
    description:
      "Croisez les statistiques clés entre plusieurs championnats en un coup d'œil.",
  },
  {
    title: "Radar des joueurs",
    description:
      "Visualisez le profil complet d'un joueur sur un radar graphique interactif.",
  },
  {
    title: "Pépites sous-cotées",
    description:
      "Découvrez les jeunes talents qui performent au-dessus de leur cote.",
  },
];

// Espace réservé pour l'aperçu visuel d'une fonctionnalité.
// TODO : remplacer par une vraie capture d'écran ou un composant
// graphique une fois développé, déposer dans frontend/src/assets/screenshots/
function ImagePlaceholder({ title, className = "" }) {
  return (
    <div
      className={`flex h-full min-h-[320px] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-100 p-8 text-center dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Aperçu à venir :
      </p>
      <p className="text-base font-semibold text-gray-600 dark:text-gray-300">
        {title}
      </p>
    </div>
  );
}

export default function FeatureGrid() {
  // Index du bloc de texte actuellement visible au centre de l'écran :
  // c'est lui qui pilote le contenu de l'espace réservé collé (sticky).
  const [activeIndex, setActiveIndex] = useState(0);

  // Une ref par bloc de texte, remplie via le callback `ref` ci-dessous,
  // pour pouvoir les observer sans dépendre de leur ordre de rendu.
  const blockRefs = useRef([]);

  useEffect(() => {
    // On ne déclenche un changement de bloc actif que lorsqu'un bloc de
    // texte traverse une fine bande horizontale au centre de l'écran
    // (rootMargin négatif en haut et en bas) : c'est le principe technique
    // du "pinned narrative" façon The Pudding/NYT, sans dépendance externe.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveIndex(Number(entry.target.dataset.index));
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    blockRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="comparer"
      className="bg-[var(--gambeta-paper)] text-[var(--gambeta-ink)] py-24 px-6 md:px-12"
      // Légère texture de points en arrière-plan (motif SVG "à la main" via
      // radial-gradient répété) plutôt qu'un fond blanc plat : un point
      // corail tous les 22px, à 5% d'opacité, donc perceptible sans distraire.
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgba(232,111,44,0.05) 1px, transparent 0)",
        backgroundSize: "22px 22px",
      }}
    >
      <div className="max-w-[1200px] mx-auto">
        {/* En-tête de section */}
        <div className="mb-12 md:mb-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e86f2c] mb-2">
            Fonctionnalités
          </p>
          <h2 className="text-[32px] md:text-[38px] font-bold tracking-[-0.02em]">
            Tout comparer, en un seul endroit.
          </h2>
        </div>

        {/* Sur desktop (md+) : deux colonnes, gauche ~45% / droite ~55%.
            Sur mobile : une seule colonne, gérée directement dans le
            <div className="flex flex-col"> ci-dessous (chaque bloc de
            texte est suivi de son propre espace réservé). */}
        <div className="md:grid md:grid-cols-[45%_55%] md:gap-12 md:items-start">
          {/* Colonne gauche : les 3 blocs de texte empilés */}
          <div className="flex flex-col">
            {FEATURES.map((feature, index) => (
              <div key={feature.title}>
                <div
                  ref={(el) => {
                    blockRefs.current[index] = el;
                  }}
                  data-index={index}
                  className="flex flex-col justify-center py-10 md:min-h-[80vh] md:py-0"
                >
                  <h3 className="text-2xl md:text-3xl font-semibold mb-3 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-[15px] md:text-base text-current/60 leading-relaxed max-w-md">
                    {feature.description}
                  </p>
                </div>

                {/* Espace réservé mobile : directement sous son bloc de
                    texte, pas de sticky (inutile sur petit écran). */}
                <div className="mb-10 md:hidden">
                  <ImagePlaceholder title={feature.title} />
                </div>
              </div>
            ))}
          </div>

          {/* Colonne droite : espace réservé collé, visible seulement
              à partir de md. Son contenu suit `activeIndex`. */}
          <div className="hidden md:sticky md:top-28 md:block md:h-[70vh]">
            <ImagePlaceholder
              title={FEATURES[activeIndex].title}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

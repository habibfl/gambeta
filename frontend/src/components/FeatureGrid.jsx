import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// Les 6 fonctionnalités mises en avant, réparties en 2 groupes de 3.
const GROUP_1 = [
  {
    title: "Comparer les championnats",
    description:
      "La Ligue 1 n'a pas le même rythme que la Premier League. Croisez buts, possession et intensité entre les cinq grands championnats européens pour voir où se joue vraiment le meilleur football.",
    to: "/championnats",
  },
  {
    title: "Radar des joueurs",
    description:
      "Vitesse, passes, duels, finition. Chaque joueur a un profil unique. Le radar interactif le rend lisible en un coup d'œil, sans passer par un tableur.",
    to: "/joueurs",
  },
  {
    title: "Pépites sous-cotées",
    description:
      "Certains jeunes joueurs produisent déjà plus que leur valeur marchande ne le laisse penser. Notre indicateur les repère avant qu'ils ne deviennent chers.",
    to: "/comparateur",
  },
];

const GROUP_2 = [
  {
    title: "Profils d'équipes complets",
    description:
      "Forme, discipline, style de jeu. Chaque club a une identité statistique. Explorez-la saison après saison.",
    to: "/equipes",
  },
  {
    title: "Historique multi-saisons",
    description:
      "2017 à aujourd'hui, sans trou dans les données. De quoi voir une tendance se dessiner plutôt qu'un instantané isolé.",
    to: "/championnats",
  },
  {
    title: "Comparateur tête-à-tête",
    description:
      "Deux joueurs, une seule vue. Confrontez leurs statistiques directement, sans changer d'onglet.",
    to: "/comparateur",
  },
];

// Espace réservé pour l'aperçu visuel d'une carte.
// TODO : remplacer par une vraie capture d'écran une fois disponible,
// déposer les fichiers dans frontend/src/assets/screenshots/
function CardImagePlaceholder() {
  return (
    <div className="flex aspect-video w-full items-center justify-center border-b-2 border-dashed border-gray-300 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Aperçu à venir
      </p>
    </div>
  );
}

// Une carte = son propre IntersectionObserver, pour se déclencher dès
// qu'elle entre dans le viewport (et pas toutes en même temps que la
// section). `index` sert au décalage en cascade entre les 3 cartes d'un
// même groupe.
function FeatureCard({ feature, index }) {
  const cardRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          // Une seule apparition : pas besoin de réobserver après coup.
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  // Cascade entre cartes du même groupe (100ms d'écart) ; le texte suit
  // l'image avec 100ms de retard supplémentaire pour un effet plus soigné.
  const imageDelay = index * 100;
  const textDelay = imageDelay + 100;
  const hiddenState = "opacity-0 translate-y-5";
  const visibleState = "opacity-100 translate-y-0";

  return (
    <Link
      ref={cardRef}
      to={feature.to}
      className="group flex flex-col overflow-hidden rounded-2xl border border-current/10 bg-current/[0.02] transition-all duration-300 hover:-translate-y-1 hover:border-[#e86f2c]/40 hover:shadow-[0_16px_40px_rgba(34,20,0,0.1)]"
    >
      <div
        className={`transition-all duration-500 ease-out ${visible ? visibleState : hiddenState}`}
        style={{ transitionDelay: `${imageDelay}ms` }}
      >
        <CardImagePlaceholder />
      </div>

      <div
        className={`flex flex-1 flex-col p-6 transition-all duration-500 ease-out ${visible ? visibleState : hiddenState}`}
        style={{ transitionDelay: `${textDelay}ms` }}
      >
        <h3 className="mb-2 text-lg font-bold">{feature.title}</h3>
        <p className="text-[14px] leading-relaxed text-current/60">{feature.description}</p>
        <span className="mt-4 flex items-center gap-1 text-[13px] font-bold uppercase tracking-wider text-[#e86f2c]">
          Explorer
          <ArrowRight size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}

export default function FeatureGrid() {
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
        <div className="mb-12 md:mb-16">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#e86f2c] mb-2">
            Fonctionnalités
          </p>
          <h2 className="text-[32px] md:text-[38px] font-bold tracking-[-0.02em]">
            Tout comparer, en un seul endroit.
          </h2>
        </div>

        {/* Deux groupes de 3 cartes, une section sous l'autre : 1 colonne
            en mobile, 3 colonnes à partir de md. */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {GROUP_1.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          {GROUP_2.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

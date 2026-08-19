// Trois entrées principales du site, présentées comme des cartes
const FEATURES = [
  {
    title: "Comparer les championnats",
    description:
      "Croisez les statistiques clés (buts, possession, niveau de jeu) entre plusieurs championnats en un coup d'œil.",
  },
  {
    title: "Radar des joueurs",
    description:
      "Visualisez le profil complet d'un joueur — vitesse, passes, duels, finition — sur un graphique radar interactif.",
  },
  {
    title: "Pépites sous-cotées",
    description:
      "Découvrez les jeunes talents qui performent au-dessus de leur cote, repérés par nos indicateurs de progression.",
  },
];

export default function FeatureGrid() {
  return (
    <section
      id="comparer"
      className="bg-[var(--gambeta-paper)] text-[var(--gambeta-ink)] py-24 px-6 md:px-12"
    >
      <div className="max-w-[1200px] mx-auto">
        {/* En-tête de section */}
        <div className="mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e86f2c] mb-2">
            Fonctionnalités
          </p>
          <h2 className="text-[32px] md:text-[38px] font-bold tracking-[-0.02em]">
            Tout comparer, en un seul endroit.
          </h2>
        </div>

        {/* Grille : 1 colonne en mobile, 3 colonnes à partir de md.
            Même langage visuel que les cartes de ligue de la navbar :
            bord fin, coins arrondis, légère élévation au survol. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="group rounded-2xl border border-current/10 bg-current/[0.02] p-7 transition-all duration-300 hover:-translate-y-1 hover:border-[#e86f2c]/40 hover:shadow-[0_16px_40px_rgba(34,20,0,0.1)]"
            >
              {/* Pastille accent : repère visuel rapide, pas d'icône
                  pour garder le composant simple */}
              <span
                className="inline-block w-10 h-10 rounded-lg mb-5 bg-[#e86f2c] transition-transform duration-300 group-hover:scale-110"
                aria-hidden="true"
              />
              <h3 className="text-[18px] font-semibold mb-2">{feature.title}</h3>
              <p className="text-[14px] text-current/60 leading-relaxed">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

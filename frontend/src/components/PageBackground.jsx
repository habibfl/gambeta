// Fond décoratif réutilisable : quelques lignes de terrain de football,
// très diluées, à placer en tout premier élément des pages qui n'ont pas
// encore de vrai contenu visuel (Championnats, ChampionnatDetail, Équipes,
// Joueurs, Comparateur). `fixed` + `-z-10` + `pointer-events-none` : il
// reste toujours derrière le contenu et ne capte jamais un clic.
export default function PageBackground() {
  return (
    <div
      className="pitch-breathe pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* viewBox proportionné comme un terrain (paysage) ; preserveAspectRatio
          "slice" fait que le motif couvre tout l'écran, quel que soit son
          ratio, sans jamais se déformer. */}
      <svg className="h-full w-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice">
        <g
          fill="none"
          // Corail à ~5% en clair, blanc à ~3.5% en sombre : à peine visible,
          // jamais de quoi distraire de la lecture du contenu par-dessus.
          className="stroke-[#FF6B4A]/5 dark:stroke-white/[0.035]"
          strokeWidth="1.2"
        >
          {/* `vector-effect` ne s'hérite pas du <g> parent en SVG : il est
              répété sur chaque forme pour garder une épaisseur de trait
              constante en pixels écran, même si le viewBox est étiré pour
              remplir des fenêtres de tailles très différentes. */}
          {/* Contour du terrain : lignes de touche + lignes de but */}
          <rect x="40" y="40" width="920" height="520" rx="4" vectorEffect="non-scaling-stroke" />

          {/* Ligne médiane */}
          <line x1="500" y1="40" x2="500" y2="560" vectorEffect="non-scaling-stroke" />

          {/* Rond central */}
          <circle cx="500" cy="300" r="110" vectorEffect="non-scaling-stroke" />

          {/* Surfaces de réparation et de but, à gauche et à droite */}
          <rect x="40" y="175" width="160" height="250" vectorEffect="non-scaling-stroke" />
          <rect x="40" y="230" width="60" height="140" vectorEffect="non-scaling-stroke" />
          <rect x="800" y="175" width="160" height="250" vectorEffect="non-scaling-stroke" />
          <rect x="900" y="230" width="60" height="140" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    </div>
  );
}

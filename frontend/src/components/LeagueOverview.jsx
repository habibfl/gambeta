import { useEffect, useRef, useState } from "react";

// Photo qui alterne toutes les 5 secondes entre les joueurs vedettes du
// championnat, avec un fondu enchaîné (crossfade) plutôt qu'un changement
// brutal : les deux images sont superposées en position absolue, seule
// l'opacité de celle qui doit apparaître change, la transition CSS fait le
// reste. Rendu `null` si aucune photo n'a été fournie (championnat sans
// config, ou config incomplète) plutôt que de casser la mise en page.
function AlternatingStarPhoto({ images, alt }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length < 2) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [images]);

  if (!images || images.length === 0) return null;

  return (
    <div className="relative h-64 w-48 shrink-0 overflow-hidden rounded-2xl border border-current/10 shadow-lg md:h-80 md:w-60">
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
    </div>
  );
}

// Une Case = graphique collé (sticky) à gauche pendant que son texte
// défile à droite. `position: sticky` gère à elle seule le "reste fixe
// pendant que la section défile" (mécanique CSS pure, comme sur
// pudding.cool) ; l'IntersectionObserver ne sert qu'à savoir quand la
// Case est visible, pour déclencher le dessin/l'animation du graphique
// au bon moment plutôt qu'au chargement de la page.
function Case({ index, title, text, Chart, data }) {
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
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="border-t border-current/10 bg-[var(--gambeta-paper)] text-[var(--gambeta-ink)]"
    >
      {/* `md:items-start` est essentiel : sans lui, `align-items: stretch`
          (comportement par défaut d'un flex-row) étire la colonne du
          graphique à la même hauteur que la colonne de texte, et
          `position: sticky` n'a alors plus aucune marge pour "coller" —
          exactement l'équivalent de `align-self: flex-start` sur
          `figure` dans le CSS original de pudding.cool. */}
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 py-12 md:flex-row md:items-start md:gap-10 md:px-12 md:py-0">
        {/* Graphique : ~60%, collé (sticky) sur desktop tant que la Case défile */}
        <div className="md:sticky md:top-24 md:h-fit md:w-[60%] md:py-16">
          <p className="text-xs font-bold uppercase tracking-widest text-[#e86f2c]">
            Case {index + 1}
          </p>
          <h3 className="mt-1 text-xl font-bold md:text-2xl">{title}</h3>
          <div className="mt-6 rounded-2xl border border-current/10 bg-current/[0.02] p-4 md:p-6">
            <Chart data={data} active={active} />
          </div>
        </div>

        {/* Texte : ~40%, défile normalement. min-h volontairement bien plus
            grand que le graphique (quitte à laisser du vide) : c'est cette
            différence de hauteur entre les deux colonnes qui donne à
            `position: sticky` la marge nécessaire pour rester visible
            pendant le scroll — sans ça, les deux colonnes font quasiment
            la même hauteur et l'effet ne se voit quasiment pas. */}
        <div className="flex items-center md:min-h-[150vh] md:w-[40%]">
          <p
            className="text-base leading-relaxed transition-all duration-500 ease-out md:text-lg"
            style={{
              opacity: active ? 1 : 0,
              transform: active ? "translateY(0)" : "translateY(16px)",
            }}
          >
            {text}
          </p>
        </div>
      </div>
    </section>
  );
}

// Version générique de la page de détail d'un championnat : introduction
// puis les 5 Cases (classement, xG buteurs, xA passeurs, style de jeu,
// évolution du classement). Toute la configuration (textes, données,
// graphiques à utiliser) vient des props, exactement comme PlayerJars
// reçoit ses props `playersXG`/`playersXA` : ce composant ne connaît
// aucun championnat en particulier, c'est ChampionnatDetail.jsx qui lui
// fournit la bonne config via data/leagueOverviews.js.
export default function LeagueOverview({ eyebrow, title, intro, cases, stars }) {
  return (
    <div className="pt-24">
      {/* Introduction, avant la première Case. Avec une photo (`stars`),
          le texte passe à gauche et la photo à droite sur desktop, plutôt
          que centrée sur toute la largeur : ça laisse la lecture du texte
          intacte tout en donnant de la place à l'image, sans jamais la
          faire passer devant les mots. */}
      <div className="mx-auto max-w-[900px] px-6 py-12 md:px-12 md:py-20">
        <div className="flex flex-col items-center gap-10 md:flex-row md:items-center md:justify-center md:gap-14">
          <div className="text-center md:text-left">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#e86f2c]">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              {title}
            </h1>
            <p className="mt-4 text-current/60 md:text-lg">{intro}</p>
          </div>

          <AlternatingStarPhoto images={stars} alt={`Joueur vedette de ${eyebrow}`} />
        </div>
      </div>

      {cases.map((c, index) => (
        <Case key={c.title} index={index} {...c} />
      ))}
    </div>
  );
}

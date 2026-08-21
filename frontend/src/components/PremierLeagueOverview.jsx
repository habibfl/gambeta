import { useEffect, useRef, useState } from "react";
import {
  StandingsTable,
  LollipopChart,
  HorizontalBarChart,
  ScatterPlot,
  RankLineChart,
} from "./charts/PremierLeagueCharts";
import {
  STANDINGS,
  XG_SCORERS,
  XA_CREATORS,
  POSSESSION_VS_PPDA,
  RANK_EVOLUTION,
} from "../data/premierLeagueProvisional";

// Les 5 "Cases" de la page, façon pudding.cool/2018/11/titletowns : chaque
// Case associe un texte à un graphique. Le composant du graphique reçoit
// `data` + `active` (vrai une fois la Case visible, pour ne dessiner/animer
// qu'à ce moment-là plutôt qu'au chargement de la page).
const CASES = [
  {
    title: "Le classement de la saison",
    text: "Un classement ne dit jamais tout d'une saison. Il capture un instant, la somme de vingt journées de résultats, sans distinguer la performance solide de la simple réussite passagère. Mais à ce stade de l'exercice, les tendances commencent à se dessiner clairement : certains clubs tiennent un rythme de champion, d'autres découvrent déjà la difficulté de la lutte pour le maintien. Voici où en est chaque équipe, journée après journée.",
    Chart: StandingsTable,
    data: STANDINGS,
  },
  {
    title: "Qui marque vraiment plus que prévu ?",
    text: "Il y a les renards des surfaces qui transforment la moindre occasion en but, et ceux qui ont simplement besoin d'en avoir beaucoup pour approcher le même total. Le xG, ou buts attendus, mesure la qualité des occasions générées par un joueur, indépendamment du résultat final au tableau d'affichage. Un attaquant dont les buts réels dépassent largement son xG traverse une période de réussite qui ne dure généralement pas. À l'inverse, celui qui reste en dessous de son xG finit souvent par rattraper son retard sur la durée d'une saison.",
    Chart: LollipopChart,
    data: XG_SCORERS,
  },
  {
    title: "Les passeurs qui changent tout",
    text: "Certains buts se célèbrent à deux, voire à trois. Le xA, ou passes décisives attendues, rend justice à ceux qui construisent l'occasion, la dernière passe, le décalage dans le dos de la défense, sans jamais apparaître au tableau d'affichage à la fin du match. C'est souvent dans ce classement que se cachent les vrais chefs d'orchestre d'une équipe, ceux que l'œil du néophyte repère moins facilement qu'un buteur. Ce sont eux qui, saison après saison, rendent leurs coéquipiers meilleurs.",
    Chart: HorizontalBarChart,
    data: XA_CREATORS,
  },
  {
    title: "L'intensité, ça se mesure aussi",
    text: "Deux philosophies s'affrontent chaque week-end sur les pelouses anglaises. D'un côté, la possession patiente, le ballon qui circule de pied en pied jusqu'à trouver la faille. De l'autre, le pressing intense, la volonté d'étrangler l'adversaire dès la perte de balle, sans lui laisser le temps de respirer. Le PPDA, qui mesure le nombre de passes adverses autorisées avant une intervention défensive, distingue clairement ces deux écoles de pensée. Aucune des deux approches n'est intrinsèquement supérieure, mais toutes les deux laissent une empreinte statistique très reconnaissable.",
    Chart: ScatterPlot,
    data: POSSESSION_VS_PPDA,
  },
  {
    title: "Une saison qui se dessine",
    text: "Un tableau flatteur en septembre ne garantit absolument rien en mai. Le football anglais a vu trop de départs canon se transformer en saisons décevantes, et trop de débuts poussifs déboucher sur une fin de parcours triomphante. Voici comment les trajectoires de plusieurs équipes se sont vraiment dessinées, journée après journée, avec leurs accélérations, leurs passages à vide et leurs remontées parfois spectaculaires. C'est dans cette dynamique, plus que dans l'instantané du classement, que se lit la vraie force d'un collectif.",
    Chart: RankLineChart,
    data: RANK_EVOLUTION,
  },
];

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

// Page de détail spécifique à la Premier League : introduction courte puis
// les 5 Cases. Les autres championnats gardent la page générique définie
// dans ChampionnatDetail.jsx — seule la Premier League a ce contenu riche
// pour l'instant.
export default function PremierLeagueOverview() {
  return (
    <div className="pt-24">
      {/* Introduction, avant la première Case */}
      <div className="mx-auto max-w-[720px] px-6 py-12 text-center md:px-12 md:py-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#e86f2c]">
          Premier League
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
          Anatomie d'une saison de Premier League
        </h1>
        <p className="mt-4 text-current/60 md:text-lg">
          Vingt clubs, quarante journées de bataille, et une donnée qui
          raconte souvent une autre histoire que le tableau de classement.
          Chaque week-end apporte son lot de surprises, de séries qui
          s'étirent et de certitudes qui s'effondrent. Voici cinq façons de
          lire cette saison de Premier League au-delà du simple résultat du
          dimanche soir.
        </p>
      </div>

      {CASES.map((c, index) => (
        <Case key={c.title} index={index} {...c} />
      ))}
    </div>
  );
}

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
    text: "20 équipes, 38 journées, une seule question : qui tiendra la distance ? Voici où en est la Premier League cette saison.",
    Chart: StandingsTable,
    data: STANDINGS,
  },
  {
    title: "Qui marque vraiment plus que prévu ?",
    text: "Un buteur peut planter 20 buts avec une seule vraie occasion franche par match, ou en réclamer 20 comme une évidence statistique. Le xG (buts attendus) fait la différence entre efficacité et chance.",
    Chart: LollipopChart,
    data: XG_SCORERS,
  },
  {
    title: "Les passeurs qui changent tout",
    text: "Un but ne vient jamais de nulle part. Le xA (passes décisives attendues) identifie les joueurs qui créent le danger, même sans être sur la feuille de match des buteurs.",
    Chart: HorizontalBarChart,
    data: XA_CREATORS,
  },
  {
    title: "L'intensité, ça se mesure aussi",
    text: "Possession, passes progressives, intensité du pressing (PPDA) : certaines équipes jouent lentement et proprement, d'autres étouffent l'adversaire dès la récupération du ballon.",
    Chart: ScatterPlot,
    data: POSSESSION_VS_PPDA,
  },
  {
    title: "Une saison qui se dessine",
    text: "Un classement à la 10e journée ne dit pas grand-chose. Voici comment les positions évoluent, journée après journée, depuis le début de la saison.",
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
          Vingt équipes, des centaines de milliers de passes, et des données
          qui racontent une histoire différente du simple classement.
          Cinq façons de lire la saison en cours.
        </p>
      </div>

      {CASES.map((c, index) => (
        <Case key={c.title} index={index} {...c} />
      ))}
    </div>
  );
}

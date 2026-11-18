import { Link } from "react-router-dom";
import PageHero, { HeroStat } from "./PageHero";
import insights from "../data/insights.json";

// En-tête de l'accueil : même bandeau « terrain » que les autres pages
export default function Hero() {
  const { counts, seasons } = insights;
  return (
    <PageHero
      eyebrow="2021-22 à 2025-26"
      title={
        <>
          Le football,
          <br />
          décodé par la donnée.
        </>
      }
      subtitle={`Cinq championnats, ${seasons.length} saisons, ${counts.matches.toLocaleString("fr-FR")} matchs : statistiques avancées (xG, xA), modèles prédictifs et analyses reproductibles.`}
    >
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap gap-3">
          <HeroStat value={counts.matches.toLocaleString("fr-FR")} label="matchs" />
          <HeroStat value={counts.team_seasons} label="équipes-saisons" />
          <HeroStat value={counts.players_2526.toLocaleString("fr-FR")} label="joueurs" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/analyses"
            className="rounded-md bg-[#e86f2c] px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.07em] text-white transition hover:bg-[#d4611f]"
          >
            Voir les analyses
          </Link>
          <Link
            to="/explorateur"
            className="rounded-md border border-white/60 px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.07em] text-white transition hover:bg-white hover:text-[#221400]"
          >
            Explorer les joueurs
          </Link>
        </div>
      </div>
    </PageHero>
  );
}

import { Link } from "react-router-dom";
import heroVideo from "../assets/hero-video.mp4";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Hero plein écran : vidéo de match en fond, voile sombre en dégradé,
// texte calé à gauche (verticalement centré) pour laisser la vidéo
// respirer sur toute la largeur de l'écran plutôt que de la cacher
// derrière un bloc de texte centré.

export default function Hero() {
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ minHeight: "100svh" }}
    >
      {/* Vidéo de fond, plein écran, en boucle et coupée au format
          de la section (object-cover) */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={heroVideo}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />

      {/* Voile sombre en dégradé : plus opaque à gauche (sous le texte)
          et par le bas, pour garantir la lisibilité quelle que soit
          la scène affichée par la vidéo à cet instant */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.55) 42%, rgba(10,10,10,0.25) 75%), linear-gradient(0deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0) 45%)",
        }}
        aria-hidden="true"
      />

      {/* Contenu texte : calé à gauche, centré verticalement dans l'écran */}
      <div className="relative z-10 flex items-center h-full min-h-svh px-6 md:px-16">
        <div className="max-w-xl">
          {/* Étiquette au-dessus du titre, en Badge shadcn plutôt qu'un
              simple texte stylé — variant "outline" recoloré en corail. */}
          <Badge
            variant="outline"
            className="mb-4 border-[#e86f2c]/40 bg-[#e86f2c]/10 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e86f2c]"
          >
            Saison 2025-2026
          </Badge>

          {/* Titre : la promesse du site, gras et affirmé */}
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-[1.05] tracking-[-0.02em]">
            Le football,
            <br />
            décodé par la donnée.
          </h1>

          {/* Sous-texte : ce que fait concrètement le site, factuel */}
          <p className="mt-6 text-white/75 text-base md:text-lg leading-relaxed max-w-md">
            Des statistiques avancées comme le xG et le xA, croisées entre
            joueurs, équipes et championnats européens. Une lecture du jeu
            plus fine que le tableau de score.
          </p>

          {/* Deux boutons shadcn côte à côte, alignés à gauche avec le
              texte : "default" (plein corail) pour l'action principale,
              "outline" pour la secondaire — asChild pour que ce soit le
              <Link> react-router qui porte réellement la navigation. */}
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button
              asChild
              variant="default"
              className="h-auto rounded-md bg-[#e86f2c] px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.07em] text-white shadow-[0_8px_24px_rgba(232,111,44,0.3)] hover:bg-[#d4611f] hover:shadow-[0_10px_28px_rgba(232,111,44,0.45)]"
            >
              <Link to="/comparateur">Explorer les données</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="h-auto rounded-md border-white/70 bg-transparent px-8 py-4 text-[13px] font-semibold uppercase tracking-[0.07em] text-white hover:border-white hover:bg-white hover:text-[#221400]"
            >
              <Link to="/joueurs">Voir les joueurs</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

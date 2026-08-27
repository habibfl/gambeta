import { useMemo, useRef, useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import PageBackground from "../components/PageBackground";
import RadarChart from "../components/charts/RadarChart";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { getPlayerDetail, avatarUrl } from "../data/playersRegistry";

// Petite phrase par poste, pour varier l'intro sans écrire une fiche par
// joueur : le texte reste court (2 phrases) mais cite toujours le vrai
// nom, le vrai poste et le vrai club du joueur affiché.
const POSITION_PHRASES = {
  Attaquant: "en pointe de l'attaque",
  Milieu: "au cœur du milieu de terrain",
  Défenseur: "au sein de la défense",
  Gardien: "dans les buts",
};

function buildIntro(player) {
  const posPhrase = POSITION_PHRASES[player.position];
  const statPhrase =
    player.knownXG || player.knownXA
      ? "Une saison déjà bien documentée par les statistiques avancées, entre apport offensif et création de jeu."
      : "Un profil encore discret dans les statistiques officielles, mais suivi de près cette saison.";
  return `${player.name} évolue ${posPhrase} de ${player.team}, en ${player.leagueLabel}. ${statPhrase}`;
}

// Même mécanique qu'EquipeDetail.jsx : une section n'anime son contenu
// qu'une fois visible à l'écran (IntersectionObserver).
function RevealSection({ children, className }) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className={className}>
      {typeof children === "function" ? children(active) : children}
    </section>
  );
}

function NotFoundPlayer() {
  return (
    <>
      <PageBackground />
      <section className="flex-1 flex items-center justify-center px-6 py-32 text-center text-[var(--gambeta-ink)]">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e86f2c] mb-3">
            Joueur
          </p>
          <h1 className="text-[28px] md:text-[34px] font-bold tracking-[-0.02em]">
            Ce joueur n'existe pas.
          </h1>
          <Link to="/joueurs" className="mt-6 inline-block text-sm underline text-current/60">
            Retour à la liste des joueurs
          </Link>
        </div>
      </section>
    </>
  );
}

// Page détail d'un joueur (route /joueurs/:slug) : entièrement générique,
// alimentée par data/playersRegistry.js. Comme pour EquipeDetail.jsx, un
// seul composant couvre tous les joueurs du registre, aucune fiche n'est
// écrite en dur.
export default function JoueurDetail() {
  const { slug } = useParams();
  const player = useMemo(() => getPlayerDetail(slug), [slug]);

  if (!player) return <NotFoundPlayer />;

  const intro = buildIntro(player);

  return (
    <>
      <PageBackground />
      <div className="pt-24 text-[var(--gambeta-ink)]">
        {/* En-tête : avatar, nom, club (lien vers sa fiche), championnat, poste */}
        <div className="mx-auto max-w-[880px] px-6 py-12 text-center md:px-12 md:py-16">
          <img
            src={avatarUrl(player.name, 0)}
            alt={player.name}
            className="mx-auto h-28 w-28 rounded-full border border-current/10 shadow-lg md:h-32 md:w-32"
            width={128}
            height={128}
          />
          <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">{player.name}</h1>
          <p className="mt-2 text-current/60">
            <Link to={`/equipes/${player.teamSlug}`} className="font-semibold underline decoration-current/30 underline-offset-4 hover:decoration-current">
              {player.team}
            </Link>
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Badge variant="outline">{player.leagueLabel}</Badge>
            <Badge>{player.position}</Badge>
          </div>
          <p className="mt-6 text-current/60 md:text-lg">{intro}</p>
        </div>

        <div className="mx-auto max-w-[1000px] space-y-16 px-6 pb-24 md:px-12">
          {/* Profil de jeu : radar D3 à 6 axes, adaptés au poste */}
          <RevealSection>
            {(active) => (
              <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#e86f2c]">
                    Profil de jeu
                  </p>
                  <h2 className="mt-1 text-xl font-bold md:text-2xl">Forces et faiblesses du joueur</h2>
                  <p className="mt-4 text-current/60">
                    Un profil à 6 axes, adapté au poste de {player.name} ({player.position.toLowerCase()}),
                    pour résumer d'un coup d'œil ses points forts cette saison.
                  </p>
                </div>
                <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-4 md:p-6">
                  <RadarChart data={player.radar} active={active} />
                </div>
              </div>
            )}
          </RevealSection>

          {/* Stats clés */}
          <RevealSection>
            {() => (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#e86f2c]">
                  Stats clés
                </p>
                <h2 className="mt-1 text-xl font-bold md:text-2xl">La saison en chiffres</h2>
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: "xG", value: player.stats.xg.toFixed(1) },
                    { label: "Buts", value: player.stats.goals },
                    { label: "xA", value: player.stats.xa.toFixed(1) },
                    { label: "Passes décisives", value: player.stats.assists },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-2xl border border-current/10 bg-current/[0.02] p-6 text-center">
                      <p className="text-3xl font-bold" style={{ color: "#e86f2c" }}>{value}</p>
                      <p className="mt-1 text-sm text-current/60">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </RevealSection>

          {/* Joueurs similaires */}
          <RevealSection>
            {(active) => (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#e86f2c]">
                  Joueurs similaires
                </p>
                <h2 className="mt-1 text-xl font-bold md:text-2xl">Des profils de jeu proches</h2>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {player.similar.map((sim, index) => (
                    <Link
                      key={sim.slug}
                      to={`/joueurs/${sim.slug}`}
                      className="transition-all duration-300 ease-out"
                      style={{
                        transitionDelay: `${index * 100}ms`,
                        opacity: active ? 1 : 0,
                        transform: active ? "translateY(0)" : "translateY(12px)",
                      }}
                    >
                      <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
                          <img
                            src={avatarUrl(sim.name, index)}
                            alt={sim.name}
                            className="h-16 w-16 rounded-full border border-current/10"
                            width={64}
                            height={64}
                          />
                          <div>
                            <p className="text-sm font-semibold">{sim.name}</p>
                            <p className="mt-0.5 text-xs text-current/60">{sim.team}</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{sim.position}</Badge>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </RevealSection>
        </div>
      </div>
    </>
  );
}

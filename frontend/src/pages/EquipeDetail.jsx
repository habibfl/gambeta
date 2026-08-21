import { useMemo, useRef, useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import PageBackground from "../components/PageBackground";
import RadarChart from "../components/charts/RadarChart";
import { Badge } from "../components/ui/badge";
import { getTeamDetail, avatarUrl } from "../data/teamsRegistry";

// Couleurs des pastilles de forme récente : victoire en vert, nul en ambre,
// défaite en rouge. Choix volontairement classiques (code couleur déjà
// universel dans le football) pour rester lisible sans légende.
const FORM_STYLES = {
  V: "bg-emerald-500 text-white",
  N: "bg-amber-400 text-white",
  D: "bg-rose-500 text-white",
};

// Texte d'intro court, généré à partir de la position actuelle du club
// plutôt qu'écrit à la main pour chacun des ~94 clubs couverts par le
// site : le ton s'adapte quand même réellement (favori, ventre mou, lutte
// pour le maintien) et cite toujours le nom du club et sa position.
function buildIntro(team) {
  const ordinal = team.rank === 1 ? "1ʳᵉ" : `${team.rank}ᵉ`;
  const topThird = team.totalTeams / 3;
  if (team.rank <= topThird) {
    return `${team.name} occupe actuellement la ${ordinal} place de ${team.leagueLabel} avec ${team.pts} points. Une position qui traduit un collectif solide sur les deux phases de jeu, capable de répondre présent match après match dans la course aux places européennes.`;
  }
  if (team.rank <= topThird * 2) {
    return `${team.name} navigue dans le ventre mou de ${team.leagueLabel}, à la ${ordinal} place avec ${team.pts} points. Une saison en dents de scie jusqu'ici, entre séquences prometteuses et passages plus discrets, typique d'un effectif encore en quête de régularité.`;
  }
  return `${team.name} occupe actuellement la ${ordinal} place de ${team.leagueLabel} avec ${team.pts} points, en pleine bataille pour le maintien. Chaque match compte double à ce stade de la saison, et la moindre série de résultats peut rapidement rebattre les cartes du bas de tableau.`;
}

// Petite section qui n'anime son contenu qu'une fois visible à l'écran,
// même mécanique (IntersectionObserver) que les autres pages du site.
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

function NotFoundTeam() {
  return (
    <>
      <PageBackground />
      <section className="flex-1 flex items-center justify-center px-6 py-32 text-center text-[var(--gambeta-ink)]">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e86f2c] mb-3">
            Équipe
          </p>
          <h1 className="text-[28px] md:text-[34px] font-bold tracking-[-0.02em]">
            Ce club n'existe pas.
          </h1>
          <Link to="/equipes" className="mt-6 inline-block text-sm underline text-current/60">
            Retour à la liste des équipes
          </Link>
        </div>
      </section>
    </>
  );
}

// Page détail d'un club (route /equipes/:slug) : entièrement générique,
// alimentée par data/teamsRegistry.js. Aucune donnée n'est écrite en dur
// ici, seule la mise en page l'est, ce qui permet de couvrir les ~94 clubs
// des 5 championnats avec ce seul composant.
export default function EquipeDetail() {
  const { slug } = useParams();
  const team = useMemo(() => getTeamDetail(slug), [slug]);

  if (!team) return <NotFoundTeam />;

  const intro = buildIntro(team);

  return (
    <>
      <PageBackground />
      <div className="pt-24 text-[var(--gambeta-ink)]">
        {/* En-tête : nom, championnat, position, points */}
        <div className="mx-auto max-w-[880px] px-6 py-12 text-center md:px-12 md:py-16">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Badge variant="outline">{team.leagueLabel}</Badge>
            <Badge>
              {team.rank}
              {team.rank === 1 ? "ᵉʳ" : "ᵉ"} · {team.pts} pts
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{team.name}</h1>
          <p className="mt-4 text-current/60 md:text-lg">{intro}</p>
        </div>

        <div className="mx-auto max-w-[1000px] space-y-16 px-6 pb-24 md:px-12">
          {/* Forme récente */}
          <RevealSection>
            {(active) => (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#e86f2c]">
                  Forme récente
                </p>
                <h2 className="mt-1 text-xl font-bold md:text-2xl">Les 5 derniers matchs</h2>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <div className="flex gap-2">
                    {team.form.results.map((result, index) => (
                      <span
                        key={index}
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ease-out ${FORM_STYLES[result]}`}
                        style={{
                          transitionDelay: `${index * 80}ms`,
                          opacity: active ? 1 : 0,
                          transform: active ? "scale(1)" : "scale(0.6)",
                        }}
                      >
                        {result}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-current/60">
                    Soit <span className="font-bold text-current">{team.form.points} pts</span> sur les
                    15 derniers possibles
                  </p>
                </div>
              </div>
            )}
          </RevealSection>

          {/* Profil de jeu : radar D3 */}
          <RevealSection>
            {(active) => (
              <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#e86f2c]">
                    Profil de jeu
                  </p>
                  <h2 className="mt-1 text-xl font-bold md:text-2xl">Forces et faiblesses de l'équipe</h2>
                  <p className="mt-4 text-current/60">
                    Attaque, défense, possession, pressing et discipline : cinq indicateurs pour
                    résumer d'un coup d'œil l'identité de jeu de {team.name} cette saison.
                  </p>
                </div>
                <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-4 md:p-6">
                  <RadarChart data={team.radar} active={active} />
                </div>
              </div>
            )}
          </RevealSection>

          {/* Bilan domicile / extérieur */}
          <RevealSection>
            {() => (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#e86f2c]">
                  Bilan domicile / extérieur
                </p>
                <h2 className="mt-1 text-xl font-bold md:text-2xl">Un visage à deux facettes</h2>
                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    { label: "Domicile", stats: team.homeAway.home },
                    { label: "Extérieur", stats: team.homeAway.away },
                  ].map(({ label, stats }) => (
                    <div key={label} className="rounded-2xl border border-current/10 bg-current/[0.02] p-6">
                      <p className="text-sm font-semibold uppercase tracking-wide text-current/60">
                        {label}
                      </p>
                      <p className="mt-2 text-3xl font-bold" style={{ color: "#e86f2c" }}>
                        {stats.pts} pts
                      </p>
                      <p className="mt-1 text-sm text-current/60">
                        {stats.w}V · {stats.d}N · {stats.l}D sur {stats.gp} matchs
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </RevealSection>

          {/* Joueurs clés */}
          <RevealSection>
            {(active) => (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#e86f2c]">
                  Joueurs clés
                </p>
                <h2 className="mt-1 text-xl font-bold md:text-2xl">Ceux qui font la différence</h2>
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {team.keyPlayers.map((player, index) => (
                    <div
                      key={player.name}
                      className="flex flex-col items-center gap-3 text-center transition-all duration-300 ease-out"
                      style={{
                        transitionDelay: `${index * 100}ms`,
                        opacity: active ? 1 : 0,
                        transform: active ? "translateY(0)" : "translateY(12px)",
                      }}
                    >
                      <img
                        src={avatarUrl(player.name, index)}
                        alt={player.name}
                        className="h-16 w-16 rounded-full border border-current/10 md:h-20 md:w-20"
                        width={80}
                        height={80}
                      />
                      <div>
                        <p className="text-sm font-semibold">{player.name}</p>
                        <p className="mt-0.5 text-xs text-current/60">{player.stat}</p>
                      </div>
                    </div>
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

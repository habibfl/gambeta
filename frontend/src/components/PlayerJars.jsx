import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";

// DONNÉES PROVISOIRES — à remplacer par les vraies stats de la saison
// (classement xG / xA réel) et par de vraies photos de joueurs détourées
// une fois disponibles. Pour l'instant : nom + initiales seulement.
const PLAYERS_XG = [
  { name: "Kylian Mbappé", initials: "KM" },
  { name: "Erling Haaland", initials: "EH" },
  { name: "Harry Kane", initials: "HK" },
  { name: "Robert Lewandowski", initials: "RL" },
  { name: "Vinícius Júnior", initials: "VJ" },
  { name: "Victor Osimhen", initials: "VO" },
  { name: "Antoine Griezmann", initials: "AG" },
  { name: "Mohamed Salah", initials: "MS" },
  { name: "Lautaro Martínez", initials: "LM" },
];

const PLAYERS_XA = [
  { name: "Kevin De Bruyne", initials: "KD" },
  { name: "Bruno Fernandes", initials: "BF" },
  { name: "Martin Ødegaard", initials: "MØ" },
  { name: "Pedri", initials: "PE" },
  { name: "Jude Bellingham", initials: "JB" },
  { name: "Jamal Musiala", initials: "JM" },
  { name: "Jack Grealish", initials: "JG" },
  { name: "Bukayo Saka", initials: "BS" },
  { name: "Thomas Müller", initials: "TM" },
];

// Dégradés [teinte claire, teinte foncée] pour chaque cercle, dans deux
// familles de couleur de saturation comparable : corail pour le bocal xG,
// bleu-violet pour le bocal xA (contraste net avec le corail).
const CORAL_GRADIENTS = [
  ["#FFB199", "#FF6B4A"],
  ["#FFA07A", "#E85A3A"],
  ["#FF8C69", "#D94F27"],
  ["#FFAB91", "#F4511E"],
  ["#FF9E80", "#E64A19"],
];

const VIOLET_GRADIENTS = [
  ["#B8AEFF", "#6C5CE7"],
  ["#A599F5", "#5B4FCF"],
  ["#9C8CF0", "#4B3FAF"],
  ["#C4B8FF", "#7C6FF0"],
  ["#8E7CF5", "#4338CA"],
];

// Dimensions fixes du bocal (en pixels de canvas), volontairement compactes
// pour rester lisibles aussi bien empilées (mobile) que côte à côte (desktop).
const JAR_WIDTH = 260;
const JAR_HEIGHT = 340;
const WALL_THICKNESS = 12;
const CIRCLE_RADIUS = 20;

// Un bocal = un moteur physique matter.js indépendant + un <canvas> sur
// lequel on dessine nous-mêmes chaque bille (cercle + dégradé + initiales),
// plutôt que d'utiliser le rendu par défaut de matter.js (pas de texte).
function Jar({ title, players, gradients, active }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const hasDroppedRef = useRef(false);
  const timersRef = useRef([]);

  // Création du moteur, des parois statiques et de la boucle de rendu :
  // une seule fois au montage, indépendamment du déclenchement de la chute.
  useEffect(() => {
    const engine = Matter.Engine.create();
    engine.gravity.y = 1;
    engine.enableSleeping = true; // économise du calcul une fois les billes stabilisées
    engineRef.current = engine;

    // Parois invisibles pour matter.js, alignées sur les bords visibles du
    // bocal dessiné en CSS (voir le <div> avec bordures dans le JSX plus bas).
    const wallOptions = { isStatic: true, friction: 0.2 };
    const floor = Matter.Bodies.rectangle(
      JAR_WIDTH / 2,
      JAR_HEIGHT - 6,
      JAR_WIDTH - WALL_THICKNESS,
      20,
      wallOptions
    );
    const leftWall = Matter.Bodies.rectangle(
      WALL_THICKNESS / 2,
      JAR_HEIGHT / 2,
      WALL_THICKNESS,
      JAR_HEIGHT,
      wallOptions
    );
    const rightWall = Matter.Bodies.rectangle(
      JAR_WIDTH - WALL_THICKNESS / 2,
      JAR_HEIGHT / 2,
      WALL_THICKNESS,
      JAR_HEIGHT,
      wallOptions
    );
    Matter.World.add(engine.world, [floor, leftWall, rightWall]);

    const ctx = canvasRef.current.getContext("2d");
    let frameId;
    const tick = () => {
      Matter.Engine.update(engine, 1000 / 60);

      ctx.clearRect(0, 0, JAR_WIDTH, JAR_HEIGHT);
      engine.world.bodies.forEach((body) => {
        if (body.isStatic || !body.plugin) return;
        const { x, y } = body.position;
        const { colorLight, colorDark, initials } = body.plugin;

        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, body.circleRadius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          x - body.circleRadius * 0.35,
          y - body.circleRadius * 0.4,
          2,
          x,
          y,
          body.circleRadius
        );
        gradient.addColorStop(0, colorLight);
        gradient.addColorStop(1, colorDark);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.font = "600 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials, x, y + 1);
        ctx.restore();
      });

      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      // Lu volontairement au moment du démontage (pas capturé plus tôt) :
      // les timers de chute sont ajoutés bien après ce premier effet, par
      // le second effet ci-dessous.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      timersRef.current.forEach(clearTimeout);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
    };
  }, []);

  // Déclenche la chute des billes uniquement quand `active` devient vrai
  // (piloté par l'IntersectionObserver du composant parent), avec un léger
  // décalage entre chaque bille pour un effet de cascade plus naturel.
  useEffect(() => {
    if (!active || hasDroppedRef.current) return;
    hasDroppedRef.current = true;

    players.forEach((player, index) => {
      const timer = setTimeout(() => {
        const engine = engineRef.current;
        if (!engine) return;
        const margin = WALL_THICKNESS + CIRCLE_RADIUS;
        const startX = margin + Math.random() * (JAR_WIDTH - 2 * margin);
        const [colorLight, colorDark] = gradients[index % gradients.length];

        const body = Matter.Bodies.circle(startX, -40 - index * 30, CIRCLE_RADIUS, {
          restitution: 0.55,
          friction: 0.12,
          frictionAir: 0.001,
          density: 0.0025,
        });
        body.plugin = { initials: player.initials, colorLight, colorDark };
        Matter.World.add(engine.world, body);
      }, index * 160);
      timersRef.current.push(timer);
    });
  }, [active, players, gradients]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-current/60">
        {title}
      </h3>

      {/* Le bocal : parois visibles à gauche/droite/bas, arrondi en bas,
          ouvert en haut — le canvas matter.js est calé exactement dessus. */}
      <div
        className="relative overflow-hidden rounded-b-[46px] border-l-4 border-r-4 border-b-4 border-current/15 bg-current/[0.03]"
        style={{ width: JAR_WIDTH, height: JAR_HEIGHT }}
      >
        <canvas ref={canvasRef} width={JAR_WIDTH} height={JAR_HEIGHT} className="block" />
        {/* Reflet décoratif en haut du bocal, purement visuel (effet verre) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/40 to-transparent dark:from-white/10" />
      </div>
    </div>
  );
}

// Props optionnelles pour réutiliser le composant avec des données propres
// à une ligue (ex: ChampionnatDetail.jsx pour la Premier League) tout en
// gardant les valeurs par défaut (données génériques) sur la page d'accueil.
export default function PlayerJars({
  title = "Les références de la saison",
  playersXG = PLAYERS_XG,
  playersXA = PLAYERS_XA,
}) {
  const sectionRef = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (active) return undefined;
    // Ne déclenche la chute qu'une fois la section réellement visible au
    // scroll, jamais au chargement de la page.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setActive(true);
      },
      { threshold: 0.35 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [active]);

  return (
    <section ref={sectionRef} className="bg-[var(--gambeta-paper)] text-[var(--gambeta-ink)] py-24 px-6 md:px-12">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-14 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e86f2c] mb-2">
            Classement
          </p>
          <h2 className="text-[32px] md:text-[38px] font-bold tracking-[-0.02em]">
            {title}
          </h2>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-16 md:gap-24">
          <Jar title="Top xG" players={playersXG} gradients={CORAL_GRADIENTS} active={active} />
          <Jar title="Top xA" players={playersXA} gradients={VIOLET_GRADIENTS} active={active} />
        </div>
      </div>
    </section>
  );
}

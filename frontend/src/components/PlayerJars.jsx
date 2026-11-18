import { useEffect, useMemo, useRef, useState } from "react";
import Matter from "matter-js";
import Term from "./Term";
import { usePhotoImages } from "../hooks/usePhotoImages";


// Dégradés de repli (bille sans photo) : corail pour xG, violet pour xA.
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

const JAR_WIDTH = 260;
const JAR_HEIGHT = 340;
const WALL_THICKNESS = 12;
const CIRCLE_RADIUS = 26; // un peu plus grand qu'avant pour voir les visages
const STICKER_BORDER = 3;

// Dessine une bille : visage en sticker
function drawBall(ctx, body, image) {
  const { x, y } = body.position;
  const r = body.circleRadius;
  const { colorLight, colorDark, initials } = body.plugin;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(body.angle); // le sticker tourne quand la bille roule

  // Ombre portée + bord blanc du sticker
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.shadowColor = "transparent";

  const inner = r - STICKER_BORDER;
  ctx.beginPath();
  ctx.arc(0, 0, inner, 0, Math.PI * 2);
  ctx.clip();

  if (image) {
    // Fond doux puis photo cadrée "cover" sur le haut (visage)
    ctx.fillStyle = colorLight;
    ctx.fillRect(-inner, -inner, inner * 2, inner * 2);
    const scale = Math.max((inner * 2) / image.width, (inner * 2) / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.drawImage(image, -w / 2, -inner, w, h);
  } else {
    const gradient = ctx.createRadialGradient(-inner * 0.35, -inner * 0.4, 2, 0, 0, inner);
    gradient.addColorStop(0, colorLight);
    gradient.addColorStop(1, colorDark);
    ctx.fillStyle = gradient;
    ctx.fillRect(-inner, -inner, inner * 2, inner * 2);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, 0, 1);
  }
  ctx.restore();
}

function Jar({ title, players, gradients, active, images, valueLabel }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const imagesRef = useRef(images);
  const hasDroppedRef = useRef(false);
  const timersRef = useRef([]);

  // La boucle de rendu lit toujours les dernières photos chargées
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    const engine = Matter.Engine.create();
    engine.gravity.y = 1;
    engine.enableSleeping = true;
    engineRef.current = engine;

    const wallOptions = { isStatic: true, friction: 0.2 };
    const floor = Matter.Bodies.rectangle(JAR_WIDTH / 2, JAR_HEIGHT - 6, JAR_WIDTH - WALL_THICKNESS, 20, wallOptions);
    const leftWall = Matter.Bodies.rectangle(WALL_THICKNESS / 2, JAR_HEIGHT / 2, WALL_THICKNESS, JAR_HEIGHT, wallOptions);
    const rightWall = Matter.Bodies.rectangle(JAR_WIDTH - WALL_THICKNESS / 2, JAR_HEIGHT / 2, WALL_THICKNESS, JAR_HEIGHT, wallOptions);
    Matter.World.add(engine.world, [floor, leftWall, rightWall]);

    const ctx = canvasRef.current.getContext("2d");
    let frameId;
    const tick = () => {
      Matter.Engine.update(engine, 1000 / 60);
      ctx.clearRect(0, 0, JAR_WIDTH, JAR_HEIGHT);
      engine.world.bodies.forEach((body) => {
        if (body.isStatic || !body.plugin) return;
        drawBall(ctx, body, imagesRef.current[body.plugin.name]);
      });
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      timersRef.current.forEach(clearTimeout);
      Matter.World.clear(engine.world, false);
      Matter.Engine.clear(engine);
    };
  }, []);

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
        body.plugin = { name: player.name, initials: player.initials, colorLight, colorDark };
        Matter.World.add(engine.world, body);
      }, index * 160);
      timersRef.current.push(timer);
    });
  }, [active, players, gradients]);

  return (
    <div className="flex flex-col items-center gap-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-current/60">{title}</h3>

      <div
        className="relative overflow-hidden rounded-b-[46px] border-l-4 border-r-4 border-b-4 border-white/25 bg-white/[0.06] shadow-[inset_0_-20px_40px_rgba(255,255,255,0.05)]"
        style={{ width: JAR_WIDTH, height: JAR_HEIGHT }}
      >
        <canvas ref={canvasRef} width={JAR_WIDTH} height={JAR_HEIGHT} className="block" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/40 to-transparent dark:from-white/10" />
      </div>

      {/* Légende : qui est dans le bocal, classé, avec la valeur si connue */}
      <ol className="w-full max-w-[260px] space-y-1 text-[13px]">
        {players.map((player, index) => (
          <li key={player.name} className="flex items-center gap-2">
            <span className="w-5 text-right text-current/40 tabular-nums">{index + 1}.</span>
            <span className="flex-1 truncate">{player.name}</span>
            {player.value != null && (
              <span className="font-semibold tabular-nums">
                {Number(player.value).toFixed(1)} {valueLabel}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function PlayerJars({
  title = "Les références de la saison",
  playersXG = [],
  playersXA = [],
}) {
  const sectionRef = useRef(null);
  const [active, setActive] = useState(false);

  const allNames = useMemo(
    () => [...new Set([...playersXG, ...playersXA].map((p) => p.name))],
    [playersXG, playersXA]
  );
  const images = usePhotoImages(allNames);

  useEffect(() => {
    if (active) return undefined;
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
    <section
      ref={sectionRef}
      className="relative overflow-hidden px-6 py-24 text-white md:px-12"
      style={{
        background:
          "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(232,111,44,0.25) 0%, transparent 60%), linear-gradient(180deg, #0d3324 0%, #07160f 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0" 
        style={{ opacity: 0.06,  backgroundImage: "repeating-linear-gradient(90deg, #fff 0 90px, transparent 90px 180px)" }}
        aria-hidden
      />
      <div className="relative max-w-[1200px] mx-auto">
        <div className="mb-14 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e86f2c] mb-2">Classement</p>
          <h2 className="text-[32px] md:text-[38px] font-bold tracking-[-0.02em]">{title}</h2>
          <p className="mx-auto mt-3 max-w-[560px] text-sm text-white/70">
            <Term id="xg">xG</Term> : nombre de buts qu&apos;un joueur « aurait dû » marquer selon la qualité de ses
            occasions. <Term id="xa">xA</Term> : même idée pour les passes décisives.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-start justify-center gap-16 md:gap-24">
          <Jar title="Top xG" players={playersXG} gradients={CORAL_GRADIENTS} active={active} images={images} valueLabel="xG" />
          <Jar title="Top xA" players={playersXA} gradients={VIOLET_GRADIENTS} active={active} images={images} valueLabel="xA" />
        </div>
      </div>
    </section>
  );
}

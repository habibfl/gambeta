import { useEffect, useRef } from "react";
import Matter from "matter-js";
import Crest from "../Crest";
import { leagueColor } from "../../lib/leagues";
import { usePhotoImages } from "../../hooks/usePhotoImages";
import { useInView, useSize, fr } from "./hooks";

const HEIGHT = 180;

// Pile de visages : une colonne par joueur
export default function HeadPile({ players, muted = false, logoFor }) {
  const [sizeRef, { width }] = useSize();
  const [viewRef, inView] = useInView({ threshold: 0.35 });
  const canvasRef = useRef(null);
  const images = usePhotoImages(players.map((p) => p.player));
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !width || !inView) return undefined;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = HEIGHT * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const cols = players.length;
    const colW = width / cols;
    const r = Math.max(12, Math.min(24, colW / 5.5));
    const engine = Matter.Engine.create({ gravity: { y: 1.1 } });
    const { Bodies, Composite } = Matter;

    // Sol + murs invisibles entre les colonnes
    const statics = [Bodies.rectangle(width / 2, HEIGHT + 20, width * 2, 40, { isStatic: true })];
    for (let c = 0; c <= cols; c += 1) {
      statics.push(Bodies.rectangle(c * colW, HEIGHT / 2, 8, HEIGHT * 3, { isStatic: true }));
    }
    Composite.add(engine.world, statics);

    // Les visages tombent un par un, colonne par colonne en alternance
    const queue = [];
    const maxCount = Math.max(...players.map((p) => p.count));
    for (let k = 0; k < maxCount; k += 1) {
      players.forEach((p, c) => {
        if (k < p.count) queue.push({ p, c });
      });
    }
    let spawned = 0;
    const spawn = setInterval(() => {
      const item = queue[spawned];
      if (!item) {
        clearInterval(spawn);
        return;
      }
      const cx = item.c * colW + colW / 2 + (Math.random() - 0.5) * colW * 0.3;
      const body = Bodies.circle(cx, -r * 2, r, {
        restitution: 0.35,
        friction: 0.4,
        angle: (Math.random() - 0.5) * 0.8,
        plugin: { player: item.p },
      });
      Composite.add(engine.world, body);
      spawned += 1;
    }, 140);

    let raf;
    let last = performance.now();
    const loop = (now) => {
      Matter.Engine.update(engine, Math.min(now - last, 32));
      last = now;
      ctx.clearRect(0, 0, width, HEIGHT);
      Composite.allBodies(engine.world).forEach((b) => {
        if (b.isStatic) return;
        drawHead(ctx, b, imagesRef.current[b.plugin.player.player], muted);
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      clearInterval(spawn);
      cancelAnimationFrame(raf);
      Matter.Engine.clear(engine);
    };
  }, [width, inView, players, muted]);

  return (
    <div ref={viewRef} className="w-full">
      <div ref={sizeRef} className="w-full">
        <canvas ref={canvasRef} style={{ width: "100%", height: HEIGHT }} className="block" />
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))` }}>
        {players.map((p) => (
          <div key={p.player} className="border-t-2 border-current pt-2">
            <div className="flex items-start justify-between gap-1">
              <div className="min-w-0">
                <div className="truncate font-mono text-[12px] font-bold sm:text-[13px]">{p.player}</div>
                <div className="truncate font-mono text-[11px] text-current/55">{p.team}</div>
              </div>
              <span className="hidden sm:inline-flex">
                <Crest team={p.team} league={p.league} logo={logoFor(p.team)} size={26} sticker />
              </span>
            </div>
            <div className="mt-1 font-mono text-[11px] text-current/55">
              {p.goals} buts · {fr(p.xg)} xG
            </div>
            <div className={`font-mono text-[13px] font-bold ${p.diff >= 0 ? "text-[#e86f2c]" : "text-[#2a6fd6]"}`}>
              {fr(p.diff, 1, true)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Un visage rond (photo cadrée sur le haut) ou, à défaut, des initiales.
function drawHead(ctx, body, image, muted) {
  const { x, y } = body.position;
  const r = body.circleRadius;
  const p = body.plugin.player;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(body.angle);
  ctx.shadowColor = "rgba(0,0,0,0.22)";
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = muted ? "#c9c6bd" : leagueColor(p.league);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.clip();
  if (image) {
    if (muted) ctx.filter = "grayscale(1) contrast(0.9)";
    const scale = Math.max((r * 2) / image.width, (r * 2) / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.drawImage(image, -w / 2, -r, w, h);
    ctx.filter = "none";
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `800 ${Math.round(r * 0.75)}px "Cabinet Grotesk", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const initials = p.player
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    ctx.fillText(initials, 0, 1);
  }
  ctx.restore();
}

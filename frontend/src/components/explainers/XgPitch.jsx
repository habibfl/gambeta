import { useMemo, useRef, useState } from "react";
import { rng } from "../../lib/simulate";

// Démonstration interactive du xG sur une moitié de terrain
const W = 68;
const L = 52.5;
const GOAL = 7.32;
const S = 9; // pixels par mètre

function shotGeometry(x, y) {
  // x : distance à la ligne de but (m), y : position latérale (0 = axe)
  const dist = Math.hypot(x, y);
  const a1 = Math.atan2(GOAL / 2 - y, x);
  const a2 = Math.atan2(-GOAL / 2 - y, x);
  const angle = Math.max(a1 - a2, 0.0001);
  return { dist, angle };
}

function xgAt(x, y) {
  const { dist, angle } = shotGeometry(x, y);
  return 1 / (1 + Math.exp(-(-0.6 + 1.6 * angle - 0.13 * dist)));
}

const fmt = (v) => `${(v * 100).toFixed(0)} %`;

export default function XgPitch() {
  const [shot, setShot] = useState({ x: 11, y: 0 }); // point de penalty
  const [tries, setTries] = useState([]);
  const timer = useRef(null);
  const seed = useRef(1);
  const { dist, angle } = shotGeometry(shot.x, shot.y);
  const xg = xgAt(shot.x, shot.y);

  // Carte de chaleur du xG (cases de 2 m)
  const cells = useMemo(() => {
    const out = [];
    for (let x = 0; x < 34; x += 2) for (let y = -W / 2; y < W / 2; y += 2) out.push({ x, y, v: xgAt(x + 1, y + 1) });
    return out;
  }, []);

  const px = (y) => (y + W / 2) * S; // latéral -> abscisse écran
  const py = (x) => x * S; // distance au but -> ordonnée écran (but en haut)

  function pick(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W * S;
    const sy = ((e.clientY - r.top) / r.height) * L * S;
    const x = Math.max(0.5, Math.min(L - 1, sy / S));
    const y = Math.max(-W / 2 + 0.5, Math.min(W / 2 - 0.5, sx / S - W / 2));
    setShot({ x, y });
    setTries([]);
    clearInterval(timer.current);
  }

  function shoot100() {
    clearInterval(timer.current);
    const rand = rng((seed.current += 1) * 104729);
    const results = Array.from({ length: 100 }, () => rand() < xg);
    setTries([]);
    let i = 0;
    timer.current = setInterval(() => {
      i += 4;
      setTries(results.slice(0, i));
      if (i >= 100) clearInterval(timer.current);
    }, 40);
  }

  const goals = tries.filter(Boolean).length;
  const presets = [
    { label: "Point de penalty", x: 11, y: 0 },
    { label: "Seul face au but (5 m)", x: 5, y: 0 },
    { label: "Angle fermé", x: 4, y: 12 },
    { label: "Tir de loin (25 m)", x: 25, y: 4 },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="self-start rounded-2xl border border-current/10 bg-[#0d3324] p-3">
        <svg viewBox={`0 0 ${W * S} ${L * S}`} className="w-full cursor-crosshair touch-none" onClick={pick} role="img" aria-label="Demi-terrain : cliquez pour placer un tir">
          {/* Carte de chaleur */}
          {cells.map((c) => (
            <rect
              key={`${c.x}_${c.y}`}
              x={px(c.y)}
              y={py(c.x)}
              width={2 * S}
              height={2 * S}
              fill="#e86f2c"
              opacity={Math.min(0.85, c.v * 1.6)}
            />
          ))}
          {/* Lignes du terrain */}
          <g fill="none" stroke="#ffffff" strokeOpacity={0.75} strokeWidth={2}>
            <rect x={1} y={1} width={W * S - 2} height={L * S - 2} />
            <rect x={px(-20.16)} y={0} width={40.32 * S} height={16.5 * S} />
            <rect x={px(-9.16)} y={0} width={18.32 * S} height={5.5 * S} />
            {/* « Arc » de la surface : cercle de 9,15 m autour du point de penalty, hors de la surface */}
            <path d={`M ${px(-7.31)} ${py(16.5)} A ${9.15 * S} ${9.15 * S} 0 0 0 ${px(7.31)} ${py(16.5)}`} />
            <circle cx={px(0)} cy={py(11)} r={3} fill="#fff" />
            <path d={`M ${px(-9.15)} ${L * S} A ${9.15 * S} ${9.15 * S} 0 0 1 ${px(9.15)} ${L * S}`} />
          </g>
          {/* But */}
          <rect x={px(-GOAL / 2)} y={-8} width={GOAL * S} height={10} fill="#fff" />
          {/* Angle de tir */}
          <polygon
            points={`${px(shot.y)},${py(shot.x)} ${px(-GOAL / 2)},${py(0)} ${px(GOAL / 2)},${py(0)}`}
            fill="#ffffff"
            fillOpacity={0.25}
            stroke="#fff"
            strokeWidth={1.5}
            strokeDasharray="5 4"
          />
          {/* Ballon */}
          <circle cx={px(shot.y)} cy={py(shot.x)} r={11} fill="#fff" stroke="#07160f" strokeWidth={3} />
          <text x={px(shot.y)} y={py(shot.x) - 18} textAnchor="middle" className="fill-white text-[22px] font-extrabold" stroke="#07160f" strokeWidth={4} paintOrder="stroke">
            xG {xg.toFixed(2).replace(".", ",")}
          </text>
        </svg>
        <p className="mt-2 px-1 text-[11px] text-white/60">Cliquez n&apos;importe où sur le terrain pour tirer de là. Plus la zone est orange, plus le tir est dangereux.</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-5">
          <p className="font-mono text-[11px] uppercase tracking-wide text-current/50">Ce tir</p>
          <p className="mt-1 text-5xl font-extrabold tracking-tight text-[#e86f2c]">{fmt(xg)}</p>
          <p className="text-[13px] text-current/70">de chances de marquer, soit un xG de {xg.toFixed(2).replace(".", ",")}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-[12px]">
            <span className="text-current/60">Distance</span>
            <span className="text-right">{dist.toFixed(1).replace(".", ",")} m</span>
            <span className="text-current/60">Angle de tir</span>
            <span className="text-right">{((angle * 180) / Math.PI).toFixed(0)}°</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  setShot({ x: p.x, y: p.y });
                  setTries([]);
                }}
                className="rounded-full border border-current/15 px-2.5 py-1 text-[11px] font-semibold hover:border-current/40"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-5">
          <p className="font-mono text-[11px] uppercase tracking-wide text-current/50">Simulation : 100 tirs depuis ce point</p>
          <button
            type="button"
            onClick={shoot100}
            className="mt-2 w-full rounded-full bg-[#e86f2c] px-4 py-2 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-[#d45f1f]"
          >
            Tirer 100 fois
          </button>
          <div className="mt-3 grid grid-cols-10 gap-1">
            {Array.from({ length: 100 }, (_, i) => (
              <span
                key={i}
                className="aspect-square rounded-full transition-colors"
                style={{ background: i < tries.length ? (tries[i] ? "#1a9a5b" : "rgba(214,69,69,.55)") : "rgba(128,128,128,.15)" }}
              />
            ))}
          </div>
          {tries.length === 100 && (
            <p className="mt-3 text-[14px] leading-relaxed">
              <b>{goals} buts</b> sur 100, pour {Math.round(xg * 100)} attendus. Relancez : le résultat change à chaque fois.
              C&apos;est pour ça qu&apos;un joueur peut marquer plus ou moins que ses xG sur une saison.
            </p>
          )}
        </div>
        <p className="text-[11px] leading-relaxed text-current/55">
          Modèle pédagogique simplifié (distance + angle). Les xG utilisés ailleurs sur le site viennent d&apos;Understat,
          dont le modèle tient aussi compte du type de passe, de la partie du corps, de la situation de jeu…
        </p>
      </div>
    </div>
  );
}

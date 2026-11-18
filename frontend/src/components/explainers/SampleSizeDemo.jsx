import { useRef, useState } from "react";
import { rng } from "../../lib/simulate";

const TRUE_SHARE = 0.58; // part réelle des victoires à domicile (hors nuls), 5 saisons réunies
const LO = 0.44;
const HI = 0.72;
const pos = (v) => `${((Math.min(Math.max(v, LO), HI) - LO) / (HI - LO)) * 100}%`;

// Une ligne de points (une expérience = un point)
function Row({ label, values, sub }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-[12px] leading-tight">
        <b>{label}</b>
        <br />
        <span className="text-current/55">{sub}</span>
      </span>
      <div className="relative h-10 flex-1 rounded-lg bg-current/[0.04]">
        <span className="absolute inset-y-0 w-px bg-current/40" style={{ left: pos(0.5) }} />
        <span className="absolute inset-y-0 w-0.5 bg-[#1a9a5b]" style={{ left: pos(TRUE_SHARE) }} />
        {values.map((v, i) => (
          <span
            key={i}
            className="absolute h-2 w-2 -translate-x-1/2 rounded-full bg-[#e86f2c]"
            style={{ left: pos(v), top: `${8 + ((i * 37) % 24)}px`, opacity: 0.55 }}
          />
        ))}
      </div>
    </div>
  );
}

// Effet de la taille d'échantillon : même avantage du terrain (58 %), une saison contre tout réuni
export default function SampleSizeDemo() {
  const [runs, setRuns] = useState({ one: [], five: [] });
  const seed = useRef(1);

  function simulate(times) {
    const rand = rng((seed.current += 1) * 7907);
    const draw = (n) => {
      let k = 0;
      for (let i = 0; i < n; i += 1) if (rand() < TRUE_SHARE) k += 1;
      return k / n;
    };
    setRuns((r) => ({
      one: [...r.one, ...Array.from({ length: times }, () => draw(280))].slice(-200),
      five: [...r.five, ...Array.from({ length: times }, () => draw(7000))].slice(-200),
    }));
  }

  // seuil de significativité (5 %) : au-dessous, on ne peut pas distinguer l'effet du hasard
  const cut = (n) => 0.5 + 1.96 * Math.sqrt(0.25 / n);
  const below = (arr, n) => arr.filter((v) => v < cut(n)).length;
  return (
    <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-5">
      <p className="font-mono text-[11px] uppercase tracking-wide text-[#e86f2c]">Expérience : le rôle de la taille d&apos;échantillon</p>
      <p className="mt-2 text-[14px] leading-relaxed text-current/75">
        Hypothèse : un avantage du terrain réel de <b className="text-[#1a9a5b]">58 %</b> (trait vert). Chaque
        point est une simulation : une saison (280 matchs non nuls) ou l&apos;ensemble des 25 championnats-saisons (≈ 7 000
        matchs), avec le pourcentage observé.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => simulate(1)} className="rounded-full border border-current/25 px-4 py-1.5 text-[12px] font-bold uppercase tracking-wide hover:bg-current/5">
          Relancer 1 fois
        </button>
        <button type="button" onClick={() => simulate(25)} className="rounded-full bg-[#e86f2c] px-4 py-1.5 text-[12px] font-bold uppercase tracking-wide text-white">
          Relancer 25 fois
        </button>
        <button type="button" onClick={() => setRuns({ one: [], five: [] })} className="rounded-full px-3 py-1.5 text-[12px] text-current/60 hover:text-current">
          Effacer
        </button>
      </div>
      <div className="mt-4 space-y-2">
        <div className="relative ml-[124px] h-3 font-mono text-[10px] text-current/50">
          {[0.44, 0.5, 0.58, 0.72].map((t) => (
            <span key={t} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: pos(t) }}>
              {Math.round(t * 100)} %
            </span>
          ))}
        </div>
        <Row label="1 saison" sub="280 matchs" values={runs.one} />
        <Row label="Tout réuni" sub="≈ 7 000 matchs" values={runs.five} />
      </div>
      {runs.one.length > 0 && (
        <p className="mt-4 text-[14px] leading-relaxed">
          Sur {runs.one.length} saison{runs.one.length > 1 ? 's' : ''} simulée{runs.one.length > 1 ? 's' : ''},{" "}
          <b>{below(runs.one, 280)}</b> ne sont pas significatives (sous {Math.round(cut(280) * 1000) / 10} %) : l&apos;effet
          existe, mais une saison ne suffit pas à le prouver. Avec tout réuni : <b>{below(runs.five, 7000)}</b>. Même effet,
          seule la quantité de données change ce qu&apos;on peut affirmer.
        </p>
      )}
    </div>
  );
}

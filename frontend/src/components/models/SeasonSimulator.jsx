import { useEffect, useMemo, useRef, useState } from "react";
import Crest from "../Crest";
import { prepare, runBatch, emptyAcc, rng } from "../../lib/simulate";
import { seasonLabel } from "../../lib/leagues";
import { fr } from "../story/hooks";

const TOTAL = 10000;
const PER_FRAME = 400;
let cache = null; // le JSON (≈ 330 Ko) n'est chargé qu'une fois, à la demande

function useSimulationData() {
  const [data, setData] = useState(cache);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (cache) return undefined;
    let cancelled = false;
    fetch("/data/simulation.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        cache = d;
        if (!cancelled) setData(d);
      })
      .catch((e) => !cancelled && setError(e));
    return () => {
      cancelled = true;
    };
  }, []);
  return { data, error };
}

function Bar({ p, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-12 overflow-hidden rounded-full bg-current/10 md:w-16">
        <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${Math.min(p * 100, 100)}%`, background: color }} />
      </div>
      <span className="w-11 text-right font-mono text-[12px]">{p >= 0.995 ? ">99" : p > 0 && p < 0.005 ? "<1" : Math.round(p * 100)} %</span>
    </div>
  );
}

// Simulateur de fin de saison : à une journée choisie
export default function SeasonSimulator({ league, season, logoFor }) {
  const { data, error } = useSimulationData();
  const seasonData = data?.leagues?.[league]?.[season] ?? null;
  const weeks = seasonData?.snapshots ?? [];
  const [weekChoice, setWeek] = useState(null);
  const snap = weeks.find((w) => w.week === weekChoice) ?? weeks[Math.min(9, weeks.length - 1)] ?? null;
  const [acc, setAcc] = useState(null);
  const [seed, setSeed] = useState(1);
  const raf = useRef(null);

  const prep = useMemo(() => (seasonData && snap ? prepare(seasonData, snap) : null), [seasonData, snap]);

  // Lance (ou relance) les 10 000 simulations par paquets
  useEffect(() => {
    if (!prep) return undefined;
    const rand = rng(seed * 7919 + (snap?.day ?? 0));
    const a = emptyAcc(prep.n);
    const step = () => {
      runBatch(prep, PER_FRAME, rand, a);
      setAcc({ ...a, rank: a.rank.map((r) => [...r]), pts: [...a.pts] });
      if (a.done < TOTAL) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [prep, seed, snap]);

  if (error) return <p className="text-current/60">Impossible de charger les données de simulation.</p>;
  if (!seasonData || !prep || !acc) return <p className="text-current/60">Chargement de la simulation…</p>;

  const n = prep.n;
  const teams = seasonData.teams;
  const rows = teams
    .map((team, t) => ({
      team,
      t,
      now: prep.base[t].pts,
      played: prep.base[t].played,
      exp: acc.done ? acc.pts[t] / acc.done : 0,
      title: acc.done ? acc.rank[t][0] / acc.done : 0,
      top4: acc.done ? acc.rank[t].slice(0, 4).reduce((s, v) => s + v, 0) / acc.done : 0,
      bottom3: acc.done ? acc.rank[t].slice(n - 3).reduce((s, v) => s + v, 0) / acc.done : 0,
      actual: prep.actualRank[t],
      finalPts: prep.finalPts[t],
    }))
    .sort((a, b) => b.exp - a.exp);
  const champion = rows.find((r) => r.actual === 1);
  const favorite = [...rows].sort((a, b) => b.title - a.title)[0];
  const remaining = prep.remaining.length;

  return (
    <div className="space-y-5">
      {/* Choix de la journée */}
      <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-5">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex flex-1 flex-col gap-1 font-mono text-[11px] uppercase tracking-wide text-current/55">
            Simuler à partir de la journée <b className="text-[22px] text-current">{snap.week}</b>
            <input
              type="range"
              min={0}
              max={weeks.length - 1}
              value={weeks.indexOf(snap)}
              onChange={(e) => setWeek(weeks[Number(e.target.value)].week)}
              className="w-full accent-[#8b5cf6]"
            />
          </label>
          <button
            type="button"
            onClick={() => setSeed((s) => s + 1)}
            className="rounded-full bg-[#8b5cf6] px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white hover:bg-[#7c4ee6]"
          >
            Relancer 10 000 saisons
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-current/70">
          <span>
            {seasonLabel(season)} · {remaining} matchs restants tirés au sort
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-32 overflow-hidden rounded-full bg-current/10">
              <span className="block h-full bg-[#8b5cf6] transition-[width]" style={{ width: `${(acc.done / TOTAL) * 100}%` }} />
            </span>
            <b className="font-mono">{acc.done.toLocaleString("fr-FR")}</b> / 10 000 saisons simulées
          </span>
        </div>
      </div>

      {/* Verdict */}
      {champion && (
        <p className="text-[17px] leading-relaxed">
          Avant la journée {snap.week}, le modèle donnait <b>{champion.team}</b> (futur champion) champion dans{" "}
          <b className="text-[#8b5cf6]">{fr(champion.title * 100, 0)} %</b> des simulations.
          {favorite.team !== champion.team ? (
            <>
              {" "}
              Son favori était alors <b>{favorite.team}</b> ({fr(favorite.title * 100, 0)} %).
            </>
          ) : (
            " C'était déjà le favori."
          )}
        </p>
      )}

      {/* Tableau des probabilités */}
      <div className="overflow-x-auto rounded-2xl border border-current/10">
        <table className="w-full min-w-[820px] text-[13px]">
          <thead className="bg-current/[0.04] text-left text-[11px] uppercase tracking-wide text-current/60">
            <tr>
              <th className="px-3 py-2">Club</th>
              <th className="whitespace-nowrap px-3 py-2 text-right">Pts J{snap.week}</th>
              <th className="whitespace-nowrap px-3 py-2 text-right">Pts attendus</th>
              <th className="px-3 py-2">Titre</th>
              <th className="px-3 py-2">Top 4</th>
              <th className="px-3 py-2">3 derniers</th>
              <th className="px-3 py-2">Places possibles (1 → {n})</th>
              <th className="px-3 py-2 text-right">Réalité</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const dist = acc.rank[r.t];
              const maxD = Math.max(...dist);
              return (
                <tr key={r.team} className="border-t border-current/5">
                  <td className="px-3 py-1.5">
                    <span className="flex items-center gap-2">
                      <Crest team={r.team} league={league} logo={logoFor(r.team)} size={20} sticker />
                      <span className="font-semibold">{r.team}</span>
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">{r.now}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-bold">{fr(r.exp, 0)}</td>
                  <td className="px-3 py-1.5"><Bar p={r.title} color="#8b5cf6" /></td>
                  <td className="px-3 py-1.5"><Bar p={r.top4} color="#2a6fd6" /></td>
                  <td className="px-3 py-1.5"><Bar p={r.bottom3} color="#d64545" /></td>
                  <td className="px-3 py-1.5">
                    {/* Distribution des places : plus foncé = plus fréquent ; trait = place réelle */}
                    <span className="flex h-5 items-stretch gap-px">
                      {dist.map((v, i) => (
                        <span
                          key={i}
                          className="w-[7px]"
                          style={{
                            background: `rgba(139,92,246,${maxD ? 0.08 + (v / maxD) * 0.9 : 0.05})`,
                            outline: i + 1 === r.actual ? "2px solid var(--gambeta-ink)" : "none",
                            outlineOffset: -1,
                          }}
                          title={`${i + 1}ᵉ : ${fr((v / Math.max(acc.done, 1)) * 100, 1)} %`}
                        />
                      ))}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <span className="font-mono font-bold">{r.actual}ᵉ</span>
                    <span className="ml-1 font-mono text-[11px] text-current/55">({r.finalPts} pts)</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

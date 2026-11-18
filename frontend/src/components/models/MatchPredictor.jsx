import { ArrowLeftRight } from "lucide-react";
import Crest from "../Crest";
import { expectedGoals, scoreMatrix, outcomes, mostLikely } from "../../lib/poisson";
import { fr } from "../story/hooks";

const SHOW = 6; // scores de 0 à 5 dans la grille

function TeamSelect({ value, onChange, teams, label }) {
  return (
    <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wide text-current/55">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-[200px] rounded-lg border border-current/20 bg-[var(--gambeta-paper)] px-2 py-2 font-sans text-[14px] font-semibold normal-case tracking-normal text-[var(--gambeta-ink)]"
      >
        {teams.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
    </label>
  );
}

// Prédicteur de match : deux clubs d'un même championnat -> buts attendus
export default function MatchPredictor({ model, league, home, away, onHome, onAway, logoFor }) {
  const teams = Object.keys(model.teams).sort();
  const xg = expectedGoals(model, home, away);
  const m = scoreMatrix(xg.home, xg.away, model.rho);
  const o = outcomes(m);
  const best = mostLikely(m);
  const maxP = Math.max(...m.slice(0, SHOW).flatMap((r) => r.slice(0, SHOW)));

  return (
    <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-5 md:p-7">
      <div className="flex flex-wrap items-end gap-4">
        <TeamSelect label="À domicile" value={home} onChange={onHome} teams={teams} />
        <button
          type="button"
          onClick={() => {
            onHome(away);
            onAway(home);
          }}
          className="mb-1 rounded-full border border-current/20 px-3 py-2 text-[13px] hover:border-current/50"
          title="Inverser domicile / extérieur"
        >
          <ArrowLeftRight size={14} aria-hidden />
        </button>
        <TeamSelect label="À l'extérieur" value={away} onChange={onAway} teams={teams} />
      </div>

      {home === away ? (
        <p className="mt-6 text-current/60">Choisissez deux clubs différents.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div>
            {/* Affiche du match */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col items-center gap-2 text-center">
                <Crest team={home} league={league} logo={logoFor(home)} size={64} sticker />
                <span className="font-bold">{home}</span>
                <span className="font-mono text-[12px] text-current/60">{fr(xg.home, 2)} buts attendus</span>
              </div>
              <span className="text-2xl font-extrabold text-current/30">vs</span>
              <div className="flex flex-col items-center gap-2 text-center">
                <Crest team={away} league={league} logo={logoFor(away)} size={64} sticker />
                <span className="font-bold">{away}</span>
                <span className="font-mono text-[12px] text-current/60">{fr(xg.away, 2)} buts attendus</span>
              </div>
            </div>
            {/* Barre 1 / N / 2 */}
            <div className="mt-6 flex h-11 overflow-hidden rounded-xl text-[13px] font-bold">
              {[
                { p: o.home, label: home, bg: "#e86f2c", fg: "#fff" },
                { p: o.draw, label: "Nul", bg: "rgba(150,140,128,.35)", fg: "inherit" },
                { p: o.away, label: away, bg: "#2a6fd6", fg: "#fff" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex items-center justify-center border-r-2 border-[var(--gambeta-paper)] transition-all duration-500 last:border-r-0"
                  style={{ width: `${s.p * 100}%`, background: s.bg, color: s.fg }}
                  title={`${s.label} : ${Math.round(s.p * 100)} %`}
                >
                  {Math.round(s.p * 100)} %
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[12px] text-current/60">
              <span>Victoire {home}</span>
              <span>Nul</span>
              <span>Victoire {away}</span>
            </div>
            <p className="mt-5 text-[15px] leading-relaxed">
              Score le plus probable : <b>{best.i} - {best.j}</b> ({fr(best.p * 100, 1)} % de chances). Même le score le
              plus probable arrive rarement : le football reste un sport à faible nombre de buts, donc très aléatoire.
            </p>
          </div>

          {/* Grille des scores */}
          <div>
            <p className="mb-2 text-[13px] text-current/70">
              <b className="text-current">Probabilité de chaque score</b> (lignes : buts de {home}, colonnes : buts de{" "}
              {away})
            </p>
            <div className="grid gap-1" style={{ gridTemplateColumns: `28px repeat(${SHOW}, minmax(0,1fr))` }}>
              <span />
              {Array.from({ length: SHOW }, (_, j) => (
                <span key={j} className="text-center font-mono text-[11px] text-current/50">
                  {j}
                </span>
              ))}
              {Array.from({ length: SHOW }, (_, i) => (
                <div key={i} className="contents">
                  <span className="flex items-center justify-center font-mono text-[11px] text-current/50">{i}</span>
                  {Array.from({ length: SHOW }, (_, j) => {
                    const p = m[i][j];
                    const t = p / maxP;
                    const isBest = i === best.i && j === best.j;
                    return (
                      <div
                        key={j}
                        className={`flex aspect-square items-center justify-center rounded-md font-mono text-[11px] ${t > 0.55 ? "text-white" : ""}`}
                        style={{
                          background: `rgba(232,111,44,${0.06 + t * 0.9})`,
                          outline: isBest ? "2px solid var(--gambeta-ink)" : "none",
                        }}
                        title={`${home} ${i} - ${j} ${away} : ${fr(p * 100, 1)} %`}
                      >
                        {p >= 0.005 ? `${Math.round(p * 100)}` : ""}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-current/50">Valeurs en %. Case encadrée = score le plus probable.</p>
          </div>
        </div>
      )}
    </div>
  );
}

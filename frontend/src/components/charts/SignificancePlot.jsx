import { LEAGUE_COLORS, seasonLabel } from "../../lib/leagues";
import { wilson, pValueHalf, formatP } from "../../lib/stats";

const LO = 0.4;
const HI = 0.72;
const pos = (v) => `${((v - LO) / (HI - LO)) * 100}%`;

// « Forest plot » : part des victoires à domicile parmi les matchs non nuls
export default function SignificancePlot({ rows, leagues, seasons }) {
  const lines = [];
  leagues.forEach((league) => {
    const per = rows.filter((r) => r.league === league && seasons.includes(r.season));
    if (!per.length) return;
    const home = per.reduce((s, r) => s + r.home_wins, 0);
    const away = per.reduce((s, r) => s + r.away_wins, 0);
    const total = { league, label: seasons.length > 1 ? `${league} · période` : league, home, n: home + away, bold: true };
    lines.push(total);
    if (seasons.length > 1) {
      per.forEach((r) => lines.push({ league, label: seasonLabel(r.season), home: r.home_wins, n: r.home_wins + r.away_wins }));
    }
  });
  const shown = lines.map((l) => {
    const [lo, hi] = wilson(l.home, l.n);
    const p = pValueHalf(l.home, l.n);
    return { ...l, share: l.home / l.n, lo, hi, p, sig: p < 0.05 };
  });
  const notSig = shown.filter((l) => !l.bold && !l.sig).length;
  const seasonRows = shown.filter((l) => !l.bold).length;

  return (
    <div>
      <div className="relative">
        {/* Axe */}
        <div className="ml-[150px] mr-[170px] flex justify-between font-mono text-[10px] text-current/50">
          {[0.4, 0.5, 0.6, 0.7].map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: `calc(150px + (100% - 320px) * ${(t - LO) / (HI - LO)})` }}>
              {Math.round(t * 100)} %
            </span>
          ))}
        </div>
        <div className="mt-5 space-y-1">
          {shown.map((l) => (
            <div key={l.label} className={`flex items-center ${l.bold ? "pt-2" : ""}`}>
              <span className={`w-[150px] shrink-0 truncate pr-2 text-[12px] ${l.bold ? "font-bold" : "pl-3 text-current/60"}`}>{l.label}</span>
              <div className="relative h-6 flex-1">
                <span className="absolute inset-y-0 w-px bg-current/40" style={{ left: pos(0.5) }} />
                <span
                  className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full"
                  style={{ left: pos(l.lo), width: `calc(${pos(l.hi)} - ${pos(l.lo)})`, background: LEAGUE_COLORS[l.league], opacity: l.bold ? 1 : 0.6 }}
                />
                <span
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--gambeta-paper)]"
                  style={{ left: pos(l.share), width: l.bold ? 14 : 10, height: l.bold ? 14 : 10, background: LEAGUE_COLORS[l.league] }}
                  title={`${l.label} : ${Math.round(l.share * 100)} % [${Math.round(l.lo * 100)}-${Math.round(l.hi * 100)}] sur ${l.n} matchs non nuls`}
                />
              </div>
              <span className={`w-[170px] shrink-0 pl-3 font-mono text-[11px] ${l.sig ? "" : "text-[#d64545]"}`}>
                {Math.round(l.share * 100)} % · {formatP(l.p)} {l.sig ? "" : "· non significatif"}
              </span>
            </div>
          ))}
        </div>
        <p className="ml-[150px] mt-1 text-[10px] text-current/50">← trait vertical : 50 % (pas d&apos;avantage)</p>
      </div>
      {seasonRows > 0 && (
        <p className="mt-4 text-[14px] leading-relaxed">
          Saison par saison, <b>{notSig} cas sur {seasonRows}</b> ne sont pas significatifs (barre qui touche 50 %) : sur
          une seule saison, il n&apos;y a qu&apos;environ 280 matchs non nuls par championnat, trop peu pour exclure le
          hasard. En réunissant les saisons, les intervalles se resserrent et l&apos;avantage devient indiscutable.
        </p>
      )}
    </div>
  );
}

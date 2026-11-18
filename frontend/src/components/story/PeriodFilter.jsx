import { seasonLabel } from "../../lib/leagues";
import { periodSeasons } from "../../lib/period";

// Filtre de période, global à la page : un clic sur une saison la choisit seule
export default function PeriodFilter({ seasons, value, onChange, className = "" }) {
  const selected = new Set(periodSeasons(seasons, value));
  const all = value.from === seasons[0] && value.to === seasons[seasons.length - 1] && seasons.length > 1;
  const select =
    "rounded-full border border-current/20 bg-[var(--gambeta-paper)] px-2 py-1 font-mono text-[12px] font-semibold";
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Saison">
        <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-current/50">Saison</span>
        {seasons.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange({ from: s, to: s })}
            aria-pressed={selected.has(s)}
            className={`rounded-full border px-3 py-1 font-mono text-[12px] font-semibold transition ${
              selected.has(s) ? "border-[#e86f2c] bg-[#e86f2c] text-white" : "border-current/15 hover:border-current/40"
            }`}
          >
            {seasonLabel(s)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange({ from: seasons[0], to: seasons[seasons.length - 1] })}
          aria-pressed={all}
          className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
            all ? "border-[var(--gambeta-ink)] bg-[var(--gambeta-ink)] text-[var(--gambeta-paper)]" : "border-current/15 hover:border-current/40"
          }`}
        >
          Toutes
        </button>
      </div>
      <div className="flex items-center gap-1.5 text-[12px] text-current/70">
        <span className="font-mono text-[11px] uppercase tracking-wide text-current/50">ou de</span>
        <select
          aria-label="Début de la période"
          className={select}
          value={value.from}
          onChange={(e) => onChange({ from: e.target.value, to: e.target.value > value.to ? e.target.value : value.to })}
        >
          {seasons.map((s) => (
            <option key={s} value={s}>
              {seasonLabel(s)}
            </option>
          ))}
        </select>
        <span className="font-mono text-[11px] uppercase tracking-wide text-current/50">à</span>
        <select
          aria-label="Fin de la période"
          className={select}
          value={value.to}
          onChange={(e) => onChange({ from: e.target.value < value.from ? e.target.value : value.from, to: e.target.value })}
        >
          {seasons.map((s) => (
            <option key={s} value={s}>
              {seasonLabel(s)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

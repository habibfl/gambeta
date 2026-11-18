import { LEAGUE_COLORS } from "../../lib/leagues";

// Boutons de filtre par championnat (« Tous » + les 5 ligues)
export default function LeagueFilter({ value, onChange, label = "Filtrer", className = "", allowAll = true }) {
  const options = [...(allowAll ? [null] : []), ...Object.keys(LEAGUE_COLORS)];
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`} role="group" aria-label={label}>
      <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-current/50">{label}</span>
      {options.map((lg) => {
        const on = value === lg;
        return (
          <button
            key={lg ?? "all"}
            type="button"
            onClick={() => onChange(lg)}
            aria-pressed={on}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
              on
                ? "border-[var(--gambeta-ink)] bg-[var(--gambeta-ink)] text-[var(--gambeta-paper)]"
                : "border-current/15 hover:border-current/40"
            }`}
          >
            {lg && <span className="h-2 w-2 rounded-full" style={{ background: LEAGUE_COLORS[lg] }} />}
            {lg ?? "Tous"}
          </button>
        );
      })}
    </div>
  );
}

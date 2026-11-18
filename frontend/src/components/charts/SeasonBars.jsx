// Barres groupées saison par saison (ex : buts et xG d'un joueur, points d'un club).
const seasonLabel = (code) => `${code.slice(0, 2)}-${code.slice(2)}`;

export default function SeasonBars({ rows, series, active, height = 180, format = (v) => v }) {
  const max = Math.max(1, ...rows.flatMap((r) => series.map((s) => r[s.key] ?? 0)));
  return (
    <div>
      <div className="flex items-end justify-around gap-3" style={{ height }}>
        {rows.map((row, i) => (
          <div key={row.season} className="flex h-full flex-1 items-end justify-center gap-1">
            {series.map((s) => {
              const value = row[s.key];
              return (
                <div key={s.key} className="flex h-full w-full max-w-[28px] flex-col items-center justify-end">
                  <span className="mb-1 text-[10px] font-semibold tabular-nums text-current/70">
                    {value == null ? "" : format(value)}
                  </span>
                  <div
                    className="w-full rounded-t-md transition-[height] duration-700 ease-out"
                    style={{
                      height: active && value != null ? `${(value / max) * 100}%` : "0%",
                      background: s.color,
                      transitionDelay: `${i * 80}ms`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-around gap-3 border-t border-current/10 pt-2">
        {rows.map((row) => (
          <span key={row.season} className="flex-1 text-center text-[11px] text-current/60">
            {seasonLabel(row.season)}
          </span>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-4 text-[11px] text-current/60">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

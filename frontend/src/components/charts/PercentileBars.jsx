// "Rapport de scout" façon FBref : une barre par indicateur
function tierColor(pct) {
  if (pct >= 70) return "#e86f2c";
  if (pct >= 40) return "rgba(232,111,44,0.45)";
  return "rgba(120,110,100,0.35)";
}

export default function PercentileBars({ rows, active }) {
  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
          <div className="flex items-baseline justify-between gap-2 text-[13px]">
            <span className="truncate text-current/70">{row.label}</span>
            <span className="shrink-0 font-semibold tabular-nums">
              {row.value == null ? "-" : `${row.value.toFixed(row.digits)}${row.unit}`}
            </span>
          </div>
          <span className="row-span-2 flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold tabular-nums text-white" style={{ background: row.percentile == null ? "rgba(120,110,100,0.35)" : tierColor(row.percentile) }}>
            {row.percentile ?? "–"}
          </span>
          <div className="h-2 overflow-hidden rounded-full bg-current/[0.07]">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: active && row.percentile != null ? `${Math.max(row.percentile, 2)}%` : "0%",
                background: row.percentile == null ? "transparent" : tierColor(row.percentile),
                transitionDelay: `${i * 60}ms`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

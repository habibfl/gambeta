import Reveal from "../story/Reveal";
import { useInView } from "../story/hooks";
import { ACCENT } from "../../lib/ui";

// Briques de mise en page communes à toutes les pages (même rendu partout).

export function PageBody({ children, className = "" }) {
  return (
    <div className={`mx-auto w-full max-w-[1200px] flex-1 px-6 pb-24 text-[var(--gambeta-ink)] md:px-12 ${className}`}>
      {children}
    </div>
  );
}

// Section : surtitre, titre, introduction, puis le contenu.
// layout="split" : texte à gauche, contenu à droite (graphiques compacts).
// `children` peut être une fonction (active) => …, vraie quand la section est visible.
export function Section({ id, kicker, title, intro, accent = ACCENT, layout = "stack", takeaways, children }) {
  const [ref, active] = useInView({ threshold: 0.15 });
  const content = typeof children === "function" ? children(active) : children;
  const header = (
    <Reveal>
      {kicker && <p className="font-mono text-xs uppercase tracking-[0.2em]" style={{ color: accent }}>{kicker}</p>}
      <h2
        className={`mt-2 max-w-[900px] font-extrabold leading-[1.1] tracking-tight ${
          layout === "split" ? "text-3xl md:text-4xl" : "text-3xl md:text-5xl"
        }`}
      >
        {title}
      </h2>
      {intro && <div className="mt-5 max-w-[720px] text-[17px] leading-[1.7] text-current/75 md:text-[18px]">{intro}</div>}
    </Reveal>
  );
  return (
    <section id={id} ref={ref} className="scroll-mt-28 border-t border-current/10 py-16 first:border-t-0 md:py-20">
      {layout === "split" ? (
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-12">
          {header}
          <div className="space-y-6">{content}</div>
        </div>
      ) : (
        <>
          {header}
          {content && <div className="mt-8 space-y-6">{content}</div>}
        </>
      )}
      {takeaways?.length > 0 && <Takeaways items={takeaways} accent={accent} />}
    </section>
  );
}

export function ChartCard({ title, note, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-current/10 bg-current/[0.02] p-4 md:p-6 ${className}`}>
      {title && <p className="mb-4 text-sm font-semibold">{title}</p>}
      {children}
      {note && <p className="mt-3 text-xs text-current/50">{note}</p>}
    </div>
  );
}

export function HowTo({ children }) {
  return (
    <p className="text-[13px] leading-relaxed text-current/70">
      <b className="text-current">Comment lire :</b> {children}
    </p>
  );
}

export function Takeaways({ items, accent = ACCENT, title = "Ce qu'il faut retenir" }) {
  return (
    <div className="mt-8 rounded-2xl border p-5 md:p-6" style={{ borderColor: `${accent}40`, background: `${accent}0a` }}>
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>
        {title}
      </p>
      <ul className="space-y-2.5 text-[15px] leading-relaxed">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Grand chiffre encadré
export function StatTile({ value, label, accent = ACCENT }) {
  return (
    <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-5">
      <p className="text-3xl font-extrabold tabular-nums tracking-tight" style={{ color: accent }}>
        {value}
      </p>
      <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-current/55">{label}</p>
    </div>
  );
}

// Barre de filtres en haut de page, collée sous la navigation au défilement
export function FilterBar({ children, sticky = true }) {
  return (
    <div
      className={`${sticky ? "sticky sticky-under-nav" : "relative"} z-30 border-b border-current/10 bg-[var(--gambeta-paper)]/90 text-[var(--gambeta-ink)] backdrop-blur`}
    >
      <div className="mx-auto max-w-[1200px] space-y-2 px-6 py-3 md:px-12">{children}</div>
    </div>
  );
}

export function FilterLabel({ children }) {
  return <span className="mr-1 font-mono text-[11px] uppercase tracking-wide text-current/50">{children}</span>;
}

// Groupe de boutons à choix unique : options = [{ value, label }]
export function ChipGroup({ label, options, value, onChange, className = "" }) {
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`} role="group" aria-label={label}>
      {label && <FilterLabel>{label}</FilterLabel>}
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={on}
            className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
              on
                ? "border-[var(--gambeta-ink)] bg-[var(--gambeta-ink)] text-[var(--gambeta-paper)]"
                : "border-current/15 hover:border-current/40"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

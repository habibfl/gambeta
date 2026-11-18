// Bandeau d'en-tête « jour de match » commun à toutes les pages : pelouse sombre, lignes du terrain
export default function PageHero({ eyebrow, title, subtitle, accent = "#e86f2c", children, aside, compact = false }) {
  return (
    <section
      className={`relative overflow-hidden text-white ${compact ? "pb-12 pt-28" : "pb-16 pt-32 md:pb-20 md:pt-36"}`}
      style={{
        background: `radial-gradient(ellipse 70% 60% at 85% 0%, ${accent}55 0%, transparent 60%),
                     radial-gradient(ellipse 50% 50% at 0% 100%, rgba(255,255,255,0.06) 0%, transparent 60%),
                     linear-gradient(160deg, #0d3324 0%, #0a2219 55%, #07160f 100%)`,
      }}
    >
      {/* Bandes de tonte de la pelouse */}
      <div
        className="pointer-events-none absolute inset-0" 
        style={{ opacity: 0.07,  backgroundImage: "repeating-linear-gradient(90deg, #fff 0 80px, transparent 80px 160px)" }}
        aria-hidden
      />
      {/* Lignes du terrain */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g fill="none" stroke="white" strokeOpacity="0.13" strokeWidth="1.5">
          <rect x="30" y="30" width="1140" height="440" rx="4" vectorEffect="non-scaling-stroke" />
          <line x1="600" y1="30" x2="600" y2="470" vectorEffect="non-scaling-stroke" />
          <circle cx="600" cy="250" r="85" vectorEffect="non-scaling-stroke" />
          <circle cx="600" cy="250" r="3" fill="white" fillOpacity="0.25" />
          <rect x="30" y="140" width="170" height="220" vectorEffect="non-scaling-stroke" />
          <rect x="30" y="200" width="60" height="100" vectorEffect="non-scaling-stroke" />
          <rect x="1000" y="140" width="170" height="220" vectorEffect="non-scaling-stroke" />
          <rect x="1110" y="200" width="60" height="100" vectorEffect="non-scaling-stroke" />
          <path d="M200 205 A60 60 0 0 1 200 295" vectorEffect="non-scaling-stroke" />
          <path d="M1000 205 A60 60 0 0 0 1000 295" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      {/* Bande de couleur en bas */}
      <div className="absolute inset-x-0 bottom-0 h-1" style={{ background: `linear-gradient(90deg, ${accent}, #e86f2c)` }} aria-hidden />

      <div className="relative mx-auto flex max-w-[1200px] flex-col gap-10 px-6 md:flex-row md:items-end md:justify-between md:px-12">
        <div className="max-w-[760px]">
          {eyebrow && (
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent }} />
              {eyebrow}
            </p>
          )}
          {title && <h1 className="text-[34px] font-extrabold leading-[1.05] tracking-[-0.02em] md:text-[52px]">{title}</h1>}
          {subtitle && <div className="mt-4 text-base text-white/75 md:text-lg">{subtitle}</div>}
          {children && <div className="mt-8">{children}</div>}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </section>
  );
}

// Petite tuile de chiffre clé, pensée pour le bandeau (fond translucide).
export function HeroStat({ value, label }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.08] px-4 py-3 backdrop-blur">
      <p className="text-2xl font-extrabold tabular-nums md:text-3xl">{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-white/60">{label}</p>
    </div>
  );
}

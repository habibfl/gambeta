import { Link } from "react-router-dom";
import logo from "../assets/logo.svg";

const REPO_URL = "https://github.com/habibfl/gambeta";

const COLUMNS = [
  {
    title: "Données",
    links: [
      { label: "Championnats", to: "/championnats" },
      { label: "Équipes", to: "/equipes" },
      { label: "Comparateur", to: "/comparateur" },
    ],
  },
  {
    title: "Analyse",
    links: [
      { label: "Explorateur", to: "/explorateur" },
      { label: "Analyses", to: "/analyses" },
      { label: "Modèles", to: "/modeles" },
      { label: "Étude de cas", to: "/etude-de-cas" },
      { label: "Méthodologie", to: "/methodologie" },
    ],
  },
  {
    title: "Sources",
    links: [
      { label: "FBref", href: "https://fbref.com" },
      { label: "Understat", href: "https://understat.com" },
      { label: "API-Football", href: "https://www.api-football.com" },
    ],
  },
];

const linkClass = "text-sm text-white/65 transition-colors hover:text-[#e86f2c]";

export default function Footer() {
  return (
    <footer className="border-t-4 border-[#e86f2c] bg-[#07160f] px-6 py-12 text-white md:px-12">
      <div className="mx-auto grid max-w-[1200px] gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <img src={logo} alt="Gambeta" className="h-7 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/60">
            Analyse de données des cinq grands championnats européens, saisons 2021-22 à 2025-26.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/40">{col.title}</p>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <Link to={l.to} className={linkClass}>
                      {l.label}
                    </Link>
                  ) : (
                    <a href={l.href} target="_blank" rel="noreferrer" className={linkClass}>
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mx-auto mt-10 flex max-w-[1200px] flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 Cheikh Mouhamadou Habib Fall · Données publiques, usage non commercial.</p>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className="font-semibold text-white/70 hover:text-[#e86f2c]">
          Code source sur GitHub
        </a>
      </div>
    </footer>
  );
}

import logo from "../assets/logo.svg";

const REPO_URL = "https://github.com/habibfl/gambeta";

// Footer clair (même fond que le reste du site, plus de bloc sombre) :
// logo + courte description du projet, puis une ligne de mentions en bas.
export default function Footer() {
  return (
    <footer className="border-t border-current/10 bg-[var(--gambeta-paper)] text-[var(--gambeta-ink)] px-6 md:px-12 py-12">
      <div className="max-w-[1200px] mx-auto">
        {/* Logo cliquable (vers le dépôt GitHub) + description courte du projet */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="shrink-0">
            <img src={logo} alt="Gambeta" className="h-7 w-auto" />
          </a>
          <p className="max-w-md text-sm leading-relaxed text-current/60 sm:text-right">
            Projet personnel explorant la donnée football à travers le xG,
            le xA et la comparaison de championnats européens. Construit
            avec React, FastAPI et beaucoup de café.
          </p>
        </div>

        {/* Ligne de séparation fine */}
        <div className="my-8 h-px bg-current/10" />

        {/* Mentions + lien vers le code source */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-current/50">
            © 2026 gambeta · Projet étudiant, données à but non commercial
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-current/70 underline decoration-current/20 underline-offset-4 transition-colors hover:text-[#e86f2c] hover:decoration-[#e86f2c]/40"
          >
            Code source sur GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}

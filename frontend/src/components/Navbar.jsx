import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowUpRight, ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import logo from "../assets/logo.svg";
import { useTheme } from "../context/useTheme";

const LEAGUES_API_URL = "http://localhost:8000/api/leagues";
const COMPETITIONS_API_URL = "http://localhost:8000/api/competitions";

// Replis utilisés si l'API (backend + clé API-Football) n'est pas
// disponible, pour que les menus "Ligues" et "Compétitions" ne
// s'affichent jamais vides. `logo: null` déclenche le rond à initiales
// dans LeagueCard.
const LEAGUES_FALLBACK = [
  { id: "ligue-1", name: "Ligue 1", logo: null, initials: "L1" },
  { id: "premier-league", name: "Premier League", logo: null, initials: "PL" },
  { id: "liga", name: "Liga", logo: null, initials: "LIGA" },
  { id: "serie-a", name: "Serie A", logo: null, initials: "SA" },
  { id: "bundesliga", name: "Bundesliga", logo: null, initials: "BL" },
];

const COMPETITIONS_FALLBACK = [
  { id: "ligue-des-champions", name: "Ligue des Champions", logo: null, initials: "LDC" },
  { id: "europa-league", name: "Europa League", logo: null, initials: "EL" },
  { id: "europa-conference-league", name: "Europa Conference League", logo: null, initials: "ECL" },
];

const GROUPS = [
  { id: "ligues", label: "Ligues", description: "Les championnats qui rythment la saison.", to: "/championnats" },
  { id: "competitions", label: "Compétitions", description: "Les grandes soirées européennes.", to: "/championnats/ligue-des-champions" },
];

const SIMPLE_LINKS = [
  { label: "Équipes", to: "/equipes" },
  { label: "Comparateur", to: "/comparateur" },
  { label: "Joueurs", to: "/joueurs" },
];

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-current/10 bg-black/5 transition-colors hover:bg-[#e86f2c]/10 dark:bg-white/5"
    >
      {isDark ? <Moon size={17} /> : <Sun size={17} className="text-[#e86f2c]" />}
    </button>
  );
}

// Une carte de championnat/compétition, cliquable, avec logo (ou repli à
// initiales) et cascade d'entrée quand le menu s'ouvre.
function LeagueCard({ item, index, onNavigate }) {
  return (
    <Link
      to={`/championnats/${item.id}`}
      onClick={onNavigate}
      // `animate-[...]` + délai inline : cascade d'entrée (slide + fade),
      // chaque carte décalée de 50ms par rapport à la précédente. `both`
      // garde l'état final une fois l'animation terminée. `active:scale`
      // donne un retour tactile net au clic.
      className="group flex min-w-36 flex-1 flex-col items-center gap-3 rounded-2xl border border-[#221400]/10 bg-[#f9f9f5] px-4 py-4 text-center transition-all duration-200 ease-out animate-[menu-item-in_260ms_cubic-bezier(0.34,1.56,0.64,1)_both] hover:-translate-y-1 hover:border-[#e86f2c]/50 hover:bg-white active:scale-[0.97]"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white p-2 shadow-sm">
        {item.logo ? (
          <img src={item.logo} alt={`${item.name} logo`} className="h-full w-full object-contain" />
        ) : (
          // Repli tant que le vrai blason (via l'API ou un fichier local) n'est pas disponible
          <span className="text-[10px] font-bold text-[#221400]/50">{item.initials}</span>
        )}
      </span>
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#221400]">{item.name}</span>
    </Link>
  );
}

// Contenu d'un menu (en-tête + rangée de cartes), réutilisé identique pour
// le panneau desktop (un seul, partagé, sous la barre) et le menu mobile
// (affiché en ligne dans l'accordéon).
function MenuPanelContent({ group, items, onNavigate, className = "" }) {
  return (
    <div className={`px-5 pb-5 pt-4 md:px-7 ${className}`}>
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e86f2c]">Explorer</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#221400]">{group.label}</h2>
          <p className="mt-1 max-w-md text-sm text-[#221400]/60">{group.description}</p>
        </div>
        <Link to={group.to} onClick={onNavigate} className="hidden shrink-0 items-center gap-1 rounded-full bg-[#221400] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#e86f2c] sm:flex">Voir la page <ArrowUpRight size={14} /></Link>
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
        {items.map((item, index) => (
          <LeagueCard key={item.id} item={item} index={index} onNavigate={onNavigate} />
        ))}
      </div>

      <Link to={group.to} onClick={onNavigate} className="mt-4 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#e86f2c] sm:hidden">Voir la page <ArrowUpRight size={14} /></Link>
    </div>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Menu desktop ouvert (survol ou clic — voir plus bas) et groupe ouvert
  // dans l'accordéon mobile : deux états distincts.
  const [desktopOpenMenu, setDesktopOpenMenu] = useState(null);
  const [mobileOpenGroup, setMobileOpenGroup] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Replis à initiales affichés immédiatement ; remplacés silencieusement
  // par les vraies données (nom + logo) dès que l'API répond avec succès.
  const [leagues, setLeagues] = useState(LEAGUES_FALLBACK);
  const [competitions, setCompetitions] = useState(COMPETITIONS_FALLBACK);
  const navRef = useRef(null);
  const lastScrollY = useRef(0);
  // Minuteur de fermeture différée (survol desktop) : un seul suffit
  // puisqu'un seul menu peut être ouvert à la fois.
  const closeTimerRef = useRef(null);
  const anyMenuOpen = Boolean(desktopOpenMenu) || mobileOpen;

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 20);
      setHidden(currentY > 120 && currentY > lastScrollY.current && !anyMenuOpen);
      lastScrollY.current = currentY;
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [anyMenuOpen]);

  useEffect(() => {
    // Récupérées une seule fois au montage, pas à chaque ouverture d'un
    // menu : le backend met déjà les résultats en cache 24h de son côté
    // (un seul appel API-Football partagé entre les deux routes).
    let cancelled = false;

    fetch(LEAGUES_API_URL)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("API indisponible"))))
      .then((data) => {
        if (cancelled) return;
        // Si l'API ne renvoie rien d'exploitable (backend éteint, clé
        // API-Football absente...), on retombe sur la liste statique
        // plutôt que d'afficher un menu vide.
        setLeagues(data.leagues?.length ? data.leagues : LEAGUES_FALLBACK);
      })
      .catch(() => { if (!cancelled) setLeagues(LEAGUES_FALLBACK); });

    fetch(COMPETITIONS_API_URL)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("API indisponible"))))
      .then((data) => {
        if (cancelled) return;
        setCompetitions(data.competitions?.length ? data.competitions : COMPETITIONS_FALLBACK);
      })
      .catch(() => { if (!cancelled) setCompetitions(COMPETITIONS_FALLBACK); });

    return () => { cancelled = true; };
  }, []);

  // Sans Radix, il faut refermer le menu desktop nous-mêmes au clic en
  // dehors de la barre ou à Échap.
  useEffect(() => {
    const handleOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setDesktopOpenMenu(null);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") setDesktopOpenMenu(null);
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Nettoie un minuteur de fermeture encore en attente si le composant
  // est démonté avant qu'il ne se déclenche.
  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const closeMenus = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setDesktopOpenMenu(null);
    setMobileOpenGroup(null);
    setMobileOpen(false);
  };

  // Survol desktop : ouvre immédiatement (et annule une fermeture déjà
  // programmée), pour que passer du bouton au panneau — ou d'un menu à
  // l'autre — reste fluide.
  const openOnHover = (groupId) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setDesktopOpenMenu(groupId);
  };

  // Programme la fermeture avec un léger délai plutôt qu'immédiatement :
  // une sortie brève de la souris (ex: en visant le panneau juste en
  // dessous) ne doit pas refermer le menu par accident.
  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setDesktopOpenMenu(null);
      closeTimerRef.current = null;
    }, 180);
  };

  // Clic sur le bouton d'un menu : bascule l'état (et annule un minuteur
  // de fermeture en attente), pour que le clic reste utilisable même sans
  // survol (clavier, tactile hybride...).
  const toggleOnClick = (groupId) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setDesktopOpenMenu((current) => (current === groupId ? null : groupId));
  };

  const linkClass = ({ isActive }) => `nav-link relative text-[13px] font-medium uppercase tracking-wider transition-colors duration-200 ${isActive ? "text-[#e86f2c]" : "text-current hover:text-[#e86f2c]"}`;

  // Quelle liste (ligues ou compétitions) alimente le panneau, selon
  // l'id du groupe concerné.
  const itemsForGroup = (groupId) => (groupId === "ligues" ? leagues : competitions);

  return (
    <header ref={navRef} className={`fixed left-0 right-0 top-0 z-50 px-0 md:px-5 transition-transform duration-300 ${hidden ? "-translate-y-full" : "translate-y-0"}`}>
      <div className={`nav-shell relative overflow-hidden border transition-all duration-300 md:rounded-b-[24px] ${anyMenuOpen ? "border-[#221400]/10 bg-[#f9f9f5]/98 text-[#221400] shadow-[0_20px_60px_rgba(34,20,0,0.16)]" : "border-transparent bg-transparent text-[#221400] dark:text-white"} ${scrolled && !anyMenuOpen ? "backdrop-blur-md" : ""}`}>
        {/* Structure volontairement simple : deux enfants flex, logo à
            gauche et un seul bloc "reste" à droite (nav + thème + burger),
            espacés par justify-between. Pas de centrage ni de seuil
            personnalisé — juste le breakpoint standard lg (1024px) de
            Tailwind pour basculer entre nav complète et menu hamburger. */}
        <div className="flex h-16 items-center justify-between px-5 md:px-7">
          <Link to="/" aria-label="Gambeta - accueil" onClick={closeMenus} className="shrink-0">
            <img src={logo} alt="Gambeta" className="h-8 w-auto" />
          </Link>

          <div className="flex items-center gap-6">
            <nav className="hidden items-center gap-5 lg:flex">
              <NavLink to="/" className={linkClass} end>Accueil</NavLink>

              {GROUPS.map((group) => (
                <div key={group.id} onMouseEnter={() => openOnHover(group.id)} onMouseLeave={scheduleClose}>
                  <button
                    type="button"
                    onClick={() => toggleOnClick(group.id)}
                    aria-expanded={desktopOpenMenu === group.id}
                    className="flex items-center gap-1 text-[13px] font-medium uppercase tracking-wider transition-colors hover:text-[#e86f2c]"
                  >
                    {group.label}
                    <ChevronDown size={14} className={`transition-transform ${desktopOpenMenu === group.id ? "rotate-180" : ""}`} />
                  </button>
                </div>
              ))}

              {SIMPLE_LINKS.map((link) => <NavLink key={link.to} to={link.to} className={linkClass}>{link.label}</NavLink>)}
            </nav>

            <ThemeToggle />

            {/* Hamburger : uniquement sous 1024px, la nav complète le remplace au-delà */}
            <button type="button" onClick={() => setMobileOpen((current) => !current)} aria-label="Ouvrir le menu" className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[#e86f2c]/10 lg:hidden">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Panneau desktop : un seul, partagé entre "Ligues" et
            "Compétitions" (le contenu change selon le groupe ouvert).
            Survol maintenu ici aussi, pour que la souris puisse
            descendre du bouton vers le panneau sans le refermer. */}
        <div
          onMouseEnter={() => desktopOpenMenu && openOnHover(desktopOpenMenu)}
          onMouseLeave={scheduleClose}
          className={`transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${desktopOpenMenu ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"}`}
        >
          {desktopOpenMenu ? (
            <MenuPanelContent
              group={GROUPS.find((group) => group.id === desktopOpenMenu)}
              items={itemsForGroup(desktopOpenMenu)}
              onNavigate={closeMenus}
            />
          ) : null}
        </div>

        {/* Menu mobile : accordéon inline, au clic uniquement (le survol
            n'a pas de sens sur tactile). */}
        <div className={`border-t border-[#221400]/10 px-6 transition-[max-height,opacity,padding] duration-300 lg:hidden ${mobileOpen ? "max-h-[80vh] py-4 opacity-100" : "max-h-0 overflow-hidden py-0 opacity-0"}`}>
          <div className="flex flex-col gap-5">
            <NavLink to="/" className={linkClass} end onClick={closeMenus}>Accueil</NavLink>
            {GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setMobileOpenGroup((current) => (current === group.id ? null : group.id))}
                className="flex items-center justify-between text-left text-sm font-semibold uppercase tracking-wider"
              >
                {group.label}
                <ChevronDown size={16} className={mobileOpenGroup === group.id ? "rotate-180" : ""} />
              </button>
            ))}
            {mobileOpenGroup ? (
              <MenuPanelContent
                group={GROUPS.find((group) => group.id === mobileOpenGroup)}
                items={itemsForGroup(mobileOpenGroup)}
                onNavigate={closeMenus}
                className="-mx-6 border-t border-[#221400]/10"
              />
            ) : null}
            {SIMPLE_LINKS.map((link) => <NavLink key={link.to} to={link.to} className={linkClass} onClick={closeMenus}>{link.label}</NavLink>)}
          </div>
        </div>
      </div>
    </header>
  );
}

import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowUpRight, ChevronDown, Menu, Moon, Sun, X } from "lucide-react";
import logo from "../assets/logo.svg";
import { useTheme } from "../context/useTheme";

const NAV_API_URL = "http://localhost:8000/api/leagues";

// Repli utilisé si l'API (backend + clé API-Football) n'est pas
// disponible, pour que le menu "Ligues" ne s'affiche jamais vide.
// `logo: null` déclenche le rond à initiales dans LeagueCard.
const LEAGUES_FALLBACK = [
  { id: "ligue-1", name: "Ligue 1", logo: null, initials: "L1" },
  { id: "premier-league", name: "Premier League", logo: null, initials: "PL" },
  { id: "liga", name: "Liga", logo: null, initials: "LIGA" },
  { id: "serie-a", name: "Serie A", logo: null, initials: "SA" },
  { id: "bundesliga", name: "Bundesliga", logo: null, initials: "BL" },
];

const GROUPS = [
  { id: "ligues", label: "Ligues", description: "Les championnats qui rythment la saison.", to: "/championnats" },
  { id: "competitions", label: "Compétitions", description: "Les grandes soirées européennes.", to: "/championnats/ligue-des-champions" },
];

const SIMPLE_LINKS = [
  { label: "Comparateur", to: "/comparateur" },
  { label: "Joueurs", to: "/joueurs" },
];

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button type="button" onClick={toggleTheme} aria-label={isDark ? "Passer en mode clair" : "Passer en mode sombre"} className="flex h-9 w-9 items-center justify-center rounded-full border border-current/10 bg-black/5 transition-colors hover:bg-[#e86f2c]/10 dark:bg-white/5">
      {isDark ? <Moon size={17} /> : <Sun size={17} className="text-[#e86f2c]" />}
    </button>
  );
}

function LeagueCard({ item, onNavigate }) {
  return (
    <Link to={`/championnats/${item.id}`} onClick={onNavigate} className="group flex min-w-36 flex-1 flex-col items-center gap-3 rounded-2xl border border-[#221400]/10 bg-[#f9f9f5] px-4 py-4 text-center transition-all duration-200 hover:-translate-y-1 hover:border-[#e86f2c]/50 hover:bg-white">
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

function ExpandedPanel({ group, leagues, loading, onNavigate }) {
  const isLeagueGroup = group.id === "ligues";
  return (
    <div className="border-t border-[#221400]/10 px-5 pb-5 pt-4 md:px-7">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e86f2c]">Explorer</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#221400]">{group.label}</h2>
          <p className="mt-1 max-w-md text-sm text-[#221400]/60">{group.description}</p>
        </div>
        <Link to={group.to} onClick={onNavigate} className="hidden shrink-0 items-center gap-1 rounded-full bg-[#221400] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-[#e86f2c] sm:flex">Voir la page <ArrowUpRight size={14} /></Link>
      </div>

      {isLeagueGroup ? (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
          {loading ? <p className="py-5 text-sm text-[#221400]/55">Chargement des ligues...</p> : leagues.map((item) => <LeagueCard key={item.id} item={item} onNavigate={onNavigate} />)}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/championnats/ligue-des-champions" onClick={onNavigate} className="rounded-full border border-[#221400]/15 px-4 py-2 text-sm text-[#221400] transition-colors hover:border-[#e86f2c] hover:text-[#e86f2c]">Ligue des Champions</Link>
          <Link to="/championnats/europa-league" onClick={onNavigate} className="rounded-full border border-[#221400]/15 px-4 py-2 text-sm text-[#221400] transition-colors hover:border-[#e86f2c] hover:text-[#e86f2c]">Europa League</Link>
        </div>
      )}

      <Link to={group.to} onClick={onNavigate} className="mt-4 flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#e86f2c] sm:hidden">Voir la page <ArrowUpRight size={14} /></Link>
    </div>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [leagues, setLeagues] = useState([]);
  const [leaguesLoaded, setLeaguesLoaded] = useState(false);
  const navRef = useRef(null);
  const lastScrollY = useRef(0);
  const openMenu = hoveredMenu || activeMenu;

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 20);
      setHidden(currentY > 120 && currentY > lastScrollY.current && !openMenu && !mobileOpen);
      lastScrollY.current = currentY;
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [openMenu, mobileOpen]);

  useEffect(() => {
    if (!openMenu || leagues.length) return undefined;
    let cancelled = false;
    fetch(NAV_API_URL)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("API indisponible"))))
      .then((data) => {
        if (cancelled) return;
        // Si l'API ne renvoie rien d'exploitable (backend éteint, clé
        // API-Football absente...), on retombe sur la liste statique
        // plutôt que d'afficher un menu vide.
        setLeagues(data.leagues?.length ? data.leagues : LEAGUES_FALLBACK);
      })
      .catch(() => { if (!cancelled) setLeagues(LEAGUES_FALLBACK); })
      .finally(() => { if (!cancelled) setLeaguesLoaded(true); });
    return () => { cancelled = true; };
  }, [openMenu, leagues.length]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setHoveredMenu(null);
        setActiveMenu(null);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setHoveredMenu(null);
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const closeMenus = () => {
    setHoveredMenu(null);
    setActiveMenu(null);
    setMobileOpen(false);
  };

  const linkClass = ({ isActive }) => `nav-link relative text-[13px] font-medium uppercase tracking-wider transition-colors duration-200 ${isActive ? "text-[#e86f2c]" : "text-current hover:text-[#e86f2c]"}`;

  return (
    <header ref={navRef} className={`fixed left-0 right-0 top-0 z-50 px-0 md:px-5 transition-transform duration-300 ${hidden ? "-translate-y-full" : "translate-y-0"}`}>
      <div onMouseLeave={() => setHoveredMenu(null)} className={`nav-shell relative overflow-hidden border transition-all duration-300 md:rounded-b-[24px] ${openMenu ? "border-[#221400]/10 bg-[#f9f9f5]/98 text-[#221400] shadow-[0_20px_60px_rgba(34,20,0,0.16)]" : "border-transparent bg-transparent text-[#221400] dark:text-white"} ${scrolled && !openMenu ? "backdrop-blur-md" : ""}`}>
        <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center px-5 md:px-7">
          <nav className="hidden items-center gap-6 md:flex">
            {/* "Accueil" et les liens simples ferment un menu ouvert : sinon,
                passer la souris dessus pour rejoindre le logo/le thème
                laisse le panneau ouvert puisqu'on ne quitte jamais la barre. */}
            <NavLink to="/" className={linkClass} end onMouseEnter={() => setHoveredMenu(null)}>Accueil</NavLink>
            {GROUPS.map((group) => (
              <div key={group.id} onMouseEnter={() => setHoveredMenu(group.id)}>
                <button type="button" onClick={() => setActiveMenu((current) => (current === group.id ? null : group.id))} aria-expanded={openMenu === group.id} className="flex items-center gap-1 text-[13px] font-medium uppercase tracking-wider transition-colors hover:text-[#e86f2c]">{group.label}<ChevronDown size={14} className={`transition-transform ${openMenu === group.id ? "rotate-180" : ""}`} /></button>
              </div>
            ))}
            {SIMPLE_LINKS.map((link) => <NavLink key={link.to} to={link.to} className={linkClass} onMouseEnter={() => setHoveredMenu(null)}>{link.label}</NavLink>)}
          </nav>

          <Link to="/" aria-label="Gambeta - accueil" onClick={closeMenus} onMouseEnter={() => setHoveredMenu(null)} className="col-start-2 justify-self-center"><img src={logo} alt="Gambeta" className="h-8 w-auto" /></Link>

          <div className="col-start-3 flex items-center justify-self-end gap-3" onMouseEnter={() => setHoveredMenu(null)}>
            <ThemeToggle />
            <button type="button" onClick={() => setMobileOpen((current) => !current)} aria-label="Ouvrir le menu" className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-[#e86f2c]/10 md:hidden">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>

        <div className={`transition-[max-height,opacity] duration-300 ${openMenu ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"}`}>{openMenu ? <ExpandedPanel group={GROUPS.find((group) => group.id === openMenu)} leagues={leagues} loading={!leaguesLoaded} onNavigate={closeMenus} /> : null}</div>

        <div className={`border-t border-[#221400]/10 px-6 transition-[max-height,opacity,padding] duration-300 md:hidden ${mobileOpen ? "max-h-[80vh] py-4 opacity-100" : "max-h-0 overflow-hidden py-0 opacity-0"}`}>
          <div className="flex flex-col gap-5">
            <NavLink to="/" className={linkClass} end onClick={closeMenus}>Accueil</NavLink>
            {GROUPS.map((group) => <button key={group.id} type="button" onClick={() => setActiveMenu((current) => (current === group.id ? null : group.id))} className="flex items-center justify-between text-left text-sm font-semibold uppercase tracking-wider">{group.label}<ChevronDown size={16} className={activeMenu === group.id ? "rotate-180" : ""} /></button>)}
            {activeMenu ? <ExpandedPanel group={GROUPS.find((group) => group.id === activeMenu)} leagues={leagues} loading={!leaguesLoaded} onNavigate={closeMenus} /> : null}
            {SIMPLE_LINKS.map((link) => <NavLink key={link.to} to={link.to} className={linkClass} onClick={closeMenus}>{link.label}</NavLink>)}
          </div>
        </div>
      </div>
    </header>
  );
}

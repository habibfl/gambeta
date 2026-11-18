import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import insights from "../../data/insights.json";
import { useTeamLogos } from "../../hooks/useTeamLogos";
import Term from "../Term";
import Reveal from "./Reveal";
import CrestSwarm from "./CrestSwarm";
import LuckScatter from "./LuckScatter";
import HeadPile from "./HeadPile";
import { fr, useInView } from "./hooks";
import PeriodFilter from "./PeriodFilter";
import LeagueFilter from "./LeagueFilter";
import { periodSeasons, periodLabel, lastSeasonPeriod } from "../../lib/period";

// Données calculées une fois (le JSON est statique)
const MODEL = insights.points_model;
const TEAMS_2526 = MODEL.teams.filter((t) => t.season === "2526");
const byDelta = [...TEAMS_2526].sort((a, b) => b.delta - a.delta);
const CEILING = TEAMS_2526.find((t) => t.team === "Bayern Munich");
// Les deux clubs les plus chanceux de 2025-26 (cités dans le texte)
const LUCKY = byDelta.slice(0, 2);

const OVER_ALL = [...insights.finishing.players].sort((a, b) => b.diff - a.diff);
const toPile = (p) => ({ ...p, count: Math.round(Math.abs(p.diff)) });
// Les 5 plus au-dessus (ou en dessous) de leurs xG, dans le championnat choisi.
const pileCache = {};
function pileFor(sorted, league, side) {
  const key = `${league}|${side}`;
  if (!pileCache[key]) {
    const pool = league ? sorted.filter((p) => p.league === league) : sorted;
    pileCache[key] = (side === "over" ? pool.slice(0, 5) : pool.slice(-5).reverse()).map(toPile);
  }
  return pileCache[key];
}
const KANE = OVER_ALL[0];
const P = insights.persistence;

const pct = (v) => Math.round(v * 100);

function Prose({ children, className = "" }) {
  return (
    <Reveal className={`mx-auto max-w-[640px] px-6 text-[19px] leading-[1.7] md:text-[21px] ${className}`}>
      {children}
    </Reveal>
  );
}

function Mark({ color, children }) {
  return (
    <span className="rounded px-1 font-bold text-white" style={{ background: color }}>
      {children}
    </span>
  );
}

// Grand chiffre qui « compte » jusqu'à sa valeur quand il apparaît.
function BigNumber({ value, unit, color, caption }) {
  const [ref, inView] = useInView({ threshold: 0.5 });
  return (
    <div ref={ref} className="flex-1 rounded-3xl border border-current/10 p-8 text-center">
      <div
        className="text-6xl font-extrabold tracking-tight transition-all duration-1000 md:text-7xl motion-reduce:transition-none"
        style={{ color, opacity: inView ? 1 : 0, transform: inView ? "scale(1)" : "scale(0.6)" }}
      >
        {fr(value, 1, true)}
        <span className="ml-1 text-2xl md:text-3xl">{unit}</span>
      </div>
      <p className="mx-auto mt-4 max-w-xs text-[15px] leading-relaxed text-current/70">{caption}</p>
    </div>
  );
}

// L'histoire de la page d'accueil, façon « data story » : un fil narratif qu'on lit en scrollant
export default function LuckStory() {
  const logoFor = useTeamLogos();
  // Filtre global de l'histoire : période + championnat, appliqués à tous ses graphiques
  const [period, setPeriod] = useState(() => lastSeasonPeriod(insights.seasons));
  const [league, setLeague] = useState(null);
  const chosen = useMemo(() => periodSeasons(insights.seasons, period), [period]);
  // Un club par ligne, cumulé sur la période (points, écart, nb de saisons)
  const clubs = useMemo(() => {
    const byClub = {};
    MODEL.teams
      .filter((t) => chosen.includes(t.season))
      .forEach((t) => {
        const k = `${t.league}|${t.team}`;
        const c = (byClub[k] ??= { team: t.team, league: t.league, points: 0, delta: 0, nSeasons: 0 });
        c.points += t.points;
        c.delta += t.delta;
        c.nSeasons += 1;
      });
    return Object.values(byClub).map((c) => ({ ...c, delta: Math.round(c.delta * 10) / 10 }));
  }, [chosen]);
  const has2526 = chosen.includes("2526");
  const name = (t) => t.team.replace("Napoli", "Naples");

  const steps = [
    <>
      <p className="font-mono text-[11px] uppercase tracking-widest text-current/50">1 / 4</p>
      <p className="mt-2">
        Chaque point est <b>une équipe sur une saison</b> : {MODEL.teams.length} au total, de 2021-22 à 2025-26.
      </p>
      <p className="mt-3">
        Plus la différence entre buts marqués et encaissés est élevée, plus le total de points l'est aussi.
      </p>
    </>,
    <>
      <p className="font-mono text-[11px] uppercase tracking-widest text-current/50">2 / 4</p>
      <p className="mt-2">
        Une régression linéaire suffit : la <Term id="gd">différence de buts</Term> explique{" "}
        <b>{pct(MODEL.r2)} %</b> de la variance des points (R²).
      </p>
      <p className="mt-3">Chaque but d'écart par match vaut environ {fr(MODEL.slope, 2)} point par match.</p>
    </>,
    <>
      <p className="font-mono text-[11px] uppercase tracking-widest text-current/50">3 / 4</p>
      <p className="mt-2">
        Le résidu, c'est-à-dire <b>la distance à la droite</b>, mesure l'écart au total attendu.{" "}
        <Mark color="#e86f2c">Au-dessus</Mark> : plus de points que prévu, souvent grâce à des victoires courtes.{" "}
        <Mark color="#2a6fd6">En dessous</Mark> : moins de points que prévu malgré un bon bilan de buts.
      </p>
      <p className="mt-3">Les écussons correspondent à la période et au championnat sélectionnés dans les filtres.</p>
    </>,
    <>
      <p className="font-mono text-[11px] uppercase tracking-widest text-current/50">4 / 4</p>
      <p className="mt-2">
        Cas du Bayern Munich en 2025-26 : avec {CEILING.gd > 0 ? "+" : ""}
        {CEILING.gd} de différence de buts, le modèle prévoyait <b>{fr(CEILING.points - CEILING.delta)} points</b>, pour
        102 possibles.
      </p>
      <p className="mt-3">
        Le modèle linéaire surestime les équipes les plus dominantes : l'écart traduit <b>un effet de plafond</b>, pas un manque de réussite.
      </p>
    </>,
  ];

  return (
    <section className="bg-[var(--gambeta-paper)] pb-24 pt-20 text-[var(--gambeta-ink)] md:pt-28">
      {/* Accroche */}
      <Reveal className="mx-auto max-w-[760px] px-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#e86f2c]">Étude : points attendus et points réels</p>
        <h2 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-6xl">
          Le classement reflète-t-il le niveau réel des équipes ?
        </h2>
      </Reveal>
      <Prose className="mt-8">
        <p>
          Chaque club est placé selon l'écart entre ses points réels et les points attendus d'après sa différence
          de buts. Par défaut, la saison 2025-26 ({TEAMS_2526.length} clubs) ; les filtres couvrent 2021-22 à 2025-26.
        </p>
      </Prose>

      {/* Filtre global, collé en haut tant qu'on lit l'histoire */}
      <div className="sticky sticky-under-nav z-40 mt-10 border-y border-current/10 bg-[var(--gambeta-paper)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
          <PeriodFilter seasons={insights.seasons} value={period} onChange={setPeriod} />
          <LeagueFilter value={league} onChange={setLeague} label="Championnat" />
        </div>
      </div>

      <Reveal className="mx-auto mt-10 max-w-[1200px] px-6">
        <CrestSwarm teams={clubs} league={league} label={periodLabel(period)} logoFor={logoFor} />
      </Reveal>

      <Prose className="mt-14">
        <p>
          En 2025-26, les plus fortes surperformances sont celles de {LUCKY.map(name).join(" et ")}. À l'opposé
          figure le <b>Bayern Munich</b>, pourtant champion avec {CEILING.points} points : un cas expliqué plus bas.
        </p>
        <p className="mt-6">Le total attendu provient d'une régression des points sur la différence de buts.</p>
      </Prose>

      {/* Nuage de points en scrollytelling */}
      <div className="mx-auto mt-10 max-w-[1200px] px-6">
        <LuckScatter
          model={MODEL}
          steps={steps}
          period={chosen}
          league={league}
          logoFor={logoFor}
        />
      </div>

      {/* Joueurs */}
      <Reveal className="mx-auto mt-8 max-w-[760px] px-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#e86f2c]">Joueurs</p>
        <h3 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
          Buts marqués et buts attendus (xG)
        </h3>
      </Reveal>
      <Prose className="mt-6">
        <p>
          Le <Term id="xg">xG</Term> estime le nombre de buts qu'un joueur aurait dû marquer d'après la qualité de
          ses occasions. Ci-dessous, <b>chaque visage représente un but marqué au-delà de ses xG</b>.
        </p>
        <p className="mt-3 text-[15px]">
          <Link to="/methodologie#xg" className="font-semibold text-[#e86f2c] underline underline-offset-4">
            Fonctionnement du xG : démonstration interactive →
          </Link>
        </p>
      </Prose>
      {!has2526 && (
        <Prose className="mt-6">
          <p className="rounded-xl border border-[#e86f2c]/30 bg-[#e86f2c]/[0.06] px-4 py-3 text-[15px]">
            Les xG des joueurs ne sont disponibles que pour <b>2025-26</b> : les visages ci-dessous restent sur
            cette saison, quelle que soit la période choisie.
          </p>
        </Prose>
      )}
      <Reveal className="mx-auto mt-10 max-w-[1000px] px-6">
        <HeadPile key={`over-${league}`} players={pileFor(OVER_ALL, league, "over")} logoFor={logoFor} />
      </Reveal>
      <Prose className="mt-12">
        <p>
          {KANE.player}&nbsp;: {KANE.goals} buts pour {fr(KANE.xg)} xG, soit {Math.round(KANE.diff)} buts au-dessus de
          l'attendu, l'écart le plus élevé des cinq championnats.
        </p>
        <p className="mt-6">
          À l'inverse, <b>chaque visage gris représente un but en dessous des xG</b>&nbsp;: des occasions de qualité
          qui n'ont pas été converties.
        </p>
      </Prose>
      <Reveal className="mx-auto mt-10 max-w-[1000px] px-6">
        <HeadPile key={`under-${league}`} players={pileFor(OVER_ALL, league, "under")} muted logoFor={logoFor} />
      </Reveal>

      {/* Chute */}
      <Reveal className="mx-auto mt-24 max-w-[760px] px-6">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#e86f2c]">Persistance</p>
        <h3 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight md:text-5xl">
          Un écart qui ne se répète pas d'une saison à l'autre
        </h3>
      </Reveal>
      <Prose className="mt-6">
        <p>
          Un écart lié au niveau de l'équipe devrait persister la saison suivante. Le test porte sur {P.pairs} équipes
          observées sur deux saisons consécutives&nbsp;:
        </p>
      </Prose>
      <div className="mx-auto mt-10 flex max-w-[900px] flex-col gap-5 px-6 md:flex-row">
        <BigNumber
          value={P.lucky.points_change}
          unit="pts"
          color="#e86f2c"
          caption={`la saison suivante, en moyenne, pour les ${P.lucky.n} équipes qui avaient pris au moins 6 points de plus que prévu.`}
        />
        <BigNumber
          value={P.unlucky.points_change}
          unit="pts"
          color="#2a6fd6"
          caption={`la saison suivante, en moyenne, pour les ${P.unlucky.n} équipes qui avaient pris au moins 6 points de moins que prévu.`}
        />
      </div>
      <Prose className="mt-10">
        <p>
          La corrélation de l'écart entre deux saisons est de {fr(P.corr_delta, 2)}, contre {fr(P.corr_points, 2)}{" "}
          pour les points. <b>La différence de buts est un meilleur indicateur du niveau d'une équipe que son classement.</b>
        </p>
      </Prose>
      <Reveal className="mx-auto mt-10 flex max-w-[640px] flex-wrap gap-3 px-6">
        <Link
          to="/analyses"
          className="rounded-full bg-[#e86f2c] px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#d45f1f]"
        >
          Les 5 analyses complètes
        </Link>
        <Link
          to="/methodologie"
          className="rounded-full border border-current/25 px-6 py-3 text-sm font-bold uppercase tracking-wide transition hover:bg-current/5"
        >
          Comment c'est calculé
        </Link>
      </Reveal>
    </section>
  );
}

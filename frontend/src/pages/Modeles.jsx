import { Section as KitSection, HowTo, ChartCard, ChipGroup } from "../components/layout/PageKit";
import XptsChart from "../components/models/XptsChart";
import { useMemo, useState } from "react";
import PageHero, { HeroStat } from "../components/PageHero";
import LeagueFilter from "../components/story/LeagueFilter";
import PeriodFilter from "../components/story/PeriodFilter";
import EloChart from "../components/models/EloChart";
import { TEAM_COLORS } from "../lib/teamColors";
import MatchPredictor from "../components/models/MatchPredictor";
import SeasonSimulator from "../components/models/SeasonSimulator";
import Crest from "../components/Crest";
import { useTeamLogos } from "../hooks/useTeamLogos";
import { periodSeasons, periodLabel } from "../lib/period";
import { seasonLabel } from "../lib/leagues";
import { fr } from "../components/story/hooks";
import models from "../data/models.json";

const SEASONS = models.elo["Premier League"].season_starts.map((s) => s.season);
const REPO = "https://github.com/habibfl/gambeta/blob/main/analysis";

function Section(props) {
  return <KitSection accent="#8b5cf6" {...props} />;
}

// Calibration : la probabilité annoncée correspond-elle à la fréquence réelle ?
function Calibration({ rows }) {
  const S = 300;
  const p = 36;
  const sc = (v) => p + v * (S - 2 * p);
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[340px] text-[var(--gambeta-ink)]">
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <g key={t}>
          <line x1={sc(0)} x2={sc(1)} y1={S - sc(t)} y2={S - sc(t)} stroke="currentColor" strokeOpacity={0.07} />
          <text x={sc(0) - 6} y={S - sc(t)} dy="0.32em" textAnchor="end" className="fill-current font-mono text-[9px] opacity-50">
            {t * 100}
          </text>
          <text x={sc(t)} y={S - sc(0) + 14} textAnchor="middle" className="fill-current font-mono text-[9px] opacity-50">
            {t * 100}
          </text>
        </g>
      ))}
      <line x1={sc(0)} y1={S - sc(0)} x2={sc(1)} y2={S - sc(1)} stroke="currentColor" strokeOpacity={0.4} strokeDasharray="4 4" />
      <text x={sc(0.62)} y={S - sc(0.52)} className="fill-current text-[9px] opacity-55" transform={`rotate(-45 ${sc(0.62)} ${S - sc(0.52)})`}>
        calibration parfaite
      </text>
      <polyline
        points={rows.map((r) => `${sc(r.predicted)},${S - sc(r.observed)}`).join(" ")}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth={2}
      />
      {rows.map((r) => (
        <circle key={r.bin} cx={sc(r.predicted)} cy={S - sc(r.observed)} r={3 + Math.sqrt(r.n) / 6} fill="#8b5cf6" fillOpacity={0.8} stroke="var(--gambeta-paper)" strokeWidth={1.5}>
          <title>{`Annoncé ${Math.round(r.predicted * 100)} % → arrivé ${Math.round(r.observed * 100)} % (${r.n} matchs)`}</title>
        </circle>
      ))}
      <text x={S / 2} y={S - 4} textAnchor="middle" className="fill-current text-[10px] opacity-60">
        Probabilité annoncée de victoire à domicile (%)
      </text>
      <text transform={`rotate(-90)`} x={-S / 2} y={10} textAnchor="middle" className="fill-current text-[10px] opacity-60">
        Fréquence réelle (%)
      </text>
    </svg>
  );
}

// Page « Modèles » : ce que les 8 900 résultats permettent de PRÉDIRE.
export default function Modeles() {
  const logoFor = useTeamLogos();
  const [xptsSeason, setXptsSeason] = useState("2526");
  const [league, setLeague] = useState("Premier League");
  const [period, setPeriod] = useState({ from: SEASONS[0], to: SEASONS[SEASONS.length - 1] });
  const [picked, setPicked] = useState({});
  const lgElo = models.elo[league];
  const poisson = models.poisson[league];
  const chosen = periodSeasons(SEASONS, period);

  // Période -> plage de jours pour la courbe
  const starts = lgElo.season_starts;
  const fromDay = starts.find((s) => s.season === chosen[0])?.day ?? 0;
  const nextStart = starts.find((s) => s.season > chosen[chosen.length - 1])?.day;
  const lastDay = Math.max(...Object.values(lgElo.teams).map((pts) => pts[pts.length - 1][0]));
  const range = useMemo(() => [fromDay, nextStart ? nextStart - 1 : lastDay], [fromDay, nextStart, lastDay]);

  // Classement Elo en fin de période (clubs présents la dernière saison de la période)
  const ranking = useMemo(() => {
    const endSeasonStart = starts.find((s) => s.season === chosen[chosen.length - 1])?.day ?? 0;
    return Object.entries(lgElo.teams)
      .map(([team, pts]) => {
        const inPeriod = pts.filter(([d]) => d <= range[1]);
        const last = inPeriod[inPeriod.length - 1];
        return last && last[0] >= endSeasonStart ? { team, elo: last[1] } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.elo - a.elo);
  }, [lgElo, range, starts, chosen]);

  const teams = picked[league] ?? ranking.slice(0, 5).map((r) => r.team);
  const toggle = (team) =>
    setPicked((p) => {
      const cur = p[league] ?? ranking.slice(0, 5).map((r) => r.team);
      const next = cur.includes(team) ? cur.filter((t) => t !== team) : [...cur, team].slice(-8);
      return { ...p, [league]: next };
    });

  // Prédicteur : par défaut les deux meilleurs Elo actuels du championnat
  const current = models.elo[league].ranking.map((r) => r.team).filter((t) => poisson.teams[t]);
  const [pair, setPair] = useState({});
  const home = pair[league]?.home ?? current[0];
  const away = pair[league]?.away ?? current[1];
  const setHome = (t) => setPair((p) => ({ ...p, [league]: { home: t, away } }));
  const setAway = (t) => setPair((p) => ({ ...p, [league]: { home, away: t } }));

  // Backtest : saisons test (2024-25, 2025-26) comprises dans la période
  const testSeasons = chosen.filter((s) => ["2425", "2526"].includes(s));
  const btSeason = testSeasons.length === 1 ? testSeasons[0] : "Toutes";
  const bt = models.backtest.filter((b) => b.season === btSeason);
  const poissonBt = bt.find((b) => b.model.startsWith("Poisson"));
  const naiveBt = bt.find((b) => b.model.startsWith("Référence"));
  const upsets = models.upsets.filter((u) => u.league === league);

  const maxLL = Math.max(...bt.map((b) => b.log_loss));
  const gridKs = [...new Set(models.elo_grid.map((g) => g.k))];
  const gridHs = [...new Set(models.elo_grid.map((g) => g.home))];
  const gridMin = Math.min(...models.elo_grid.map((g) => g.brier));
  const gridMax = Math.max(...models.elo_grid.map((g) => g.brier));

  return (
    <>
      <PageHero
        eyebrow="Modèles prédictifs"
        title="Modèles prédictifs"
        subtitle="Trois modèles construits en Python à partir des seuls résultats : un classement Elo, un modèle de Poisson qui prédit le score, et une évaluation sur deux saisons complètes exclues de l'apprentissage."
        accent="#8b5cf6"
      >
        <div className="grid max-w-[720px] grid-cols-2 gap-3 sm:grid-cols-4">
          <HeroStat value={models.matches.toLocaleString("fr-FR")} label="matchs utilisés" />
          <HeroStat value={(models.backtest.find((b) => b.season === "Toutes" && b.model.startsWith("Poisson")).n).toLocaleString("fr-FR")} label="matchs prédits à l'aveugle" />
          <HeroStat value={`${Math.round(models.backtest.find((b) => b.season === "Toutes" && b.model.startsWith("Poisson")).accuracy * 100)} %`} label="bons pronostics" />
          <HeroStat value="10 000" label="saisons simulées à la demande" />
        </div>
      </PageHero>

      <div className="text-[var(--gambeta-ink)]">
        {/* Filtre global de la page */}
        <div className="sticky sticky-under-nav z-30 border-b border-current/10 bg-[var(--gambeta-paper)]/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1100px] flex-col gap-2 px-6 py-3 md:px-12 lg:flex-row lg:items-center lg:justify-between">
            <LeagueFilter value={league} onChange={setLeague} label="Championnat" allowAll={false} />
            <PeriodFilter seasons={SEASONS} value={period} onChange={setPeriod} />
          </div>
        </div>

        <div className="mx-auto max-w-[1100px] px-6 pb-24 md:px-12">
          {/* 1. Elo */}
          <Section
            kicker="Modèle 1 · Elo"
            title={`Qui est vraiment le plus fort ? La force des clubs de ${league}, match après match`}
            intro={
              <p>
                Le classement Elo (inventé pour les échecs) donne une note à chaque club. Après chaque match, le vainqueur
                prend des points au perdant : beaucoup s&apos;il a battu plus fort que lui, peu s&apos;il a battu plus
                faible. Contrairement au classement, il tient compte de <b>qui</b> on a battu et ne repart pas de zéro
                chaque été.
              </p>
            }
          >
            <HowTo>
              une courbe = un club ({periodLabel(period)}). Au-dessus de 1500 : plus fort que la moyenne du championnat.
              Survolez le graphique pour lire les notes à une date. Cliquez les écussons ci-dessous pour ajouter ou
              retirer des clubs (8 maximum).
            </HowTo>
            <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-4 md:p-6">
              <EloChart
                series={lgElo.teams}
                teams={teams}
                range={range}
                seasonStarts={starts}
                baseDate={models.base_date}
                league={league}
                logoFor={logoFor}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {ranking.map((r, i) => {
                const on = teams.includes(r.team);
                return (
                  <button
                    key={r.team}
                    type="button"
                    onClick={() => toggle(r.team)}
                    className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[12px] font-semibold transition ${
                      on ? "border-transparent text-white" : "border-current/15 hover:border-current/40"
                    }`}
                    style={on ? { background: TEAM_COLORS[teams.indexOf(r.team) % TEAM_COLORS.length] } : undefined}
                    title={`${r.team} : ${r.elo} Elo fin ${seasonLabel(chosen[chosen.length - 1])}`}
                  >
                    <Crest team={r.team} league={league} logo={logoFor(r.team)} size={18} sticker />
                    <span className="font-mono text-[10px] opacity-70">{i + 1}</span>
                    {r.team}
                    <span className="font-mono text-[11px] opacity-80">{r.elo}</span>
                  </button>
                );
              })}
            </div>

            {/* Choix des paramètres */}
            <div className="grid grid-cols-1 gap-6 rounded-2xl border border-current/10 bg-current/[0.02] p-5 md:grid-cols-[1fr_1.2fr]">
              <div className="text-[15px] leading-relaxed text-current/80">
                <p className="font-mono text-[11px] uppercase tracking-wide text-[#8b5cf6]">Réglage des paramètres</p>
                <p className="mt-2">
                  Deux réglages : <b>K</b> (de combien la note bouge après un match) et l&apos;<b>avantage du terrain</b>{" "}
                  (points Elo offerts à l&apos;équipe qui reçoit). On a testé {models.elo_grid.length} combinaisons et
                  gardé celle qui se trompe le moins (erreur de Brier la plus basse) :{" "}
                  <b>
                    K = {models.params.elo_k}, terrain = {models.params.elo_home}
                  </b>
                  . Entre deux saisons, chaque note revient d&apos;un tiers vers 1500 (les effectifs changent).
                </p>
              </div>
              <div>
                <div className="grid gap-1" style={{ gridTemplateColumns: `60px repeat(${gridHs.length}, minmax(0,1fr))` }}>
                  <span className="font-mono text-[10px] text-current/50">K \ terrain</span>
                  {gridHs.map((h) => (
                    <span key={h} className="text-center font-mono text-[10px] text-current/50">
                      +{h}
                    </span>
                  ))}
                  {gridKs.map((k) => (
                    <div key={k} className="contents">
                      <span className="flex items-center font-mono text-[11px] text-current/60">K={k}</span>
                      {gridHs.map((h) => {
                        const g = models.elo_grid.find((x) => x.k === k && x.home === h);
                        const t = (g.brier - gridMin) / (gridMax - gridMin || 1);
                        const best = g.brier === gridMin;
                        return (
                          <div
                            key={h}
                            className="rounded py-1.5 text-center font-mono text-[10px]"
                            style={{ background: `rgba(139,92,246,${0.85 - t * 0.75})`, color: t < 0.5 ? "#fff" : undefined, outline: best ? "2px solid var(--gambeta-ink)" : "none" }}
                            title={`K=${k}, terrain=${h} : Brier ${g.brier}`}
                          >
                            {g.brier.toFixed(4).replace("0.", ",")}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-current/50">Erreur de Brier (plus foncé = meilleur). Case encadrée = réglage retenu.</p>
              </div>
            </div>
          </Section>

          {/* 2. Prédicteur */}
          <Section
            kicker="Modèle 2 · Poisson (Dixon-Coles)"
            title="Probabilités d'un match selon le modèle de Poisson"
            intro={
              <p>
                Chaque club reçoit une <b>force d&apos;attaque</b> et une <b>force de défense</b>, estimées sur ses matchs
                récents (un match d&apos;il y a {Math.round(models.params.half_life_days / 30)} mois compte moitié moins).
                Le nombre de buts de chaque équipe suit alors une loi de Poisson ; on en déduit la probabilité de chaque
                score, puis de la victoire, du nul et de la défaite. Forces calculées à la fin de la saison 2025-26.
              </p>
            }
          >
            <MatchPredictor
              model={poisson}
              league={league}
              home={home}
              away={away}
              onHome={setHome}
              onAway={setAway}
              logoFor={logoFor}
            />
            <p className="text-[13px] text-current/60">
              Les forces ne se comparent qu&apos;à l&apos;intérieur d&apos;un championnat (les clubs de deux ligues ne
              se rencontrent pas en championnat) : changez de championnat avec le filtre en haut.
            </p>
          </Section>

          {/* 3. Simulation Monte Carlo */}
          <Section
            kicker="Modèle 3 · Simulation Monte Carlo"
            title="Simulation Monte Carlo de la fin de saison (10 000 tirages)"
            intro={
              <p>
                Choisissez une journée : le modèle ne connaît que les matchs joués avant. Les matchs restants sont tirés au
                sort 10 000 fois avec les forces de Poisson du moment, puis on compte combien de fois chaque club finit
                champion, dans le top 4 ou dans les 3 derniers. La saison étant terminée, le résultat se compare au classement final réel.
              </p>
            }
          >
            {chosen[chosen.length - 1] === SEASONS[0] && (
              <p className="rounded-xl border border-[#8b5cf6]/30 bg-[#8b5cf6]/[0.06] px-4 py-3 text-[14px]">
                {seasonLabel(SEASONS[0])} sert d&apos;historique au modèle (pas de saison avant elle) : la simulation
                démarre en {seasonLabel(SEASONS[1])}.
              </p>
            )}
            <HowTo>
              barres = probabilités sur les 10 000 saisons simulées. La rangée de petites cases montre toutes les places
              possibles, de la 1re à la dernière (plus foncé = plus fréquent) ; la case encadrée est la place réellement
              obtenue. Déplacez le curseur : plus la saison avance, plus le modèle est sûr de lui.
            </HowTo>
            <SeasonSimulator
              key={`${league}-${chosen[chosen.length - 1]}`}
              league={league}
              season={chosen[chosen.length - 1] === SEASONS[0] ? SEASONS[1] : chosen[chosen.length - 1]}
              logoFor={logoFor}
            />
            <p className="text-[12px] text-current/55">
              Simplifications : chaque score est tiré d&apos;une loi de Poisson indépendante, les forces restent fixes
              jusqu&apos;à la fin de saison, et « 3 derniers » ne tient pas compte des barrages propres à chaque ligue.
            </p>
          </Section>

          {/* 4. Évaluation */}
          <Section
            kicker="Évaluation"
            title="Évaluation : comparaison avec une prédiction naïve"
            intro={
              <p>
                Un modèle ne vaut que par ses prédictions sur des matchs <b>qu&apos;il n&apos;a pas vus</b>. On a donc
                rejoué {btSeason === "Toutes" ? "les saisons 2024-25 et 2025-26" : `la saison ${seasonLabel(btSeason)}`}{" "}
                journée par journée : avant chaque journée, le modèle n&apos;apprend que sur les matchs déjà joués, puis
                prédit. On compare à l&apos;Elo et à une référence naïve qui annonce toujours les fréquences habituelles
                (environ 45 % domicile, 25 % nul, 30 % extérieur).
              </p>
            }
          >
            {testSeasons.length === 0 && (
              <p className="rounded-xl border border-[#8b5cf6]/30 bg-[#8b5cf6]/[0.06] px-4 py-3 text-[14px]">
                La période choisie ne contient pas de saison test : on affiche le test sur 2024-25 et 2025-26.
              </p>
            )}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-5">
                <HowTo>
                  la <b>log loss</b> pénalise un modèle qui se trompe avec assurance (plus bas = mieux). La{" "}
                  <b>précision</b> est la part de matchs où l&apos;issue jugée la plus probable s&apos;est produite.
                </HowTo>
                <div className="mt-4 space-y-4">
                  {bt.map((b) => (
                    <div key={b.model}>
                      <div className="flex justify-between text-[13px] font-semibold">
                        <span>{b.model}</span>
                        <span className="font-mono">
                          log loss {fr(b.log_loss, 3)} · {Math.round(b.accuracy * 100)} % justes
                        </span>
                      </div>
                      <div className="mt-1 h-3 overflow-hidden rounded-full bg-current/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(b.log_loss / maxLL) * 100}%`,
                            background: b.model.startsWith("Poisson") ? "#8b5cf6" : b.model === "Elo" ? "#2a6fd6" : "rgba(128,128,128,.5)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {poissonBt && naiveBt && (
                  <p className="mt-5 text-[15px] leading-relaxed">
                    Sur {poissonBt.n.toLocaleString("fr-FR")} matchs, le modèle de Poisson trouve la bonne issue{" "}
                    <b>{Math.round(poissonBt.accuracy * 100)} %</b> du temps, contre {Math.round(naiveBt.accuracy * 100)} %
                    pour la référence naïve. Un sur deux seulement ? Oui : avec si peu de buts par match, le football reste
                    très aléatoire, et même les meilleurs modèles se trompent souvent.
                  </p>
                )}
              </div>
              <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-5">
                <HowTo>
                  chaque point regroupe les matchs où le modèle annonçait une probabilité de victoire à domicile proche
                  (taille = nombre de matchs). Sur la diagonale, le modèle est honnête : quand il dit 40 %, ça arrive
                  40 % du temps.
                </HowTo>
                <div className="mt-3 flex justify-center">
                  <Calibration rows={models.calibration} />
                </div>
              </div>
            </div>

            {/* Surprises */}
            <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-5">
              <p className="font-mono text-[11px] uppercase tracking-wide text-[#8b5cf6]">Les plus grosses surprises · {league}</p>
              <p className="mt-1 text-[14px] text-current/70">
                Les 6 résultats que le modèle jugeait les moins probables avant le match, sur les saisons test
                (2024-25 et 2025-26).
              </p>
              {upsets.length ? (
                <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {upsets.map((u) => (
                    <li key={`${u.season}-${u.week}-${u.home}`} className="flex items-center gap-3 rounded-xl border border-current/10 p-3">
                      <Crest team={u.home} league={league} logo={logoFor(u.home)} size={30} sticker />
                      <span className="font-mono text-lg font-extrabold">
                        {u.score[0]}-{u.score[1]}
                      </span>
                      <Crest team={u.away} league={league} logo={logoFor(u.away)} size={30} sticker />
                      <span className="text-[13px] leading-tight">
                        <b>
                          {u.home} - {u.away}
                        </b>
                        <br />
                        <span className="text-current/60">
                          {seasonLabel(u.season)}, J{u.week} · {u.result} donnée à{" "}
                          <b className="text-[#8b5cf6]">{fr(u.probability * 100, 1)} %</b>
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-[14px] text-current/60">Aucune surprise enregistrée pour ce championnat.</p>
              )}
            </div>
          </Section>

          <Section
            kicker="Points attendus (xPts)"
            title={`${league} ${seasonLabel(xptsSeason)} : points réels et points attendus`}
            intro="Pour chaque match, le modèle de Poisson (ajusté sur les seuls matchs déjà joués) donne la probabilité de victoire, de nul et de défaite. Les points attendus valent 3 × P(victoire) + P(nul), cumulés sur la saison."
            takeaways={[
              `Écart moyen entre points réels et attendus : ${fr(models.xpts_summary.rmse, 1)} points par club et par saison.`,
              `Corrélation de l'écart entre 2024-25 et 2025-26 : ${fr(models.xpts_summary.persistence, 2)} sur ${models.xpts_summary.pairs} clubs. Dépasser les attentes une saison ne prédit rien pour la suivante.`,
            ]}
          >
            <ChipGroup
              label="Saison"
              value={xptsSeason}
              onChange={setXptsSeason}
              options={["2425", "2526"].map((s) => ({ value: s, label: seasonLabel(s) }))}
            />
            <ChartCard>
              <XptsChart rows={models.xpts.filter((x) => x.league === league && x.season === xptsSeason)} league={league} logoFor={logoFor} />
            </ChartCard>
          </Section>

          {/* Méthode */}
          <section className="rounded-2xl border border-current/10 bg-current/[0.02] p-6 text-[15px] leading-relaxed">
            <p className="font-mono text-[11px] uppercase tracking-wide text-[#8b5cf6]">Méthode et code</p>
            <ul className="mt-3 space-y-2">
              <li>
                • Données : {models.matches.toLocaleString("fr-FR")} matchs de saison régulière (FBref), 2021-22 à 2025-26.
              </li>
              <li>
                • Poisson : régression de Poisson pondérée (algorithme IRLS) avec pénalité ridge ({models.params.ridge}) pour
                les promus, et correction de Dixon-Coles sur les petits scores (ρ = {fr(models.params.rho_backtest, 3)}).
              </li>
              <li>• Test « walk-forward » : aucune information du futur n&apos;est utilisée pour prédire une journée.</li>
              <li>
                • Code Python (pandas, numpy) :{" "}
                <a className="font-semibold underline" href={`${REPO}/gambeta_models.py`}>
                  gambeta_models.py
                </a>{" "}
                et{" "}
                <a className="font-semibold underline" href={`${REPO}/export_models.py`}>
                  export_models.py
                </a>
                .
              </li>
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}

import { PageBody, Section, ChartCard } from "../components/layout/PageKit";
import { Link } from "react-router-dom";
import PageHero from "../components/PageHero";
import XgPitch from "../components/explainers/XgPitch";
import { GLOSSARY } from "../lib/glossary";
import insights from "../data/insights.json";

// Page « Méthodologie » : d'où viennent les données, comment elles sont traitées et vérifiées

const PIPELINE = [
  {
    step: "1. Collecte",
    tech: "Python · soccerdata",
    text: "Scraping de FBref (résultats, classements, minutes, tirs, cartons) et d'Understat (xG, xA) pour 5 championnats et 5 saisons. Reprise automatique en cas de blocage.",
  },
  {
    step: "2. Nettoyage",
    tech: "pandas",
    text: "Rapprochement des noms de clubs et de joueurs entre les deux sources, retrait des barrages, contrôles de cohérence.",
  },
  {
    step: "3. Stockage",
    tech: "PostgreSQL · SQLAlchemy",
    text: "6 tables : championnats, clubs, joueurs, stats par saison, classements, matchs.",
  },
  {
    step: "4. API",
    tech: "FastAPI",
    text: "Routes JSON : classements, joueurs, forme récente, évolution du classement, historique multi-saisons.",
  },
  {
    step: "5. Analyse",
    tech: "Jupyter · scikit-learn",
    text: "Notebook reproductible : statistiques descriptives, régression, clustering K-means.",
  },
  {
    step: "6. Visualisation",
    tech: "React · D3.js",
    text: "Ce site : graphiques interactifs, percentiles, comparateur, joueurs similaires.",
  },
];

const CHECKS = [
  "Chaque club a joué le bon nombre de matchs (2 × (nombre de clubs − 1)) : 25 championnats-saisons sur 25.",
  "Les buts des classements correspondent exactement aux buts des matchs (écart : 0).",
  "Les barrages de relégation et matchs d'appui sont exclus des classements : ils faussaient le total du 16e (36 matchs au lieu de 34 en Bundesliga).",
  "Les deux sources orthographient différemment certains joueurs (« Kylian Mbappé » chez FBref, « Kylian Mbappe-Lottin » chez Understat) : rapprochement par club puis par mots du nom. 92 à 97 % des joueurs sont rapprochés selon le championnat ; pour les autres, minutes et tirs viennent d'Understat.",
  "FBref a changé l'orthographe de certains clubs d'une saison à l'autre (« Paris SG » puis « PSG ») : noms unifiés pour garder un historique continu.",
  "Comparaisons « par 90 minutes » limitées aux joueurs ayant joué au moins 450 minutes (900 pour les analyses), pour éviter les moyennes trompeuses sur quelques apparitions.",
];

const LIMITS = [
  "Les xG ne couvrent pour l'instant que la saison 2025-26 : Understat était en maintenance lors de la collecte des saisons précédentes.",
  "Les statistiques de passes (passes progressives) et de possession ne sont pas disponibles via la bibliothèque soccerdata.",
  "Les compétitions européennes (Ligue des champions, Europa League) ne sont pas encore collectées.",
  "Les xG dépendent du modèle d'Understat : un autre fournisseur (Opta, StatsBomb) donnerait des valeurs un peu différentes.",
];

export default function Methodologie() {
  const { counts, seasons } = insights;
  return (
    <>
      <PageHero
        eyebrow="Méthodologie"
        title="Méthodologie"
        subtitle="Provenance des données, traitement, contrôles qualité et limites des statistiques présentées."
      />
      <PageBody>
        <Section
          id="xg"
          kicker="Démonstration"
          title="Le xG, en pratique"
          intro="Le xG (buts attendus) est la probabilité qu'un tir soit transformé, estimée à partir de milliers de tirs comparables. Placez le ballon sur le terrain : plus le tir est lointain ou excentré, plus l'angle se ferme et plus la probabilité baisse."
        >
          <XgPitch />
        </Section>

        <Section kicker="Données" title="Sources">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ChartCard title="FBref">
              <p className="text-sm text-current/65">
                Résultats de tous les matchs, classements, minutes, tirs, tacles, interceptions, cartons. {seasons.length} saisons
                (2021-22 à 2025-26), {counts.matches.toLocaleString("fr-FR")} matchs.
              </p>
            </ChartCard>
            <ChartCard title="Understat">
              <p className="text-sm text-current/65">
                xG, xA, npxG, xGChain et xGBuildup de chaque joueur. Saison 2025-26 : {counts.players_2526.toLocaleString("fr-FR")}{" "}
                joueurs.
              </p>
            </ChartCard>
          </div>
          <p className="text-xs text-current/50">
            Données collectées à des fins d&apos;étude, sans usage commercial, via la bibliothèque open source soccerdata.
          </p>
        </Section>

        <Section kicker="Traitement" title="De la collecte au site">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PIPELINE.map((p) => (
              <div key={p.step} className="rounded-2xl border border-current/10 bg-current/[0.02] p-5">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#e86f2c]">{p.step}</p>
                <p className="mt-1 text-sm font-semibold">{p.tech}</p>
                <p className="mt-2 text-sm text-current/65">{p.text}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section kicker="Qualité" title="Contrôles et limites">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ChartCard title="Contrôles effectués">
              <ul className="space-y-3">
                {CHECKS.map((c) => (
                  <li key={c} className="flex gap-3 text-[14px] leading-relaxed">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2f6f4f]" aria-hidden />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </ChartCard>
            <ChartCard title="Limites connues">
              <ul className="space-y-3">
                {LIMITS.map((l) => (
                  <li key={l} className="flex gap-3 text-[14px] leading-relaxed">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#e86f2c]" aria-hidden />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </ChartCard>
          </div>
        </Section>

        <Section id="glossaire" kicker="Référence" title="Glossaire" intro="Sur tout le site, les termes soulignés en pointillés affichent leur définition au survol.">
          <dl className="divide-y divide-current/10 rounded-2xl border border-current/10">
            {Object.entries(GLOSSARY).map(([id, g]) => (
              <div key={id} className="grid gap-1 p-5 md:grid-cols-[200px_1fr] md:gap-6">
                <dt className="font-semibold">{g.term}</dt>
                <dd className="text-sm text-current/70">
                  {g.long}
                  {g.example && <span className="mt-2 block italic text-current/55">Exemple : {g.example}</span>}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-current/60">
            Résultats détaillés sur la page{" "}
            <Link to="/analyses" className="font-semibold underline decoration-current/30 underline-offset-4">
              Analyses
            </Link>
            . Code source et notebooks :{" "}
            <a href="https://github.com/habibfl/gambeta" className="font-semibold underline decoration-current/30 underline-offset-4">
              github.com/habibfl/gambeta
            </a>
            .
          </p>
        </Section>
      </PageBody>
    </>
  );
}

// Registre central : associe chaque championnat (identifié par son slug,
// le même que celui utilisé dans les routes /championnats/:id et dans
// Navbar.jsx) à la configuration attendue par LeagueOverview.jsx (texte
// d'intro + les 5 Cases) et par PlayerJars.jsx (titre + joueurs xG/xA).
// C'est le fichier de config par championnat demandé : LeagueOverview
// reste générique, et toute la matière (textes, données, graphiques)
// est assemblée ici, un peu comme pour PlayerJars où les props sont
// préparées par l'appelant plutôt que codées en dur dans le composant.
import {
  StandingsTable,
  LollipopChart,
  HorizontalBarChart,
  ScatterPlot,
  RankLineChart,
} from "../components/charts/PremierLeagueCharts";

import * as premierLeague from "./premierLeagueProvisional";
import * as ligue1 from "./ligue1Provisional";
import * as laLiga from "./laLigaProvisional";
import * as serieA from "./serieAProvisional";
import * as bundesliga from "./bundesligaProvisional";

// Construit les 5 Cases (mêmes 5 thèmes pour tous les championnats :
// classement, xG buteurs, xA passeurs, style de jeu possession/PPDA,
// évolution du classement) à partir des données brutes d'un championnat
// et des 5 textes qui lui sont propres.
function buildCases(data, texts) {
  return [
    { title: "Le classement de la saison", text: texts.standings, Chart: StandingsTable, data: data.STANDINGS },
    { title: "Qui marque vraiment plus que prévu ?", text: texts.xg, Chart: LollipopChart, data: data.XG_SCORERS },
    { title: "Les passeurs qui changent tout", text: texts.xa, Chart: HorizontalBarChart, data: data.XA_CREATORS },
    { title: "L'intensité, ça se mesure aussi", text: texts.style, Chart: ScatterPlot, data: data.POSSESSION_VS_PPDA },
    { title: "Une saison qui se dessine", text: texts.evolution, Chart: RankLineChart, data: data.RANK_EVOLUTION },
  ];
}

export const LEAGUE_OVERVIEWS = {
  "premier-league": {
    eyebrow: "Premier League",
    title: "Anatomie d'une saison de Premier League",
    intro:
      "Vingt clubs, quarante journées de bataille, et une donnée qui raconte souvent une autre histoire que le tableau de classement. Chaque week-end apporte son lot de surprises, de séries qui s'étirent et de certitudes qui s'effondrent. Voici cinq façons de lire cette saison de Premier League au-delà du simple résultat du dimanche soir.",
    cases: buildCases(premierLeague, {
      standings:
        "Un classement ne dit jamais tout d'une saison. Il capture un instant, la somme de vingt journées de résultats, sans distinguer la performance solide de la simple réussite passagère. Mais à ce stade de l'exercice, les tendances commencent à se dessiner clairement : certains clubs tiennent un rythme de champion, d'autres découvrent déjà la difficulté de la lutte pour le maintien. Voici où en est chaque équipe, journée après journée.",
      xg:
        "Il y a les renards des surfaces qui transforment la moindre occasion en but, et ceux qui ont simplement besoin d'en avoir beaucoup pour approcher le même total. Le xG, ou buts attendus, mesure la qualité des occasions générées par un joueur, indépendamment du résultat final au tableau d'affichage. Un attaquant dont les buts réels dépassent largement son xG traverse une période de réussite qui ne dure généralement pas. À l'inverse, celui qui reste en dessous de son xG finit souvent par rattraper son retard sur la durée d'une saison.",
      xa:
        "Certains buts se célèbrent à deux, voire à trois. Le xA, ou passes décisives attendues, rend justice à ceux qui construisent l'occasion, la dernière passe, le décalage dans le dos de la défense, sans jamais apparaître au tableau d'affichage à la fin du match. C'est souvent dans ce classement que se cachent les vrais chefs d'orchestre d'une équipe, ceux que l'œil du néophyte repère moins facilement qu'un buteur. Ce sont eux qui, saison après saison, rendent leurs coéquipiers meilleurs.",
      style:
        "Deux philosophies s'affrontent chaque week-end sur les pelouses anglaises. D'un côté, la possession patiente, le ballon qui circule de pied en pied jusqu'à trouver la faille. De l'autre, le pressing intense, la volonté d'étrangler l'adversaire dès la perte de balle, sans lui laisser le temps de respirer. Le PPDA, qui mesure le nombre de passes adverses autorisées avant une intervention défensive, distingue clairement ces deux écoles de pensée. Aucune des deux approches n'est intrinsèquement supérieure, mais toutes les deux laissent une empreinte statistique très reconnaissable.",
      evolution:
        "Un tableau flatteur en septembre ne garantit absolument rien en mai. Le football anglais a vu trop de départs canon se transformer en saisons décevantes, et trop de débuts poussifs déboucher sur une fin de parcours triomphante. Voici comment les trajectoires de plusieurs équipes se sont vraiment dessinées, journée après journée, avec leurs accélérations, leurs passages à vide et leurs remontées parfois spectaculaires. C'est dans cette dynamique, plus que dans l'instantané du classement, que se lit la vraie force d'un collectif.",
    }),
    playerJars: {
      title: "Les références de la Premier League",
      playersXG: premierLeague.PLAYERS_XG,
      playersXA: premierLeague.PLAYERS_XA,
    },
  },

  "ligue-1": {
    eyebrow: "Ligue 1",
    title: "Anatomie d'une saison de Ligue 1",
    intro:
      "Dix-huit clubs, trente-quatre journées, et un championnat qui reste avant tout un formidable laboratoire à talents. Chaque saison, de jeunes joueurs éclosent sur les pelouses françaises avant de partir briller ailleurs en Europe, pendant qu'un club continue d'écraser la concurrence de la tête et des épaules. Voici cinq façons de lire cette saison de Ligue 1 au-delà du seul duel entre le Paris Saint-Germain et le reste du championnat.",
    cases: buildCases(ligue1, {
      standings:
        "Un classement de Ligue 1 raconte rarement une seule histoire. Il y a le PSG, qui évolue trop souvent dans une compétition à part, et il y a les dix-sept autres clubs qui se disputent le reste du podium, l'Europe et le maintien avec une intensité redoutable. Cette bataille pour la deuxième place, ou pour éviter la relégation, révèle davantage sur l'état réel du championnat que la position du leader. Voici où en est chaque équipe, journée après journée.",
      xg:
        "La Ligue 1 a une réputation bien méritée de pépinière à attaquants, et le championnat continue de révéler des buteurs qui partiront ensuite s'illustrer dans les plus grands clubs européens. Le xG, ou buts attendus, permet de distinguer le jeune talent réellement prometteur du simple feu de paille d'une poignée de journées. Un attaquant qui dépasse largement son xG sur la durée confirme une vraie qualité de finition, rare à cet âge. À l'inverse, celui qui reste en dessous mérite d'être surveillé avant de lui coller une étiquette trop hâtive.",
      xa:
        "Derrière chaque buteur formé en Ligue 1 se cache souvent un passeur tout aussi précoce, capable de lire le jeu avant même d'avoir vingt ans. Le xA, ou passes décisives attendues, met en lumière ces jeunes créateurs qui construisent le danger sans forcément conclure eux-mêmes. Ce sont ces profils que les recruteurs européens suivent de très près, bien avant que le grand public ne les découvre. Un championnat qui forme autant de passeurs que de buteurs a toutes les raisons d'être fier de son travail de formation.",
      style:
        "Face au PSG et à ses moyens financiers hors normes, la plupart des clubs de Ligue 1 ont dû trouver d'autres armes pour exister collectivement. Certains misent sur une possession patiente pour économiser leur énergie, d'autres préfèrent un pressing haut et agressif pour perturber des adversaires souvent mieux dotés individuellement. Le PPDA, qui mesure le nombre de passes adverses autorisées avant une intervention défensive, révèle ces choix tactiques assumés par nécessité autant que par conviction. C'est souvent dans cette adaptation permanente que se joue la survie sportive d'un promu ou d'un petit budget.",
      evolution:
        "Le classement de Ligue 1 en fin de saison ne reflète jamais fidèlement le scénario qui s'est joué sur trente-quatre journées. Des clubs modestes tiennent parfois un rythme européen pendant plusieurs mois avant de s'écrouler sur la fin, pendant que d'autres progressent lentement mais sûrement après un départ poussif. Voici comment les trajectoires de plusieurs équipes se sont vraiment dessinées, journée après journée, loin de la razzia habituelle du club parisien en tête. C'est dans cette dynamique que se lit la vraie histoire d'une saison de Ligue 1.",
    }),
    playerJars: {
      title: "Les références de la Ligue 1",
      playersXG: ligue1.PLAYERS_XG,
      playersXA: ligue1.PLAYERS_XA,
    },
  },

  liga: {
    eyebrow: "La Liga",
    title: "Anatomie d'une saison de Liga",
    intro:
      "Vingt clubs se disputent le championnat espagnol, mais l'histoire de la Liga se résume trop souvent à un seul duel qui dépasse le simple cadre sportif. Real Madrid et Barcelone occupent l'essentiel de l'attention, portés par un style de jeu technique et une maîtrise du ballon reconnues dans toute l'Europe. Voici cinq façons de lire cette saison de Liga au-delà de la seule rivalité entre les deux géants espagnols.",
    cases: buildCases(laLiga, {
      standings:
        "En Liga, le classement se lit souvent à travers un seul prisme : l'écart entre le Real Madrid et le FC Barcelone, et la distance qui sépare le reste du championnat de ce duo historique. Cette saison ne fait pas exception, même si d'autres clubs tentent de s'inviter durablement dans la conversation pour l'Europe. La lutte pour le maintien, elle, se joue dans une indifférence relative alors qu'elle concentre pourtant une intensité redoutable. Voici où en est chaque équipe, journée après journée.",
      xg:
        "Le Clásico n'oppose pas seulement deux clubs, il oppose aussi deux conceptions de l'efficacité offensive portées par des attaquants de classe mondiale. Le xG, ou buts attendus, mesure la qualité des occasions générées indépendamment du talent pur de finition qui distingue les plus grands buteurs espagnols. Un joueur qui dépasse nettement son xG traverse une période de forme rare, quand celui qui reste en dessous rappelle que même les meilleurs connaissent des passages plus discrets. Cette donnée permet de lire la vraie razzia offensive derrière les gros titres.",
      xa:
        "Le style espagnol repose depuis toujours sur la construction patiente et la dernière passe précise plutôt que sur la simple percussion individuelle. Le xA, ou passes décisives attendues, rend justice à ces milieux et ailiers qui orchestrent le jeu sans toujours terminer l'action eux-mêmes. C'est dans ce classement que se distinguent les vrais métronomes de la Liga, ceux dont la vision de jeu fait basculer un match sans forcément apparaître au tableau des buteurs. Le football espagnol a toujours valorisé ce type de profil, et les chiffres lui donnent aujourd'hui raison.",
      style:
        "La possession de balle reste une signature du football espagnol, héritée d'une tradition tactique qui a longtemps dominé le continent. Pourtant, certains clubs de Liga ont adopté une philosophie radicalement différente, privilégiant un pressing haut et intense plutôt que la patience technique habituelle. Le PPDA, qui mesure le nombre de passes adverses autorisées avant une intervention défensive, révèle ce contraste de styles à l'intérieur même du championnat. Real Madrid et Barcelone dominent logiquement la possession, mais leur intensité défensive raconte une histoire tout aussi intéressante.",
      evolution:
        "Une saison de Liga se construit rarement en ligne droite, même pour les cadors historiques du championnat. Certains clubs enchaînent les séries impressionnantes avant de connaître un passage à vide inattendu, pendant que d'autres progressent discrètement loin des projecteurs braqués sur Madrid et Barcelone. Voici comment les trajectoires de plusieurs équipes se sont vraiment dessinées, journée après journée, avec leurs accélérations et leurs coups de moins bien. C'est dans cette dynamique que se comprend vraiment la hiérarchie du football espagnol.",
    }),
    playerJars: {
      title: "Les références de la Liga",
      playersXG: laLiga.PLAYERS_XG,
      playersXA: laLiga.PLAYERS_XA,
    },
  },

  "serie-a": {
    eyebrow: "Serie A",
    title: "Anatomie d'une saison de Serie A",
    intro:
      "Vingt clubs, et un championnat qui reste fidèle à sa réputation de laboratoire tactique le plus exigeant d'Europe. Le calcio a bâti son identité sur l'organisation défensive, la lecture du jeu et une culture tactique transmise de génération en génération d'entraîneurs. Voici cinq façons de lire cette saison de Serie A au-delà du simple résultat du week-end.",
    cases: buildCases(serieA, {
      standings:
        "Le classement italien récompense rarement l'équipe la plus spectaculaire, il récompense généralement celle qui maîtrise le mieux les fondamentaux défensifs chers au calcio. Cette rigueur tactique historique continue de façonner la hiérarchie de la Serie A, où un match se gagne souvent sur un détail plutôt que sur une avalanche de buts. Certains clubs tiennent un rythme de champion grâce à cette solidité, quand d'autres découvrent la difficulté de rivaliser sans une organisation défensive irréprochable. Voici où en est chaque équipe, journée après journée.",
      xg:
        "Marquer en Serie A n'a jamais été une évidence, tant les défenses italiennes restent réputées pour leur discipline collective et leur sens du placement. Le xG, ou buts attendus, mesure la qualité des occasions générées par un attaquant face à des arrière-gardes qui concèdent traditionnellement moins d'espace qu'ailleurs en Europe. Un buteur qui dépasse largement son xG dans ce contexte particulier confirme une classe rare, capable de transformer le peu qu'on lui offre. Cette donnée prend donc un relief particulier dans un championnat aussi tactiquement verrouillé que celui-ci.",
      xa:
        "La tradition italienne a longtemps privilégié le collectif et la construction patiente sur la fulgurance individuelle, un héritage tactique encore visible aujourd'hui. Le xA, ou passes décisives attendues, identifie les joueurs capables de briser des blocs compacts avec une passe décisive plutôt qu'un débordement spectaculaire. Ce sont souvent ces créateurs discrets, formés dans la culture tactique du calcio, qui font la différence dans les matchs les plus fermés. Leur influence dépasse largement ce que leur seule statistique de buts marqués pourrait laisser penser.",
      style:
        "Le calcio a longtemps été associé au catenaccio et à un football prudent, mais cette image ne raconte plus toute la vérité du championnat actuel. Certaines équipes italiennes ont adopté un pressing haut et agressif à l'anglo-saxonne, tandis que d'autres restent fidèles à une approche plus posée et patiente sur le ballon. Le PPDA, qui mesure le nombre de passes adverses autorisées avant une intervention défensive, révèle cette diversité tactique désormais bien réelle en Serie A. La tradition défensive italienne se réinvente sans jamais totalement disparaître.",
      evolution:
        "Une saison de Serie A se joue souvent sur des détails tactiques accumulés semaine après semaine, plutôt que sur des séries de résultats spectaculaires. Certains clubs progressent lentement en resserrant leur discipline collective, quand d'autres régressent après avoir perdu leur équilibre défensif historique. Voici comment les trajectoires de plusieurs équipes se sont vraiment dessinées, journée après journée, dans un championnat où chaque point se mérite âprement. C'est dans cette rigueur constante, plus que dans l'éclat ponctuel, que se lit la vraie force d'un collectif italien.",
    }),
    playerJars: {
      title: "Les références de la Serie A",
      playersXG: serieA.PLAYERS_XG,
      playersXA: serieA.PLAYERS_XA,
    },
  },

  bundesliga: {
    eyebrow: "Bundesliga",
    title: "Anatomie d'une saison de Bundesliga",
    intro:
      "Dix-huit clubs, et un championnat qui a bâti sa réputation européenne sur l'intensité physique et un pressing collectif redoutable. Le football allemand privilégie la vitesse d'exécution et la récupération immédiate du ballon, une philosophie qui se lit directement dans les statistiques défensives. Voici cinq façons de lire cette saison de Bundesliga au-delà du simple résultat du samedi après-midi.",
    cases: buildCases(bundesliga, {
      standings:
        "Le classement de la Bundesliga reflète généralement la capacité d'un club à tenir physiquement sur l'ensemble d'une saison exigeante, plutôt qu'un simple talent individuel. Cette intensité constante, week-end après week-end, épuise souvent les effectifs les moins préparés et récompense ceux qui ont investi dans la préparation athlétique. Certains clubs tiennent un rythme de champion grâce à cette rigueur physique, d'autres s'effondrent progressivement sous l'accumulation de la fatigue. Voici où en est chaque équipe, journée après journée.",
      xg:
        "Marquer en Bundesliga demande souvent de survivre à un pressing adverse permanent avant même de pouvoir viser le but. Le xG, ou buts attendus, mesure la qualité des occasions générées dans un championnat où l'espace se gagne à la vitesse d'exécution plutôt qu'à la patience technique. Un attaquant qui dépasse largement son xG confirme une capacité rare à punir l'adversaire dans un jeu rapide et vertical. À l'inverse, celui qui reste en dessous de son xG paie parfois le prix d'un rythme de jeu que même les meilleurs finisseurs peinent à digérer.",
      xa:
        "L'intensité du jeu allemand impose aux créateurs une vitesse de décision rarement exigée ailleurs en Europe, sous peine de perdre le ballon immédiatement. Le xA, ou passes décisives attendues, identifie ceux qui parviennent malgré tout à trouver la faille dans des transitions ultra rapides et un pressing adverse constant. Ce sont ces joueurs, capables de lire le jeu en une fraction de seconde, qui rendent le football allemand aussi spectaculaire à suivre. Leur influence sur le collectif dépasse largement leur seule ligne statistique de passes décisives.",
      style:
        "S'il y a bien un championnat où le pressing est devenu une religion collective, c'est la Bundesliga, où l'intensité défensive dès la perte de balle fait figure de marque de fabrique. Le PPDA, qui mesure le nombre de passes adverses autorisées avant une intervention défensive, place logiquement plusieurs clubs allemands parmi les références européennes de ce style. Cette philosophie physique, héritée d'une longue tradition d'entraîneurs obsédés par la récupération immédiate, façonne l'identité même du football allemand. Elle explique aussi pourquoi les matchs de Bundesliga comptent souvent parmi les plus intenses à suivre du continent.",
      evolution:
        "L'intensité physique exigée par la Bundesliga rend les trajectoires de saison particulièrement instables, un passage à vide sur le plan athlétique se payant immédiatement au classement. Certains clubs démarrent sur les chapeaux de roue avant de s'essouffler sur la deuxième moitié de saison, pendant que d'autres montent progressivement en puissance grâce à une meilleure gestion physique. Voici comment les trajectoires de plusieurs équipes se sont vraiment dessinées, journée après journée, avec leurs coups d'accélérateur et leurs passages à vide. C'est dans cette gestion de l'intensité, plus que dans le talent individuel, que se joue une bonne partie du championnat allemand.",
    }),
    playerJars: {
      title: "Les références de la Bundesliga",
      playersXG: bundesliga.PLAYERS_XG,
      playersXA: bundesliga.PLAYERS_XA,
    },
  },
};

// Données provisoires pour la page Bundesliga, même structure que
// premierLeagueProvisional.js. Les clubs et joueurs sont réels et
// plausibles pour ce championnat ; les valeurs chiffrées sont en
// revanche entièrement inventées en attendant un vrai branchement
// sur l'API (ou une source type FBref).

// TODO : remplacer par le vrai classement Bundesliga (API-Football ou
// scraping FBref). 18 équipes, 17 journées jouées (mi-saison).
export const STANDINGS = [
  { rank: 1, team: "Bayer Leverkusen", gp: 17, w: 15, d: 2, l: 0, gf: 44, ga: 10 },
  { rank: 2, team: "Bayern Munich", gp: 17, w: 12, d: 3, l: 2, gf: 48, ga: 18 },
  { rank: 3, team: "VfB Stuttgart", gp: 17, w: 11, d: 3, l: 3, gf: 38, ga: 20 },
  { rank: 4, team: "RB Leipzig", gp: 17, w: 10, d: 4, l: 3, gf: 33, ga: 18 },
  { rank: 5, team: "Borussia Dortmund", gp: 17, w: 9, d: 5, l: 3, gf: 30, ga: 20 },
  { rank: 6, team: "Eintracht Francfort", gp: 17, w: 8, d: 6, l: 3, gf: 26, ga: 18 },
  { rank: 7, team: "Union Berlin", gp: 17, w: 7, d: 6, l: 4, gf: 20, ga: 17 },
  { rank: 8, team: "Werder Brême", gp: 17, w: 7, d: 5, l: 5, gf: 24, ga: 22 },
  { rank: 9, team: "SC Fribourg", gp: 17, w: 6, d: 7, l: 4, gf: 22, ga: 19 },
  { rank: 10, team: "Borussia Mönchengladbach", gp: 17, w: 6, d: 6, l: 5, gf: 23, ga: 24 },
  { rank: 11, team: "Hoffenheim", gp: 17, w: 6, d: 5, l: 6, gf: 25, ga: 27 },
  { rank: 12, team: "Mayence", gp: 17, w: 5, d: 6, l: 6, gf: 17, ga: 22 },
  { rank: 13, team: "FC Augsbourg", gp: 17, w: 5, d: 5, l: 7, gf: 19, ga: 26 },
  { rank: 14, team: "Wolfsburg", gp: 17, w: 4, d: 7, l: 6, gf: 18, ga: 24 },
  { rank: 15, team: "FC Cologne", gp: 17, w: 4, d: 5, l: 8, gf: 15, ga: 25 },
  { rank: 16, team: "VfL Bochum", gp: 17, w: 3, d: 6, l: 8, gf: 16, ga: 29 },
  { rank: 17, team: "Heidenheim", gp: 17, w: 3, d: 5, l: 9, gf: 14, ga: 28 },
  { rank: 18, team: "Darmstadt", gp: 17, w: 1, d: 4, l: 12, gf: 10, ga: 35 },
].map((row) => ({ ...row, pts: row.w * 3 + row.d }));

// TODO : croiser avec les vraies statistiques xG (Understat / FBref)
// une fois la source de données définitive choisie.
// `team` (nom identique à celui utilisé dans STANDINGS) permet à la page
// Équipe de retrouver les joueurs clés d'un club sans dupliquer la donnée.
export const XG_SCORERS = [
  { player: "Harry Kane", team: "Bayern Munich", xg: 16.5, goals: 20 },
  { player: "Serhou Guirassy", team: "VfB Stuttgart", xg: 13.0, goals: 17 },
  { player: "Loïs Openda", team: "RB Leipzig", xg: 11.5, goals: 13 },
  { player: "Victor Boniface", team: "Bayer Leverkusen", xg: 9.8, goals: 11 },
  { player: "Deniz Undav", team: "VfB Stuttgart", xg: 7.0, goals: 9 },
  { player: "Niclas Füllkrug", team: "Borussia Dortmund", xg: 8.5, goals: 8 },
  { player: "Marvin Ducksch", team: "Werder Brême", xg: 7.2, goals: 6 },
  { player: "Jonathan Burkardt", team: "Mayence", xg: 6.8, goals: 7 },
  { player: "Kevin Behrens", team: "Union Berlin", xg: 6.0, goals: 5 },
];

// TODO : idem, source xA à confirmer.
export const XA_CREATORS = [
  { player: "Florian Wirtz", team: "Bayer Leverkusen", xa: 8.5 },
  { player: "Jamal Musiala", team: "Bayern Munich", xa: 7.9 },
  { player: "Xavi Simons", team: "RB Leipzig", xa: 7.2 },
  { player: "Alejandro Grimaldo", team: "Bayer Leverkusen", xa: 6.6 },
  { player: "Angeliño", team: "RB Leipzig", xa: 5.5 },
  { player: "Julian Brandt", team: "Borussia Dortmund", xa: 5.2 },
  { player: "Robin Gosens", team: "Union Berlin", xa: 4.8 },
  { player: "Ritsu Doan", team: "SC Fribourg", xa: 4.5 },
  { player: "Waldemar Anton", team: "VfB Stuttgart", xa: 4.0 },
];

// TODO : possession moyenne et PPDA réels par équipe (source à définir).
export const POSSESSION_VS_PPDA = [
  { team: "Bayer Leverkusen", possession: 58, ppda: 6.8 },
  { team: "Bayern Munich", possession: 62, ppda: 7.5 },
  { team: "VfB Stuttgart", possession: 54, ppda: 8.5 },
  { team: "RB Leipzig", possession: 55, ppda: 6.5 },
  { team: "Borussia Dortmund", possession: 53, ppda: 8.0 },
  { team: "Eintracht Francfort", possession: 50, ppda: 9.0 },
  { team: "Union Berlin", possession: 45, ppda: 9.5 },
  { team: "Werder Brême", possession: 46, ppda: 11.0 },
  { team: "SC Fribourg", possession: 48, ppda: 8.8 },
  { team: "Borussia Mönchengladbach", possession: 49, ppda: 9.8 },
  { team: "Hoffenheim", possession: 51, ppda: 9.2 },
  { team: "Mayence", possession: 44, ppda: 10.5 },
  { team: "FC Augsbourg", possession: 42, ppda: 11.5 },
  { team: "Wolfsburg", possession: 47, ppda: 10.2 },
  { team: "FC Cologne", possession: 41, ppda: 12.0 },
  { team: "VfL Bochum", possession: 40, ppda: 12.5 },
  { team: "Heidenheim", possession: 39, ppda: 13.0 },
  { team: "Darmstadt", possession: 38, ppda: 14.0 },
];

// TODO : graphique en lignes à réaliser en D3.js une fois l'historique
// journée par journée disponible (source FBref). Un tableau de positions,
// une valeur par journée jouée.
export const RANK_EVOLUTION = [
  { team: "Bayer Leverkusen", ranks: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { team: "Bayern Munich", ranks: [2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
  { team: "VfB Stuttgart", ranks: [5, 4, 4, 3, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3] },
  { team: "RB Leipzig", ranks: [3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4] },
  { team: "Borussia Dortmund", ranks: [7, 6, 5, 5, 5, 5, 6, 5, 5, 5, 5, 5, 5, 5, 4, 5, 5] },
];

// Repris dans PlayerJars.jsx pour la variante Bundesliga (mêmes joueurs
// que les Cases 2 et 3 ci-dessus, pour rester cohérent).
export const PLAYERS_XG = XG_SCORERS.map(({ player }) => ({
  name: player,
  initials: player
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase(),
}));

export const PLAYERS_XA = XA_CREATORS.map(({ player }) => ({
  name: player,
  initials: player
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase(),
}));

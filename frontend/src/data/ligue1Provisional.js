// Données provisoires pour la page Ligue 1, même structure que
// premierLeagueProvisional.js. Les clubs et joueurs sont réels et
// plausibles pour ce championnat ; les valeurs chiffrées sont en
// revanche entièrement inventées en attendant un vrai branchement
// sur l'API (ou une source type FBref).

// TODO : remplacer par le vrai classement Ligue 1 (API-Football ou
// scraping FBref). 18 équipes, 17 journées jouées (mi-saison).
export const STANDINGS = [
  { rank: 1, team: "PSG", gp: 17, w: 14, d: 2, l: 1, gf: 45, ga: 12 },
  { rank: 2, team: "Monaco", gp: 17, w: 11, d: 3, l: 3, gf: 34, ga: 20 },
  { rank: 3, team: "Marseille", gp: 17, w: 10, d: 4, l: 3, gf: 30, ga: 18 },
  { rank: 4, team: "Lille", gp: 17, w: 9, d: 5, l: 3, gf: 28, ga: 17 },
  { rank: 5, team: "Lyon", gp: 17, w: 9, d: 4, l: 4, gf: 29, ga: 22 },
  { rank: 6, team: "Nice", gp: 17, w: 8, d: 6, l: 3, gf: 24, ga: 16 },
  { rank: 7, team: "Rennes", gp: 17, w: 8, d: 5, l: 4, gf: 27, ga: 21 },
  { rank: 8, team: "Lens", gp: 17, w: 7, d: 6, l: 4, gf: 25, ga: 20 },
  { rank: 9, team: "Strasbourg", gp: 17, w: 7, d: 5, l: 5, gf: 22, ga: 20 },
  { rank: 10, team: "Toulouse", gp: 17, w: 6, d: 6, l: 5, gf: 20, ga: 22 },
  { rank: 11, team: "Nantes", gp: 17, w: 6, d: 5, l: 6, gf: 19, ga: 23 },
  { rank: 12, team: "Reims", gp: 17, w: 5, d: 6, l: 6, gf: 18, ga: 22 },
  { rank: 13, team: "Montpellier", gp: 17, w: 5, d: 5, l: 7, gf: 21, ga: 28 },
  { rank: 14, team: "Brest", gp: 17, w: 5, d: 4, l: 8, gf: 19, ga: 26 },
  { rank: 15, team: "Le Havre", gp: 17, w: 4, d: 5, l: 8, gf: 15, ga: 25 },
  { rank: 16, team: "Metz", gp: 17, w: 3, d: 6, l: 8, gf: 14, ga: 27 },
  { rank: 17, team: "Clermont", gp: 17, w: 3, d: 4, l: 10, gf: 13, ga: 30 },
  { rank: 18, team: "Angers", gp: 17, w: 2, d: 4, l: 11, gf: 12, ga: 33 },
].map((row) => ({ ...row, pts: row.w * 3 + row.d }));

// TODO : croiser avec les vraies statistiques xG (Understat / FBref)
// une fois la source de données définitive choisie.
export const XG_SCORERS = [
  { player: "Jonathan David", xg: 11.0, goals: 13 },
  { player: "Bradley Barcola", xg: 9.5, goals: 12 },
  { player: "Alexandre Lacazette", xg: 10.8, goals: 11 },
  { player: "Wissam Ben Yedder", xg: 8.2, goals: 10 },
  { player: "Mason Greenwood", xg: 8.5, goals: 9 },
  { player: "Folarin Balogun", xg: 7.9, goals: 9 },
  { player: "Terem Moffi", xg: 9.1, goals: 8 },
  { player: "Arnaud Kalimuendo", xg: 7.0, goals: 7 },
  { player: "Habib Diallo", xg: 6.5, goals: 6 },
];

// TODO : idem, source xA à confirmer.
export const XA_CREATORS = [
  { player: "Ousmane Dembélé", xa: 7.8 },
  { player: "Vitinha", xa: 6.9 },
  { player: "Rayan Cherki", xa: 6.5 },
  { player: "Malick Fofana", xa: 5.9 },
  { player: "Eliesse Ben Seghir", xa: 5.7 },
  { player: "Amine Gouiri", xa: 5.3 },
  { player: "Edon Zhegrova", xa: 5.0 },
  { player: "Habib Diarra", xa: 4.6 },
  { player: "Wissam Ben Yedder", xa: 4.2 },
];

// TODO : possession moyenne et PPDA réels par équipe (source à définir).
export const POSSESSION_VS_PPDA = [
  { team: "PSG", possession: 64, ppda: 8.0 },
  { team: "Monaco", possession: 56, ppda: 9.0 },
  { team: "Marseille", possession: 55, ppda: 9.5 },
  { team: "Lille", possession: 52, ppda: 8.7 },
  { team: "Lyon", possession: 54, ppda: 10.2 },
  { team: "Nice", possession: 50, ppda: 9.8 },
  { team: "Rennes", possession: 51, ppda: 10.5 },
  { team: "Lens", possession: 47, ppda: 8.9 },
  { team: "Strasbourg", possession: 46, ppda: 11.0 },
  { team: "Toulouse", possession: 53, ppda: 12.5 },
  { team: "Nantes", possession: 45, ppda: 11.8 },
  { team: "Reims", possession: 44, ppda: 12.0 },
  { team: "Montpellier", possession: 48, ppda: 13.5 },
  { team: "Brest", possession: 43, ppda: 10.8 },
  { team: "Le Havre", possession: 41, ppda: 13.0 },
  { team: "Metz", possession: 42, ppda: 14.2 },
  { team: "Clermont", possession: 40, ppda: 14.8 },
  { team: "Angers", possession: 39, ppda: 15.5 },
];

// TODO : graphique en lignes à réaliser en D3.js une fois l'historique
// journée par journée disponible (source FBref). Un tableau de positions,
// une valeur par journée jouée.
export const RANK_EVOLUTION = [
  { team: "PSG", ranks: [2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { team: "Monaco", ranks: [3, 3, 2, 2, 3, 3, 2, 2, 3, 2, 2, 3, 2, 2, 2, 2, 2] },
  { team: "Marseille", ranks: [4, 4, 4, 3, 4, 4, 4, 3, 4, 4, 3, 4, 3, 3, 3, 3, 3] },
  { team: "Lille", ranks: [8, 6, 5, 5, 5, 5, 3, 4, 2, 3, 4, 2, 4, 4, 4, 4, 4] },
  { team: "Lyon", ranks: [6, 7, 7, 8, 7, 7, 8, 7, 6, 7, 7, 6, 7, 6, 5, 5, 5] },
];

// Repris dans PlayerJars.jsx pour la variante Ligue 1 (mêmes joueurs
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

// DONNÉES PROVISOIRES — toute cette page utilise des chiffres plausibles
// mais inventés, en attendant la connexion à une vraie source (FBref).
// Chaque tableau ci-dessous documente précisément ce qu'il faudra
// remplacer et par quoi.

// TODO : à remplacer par le vrai classement FBref une fois connecté.
// GP = matchs joués, GF/GA = buts pour/contre.
export const STANDINGS = [
  { rank: 1, team: "Liverpool", gp: 20, w: 15, d: 3, l: 2, gf: 48, ga: 18 },
  { rank: 2, team: "Arsenal", gp: 20, w: 13, d: 5, l: 2, gf: 44, ga: 17 },
  { rank: 3, team: "Manchester City", gp: 20, w: 12, d: 6, l: 2, gf: 42, ga: 22 },
  { rank: 4, team: "Chelsea", gp: 20, w: 11, d: 6, l: 3, gf: 39, ga: 21 },
  { rank: 5, team: "Newcastle United", gp: 20, w: 10, d: 6, l: 4, gf: 36, ga: 22 },
  { rank: 6, team: "Nottingham Forest", gp: 20, w: 10, d: 5, l: 5, gf: 35, ga: 21 },
  { rank: 7, team: "Aston Villa", gp: 20, w: 9, d: 7, l: 4, gf: 34, ga: 26 },
  { rank: 8, team: "Bournemouth", gp: 20, w: 9, d: 6, l: 5, gf: 33, ga: 27 },
  { rank: 9, team: "Brighton", gp: 20, w: 8, d: 8, l: 4, gf: 32, ga: 25 },
  { rank: 10, team: "Fulham", gp: 20, w: 8, d: 7, l: 5, gf: 31, ga: 24 },
  { rank: 11, team: "Tottenham", gp: 20, w: 8, d: 5, l: 7, gf: 29, ga: 33 },
  { rank: 12, team: "Manchester United", gp: 20, w: 7, d: 7, l: 6, gf: 28, ga: 27 },
  { rank: 13, team: "Brentford", gp: 20, w: 7, d: 6, l: 7, gf: 27, ga: 30 },
  { rank: 14, team: "West Ham", gp: 20, w: 6, d: 7, l: 7, gf: 25, ga: 33 },
  { rank: 15, team: "Everton", gp: 20, w: 6, d: 6, l: 8, gf: 24, ga: 27 },
  { rank: 16, team: "Crystal Palace", gp: 20, w: 5, d: 8, l: 7, gf: 23, ga: 28 },
  { rank: 17, team: "Wolves", gp: 20, w: 5, d: 5, l: 10, gf: 20, ga: 38 },
  { rank: 18, team: "Ipswich Town", gp: 20, w: 4, d: 6, l: 10, gf: 18, ga: 36 },
  { rank: 19, team: "Leicester City", gp: 20, w: 3, d: 6, l: 11, gf: 15, ga: 40 },
  { rank: 20, team: "Southampton", gp: 20, w: 2, d: 4, l: 14, gf: 10, ga: 44 },
].map((row) => ({ ...row, pts: row.w * 3 + row.d }));

// TODO : graphique à réaliser en D3.js une fois les données xG par joueur
// disponibles (source FBref). xG = buts attendus, goals = buts réels.
export const XG_SCORERS = [
  { player: "Erling Haaland", xg: 14.2, goals: 17 },
  { player: "Mohamed Salah", xg: 13.8, goals: 15 },
  { player: "Alexander Isak", xg: 11.5, goals: 14 },
  { player: "Cole Palmer", xg: 10.2, goals: 11 },
  { player: "Chris Wood", xg: 7.1, goals: 10 },
  { player: "Ollie Watkins", xg: 9.8, goals: 9 },
  { player: "Bukayo Saka", xg: 8.6, goals: 8 },
  { player: "Nicolas Jackson", xg: 8.0, goals: 7 },
  { player: "Dominic Solanke", xg: 9.4, goals: 6 },
];

// TODO : classement horizontal à réaliser en D3.js une fois les données xA
// par joueur disponibles (source FBref).
export const XA_CREATORS = [
  { player: "Kevin De Bruyne", xa: 8.4 },
  { player: "Bruno Fernandes", xa: 7.9 },
  { player: "Cole Palmer", xa: 7.2 },
  { player: "Mohamed Salah", xa: 6.8 },
  { player: "Morgan Gibbs-White", xa: 6.1 },
  { player: "Anthony Gordon", xa: 5.7 },
  { player: "Bukayo Saka", xa: 5.4 },
  { player: "Pascal Groß", xa: 5.0 },
  { player: "James Maddison", xa: 4.6 },
];

// TODO : nuage de points à réaliser en D3.js une fois les données de
// possession/PPDA par équipe disponibles (source FBref). PPDA = passes
// autorisées par action défensive avant une récupération (plus c'est bas,
// plus le pressing est intense).
export const POSSESSION_VS_PPDA = [
  { team: "Man City", possession: 63, ppda: 8.5 },
  { team: "Liverpool", possession: 58, ppda: 9.2 },
  { team: "Arsenal", possession: 57, ppda: 9.8 },
  { team: "Chelsea", possession: 55, ppda: 10.5 },
  { team: "Brighton", possession: 56, ppda: 11.0 },
  { team: "Tottenham", possession: 54, ppda: 9.5 },
  { team: "Newcastle", possession: 48, ppda: 10.8 },
  { team: "Aston Villa", possession: 50, ppda: 11.5 },
  { team: "Man United", possession: 52, ppda: 12.0 },
  { team: "Bournemouth", possession: 46, ppda: 8.9 },
  { team: "Fulham", possession: 49, ppda: 12.8 },
  { team: "Brentford", possession: 44, ppda: 13.5 },
  { team: "West Ham", possession: 45, ppda: 12.2 },
  { team: "Crystal Palace", possession: 47, ppda: 13.0 },
  { team: "Nott'm Forest", possession: 43, ppda: 11.8 },
  { team: "Wolves", possession: 41, ppda: 14.5 },
  { team: "Everton", possession: 42, ppda: 13.8 },
  { team: "Ipswich", possession: 40, ppda: 15.2 },
  { team: "Leicester", possession: 39, ppda: 14.8 },
  { team: "Southampton", possession: 44, ppda: 16.0 },
];

// TODO : graphique en lignes à réaliser en D3.js une fois l'historique
// journée par journée disponible (source FBref). Un tableau de positions,
// une valeur par journée jouée.
export const RANK_EVOLUTION = [
  { team: "Liverpool", ranks: [3, 2, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { team: "Arsenal", ranks: [1, 1, 1, 2, 3, 3, 4, 3, 2, 1, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2] },
  { team: "Man City", ranks: [2, 3, 3, 3, 2, 1, 2, 2, 3, 3, 3, 4, 2, 3, 3, 3, 3, 3, 3, 3] },
  { team: "Nott'm Forest", ranks: [15, 12, 10, 8, 9, 7, 6, 7, 5, 6, 5, 5, 6, 5, 5, 6, 6, 5, 6, 6] },
  { team: "Man United", ranks: [8, 9, 10, 9, 11, 12, 13, 12, 14, 13, 14, 15, 14, 13, 12, 13, 12, 12, 12, 12] },
];

// Repris dans PlayerJars.jsx pour la variante Premier League (mêmes
// joueurs que les Cases 2 et 3 ci-dessus, pour rester cohérent).
export const PL_PLAYERS_XG = XG_SCORERS.map(({ player }) => ({
  name: player,
  initials: player
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase(),
}));

export const PL_PLAYERS_XA = XA_CREATORS.map(({ player }) => ({
  name: player,
  initials: player
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase(),
}));

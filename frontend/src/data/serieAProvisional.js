// Données provisoires pour la page Serie A, même structure que
// premierLeagueProvisional.js. Les clubs et joueurs sont réels et
// plausibles pour ce championnat ; les valeurs chiffrées sont en
// revanche entièrement inventées en attendant un vrai branchement
// sur l'API (ou une source type FBref).

// TODO : remplacer par le vrai classement Serie A (API-Football ou
// scraping FBref). 20 équipes, 20 journées jouées (mi-saison).
export const STANDINGS = [
  { rank: 1, team: "Inter Milan", gp: 20, w: 16, d: 3, l: 1, gf: 47, ga: 13 },
  { rank: 2, team: "Juventus", gp: 20, w: 13, d: 5, l: 2, gf: 34, ga: 15 },
  { rank: 3, team: "AC Milan", gp: 20, w: 12, d: 5, l: 3, gf: 38, ga: 22 },
  { rank: 4, team: "Naples", gp: 20, w: 10, d: 6, l: 4, gf: 33, ga: 23 },
  { rank: 5, team: "Atalanta", gp: 20, w: 10, d: 5, l: 5, gf: 36, ga: 25 },
  { rank: 6, team: "AS Roma", gp: 20, w: 9, d: 6, l: 5, gf: 29, ga: 22 },
  { rank: 7, team: "Lazio", gp: 20, w: 8, d: 7, l: 5, gf: 24, ga: 20 },
  { rank: 8, team: "Fiorentina", gp: 20, w: 8, d: 6, l: 6, gf: 27, ga: 24 },
  { rank: 9, team: "Bologne", gp: 20, w: 8, d: 5, l: 7, gf: 25, ga: 23 },
  { rank: 10, team: "Turin", gp: 20, w: 7, d: 6, l: 7, gf: 20, ga: 22 },
  { rank: 11, team: "Monza", gp: 20, w: 6, d: 7, l: 7, gf: 21, ga: 25 },
  { rank: 12, team: "Gênes", gp: 20, w: 6, d: 6, l: 8, gf: 18, ga: 24 },
  { rank: 13, team: "Lecce", gp: 20, w: 5, d: 7, l: 8, gf: 17, ga: 26 },
  { rank: 14, team: "Sassuolo", gp: 20, w: 5, d: 6, l: 9, gf: 22, ga: 30 },
  { rank: 15, team: "Udinese", gp: 20, w: 4, d: 8, l: 8, gf: 15, ga: 24 },
  { rank: 16, team: "Cagliari", gp: 20, w: 4, d: 7, l: 9, gf: 16, ga: 28 },
  { rank: 17, team: "Empoli", gp: 20, w: 4, d: 5, l: 11, gf: 13, ga: 29 },
  { rank: 18, team: "Hellas Vérone", gp: 20, w: 3, d: 6, l: 11, gf: 14, ga: 31 },
  { rank: 19, team: "Salernitana", gp: 20, w: 2, d: 5, l: 13, gf: 12, ga: 36 },
  { rank: 20, team: "Frosinone", gp: 20, w: 2, d: 4, l: 14, gf: 13, ga: 38 },
].map((row) => ({ ...row, pts: row.w * 3 + row.d }));

// TODO : croiser avec les vraies statistiques xG (Understat / FBref)
// une fois la source de données définitive choisie.
// `team` (nom identique à celui utilisé dans STANDINGS) permet à la page
// Équipe de retrouver les joueurs clés d'un club sans dupliquer la donnée.
export const XG_SCORERS = [
  { player: "Lautaro Martínez", team: "Inter Milan", xg: 14.0, goals: 17 },
  { player: "Victor Osimhen", team: "Naples", xg: 12.5, goals: 11 },
  { player: "Dušan Vlahović", team: "Juventus", xg: 11.2, goals: 12 },
  { player: "Ademola Lookman", team: "Atalanta", xg: 9.5, goals: 10 },
  { player: "Romelu Lukaku", team: "AS Roma", xg: 9.0, goals: 7 },
  { player: "Gianluca Scamacca", team: "Atalanta", xg: 8.8, goals: 8 },
  { player: "Rafael Leão", team: "AC Milan", xg: 8.0, goals: 9 },
  { player: "Ciro Immobile", team: "Lazio", xg: 7.5, goals: 6 },
  { player: "Albert Guðmundsson", team: "Gênes", xg: 6.9, goals: 8 },
];

// TODO : idem, source xA à confirmer.
export const XA_CREATORS = [
  { player: "Hakan Çalhanoğlu", team: "Inter Milan", xa: 7.4 },
  { player: "Khvicha Kvaratskhelia", team: "Naples", xa: 6.9 },
  { player: "Nicolò Barella", team: "Inter Milan", xa: 6.5 },
  { player: "Rafael Leão", team: "AC Milan", xa: 6.3 },
  { player: "Teun Koopmeiners", team: "Atalanta", xa: 5.8 },
  { player: "Paulo Dybala", team: "AS Roma", xa: 5.5 },
  { player: "Federico Chiesa", team: "Juventus", xa: 5.0 },
  { player: "Luis Alberto", team: "Lazio", xa: 4.8 },
  { player: "Riccardo Orsolini", team: "Bologne", xa: 4.4 },
];

// TODO : possession moyenne et PPDA réels par équipe (source à définir).
export const POSSESSION_VS_PPDA = [
  { team: "Inter Milan", possession: 58, ppda: 8.5 },
  { team: "Juventus", possession: 54, ppda: 9.0 },
  { team: "AC Milan", possession: 56, ppda: 8.8 },
  { team: "Naples", possession: 57, ppda: 9.5 },
  { team: "Atalanta", possession: 55, ppda: 7.8 },
  { team: "AS Roma", possession: 52, ppda: 10.5 },
  { team: "Lazio", possession: 53, ppda: 10.0 },
  { team: "Fiorentina", possession: 55, ppda: 10.8 },
  { team: "Bologne", possession: 54, ppda: 9.2 },
  { team: "Turin", possession: 47, ppda: 11.0 },
  { team: "Monza", possession: 48, ppda: 12.0 },
  { team: "Gênes", possession: 44, ppda: 11.5 },
  { team: "Lecce", possession: 43, ppda: 12.8 },
  { team: "Sassuolo", possession: 56, ppda: 13.5 },
  { team: "Udinese", possession: 45, ppda: 12.2 },
  { team: "Cagliari", possession: 42, ppda: 13.0 },
  { team: "Empoli", possession: 46, ppda: 13.8 },
  { team: "Hellas Vérone", possession: 41, ppda: 14.5 },
  { team: "Salernitana", possession: 40, ppda: 15.0 },
  { team: "Frosinone", possession: 43, ppda: 14.2 },
];

// TODO : graphique en lignes à réaliser en D3.js une fois l'historique
// journée par journée disponible (source FBref). Un tableau de positions,
// une valeur par journée jouée.
export const RANK_EVOLUTION = [
  { team: "Inter Milan", ranks: [2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { team: "Juventus", ranks: [1, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
  { team: "AC Milan", ranks: [3, 3, 3, 3, 3, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3] },
  { team: "Naples", ranks: [4, 4, 5, 6, 7, 8, 9, 8, 7, 8, 7, 6, 5, 5, 4, 4, 4, 4, 4, 4] },
  { team: "Atalanta", ranks: [9, 8, 7, 7, 6, 6, 5, 6, 6, 5, 6, 5, 4, 4, 5, 5, 5, 5, 5, 5] },
];

// Repris dans PlayerJars.jsx pour la variante Serie A (mêmes joueurs
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

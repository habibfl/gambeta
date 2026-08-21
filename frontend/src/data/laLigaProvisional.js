// Données provisoires pour la page Liga, même structure que
// premierLeagueProvisional.js. Les clubs et joueurs sont réels et
// plausibles pour ce championnat ; les valeurs chiffrées sont en
// revanche entièrement inventées en attendant un vrai branchement
// sur l'API (ou une source type FBref).

// TODO : remplacer par le vrai classement Liga (API-Football ou
// scraping FBref). 20 équipes, 20 journées jouées (mi-saison).
export const STANDINGS = [
  { rank: 1, team: "Real Madrid", gp: 20, w: 16, d: 3, l: 1, gf: 50, ga: 15 },
  { rank: 2, team: "Barcelone", gp: 20, w: 14, d: 4, l: 2, gf: 47, ga: 20 },
  { rank: 3, team: "Atlético Madrid", gp: 20, w: 13, d: 4, l: 3, gf: 42, ga: 22 },
  { rank: 4, team: "Girona", gp: 20, w: 12, d: 5, l: 3, gf: 40, ga: 23 },
  { rank: 5, team: "Athletic Bilbao", gp: 20, w: 11, d: 6, l: 3, gf: 33, ga: 18 },
  { rank: 6, team: "Real Sociedad", gp: 20, w: 10, d: 6, l: 4, gf: 30, ga: 20 },
  { rank: 7, team: "Real Betis", gp: 20, w: 9, d: 7, l: 4, gf: 28, ga: 22 },
  { rank: 8, team: "Villarreal", gp: 20, w: 9, d: 5, l: 6, gf: 31, ga: 28 },
  { rank: 9, team: "Valence", gp: 20, w: 8, d: 7, l: 5, gf: 24, ga: 20 },
  { rank: 10, team: "Séville", gp: 20, w: 8, d: 6, l: 6, gf: 26, ga: 25 },
  { rank: 11, team: "Osasuna", gp: 20, w: 7, d: 7, l: 6, gf: 23, ga: 24 },
  { rank: 12, team: "Getafe", gp: 20, w: 7, d: 6, l: 7, gf: 20, ga: 23 },
  { rank: 13, team: "Celta Vigo", gp: 20, w: 6, d: 7, l: 7, gf: 22, ga: 27 },
  { rank: 14, team: "Majorque", gp: 20, w: 6, d: 6, l: 8, gf: 18, ga: 24 },
  { rank: 15, team: "Las Palmas", gp: 20, w: 5, d: 8, l: 7, gf: 19, ga: 25 },
  { rank: 16, team: "Rayo Vallecano", gp: 20, w: 5, d: 6, l: 9, gf: 17, ga: 28 },
  { rank: 17, team: "Alavés", gp: 20, w: 4, d: 7, l: 9, gf: 15, ga: 27 },
  { rank: 18, team: "Cadix", gp: 20, w: 3, d: 7, l: 10, gf: 14, ga: 31 },
  { rank: 19, team: "Grenade", gp: 20, w: 3, d: 5, l: 12, gf: 16, ga: 38 },
  { rank: 20, team: "Almería", gp: 20, w: 2, d: 3, l: 15, gf: 11, ga: 42 },
].map((row) => ({ ...row, pts: row.w * 3 + row.d }));

// TODO : croiser avec les vraies statistiques xG (Understat / FBref)
// une fois la source de données définitive choisie.
// `team` (nom identique à celui utilisé dans STANDINGS) permet à la page
// Équipe de retrouver les joueurs clés d'un club sans dupliquer la donnée.
export const XG_SCORERS = [
  { player: "Kylian Mbappé", team: "Real Madrid", xg: 13.5, goals: 16 },
  { player: "Robert Lewandowski", team: "Barcelone", xg: 12.8, goals: 14 },
  { player: "Antoine Griezmann", team: "Atlético Madrid", xg: 10.5, goals: 11 },
  { player: "Vinícius Júnior", team: "Real Madrid", xg: 8.8, goals: 9 },
  { player: "Alexander Sørloth", team: "Villarreal", xg: 9.2, goals: 9 },
  { player: "Ante Budimir", team: "Osasuna", xg: 8.0, goals: 10 },
  { player: "Iago Aspas", team: "Celta Vigo", xg: 7.5, goals: 7 },
  { player: "Ayoze Pérez", team: "Villarreal", xg: 6.8, goals: 6 },
  { player: "Borja Iglesias", team: "Real Betis", xg: 7.9, goals: 5 },
];

// TODO : idem, source xA à confirmer.
export const XA_CREATORS = [
  { player: "Jude Bellingham", team: "Real Madrid", xa: 7.6 },
  { player: "Toni Kroos", team: "Real Madrid", xa: 6.8 },
  { player: "Ilkay Gündogan", team: "Barcelone", xa: 6.2 },
  { player: "Antoine Griezmann", team: "Atlético Madrid", xa: 6.0 },
  { player: "Nico Williams", team: "Athletic Bilbao", xa: 5.6 },
  { player: "Álex Baena", team: "Villarreal", xa: 5.4 },
  { player: "Aleix García", team: "Girona", xa: 5.0 },
  { player: "Isco", team: "Real Betis", xa: 4.5 },
  { player: "Take Kubo", team: "Real Sociedad", xa: 4.3 },
];

// TODO : possession moyenne et PPDA réels par équipe (source à définir).
export const POSSESSION_VS_PPDA = [
  { team: "Real Madrid", possession: 61, ppda: 8.2 },
  { team: "Barcelone", possession: 63, ppda: 8.8 },
  { team: "Atlético Madrid", possession: 54, ppda: 9.0 },
  { team: "Girona", possession: 58, ppda: 9.5 },
  { team: "Athletic Bilbao", possession: 53, ppda: 10.0 },
  { team: "Real Sociedad", possession: 55, ppda: 10.3 },
  { team: "Real Betis", possession: 56, ppda: 11.0 },
  { team: "Villarreal", possession: 57, ppda: 11.5 },
  { team: "Valence", possession: 50, ppda: 10.8 },
  { team: "Séville", possession: 49, ppda: 11.2 },
  { team: "Osasuna", possession: 46, ppda: 9.8 },
  { team: "Getafe", possession: 44, ppda: 9.2 },
  { team: "Celta Vigo", possession: 52, ppda: 12.5 },
  { team: "Majorque", possession: 45, ppda: 12.0 },
  { team: "Las Palmas", possession: 51, ppda: 13.0 },
  { team: "Rayo Vallecano", possession: 43, ppda: 10.5 },
  { team: "Alavés", possession: 42, ppda: 13.5 },
  { team: "Cadix", possession: 41, ppda: 14.2 },
  { team: "Grenade", possession: 40, ppda: 14.8 },
  { team: "Almería", possession: 39, ppda: 15.5 },
];

// TODO : graphique en lignes à réaliser en D3.js une fois l'historique
// journée par journée disponible (source FBref). Un tableau de positions,
// une valeur par journée jouée.
export const RANK_EVOLUTION = [
  { team: "Real Madrid", ranks: [1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] },
  { team: "Barcelone", ranks: [3, 2, 2, 1, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
  { team: "Girona", ranks: [2, 3, 3, 3, 3, 3, 3, 3, 2, 3, 3, 4, 3, 3, 4, 3, 4, 3, 3, 4] },
  { team: "Atlético Madrid", ranks: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 4, 4, 3, 4, 3, 4, 4, 3] },
  { team: "Séville", ranks: [9, 10, 11, 9, 10, 11, 9, 10, 10, 9, 10, 10, 9, 10, 10, 9, 10, 10, 9, 10] },
];

// Repris dans PlayerJars.jsx pour la variante Liga (mêmes joueurs
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

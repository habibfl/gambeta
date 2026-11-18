// Glossaire des indicateurs utilisés sur Gambeta.
export const GLOSSARY = {
  xg: {
    term: "xG (expected goals, buts attendus)",
    short: "Probabilité qu'un tir se transforme en but, d'après des milliers de tirs similaires.",
    long: "Chaque tir reçoit une valeur entre 0 et 1 selon sa distance, son angle, la partie du corps utilisée et le type d'action. Un penalty vaut environ 0,76 xG, une frappe de 30 mètres environ 0,03. Additionnés sur une saison, les xG disent combien de buts un joueur « aurait dû » marquer avec ses occasions.",
    example: "Harry Kane : 36 buts pour 29,6 xG en 2025-26, soit 6,4 buts de plus que la qualité de ses occasions ne le laissait prévoir.",
  },
  npxg: {
    term: "npxG (xG hors penalty)",
    short: "Les xG sans les penalties, pour juger la création d'occasions dans le jeu.",
    long: "Les penalties gonflent les xG des tireurs désignés. Les retirer permet de comparer plus justement ce que chaque joueur se crée dans le jeu.",
  },
  xa: {
    term: "xA (expected assists, passes décisives attendues)",
    short: "Valeur xG des tirs provoqués par les passes d'un joueur.",
    long: "Si un joueur fait une passe qui mène à un tir valant 0,4 xG, il reçoit 0,4 xA, que le tir soit marqué ou non. L'xA mesure la qualité des occasions créées, indépendamment de la réussite des coéquipiers.",
    example: "Bruno Fernandes, créateur n°1 de Premier League en 2025-26 avec 17,8 xA.",
  },
  xgchain: {
    term: "xGChain",
    short: "Somme des xG de toutes les actions auxquelles le joueur a participé.",
    long: "Chaque joueur qui touche le ballon dans une action terminée par un tir reçoit la valeur xG de ce tir. Mesure l'implication globale dans le jeu offensif.",
  },
  xgbuildup: {
    term: "xGBuildup",
    short: "Comme xGChain, mais sans le tir ni la passe décisive.",
    long: "Mesure la participation à la construction des actions (les passes d'avant), utile pour repérer les relanceurs et milieux organisateurs.",
  },
  per90: {
    term: "Par 90 minutes",
    short: "Statistique ramenée à un match complet, pour comparer titulaires et remplaçants.",
    long: "Un joueur qui marque 5 buts en 900 minutes a la même moyenne (0,5 but par 90 min) qu'un joueur qui en marque 15 en 2 700 minutes. Sur Gambeta, les comparaisons par 90 minutes ne gardent que les joueurs ayant joué au moins 450 minutes, pour éviter les moyennes trompeuses.",
  },
  percentile: {
    term: "Percentile",
    short: "Rang d'un joueur parmi les autres, de 0 à 100.",
    long: "Un 80e percentile signifie « meilleur que 80 % des joueurs comparables ». Sur les fiches joueurs, la comparaison se fait face aux joueurs du même poste ayant joué au moins 450 minutes.",
  },
  gd: {
    term: "Différence de buts",
    short: "Buts marqués moins buts encaissés.",
    long: "Elle mesure la supériorité d'une équipe sur l'ensemble de ses matchs. Sur 5 saisons, elle explique 93 % des écarts de points entre les équipes.",
  },
  kmeans: {
    term: "K-means (clustering)",
    short: "Algorithme qui regroupe automatiquement des éléments aux caractéristiques proches.",
    long: "On lui donne des joueurs décrits par plusieurs statistiques et un nombre de groupes ; il forme les groupes de joueurs les plus semblables entre eux. C'est de l'apprentissage non supervisé : aucun profil n'est défini à l'avance.",
  },
};

import { createContext } from "react";

// Objet de contexte seul, dans son propre fichier : évite d'exporter
// autre chose qu'un composant depuis ThemeContext.jsx (règle react-refresh).
export const ThemeContext = createContext(null);

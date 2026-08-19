import { useContext } from "react";
import { ThemeContext } from "./theme-context-object";

// Petit hook pour consommer le contexte de thème plus simplement
// dans les composants (évite d'importer useContext + ThemeContext partout).
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme doit être utilisé à l'intérieur d'un ThemeProvider");
  }
  return context;
}

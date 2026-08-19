import { useEffect, useState } from "react";
import { ThemeContext } from "./theme-context-object";

// Fournisseur du contexte de thème : l'état vit uniquement en mémoire
// (state React), sans persistance dans localStorage, comme demandé.
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("light");

  // Répercute le thème sur <html> en ajoutant/retirant la classe "dark",
  // que Tailwind utilise (via @custom-variant dark dans index.css) pour
  // appliquer les styles "dark:".
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import FeatureGrid from "./components/FeatureGrid";
import Footer from "./components/Footer";

// Page d'accueil : regroupe le hero et la grille de fonctionnalités.
function HomePage() {
  return (
    <>
      <Hero />
      <FeatureGrid />
    </>
  );
}

// Placeholder temporaire pour les pages pas encore construites
// (Championnats, Compétitions, Joueurs, Comparateur...).
// Sera remplacé progressivement au fil des phases suivantes.
function ComingSoonPage() {
  return (
    <section className="flex-1 flex items-center justify-center px-6 py-32 text-center">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e86f2c] mb-3">
          Bientôt disponible
        </p>
        <h1 className="text-[28px] md:text-[34px] font-bold text-[var(--gambeta-ink)] tracking-[-0.02em]">
          Cette page arrive prochainement.
        </h1>
      </div>
    </section>
  );
}

function App() {
  // Le fond et la couleur de texte de base viennent de --gambeta-paper /
  // --gambeta-ink, définies globalement dans index.css (et qui s'inversent
  // automatiquement en mode sombre) : pas besoin de les redéfinir ici.
  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<ComingSoonPage />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;

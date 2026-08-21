import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Championnats from "./pages/Championnats";
import ChampionnatDetail from "./pages/ChampionnatDetail";
import Equipes from "./pages/Equipes";
import EquipeDetail from "./pages/EquipeDetail";
import Joueurs from "./pages/Joueurs";
import Comparateur from "./pages/Comparateur";

// Page 404 : trop simple pour mériter son propre fichier dans pages/,
// affichée pour toute route qui ne correspond à rien ci-dessous.
function NotFound() {
  return (
    <section className="flex-1 flex items-center justify-center px-6 py-32 text-center bg-[var(--gambeta-paper)] text-[var(--gambeta-ink)]">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e86f2c] mb-3">
          Erreur 404
        </p>
        <h1 className="text-[28px] md:text-[34px] font-bold tracking-[-0.02em]">
          Cette page n'existe pas.
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
        <Route path="/" element={<Home />} />
        <Route path="/championnats" element={<Championnats />} />
        <Route path="/championnats/:id" element={<ChampionnatDetail />} />
        <Route path="/equipes" element={<Equipes />} />
        <Route path="/equipes/:slug" element={<EquipeDetail />} />
        <Route path="/joueurs" element={<Joueurs />} />
        <Route path="/comparateur" element={<Comparateur />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;

import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Championnats from "./pages/Championnats";
import ChampionnatDetail from "./pages/ChampionnatDetail";
import Equipes from "./pages/Equipes";
import EquipeDetail from "./pages/EquipeDetail";
import JoueurDetail from "./pages/JoueurDetail";
import Comparateur from "./pages/Comparateur";
import Analyses from "./pages/Analyses";
import EtudeCas from "./pages/EtudeCas";
import Methodologie from "./pages/Methodologie";
import Explorer from "./pages/Explorer";
import Modeles from "./pages/Modeles";

// Page 404 : trop simple pour mériter son propre fichier dans pages/
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
  // gambeta-ink, définies globalement dans index.css
  return (
    <div className="min-h-screen flex flex-col transition-colors duration-300">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/championnats" element={<Championnats />} />
        <Route path="/championnats/:id" element={<ChampionnatDetail />} />
        <Route path="/equipes" element={<Equipes />} />
        <Route path="/equipes/:slug" element={<EquipeDetail />} />
        <Route path="/joueurs" element={<Navigate to="/explorateur" replace />} />
        <Route path="/joueurs/:slug" element={<JoueurDetail />} />
        <Route path="/comparateur" element={<Comparateur />} />
        <Route path="/explorateur" element={<Explorer />} />
        <Route path="/modeles" element={<Modeles />} />
        <Route path="/analyses" element={<Analyses />} />
        <Route path="/etude-de-cas" element={<EtudeCas />} />
        <Route path="/methodologie" element={<Methodologie />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;

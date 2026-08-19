import Hero from "../components/Hero";
import FeatureGrid from "../components/FeatureGrid";
import PlayerJars from "../components/PlayerJars";

// Page d'accueil : hero, section scrollytelling des fonctionnalités,
// puis les bocaux de joueurs en tout dernier. Contenu et ordre identiques
// à l'ancien HomePage() qui vivait directement dans App.jsx.
export default function Home() {
  return (
    <>
      <Hero />
      <FeatureGrid />
      <PlayerJars />
    </>
  );
}

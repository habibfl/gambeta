import Hero from "../components/Hero";
import LuckStory from "../components/story/LuckStory";

// Page d'accueil : en-tête puis l'étude « points attendus et points réels »
export default function Home() {
  return (
    <>
      <Hero />
      <LuckStory />
    </>
  );
}

import PageBackground from "../components/PageBackground";

// Page "Comparateur" : structure minimale en attendant le vrai contenu.
export default function Comparateur() {
  return (
    <>
      <PageBackground />
      <section className="flex-1 flex items-center justify-center px-6 py-32 text-center text-[var(--gambeta-ink)]">
        <div>
          <h1 className="text-[32px] md:text-[42px] font-bold tracking-[-0.02em]">Comparateur</h1>
          <p className="mt-4 text-current/60">Contenu à venir</p>
        </div>
      </section>
    </>
  );
}

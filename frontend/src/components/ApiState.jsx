import { Skeleton } from "./ui/skeleton";

// Petits états de chargement/erreur réutilisés partout où une page interroge l'API /api/data/*

// Bloc de chargement générique (rectangle qui pulse)
export function ApiSkeleton({ className = "h-64 w-full" }) {
  return <Skeleton className={className} />;
}

// Message d'erreur clair (pas un écran cassé) quand l'API ne répond pas.
export function ApiError({ message = "Impossible de charger ces données pour le moment." }) {
  return (
    <div className="rounded-2xl border border-current/10 bg-current/[0.02] p-6 text-center text-sm text-current/60">
      {message}
    </div>
  );
}

// Petit bandeau non bloquant
export function ApiFallbackNotice({ message }) {
  return (
    <div className="mx-auto mb-8 max-w-[880px] rounded-xl border border-[#e86f2c]/20 bg-[#e86f2c]/5 px-4 py-2.5 text-center text-xs text-current/70">
      {message}
    </div>
  );
}

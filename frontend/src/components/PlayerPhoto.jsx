import { useState } from "react";
import { usePlayerPhoto } from "../hooks/usePlayerPhoto";
import { leagueColor } from "../lib/leagues";

// Photo ronde d'un joueur, avec un anneau à la couleur de son championnat.
export default function PlayerPhoto({ name, league, size = 64, ring = true, fetchPhoto = true }) {
  const url = usePlayerPhoto(fetchPhoto ? name : null);
  const [broken, setBroken] = useState(false);
  const color = leagueColor(league);
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 25%, ${color}, ${color}aa 55%, #0a2219)`,
        boxShadow: ring ? `0 0 0 3px var(--gambeta-paper), 0 0 0 5px ${color}` : undefined,
      }}
    >
      {url && !broken ? (
        <img src={url} alt={name} className="h-full w-full object-cover object-top" onError={() => setBroken(true)} />
      ) : (
        <span className="font-extrabold text-white" style={{ fontSize: size * 0.34 }}>
          {initials}
        </span>
      )}
    </span>
  );
}

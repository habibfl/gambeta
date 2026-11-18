import { useState } from "react";
import { leagueColor } from "../lib/leagues";

// Écusson d'un club : le vrai logo si disponible
export default function Crest({ team, league, logo, size = 32, className = "", sticker = false }) {
  const [broken, setBroken] = useState(false);
  const initials = (team || "?")
    .replace(/^(FC|AC|AS|SC|RC|US|1\.)\s+/i, "")
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  const color = leagueColor(league);

  if (sticker) {
    const hasLogo = logo && !broken;
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full font-extrabold text-white ${className}`}
        style={{
          width: size,
          height: size,
          background: hasLogo ? "#ffffff" : `linear-gradient(145deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 0 ${Math.max(1.5, size * 0.07)}px #ffffff, 0 2px 6px rgba(0,0,0,0.28)`,
          padding: hasLogo ? size * 0.12 : 0,
          fontSize: Math.max(8, size * 0.32),
        }}
        title={team}
      >
        {hasLogo ? (
          <img src={logo} alt={team} className="h-full w-full object-contain" onError={() => setBroken(true)} loading="lazy" />
        ) : (
          initials
        )}
      </span>
    );
  }

  if (logo && !broken) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <img src={logo} alt={team} className="h-full w-full object-contain drop-shadow-sm" onError={() => setBroken(true)} loading="lazy" />
      </span>
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-extrabold text-white shadow-sm ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, size * 0.32),
        background: `linear-gradient(145deg, ${color}, ${color}cc 60%, #00000033)`,
        borderRadius: `${size * 0.22}px ${size * 0.22}px ${size * 0.5}px ${size * 0.5}px`,
      }}
      title={team}
    >
      {initials}
    </span>
  );
}

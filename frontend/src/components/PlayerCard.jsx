import { Link } from "react-router-dom";
import Crest from "./Crest";
import PlayerPhoto from "./PlayerPhoto";
import { leagueColor } from "../lib/leagues";

// Carte joueur : photo, club, championnat, poste et statistiques principales
export default function PlayerCard({ player, logo, rank, fetchPhoto = false, extra }) {
  const color = leagueColor(player.leagueLabel ?? player.leagueId);
  const stats = [
    ["Buts", player.stats.goals],
    ["xG", player.stats.xg.toFixed(1)],
    ["PD", player.stats.assists],
    ["xA", player.stats.xa.toFixed(1)],
  ];
  return (
    <Link
      to={`/joueurs/${player.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-current/10 bg-current/[0.02] p-4 transition hover:border-current/30 hover:bg-current/[0.04]"
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <PlayerPhoto name={player.name} league={player.leagueLabel} size={56} fetchPhoto={fetchPhoto} />
          <span className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 shadow">
            <Crest team={player.team} league={player.leagueLabel} logo={logo} size={20} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[15px] font-bold group-hover:text-[#e86f2c]">{player.name}</p>
            {rank != null && <span className="font-mono text-[11px] text-current/45">#{rank}</span>}
          </div>
          <p className="truncate text-[13px] text-current/60">{player.team}</p>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-wide text-current/50">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
            <span className="truncate">
              {player.leagueLabel} · {player.position}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-1 border-t border-current/10 pt-3 text-center">
        {stats.map(([label, value]) => (
          <div key={label}>
            <p className="text-lg font-extrabold tabular-nums leading-tight">{value}</p>
            <p className="font-mono text-[10px] uppercase tracking-wide text-current/50">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 font-mono text-[10.5px] text-current/45">{player.minutes.toLocaleString("fr-FR")} minutes</p>
      {extra}
    </Link>
  );
}

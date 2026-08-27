import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageBackground from "../components/PageBackground";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { PLAYERS, LEAGUE_FILTERS, POSITIONS, avatarUrl } from "../data/playersRegistry";

// Page "Joueurs" : recherche par nom + filtres championnat/position sur le
// registre central (voir data/playersRegistry.js, qui fusionne tous les
// joueurs déjà connus du site plutôt que d'en inventer de nouveaux).
export default function Joueurs() {
  const [query, setQuery] = useState("");
  const [activeLeague, setActiveLeague] = useState("all");
  const [activePosition, setActivePosition] = useState("all");

  const players = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return PLAYERS.filter((player) => {
      if (needle && !player.name.toLowerCase().includes(needle)) return false;
      if (activeLeague !== "all" && player.leagueId !== activeLeague) return false;
      if (activePosition !== "all" && player.position !== activePosition) return false;
      return true;
    });
  }, [query, activeLeague, activePosition]);

  return (
    <>
      <PageBackground />
      <section className="flex-1 px-6 py-32 md:px-12 text-[var(--gambeta-ink)]">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-10 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#e86f2c] mb-2">
              La base joueurs
            </p>
            <h1 className="text-[32px] md:text-[42px] font-bold tracking-[-0.02em]">Joueurs</h1>
            <p className="mt-4 text-current/60">
              Tous les joueurs déjà répertoriés sur Gambeta, buteurs, passeurs et titulaires des
              cinq grands championnats. Cherchez un nom, ou filtrez par championnat et par poste.
            </p>
          </div>

          {/* Barre de recherche */}
          <div className="mx-auto mb-6 max-w-md">
            <Input
              type="search"
              placeholder="Rechercher un joueur..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Rechercher un joueur par nom"
            />
          </div>

          {/* Filtre par championnat */}
          <div className="mb-3 flex flex-wrap justify-center gap-2">
            <Button
              variant={activeLeague === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveLeague("all")}
            >
              Tous les championnats
            </Button>
            {LEAGUE_FILTERS.map((league) => (
              <Button
                key={league.id}
                variant={activeLeague === league.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveLeague(league.id)}
              >
                {league.label}
              </Button>
            ))}
          </div>

          {/* Filtre par poste */}
          <div className="mb-10 flex flex-wrap justify-center gap-2">
            <Button
              variant={activePosition === "all" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setActivePosition("all")}
            >
              Tous les postes
            </Button>
            {POSITIONS.map((position) => (
              <Button
                key={position}
                variant={activePosition === position ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setActivePosition(position)}
              >
                {position}
              </Button>
            ))}
          </div>

          <p className="mb-4 text-center text-sm text-current/50">
            {players.length} joueur{players.length > 1 ? "s" : ""} trouvé{players.length > 1 ? "s" : ""}
          </p>

          {/* Grille de résultats */}
          {players.length === 0 ? (
            <p className="py-16 text-center text-current/60">Aucun joueur ne correspond à cette recherche.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {players.map((player, index) => (
                <Link key={player.slug} to={`/joueurs/${player.slug}`}>
                  <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <img
                          src={avatarUrl(player.name, index)}
                          alt={player.name}
                          className="h-12 w-12 shrink-0 rounded-full border border-current/10"
                          width={48}
                          height={48}
                        />
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base">{player.name}</CardTitle>
                          <p className="truncate text-sm text-current/60">{player.team}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{player.leagueLabel}</Badge>
                        <Badge>{player.position}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

import { useState } from "react";
import PlayerCard from "../components/cards/PlayerCard";
import TeamCard from "../components/cards/TeamCard";
import PlayerSearchInput from "../components/PlayerSearchInput";
import "./PrototypePage.css";

const teams = [
  {
    id: "sf",
    name: "San Francisco 49ers",
    code: "SF",
    division: "NFC West",
    record: "12-5",
    rank: 1,
    pointsFor: 450,
    pointsAgainst: 300,
  },
];

export default function PrototypePage() {
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  return (
    <div className="protoWrap">
      <header className="appHeader">
        <h1 className="appTitle">Cards Prototype</h1>
        <p className="appSubtitle">Search for any player below</p>
        <PlayerSearchInput onSelect={setSelectedPlayer} />
      </header>

      <div className="appContent">
        <section className="section">
          <h2 className="sectionTitle">Player Card</h2>
          {selectedPlayer ? (
            <PlayerCard player={{ name: selectedPlayer.full_name, team: selectedPlayer.team_abbr }} />
          ) : (
            <p>Search for a player to load a card.</p>
          )}
        </section>

        <section className="section">
          <h2 className="sectionTitle">Team Cards</h2>
          <div className="cardGrid">
            {teams.map((t) => (
              <TeamCard key={t.id} team={t} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

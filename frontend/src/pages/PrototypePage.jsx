import React from "react";
import PlayerCard from "../components/cards/PlayerCard";
import TeamCard from "../components/cards/TeamCard";
import "./PrototypePage.css";

const players = [
  {
    id: "1",
    name: "John Doe",
    position: "QB",
    team: "SF",
    stats: { passingYards: 4000, touchdowns: 30 },
  },
  {
    id: "2",
    name: "Jane Smith",
    position: "RB",
    team: "SF",
    stats: { rushingYards: 1200, touchdowns: 10 },
  },
];

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
  return (
    <div className="protoWrap">
      <header className="appHeader">
        <h1 className="appTitle">Cards Prototype</h1>
        <p className="appSubtitle">Your existing templates page (moved to /cards)</p>
      </header>

      <div className="appContent">
        <section className="section">
          <h2 className="sectionTitle">Player Cards</h2>
          <p className="sectionDesc">Mock data for now; wire to BALLDONTLIE later.</p>
          <div className="cardGrid">
            {players.map((p) => (
              <PlayerCard key={p.id} player={p} />
            ))}
          </div>
        </section>

        <section className="section">
          <h2 className="sectionTitle">Team Cards</h2>
          <p className="sectionDesc">Team summaries in the same visual language.</p>
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
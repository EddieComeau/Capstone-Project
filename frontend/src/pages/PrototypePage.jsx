import PlayerCard from "../components/PlayerCard";
import TeamCard from "../components/TeamCard";

export default function PrototypePage() {
  const players = [
    {
      id: 1,
      name: "Patrick Mahomes",
      team: "KC",
      position: "QB",
      number: 15,
      stats: { yards: 4210, touchdowns: 37, interceptions: 10, rating: 104.5 },
      tier: "Elite",
    },
    {
      id: 2,
      name: "Christian McCaffrey",
      team: "SF",
      position: "RB",
      number: 23,
      stats: { yards: 1950, touchdowns: 18, interceptions: null, rating: null },
      tier: "Elite",
    },
  ];

  const teams = [
    {
      id: "kc",
      name: "Kansas City Chiefs",
      code: "KC",
      division: "AFC West",
      record: "11-6",
      rank: 1,
      pointsFor: 420,
      pointsAgainst: 310,
    },
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
            {players.map((p) => <PlayerCard key={p.id} player={p} />)}
          </div>
        </section>

        <section className="section">
          <h2 className="sectionTitle">Team Cards</h2>
          <p className="sectionDesc">Team summaries in the same visual language.</p>
          <div className="cardGrid">
            {teams.map((t) => <TeamCard key={t.id} team={t} />)}
          </div>
        </section>
      </div>
    </div>
  );
}

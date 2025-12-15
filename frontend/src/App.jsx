// src/App.jsx
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import "./App.css";
import PlayerCard from "./components/PlayerCard";
import TeamCard from "./components/TeamCard";
import DepthChartPage from "./pages/DepthChartPage";
import PlayByPlayTab from "./components/playbyplay/PlayByPlayTab";

function PrototypePage() {
  const players = [
    {
      id: 1,
      name: "Patrick Mahomes",
      team: "KC",
      position: "QB",
      number: 15,
      stats: {
        yards: 4210,
        touchdowns: 37,
        interceptions: 10,
        rating: 104.5,
      },
      tier: "Elite",
    },
    {
      id: 2,
      name: "Christian McCaffrey",
      team: "SF",
      position: "RB",
      number: 23,
      stats: {
        yards: 1950,
        touchdowns: 18,
        interceptions: null,
        rating: null,
      },
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
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">NFL Cards 4.0</h1>
        <p className="app-subtitle">Prototype card templates</p>
      </header>

      <main className="app-content">
        <section className="section">
          <h2 className="section-title">Player Cards</h2>
          <p className="section-description">
            Designing the main collectible layout for individual players. Mock
            data for now; will be wired to your NFL API later.
          </p>
          <div className="card-grid">
            {players.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Team Cards</h2>
          <p className="section-description">
            Team-level summaries using a similar visual language so they feel
            like the same set.
          </p>
          <div className="card-grid">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function AppNav() {
  const linkStyle = ({ isActive }) => ({
    padding: "10px 12px",
    borderRadius: 12,
    textDecoration: "none",
    fontWeight: 800,
    letterSpacing: 0.2,
    border: "1px solid rgba(255,255,255,0.16)",
    background: isActive ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.25)",
    color: "rgba(255,255,255,0.92)",
  });

  return (
    <nav style={{ display: "flex", gap: 10, padding: 12, flexWrap: "wrap" }}>
      <NavLink to="/" style={linkStyle} end>
        Prototype
      </NavLink>
      <NavLink to="/depth-chart" style={linkStyle}>
        Depth Chart
      </NavLink>
      <NavLink to="/play-by-play" style={linkStyle}>
        Play By Play
      </NavLink>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppNav />
      <Routes>
        <Route path="/" element={<PrototypePage />} />
        <Route path="/depth-chart" element={<DepthChartPage />} />
        <Route path="/play-by-play" element={<PlayByPlayTab />} />
      </Routes>
    </BrowserRouter>
  );
}


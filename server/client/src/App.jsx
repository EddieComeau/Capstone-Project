// client/src/App.jsx
import React from "react";
import TeamCardsPage from "./pages/TeamCardsPage";
// src/App.jsx
import './App.css'
import PlayerCard from './components/PlayerCard'

function App() {
  const players = [
    {
      id: 1,
      name: 'Patrick Mahomes',
      team: 'KC',
      position: 'QB',
      number: 15,
      stats: {
        yards: 4210,
        touchdowns: 37,
        interceptions: 10,
        rating: 104.5,
      },
      tier: 'Elite',
    },
    {
      id: 2,
      name: 'Christian McCaffrey',
      team: 'SF',
      position: 'RB',
      number: 23,
      stats: {
        yards: 1950,
        touchdowns: 18,
        interceptions: null,
        rating: null,
      },
      tier: 'Elite',
    },
  ]

  return (
    <div className="app">
      <h1 className="app-title">NFL Cards 4.0</h1>
      <p className="app-subtitle">Prototype player card templates</p>

      <div className="card-grid">
        {players.map(player => (
          <PlayerCard key={player.id} player={player} />
        ))}
      </div>
    </div>
  )
}

function App() {
  return (
    <div className="app">
      {/* Default to BUF / 2024 / week 1; you can wire controls later */}
      <TeamCardsPage defaultTeam="BUF" defaultSeason={2024} defaultWeek={1} />
    </div>
  );
}

export default App;

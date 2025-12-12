// client/src/App.jsx
import React from "react";
import TeamCardsPage from "./pages/TeamCardsPage";

function App() {
  return (
    <div className="app">
      {/* Default to BUF / 2024 / week 1; you can wire controls later */}
      <TeamCardsPage defaultTeam="BUF" defaultSeason={2024} defaultWeek={1} />
    </div>
  );
}

export default App;

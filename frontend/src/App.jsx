// frontend/src/App.jsx (modified for error boundary)

import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

import TopTabs from "./components/TopTabs";
import HomePage from "./pages/HomePage";
import StartPage from "./pages/StartPage";
import PrototypePage from "./pages/PrototypePage";
import DepthChartPage from "./pages/DepthChartPage";
import PlayByPlayTab from "./components/playbyplay/PlayByPlayTab";
import MatchupComparisonPage from "./pages/MatchupComparisonPage";
import StandingsPage from "./pages/StandingsPage";
import BettingPage from "./pages/BettingPage";
import InjuriesPage from "./pages/InjuriesPage";
import PlayerPage from "./pages/PlayerPage";
import TeamPage from "./pages/TeamPage";
import AdminPage from "./pages/AdminPage";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <BrowserRouter>
      <TopTabs />
      {/* Wrap the main area with ErrorBoundary so that unexpected errors in
          nested pages/components do not crash the entire app */}
      <ErrorBoundary>
        <main className="appMain">
          <Routes>
            <Route path="/" element={<StartPage />} />
            <Route path="/start" element={<StartPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/cards" element={<PrototypePage />} />
            <Route path="/depth-chart" element={<DepthChartPage />} />
            <Route path="/play-by-play" element={<PlayByPlayTab />} />
            <Route path="/matchups" element={<MatchupComparisonPage />} />
            <Route path="/standings" element={<StandingsPage />} />
            <Route path="/betting" element={<BettingPage />} />
            <Route path="/injuries" element={<InjuriesPage />} />
            <Route path="/player/:id" element={<PlayerPage />} />
            <Route path="/team/:abbr" element={<TeamPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

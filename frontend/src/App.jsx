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

export default function App() {
  return (
    <BrowserRouter>
      <TopTabs />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
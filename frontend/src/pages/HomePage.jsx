import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import KenneyPlaysBackground from "../ui/backgrounds/KenneyPlaysBackground";
import LottiePlaysBackground from "../ui/backgrounds/LottiePlaysBackground";

export default function HomePage() {
  const navigate = useNavigate();

  const defaultMode = (import.meta.env.VITE_HOME_BG_MODE || "kenney").toLowerCase();
  const [mode, setMode] = useState(defaultMode);

  const [players, setPlayers] = useState([]);
  const [football, setFootball] = useState({ cx: 50, cy: 25 });
  const [highlightYardLines, setHighlightYardLines] = useState([20, 50, 80]);
  const [routes, setRoutes] = useState([]);
  const [dots, setDots] = useState([]);
  const [teamColors, setTeamColors] = useState({ home: "blue", away: "red" });

  // Predefined random plays
  const randomPlays = [
    {
      routes: [
        "M20,25 C30,20 40,30 50,25",
        "M30,25 C40,30 50,20 60,25",
      ],
      dots: [
        { cx: 20, cy: 25 },
        { cx: 30, cy: 25 },
      ],
      football: { cx: 45, cy: 25 },
      players: [
        { cx: 20, cy: 25, team: "home" },
        { cx: 30, cy: 25, team: "away" },
      ],
    },
    {
      routes: [
        "M40,25 C50,20 60,30 70,25",
        "M50,25 C60,30 70,20 80,25",
      ],
      dots: [
        { cx: 40, cy: 25 },
        { cx: 50, cy: 25 },
      ],
      football: { cx: 65, cy: 25 },
      players: [
        { cx: 40, cy: 25, team: "home" },
        { cx: 50, cy: 25, team: "away" },
      ],
    },
  ];

  // Function to generate random colors
  const generateRandomColors = () => {
    const randomColor = () => `#${Math.floor(Math.random() * 16777215).toString(16)}`;
    return { home: randomColor(), away: randomColor() };
  };

  // Function to trigger random play
  const triggerRandomPlay = () => {
    const randomPlay = randomPlays[Math.floor(Math.random() * randomPlays.length)];
    setRoutes(randomPlay.routes);
    setDots(randomPlay.dots);
    setFootball(randomPlay.football);
    setPlayers(randomPlay.players);
    setTeamColors(generateRandomColors()); // Assign random team colors
  };

  // Trigger random play every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      triggerRandomPlay();
    }, 5000);

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);

  const bg = useMemo(() => {
    if (mode === "kenney") {
      return (
        <KenneyPlaysBackground
          players={players.map((player) => ({
            ...player,
            helmet: player.team === "home" ? "/kenney/helmet_home.svg" : "/kenney/helmet_away.svg",
            color: teamColors[player.team], // Assign team colors to players
          }))}
          football={football}
          highlightYardLines={highlightYardLines}
          routes={routes}
          dots={dots}
          penalty={false} // No penalty logic for homepage
        />
      );
    }
    if (mode === "lottie") return <LottiePlaysBackground />;
    return null;
  }, [mode, players, football, highlightYardLines, routes, dots, teamColors]);

  return (
    <section className="homeWrap">
      <div className="homeBg" aria-hidden="true">
        {bg}
        <div className="bgOverlay" />
        <div className="bgGrid" />
      </div>

      <div className="homeContent">
        <div className="homeHero">
          <div className="pill">HOME</div>
          <h1 className="homeTitle">Sideline Studio</h1>
          <p className="homeText">
            Pro football companion with animated Kenney sprites, American-football Lottie loops, and quick jumps to
            depth charts, play-by-play, and matchup tools.
          </p>

          <div className="homeCtas">
            <button className="primaryBtn" onClick={() => navigate("/depth-chart")} type="button">
              Go to Depth Chart
            </button>
            <button className="ghostBtn" onClick={() => navigate("/cards")} type="button">
              Go to Cards
            </button>
            <button className="primaryBtn alt" onClick={() => navigate("/play-by-play")} type="button">
              Play-by-Play
            </button>
          </div>

          <div className="modeRow">
            <span className="modeLabel">Background:</span>
            <button
              className={`modeBtn ${mode === "kenney" ? "active" : ""}`}
              onClick={() => setMode("kenney")}
              type="button"
            >
              Kenney
            </button>
            <button
              className={`modeBtn ${mode === "lottie" ? "active" : ""}`}
              onClick={() => setMode("lottie")}
              type="button"
            >
              Lottie
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
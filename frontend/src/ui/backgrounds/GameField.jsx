import React, { useState } from "react";
import KenneyPlaysBackground from "../ui/backgrounds/KenneyPlaysBackground";

export default function GameField() {
  const [highlightYardLines, setHighlightYardLines] = useState([20, 50, 80]);
  const [football, setFootball] = useState({ cx: 50, cy: 25 });
  const [downMarker, setDownMarker] = useState({ cx: 40, cy: 25 });
  const [conversionMarker, setConversionMarker] = useState({ cx: 60, cy: 25 });
  const [penalty, setPenalty] = useState(false);

  const defaultFormation = [
    // Home Team
    { cx: 20, cy: 25, team: "home" }, // Quarterback
    { cx: 18, cy: 23, team: "home" }, // Running Back
    { cx: 22, cy: 23, team: "home" }, // Wide Receiver
    { cx: 18, cy: 27, team: "home" }, // Tight End
    { cx: 22, cy: 27, team: "home" }, // Wide Receiver
    { cx: 16, cy: 25, team: "home" }, // Offensive Lineman
    { cx: 14, cy: 23, team: "home" }, // Offensive Lineman
    { cx: 14, cy: 27, team: "home" }, // Offensive Lineman
    { cx: 12, cy: 25, team: "home" }, // Offensive Lineman
    { cx: 10, cy: 23, team: "home" }, // Offensive Lineman
    { cx: 10, cy: 27, team: "home" }, // Offensive Lineman
    { cx: 8, cy: 25, team: "home" }, // Offensive Lineman

    // Away Team
    { cx: 80, cy: 25, team: "away" }, // Defensive Back
    { cx: 78, cy: 23, team: "away" }, // Linebacker
    { cx: 82, cy: 23, team: "away" }, // Linebacker
    { cx: 78, cy: 27, team: "away" }, // Defensive Back
    { cx: 82, cy: 27, team: "away" }, // Defensive Back
    { cx: 76, cy: 25, team: "away" }, // Defensive Lineman
    { cx: 74, cy: 23, team: "away" }, // Defensive Lineman
    { cx: 74, cy: 27, team: "away" }, // Defensive Lineman
    { cx: 72, cy: 25, team: "away" }, // Defensive Lineman
    { cx: 70, cy: 23, team: "away" }, // Defensive Lineman
    { cx: 70, cy: 27, team: "away" }, // Defensive Lineman
    { cx: 68, cy: 25, team: "away" }, // Defensive Lineman
  ];

  const updateYardLines = () => {
    setHighlightYardLines([30, 60, 90]); // Example: Update yard lines dynamically
    setFootball({ cx: 45, cy: 25 }); // Move football dynamically
    setDownMarker({ cx: 35, cy: 25 }); // Update down marker position
    setConversionMarker({ cx: 55, cy: 25 }); // Update conversion marker position
  };

  const triggerPenalty = () => {
    setPenalty(true);
    setTimeout(() => setPenalty(false), 2000); // Reset penalty after 2 seconds
  };

  return (
    <div style={{ width: "100%", height: "500px", position: "relative" }}>
      <button onClick={updateYardLines} style={{ position: "absolute", zIndex: 10, left: "10px" }}>
        Next Play
      </button>
      <button onClick={triggerPenalty} style={{ position: "absolute", zIndex: 10, left: "100px" }}>
        Trigger Penalty
      </button>
      <KenneyPlaysBackground
        players={defaultFormation}
        football={football}
        downMarker={downMarker}
        conversionMarker={conversionMarker}
        highlightYardLines={highlightYardLines}
        routes={[
          "M80,520 C260,520 240,280 440,280 C620,280 640,140 820,140",
        ]}
        dots={[
          { cx: 80, cy: 520 },
          { cx: 120, cy: 160 },
        ]}
        penalty={penalty}
      />
    </div>
  );
}
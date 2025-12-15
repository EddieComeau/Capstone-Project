// src/pages/DepthChartPage.jsx
import React, { useMemo, useState } from "react";
import TeamBadge from "../components/common/TeamBadge";
import "./depthChart.css";

function SlotCard({ player }) {
  return (
    <div className="dcCard">
      <div className="dcTop">
        <div className="dcPos">{player.position}</div>
        <TeamBadge abbr={player.team} size={22} />
      </div>
      <div className="dcName">{player.name}</div>
      <div className="dcMeta">
        #{player.number} • {player.depthLabel}
      </div>
    </div>
  );
}

export default function DepthChartPage() {
  const [tab, setTab] = useState("OFF");

  // Placeholder data (swap later with your BALDONTLIE-fed roster/depth logic)
  const roster = useMemo(
    () => ({
      OFF: [
        { position: "QB1", name: "Starter QB", number: 12, team: "KC", depthLabel: "Starter" },
        { position: "RB1", name: "Starter RB", number: 22, team: "KC", depthLabel: "Starter" },
        { position: "WR1", name: "WR One", number: 10, team: "KC", depthLabel: "Starter" },
        { position: "WR2", name: "WR Two", number: 11, team: "KC", depthLabel: "Starter" },
        { position: "TE1", name: "Starter TE", number: 87, team: "KC", depthLabel: "Starter" },
        { position: "LT", name: "Left Tackle", number: 77, team: "KC", depthLabel: "Starter" },
        { position: "LG", name: "Left Guard", number: 65, team: "KC", depthLabel: "Starter" },
        { position: "C", name: "Center", number: 62, team: "KC", depthLabel: "Starter" },
        { position: "RG", name: "Right Guard", number: 64, team: "KC", depthLabel: "Starter" },
        { position: "RT", name: "Right Tackle", number: 71, team: "KC", depthLabel: "Starter" },
      ],
      DEF: [
        { position: "CB1", name: "Corner 1", number: 2, team: "SF", depthLabel: "Starter" },
        { position: "CB2", name: "Corner 2", number: 24, team: "SF", depthLabel: "Starter" },
        { position: "FS", name: "Free Safety", number: 20, team: "SF", depthLabel: "Starter" },
        { position: "SS", name: "Strong Safety", number: 29, team: "SF", depthLabel: "Starter" },
        { position: "MLB", name: "Middle LB", number: 54, team: "SF", depthLabel: "Starter" },
        { position: "OLB", name: "Outside LB", number: 51, team: "SF", depthLabel: "Starter" },
        { position: "DE1", name: "Edge 1", number: 97, team: "SF", depthLabel: "Starter" },
        { position: "DE2", name: "Edge 2", number: 94, team: "SF", depthLabel: "Starter" },
        { position: "DT1", name: "DT 1", number: 99, team: "SF", depthLabel: "Starter" },
        { position: "DT2", name: "DT 2", number: 91, team: "SF", depthLabel: "Starter" },
      ],
      ST: [
        { position: "K", name: "Kicker", number: 7, team: "DAL", depthLabel: "Starter" },
        { position: "P", name: "Punter", number: 5, team: "DAL", depthLabel: "Starter" },
        { position: "KR", name: "Kick Returner", number: 1, team: "DAL", depthLabel: "Return" },
        { position: "PR", name: "Punt Returner", number: 3, team: "DAL", depthLabel: "Return" },
        { position: "LS", name: "Long Snapper", number: 46, team: "DAL", depthLabel: "Starter" },
      ],
    }),
    []
  );

  const tabs = [
    { key: "OFF", label: "Offense" },
    { key: "DEF", label: "Defense" },
    { key: "ST", label: "Special Teams" },
  ];

  return (
    <div className="dcPage">
      <div className="dcHeader">
        <h2 className="dcTitle">Depth Chart</h2>
        <div className="dcTabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`dcTab ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dcGrid">
        {roster[tab].map((p) => (
          <SlotCard key={p.position} player={p} />
        ))}
      </div>
    </div>
  );
}

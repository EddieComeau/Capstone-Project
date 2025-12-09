// src/components/cards/SkillCard.jsx
import React from "react";

export default function SkillCard({ card }) {
  const m = card.metrics || {};

  return (
    <div className="card skill-card">
      <div className="card-header">
        {card.photo && (
          <img src={card.photo} alt={card.name} className="card-photo" />
        )}
        <div className="card-header-text">
          <h2>{card.name}</h2>
          <div className="card-subtitle">
            {card.team} • {card.position}
          </div>
          <div className="card-subtitle">
            Season {card.season} • Week {card.week}
          </div>
        </div>
      </div>

      <div className="card-body">
        {/* Example metric rendering – swap in whatever fields your API actually returns */}
        <div className="metric-row">
          <span>Speed Score</span>
          <span>{m.SpeedScore ?? "-"}</span>
        </div>
        <div className="metric-row">
          <span>Burst Score</span>
          <span>{m.BurstScore ?? "-"}</span>
        </div>
        <div className="metric-row">
          <span>Agility Score</span>
          <span>{m.AgilityScore ?? "-"}</span>
        </div>
        <div className="metric-row">
          <span>College Dominator</span>
          <span>{m.CollegeDominator ?? "-"}</span>
        </div>
        <div className="metric-row">
          <span>Breakout Age</span>
          <span>{m.BreakoutAge ?? "-"}</span>
        </div>
      </div>
    </div>
  );
}

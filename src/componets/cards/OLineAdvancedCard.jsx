// src/components/cards/OLineAdvancedCard.jsx
import React from "react";

export default function OLineAdvancedCard({ card }) {
  const eff = card.efficiency || {};

  return (
    <div className="card oline-advanced-card">
      <div className="card-header">
        {card.photo && (
          <img src={card.photo} alt={card.name} className="card-photo" />
        )}
        <div className="card-header-text">
          <h2>{card.name}</h2>
          <div className="card-subtitle">
            {card.team} • {card.position}
          </div>
        </div>
      </div>

      <div className="card-body">
        <h4>Pressure & Sacks (Estimates / Advanced)</h4>
        <div className="metric-row">
          <span>Pressures Allowed</span>
          <span>{card.pressuresAllowed ?? "-"}</span>
        </div>
        <div className="metric-row">
          <span>Sacks Allowed</span>
          <span>{card.sacksAllowed ?? "-"}</span>
        </div>

        <hr />

        <h4>Efficiency</h4>
        <div className="metric-row">
          <span>Pass Efficiency</span>
          <span>{eff.pass ?? "-"}</span>
        </div>
        <div className="metric-row">
          <span>Run Efficiency</span>
          <span>{eff.run ?? "-"}</span>
        </div>
        <div className="metric-row">
          <span>Total Efficiency</span>
          <span>{eff.total ?? "-"}</span>
        </div>

        <hr />

        <h4>Win Rates</h4>
        <div className="metric-row">
          <span>Pass Block Win %</span>
          <span>{card.passBlockWinRate ?? "-"}</span>
        </div>
        <div className="metric-row">
          <span>Run Block Win %</span>
          <span>{card.runBlockWinRate ?? "-"}</span>
        </div>
      </div>
    </div>
  );
}

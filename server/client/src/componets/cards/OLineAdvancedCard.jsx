// client/src/components/cards/OLineAdvancedCard.jsx
import React from "react";

function OLineAdvancedCard({ card }) {
  const {
    name,
    position,
    team,
    photo,
    pressuresAllowed,
    sacksAllowed,
    runBlockWinRate,
    passBlockWinRate,
    efficiency = {},
  } = card;

  return (
    <article className="card card-oline-advanced">
      <header className="card-header">
        {photo && <img src={photo} alt={name} className="card-photo" />}
        <div>
          <div className="card-name">{name}</div>
          <div className="card-subtitle">
            {position} • {team}
          </div>
        </div>
      </header>
      <div className="card-body">
        <div className="card-metric">
          <span className="label">Pressures</span>
          <span className="value">{pressuresAllowed ?? "—"}</span>
        </div>
        <div className="card-metric">
          <span className="label">Sacks</span>
          <span className="value">{sacksAllowed ?? "—"}</span>
        </div>
        <div className="card-metric">
          <span className="label">PB Win%</span>
          <span className="value">
            {passBlockWinRate != null
              ? (passBlockWinRate * 100).toFixed(1) + "%"
              : "—"}
          </span>
        </div>
        <div className="card-metric">
          <span className="label">RB Win%</span>
          <span className="value">
            {runBlockWinRate != null
              ? (runBlockWinRate * 100).toFixed(1) + "%"
              : "—"}
          </span>
        </div>
        <div className="card-metric">
          <span className="label">Eff</span>
          <span className="value">
            {efficiency.total != null ? efficiency.total.toFixed(1) : "—"}
          </span>
        </div>
      </div>
    </article>
  );
}

export default OLineAdvancedCard;

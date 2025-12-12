// client/src/components/cards/DefenseCard.jsx
import React from "react";

function DefenseCard({ card }) {
  const { name, position, team, photo, snaps = {}, coverage = {}, tackling = {}, passRush = {} } =
    card;

  return (
    <article className="card card-defense">
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
          <span className="label">Snaps</span>
          <span className="value">{snaps.total ?? "—"}</span>
        </div>
        <div className="card-metric">
          <span className="label">Tkl</span>
          <span className="value">
            {tackling.solo != null || tackling.assisted != null
              ? (tackling.solo || 0) + (tackling.assisted || 0)
              : "—"}
          </span>
        </div>
        <div className="card-metric">
          <span className="label">Sacks</span>
          <span className="value">{passRush.sacks ?? "—"}</span>
        </div>
        <div className="card-metric">
          <span className="label">INT</span>
          <span className="value">{coverage.interceptions ?? "—"}</span>
        </div>
        <div className="card-metric">
          <span className="label">PBUs</span>
          <span className="value">{coverage.passBreakups ?? "—"}</span>
        </div>
      </div>
    </article>
  );
}

export default DefenseCard;

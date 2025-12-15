// client/src/components/cards/OLineCard.jsx
import React from "react";

function OLineCard({ card }) {
  const { name, position, team, photo, lineGrade = {}, snaps = {} } = card;

  return (
    <article className="card card-oline">
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
          <span className="label">Overall</span>
          <span className="value">
            {lineGrade.overall != null ? lineGrade.overall.toFixed(1) : "—"}
          </span>
        </div>
        <div className="card-metric">
          <span className="label">Pass</span>
          <span className="value">
            {lineGrade.passGrade != null
              ? lineGrade.passGrade.toFixed(1)
              : "—"}
          </span>
        </div>
        <div className="card-metric">
          <span className="label">Run</span>
          <span className="value">
            {lineGrade.runGrade != null
              ? lineGrade.runGrade.toFixed(1)
              : "—"}
          </span>
        </div>
        <div className="card-metric">
          <span className="label">Snaps</span>
          <span className="value">{snaps.total ?? "—"}</span>
        </div>
      </div>
    </article>
  );
}

export default OLineCard;

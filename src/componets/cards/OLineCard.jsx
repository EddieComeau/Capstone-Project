// src/components/cards/OLineCard.jsx
import React from "react";

export default function OLineCard({ card }) {
  const snaps = card.snaps || {};
  const grade = card.lineGrade || {};

  return (
    <div className="card oline-card">
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
        <h4>Snaps</h4>
        <div className="metric-row">
          <span>Total</span>
          <span>{snaps.total ?? 0}</span>
        </div>
        <div className="metric-row">
          <span>Run</span>
          <span>{snaps.run ?? 0}</span>
        </div>
        <div className="metric-row">
          <span>Pass</span>
          <span>{snaps.pass ?? 0}</span>
        </div>

        <hr />

        <h4>Line Grade</h4>
        <div className="metric-row">
          <span>Pass</span>
          <span>{grade.passGrade ?? "-"}</span>
        </div>
        <div className="metric-row">
          <span>Run</span>
          <span>{grade.runGrade ?? "-"}</span>
        </div>
        <div className="metric-row">
          <span>Overall</span>
          <span>{grade.overall ?? "-"}</span>
        </div>
      </div>
    </div>
  );
}

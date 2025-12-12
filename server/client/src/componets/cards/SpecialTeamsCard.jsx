// client/src/components/cards/SpecialTeamsCard.jsx
import React from "react";

function SpecialTeamsCard({ card }) {
  const {
    name,
    position,
    team,
    photo,
    kicking = {},
    punting = {},
    returning = {},
  } = card;

  return (
    <article className="card card-special-teams">
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
          <span className="label">FG</span>
          <span className="value">
            {kicking.fgMade != null && kicking.fgAttempted != null
              ? `${kicking.fgMade}/${kicking.fgAttempted}`
              : "—"}
          </span>
        </div>
        <div className="card-metric">
          <span className="label">XP</span>
          <span className="value">
            {kicking.xpMade != null && kicking.xpAttempted != null
              ? `${kicking.xpMade}/${kicking.xpAttempted}`
              : "—"}
          </span>
        </div>
        <div className="card-metric">
          <span className="label">Punts</span>
          <span className="value">{punting.punts ?? "—"}</span>
        </div>
        <div className="card-metric">
          <span className="label">Ret Yds</span>
          <span className="value">
            {returning.kickReturnYards != null ||
            returning.puntReturnYards != null
              ? (returning.kickReturnYards || 0) +
                (returning.puntReturnYards || 0)
              : "—"}
          </span>
        </div>
        <div className="card-metric">
          <span className="label">Ret TD</span>
          <span className="value">{returning.tds ?? "—"}</span>
        </div>
      </div>
    </article>
  );
}

export default SpecialTeamsCard;

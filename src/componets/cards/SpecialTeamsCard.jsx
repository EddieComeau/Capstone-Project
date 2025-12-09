// src/components/cards/SpecialTeamsCard.jsx
import React from "react";

export default function SpecialTeamsCard({ card }) {
  const k = card.kicking || {};
  const p = card.punting || {};
  const r = card.returning || {};
  const s = card.snapping || {};
  const g = card.gunner || {};

  return (
    <div className="card special-teams-card">
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
        <h4>Kicking</h4>
        <div className="metric-row">
          <span>FG (M / A)</span>
          <span>
            {k.fgMade ?? 0} / {k.fgAttempted ?? 0}
          </span>
        </div>
        <div className="metric-row">
          <span>FG Long</span>
          <span>{k.fgLong ?? "-"}</span>
        </div>
        <div className="metric-row">
          <span>XP (M / A)</span>
          <span>
            {k.xpMade ?? 0} / {k.xpAttempted ?? 0}
          </span>
        </div>

        <hr />

        <h4>Punting</h4>
        <div className="metric-row">
          <span>Punts</span>
          <span>{p.punts ?? 0}</span>
        </div>
        <div className="metric-row">
          <span>Yards / Net</span>
          <span>
            {p.yards ?? 0} / {p.netYards ?? 0}
          </span>
        </div>
        <div className="metric-row">
          <span>Inside 20</span>
          <span>{p.inside20 ?? 0}</span>
        </div>
        <div className="metric-row">
          <span>Long</span>
          <span>{p.long ?? "-"}</span>
        </div>

        <hr />

        <h4>Returns</h4>
        <div className="metric-row">
          <span>Kick Returns (Yds)</span>
          <span>
            {r.kickReturns ?? 0} ({r.kickReturnYards ?? 0})
          </span>
        </div>
        <div className="metric-row">
          <span>Punt Returns (Yds)</span>
          <span>
            {r.puntReturns ?? 0} ({r.puntReturnYards ?? 0})
          </span>
        </div>
        <div className="metric-row">
          <span>TDs</span>
          <span>{r.touchdowns ?? 0}</span>
        </div>

        <hr />

        <h4>ST Roles</h4>
        <div className="metric-row">
          <span>LS Snaps</span>
          <span>{s.snaps ?? "-"}</span>
        </div>
        <div className="metric-row">
          <span>LS Errors</span>
          <span>{s.errors ?? "-"}</span>
        </div>
        <div className="metric-row">
          <span>Gunner Tackles</span>
          <span>{g.tackles ?? 0}</span>
        </div>
        <div className="metric-row">
          <span>Gunner FF</span>
          <span>{g.forcedFumbles ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

// src/components/cards/DefenseCard.jsx
import React from "react";

export default function DefenseCard({ card }) {
  const snaps = card.snaps || {};
  const cov = card.coverage || {};
  const t = card.tackling || {};
  const pr = card.passRush || {};

  return (
    <div className="card defense-card">
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
          <span>Box / Slot / Deep</span>
          <span>
            {snaps.box ?? 0} / {snaps.slot ?? 0} / {snaps.deep ?? 0}
          </span>
        </div>

        <hr />

        <h4>Coverage</h4>
        <div className="metric-row">
          <span>Targets</span>
          <span>{cov.targets ?? "-"}</span>
        </div>
        <div className="metric-row">
          <span>Rec / Yards / TD</span>
          <span>
            {cov.receptionsAllowed ?? "-"} / {cov.yardsAllowed ?? "-"} /{" "}
            {cov.touchdownsAllowed ?? "-"}
          </span>
        </div>
        <div className="metric-row">
          <span>INT / PBU</span>
          <span>
            {cov.interceptions ?? 0} / {cov.passBreakups ?? 0}
          </span>
        </div>
        <div className="metric-row">
          <span>QB Rating Allowed</span>
          <span>{cov.qbRatingAllowed ?? "-"}</span>
        </div>

        <hr />

        <h4>Tackling</h4>
        <div className="metric-row">
          <span>Tackles / Assists</span>
          <span>
            {t.tackles ?? 0} / {t.assisted ?? 0}
          </span>
        </div>
        <div className="metric-row">
          <span>Stops</span>
          <span>{t.stops ?? "-"}</span>
        </div>
        <div className="metric-row">
          <span>Missed</span>
          <span>{t.missed ?? "-"}</span>
        </div>

        <hr />

        <h4>Pass Rush</h4>
        <div className="metric-row">
          <span>Sacks</span>
          <span>{pr.sacks ?? 0}</span>
        </div>
        <div className="metric-row">
          <span>Pressures / Hits</span>
          <span>
            {pr.pressures ?? "-"} / {pr.hits ?? "-"}
          </span>
        </div>
      </div>
    </div>
  );
}

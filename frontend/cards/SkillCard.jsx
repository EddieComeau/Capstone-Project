// client/src/components/cards/SkillCard.jsx
import React from "react";

function SkillCard({ card }) {
  const { name, position, team, photo, metrics = {} } = card;

  // Pick a few likely advanced fields, but render gracefully if missing.
  const {
    epa_per_play,
    success_rate,
    yards_after_contact_per_attempt,
    air_yards,
    catch_rate,
  } = metrics;

  return (
    <article className="card card-skill">
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
          <span className="label">EPA/play</span>
          <span className="value">
            {epa_per_play != null ? epa_per_play.toFixed(3) : "—"}
          </span>
        </div>
        <div className="card-metric">
          <span className="label">Success%</span>
          <span className="value">
            {success_rate != null
              ? (success_rate * 100).toFixed(1) + "%"
              : "—"}
          </span>
        </div>
        <div className="card-metric">
          <span className="label">YAC/att</span>
          <span className="value">
            {yards_after_contact_per_attempt != null
              ? yards_after_contact_per_attempt.toFixed(2)
              : "—"}
          </span>
        </div>
        <div className="card-metric">
          <span className="label">Air Yds</span>
          <span className="value">{air_yards ?? "—"}</span>
        </div>
        <div className="card-metric">
          <span className="label">Catch%</span>
          <span className="value">
            {catch_rate != null ? (catch_rate * 100).toFixed(1) + "%" : "—"}
          </span>
        </div>
      </div>
    </article>
  );
}

export default SkillCard;

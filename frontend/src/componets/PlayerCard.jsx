// src/components/PlayerCard.jsx
import Card from './Card'
import './PlayerCard.css'

function PlayerCard({ player }) {
  const { name, team, position, number, stats, tier } = player

  const accent =
    team === 'KC'
      ? 'chiefs'
      : team === 'SF'
      ? '49ers'
      : 'default'

  return (
    <Card tier={tier} accent={accent}>
      <div className="player-card-header">
        <div className="player-meta">
          <span className="player-position">{position}</span>
          <span className="player-team">{team}</span>
        </div>
        <div className="player-number">
          #{number}
        </div>
      </div>

      <div className="player-name">
        {name}
      </div>

      <div className="player-tier-badge">
        {tier}
      </div>

      <div className="player-stats-grid">
        <div className="player-stat">
          <span className="label">Yards</span>
          <span className="value">{stats.yards ?? '--'}</span>
        </div>
        <div className="player-stat">
          <span className="label">TD</span>
          <span className="value">{stats.touchdowns ?? '--'}</span>
        </div>
        <div className="player-stat">
          <span className="label">INT</span>
          <span className="value">
            {stats.interceptions ?? '--'}
          </span>
        </div>
        <div className="player-stat">
          <span className="label">Rating</span>
          <span className="value">
            {stats.rating ?? '--'}
          </span>
        </div>
      </div>

      <div className="player-footer">
        <span className="player-id-chip">NFL Cards 4.0</span>
        <span className="player-season-tag">2023 Season</span>
      </div>
    </Card>
  )
}

export default PlayerCard

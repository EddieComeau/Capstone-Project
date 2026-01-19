// src/components/PlayerCard.jsx
import Card from './Card'
import './PlayerCard.css'

function PlayerCard({ player }) {
  const {
    name,
    team,
    position,
    number,
    statLines = [],
    season,
    tier = 'Base',
    grade,
  } = player

  const accent =
    team === 'KC'
      ? 'chiefs'
      : team === 'SF'
      ? '49ers'
      : team === 'PHI'
      ? 'eagles'
      : 'default'

  const lines = statLines.length
    ? statLines
    : [
        { label: 'Yards', value: '--' },
        { label: 'TD', value: '--' },
        { label: 'INT', value: '--' },
        { label: 'Rating', value: '--' },
      ]
  const gradeValue =
    typeof grade === 'number' ? grade : grade && typeof grade.value === 'number' ? grade.value : null
  const formatValue = (value) => {
    if (value == null) return '--'
    if (typeof value === 'string') return value
    if (Number.isNaN(Number(value))) return '--'
    const num = Number(value)
    if (Number.isInteger(num)) return `${num}`
    return num.toFixed(1)
  }

  return (
    <Card tier={tier} accent={accent}>
      <div className="player-card-header">
        <div className="player-meta">
          <span className="player-position">{position}</span>
          <span className="player-team">{team}</span>
        </div>
        <div className="player-number">#{number ?? "--"}</div>
      </div>

      <div className="player-name">{name}</div>

      <div className="player-tier-badge">{tier}</div>
      {gradeValue != null ? (
        <div className="player-grade-badge">Grade {Math.round(gradeValue)} / 100</div>
      ) : null}

      <div className="player-stats-grid">
        {lines.map((line) => (
          <div key={line.label} className="player-stat">
            <span className="label">{line.label}</span>
            <span className="value">{formatValue(line.value)}</span>
          </div>
        ))}
      </div>

      <div className="player-footer">
        <span className="player-id-chip">Sideline Studio</span>
        <span className="player-season-tag">{season ? `${season} Season` : 'Season'}</span>
      </div>
    </Card>
  )
}

export default PlayerCard

// src/components/TeamCard.jsx
import Card from './Card'
import './TeamCard.css'

function TeamCard({ team }) {
  const {
    name,
    code,
    division,
    record,
    rank,
    pointsFor,
    pointsAgainst,
  } = team

  const tier = rank && rank <= 2 ? 'Elite' : 'Base'

  return (
    <Card tier={tier} accent="default">
      <div className="team-card-header">
        <div className="team-meta">
          <span className="team-division">{division}</span>
          {typeof rank === 'number' && (
            <span className="team-rank">#{rank} in division</span>
          )}
        </div>
        <div className="team-record">
          {record}
        </div>
      </div>

      <div className="team-name-block">
        <div className="team-name">{name}</div>
        <div className="team-code">{code}</div>
      </div>

      <div className="team-stats-strip">
        <div className="team-stat">
          <span className="label">PF</span>
          <span className="value">{pointsFor ?? '--'}</span>
        </div>
        <div className="team-stat">
          <span className="label">PA</span>
          <span className="value">{pointsAgainst ?? '--'}</span>
        </div>
        <div className="team-stat">
          <span className="label">Diff</span>
          <span className="value">
            {pointsFor != null && pointsAgainst != null
              ? pointsFor - pointsAgainst
              : '--'}
          </span>
        </div>
      </div>

      <div className="team-footer">
        <span className="team-tag">Team Card</span>
        <span className="team-era">2023 Standings</span>
      </div>
    </Card>
  )
}

export default TeamCard

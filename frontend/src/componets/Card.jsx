// src/components/Card.jsx
import './Card.css'

function Card({ children, tier = 'Base', accent = 'default' }) {
  const tierClass = `card-tier-${String(tier).toLowerCase()}`
  const accentClass = `card-accent-${accent}`

  return (
    <div className={`card ${tierClass} ${accentClass}`}>
      {children}
    </div>
  )
}

export default Card

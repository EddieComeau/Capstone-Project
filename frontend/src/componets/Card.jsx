// src/components/Card.jsx
import './Card.css'

function Card({ children, tier = 'Base', accent = 'default' }) {
  return (
    <div className={`card card-tier-${tier.toLowerCase()} card-accent-${accent}`}>
      {children}
    </div>
  )
}

export default Card

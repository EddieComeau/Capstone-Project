// src/components/Card.jsx
import './Card.css'

function Card({ children, tier = 'Base', accent = 'default', onClick }) {
  const tierClass = `card-tier-${String(tier).toLowerCase()}`
  const accentClass = `card-accent-${accent}`
  const isClickable = typeof onClick === 'function'

  return (
    <div
      className={`card ${tierClass} ${accentClass}`}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  )
}

export default Card

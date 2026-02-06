import './RadioCard.css'

function RadioCard({ 
  icon, 
  label, 
  selected = false, 
  onClick,
  value 
}) {
  return (
    <button
      className={`radio-card ${selected ? 'radio-card-selected' : ''}`}
      onClick={() => onClick?.(value)}
      type="button"
    >
      <div className="radio-card-icon">{icon}</div>
      <span className="radio-card-label">{label}</span>
      <div className="radio-card-indicator">
        {selected ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="9" fill="#5DAF2E" stroke="#5DAF2E" strokeWidth="2"/>
            <path d="M6 10L9 13L14 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <div className="radio-card-indicator-empty" />
        )}
      </div>
    </button>
  )
}

export default RadioCard


import './MealCard.css'

function MealCard({ mealType, time, title, description, tag, onClick, onReplaceClick }) {
  return (
    <section className="meal-section">
      <header className="meal-section-header">
        <h2 className="meal-section-title">{mealType}</h2>
        {time && <span className="meal-section-time">{time}</span>}
      </header>

      <div className={`meal-card${onClick ? ' meal-card--clickable' : ''}`} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick} onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); if (e.key === 'Enter') onClick(); } : undefined}>
        <div className="meal-card-image" aria-hidden="true" />
        <div className="meal-card-content">
          <div className="meal-card-text">
            <div className="meal-card-title">{title}</div>
            <div className="meal-card-description">{description}</div>
          </div>
          {tag && <div className="meal-card-tag">{tag}</div>}
          {onReplaceClick && (
            <button type="button" className="meal-card-replace" onClick={(e) => { e.stopPropagation(); onReplaceClick(); }} aria-label="Заменить блюдо">
              <img src="/zam.svg" alt="" width={12} height={12} aria-hidden="true" />
              <span>Заменить</span>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

export default MealCard


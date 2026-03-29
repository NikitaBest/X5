import { useCallback, useEffect, useState } from 'react'
import logger from '../utils/logger.js'
import './MealCard.css'

const PLACEHOLDER_SRC = '/meal-placeholder.svg'

function MealCard({ mealType, time, title, description, tag, imageUrl, onClick, onReplaceClick }) {
  const [imageBroken, setImageBroken] = useState(false)

  useEffect(() => {
    setImageBroken(false)
  }, [imageUrl])

  const handleImageError = useCallback(
    (e) => {
      const el = e?.currentTarget
      const failedSrc = el?.src || ''
      if (failedSrc.includes('meal-placeholder')) return
      if (!imageUrl || imageBroken) return
      logger.warn('meal_card_image_load_failed', {
        imageUrl: String(imageUrl).slice(0, 500),
        title: typeof title === 'string' ? title.slice(0, 120) : '',
      })
      setImageBroken(true)
    },
    [imageUrl, imageBroken, title],
  )

  const showRemote = Boolean(imageUrl) && !imageBroken
  const imgSrc = showRemote ? imageUrl : PLACEHOLDER_SRC

  return (
    <section className="meal-section">
      <header className="meal-section-header">
        <h2 className="meal-section-title">{mealType}</h2>
        {time && <span className="meal-section-time">{time}</span>}
      </header>

      <div className={`meal-card${onClick ? ' meal-card--clickable' : ''}`} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} onClick={onClick} onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault(); if (e.key === 'Enter') onClick(); } : undefined}>
        <div className={`meal-card-image${showRemote ? ' meal-card-image--photo' : ''}`} aria-hidden="true">
          <img
            className="meal-card-thumb"
            src={imgSrc}
            alt=""
            loading="lazy"
            decoding="async"
            onError={handleImageError}
          />
        </div>
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


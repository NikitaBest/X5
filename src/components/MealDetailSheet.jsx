import { useEffect, useRef, useState } from 'react'
import './MealDetailSheet.css'

function MealDetailSheet({ open, onClose, meal, mealType, slotIndex, alternatives = [], onReplaceMeal, initialView = 'detail' }) {
  const sheetRef = useRef(null)
  const startYRef = useRef(null)
  const [isClosing, setIsClosing] = useState(false)
  const [isAnimatedOpen, setIsAnimatedOpen] = useState(false)
  const [view, setView] = useState('detail')
  const [previewMeal, setPreviewMeal] = useState(null)

  useEffect(() => {
    if (!open) {
      setIsAnimatedOpen(false)
      setView('detail')
      setPreviewMeal(null)
      return undefined
    }
    setView(initialView === 'alternatives' ? 'alternatives' : 'detail')
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsAnimatedOpen(true))
    })
    return () => cancelAnimationFrame(id)
  }, [open, initialView])

  useEffect(() => {
    if (!open) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (view === 'alternatives') {
          if (previewMeal) setPreviewMeal(null)
          else setView('detail')
        } else handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, view, previewMeal])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      setIsAnimatedOpen(false)
      setView('detail')
      onClose?.()
    }, 280)
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      if (view === 'alternatives') {
        if (previewMeal) setPreviewMeal(null)
        else setView('detail')
      } else handleClose()
    }
  }

  const handleTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    const startY = startYRef.current
    if (startY == null) return
    const deltaY = e.changedTouches[0].clientY - startY
    if (deltaY > 50) {
      if (view === 'alternatives') {
        if (previewMeal) setPreviewMeal(null)
        else setView('detail')
      } else handleClose()
    }
    startYRef.current = null
  }

  const handleSelectAlternative = (alt) => {
    if (typeof slotIndex !== 'number' || !onReplaceMeal) return
    onReplaceMeal(slotIndex, alt)
    setPreviewMeal(null)
    onClose?.()
  }

  const handlePreviewSelect = () => {
    if (!previewMeal || typeof slotIndex !== 'number' || !onReplaceMeal) return
    onReplaceMeal(slotIndex, previewMeal)
    setPreviewMeal(null)
    setView('detail')
    onClose?.()
  }

  const isSelected = (alt) => meal && (alt.id === meal.id || (alt.title === meal.title && !alt.id && !meal.id))
  const fallbackImage = '/meal-placeholder.svg'

  if (!open) return null

  const displayMeal = previewMeal || meal
  const total = (displayMeal?.protein ?? 0) + (displayMeal?.fat ?? 0) + (displayMeal?.carbs ?? 0)
  const pShare = total > 0 ? (displayMeal?.protein ?? 0) / total : 1 / 3
  const fShare = total > 0 ? (displayMeal?.fat ?? 0) / total : 1 / 3
  const cShare = total > 0 ? (displayMeal?.carbs ?? 0) / total : 1 / 3

  const list = alternatives.length > 0 ? alternatives : [meal].filter(Boolean)

  return (
    <div
      className={`meal-sheet-backdrop${isClosing ? ' meal-sheet-backdrop--closing' : ''}${isAnimatedOpen ? ' meal-sheet-backdrop--open' : ''}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={sheetRef}
        className={`meal-sheet${isClosing ? ' meal-sheet--closing' : ''}${isAnimatedOpen ? ' meal-sheet--open' : ''}${view === 'alternatives' ? ' meal-sheet--alternatives' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="meal-sheet-handle" />

        {view === 'alternatives' && previewMeal ? (
          <>
            <div className="meal-sheet-alternatives-header meal-sheet-alternatives-header--preview">
              <button type="button" className="meal-sheet-back-btn" onClick={() => setPreviewMeal(null)} aria-label="Назад">
                <span className="meal-sheet-back-arrow" aria-hidden="true">←</span>
              </button>
              <h2 className="meal-sheet-alternatives-title">Описание блюда</h2>
            </div>
            <div className="meal-sheet-image-wrap">
              <div className="meal-sheet-image" aria-hidden="true">
                <img
                  src={previewMeal?.imageUrl || fallbackImage}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = fallbackImage
                  }}
                />
              </div>
            </div>
            <h2 className="meal-sheet-title">{previewMeal?.title}</h2>
            {previewMeal?.statusTag && <div className="meal-sheet-status">{previewMeal.statusTag}</div>}
            <section className="meal-sheet-section">
              <h3 className="meal-sheet-section-title">Состав</h3>
              <div className="meal-sheet-composition">{previewMeal?.composition || ''}</div>
            </section>
            <section className="meal-sheet-section">
              <h3 className="meal-sheet-section-title">Пищевая ценность</h3>
              <p className="meal-sheet-calories">{previewMeal?.calories ?? '—'}</p>
            </section>
            <div className="meal-sheet-bju">
              <div className="meal-sheet-bju-bar">
                <div className="meal-sheet-bju-segment meal-sheet-bju-segment--protein" style={{ flex: pShare }} />
                <div className="meal-sheet-bju-segment meal-sheet-bju-segment--fat" style={{ flex: fShare }} />
                <div className="meal-sheet-bju-segment meal-sheet-bju-segment--carbs" style={{ flex: cShare }} />
              </div>
              <div className="meal-sheet-bju-labels">
                <span className="meal-sheet-bju-label"><span className="meal-sheet-bju-dot meal-sheet-bju-dot--protein" />Белки {previewMeal?.protein ?? '—'}г</span>
                <span className="meal-sheet-bju-label"><span className="meal-sheet-bju-dot meal-sheet-bju-dot--fat" />Жиры {previewMeal?.fat ?? '—'}г</span>
                <span className="meal-sheet-bju-label"><span className="meal-sheet-bju-dot meal-sheet-bju-dot--carbs" />Углев. {previewMeal?.carbs ?? '—'}г</span>
              </div>
            </div>
            <div className="meal-sheet-actions meal-sheet-actions--preview">
              <button type="button" className="meal-sheet-btn meal-sheet-btn--primary" onClick={handlePreviewSelect}>
                Выбрать блюдо
              </button>
            </div>
          </>
        ) : view === 'alternatives' ? (
          <>
            <div className="meal-sheet-alternatives-header">
              <button type="button" className="meal-sheet-back-btn" onClick={() => setView('detail')} aria-label="Назад">
                <span className="meal-sheet-back-arrow" aria-hidden="true">←</span>
              </button>
              <h2 className="meal-sheet-alternatives-title">
                Альтернативы для {mealType || 'приёма пищи'}
              </h2>
            </div>
            <div className="meal-sheet-alternatives-list">
              {list.map((alt) => {
                const selected = isSelected(alt)
                return (
                  <div
                    key={alt.id || alt.title}
                    role="button"
                    tabIndex={0}
                    className={`meal-sheet-alt-card meal-sheet-alt-card--clickable${selected ? ' meal-sheet-alt-card--selected' : ''}`}
                    onClick={() => setPreviewMeal(alt)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreviewMeal(alt); } }}
                  >
                    {selected && (
                      <div className="meal-sheet-alt-check" aria-hidden="true">
                        <svg width="12" height="10" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}
                    <div
                      className={`meal-sheet-alt-image${alt.imageUrl ? ' meal-sheet-alt-image--photo' : ''}`}
                      aria-hidden="true"
                      style={
                        alt.imageUrl
                          ? {
                              backgroundImage: `url("${alt.imageUrl}"), url("${fallbackImage}")`,
                              backgroundSize: 'cover, 36px 36px',
                              backgroundPosition: 'center, center',
                              backgroundRepeat: 'no-repeat, no-repeat',
                            }
                          : {
                              backgroundImage: `url("${fallbackImage}")`,
                              backgroundSize: '36px 36px',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat',
                            }
                      }
                    />
                    <div className="meal-sheet-alt-content">
                      <div className="meal-sheet-alt-title">{alt.title}</div>
                      <div className="meal-sheet-alt-desc">
                        {(alt.composition || '').length > 80 ? `${(alt.composition || '').slice(0, 80)}...` : (alt.composition || '')}
                      </div>
                      <div className="meal-sheet-alt-tags">
                        {(
                          Array.isArray(alt.tags) && alt.tags.length > 0
                            ? alt.tags
                            : (alt.statusTag ? [alt.statusTag] : [])
                        )
                          .slice(0, 2)
                          .join(', ')}
                      </div>
                      {!selected && (
                        <button type="button" className="meal-sheet-alt-select" onClick={(e) => { e.stopPropagation(); handleSelectAlternative(alt); }}>
                          Выбрать
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <div className="meal-sheet-image-wrap">
              <div className="meal-sheet-image" aria-hidden="true">
                <img
                  src={meal?.imageUrl || fallbackImage}
                  alt=""
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = fallbackImage
                  }}
                />
              </div>
            </div>

            <h2 className="meal-sheet-title">
              {meal?.title || 'Овсяная каша на молоке Пятеро...'}
            </h2>

            {meal?.statusTag && <div className="meal-sheet-status">{meal.statusTag}</div>}

            <section className="meal-sheet-section">
              <h3 className="meal-sheet-section-title">Состав</h3>
              <div className="meal-sheet-composition">
                {meal?.composition || 'Молоко 2,5%, вода питьевая, хлопья овсяные, сахар, масло сливочное, соль, крахмал, ароматизатор.'}
              </div>
            </section>

            <section className="meal-sheet-section">
              <h3 className="meal-sheet-section-title">Пищевая ценность</h3>
              <p className="meal-sheet-calories">{meal?.calories ?? '280 ккал'}</p>
            </section>

            <div className="meal-sheet-bju">
              <div className="meal-sheet-bju-bar">
                <div className="meal-sheet-bju-segment meal-sheet-bju-segment--protein" style={{ flex: pShare }} />
                <div className="meal-sheet-bju-segment meal-sheet-bju-segment--fat" style={{ flex: fShare }} />
                <div className="meal-sheet-bju-segment meal-sheet-bju-segment--carbs" style={{ flex: cShare }} />
              </div>
              <div className="meal-sheet-bju-labels">
                <span className="meal-sheet-bju-label"><span className="meal-sheet-bju-dot meal-sheet-bju-dot--protein" />Белки {meal?.protein ?? 12}г</span>
                <span className="meal-sheet-bju-label"><span className="meal-sheet-bju-dot meal-sheet-bju-dot--fat" />Жиры {meal?.fat ?? 8}г</span>
                <span className="meal-sheet-bju-label"><span className="meal-sheet-bju-dot meal-sheet-bju-dot--carbs" />Углев. {meal?.carbs ?? 45}г</span>
              </div>
            </div>

            <div className="meal-sheet-actions">
              <button type="button" className="meal-sheet-btn meal-sheet-btn--replace" onClick={() => setView('alternatives')}>
                <img src="/zam.svg" alt="" width={12} height={12} aria-hidden="true" />
                Заменить блюдо
              </button>
              <button type="button" className="meal-sheet-btn meal-sheet-btn--keep" onClick={handleClose}>
                Оставить блюдо
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MealDetailSheet

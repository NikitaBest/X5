import { useEffect, useRef, useState } from 'react'
import './MealDetailSheet.css'

function MealDetailSheet({ open, onClose, meal }) {
  const sheetRef = useRef(null)
  const startYRef = useRef(null)
  const [isClosing, setIsClosing] = useState(false)
  const [isAnimatedOpen, setIsAnimatedOpen] = useState(false)

  useEffect(() => {
    if (!open) {
      setIsAnimatedOpen(false)
      return undefined
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setIsAnimatedOpen(true))
    })
    return () => cancelAnimationFrame(id)
  }, [open])

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
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      setIsAnimatedOpen(false)
      onClose?.()
    }, 280)
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) handleClose()
  }

  const handleTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    const startY = startYRef.current
    if (startY == null) return
    const deltaY = e.changedTouches[0].clientY - startY
    if (deltaY > 50) handleClose()
    startYRef.current = null
  }

  if (!open) return null

  const total = (meal?.protein ?? 0) + (meal?.fat ?? 0) + (meal?.carbs ?? 0)
  const pShare = total > 0 ? (meal?.protein ?? 0) / total : 1 / 3
  const fShare = total > 0 ? (meal?.fat ?? 0) / total : 1 / 3
  const cShare = total > 0 ? (meal?.carbs ?? 0) / total : 1 / 3

  return (
    <div
      className={`meal-sheet-backdrop${isClosing ? ' meal-sheet-backdrop--closing' : ''}${isAnimatedOpen ? ' meal-sheet-backdrop--open' : ''}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={sheetRef}
        className={`meal-sheet${isClosing ? ' meal-sheet--closing' : ''}${isAnimatedOpen ? ' meal-sheet--open' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="meal-sheet-handle" />

        <div className="meal-sheet-image-wrap">
          <div className="meal-sheet-image" aria-hidden="true">
            {meal?.imageUrl ? (
              <img src={meal.imageUrl} alt="" />
            ) : null}
          </div>
        </div>

        <h2 className="meal-sheet-title">
          {meal?.title || 'Овсяная каша на молоке Пятеро...'}
        </h2>

        {meal?.statusTag && (
          <div className="meal-sheet-status">{meal.statusTag}</div>
        )}

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
            <span className="meal-sheet-bju-label">
              <span className="meal-sheet-bju-dot meal-sheet-bju-dot--protein" />Белки {meal?.protein ?? 12}г
            </span>
            <span className="meal-sheet-bju-label">
              <span className="meal-sheet-bju-dot meal-sheet-bju-dot--fat" />Жиры {meal?.fat ?? 8}г
            </span>
            <span className="meal-sheet-bju-label">
              <span className="meal-sheet-bju-dot meal-sheet-bju-dot--carbs" />Углев. {meal?.carbs ?? 45}г
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MealDetailSheet

import { useEffect, useRef, useState } from 'react'
import './ResultDetailSheet.css'

function ResultDetailSheet({ open, onClose, onSelectPlan, title, value, unit, statusText, description }) {
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

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClose()
      }
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

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      handleClose()
    }
  }

  const handleTouchStart = (event) => {
    startYRef.current = event.touches[0].clientY
  }

  const handleTouchEnd = (event) => {
    const startY = startYRef.current
    if (startY == null) return
    const endY = event.changedTouches[0].clientY
    const deltaY = endY - startY
    if (deltaY > 50) {
      handleClose()
    }
    startYRef.current = null
  }

  if (!open) return null

  return (
    <div
      className={`result-sheet-backdrop${isClosing ? ' result-sheet-backdrop--closing' : ''}${isAnimatedOpen ? ' result-sheet-backdrop--open' : ''}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={sheetRef}
        className={`result-sheet${isClosing ? ' result-sheet--closing' : ''}${isAnimatedOpen ? ' result-sheet--open' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="result-sheet-handle" />

        <div className="result-sheet-header">
          <div className="result-sheet-title">{title}</div>
          <div className="result-sheet-value-row">
            <div className="result-sheet-value">{value}</div>
            {unit && <div className="result-sheet-unit">{unit}</div>}
          </div>
          {statusText && <div className="result-sheet-status">{statusText}</div>}
        </div>

        <div className="result-sheet-scale">
          <div className="result-sheet-scale-bar">
            <div className="result-sheet-scale-segment result-sheet-scale-segment--low" />
            <div className="result-sheet-scale-segment result-sheet-scale-segment--medium" />
            <div className="result-sheet-scale-segment result-sheet-scale-segment--high" />
          </div>
          <div className="result-sheet-scale-labels">
            <span>до 30</span>
            <span>31–37</span>
            <span>37+</span>
          </div>
        </div>

        <div className="result-sheet-description">
          {description || 'Тут позже появится текст с расшифровкой и рекомендациями по этому показателю.'}
        </div>

        <button
          type="button"
          className="result-sheet-action-button"
          onClick={() => {
            if (onSelectPlan) {
              onSelectPlan()
            } else {
              onClose?.()
            }
          }}
        >
          Подобрать рацион
        </button>

        <p className="result-sheet-disclaimer">
          Не является медицинским диагнозом. Необходима консультация специалиста.
        </p>
      </div>
    </div>
  )
}

export default ResultDetailSheet


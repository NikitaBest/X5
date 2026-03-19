import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './ResultDetailSheet.css'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function colorFromBackend(color) {
  const c = String(color || '').toLowerCase()
  if (c === 'green') return '#30AD43'
  if (c === 'yellow') return '#FEC014'
  if (c === 'red') return '#FF6B6B'
  return '#d9dee6'
}

function formatRange(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const num = Number(value)
  const isInt = Math.abs(num - Math.round(num)) < 0.001
  return isInt ? String(Math.round(num)) : num.toFixed(2).replace(/\.?0+$/, '')
}

function toFiniteNumberOrNull(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function getMarkerPercent(scaleMetadata, metricValue) {
  const items = Array.isArray(scaleMetadata?.items) ? scaleMetadata.items : []
  const numericValue = toFiniteNumberOrNull(metricValue)

  if (numericValue != null && items.length > 0) {
    for (const item of items) {
      const from = toFiniteNumberOrNull(item?.from)
      const to = toFiniteNumberOrNull(item?.to)
      const percentFrom = toFiniteNumberOrNull(item?.percentFrom)
      const percentTo = toFiniteNumberOrNull(item?.percentTo)
      if (from == null || to == null || percentFrom == null || percentTo == null) continue

      const minBound = Math.min(from, to)
      const maxBound = Math.max(from, to)
      if (numericValue < minBound || numericValue > maxBound) continue

      if (Math.abs(to - from) < 1e-6) return clamp(percentFrom, 0, 100)
      const t = (numericValue - from) / (to - from)
      return clamp(percentFrom + (percentTo - percentFrom) * t, 0, 100)
    }
  }

  const fallbackPercent = toFiniteNumberOrNull(scaleMetadata?.valuePercentLabel)
  if (fallbackPercent != null) return clamp(fallbackPercent, 0, 100)

  const fallbackScore = toFiniteNumberOrNull(scaleMetadata?.biomarkerScore)
  if (fallbackScore != null) return clamp(fallbackScore, 0, 100)

  return 0
}

function ResultDetailSheet({
  open,
  onClose,
  onSelectPlan,
  title,
  value,
  unit,
  statusText,
  commentText,
  statusBg,
  statusColor,
  description,
  scaleMetadata,
}) {
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

  const handleTouchMove = (event) => {
    // Закрываем по свайпу “вниз” даже если touchend сработал неудачно:
    const startY = startYRef.current
    if (startY == null) return
    const currentY = event.touches?.[0]?.clientY
    if (currentY == null) return
    const deltaY = currentY - startY
    if (deltaY > 70) {
      startYRef.current = null
      handleClose()
    }
  }

  if (!open) return null

  const scaleItems = Array.isArray(scaleMetadata?.items)
    ? [...scaleMetadata.items]
        .filter((i) => i && Number.isFinite(Number(i.percentFrom)) && Number.isFinite(Number(i.percentTo)))
        .sort((a, b) => Number(a.percentFrom) - Number(b.percentFrom))
    : []
  const hasDynamicScale = scaleItems.length > 0
  const markerPercent = getMarkerPercent(scaleMetadata, value)

  const sheetMarkup = (
    <div
      className={`result-sheet-backdrop${isClosing ? ' result-sheet-backdrop--closing' : ''}${isAnimatedOpen ? ' result-sheet-backdrop--open' : ''}`}
      onClick={handleBackdropClick}
    >
      <div
        ref={sheetRef}
        className={`result-sheet${isClosing ? ' result-sheet--closing' : ''}${isAnimatedOpen ? ' result-sheet--open' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="result-sheet-handle" />

        <div className="result-sheet-header">
          <div className="result-sheet-title">{title}</div>
          <div className="result-sheet-value-row">
            <div className="result-sheet-value">{value}</div>
            {unit && <div className="result-sheet-unit">{unit}</div>}
          </div>
          {statusText && (
            <div
              className="result-sheet-status"
              style={{
                ...(statusBg ? { background: statusBg } : {}),
                ...(statusColor ? { color: statusColor } : {}),
              }}
            >
              {statusText}
            </div>
          )}
          {commentText ? <div className="result-sheet-comment">{commentText}</div> : null}
        </div>

        <div className="result-sheet-scale">
          <div className="result-sheet-scale-bar-wrap">
            <div className="result-sheet-scale-marker" style={{ left: `${markerPercent}%` }} />

            <div className="result-sheet-scale-bar">
              {hasDynamicScale ? (
                scaleItems.map((item, idx) => (
                  // Сегменты рисуем строго по координатам percentFrom/percentTo,
                  // чтобы цветовая линия совпадала с маркером по оси шкалы.
                  <div
                    key={`${item.percentFrom}-${item.percentTo}-${idx}`}
                    className="result-sheet-scale-segment"
                    style={{
                      left: `${clamp(Number(item.percentFrom), 0, 100)}%`,
                      width: `${Math.max(0, clamp(Number(item.percentTo), 0, 100) - clamp(Number(item.percentFrom), 0, 100))}%`,
                      background: colorFromBackend(item.color),
                    }}
                  />
                ))
              ) : (
                <>
                  <div className="result-sheet-scale-segment result-sheet-scale-segment--low" />
                  <div className="result-sheet-scale-segment result-sheet-scale-segment--medium" />
                  <div className="result-sheet-scale-segment result-sheet-scale-segment--high" />
                </>
              )}
            </div>
          </div>

          <div className="result-sheet-scale-labels">
            {hasDynamicScale ? (
              scaleItems.map((item, idx) => (
                <span
                  key={`label-${item.percentFrom}-${item.percentTo}-${idx}`}
                  style={{
                    left: `${clamp(Number(item.percentFrom), 0, 100)}%`,
                    width: `${Math.max(
                      0,
                      clamp(Number(item.percentTo), 0, 100) - clamp(Number(item.percentFrom), 0, 100),
                    )}%`,
                  }}
                >
                  {formatRange(item.from)}–{formatRange(item.to)}
                </span>
              ))
            ) : (
              <>
                <span>до 30</span>
                <span>31–37</span>
                <span>37+</span>
              </>
            )}
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

  // Портал в `document.body` гарантирует корректное позиционирование `fixed`,
  // даже если родительский экран скроллится или имеет `transform`/анимации.
  if (typeof document !== 'undefined') {
    return createPortal(sheetMarkup, document.body)
  }

  return sheetMarkup
}

export default ResultDetailSheet


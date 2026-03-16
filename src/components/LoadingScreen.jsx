import { useState, useEffect, useRef } from 'react'
import './LoadingScreen.css'

/**
 * Простой полноэкранный экран загрузки:
 * тёмный фон, кружок-спиннер и тонкая полоска прогресса.
 *
 * @param {Object} props
 * @param {string} [props.text] Текст под индикатором
 * @param {() => void} [props.onComplete] Вызывается один раз, когда прогресс достигнет 100%
 */
function LoadingScreen({ text = 'Загрузка...', onComplete }) {
  const [progress, setProgress] = useState(0)
  const completedRef = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100
        // Быстрее заполняем прогресс (примерно 1.5–2 секунды)
        const next = prev + Math.random() * 14 + 8
        return next > 100 ? 100 : next
      })
    }, 200)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!onComplete || completedRef.current || progress < 100) return
    completedRef.current = true
    const t = setTimeout(onComplete, 300)
    return () => clearTimeout(t)
  }, [progress, onComplete])

  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-label={text}>
      <div className="loading-screen-inner">
        <div className="loading-screen-spinner" aria-hidden="true" />
        <div className="loading-screen-progress">
          <div
            className="loading-screen-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
        {text && <p className="loading-screen-text">{text}</p>}
      </div>
    </div>
  )
}

export default LoadingScreen


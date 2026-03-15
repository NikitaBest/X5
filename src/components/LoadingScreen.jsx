import { useState, useEffect, useRef } from 'react'
import './LoadingScreen.css'

const SCAN_PHRASES = [
  'Сканируем лицо',
  'Анализируем данные',
  'Формируем показатели',
  'Подбираем рекомендации',
]

/**
 * Полноэкранный экран загрузки.
 * @param {Object} props
 * @param {string} [props.text] - Текст (для простого варианта)
 * @param {string} [props.variant] - "scan" (овал, сканирование) или "simple" (кружок + текст)
 * @param {function} [props.onComplete] - Вызывается, когда полоса прогресса заполнена (variant="scan")
 */
function LoadingScreen({ text = 'Загрузка...', variant = 'scan', onComplete }) {
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const completedRef = useRef(false)

  useEffect(() => {
    if (variant !== 'scan') return
    const phraseInterval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % SCAN_PHRASES.length)
    }, 2000)
    return () => clearInterval(phraseInterval)
  }, [variant])

  useEffect(() => {
    if (variant !== 'scan') return
    const progressInterval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 100 : Math.min(100, p + Math.random() * 6 + 3)))
    }, 350)
    return () => clearInterval(progressInterval)
  }, [variant])

  useEffect(() => {
    if (variant !== 'scan' || progress < 100 || !onComplete || completedRef.current) return
    completedRef.current = true
    const t = setTimeout(onComplete, 350)
    return () => clearTimeout(t)
  }, [variant, progress, onComplete])

  if (variant === 'simple') {
    return (
      <div className="loading-screen loading-screen--simple" role="status" aria-live="polite" aria-label={text}>
        <div className="loading-screen-spinner" aria-hidden="true" />
        {text && <p className="loading-screen-text">{text}</p>}
      </div>
    )
  }

  return (
    <div className="loading-screen loading-screen--scan" role="status" aria-live="polite" aria-label={SCAN_PHRASES[phraseIndex]}>
      <div className="loading-scan">
        <div className="loading-scan-oval" aria-hidden="true">
          <img src="/woomen1.png" alt="" className="loading-scan-oval-img" />
          <div className="loading-scan-line" />
          <div className="loading-scan-dots">
            {[...Array(12)].map((_, i) => (
              <span key={i} className="loading-scan-dot" style={{ '--i': i }} />
            ))}
          </div>
        </div>
        <div className="loading-progress-wrap">
          <div className="loading-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen

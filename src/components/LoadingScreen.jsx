import './LoadingScreen.css'

/**
 * Полноэкранный экран загрузки.
 * Можно использовать при обновлении страницы, переходе между разделами или во время запросов.
 * @param {Object} props
 * @param {string} [props.text] - Текст под спиннером (по умолчанию "Загрузка...")
 */
function LoadingScreen({ text = 'Загрузка...' }) {
  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-label={text}>
      <div className="loading-screen-spinner" aria-hidden="true" />
      {text && <p className="loading-screen-text">{text}</p>}
    </div>
  )
}

export default LoadingScreen

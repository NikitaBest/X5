import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.jsx'
import AppErrorBoundary from './components/AppErrorBoundary.jsx'
import logger from './utils/logger.js'

/** Синхронные ошибки в JS и часть сбоев загрузки ресурсов (без Promise). */
window.addEventListener('error', (event) => {
  if (event.error instanceof Error) {
    logger.error('window.error', event.error)
    return
  }
  logger.error('window.error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  })
})

/** Необработанные отклонения Promise. */
window.addEventListener('unhandledrejection', (event) => {
  logger.error('unhandledrejection', event.reason)
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)

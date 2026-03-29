import { Component } from 'react'
import logger from '../utils/logger.js'
import './AppErrorBoundary.css'

/**
 * Глобальный перехват ошибок React (рендер, lifecycle, дети).
 * window.onerror / unhandledrejection в main.jsx не видят их.
 */
export default class AppErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    logger.error('react_render_error', {
      name: error?.name,
      message: String(error?.message ?? error ?? '').slice(0, 2000),
      stack: String(error?.stack ?? '').slice(0, 4000),
      componentStack: String(info?.componentStack ?? '').slice(0, 3000),
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error-boundary">
          <p className="app-error-boundary-text">
            Не удалось отобразить экран. Попробуйте обновить страницу.
          </p>
          <button type="button" className="app-error-boundary-btn" onClick={this.handleReload}>
            Обновить
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

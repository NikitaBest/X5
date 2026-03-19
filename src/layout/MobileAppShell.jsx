import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import '../App.css'

function scrollAppToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  const appContent = document.querySelector('.app-content')
  if (appContent instanceof HTMLElement) {
    appContent.scrollTop = 0
  }
}

function MobileAppShell() {
  const location = useLocation()

  // При любом переходе (вперёд/назад/обновление URL) — показываем страницу с верха
  useEffect(() => {
    scrollAppToTop()
    const id = requestAnimationFrame(() => scrollAppToTop())
    return () => cancelAnimationFrame(id)
  }, [location.pathname, location.search, location.key])

  useEffect(() => {
    // Устанавливаем тему по умолчанию (темная)
    document.documentElement.setAttribute('data-theme', 'dark')
    
    // Гарантируем мобильный full-screen layout и корректную тему
    // Проверяем Telegram через небольшую задержку, чтобы дать скрипту время загрузиться
    const initTelegram = () => {
      if (window.Telegram?.WebApp) {
        try {
          const telegram = window.Telegram.WebApp

          if (telegram.disableVerticalSwipes) {
            telegram.disableVerticalSwipes()
          }

          const applyTheme = () => {
            if (telegram.colorScheme === 'dark') {
              document.documentElement.setAttribute('data-theme', 'dark')
            } else {
              document.documentElement.setAttribute('data-theme', 'light')
            }
          }

          applyTheme()

          if (telegram.onEvent) {
            telegram.onEvent('themeChanged', applyTheme)
          }
        } catch (err) {
          console.warn('Telegram Web App initialization failed:', err)
        }
      }
    }
    
    // Пробуем сразу и через задержку
    initTelegram()
    setTimeout(initTelegram, 200)
  }, [])

  return (
    <div className="app">
      <div className="app-content">
        <Outlet />
      </div>
    </div>
  )
}

export default MobileAppShell



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
    // Приложение работает только в светлой теме.
    document.documentElement.setAttribute('data-theme', 'light')
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



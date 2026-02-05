import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.jsx'

// Инициализация Telegram Web App (опционально, если скрипт загрузился)
// Проверяем через небольшую задержку, чтобы дать скрипту время загрузиться
setTimeout(() => {
  if (window.Telegram?.WebApp) {
    try {
      const tg = window.Telegram.WebApp
      tg.ready()
      tg.expand()
      
      // Отключаем вертикальные свайпы для закрытия приложения
      if (tg.disableVerticalSwipes) {
        tg.disableVerticalSwipes()
      }
      
      // Настройка цветовой схемы (фон в зависимости от темы Telegram)
      const isDark = tg.colorScheme === 'dark'
      const bgColor = isDark ? '#000000' : '#FFFFFF'

      tg.setHeaderColor(bgColor)
      tg.setBackgroundColor(bgColor)
    } catch (err) {
      console.warn('Telegram Web App initialization failed:', err)
    }
  }
}, 100)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

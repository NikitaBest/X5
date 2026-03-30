import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useUserData } from '../contexts/UserDataContext.jsx'
import { canAccessHealthScreens } from '../utils/userProfileGate.js'
import { getScanHistory, extractScanIdFromEnvelope } from '../api/client.js'
import { extractLastScanResponse, hasTranscriptsInResponse } from '../utils/scanHistory.js'
import { writeLastScanId } from '../utils/lastScanId.js'
import { writeCachedScanEnvelope } from '../utils/scanResultCache.js'
import Welcome from './Welcome.jsx'

/**
 * Корневой маршрут: без токена или без готового скана — экран целей.
 * Если пользователь уже авторизован и на сервере есть последний скан с результатами — сразу на результаты.
 */
function HomeRoute() {
  const { token, initialAuthFinished, hasServerProfileBasics } = useAuth()
  const { userData } = useUserData()
  const navigate = useNavigate()
  const [welcomeVisible, setWelcomeVisible] = useState(true)

  const allowResultsShortcut = useMemo(
    () => canAccessHealthScreens(hasServerProfileBasics, userData),
    [hasServerProfileBasics, userData],
  )

  useEffect(() => {
    if (!token) {
      setWelcomeVisible(true)
      return undefined
    }

    if (!initialAuthFinished) {
      return undefined
    }

    let cancelled = false
    // Не блокируем первый экран ожиданием сети: показываем Welcome сразу,
    // а быстрый переход на результаты делаем в фоне по готовности ответа.
    setWelcomeVisible(true)

    getScanHistory(token, { pageNumber: 1, pageSize: 10 })
      .then((data) => {
        if (cancelled) return
        const last = extractLastScanResponse(data)
        if (last && hasTranscriptsInResponse(last) && allowResultsShortcut) {
          const scanId = extractScanIdFromEnvelope(last)
          if (scanId) writeLastScanId(scanId)
          writeCachedScanEnvelope(last)
          navigate('/results', {
            replace: true,
            state: {
              backendScanResponse: last,
              ...(scanId ? { scanId } : {}),
            },
          })
          return
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [token, initialAuthFinished, navigate, allowResultsShortcut])

  return welcomeVisible ? <Welcome /> : null
}

export default HomeRoute

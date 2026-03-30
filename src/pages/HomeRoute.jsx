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

const WELCOME_DELAY_FOR_AUTH_MS = 650

/**
 * Корневой маршрут: без токена или без готового скана — экран целей.
 * Если пользователь уже авторизован и на сервере есть последний скан с результатами — сразу на результаты.
 */
function HomeRoute() {
  const { token, initialAuthFinished, hasServerProfileBasics } = useAuth()
  const { userData } = useUserData()
  const navigate = useNavigate()
  const [welcomeVisible, setWelcomeVisible] = useState(true)
  const [isCheckingRecentScan, setIsCheckingRecentScan] = useState(false)

  const allowResultsShortcut = useMemo(
    () => canAccessHealthScreens(hasServerProfileBasics, userData),
    [hasServerProfileBasics, userData],
  )

  useEffect(() => {
    if (!token) {
      setWelcomeVisible(true)
      setIsCheckingRecentScan(false)
      return undefined
    }

    if (!initialAuthFinished) {
      return undefined
    }

    let cancelled = false
    setIsCheckingRecentScan(true)
    setWelcomeVisible(false)
    // Короткая задержка перед показом Welcome у авторизованного пользователя:
    // если история сканов ответит быстро и есть результаты, уходим на /results без "мигания" Welcome.
    const welcomeDelayTimer = setTimeout(() => {
      if (!cancelled) setWelcomeVisible(true)
    }, WELCOME_DELAY_FOR_AUTH_MS)

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
        setWelcomeVisible(true)
      })
      .catch(() => {
        if (!cancelled) setWelcomeVisible(true)
      })
      .finally(() => {
        if (!cancelled) setIsCheckingRecentScan(false)
      })

    return () => {
      cancelled = true
      clearTimeout(welcomeDelayTimer)
    }
  }, [token, initialAuthFinished, navigate, allowResultsShortcut])

  if (isCheckingRecentScan && !welcomeVisible) {
    return null
  }

  return welcomeVisible ? <Welcome /> : null
}

export default HomeRoute

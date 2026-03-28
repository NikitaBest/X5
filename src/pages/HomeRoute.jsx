import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'
import { getScanHistory, extractScanIdFromEnvelope } from '../api/client.js'
import { extractLastScanResponse, hasTranscriptsInResponse } from '../utils/scanHistory.js'
import { writeLastScanId } from '../utils/lastScanId.js'
import Page from '../layout/Page.jsx'
import Welcome from './Welcome.jsx'
import './Results.css'

/**
 * Корневой маршрут: без токена или без готового скана — экран целей.
 * Если пользователь уже авторизован и на сервере есть последний скан с результатами — сразу на результаты.
 */
function HomeRoute() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [showWelcome, setShowWelcome] = useState(() => !token)

  useEffect(() => {
    if (!token) {
      setShowWelcome(true)
      return undefined
    }

    let cancelled = false
    setShowWelcome(false)

    getScanHistory(token, { pageNumber: 1, pageSize: 10 })
      .then((data) => {
        if (cancelled) return
        const last = extractLastScanResponse(data)
        if (last && hasTranscriptsInResponse(last)) {
          const scanId = extractScanIdFromEnvelope(last)
          if (scanId) writeLastScanId(scanId)
          navigate('/results', {
            replace: true,
            state: {
              backendScanResponse: last,
              ...(scanId ? { scanId } : {}),
            },
          })
          return
        }
        setShowWelcome(true)
      })
      .catch(() => {
        if (!cancelled) setShowWelcome(true)
      })

    return () => {
      cancelled = true
    }
  }, [token, navigate])

  if (!showWelcome) {
    return (
      <Page className="welcome-page">
        <div className="nutrition-plan-loading" style={{ marginTop: '40px' }}>
          <span className="nutrition-plan-loading-spinner" aria-hidden="true" />
          Загрузка…
        </div>
      </Page>
    )
  }

  return <Welcome />
}

export default HomeRoute

import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import HeartRateGauge from '../components/HeartRateGauge.jsx'
import ResultDetailSheet from '../components/ResultDetailSheet.jsx'
import {
  getScanHistory,
  extractScanIdFromEnvelope,
  getRationGenerationStatus,
  postRationRegenerate,
} from '../api/client.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import logger from '../utils/logger.js'
import './Results.css'

const RATION_STATUS_POLL_MS = 2500

/**
 * WeekRationGenerationStatus (бэкенд):
 * None=0, Pending=1, InProgress=2, Completed=3, Failed=4
 */
const WEEK_RATION_GEN_STATUS = {
  None: 0,
  Pending: 1,
  InProgress: 2,
  Completed: 3,
  Failed: 4,
}

function parseWeekRationStatus(payload) {
  if (!payload?.value || typeof payload.value !== 'object') return null
  const v = payload.value
  const raw = v.status ?? v.weekRationGenerationStatus
  if (raw === null || raw === undefined) return null
  const n = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10)
  return Number.isFinite(n) ? n : null
}

function shouldStopRationStatusPolling(payload) {
  if (!payload || typeof payload !== 'object' || payload.isSuccess !== true) return false
  const n = parseWeekRationStatus(payload)
  if (n === null) return false
  return n === WEEK_RATION_GEN_STATUS.Completed || n === WEEK_RATION_GEN_STATUS.Failed
}

function logRationTerminalStatus(payload) {
  const n = parseWeekRationStatus(payload)
  if (n === WEEK_RATION_GEN_STATUS.Failed) {
    logger.warn('Генерация рациона: ошибка на сервере', {
      statusMessage: payload?.value?.statusMessage,
    })
  }
}

function shouldAutoRegenerateRation(payload) {
  const status = parseWeekRationStatus(payload)
  return status === WEEK_RATION_GEN_STATUS.Failed
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function lerpColor(color1, color2, t) {
  const c1 = {
    r: parseInt(color1.slice(1, 3), 16),
    g: parseInt(color1.slice(3, 5), 16),
    b: parseInt(color1.slice(5, 7), 16),
  }
  const c2 = {
    r: parseInt(color2.slice(1, 3), 16),
    g: parseInt(color2.slice(3, 5), 16),
    b: parseInt(color2.slice(5, 7), 16),
  }
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`
}

function getGaugeColorByScore(score) {
  if (!Number.isFinite(score)) return '#ff8e8e'
  const x = clamp(score / 100, 0, 1)
  const stops = [
    { pos: 0, color: '#FF6B6B' },
    { pos: 0.33, color: '#FEC014' },
    { pos: 0.66, color: '#C9F47A' },
    { pos: 1, color: '#30AD43' },
  ]
  for (let i = 0; i < stops.length - 1; i += 1) {
    const a = stops[i]
    const b = stops[i + 1]
    if (x >= a.pos && x <= b.pos) {
      return lerpColor(a.color, b.color, (x - a.pos) / (b.pos - a.pos))
    }
  }
  return stops[stops.length - 1].color
}

function getHealthBadgeText(score) {
  if (!Number.isFinite(score)) return 'Ваши показатели'
  if (score >= 66) return 'В норме'
  if (score >= 33) return 'Есть отклонения'
  return 'Требует особого внимания'
}

function normalizeTranscript(t) {
  if (!t || !t.key) return null
  return {
    key: t.key,
    name: t.name || t.key,
    value: t.value,
    unit: t.unit || '',
    color: t.color || '',
    description: t.descriptionUser || '',
    comment: t.commentUser || '',
    confidenceLevel: t.confidenceLevel ?? null,
    scaleMetadata: t.scaleMetadata ?? null,
  }
}

function getCardsFromBackend(transcripts = []) {
  return transcripts
    .filter((t) => t?.key)
    .map((tr) => ({
      key: tr.key,
      title: tr.name,
      value: tr.value,
      unit: tr.unit,
      statusText: tr.comment || '',
      description: tr.description || '',
      color: tr.color,
      confidenceLevel: tr.confidenceLevel,
      scaleMetadata: tr.scaleMetadata ?? null,
    }))
}

function getCardThemeByColor(color) {
  const key = String(color || '').toLowerCase()
  if (key === 'green') {
    return {
      cardBg: 'rgba(149, 219, 109, 0.12)',
      cardBorder: 'rgba(93, 175, 46, 0.55)',
      iconBg: 'rgba(93, 175, 46, 0.16)',
      iconColor: '#5DAF2E',
      statusBg: 'rgba(93, 175, 46, 0.16)',
      statusColor: '#4C9A24',
    }
  }
  if (key === 'yellow') {
    return {
      cardBg: 'rgba(254, 192, 20, 0.12)',
      cardBorder: 'rgba(246, 175, 0, 0.55)',
      iconBg: 'rgba(254, 192, 20, 0.18)',
      iconColor: '#E6A100',
      statusBg: 'rgba(254, 192, 20, 0.18)',
      statusColor: '#B68200',
    }
  }
  if (key === 'red') {
    return {
      cardBg: 'rgba(255, 107, 107, 0.12)',
      cardBorder: 'rgba(255, 107, 107, 0.5)',
      iconBg: 'rgba(255, 107, 107, 0.16)',
      iconColor: '#E55656',
      statusBg: 'rgba(255, 107, 107, 0.16)',
      statusColor: '#C93C3C',
    }
  }
  return {
    cardBg: '#ffffff',
    cardBorder: 'rgba(0, 0, 0, 0.08)',
    iconBg: 'rgba(0, 0, 0, 0.06)',
    iconColor: '#666666',
    statusBg: 'rgba(0, 0, 0, 0.08)',
    statusColor: '#555555',
  }
}

function getStatusByColor(color) {
  const key = String(color || '').toLowerCase()
  if (key === 'green') return 'В норме'
  if (key === 'yellow') return 'Выше нормы'
  if (key === 'red') return 'Требует внимания'
  return ''
}

function getSpecialIconType(card) {
  const key = String(card?.key || '')
  const title = String(card?.title || '').toLowerCase()

  if (key === 'pulseRate' || key === 'heartAge') {
    return 'heart'
  }

  const pressureKeys = new Set([
    'bloodPressure',
    'bloodPressureSystolic',
    'bloodPressureDiastolic',
    'highBloodPressureRisk',
    'meanArterialPressure',
  ])

  if (
    pressureKeys.has(key) ||
    title.includes('давление') ||
    title.includes('систолическое') ||
    title.includes('диастолическое')
  ) {
    return 'pressure'
  }

  const stressKeys = new Set([
    'stressLevel',
    'stressIndex',
    'wellnessLevel',
    'wellnessIndex',
    'normalizedStressIndex',
  ])

  if (
    stressKeys.has(key) ||
    title.includes('стресс') ||
    title.includes('самочувств')
  ) {
    return 'stress'
  }

  if (key === 'respirationRate' || title.includes('дыхан')) {
    return 'respiration'
  }

  const hemoKeys = new Set([
    'hemoglobin',
    'hemoglobinA1c',
    'highHemoglobinA1CRisk',
    'highFastingGlucoseRisk',
    'highTotalCholesterolRisk',
    'lowHemoglobinRisk',
  ])

  if (
    hemoKeys.has(key) ||
    title.includes('гемоглобин') ||
    title.includes('hba1c') ||
    title.includes('глюкоз') ||
    title.includes('холестерин')
  ) {
    return 'hemo'
  }

  const cardioKeys = new Set([
    'prq',
    'ascvdRisk',
    'ascvdRiskLevel',
    'cardiacWorkload',
  ])

  if (
    cardioKeys.has(key) ||
    title.includes('prq') ||
    title.includes('ascvd') ||
    title.includes('кардиаль')
  ) {
    return 'cardio'
  }

  return null
}

function hasTranscriptsInResponse(response) {
  return Array.isArray(response?.value?.transcripts) && response.value.transcripts.length > 0
}

function extractLastScanResponse(data) {
  if (hasTranscriptsInResponse(data)) return data

  const list = Array.isArray(data?.value?.data)
    ? data.value.data
    : Array.isArray(data?.value?.items)
      ? data.value.items
      : Array.isArray(data?.data)
        ? data.data
        : []

  const first = list[0]
  if (hasTranscriptsInResponse(first)) return first
  if (Array.isArray(first?.transcripts) && first.transcripts.length > 0) {
    return { value: first }
  }
  return null
}

function Results() {
  const [showAllMetricsCards, setShowAllMetricsCards] = useState(false)
  const [activeDetail, setActiveDetail] = useState(null)
  const [isLoadingLatestScan, setIsLoadingLatestScan] = useState(false)
  const [didTryLoadLatestScan, setDidTryLoadLatestScan] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { token } = useAuth()
  const [backendScanResponse, setBackendScanResponse] = useState(() => location.state?.backendScanResponse ?? null)
  const [isRationReady, setIsRationReady] = useState(
    () =>
      !(location.state?.scanId ?? extractScanIdFromEnvelope(location.state?.backendScanResponse ?? null)),
  )

  const truncateText = (text, maxLen = 90) => {
    const s = String(text ?? '').trim()
    if (!s) return ''
    if (s.length <= maxLen) return s
    return `${s.slice(0, maxLen).trim()}…`
  }

  useEffect(() => {
    if (location.state?.backendScanResponse) {
      setBackendScanResponse(location.state.backendScanResponse)
      setDidTryLoadLatestScan(false)
    }
  }, [location.state])

  useEffect(() => {
    if (hasTranscriptsInResponse(backendScanResponse)) return
    if (didTryLoadLatestScan) return
    if (!token) return

    let cancelled = false
    setDidTryLoadLatestScan(true)
    setIsLoadingLatestScan(true)

    getScanHistory(token, { pageNumber: 1, pageSize: 1 })
      .then((data) => {
        if (cancelled) return
        const lastScan = extractLastScanResponse(data)
        if (lastScan) setBackendScanResponse(lastScan)
      })
      .catch((error) => {
        if (cancelled) return
        logger.warn('Failed to fetch latest scan via /scan/get', error)
      })
      .finally(() => {
        if (!cancelled) setIsLoadingLatestScan(false)
      })

    return () => {
      cancelled = true
    }
  }, [backendScanResponse, didTryLoadLatestScan, token])

  const resolvedScanId = useMemo(
    () => location.state?.scanId ?? extractScanIdFromEnvelope(backendScanResponse) ?? null,
    [location.state?.scanId, backendScanResponse],
  )
  const allowAutoRegenerate = Boolean(location.state?.scanId)

  useEffect(() => {
    if (!resolvedScanId) {
      setIsRationReady(true)
      return
    }
    setIsRationReady(false)
  }, [resolvedScanId])

  useEffect(() => {
    if (!token || !resolvedScanId) return undefined
    if (!hasTranscriptsInResponse(backendScanResponse)) return undefined

    let cancelled = false
    let intervalId = null

    const finish = (allowNavigate) => {
      if (cancelled) return
      if (intervalId != null) {
        window.clearInterval(intervalId)
        intervalId = null
      }
      setIsRationReady(allowNavigate)
    }

    const poll = async () => {
      try {
        const data = await getRationGenerationStatus(token, resolvedScanId)
        if (cancelled) return true
        if (shouldStopRationStatusPolling(data)) {
          const status = parseWeekRationStatus(data)
          if (status === WEEK_RATION_GEN_STATUS.Completed) {
            finish(true)
            return true
          } else {
            if (allowAutoRegenerate && shouldAutoRegenerateRation(data)) {
              try {
                await postRationRegenerate(token, resolvedScanId)
                logger.info('ration auto-regenerate triggered after JSON parse failure', {
                  scanId: resolvedScanId,
                  reason: 'status_4_json_parse_error',
                })
                return false
              } catch (error) {
                logger.warn('ration auto-regenerate failed', error)
              }
            }
            logRationTerminalStatus(data)
            finish(false)
            return true
          }
        }
      } catch (error) {
        if (!cancelled) logger.warn('ration generation-status poll failed', error)
      }
      if (cancelled) return true
      return false
    }

    ;(async () => {
      const done = await poll()
      if (cancelled || done) return
      intervalId = window.setInterval(() => {
        void poll().then((stopped) => {
          if (stopped && intervalId != null) {
            window.clearInterval(intervalId)
            intervalId = null
          }
        })
      }, RATION_STATUS_POLL_MS)
    })()

    return () => {
      cancelled = true
      if (intervalId != null) {
        window.clearInterval(intervalId)
        intervalId = null
      }
    }
  }, [token, resolvedScanId, backendScanResponse, allowAutoRegenerate])

  const backendValue = backendScanResponse?.value ?? null
  const backendTranscripts = Array.isArray(backendValue?.transcripts)
    ? backendValue.transcripts.map(normalizeTranscript).filter(Boolean)
    : []

  // Если у показателя нет цвета (color === '' / null), значит он невалиден для отображения на UI
  const validBackendTranscripts = backendTranscripts.filter((t) => Boolean(t?.color))

  const cards = getCardsFromBackend(validBackendTranscripts)
  const visibleCards = showAllMetricsCards ? cards : cards.slice(0, 4)
  const hasAnyResults = cards.length > 0
  const healthScore = backendValue?.healthScore != null ? Number(backendValue.healthScore) : null
  const healthScoreColor = getGaugeColorByScore(healthScore)
  const healthBadgeText = getHealthBadgeText(healthScore)

  const firstRedCard = cards.find((c) => String(c?.color ?? '').toLowerCase() === 'red') ?? null
  const firstYellowCard = cards.find((c) => String(c?.color ?? '').toLowerCase() === 'yellow') ?? null

  // Приоритет текста под заголовком:
  // 1) первый красный, 2) первый жёлтый, 3) статичный "всё хорошо".
  const priorityCard = firstRedCard ?? firstYellowCard ?? null
  const priorityCommentText = priorityCard
    ? truncateText(priorityCard?.statusText || '')
    : 'Все показатели в пределах нормы. Продолжайте в том же духе.'

  const rationNavigateEnabled = !resolvedScanId || isRationReady

  if (!hasAnyResults) {
    logger.warn('Results page accessed without backend results')
    return (
      <Page>
        <div className="results-page">
          <div className="results-error">
            <h2>{isLoadingLatestScan ? 'Загружаем последний скан...' : 'Результаты ещё не готовы'}</h2>
            <p>
              {isLoadingLatestScan
                ? 'Проверяем ваш последний результат на сервере.'
                : 'Подождите обработку на сервере и попробуйте открыть результаты снова.'}
            </p>
            <button onClick={() => navigate('/camera')} className="results-button">
              Вернуться к измерению
            </button>
          </div>
        </div>
      </Page>
    )
  }
  logger.info('Results page displayed', {
    hasBackendTranscripts: backendTranscripts.length > 0,
    totalCards: cards.length,
  })

  return (
    <Page>
      <div className="results-page">
        <div className="results-header">
          <h1 className="results-title">Результаты</h1>
          <div className="results-subtitle">rPPG-сканирование и анализ показателей по шкалам</div>
          <div className="results-first-red-hint">
            {priorityCard && priorityCommentText
              ? `${priorityCard.title}: ${priorityCommentText}`
              : 'Все показатели в пределах нормы. Продолжайте в том же духе.'}
          </div>
        </div>

        {hasAnyResults && (
          <>
            <div className="results-gauge-wrapper">
              <HeartRateGauge value={healthScore} min={0} max={100} />
            </div>
            <div className="results-gauge-badge" style={{ background: healthScoreColor }}>
              {healthBadgeText}
            </div>
          </>
        )}

        {!hasAnyResults && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
            ⚠️ ВНИМАНИЕ: Данные есть, но не извлекаются. Проверьте консоль для отладки.
          </div>
        )}

        <div className="results-grid">
          {visibleCards.map((card) => {
            const theme = getCardThemeByColor(card.color)
            const statusText = getStatusByColor(card.color)
            const specialIconType = getSpecialIconType(card)
            return (
              <div
                key={card.key}
                className="result-card result-card--backend"
                style={{
                  '--card-bg': theme.cardBg,
                  '--border-color': theme.cardBorder,
                  '--icon-bg': theme.iconBg,
                  '--icon-color': theme.iconColor,
                  '--status-bg': theme.statusBg,
                  '--status-color': theme.statusColor,
                }}
                onClick={() =>
                  setActiveDetail({
                    title: card.title || card.key,
                    value: card.value ?? '—',
                    unit: card.unit || '',
                    statusText,
                    commentText: card.statusText || '',
                    statusBg: theme.statusBg,
                    statusColor: theme.statusColor,
                    description: card.description || '',
                  scaleMetadata: card.scaleMetadata || null,
                  })
                }
              >
                <div className="result-card-top">
                  <div className="result-card-icon" aria-hidden="true">
                    {specialIconType ? (
                      <span
                        className={`result-card-icon-special result-card-icon-special--${specialIconType}`}
                      />
                    ) : (
                      <span className="result-card-icon-dot" />
                    )}
                  </div>
                  <div className="result-label">{card.title || card.key}</div>
                </div>
                <div className="result-main">
                  <div className="result-value">{card.value ?? '—'}</div>
                  {card.unit ? <div className="result-unit">{card.unit}</div> : null}
                </div>
                {statusText ? <div className="result-status-pill">{statusText}</div> : null}
              </div>
            )
          })}
        </div>

        {hasAnyResults && (
          <button
            type="button"
            className="results-toggle-all"
            onClick={() => setShowAllMetricsCards((prev) => !prev)}
          >
            <span>{showAllMetricsCards ? 'Скрыть все показатели' : 'Показать все показатели'}</span>
            <span className={`results-toggle-all-arrow ${showAllMetricsCards ? 'open' : ''}`} aria-hidden="true">
              ▾
            </span>
          </button>
        )}

        <div className="results-actions">
          <p className="results-actions-disclaimer">
            Данный анализ не заменяет медицинскую консультацию.
          </p>
          <button
            type="button"
            onClick={() =>
              navigate('/nutrition', {
                state: resolvedScanId ? { scanId: resolvedScanId } : {},
              })
            }
            className={`results-button ${!rationNavigateEnabled ? 'results-button--ration-pending' : ''}`.trim()}
            disabled={!rationNavigateEnabled}
          >
            {!rationNavigateEnabled ? (
              <span className="results-button-ration-pending-inner">
                <span className="results-button-spinner" aria-hidden="true" />
                Рацион ещё генерируется…
              </span>
            ) : (
              'Подобрать рацион'
            )}
          </button>
          <button onClick={() => navigate('/camera')} className="results-button secondary">
            Измерить снова
          </button>
          <button onClick={() => navigate('/')} className="results-button secondary">
            На главную
          </button>
        </div>

        <ResultDetailSheet
          open={!!activeDetail}
          onClose={() => setActiveDetail(null)}
          title={activeDetail?.title}
          value={activeDetail?.value}
          unit={activeDetail?.unit}
          statusText={activeDetail?.statusText}
          commentText={activeDetail?.commentText}
          statusBg={activeDetail?.statusBg}
          statusColor={activeDetail?.statusColor}
          description={activeDetail?.description}
          scaleMetadata={activeDetail?.scaleMetadata}
        />
      </div>
    </Page>
  )
}

export default Results


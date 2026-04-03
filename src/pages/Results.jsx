import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import HeartRateGauge from '../components/HeartRateGauge.jsx'
import ResultDetailSheet from '../components/ResultDetailSheet.jsx'
import Modal from '../ui/Modal.jsx'
import {
  getScanHistory,
  extractScanIdFromEnvelope,
  getRationGenerationStatus,
  postRationRegenerate,
} from '../api/client.js'
import {
  extractLastScanResponse,
  extractHealthScoreForGauge,
  hasTranscriptsInResponse,
} from '../utils/scanHistory.js'
import {
  hasDisplayableScaleMetadata,
  isRawSdkMetricKey,
} from '../utils/resultMetricDisplay.js'
import { writeLastScanId } from '../utils/lastScanId.js'
import { readCachedScanEnvelope, writeCachedScanEnvelope } from '../utils/scanResultCache.js'
import { useAuth } from '../contexts/AuthContext.jsx'
import logger from '../utils/logger.js'
import './Results.css'

/**
 * Подмешивание healthScore при повторном GET для того же scanId (если в ответе балл пропал).
 */
function applyTrustedHealthScoreFromSave(envelope, trusted) {
  if (!envelope || typeof envelope !== 'object' || !trusted) return envelope
  const id = extractScanIdFromEnvelope(envelope)
  if (!id || id !== trusted.scanId) return envelope
  const hs = trusted.healthScore
  if (hs == null || !Number.isFinite(Number(hs))) return envelope
  const prevValue = envelope.value != null && typeof envelope.value === 'object' ? envelope.value : {}
  return {
    ...envelope,
    value: {
      ...prevValue,
      healthScore: Number(hs),
    },
  }
}

/**
 * GET /scan/get после сборки конверта иногда не содержит healthScore, хотя кеш/state уже показали верный балл.
 * При том же scanId не затираем число — иначе после F5 мигание: шкала верная → стрелка влево и бейдж «Ваши показатели».
 */
function mergeHealthScoreIfSameScan(prevEnvelope, nextEnvelope) {
  if (!nextEnvelope || typeof nextEnvelope !== 'object') return nextEnvelope

  const nextHs = extractHealthScoreForGauge(nextEnvelope)
  if (nextHs != null && Number.isFinite(Number(nextHs))) return nextEnvelope

  if (!prevEnvelope || typeof prevEnvelope !== 'object') return nextEnvelope

  const prevId = extractScanIdFromEnvelope(prevEnvelope)
  const nextId = extractScanIdFromEnvelope(nextEnvelope)
  const a = prevId != null ? String(prevId).trim() : ''
  const b = nextId != null ? String(nextId).trim() : ''
  if (!a || !b || a !== b) return nextEnvelope

  const prevHs = extractHealthScoreForGauge(prevEnvelope)
  if (prevHs == null || !Number.isFinite(Number(prevHs))) return nextEnvelope

  const nextValue = nextEnvelope.value != null && typeof nextEnvelope.value === 'object' ? nextEnvelope.value : {}
  return {
    ...nextEnvelope,
    value: {
      ...nextValue,
      healthScore: Number(prevHs),
    },
  }
}

const RATION_STATUS_POLL_MS = 2500

/** Меньше этого числа показателей в ответе — показываем предупреждение о повторном сканировании. */
const MIN_EXPECTED_METRIC_CARDS = 8

/** Полный набор показателей при удачном скане — для текста модалки «X из N». */
const FULL_SCAN_METRIC_TOTAL = 20

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

function finiteHealthScore(...candidates) {
  for (const x of candidates) {
    if (x == null || x === '') continue
    const n = Number(x)
    if (Number.isFinite(n)) return n
  }
  return null
}

/**
 * GET /scan/get (scan/get.md): transcripts и healthScore часто на value.data[0].
 * После extractLastScanResponse transcripts поднимаются в value, а healthScore может остаться только на data[0] —
 * тогда ранний return v терял балл и шкала уходила в «Ваши показатели».
 */
function pickDisplayScanValueFromEnvelope(envelope) {
  if (envelope == null || typeof envelope !== 'object') return null
  const v = envelope.value != null && typeof envelope.value === 'object' ? envelope.value : null
  if (!v) return null

  const row = Array.isArray(v.data) && v.data.length > 0 && typeof v.data[0] === 'object' ? v.data[0] : null
  const scoreOnValue = finiteHealthScore(v.healthScore, v.HealthScore)
  const scoreOnRow = row ? finiteHealthScore(row.healthScore, row.HealthScore) : null
  const score = scoreOnValue ?? scoreOnRow

  const topT = Array.isArray(v.transcripts) ? v.transcripts : []
  const rowT = row && Array.isArray(row.transcripts) ? row.transcripts : []

  // GET /scan/get: актуальные transcripts часто на value.data[0]. Корневые value.transcripts
  // иногда другой срез/кэш — не даём им перекрывать data[0], иначе на карточке «чужие» color/valueAlias/status.
  if (row && rowT.length > 0) {
    return {
      ...v,
      ...row,
      transcripts: rowT,
      ...(score != null ? { healthScore: score } : {}),
    }
  }

  if (topT.length > 0) {
    if (score != null && scoreOnValue == null) {
      return { ...v, healthScore: score }
    }
    return v
  }

  return v
}

/** Один ключ метрики — одна карточка; при дубликатах в массиве оставляем последнюю запись (часто самая свежая). */
function dedupeNormalizedTranscriptsByKey(transcripts) {
  if (!Array.isArray(transcripts) || transcripts.length === 0) return transcripts
  const map = new Map()
  for (const t of transcripts) {
    if (!t?.key) continue
    const k = String(t.key).trim()
    if (!k) continue
    map.set(k, t)
  }
  return Array.from(map.values())
}

function normalizeTranscript(t) {
  if (!t || typeof t !== 'object') return null
  const key = t.key ?? t.Key ?? t.metricKey ?? t.id
  if (key == null || String(key).trim() === '') return null
  const keyStr = String(key).trim()
  const valueAliasRaw = t.valueAlias ?? t.ValueAlias
  const valueAlias = valueAliasRaw == null ? '' : String(valueAliasRaw).trim()
  const statusRaw = t.status ?? t.Status
  const status =
    statusRaw == null ||
    statusRaw === '' ||
    (typeof statusRaw !== 'string' && typeof statusRaw !== 'number' && typeof statusRaw !== 'boolean')
      ? ''
      : String(statusRaw).trim()
  return {
    key: keyStr,
    name: t.name || t.Name || keyStr,
    value: t.value ?? t.Value,
    valueAlias,
    status,
    unit: t.unit || t.Unit || '',
    color: t.color || t.Color || '',
    description: t.descriptionUser || t.description || '',
    comment: t.commentUser || t.comment || '',
    confidenceLevel: t.confidenceLevel ?? null,
    scaleMetadata: t.scaleMetadata ?? null,
  }
}

/**
 * Одна логика для обоих сценариев: после скана (state) и при открытии /results (история).
 * В обоих случаях данные приходят в backendScanResponse → normalizeTranscript → этот фильтр.
 */
function isTranscriptVisibleInUi(t) {
  if (!t?.key) return false
  const color = String(t.color ?? '').trim().toLowerCase()
  const hasTraffic = color === 'green' || color === 'yellow' || color === 'red'
  const comment = String(t.comment ?? '').trim()
  const desc = String(t.description ?? '').trim()
  const hasUserText = Boolean(comment || desc)
  const usableScale = hasDisplayableScaleMetadata(t.scaleMetadata)
  const conf = Number(t.confidenceLevel)
  const hasConfidence = Number.isFinite(conf) && conf > 0

  if (isRawSdkMetricKey(t.key)) {
    if (hasUserText && hasTraffic) return true
    if (usableScale && hasTraffic) return true
    if (hasUserText && usableScale) return true
    return false
  }

  if (hasTraffic) return true
  if (hasUserText) return true
  if (usableScale) return true
  if (hasConfidence) return true
  return false
}

function getCardsFromBackend(transcripts = []) {
  return transcripts
    .filter((t) => t?.key)
    .map((tr) => {
      const hasAlias = Boolean(String(tr.valueAlias ?? '').trim())
      return {
        key: tr.key,
        title: tr.name,
        value: hasAlias ? tr.valueAlias : tr.value,
        hasValueAlias: hasAlias,
        unit: tr.unit,
        backendStatus: String(tr.status ?? '').trim(),
        comment: tr.comment || '',
        description: tr.description || '',
        color: tr.color,
        confidenceLevel: tr.confidenceLevel,
        scaleMetadata: tr.scaleMetadata ?? null,
      }
    })
}

/** Текст плашки статуса только из бэкенда (`status`), без подстановок с фронта. */
function cardStatusLabel(card) {
  return String(card?.backendStatus ?? '').trim()
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
  if (key === 'yellow' || key === 'orange') {
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

/** Для подсказки под заголовком: красный важнее жёлтого независимо от порядка карточек. */
function transcriptSeverityRank(color) {
  const k = String(color ?? '').toLowerCase()
  if (k === 'red') return 3
  if (k === 'yellow' || k === 'orange') return 2
  return 0
}

function pickPriorityHintCard(cards) {
  if (!Array.isArray(cards) || cards.length === 0) return null
  let picked = null
  let best = 0
  for (const c of cards) {
    const r = transcriptSeverityRank(c?.color)
    if (r > best) {
      best = r
      picked = c
    }
  }
  return best >= 2 ? picked : null
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

function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const { token } = useAuth()

  const latestHistoryFetchGenRef = useRef(0)
  /** { scanId, healthScore } из state при входе на результаты — подмешиваем, если повторный GET обрезал балл */
  const trustedHealthFromSaveRef = useRef(null)

  const [showAllMetricsCards, setShowAllMetricsCards] = useState(false)
  const [activeDetail, setActiveDetail] = useState(null)
  const [backendScanResponse, setBackendScanResponse] = useState(
    () => location.state?.backendScanResponse ?? readCachedScanEnvelope() ?? null,
  )
  const [isRationReady, setIsRationReady] = useState(() => {
    const hydrated =
      location.state?.backendScanResponse ?? readCachedScanEnvelope() ?? null
    const sid = location.state?.scanId ?? extractScanIdFromEnvelope(hydrated)
    return !sid
  })
  const [lowMetricsNoticeDismissed, setLowMetricsNoticeDismissed] = useState(false)

  const truncateText = (text, maxLen = 90) => {
    const s = String(text ?? '').trim()
    if (!s) return ''
    if (s.length <= maxLen) return s
    return `${s.slice(0, maxLen).trim()}…`
  }

  useEffect(() => {
    const raw = location.state?.backendScanResponse
    if (raw != null && typeof raw === 'object') {
      setBackendScanResponse(raw)
    }
  }, [location.state?.backendScanResponse])

  useEffect(() => {
    const st = location.state
    const raw = st?.backendScanResponse
    const sid = st?.scanId ?? extractScanIdFromEnvelope(raw ?? null)
    if (raw && hasTranscriptsInResponse(raw) && sid) {
      const hs = extractHealthScoreForGauge(raw)
      if (hs != null && Number.isFinite(Number(hs))) {
        trustedHealthFromSaveRef.current = {
          scanId: String(sid).trim(),
          healthScore: Number(hs),
        }
        return
      }
    }
    if (!st?.backendScanResponse && !st?.scanId) {
      trustedHealthFromSaveRef.current = null
    }
  }, [location.state])

  useEffect(() => {
    if (hasTranscriptsInResponse(backendScanResponse)) {
      writeCachedScanEnvelope(backendScanResponse)
    }
  }, [backendScanResponse])

  // Всегда запрашиваем GET /scan/get при заходе на экран (и после обновления вкладки):
  // иначе при наличии кеша в localStorage запрос не уходил, в Network пусто, UI мог быть неактуален.
  // Кеш/state даёт быстрый первый кадр; ответ сервера подменяет состояние, если скан найден.
  useEffect(() => {
    if (!token) return undefined

    const gen = ++latestHistoryFetchGenRef.current

    getScanHistory(token, { pageNumber: 1, pageSize: 10 })
      .then((data) => {
        if (gen !== latestHistoryFetchGenRef.current) return
        const lastScan = extractLastScanResponse(data)
        if (lastScan) {
          setBackendScanResponse((prev) => {
            const merged = applyTrustedHealthScoreFromSave(
              lastScan,
              trustedHealthFromSaveRef.current,
            )
            return mergeHealthScoreIfSameScan(prev, merged)
          })
        }
      })
      .catch((error) => {
        if (gen !== latestHistoryFetchGenRef.current) return
        logger.warn('Failed to fetch latest scan via /scan/get', error)
      })

    return () => {
      latestHistoryFetchGenRef.current += 1
    }
  }, [token, location.key])

  const resolvedScanId = useMemo(
    () => location.state?.scanId ?? extractScanIdFromEnvelope(backendScanResponse) ?? null,
    [location.state?.scanId, backendScanResponse],
  )
  const allowAutoRegenerate = Boolean(location.state?.scanId)

  useEffect(() => {
    setLowMetricsNoticeDismissed(false)
  }, [resolvedScanId])

  useEffect(() => {
    if (resolvedScanId) writeLastScanId(resolvedScanId)
  }, [resolvedScanId])

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

  const backendValue = useMemo(
    () => pickDisplayScanValueFromEnvelope(backendScanResponse),
    [backendScanResponse],
  )
  const backendTranscripts = useMemo(() => {
    if (!Array.isArray(backendValue?.transcripts)) return []
    const list = backendValue.transcripts
      .map(normalizeTranscript)
      .filter(Boolean)
      .filter(isTranscriptVisibleInUi)
    return dedupeNormalizedTranscriptsByKey(list)
  }, [backendValue?.transcripts])

  // Показываем показатели с key после фильтра «пустых» сырых метрик
  const cards = getCardsFromBackend(backendTranscripts.filter((t) => t?.key))
  const visibleCards = showAllMetricsCards ? cards : cards.slice(0, 4)
  const healthScore = useMemo(() => {
    const raw = backendValue?.healthScore
    if (raw != null && Number.isFinite(Number(raw))) return Number(raw)
    const extracted = extractHealthScoreForGauge(backendScanResponse)
    return extracted != null && Number.isFinite(Number(extracted)) ? Number(extracted) : null
  }, [backendScanResponse, backendValue?.healthScore])

  const hasAnyResults = cards.length > 0 || healthScore != null
  const healthScoreColor = getGaugeColorByScore(healthScore)
  const healthBadgeText = getHealthBadgeText(healthScore)

  // Подсказка: приоритетная карточка по color с бэка; текст только status + comment из ответа API.
  const priorityCard = pickPriorityHintCard(cards)
  const priorityHintBody =
    priorityCard &&
    (String(priorityCard.backendStatus ?? '').trim() || String(priorityCard.comment ?? '').trim() || '')

  const priorityHintStyle =
    priorityCard && transcriptSeverityRank(priorityCard.color) >= 2
      ? { color: getCardThemeByColor(priorityCard.color).statusColor }
      : undefined

  const rationNavigateEnabled = !resolvedScanId || isRationReady

  const headerHint = !token
    ? 'Войдите в приложение, чтобы увидеть результаты сканирования.'
    : !hasAnyResults
      ? 'Пока нет данных для отображения. Вы можете пройти измерение заново.'
      : priorityCard
        ? priorityHintBody
          ? `${priorityCard.title}: ${truncateText(priorityHintBody)}`
          : String(priorityCard.title || '').trim() || 'Результаты сканирования'
        : 'Все показатели в пределах нормы. Продолжайте в том же духе.'

  if (hasAnyResults) {
    logger.info('Results page displayed', {
      hasBackendTranscripts: backendTranscripts.length > 0,
      totalCards: cards.length,
    })
  }

  const shouldShowLowMetricsNotice =
    hasAnyResults &&
    cards.length > 0 &&
    cards.length < MIN_EXPECTED_METRIC_CARDS &&
    !lowMetricsNoticeDismissed

  return (
    <Page>
      <div className="results-page">
        <div className="results-header">
          <h1 className="results-title">Результаты</h1>
          <div className="results-subtitle">rPPG-сканирование и анализ показателей по шкалам</div>
          <div className="results-first-red-hint" style={priorityHintStyle}>
            {headerHint}
          </div>
        </div>

        {hasAnyResults ? (
          <>
            <div className="results-gauge-wrapper">
              <HeartRateGauge value={healthScore} min={0} max={100} />
            </div>
            <div className="results-gauge-badge" style={{ background: healthScoreColor }}>
              {healthBadgeText}
            </div>
          </>
        ) : null}

        <div className="results-grid">
          {visibleCards.map((card, cardIndex) => {
            const theme = getCardThemeByColor(card.color)
            const statusLabel = cardStatusLabel(card)
            const specialIconType = getSpecialIconType(card)
            return (
              <div
                key={`${card.key}-${cardIndex}`}
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
                    statusText: statusLabel,
                    commentText: card.comment || '',
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
                  <div className={`result-value${card.hasValueAlias ? ' result-value--alias' : ''}`}>
                    {card.value ?? '—'}
                  </div>
                  {card.unit ? <div className="result-unit">{card.unit}</div> : null}
                </div>
                {statusLabel ? <div className="result-status-pill">{statusLabel}</div> : null}
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
                state: {
                  ...(resolvedScanId ? { scanId: resolvedScanId } : {}),
                  returnTo: '/results',
                },
              })
            }
            className={`results-button ${!rationNavigateEnabled ? 'results-button--ration-pending' : ''}`.trim()}
            disabled={!token || !hasAnyResults || !rationNavigateEnabled}
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
          {!rationNavigateEnabled ? (
            <p className="results-ration-pending-hint">Ваш рацион будет готов примерно через 1 минуту</p>
          ) : null}
          <button
            onClick={() => {
              navigate('/camera', {
                state: {
                  allowCameraEntry: true,
                  cameraEntryAt: Date.now(),
                },
              })
            }}
            className="results-button secondary"
          >
            Измерить снова
          </button>
          <button type="button" onClick={() => navigate('/welcome')} className="results-button secondary">
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

        <Modal
          isOpen={shouldShowLowMetricsNotice}
          onClose={() => setLowMetricsNoticeDismissed(true)}
          title="Неполный результат"
          description={`Определено ${cards.length} из ${FULL_SCAN_METRIC_TOTAL} показателей. Чтобы получить более полный результат, повторите сканирование.`}
          descriptionClassName="modal-description--low-metrics"
          confirmClassName="modal-button-confirm--outline"
          singleButton
          topButtonText="Повторить сканирование"
          onTopButtonClick={() => {
            setLowMetricsNoticeDismissed(true)
            navigate('/preparation')
          }}
          confirmText="Показать текущий результат"
        />
      </div>
    </Page>
  )
}

export default Results


import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import HeartRateGauge from '../components/HeartRateGauge.jsx'
import ResultDetailSheet from '../components/ResultDetailSheet.jsx'
import logger from '../utils/logger.js'
import './Results.css'

const CARD_CLASS_BY_KEY = {
  pulseRate: 'result-card--pulse',
  respirationRate: 'result-card--respiration',
  stressLevel: 'result-card--stress',
  bloodPressure: 'result-card--bp',
  sdnn: 'result-card--sdnn',
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
  if (score >= 66) return 'Все хорошо'
  if (score >= 33) return 'Средний уровень'
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
  }
}

function getSdkValue(item) {
  if (item == null) return null
  if (typeof item === 'object' && 'value' in item) return item.value
  if (typeof item === 'number' || typeof item === 'string') return item
  return null
}

function getCardsFromBackend(transcripts = []) {
  const map = new Map(transcripts.map((t) => [t.key, t]))

  const systolic = map.get('bloodPressureSystolic')
  const diastolic = map.get('bloodPressureDiastolic')

  const cards = []
  const priorityKeys = ['pulseRate', 'respirationRate', 'stressLevel', 'sdnn']
  priorityKeys.forEach((key) => {
    const tr = map.get(key)
    if (!tr) return
    cards.push({
      key,
      title: tr.name,
      value: tr.value,
      unit: tr.unit,
      statusText: tr.comment || '',
      description: tr.description || '',
      color: tr.color,
      confidenceLevel: tr.confidenceLevel,
    })
  })

  if (systolic && diastolic) {
    cards.push({
      key: 'bloodPressure',
      title: 'Артериальное давление',
      value: `${systolic.value}/${diastolic.value}`,
      unit: systolic.unit || diastolic.unit || 'мм рт. ст.',
      statusText: systolic.comment || diastolic.comment || '',
      description: systolic.description || diastolic.description || '',
      color: systolic.color || diastolic.color || '',
      confidenceLevel: systolic.confidenceLevel ?? diastolic.confidenceLevel ?? null,
    })
  }

  transcripts
    .filter(
      (t) =>
        t.key &&
        !['pulseRate', 'respirationRate', 'stressLevel', 'sdnn', 'bloodPressureSystolic', 'bloodPressureDiastolic'].includes(t.key),
    )
    .forEach((tr) => {
      cards.push({
        key: tr.key,
        title: tr.name,
        value: tr.value,
        unit: tr.unit,
        statusText: tr.comment || '',
        description: tr.description || '',
        color: tr.color,
        confidenceLevel: tr.confidenceLevel,
      })
    })

  return cards
}

function getCardsFromSdk(sdkResults) {
  if (!sdkResults || typeof sdkResults !== 'object') return []
  const pulseRate = sdkResults.pulseRate
  const respirationRate = sdkResults.respirationRate
  const stressLevel = sdkResults.stressLevel
  const sdnn = sdkResults.sdnn
  const bloodPressure = sdkResults.bloodPressure

  let bp = null
  if (bloodPressure?.value && typeof bloodPressure.value === 'object') {
    bp = `${bloodPressure.value.systolic}/${bloodPressure.value.diastolic}`
  }

  const cards = [
    pulseRate && {
      key: 'pulseRate',
      title: 'Пульс',
      value: getSdkValue(pulseRate),
      unit: 'уд/мин',
      statusText: '',
      description: '',
      color: '',
      confidenceLevel: pulseRate.confidenceLevel ?? null,
    },
    respirationRate && {
      key: 'respirationRate',
      title: 'Частота дыхания',
      value: getSdkValue(respirationRate),
      unit: 'дых/мин',
      statusText: '',
      description: '',
      color: '',
      confidenceLevel: respirationRate.confidenceLevel ?? null,
    },
    stressLevel && {
      key: 'stressLevel',
      title: 'Уровень стресса',
      value: getSdkValue(stressLevel),
      unit: 'уровень',
      statusText: '',
      description: '',
      color: '',
      confidenceLevel: stressLevel.confidenceLevel ?? null,
    },
    bp && {
      key: 'bloodPressure',
      title: 'Артериальное давление',
      value: bp,
      unit: 'мм рт. ст.',
      statusText: '',
      description: '',
      color: '',
      confidenceLevel: bloodPressure?.confidenceLevel ?? null,
    },
    sdnn && {
      key: 'sdnn',
      title: 'SDNN',
      value: getSdkValue(sdnn),
      unit: 'мс',
      statusText: '',
      description: '',
      color: '',
      confidenceLevel: sdnn.confidenceLevel ?? null,
    },
  ].filter(Boolean)

  return cards
}

function Results() {
  const [showAllMetricsCards, setShowAllMetricsCards] = useState(false)
  const [activeDetail, setActiveDetail] = useState(null)
  const location = useLocation()
  const navigate = useNavigate()
  const backendScanResponse = location.state?.backendScanResponse
  const backendValue = backendScanResponse?.value ?? null
  const backendTranscripts = Array.isArray(backendValue?.transcripts)
    ? backendValue.transcripts.map(normalizeTranscript).filter(Boolean)
    : []

  const cards = getCardsFromBackend(backendTranscripts)
  const visibleCards = showAllMetricsCards ? cards : cards.slice(0, 4)
  const hasAnyResults = cards.length > 0
  const healthScore = backendValue?.healthScore != null ? Number(backendValue.healthScore) : null
  const healthScoreColor = getGaugeColorByScore(healthScore)
  const healthBadgeText = getHealthBadgeText(healthScore)

  if (!hasAnyResults) {
    logger.warn('Results page accessed without backend results')
    return (
      <Page>
        <div className="results-page">
          <div className="results-error">
            <h2>Результаты ещё не готовы</h2>
            <p>Подождите обработку на сервере и попробуйте открыть результаты снова.</p>
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
          <h1 className="results-title">Результаты измерения</h1>
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
          {visibleCards.map((card) => (
            <div
              key={card.key}
              className={`result-card ${CARD_CLASS_BY_KEY[card.key] || 'result-card--extra'}`.trim()}
              onClick={() =>
                setActiveDetail({
                  title: card.title || card.key,
                  value: card.value ?? '—',
                  unit: card.unit || '',
                  statusText: card.statusText || '',
                  description: card.description || '',
                })
              }
            >
              <div className="result-card-top">
                <div className="result-card-icon" aria-hidden="true">
                  <span className="result-card-icon-dot" />
                </div>
                <div className="result-label">{card.title || card.key}</div>
              </div>
              <div className="result-main">
                <div className="result-value">{card.value ?? '—'}</div>
                {card.unit ? <div className="result-unit">{card.unit}</div> : null}
              </div>
              {card.statusText ? <div className="result-status-pill">{card.statusText}</div> : null}
              {card.confidenceLevel != null ? (
                <div className="result-confidence">Уверенность: {card.confidenceLevel}</div>
              ) : null}
            </div>
          ))}
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
          <button onClick={() => navigate('/nutrition')} className="results-button">
            Подобрать рацион
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
          onSelectPlan={() => {
            setActiveDetail(null)
            navigate('/nutrition')
          }}
          title={activeDetail?.title}
          value={activeDetail?.value}
          unit={activeDetail?.unit}
          statusText={activeDetail?.statusText}
          description={activeDetail?.description}
        />
      </div>
    </Page>
  )
}

export default Results


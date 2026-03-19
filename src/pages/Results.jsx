import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import HeartRateGauge from '../components/HeartRateGauge.jsx'
import ResultDetailSheet from '../components/ResultDetailSheet.jsx'
import logger from '../utils/logger.js'
import './Results.css'

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
  if (key === 'yellow') return 'Повышено'
  if (key === 'red') return 'Требует внимания'
  return ''
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
          {visibleCards.map((card) => {
            const theme = getCardThemeByColor(card.color)
            const statusText = getStatusByColor(card.color)
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
                    <span className="result-card-icon-dot" />
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


import { useLocation, useNavigate } from 'react-router-dom'
import Page from '../layout/Page.jsx'
import logger from '../utils/logger.js'
import './Results.css'

function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const results = location.state?.results

  if (!results || !results.results) {
    logger.warn('Results page accessed without results data')
    return (
      <Page>
        <div className="results-page">
          <div className="results-error">
            <h2>Результаты не найдены</h2>
            <p>Пожалуйста, пройдите измерение заново.</p>
            <button onClick={() => navigate('/camera')} className="results-button">
              Вернуться к измерению
            </button>
          </div>
        </div>
      </Page>
    )
  }

  const { pulseRate, stressLevel, respirationRate, bloodPressure, sdnn } = results.results

  // Безопасное извлечение значений (SDK может возвращать объекты с value или прямые значения)
  const getValue = (item) => {
    if (item === null || item === undefined) return null
    if (typeof item === 'object' && 'value' in item) {
      return item.value
    }
    // Если это число (включая 0) или строка, возвращаем как есть
    if (typeof item === 'number' || typeof item === 'string') {
      return item
    }
    return item
  }

  const stressLevelValue = getValue(stressLevel)
  const pulseRateValue = getValue(pulseRate)
  const respirationRateValue = getValue(respirationRate)
  const sdnnValue = getValue(sdnn)

  // Детальное логирование для отладки
  console.log('🔍 ДЕТАЛЬНАЯ ОТЛАДКА ИЗВЛЕЧЕНИЯ ЗНАЧЕНИЙ:', {
    pulseRate: { raw: pulseRate, extracted: pulseRateValue, type: typeof pulseRate },
    stressLevel: { raw: stressLevel, extracted: stressLevelValue, type: typeof stressLevel },
    respirationRate: { raw: respirationRate, extracted: respirationRateValue, type: typeof respirationRate },
    sdnn: { raw: sdnn, extracted: sdnnValue, type: typeof sdnn },
    bloodPressure: { raw: bloodPressure, type: typeof bloodPressure },
  })

  // Обработка bloodPressure (может быть объектом с systolic и diastolic)
  // ВАЖНО: По логам структура: bloodPressure.value.systolic и bloodPressure.value.diastolic
  let bloodPressureSystolic = null
  let bloodPressureDiastolic = null
  if (bloodPressure) {
    if (typeof bloodPressure === 'object') {
      // Сначала проверяем структуру bloodPressure.value.systolic (как в логах)
      if ('value' in bloodPressure && typeof bloodPressure.value === 'object') {
        const bpValue = bloodPressure.value
        if ('systolic' in bpValue && 'diastolic' in bpValue) {
          bloodPressureSystolic = typeof bpValue.systolic === 'object' && 'value' in bpValue.systolic 
            ? bpValue.systolic.value 
            : bpValue.systolic
          bloodPressureDiastolic = typeof bpValue.diastolic === 'object' && 'value' in bpValue.diastolic 
            ? bpValue.diastolic.value 
            : bpValue.diastolic
        }
      } else if ('systolic' in bloodPressure && 'diastolic' in bloodPressure) {
        // Если это объект с systolic и diastolic напрямую
        bloodPressureSystolic = typeof bloodPressure.systolic === 'object' && 'value' in bloodPressure.systolic 
          ? bloodPressure.systolic.value 
          : bloodPressure.systolic
        bloodPressureDiastolic = typeof bloodPressure.diastolic === 'object' && 'value' in bloodPressure.diastolic 
          ? bloodPressure.diastolic.value 
          : bloodPressure.diastolic
      }
    }
  }

  // Формируем список всех показателей SDK для пользовательского отображения
  const allMetrics = Object.entries(results.results || {}).map(([key, value]) => {
    let displayValue = value
    let extra = null

    if (value && typeof value === 'object') {
      if ('value' in value) {
        displayValue = value.value
      } else if ('systolic' in value || 'diastolic' in value) {
        // Обработка bloodPressure
        const s = typeof value.systolic === 'object' && value.systolic && 'value' in value.systolic
          ? value.systolic.value
          : value.systolic
        const d = typeof value.diastolic === 'object' && value.diastolic && 'value' in value.diastolic
          ? value.diastolic.value
          : value.diastolic
        displayValue = `${s}/${d}`
      } else if (value.value && typeof value.value === 'object' && ('systolic' in value.value || 'diastolic' in value.value)) {
        // Обработка bloodPressure.value.systolic/diastolic
        const s = value.value.systolic
        const d = value.value.diastolic
        displayValue = `${s}/${d}`
      } else {
        displayValue = JSON.stringify(value)
      }

      const rawConfidence = value.confidence ?? value.confidenceLevel
      if (rawConfidence !== undefined) {
        if (typeof rawConfidence === 'number') {
          extra = `${Math.round(rawConfidence * 100)}%`
        } else {
          extra = String(rawConfidence)
        }
      }
    }

    return { key, value: displayValue, extra }
  })

  // Выводим полные данные в консоль для отладки
  console.log('📊📊📊 РЕЗУЛЬТАТЫ НА СТРАНИЦЕ RESULTS (можно развернуть в консоли):', {
    fullResults: results,
    extractedResults: results.results,
    pulseRate,
    stressLevel,
    respirationRate,
    bloodPressure,
    sdnn,
    allMetrics,
  })
  
  logger.info('Results page displayed', {
    hasPulseRate: !!pulseRate,
    hasStressLevel: stressLevelValue !== null && stressLevelValue !== undefined,
    hasRespirationRate: !!respirationRate,
    hasBloodPressure: !!bloodPressure,
    hasSdnn: !!sdnn,
    stressLevelValue,
    pulseRateValue,
    respirationRateValue,
    sdnnValue,
    bloodPressureSystolic,
    bloodPressureDiastolic,
    note: 'Полные данные можно увидеть в console.log выше'
  })

  // Проверяем, есть ли хотя бы одно значение для отображения
  const hasAnyResults = (pulseRateValue !== null && pulseRateValue !== undefined) || 
                       (respirationRateValue !== null && respirationRateValue !== undefined) ||
                       (stressLevelValue !== null && stressLevelValue !== undefined) ||
                       (bloodPressureSystolic !== null && bloodPressureDiastolic !== null) ||
                       (sdnnValue !== null && sdnnValue !== undefined) ||
                       (pulseRate && (pulseRate.value !== undefined || typeof pulseRate === 'number')) ||
                       (respirationRate && (respirationRate.value !== undefined || typeof respirationRate === 'number')) ||
                       (stressLevel !== undefined && stressLevel !== null) ||
                       (bloodPressure && (bloodPressure.systolic || bloodPressure.diastolic)) ||
                       (sdnn && (sdnn.value !== undefined || typeof sdnn === 'number'))

  console.log('🔍 ПРОВЕРКА ОТОБРАЖЕНИЯ:', {
    hasAnyResults,
    pulseRateValue,
    respirationRateValue,
    stressLevelValue,
    bloodPressureSystolic,
    bloodPressureDiastolic,
    sdnnValue,
    willRenderPulse: pulseRateValue !== null && pulseRateValue !== undefined || pulseRate,
    willRenderRespiration: respirationRateValue !== null && respirationRateValue !== undefined || respirationRate,
    willRenderStress: stressLevelValue !== null && stressLevelValue !== undefined || stressLevel !== undefined,
    willRenderBP: (bloodPressureSystolic !== null && bloodPressureDiastolic !== null) || bloodPressure,
    willRenderSdnn: sdnnValue !== null && sdnnValue !== undefined || sdnn,
  })

  return (
    <Page>
      <div className="results-page">
        <h1 className="results-title">Результаты измерения</h1>
        
        {!hasAnyResults && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
            ⚠️ ВНИМАНИЕ: Данные есть, но не извлекаются. Проверьте консоль для отладки.
          </div>
        )}
        
        <div className="results-grid">
          {/* Пульс */}
          {((pulseRateValue !== null && pulseRateValue !== undefined) || (pulseRate && (pulseRate.value !== undefined || typeof pulseRate === 'number'))) ? (
            <div className="result-card">
              <div className="result-label">Пульс</div>
              <div className="result-value">{pulseRateValue ?? (pulseRate?.value ?? pulseRate ?? '—')}</div>
              <div className="result-unit">уд/мин</div>
              {pulseRate && typeof pulseRate === 'object' && pulseRate.confidence && (
                <div className="result-confidence">
                  Уверенность: {Math.round(pulseRate.confidence * 100)}%
                </div>
              )}
            </div>
          ) : null}

          {/* Частота дыхания */}
          {((respirationRateValue !== null && respirationRateValue !== undefined) || (respirationRate && (respirationRate.value !== undefined || typeof respirationRate === 'number'))) ? (
            <div className="result-card">
              <div className="result-label">Частота дыхания</div>
              <div className="result-value">{respirationRateValue ?? (respirationRate?.value ?? respirationRate ?? '—')}</div>
              <div className="result-unit">дых/мин</div>
              {respirationRate && typeof respirationRate === 'object' && respirationRate.confidence && (
                <div className="result-confidence">
                  Уверенность: {Math.round(respirationRate.confidence * 100)}%
                </div>
              )}
            </div>
          ) : null}

          {/* Уровень стресса */}
          {((stressLevelValue !== null && stressLevelValue !== undefined) || (stressLevel && (stressLevel.value !== undefined || stressLevel !== null))) ? (
            <div className="result-card">
              <div className="result-label">Уровень стресса</div>
              <div className="result-value">{stressLevelValue ?? (stressLevel?.value ?? stressLevel ?? '—')}</div>
              <div className="result-unit">из 10</div>
              {stressLevel && typeof stressLevel === 'object' && stressLevel.confidence && (
                <div className="result-confidence">
                  Уверенность: {Math.round(stressLevel.confidence * 100)}%
                </div>
              )}
            </div>
          ) : null}

          {/* Артериальное давление */}
          {((bloodPressureSystolic !== null && bloodPressureDiastolic !== null) || 
            (bloodPressure && bloodPressure.value && bloodPressure.value.systolic && bloodPressure.value.diastolic) ||
            (bloodPressure && bloodPressure.systolic && bloodPressure.diastolic)) ? (
            <div className="result-card">
              <div className="result-label">Артериальное давление</div>
              <div className="result-value">
                {bloodPressureSystolic !== null && bloodPressureDiastolic !== null 
                  ? `${bloodPressureSystolic}/${bloodPressureDiastolic}`
                  : bloodPressure?.value?.systolic && bloodPressure?.value?.diastolic
                    ? `${bloodPressure.value.systolic}/${bloodPressure.value.diastolic}`
                    : bloodPressure?.systolic && bloodPressure?.diastolic
                      ? `${bloodPressure.systolic}/${bloodPressure.diastolic}`
                      : '—'}
              </div>
              <div className="result-unit">мм рт. ст.</div>
              {bloodPressure && typeof bloodPressure === 'object' && bloodPressure.confidence && (
                <div className="result-confidence">
                  Уверенность: {Math.round(bloodPressure.confidence * 100)}%
                </div>
              )}
            </div>
          ) : null}

          {/* SDNN */}
          {((sdnnValue !== null && sdnnValue !== undefined) || (sdnn && (sdnn.value !== undefined || typeof sdnn === 'number'))) ? (
            <div className="result-card">
              <div className="result-label">SDNN</div>
              <div className="result-value">{sdnnValue ?? (sdnn?.value ?? sdnn ?? '—')}</div>
              <div className="result-unit">мс</div>
              {sdnn && typeof sdnn === 'object' && sdnn.confidence && (
                <div className="result-confidence">
                  Уверенность: {Math.round(sdnn.confidence * 100)}%
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Все показатели SDK */}
        {allMetrics && allMetrics.length > 0 && (
          <div className="results-raw">
            <h2 className="results-subtitle">Все показатели SDK</h2>
            <div className="results-raw-list">
              {allMetrics.map((metric) => (
                <div key={metric.key} className="results-raw-row">
                  <div className="results-raw-key">{metric.key}</div>
                  <div className="results-raw-value">
                    {metric.value !== undefined && metric.value !== null ? String(metric.value) : '—'}
                    {metric.extra && (
                      <span className="results-raw-extra"> (conf: {metric.extra})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="results-actions">
          <button onClick={() => navigate('/camera')} className="results-button">
            Измерить снова
          </button>
          <button onClick={() => navigate('/')} className="results-button secondary">
            На главную
          </button>
        </div>
      </div>
    </Page>
  )
}

export default Results


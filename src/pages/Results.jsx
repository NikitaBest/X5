import { useLocation, useNavigate } from 'react-router-dom'
import { useUserData } from '../contexts/UserDataContext.jsx'
import Page from '../layout/Page.jsx'
import logger from '../utils/logger.js'
import './Results.css'

function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const { userData } = useUserData()
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

  const handleDownloadJson = () => {
    // Данные пользователя, которые передавались в SDK (пол, возраст, рост, вес, курение)
    const userInfo = (userData?.age != null || userData?.gender || userData?.weight != null || userData?.height != null || userData?.smokingStatus)
      ? {
          sex: userData.gender || null,
          age: userData.age ?? null,
          heightCm: userData.height ?? null,
          weightKg: userData.weight ?? null,
          smokingStatus: userData.smokingStatus || null,
        }
      : null

    // Собираем полезный JSON: данные пользователя + метрики + сырой ответ SDK
    const payload = {
      takenAt: results?.measurementTime || new Date().toISOString(),
      source: 'web_sdk',
      ...(userInfo && { userInfo }),
      metrics: {
        pulseRate: {
          value: pulseRateValue ?? (pulseRate?.value ?? pulseRate ?? null),
          unit: 'bpm',
          confidence: pulseRate && typeof pulseRate === 'object' ? pulseRate.confidence ?? null : null,
        },
        respirationRate: {
          value: respirationRateValue ?? (respirationRate?.value ?? respirationRate ?? null),
          unit: 'breaths_per_min',
          confidence: respirationRate && typeof respirationRate === 'object' ? respirationRate.confidence ?? null : null,
        },
        stressLevel: {
          value: stressLevelValue ?? (stressLevel?.value ?? stressLevel ?? null),
          unit: 'ratio',
          confidence: stressLevel && typeof stressLevel === 'object' ? stressLevel.confidence ?? null : null,
        },
        sdnn: {
          value: sdnnValue ?? (sdnn?.value ?? sdnn ?? null),
          unit: 'ms',
          confidence: sdnn && typeof sdnn === 'object' ? sdnn.confidence ?? null : null,
        },
        bloodPressure: {
          systolic: bloodPressureSystolic,
          diastolic: bloodPressureDiastolic,
          unit: 'mmHg',
          confidence: bloodPressure && typeof bloodPressure === 'object' ? bloodPressure.confidence ?? null : null,
        },
      },
      sdkRaw: results,
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `binah-results-${new Date().toISOString()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Page>
      <div className="results-page">
        <div className="results-header">
          <h1 className="results-title">Результаты измерения</h1>
          <button type="button" className="results-download-button" onClick={handleDownloadJson}>
            Скачать JSON
          </button>
        </div>
        
        {!hasAnyResults && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
            ⚠️ ВНИМАНИЕ: Данные есть, но не извлекаются. Проверьте консоль для отладки.
          </div>
        )}

        {hasAnyResults && (
          <div className="results-summary-card">
            <div className="results-summary-icon">
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  d="M10 1.667C5.40002 1.667 1.66669 5.40033 1.66669 10.0003C1.66669 14.6003 5.40002 18.3337 10 18.3337C14.6 18.3337 18.3334 14.6003 18.3334 10.0003C18.3334 5.40033 14.6 1.667 10 1.667Z"
                  fill="rgba(149, 219, 109, 0.16)"
                />
                <path
                  d="M7.91669 10.4167L9.16669 11.6667L12.0834 8.33337"
                  stroke="#5DAF2E"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="results-summary-text">
              <div className="results-summary-title">Анализ завершён</div>
              <div className="results-summary-subtitle">
                Мы рассчитали ключевые показатели вашего состояния.
              </div>
            </div>
          </div>
        )}

        <div className="results-grid">
          {/* Пульс */}
          {((pulseRateValue !== null && pulseRateValue !== undefined) || (pulseRate && (pulseRate.value !== undefined || typeof pulseRate === 'number'))) ? (
            <div className="result-card result-card--pulse">
              <div className="result-card-top">
                <div className="result-card-icon result-card-icon--pulse" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <path
                      d="M3.33331 10.0003C5.27775 10.0003 6.23818 10.0003 7.08331 10.0003L8.33331 6.66699L10.4166 14.167L12.0833 9.16699L13.0416 11.667H16.6666"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="result-label">Пульс</div>
              </div>
              <div className="result-main">
                <div className="result-value">{pulseRateValue ?? (pulseRate?.value ?? pulseRate ?? '—')}</div>
                <div className="result-unit">уд/мин</div>
              </div>
              {pulseRate && typeof pulseRate === 'object' && pulseRate.confidence && (
                <div className="result-confidence">
                  Уверенность: {Math.round(pulseRate.confidence * 100)}%
                </div>
              )}
            </div>
          ) : null}

          {/* Частота дыхания */}
          {((respirationRateValue !== null && respirationRateValue !== undefined) || (respirationRate && (respirationRate.value !== undefined || typeof respirationRate === 'number'))) ? (
            <div className="result-card result-card--respiration">
              <div className="result-card-top">
                <div className="result-card-icon result-card-icon--respiration" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <path
                      d="M4 12.5C5.2 11.6667 6.4 11.25 7.6 11.25C8.8 11.25 10 11.6667 11.2 12.5C12.4 13.3333 13.6 13.75 14.8 13.75C16 13.75 17.2 13.3333 18.4 12.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M4 7.5C5.2 6.66667 6.4 6.25 7.6 6.25C8.8 6.25 10 6.66667 11.2 7.5C12.4 8.33333 13.6 8.75 14.8 8.75C16 8.75 17.2 8.33333 18.4 7.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                  </svg>
                </div>
                <div className="result-label">Частота дыхания</div>
              </div>
              <div className="result-main">
                <div className="result-value">
                  {respirationRateValue ?? (respirationRate?.value ?? respirationRate ?? '—')}
                </div>
                <div className="result-unit">дых/мин</div>
              </div>
              {respirationRate && typeof respirationRate === 'object' && respirationRate.confidence && (
                <div className="result-confidence">
                  Уверенность: {Math.round(respirationRate.confidence * 100)}%
                </div>
              )}
            </div>
          ) : null}

          {/* Уровень стресса */}
          {((stressLevelValue !== null && stressLevelValue !== undefined) || (stressLevel && (stressLevel.value !== undefined || stressLevel !== null))) ? (
            <div className="result-card result-card--stress">
              <div className="result-card-top">
                <div className="result-card-icon result-card-icon--stress" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <path
                      d="M10 2.5C6.318 2.5 3.33331 5.48467 3.33331 9.16667C3.33331 12.8487 6.318 15.8333 10 15.8333"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M7.5 8.33337H8.33331"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M11.6667 8.33337H12.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M9 11.25C9.33333 11.6667 9.66667 11.875 10 11.875C10.3333 11.875 10.6667 11.6667 11 11.25"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="result-label">Уровень стресса</div>
              </div>
              <div className="result-main">
                <div className="result-value">
                  {stressLevelValue ?? (stressLevel?.value ?? stressLevel ?? '—')}
                </div>
                <div className="result-unit">из 10</div>
              </div>
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
            <div className="result-card result-card--bp">
              <div className="result-card-top">
                <div className="result-card-icon result-card-icon--bp" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <path
                      d="M10 3.33337C7.23858 3.33337 5 5.57195 5 8.33337C5 11.6667 8.33333 14.5834 9.58333 15.5834C9.72462 15.6968 9.86006 15.7871 10 15.7871C10.1399 15.7871 10.2754 15.6968 10.4167 15.5834C11.6667 14.5834 15 11.6667 15 8.33337C15 5.57195 12.7614 3.33337 10 3.33337Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 10.4167C11.1506 10.4167 12.0833 9.48401 12.0833 8.33337C12.0833 7.18273 11.1506 6.25004 10 6.25004C8.84938 6.25004 7.91669 7.18273 7.91669 8.33337C7.91669 9.48401 8.84938 10.4167 10 10.4167Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="result-label">Артериальное давление</div>
              </div>
              <div className="result-main">
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
              </div>
              {bloodPressure && typeof bloodPressure === 'object' && bloodPressure.confidence && (
                <div className="result-confidence">
                  Уверенность: {Math.round(bloodPressure.confidence * 100)}%
                </div>
              )}
            </div>
          ) : null}

          {/* SDNN */}
          {((sdnnValue !== null && sdnnValue !== undefined) || (sdnn && (sdnn.value !== undefined || typeof sdnn === 'number'))) ? (
            <div className="result-card result-card--sdnn">
              <div className="result-card-top">
                <div className="result-card-icon result-card-icon--sdnn" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <path
                      d="M3.33331 13.3334C4.55553 12.5 5.77775 12.0834 6.99998 12.0834C8.2222 12.0834 9.44442 12.5 10.6666 13.3334C11.8889 14.1667 13.1111 14.5834 14.3333 14.5834C15.5555 14.5834 16.7778 14.1667 18 13.3334"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M6.25 5.83337H7.08331"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M12.9167 5.83337H13.75"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="result-label">SDNN</div>
              </div>
              <div className="result-main">
                <div className="result-value">{sdnnValue ?? (sdnn?.value ?? sdnn ?? '—')}</div>
                <div className="result-unit">мс</div>
              </div>
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


import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import healthMonitorManager, {
  SessionState,
  ImageValidity,
  DeviceOrientation,
  Sex,
  SmokingStatus,
} from '@biosensesignal/web-sdk'
import { useUserData } from '../contexts/UserDataContext.jsx'
import { SDK_CONFIG } from '../config/sdkConfig.js'
import logger from '../utils/logger.js'
import Page from '../layout/Page.jsx'
import Modal from '../ui/Modal.jsx'
import './Camera.css'

function Camera() {
  const navigate = useNavigate()
  const { userData } = useUserData()
  const videoRef = useRef(null)
  const ovalRef = useRef(null)
  const sessionRef = useRef(null)
  const cameraIdRef = useRef(null)
  
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [instructionText, setInstructionText] = useState('Поместите лицо в овал и не двигайтесь')
  const [isFaceDetected, setIsFaceDetected] = useState(false)
  const [isFaceValid, setIsFaceValid] = useState(false)
  const [isFrontCamera, setIsFrontCamera] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  // scanStage удален - используем только instructionText, основанный на реальных состояниях SDK
  const [sessionState, setSessionState] = useState(SessionState.INIT)
  const [isMeasuring, setIsMeasuring] = useState(false)
  const [measurementStartTime, setMeasurementStartTime] = useState(null)
  const [processingTime] = useState(SDK_CONFIG.defaultProcessingTime)
  const [hasMeasurementError, setHasMeasurementError] = useState(false) // Флаг ошибки измерения
  const [isProcessingFrames, setIsProcessingFrames] = useState(false) // Флаг обработки кадров SDK
  
  // scanIntervalRef удален - прогресс обновляется только в onVitalSign
  const isCreatingSessionRef = useRef(false) // Флаг для предотвращения множественного создания сессий
  const isMounted = useRef(true) // Для отслеживания монтирования компонента
  const measurementPausedTimeRef = useRef(null) // Время, когда измерение было приостановлено
  const totalPausedTimeRef = useRef(0) // Общее время паузы
  const lastValidImageTimeRef = useRef(null) // Время последнего валидного изображения
  const measurementCompletedRef = useRef(false) // Флаг завершения измерения - не запускать автоматически
  const lastImageValidityRef = useRef(null) // Последний статус валидности для логирования
  const lastLogTimeRef = useRef(0) // Время последнего лога для ограничения частоты
  const measurementStartTimeRef = useRef(null) // Ref для хранения времени начала измерения (избегаем проблем с замыканием)

  // scanStages удален - используем только тексты, основанные на реальных состояниях SDK

  // Обновление прогресса измерения
  // ВАЖНО: Прогресс обновляется ТОЛЬКО когда SDK реально обрабатывает данные (isProcessingFrames === true)
  // Прогресс рассчитывается на основе времени с начала измерения, но только когда SDK работает
  useEffect(() => {
    // Если SDK не обрабатывает данные, сбрасываем прогресс
    if (!isProcessingFrames && !isMeasuring) {
      setScanProgress(0)
      measurementPausedTimeRef.current = null
      totalPausedTimeRef.current = 0
      lastValidImageTimeRef.current = null
      return
    }
    
    // Обновляем прогресс только когда SDK обрабатывает данные
    // ВАЖНО: isProcessingFrames - это главный индикатор, что SDK работает
    // isMeasuring может быть false из-за замыкания, но если isProcessingFrames=true, значит SDK работает
    // Используем ref для получения актуального времени начала измерения
    if (isMeasuring && measurementStartTimeRef.current) {
      // Плавное обновление прогресса между вызовами onVitalSign
      const updateProgress = () => {
        const elapsed = Date.now() - measurementStartTimeRef.current - totalPausedTimeRef.current
        const progress = Math.min(100, (elapsed / (processingTime * 1000)) * 100)
        setScanProgress(progress)
        // scanStage не обновляем - используем только тексты из SDK состояний
      }
      
      // Обновляем сразу
      updateProgress()
      
      // Обновляем каждые 100мс для плавности, но только когда SDK обрабатывает данные
      const interval = setInterval(updateProgress, 100)
      
      return () => clearInterval(interval)
    }
  }, [isProcessingFrames, isMeasuring, measurementStartTime, processingTime])

  const handleCancelClick = () => {
    setShowCancelModal(true)
  }

  const handleContinue = () => {
    setShowCancelModal(false)
  }

  const handleExit = async () => {
    if (sessionRef.current) {
      try {
        logger.session('terminate - завершение сессии по запросу пользователя')
        await sessionRef.current.terminate()
        logger.session('terminate - сессия успешно завершена')
      } catch (err) {
        logger.error('Ошибка при завершении сессии', err)
      }
    }
    setShowCancelModal(false)
    navigate(-1)
  }

  // Callback для получения жизненных показателей во время измерения
  // ВАЖНО: Этот callback вызывается только когда SDK обрабатывает валидные кадры
  // и получает промежуточные результаты (например, пульс каждые ~8 секунд)
  // ВАЖНО: onVitalSign вызывается ТОЛЬКО когда SDK активно обрабатывает данные
  // Это самый надежный индикатор того, что измерение идет
  const onVitalSign = useCallback((vitalSign) => {
    // Группируем логи SDK для удобства
    console.group('🔵 SDK АНАЛИЗИРУЕТ ДАННЫЕ')
    logger.sdk('onVitalSign - получены промежуточные показатели', {
      pulseRate: vitalSign?.pulseRate?.value,
      respirationRate: vitalSign?.respirationRate?.value,
      sessionState,
      isMeasuring,
    })
    console.log('📊 Полный объект:', vitalSign)
    console.groupEnd()
    
    // ВАЖНО: Если onVitalSign вызывается, значит SDK обрабатывает данные
    // Это самый надежный индикатор активного измерения
    setIsProcessingFrames(true)
    
    // Обновляем время последнего валидного результата
    lastValidImageTimeRef.current = Date.now()
    
    // ВАЖНО: Это первый вызов onVitalSign - SDK начал обрабатывать данные!
    // Обновляем текст инструкции, чтобы пользователь понял, что анализ идет
    // Используем ref для проверки, чтобы избежать проблем с замыканием
    const wasProcessingFrames = isProcessingFrames
    if (!wasProcessingFrames) {
      setInstructionText('Анализ начался! Продолжайте держать лицо в овале')
      // scanStage не устанавливаем - используем только тексты из SDK состояний
    }
    
    // ВАЖНО: Используем ref для хранения времени начала измерения, чтобы избежать проблем с замыканием
    // Если measurementStartTimeRef еще не установлен, устанавливаем его один раз
    if (!measurementStartTimeRef.current) {
      measurementStartTimeRef.current = Date.now()
      setMeasurementStartTime(measurementStartTimeRef.current)
      logger.info('onVitalSign: установлен measurementStartTime', { time: measurementStartTimeRef.current })
    }
    
    // ВАЖНО: Обновляем прогресс ТОЛЬКО когда SDK обрабатывает данные
    // Прогресс рассчитывается на основе времени с начала измерения
    // Используем ref для получения актуального времени начала измерения
    const startTime = measurementStartTimeRef.current || Date.now()
    const elapsed = Date.now() - startTime - totalPausedTimeRef.current
    const progress = Math.min(100, (elapsed / (processingTime * 1000)) * 100)
    setScanProgress(progress)
    // scanStage не обновляем - используем только тексты из SDK состояний
    
    // Не логируем каждый раз, только при первом вызове или изменении пульса
    if (vitalSign?.pulseRate?.value) {
      // Здесь можно обновить состояние для отображения текущего пульса в UI
    }
  }, [sessionState, measurementStartTime, processingTime])

  // Callback для получения финальных результатов
  const onFinalResults = useCallback((vitalSignsResults) => {
    // Группируем логи результатов для удобства
    console.group('✅✅✅ ИЗМЕРЕНИЕ ЗАВЕРШЕНО - SDK ОБРАБОТАЛ ДАННЫЕ')
    logger.sdk('onFinalResults - получены финальные результаты', {
      pulseRate: vitalSignsResults?.results?.pulseRate?.value,
      stressLevel: vitalSignsResults?.results?.stressLevel?.value,
      respirationRate: vitalSignsResults?.results?.respirationRate?.value,
      sdnn: vitalSignsResults?.results?.sdnn?.value,
    })
    console.log('📊 ПОЛНЫЕ РЕЗУЛЬТАТЫ ОТ SDK:', vitalSignsResults)
    console.log('📊 Структура results:', vitalSignsResults?.results)
    console.groupEnd()
    setIsMeasuring(false)
    setIsProcessingFrames(false)
    setScanProgress(100)
    setInstructionText('Анализ завершен!')
    // НЕ сбрасываем measurementStartTime здесь - он может понадобиться для логирования
    
    // ВАЖНО: Устанавливаем флаг, чтобы предотвратить автоматический перезапуск после завершения
    measurementCompletedRef.current = true
    
    // Переход на страницу результатов через 1 секунду (чтобы пользователь увидел "Готово!")
    setTimeout(() => {
      navigate('/results', { state: { results: vitalSignsResults } })
    }, 1000)
  }, [navigate])

  // Callback для обработки ошибок
  const onError = useCallback((errorData) => {
    logger.error('SDK Error - получена ошибка от SDK', errorData)
    
    // Более детальная обработка ошибок
    let errorMessage = 'Неизвестная ошибка'
    let isCritical = false
    let canRetry = false // Можно ли повторить измерение
    
    if (errorData.code) {
      // Ошибки лицензирования (domain 2000)
      if (errorData.domain === 2000) {
        // Коды ошибок лицензирования
        if (errorData.code === 1001 || errorData.code === 1002) {
          errorMessage = 'Ошибка лицензии. Проверьте license key или обратитесь в поддержку BiosenseSignal.'
          isCritical = true
        } else if (errorData.code === 1003) {
          errorMessage = 'Лицензия истекла. Обратитесь в поддержку BiosenseSignal.'
          isCritical = true
        } else if (errorData.code === 2007) {
          // Ошибка активации лицензии - обычно означает, что домен не разрешен
          const currentDomain = window.location.hostname
          errorMessage = `Лицензия не активирована для домена "${currentDomain}". Свяжитесь с BiosenseSignal и попросите добавить этот домен в разрешенные домены для вашей лицензии.`
          isCritical = true
        } else {
          errorMessage = `Ошибка лицензии (код: ${errorData.code}). Обратитесь в поддержку BiosenseSignal.`
          isCritical = true
        }
      } 
      // Ошибки измерения (domain 3000)
      else if (errorData.domain === 3000) {
        switch (errorData.code) {
          case 3003:
            // Ошибка измерения - часто возникает при слишком большом количестве невалидных кадров
            // или при проблемах с позиционированием лица во время измерения
            errorMessage = 'Ошибка измерения. Убедитесь, что лицо находится в овале и не двигается. Попробуйте начать измерение заново.'
            canRetry = true
            logger.warn('Ошибка измерения 3003 - вероятно, слишком много невалидных кадров или проблемы с позиционированием')
            break
          case 3006:
            errorMessage = 'Ошибка активации лицензии. Проверьте подключение к интернету.'
            canRetry = true
            break
          default:
            errorMessage = `Ошибка измерения (код: ${errorData.code}). Попробуйте начать измерение заново.`
            canRetry = true
            break
        }
      }
      // Другие ошибки
      else if (errorData.message) {
        errorMessage = errorData.message
        canRetry = errorData.domain !== 2000 // Можно повторить, если не ошибка лицензии
      } else {
        errorMessage = `Ошибка SDK (код: ${errorData.code}, домен: ${errorData.domain || 'неизвестен'})`
        canRetry = errorData.domain !== 2000
      }
    } else if (errorData.message) {
      errorMessage = errorData.message
      canRetry = true
    }
    
    // Проверка на OOM (Out of Memory)
    const errorStr = JSON.stringify(errorData).toLowerCase()
    if (errorStr.includes('oom') || errorStr.includes('out of memory') || errorStr.includes('aborted')) {
      errorMessage = 'Недостаточно памяти. Пожалуйста, перезагрузите страницу.'
      isCritical = true
      
      // Очищаем сессию при OOM
      if (sessionRef.current) {
        try {
          sessionRef.current.terminate().catch(() => {})
          sessionRef.current = null
        } catch (e) {
          logger.error('Ошибка при очистке сессии после OOM', e)
        }
      }
      isCreatingSessionRef.current = false
    }
    
    // Останавливаем измерение при любой ошибке
    setIsMeasuring(false)
    setScanProgress(0)
    
    // Если это ошибка измерения (domain 3000), не показываем критическую ошибку
    // Пользователь может попробовать снова
    if (errorData.domain === 3000) {
      // Ошибка измерения - сессия вернется в ACTIVE, можно попробовать снова
      // НО не запускаем измерение автоматически после ошибки
      setHasMeasurementError(true)
      setError('')
      setInstructionText('Ошибка измерения. Убедитесь, что лицо находится в овале и не двигается. Поместите лицо в овал для начала нового измерения.')
      logger.info('Ошибка измерения - сессия вернется в ACTIVE, НЕ запускаем автоматически', {
        code: errorData.code,
        domain: errorData.domain,
        note: 'Пользователь должен поместить лицо в овал для начала нового измерения'
      })
    } else {
      // Критические ошибки показываем пользователю
      setError(`Ошибка SDK: ${errorMessage}`)
      if (canRetry) {
        setInstructionText('Попробуйте начать измерение заново.')
      }
    }
    
    // Если это критическая ошибка лицензии, останавливаем камеру
    if (isCritical && errorData.domain === 2000) {
      // Останавливаем stream при критической ошибке лицензии
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject
        stream.getTracks().forEach((track) => {
          track.stop()
          logger.debug('Camera track stopped due to license error')
        })
        videoRef.current.srcObject = null
      }
      setIsLoading(false)
    } else if (isCritical || errorData.code === 1001 || errorData.code === 1002 || errorData.code === 1003) {
      setIsLoading(false)
    }
  }, [])

  // Callback для обработки предупреждений
  const onWarning = useCallback((warningData) => {
    logger.warn('SDK Warning - получено предупреждение от SDK', warningData)
  }, [])

  // Callback для активации устройства
  // Вызывается после успешной активации лицензии на сервере
  // SDK автоматически получает и использует activationToken для последующих запросов
  const onActivation = useCallback((activationId) => {
    logger.sdk('✅ onActivation - лицензия успешно активирована', { 
      activationId,
      note: 'SDK получил activationToken и будет использовать его для последующих запросов к серверу лицензий',
    })
    logger.info('Лицензия активирована успешно', {
      activationId,
      timestamp: new Date().toISOString(),
    })
  }, [])

  // Callback для получения доступных жизненных показателей
  const onEnabledVitalSigns = useCallback((vitalSigns) => {
    logger.sdk('onEnabledVitalSigns - доступные показатели', vitalSigns)
  }, [])

  // Callback для офлайн измерений
  const onOfflineMeasurement = useCallback((offlineMeasurements) => {
    logger.sdk('onOfflineMeasurement - офлайн измерения', offlineMeasurements)
  }, [])

  // Callback для изменения состояния сессии
  const onStateChange = useCallback((state) => {
    const stateName = Object.keys(SessionState).find(key => SessionState[key] === state)
    
    // Группируем логи изменения состояния
    console.group(`🔄 СОСТОЯНИЕ СЕССИИ: ${stateName}`)
    logger.session('onStateChange', { 
      state,
      stateName,
      isActive: state === SessionState.ACTIVE,
      isMeasuring: state === SessionState.MEASURING,
    })
    console.groupEnd()
    
    setSessionState(state)
    
    if (state === SessionState.ACTIVE) {
      logger.info('✅ Сессия ACTIVE - SDK готов', {
        hasMeasurementError
      })
      setIsLoading(false)
      
      // Если была ошибка измерения, не показываем сообщение о автоматическом запуске
      if (hasMeasurementError) {
        setInstructionText('Поместите лицо в овал для начала нового измерения.')
      } else {
        setInstructionText('Поместите лицо в овал. Измерение начнется через несколько секунд...')
      }
    } else if (state === SessionState.MEASURING) {
      logger.info('🔄 Сессия MEASURING - анализ начат', {
        note: 'Ожидаем onVitalSign для подтверждения обработки данных (обычно через ~8 секунд)'
      })
      setIsMeasuring(true)
      setIsProcessingFrames(false) // Сброс, будет установлен в true когда onVitalSign начнет вызываться
      const startTime = Date.now()
      measurementStartTimeRef.current = startTime // Устанавливаем ref
      setMeasurementStartTime(startTime) // Устанавливаем state
      setScanProgress(0)
      // Сбрасываем счетчики паузы при начале нового измерения
      measurementPausedTimeRef.current = null
      totalPausedTimeRef.current = 0
      lastValidImageTimeRef.current = null
      // НЕ сбрасываем measurementStartTimeRef здесь - он устанавливается выше
      // Сбрасываем флаги при успешном начале измерения
      setHasMeasurementError(false)
      measurementCompletedRef.current = false // Сбрасываем флаг завершения при начале нового измерения
      
      // ВАЖНО: SDK только начал измерение, но еще не обрабатывает данные
      // onVitalSign будет вызван через ~8 секунд
      // Показываем понятное сообщение пользователю
      if (isFaceValid) {
        setInstructionText('Анализ запущен. Ожидаем начала обработки данных...')
      } else {
        setInstructionText('Анализ запущен. Поместите лицо в овал...')
      }
    } else if (state === SessionState.STOPPING) {
      setIsMeasuring(false)
      setIsProcessingFrames(false)
    } else if (state === SessionState.TERMINATED) {
      setIsMeasuring(false)
      setIsProcessingFrames(false)
      setIsLoading(false)
    }
  }, [])

  // ВАЖНО: SDK может вызывать onImageData даже в состоянии ACTIVE (до start())
  // Это позволяет показать пользователю, правильно ли он позиционирует лицо
  // Но SDK обрабатывает данные ТОЛЬКО во время измерения (MEASURING)
  
  // Запуск измерения: если лицо валидно - запускаем сразу, иначе через 3 секунды
  // НО не запускаем автоматически после ошибки измерения
  const startTimerRef = useRef(null)
  
  useEffect(() => {
    // Очищаем предыдущий таймер, если он есть
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current)
      startTimerRef.current = null
    }
    
    // Если была ошибка измерения или измерение завершено, не запускаем автоматически
    if (hasMeasurementError || measurementCompletedRef.current) {
      logger.debug('Пропуск автоматического запуска измерения', {
        hasMeasurementError,
        measurementCompleted: measurementCompletedRef.current,
        reason: hasMeasurementError ? 'была ошибка измерения' : 'измерение завершено'
      })
      return
    }
    
    if (sessionState === SessionState.ACTIVE && !isMeasuring && sessionRef.current) {
      // Если лицо валидно - запускаем измерение сразу (через небольшую задержку для стабилизации)
      if (isFaceValid) {
        logger.debug('⏱️ Запуск измерения через 500мс (лицо валидно)')
        startTimerRef.current = setTimeout(() => {
          if (sessionState === SessionState.ACTIVE && !isMeasuring && isFaceValid && sessionRef.current && !hasMeasurementError) {
            try {
              logger.session('▶️ start() - запуск измерения')
              sessionRef.current.start()
            } catch (err) {
              logger.error('❌ Ошибка запуска измерения', err)
              setError('Не удалось начать измерение')
            }
          }
        }, 500) // Небольшая задержка для стабилизации
      } else {
        // Если лицо не валидно - даем время пользователю правильно расположить лицо
        // Запускаем измерение через 3 секунды в любом случае, чтобы SDK начал вызывать onImageData
        logger.debug('⏱️ Запуск измерения через 3 сек (лицо не валидно)')
        startTimerRef.current = setTimeout(() => {
          if (sessionState === SessionState.ACTIVE && !isMeasuring && sessionRef.current && !hasMeasurementError) {
            try {
              logger.session('▶️ start() - запуск измерения (таймаут)')
              sessionRef.current.start()
            } catch (err) {
              logger.error('❌ Ошибка запуска измерения', err)
              setError('Не удалось начать измерение')
            }
          }
        }, 3000) // Задержка 3 секунды для подготовки пользователя
      }

      return () => {
        if (startTimerRef.current) {
          clearTimeout(startTimerRef.current)
          startTimerRef.current = null
        }
      }
    }
  }, [sessionState, isMeasuring, isFaceValid, hasMeasurementError])
  
  // Перезапуск измерения после ошибки, когда лицо снова становится валидным
  useEffect(() => {
    // Если была ошибка измерения, лицо валидно, сессия активна, но измерение не запущено
    if (hasMeasurementError && isFaceValid && sessionState === SessionState.ACTIVE && !isMeasuring && sessionRef.current) {
      logger.debug('🔄 Перезапуск измерения после ошибки')
      setHasMeasurementError(false) // Сбрасываем флаг ошибки
      
      const timer = setTimeout(() => {
        if (sessionState === SessionState.ACTIVE && !isMeasuring && isFaceValid && sessionRef.current) {
          try {
            logger.session('▶️ start() - перезапуск после ошибки')
            sessionRef.current.start()
          } catch (err) {
            logger.error('❌ Ошибка перезапуска измерения', err)
            setError('Не удалось перезапустить измерение')
          }
        }
      }, 1000) // Задержка 1 секунда для стабилизации
      
      return () => clearTimeout(timer)
    }
  }, [hasMeasurementError, isFaceValid, sessionState, isMeasuring])

  // Callback для валидации изображения
  // ВАЖНО: SDK может вызывать onImageData очень часто (каждый кадр)
  // Логируем только изменения состояния, чтобы не засорять консоль
  const onImageData = useCallback((imageValidity) => {
    const imageValidityName = Object.keys(ImageValidity).find(key => ImageValidity[key] === imageValidity)
    const now = Date.now()
    const timeSinceLastLog = now - lastLogTimeRef.current
    
    // Логируем только если:
    // 1. Изменился статус валидности
    // 2. Или прошло больше 2 секунд с последнего лога
    // 3. Или это важное событие (VALID во время измерения)
    const shouldLog = 
      lastImageValidityRef.current !== imageValidity || 
      timeSinceLastLog > 2000 ||
      (imageValidity === ImageValidity.VALID && (isMeasuring || isProcessingFrames))
    
    if (shouldLog) {
      logger.debug(`📸 onImageData: ${imageValidityName}`, { 
        imageValidity,
        isValid: imageValidity === ImageValidity.VALID,
        sessionState,
        isMeasuring,
        isProcessingFrames,
      })
      lastImageValidityRef.current = imageValidity
      lastLogTimeRef.current = now
    }
    
    // Определяем, обнаружено ли лицо
    // Лицо обнаружено, если imageValidity !== INVALID_ROI
    // (для TILTED_HEAD, UNEVEN_LIGHT лицо обнаружено, но не валидно)
    const faceDetected = imageValidity !== ImageValidity.INVALID_ROI && 
                         imageValidity !== ImageValidity.INVALID_DEVICE_ORIENTATION
    
    // Лицо валидно только если imageValidity === VALID
    // ВАЖНО: При strictMeasurementGuidance: true SDK обрабатывает ТОЛЬКО валидные кадры
    const faceValid = imageValidity === ImageValidity.VALID
    
    // Обновляем состояние обнаружения лица
    setIsFaceDetected(faceDetected)
    setIsFaceValid(faceValid)
    
    // Если лицо валидно
    if (faceValid) {
      lastValidImageTimeRef.current = Date.now()
      
      // Если была пауза (лицо было невалидным), учитываем время паузы
      if (measurementPausedTimeRef.current !== null && measurementStartTimeRef.current) {
        const pauseDuration = Date.now() - measurementPausedTimeRef.current
        totalPausedTimeRef.current += pauseDuration
        measurementPausedTimeRef.current = null
        logger.debug('▶️ Прогресс возобновлен - лицо снова валидно', {
          pauseDuration,
          totalPausedTime: totalPausedTimeRef.current
        })
      }
      
      // ВАЖНО: SDK обрабатывает кадры ТОЛЬКО во время измерения (MEASURING)
      // Но onVitalSign - самый надежный индикатор того, что SDK обрабатывает данные
      if (isProcessingFrames) {
        // SDK РЕАЛЬНО обрабатывает данные - анализ идет!
        setInstructionText('Анализ идет. Продолжайте держать лицо в овале')
      } else if (isMeasuring) {
        // Измерение запущено (MEASURING), но SDK еще не обрабатывает данные
        // onVitalSign будет вызван через ~8 секунд
        setInstructionText('Анализ запущен. Ожидаем начала обработки данных...')
      } else {
        // SDK проверяет валидность, но измерение еще не запущено
        if (shouldLog) {
          logger.debug('📸 Лицо валидно, но анализ еще не начался')
        }
        
        if (hasMeasurementError) {
          setInstructionText('Лицо обнаружено. Начинаем новое измерение...')
        } else {
          setInstructionText('Отлично! Лицо обнаружено, начинаем измерение...')
        }
      }
    } else {
      // Лицо не валидно - SDK НЕ обрабатывает этот кадр (при strictMeasurementGuidance: true)
      // НО: если onVitalSign вызывался ранее, SDK может продолжать обрабатывать данные
      // Поэтому не сбрасываем isProcessingFrames сразу, только если это INVALID_ROI
      let message = 'Поместите лицо в овал'
      
      switch (imageValidity) {
        case ImageValidity.INVALID_DEVICE_ORIENTATION:
          message = 'Неподдерживаемая ориентация устройства'
          if (shouldLog) logger.debug('📸 Неподдерживаемая ориентация')
          break
        case ImageValidity.TILTED_HEAD:
          message = 'Голова наклонена. Смотрите прямо в камеру'
          if (shouldLog) logger.debug('📸 Голова наклонена')
          break
        case ImageValidity.UNEVEN_LIGHT:
          message = 'Неравномерное освещение. Встаньте напротив источника света'
          if (shouldLog) logger.debug('📸 Неравномерное освещение')
          break
        case ImageValidity.INVALID_ROI:
        default:
          message = 'Лицо не обнаружено. Поместите лицо в овал'
          if (shouldLog) logger.debug('📸 Лицо не обнаружено')
          
          // Если лицо не обнаружено более 3 секунд во время измерения, останавливаем
          if (isMeasuring && lastValidImageTimeRef.current) {
            const timeSinceLastValid = Date.now() - lastValidImageTimeRef.current
            if (timeSinceLastValid > 3000) {
              logger.warn('Лицо не обнаружено более 3 секунд, останавливаем измерение', {
                timeSinceLastValid
              })
              try {
                sessionRef.current.stop()
                setIsMeasuring(false)
                setIsProcessingFrames(false)
      setScanProgress(0)
      setInstructionText('Лицо вышло из овала. Поместите лицо обратно в овал для продолжения анализа')
                measurementPausedTimeRef.current = null
                totalPausedTimeRef.current = 0
                lastValidImageTimeRef.current = null
              } catch (err) {
                logger.error('Ошибка при остановке измерения', err)
              }
            }
          }
          break
      }
      
      // Обновляем текст инструкции
      if (!isMeasuring || imageValidity === ImageValidity.INVALID_ROI) {
        setInstructionText(message)
      } else {
        setInstructionText(`${message}. SDK не обрабатывает данные, пока лицо не валидно`)
      }
      
      // ВАЖНО: Если SDK обрабатывал данные, но лицо стало невалидным,
      // SDK перестает обрабатывать данные (при strictMeasurementGuidance: true)
      // Сбрасываем isProcessingFrames если лицо не валидно более 2 секунд
      if (isProcessingFrames && imageValidity !== ImageValidity.VALID && lastValidImageTimeRef.current) {
        const timeSinceLastValid = Date.now() - lastValidImageTimeRef.current
        if (timeSinceLastValid > 2000) {
          logger.debug('⏸️ SDK перестал обрабатывать данные - лицо не валидно более 2 сек')
          setIsProcessingFrames(false)
          if (measurementPausedTimeRef.current === null && measurementStartTime) {
            measurementPausedTimeRef.current = Date.now()
          }
        }
      }
    }
  }, [sessionState, isMeasuring, isProcessingFrames, measurementStartTime])

  // Инициализация SDK и создание сессии
  useEffect(() => {
    let stream = null
    const streamRef = { current: null } // Ref для доступа к stream из callbacks
    isMounted.current = true

    async function initSDK() {
      try {
        // КРИТИЧЕСКАЯ ПРОВЕРКА: cross-origin isolation для SharedArrayBuffer
        if (typeof self !== 'undefined' && !self.crossOriginIsolated) {
          const errorMsg = 'ОШИБКА: Заголовки COOP/COEP не установлены. SDK требует cross-origin isolation для работы SharedArrayBuffer. Проверьте конфигурацию сервера (vercel.json для Vercel).'
          logger.error('crossOriginIsolated === false', {
            userAgent: navigator.userAgent,
            location: window.location.href,
            hint: 'Убедитесь, что заголовки Cross-Origin-Opener-Policy: same-origin и Cross-Origin-Embedder-Policy: require-corp установлены на сервере',
          })
          setError(errorMsg)
          setIsLoading(false)
          return
        }
        
        logger.info('crossOriginIsolated проверка пройдена', { crossOriginIsolated: self.crossOriginIsolated })
        
        // Проверяем наличие license key
        if (!SDK_CONFIG.licenseKey || SDK_CONFIG.licenseKey.trim() === '') {
          logger.warn('License key не установлен. SDK не будет работать.')
          setError('License key не установлен. Пожалуйста, настройте SDK_CONFIG в src/config/sdkConfig.js')
          setIsLoading(false)
          return
        }
        
        // Проверяем формат license key (должен содержать дефисы)
        const licenseKeyTrimmed = SDK_CONFIG.licenseKey.trim()
        if (!licenseKeyTrimmed.includes('-')) {
          logger.warn('License key имеет неправильный формат (должен содержать дефисы)')
          setError('License key имеет неправильный формат. Проверьте формат ключа.')
          setIsLoading(false)
          return
        }

        logger.group('SDK Initialization', () => {
          logger.info('Начало инициализации SDK', {
            hasLicenseKey: !!SDK_CONFIG.licenseKey,
            processingTime,
          })
        })

        // Инициализация SDK с обработкой лицензионной информации
        const initStartTime = Date.now()
        
        // Подготовка параметров инициализации
        // Согласно официальной документации SDK, productId можно передать в initialize()
        // для использования выделенного Product ID вместо стандартного
        const initParams = {
          licenseKey: SDK_CONFIG.licenseKey.trim(),
          licenseInfo: {
            onEnabledVitalSigns,
            onOfflineMeasurement,
            onActivation,
          },
        }
        
        // Передаем productId, если он указан в конфиге
        // Если productId не указан, SDK определит его автоматически из licenseKey
        if (SDK_CONFIG.productId && SDK_CONFIG.productId.trim() !== '') {
          initParams.productId = SDK_CONFIG.productId.trim()
          logger.debug('Передача productId в initialize', {
            productId: SDK_CONFIG.productId.trim(),
            note: 'Используется выделенный Product ID',
          })
        } else {
          logger.debug('productId не указан, SDK определит его автоматически из licenseKey')
        }
        
        logger.debug('Инициализация SDK с параметрами', {
          hasLicenseKey: !!SDK_CONFIG.licenseKey,
          licenseKeyLength: SDK_CONFIG.licenseKey?.length || 0,
          licenseKeyPreview: SDK_CONFIG.licenseKey ? `${SDK_CONFIG.licenseKey.substring(0, 10)}...` : 'empty',
          hasProductId: !!initParams.productId,
          productIdPreview: initParams.productId ? `${initParams.productId.substring(0, 10)}...` : 'auto (определяется SDK)',
        })
        
        await healthMonitorManager.initialize(initParams)
        logger.perf('SDK initialization', Date.now() - initStartTime)
        logger.sdk('initialize - SDK успешно инициализирован')
        
        if (!isMounted.current) return

        // Получение доступа к камере
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Ваше устройство не поддерживает доступ к камере.')
        setIsLoading(false)
        return
      }

      try {
          logger.info('Запрос доступа к камере')
          const cameraStartTime = Date.now()
        stream = await navigator.mediaDevices.getUserMedia({
          // Для сканирования лица обычно нужна фронтальная камера.
          // В некоторых WebView значение может игнорироваться — ниже дополнительно
          // определяем фактическую камеру по settings видеотрека.
          video: { facingMode: { ideal: 'user' } },
          audio: false,
        })
          logger.perf('Camera access granted', cameraStartTime)
          logger.info('Доступ к камере получен')

          // Определяем фактическую камеру по settings трека (чтобы избежать рассинхронизации
          // между полученным stream и cameraDeviceId, который передаем в SDK).
          try {
            const track = stream.getVideoTracks?.()[0]
            const settings = track?.getSettings?.() || {}

            if (settings.deviceId) {
              cameraIdRef.current = settings.deviceId
            }

            if (settings.facingMode) {
              setIsFrontCamera(settings.facingMode === 'user')
            }

            logger.debug('Параметры видеотрека', {
              deviceId: settings.deviceId,
              facingMode: settings.facingMode,
              width: settings.width,
              height: settings.height,
            })
          } catch (e) {
            logger.warn('Не удалось определить settings видеотрека', e)
          }

          // Fallback: если deviceId недоступен, попробуем выбрать камеру через enumerateDevices
          if (!cameraIdRef.current) {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const videoDevices = devices.filter((device) => device.kind === 'videoinput')
            if (videoDevices.length > 0) {
              cameraIdRef.current = videoDevices[0].deviceId
              logger.debug('Fallback выбор камеры (первое устройство)', {
                deviceId: cameraIdRef.current,
                totalDevices: videoDevices.length,
              })
            }
          }

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          
            // Обработка ошибок видео
            videoRef.current.onerror = (err) => {
              logger.error('Video error - ошибка загрузки видео', err)
              setError('Ошибка загрузки видео')
              setIsLoading(false)
            }
            
            // Обработка события play для отслеживания воспроизведения
            videoRef.current.onplay = () => {
              logger.debug('Видео начало воспроизведение', {
                readyState: videoRef.current.readyState,
                paused: videoRef.current.paused,
              })
            }
            
            videoRef.current.onloadedmetadata = async () => {
              logger.info('Video metadata loaded - метаданные видео загружены', {
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
                readyState: videoRef.current.readyState,
                paused: videoRef.current.paused,
                autoplay: videoRef.current.autoplay,
                srcObject: !!videoRef.current.srcObject,
              })
              
              // Убеждаемся, что видео воспроизводится
              if (videoRef.current.paused) {
                logger.warn('Видео приостановлено, пытаемся запустить воспроизведение')
                try {
                  await videoRef.current.play()
                  logger.info('Видео успешно запущено', {
                    paused: videoRef.current.paused,
                    readyState: videoRef.current.readyState,
                  })
                } catch (err) {
                  logger.error('Ошибка запуска видео', err)
                  setError('Не удалось запустить видео. Проверьте разрешения браузера.')
                  setIsLoading(false)
                  return
                }
              }
              
              // Проверяем, что видео готово к воспроизведению
              if (videoRef.current.readyState < 2) {
                logger.warn('Видео не готово к воспроизведению, ждем события canplay')
                videoRef.current.oncanplay = async () => {
                  logger.info('Видео готово к воспроизведению', {
                    readyState: videoRef.current.readyState,
                  })
                  videoRef.current.oncanplay = null // Удаляем обработчик после использования
                  // Продолжаем создание сессии после готовности видео
                  await createSessionAfterVideoReady()
                }
                return
              }
              
              // Защита от множественного создания сессий
              if (!isMounted.current || !videoRef.current) {
                logger.warn('Пропуск создания сессии: компонент размонтирован или видео недоступно')
                return
              }
              
              // Защита от множественного создания сессий
              if (!isMounted.current || !videoRef.current) {
                logger.warn('Пропуск создания сессии: компонент размонтирован или видео недоступно')
                return
              }
              
              // Если сессия уже существует, завершаем её перед созданием новой
              if (sessionRef.current) {
                logger.warn('Завершение существующей сессии перед созданием новой')
                try {
                  await sessionRef.current.terminate()
                  sessionRef.current = null
      } catch (err) {
                  logger.error('Ошибка при завершении существующей сессии', err)
                }
              }
              
              // Если сессия уже создается, не создаем новую
              if (isCreatingSessionRef.current) {
                logger.warn('Пропуск создания сессии: сессия уже создается')
        return
      }

              // Устанавливаем флаг создания сессии
              isCreatingSessionRef.current = true
              
              // Подготовка данных пользователя для SDK
              const userInformation = userData.age && userData.gender ? {
                sex: userData.gender === 'MALE' ? Sex.MALE : userData.gender === 'FEMALE' ? Sex.FEMALE : Sex.UNSPECIFIED,
                age: userData.age,
                weight: userData.weight || null,
                height: userData.height || null,
                smokingStatus: userData.smokingStatus === 'SMOKER' ? SmokingStatus.SMOKER : 
                              userData.smokingStatus === 'NON_SMOKER' ? SmokingStatus.NON_SMOKER : 
                              SmokingStatus.UNSPECIFIED,
              } : null

              logger.info('Подготовка данных пользователя для SDK', {
                hasUserData: !!userInformation,
                age: userInformation?.age,
                gender: userInformation?.sex,
              })
              
              // Предупреждение, если данные пользователя отсутствуют
              if (!userInformation) {
                logger.warn('Данные пользователя не найдены. SDK будет работать, но ASCVD Risk и Heart Age не будут рассчитаны. Убедитесь, что вы прошли через страницу настроек алгоритма.')
              }

              // Создание сессии
              try {
                if (!isMounted.current) {
                  isCreatingSessionRef.current = false
          return
        }

                logger.info('Создание сессии SDK', {
                  hasVideo: !!videoRef.current,
                  cameraId: cameraIdRef.current,
                  processingTime,
                  hasUserInfo: !!userInformation,
                })
                
                const sessionStartTime = Date.now()
                
                // Проверяем, что видео элемент действительно готов и воспроизводится
                logger.info('Проверка видео перед созданием сессии', {
                  hasVideo: !!videoRef.current,
                  videoReadyState: videoRef.current?.readyState,
                  videoPaused: videoRef.current?.paused,
                  videoWidth: videoRef.current?.videoWidth,
                  videoHeight: videoRef.current?.videoHeight,
                  hasSrcObject: !!videoRef.current?.srcObject,
                })
                
                // Проверяем, что все callbacks определены
                logger.debug('Проверка callbacks перед созданием сессии', {
                  hasOnImageData: typeof onImageData === 'function',
                  hasOnVitalSign: typeof onVitalSign === 'function',
                  hasOnFinalResults: typeof onFinalResults === 'function',
                  hasOnError: typeof onError === 'function',
                  hasOnWarning: typeof onWarning === 'function',
                  hasOnStateChange: typeof onStateChange === 'function',
                })
                
                const options = {
                  input: videoRef.current,
                  cameraDeviceId: cameraIdRef.current,
                  processingTime,
                  onVitalSign,
                  onFinalResults,
                  onError,
                  onWarning,
                  onStateChange,
                  onImageData, // ВАЖНО: SDK вызывает этот callback "During the measurement"
                  orientation: DeviceOrientation.PORTRAIT,
                  strictMeasurementGuidance: true,
                  ...(userInformation && { userInformation }),
                }
                
                logger.info('Создание сессии с опциями', {
                  hasInput: !!options.input,
                  hasOnImageData: typeof options.onImageData === 'function',
                  strictMeasurementGuidance: options.strictMeasurementGuidance,
                  note: 'onImageData будет вызываться SDK во время измерения (after start())'
                })

                const faceSession = await healthMonitorManager.createFaceSession(options)
                logger.perf('Session creation', Date.now() - sessionStartTime)
                
                if (!isMounted.current) {
                  // Если компонент размонтирован, завершаем сессию
                  logger.warn('Компонент размонтирован до завершения создания сессии')
                  await faceSession.terminate()
                  isCreatingSessionRef.current = false
                  return
                }
                
                sessionRef.current = faceSession
                isCreatingSessionRef.current = false
                logger.session('createFaceSession - сессия успешно создана', {
                  hasVideo: !!videoRef.current,
                  videoReady: videoRef.current?.readyState >= 2,
                  note: 'SDK начнет вызывать onImageData когда сессия перейдет в ACTIVE состояние'
                })
              } catch (err) {
                isCreatingSessionRef.current = false
                logger.error('Error creating session - ошибка создания сессии', err)
                
                // Не показываем ошибку сразу, даем SDK попробовать активироваться
                // Ошибка будет показана через onError callback
                if (err.errorCode === 1001 || err.errorCode === 1002 || err.errorCode === 1003) {
                  setError('Ошибка лицензии. Проверьте license key.')
            } else {
                  setError(`Ошибка создания сессии: ${err.message || 'Неизвестная ошибка'}`)
                }
                setIsLoading(false)
              }
            }
          }
        } catch (err) {
          logger.error('Не удалось получить доступ к камере', err)
          setError('Не удалось получить доступ к камере. Проверьте разрешения.')
          setIsLoading(false)
        }
      } catch (err) {
        logger.error('Error initializing SDK - ошибка инициализации SDK', err)
        setError(`Ошибка инициализации SDK: ${err.message || 'Проверьте license key'}`)
        setIsLoading(false)
      }
    }

    initSDK()

    return () => {
      isMounted.current = false
      isCreatingSessionRef.current = false
      logger.debug('Camera component unmounting - размонтирование компонента')
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
        logger.debug('Camera stream stopped - поток камеры остановлен')
      }
      if (sessionRef.current) {
        logger.session('terminate - завершение сессии при размонтировании')
        try {
          const terminateResult = sessionRef.current.terminate()
          if (terminateResult && typeof terminateResult.catch === 'function') {
            terminateResult.catch((err) => {
              logger.error('Ошибка при завершении сессии при размонтировании', err)
            })
          }
        } catch (err) {
          logger.error('Ошибка при вызове terminate', err)
        }
        sessionRef.current = null
      }
    }
  }, [])


  // Определяем цвет овала
  // ПРАВИЛЬНАЯ ЛОГИКА ЦВЕТА ОВАЛА:
  // - Желтый (warning): лицо НЕ обнаружено в овале (INVALID_ROI) - нужно поместить лицо
  // - Зеленый (success): лицо обнаружено и валидно (VALID) - можно начинать анализ
  // - Синий (default): используется как базовый цвет, но не для индикации состояния
  // 
  // ПРАВИЛЬНАЯ ЛОГИКА ПРОГРЕСС-БАРА:
  // - Синий прогресс-бар: ТОЛЬКО когда SDK реально обрабатывает данные (isProcessingFrames === true)
  // - Проценты берутся из scanProgress, который обновляется только когда SDK обрабатывает данные
  
  // Желтый = лицо НЕ обнаружено (INVALID_ROI)
  // Зеленый = лицо обнаружено и валидно (VALID)
  const ovalColorClass = !isFaceDetected
    ? 'face-oval-warning' // Желтый - лицо не обнаружено в овале
    : isFaceValid
      ? 'face-oval-success' // Зеленый - лицо обнаружено и валидно
      : 'face-oval-default' // Синий - лицо обнаружено, но не валидно (TILTED_HEAD, UNEVEN_LIGHT) - временное состояние
  
  // Показываем прогресс-бар ТОЛЬКО когда SDK реально обрабатывает данные
  // (isProcessingFrames устанавливается в true когда вызывается onVitalSign)
  // ВАЖНО: isProcessingFrames - главный индикатор, isMeasuring может быть false из-за замыкания
  // Показываем прогресс во время сканирования (MEASURING)
  const showProgressBar = isMeasuring
  
  // Показываем индикатор ожидания когда измерение запущено, но SDK еще не обрабатывает данные
  // Это помогает пользователю понять, что происходит (ожидание ~8 секунд до первого onVitalSign)
  const showWaitingIndicator = isMeasuring && !isProcessingFrames
  
  // Логируем только при изменении состояния овала или прогресс-бара
  const lastOvalStateRef = useRef({ color: null, progress: false })
  const currentOvalState = { color: ovalColorClass, progress: showProgressBar }
  
  if (lastOvalStateRef.current.color !== ovalColorClass || 
      lastOvalStateRef.current.progress !== showProgressBar) {
    logger.debug('🎨 Изменение визуального состояния', {
      ovalColor: ovalColorClass,
      showProgressBar,
      isFaceDetected,
      isFaceValid,
      isProcessingFrames,
      scanProgress: Math.round(scanProgress),
    })
    lastOvalStateRef.current = currentOvalState
  }
  
  // Вычисляем длину дуги для прогресс-бара
  const a = 143
  const b = 198.5
  const circumference = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)))
  const ovalPath = `M 149 6 A ${a} ${b} 0 1 1 149 403 A ${a} ${b} 0 1 1 149 6`
  
  // Пунктир: ровно 20 штрихов по периметру
  const totalDashes = 20
  const dashCycle = circumference / totalDashes // (dash + gap)
  const dashLen = dashCycle * 0.62
  const gapLen = dashCycle - dashLen
  const dashArray = `${dashLen} ${gapLen}`
  
  // Сдвигаем рисунок так, чтобы стык пути попадал в "пробел"
  const dashOffset = dashLen + gapLen * 0.5
  
  // Толщина пунктирного "кольца": рисуем в 2 раза толще и маской убираем внутреннюю половину,
  // чтобы внешний край был закругленным, а внутренний — ровным (как на референсе).
  const dashStroke = 6
  const outerAlignedStroke = dashStroke * 2
  const progressMaskStroke = outerAlignedStroke + 2

  // Плавный прогресс (маска раскрывается непрерывно), но видимыми остаются только пунктиры
  const progressFraction = Math.max(0, Math.min(1, scanProgress / 100))
  const progressOffset = circumference - circumference * progressFraction

  return (
    <div className="camera-page">
      <div className="camera-preview">
        {isLoading && (
          <div className="camera-loading-container">
            <div className="camera-loading-spinner"></div>
            <p className="camera-loading-text">Инициализация камеры...</p>
          </div>
        )}
        {error && <p className="error-text">{error}</p>}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`camera-video camera-video-unmirror ${error ? 'hidden' : ''}`.trim()}
        />
        {!error && !isLoading && (
          <>
            <div className="camera-overlay"></div>
            <div className="face-oval-container">
              <svg 
                ref={ovalRef}
                className={`face-oval ${ovalColorClass}`}
                width="298" 
                height="409" 
                viewBox="0 0 298 409" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <path
                    id="oval-path"
                    d="M 149 6 A 143 198.5 0 1 1 149 403 A 143 198.5 0 1 1 149 6"
                  />
                </defs>
                {/* Маска для "outer aligned" обводки: прячем внутреннюю часть овала */}
                <mask id="outer-oval-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="298" height="409">
                  <rect x="0" y="0" width="298" height="409" fill="white" />
                  <ellipse cx="149" cy="204.5" rx="143" ry="198.5" fill="black" />
                </mask>
                {/* Индикатор ожидания (анимированные пунктиры) убран по дизайну */}
                {/* Синий прогресс-бар показывается ТОЛЬКО когда SDK реально обрабатывает данные */}
                {showProgressBar && scanProgress > 0 && (
                  <>
                    {/* Маска "длины" прогресса */}
                    <mask id="progress-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="298" height="409">
                      <path
                        d={ovalPath}
                        stroke="white"
                        strokeWidth={progressMaskStroke}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={progressOffset}
                        style={{
                          // шаговый прогресс по штрихам
                        transition: 'stroke-dashoffset 0.12s linear',
                        }}
                      />
                    </mask>

                    {/* Пунктирный прогресс, обрезанный маской */}
                    <g mask="url(#progress-mask)">
                      <g mask="url(#outer-oval-mask)">
                        <path
                          d={ovalPath}
                          stroke="#95DB6D"
                          strokeWidth={outerAlignedStroke}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                          strokeDasharray={dashArray}
                          strokeDashoffset={dashOffset}
                        />
                      </g>
                    </g>
                  </>
                )}
                {/* Базовый пунктирный овал рисуем тем же путем, что и прогресс,
                    чтобы пунктиры совпадали и не появлялась "линия" между ними. */}
                <g mask="url(#outer-oval-mask)">
                  <path
                    d={ovalPath}
                    stroke="currentColor"
                    strokeWidth={outerAlignedStroke}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray={dashArray}
                    strokeDashoffset={dashOffset}
                    opacity={scanProgress > 0 ? 0.3 : 1}
                  />
                </g>
              </svg>
            </div>
            {isMeasuring ? (
              <div className="camera-scan-percent" aria-live="polite">
                {Math.round(scanProgress)}%
              </div>
            ) : (
              <div className="camera-instruction-container">
                <p className="camera-instruction-text">{instructionText}</p>
              </div>
            )}
            <button className="camera-cancel-button" onClick={handleCancelClick} type="button">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Отменить анализ</span>
            </button>
          </>
        )}
      </div>
      <Modal
        isOpen={showCancelModal}
        onClose={handleContinue}
        title="Прервать сканирование?"
        description="Прогресс не сохранится."
        onConfirm={handleContinue}
        confirmText="Продолжить"
        cancelText="Выйти"
        onCancel={handleExit}
      />
    </div>
  )
}

export default Camera

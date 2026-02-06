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
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanStage, setScanStage] = useState('')
  const [sessionState, setSessionState] = useState(SessionState.INIT)
  const [isMeasuring, setIsMeasuring] = useState(false)
  const [measurementStartTime, setMeasurementStartTime] = useState(null)
  const [processingTime] = useState(SDK_CONFIG.defaultProcessingTime)
  
  const scanIntervalRef = useRef(null)
  const isCreatingSessionRef = useRef(false) // Флаг для предотвращения множественного создания сессий
  const isMounted = useRef(true) // Для отслеживания монтирования компонента

  // Этапы сканирования
  const scanStages = [
    { progress: 0, text: 'Калибровка освещения...' },
    { progress: 25, text: 'Измеряем пульс...' },
    { progress: 46, text: 'Анализируем здоровье...' },
    { progress: 68, text: 'Почти готово...' },
    { progress: 82, text: 'Завершение анализа...' },
    { progress: 100, text: 'Готово!' },
  ]

  // Обновление прогресса измерения
  useEffect(() => {
    if (isMeasuring && measurementStartTime) {
      scanIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - measurementStartTime
        const progress = Math.min(100, (elapsed / (processingTime * 1000)) * 100)
        setScanProgress(progress)

        const currentStage = scanStages.find((stage, index) => {
          const nextStage = scanStages[index + 1]
          return progress >= stage.progress && (!nextStage || progress < nextStage.progress)
        })
        if (currentStage) {
          setScanStage(currentStage.text)
        }
      }, 100)
    } else {
      if (scanIntervalRef.current) {
          clearInterval(scanIntervalRef.current)
          scanIntervalRef.current = null
      }
      if (!isMeasuring) {
      setScanProgress(0)
      setScanStage('')
      }
    }

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
      }
    }
  }, [isMeasuring, measurementStartTime, processingTime])

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
  const onVitalSign = useCallback((vitalSign) => {
    logger.sdk('onVitalSign - получены текущие показатели', vitalSign)
    // Здесь можно обновить UI с текущими показателями
  }, [])

  // Callback для получения финальных результатов
  const onFinalResults = useCallback((vitalSignsResults) => {
    logger.sdk('onFinalResults - получены финальные результаты', vitalSignsResults)
    logger.info('Измерение завершено успешно', {
      hasResults: !!vitalSignsResults?.results,
      pulseRate: vitalSignsResults?.results?.pulseRate?.value,
      stressLevel: vitalSignsResults?.results?.stressLevel?.value,
    })
    setIsMeasuring(false)
    setScanProgress(100)
    setScanStage('Готово!')
    // Здесь можно сохранить результаты и перейти на следующую страницу
    // navigate('/results', { state: { results: vitalSignsResults } })
  }, [])

  // Callback для обработки ошибок
  const onError = useCallback((errorData) => {
    logger.error('SDK Error - получена ошибка от SDK', errorData)
    
    // Более детальная обработка ошибок
    let errorMessage = 'Неизвестная ошибка'
    let isCritical = false
    
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
      } else if (errorData.message) {
        errorMessage = errorData.message
      } else {
        errorMessage = `Ошибка SDK (код: ${errorData.code}, домен: ${errorData.domain || 'неизвестен'})`
      }
    } else if (errorData.message) {
      errorMessage = errorData.message
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
    
    setError(`Ошибка SDK: ${errorMessage}`)
    setIsMeasuring(false)
    
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
  const onActivation = useCallback((activationId) => {
    logger.sdk('onActivation - устройство активировано', { activationId })
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
    logger.session('onStateChange - изменение состояния сессии', state)
    setSessionState(state)
    
    if (state === SessionState.ACTIVE) {
      setIsLoading(false)
      setInstructionText('Поместите лицо в овал и не двигайтесь')
    } else if (state === SessionState.MEASURING) {
      setIsMeasuring(true)
      setMeasurementStartTime(Date.now())
      setScanProgress(0)
      setScanStage(scanStages[0].text)
    } else if (state === SessionState.STOPPING) {
      setIsMeasuring(false)
    } else if (state === SessionState.TERMINATED) {
      setIsMeasuring(false)
      setIsLoading(false)
    }
  }, [])

  // Автоматический запуск измерения когда лицо валидно и сессия активна
  useEffect(() => {
    if (sessionState === SessionState.ACTIVE && isFaceValid && !isMeasuring && sessionRef.current) {
      // Небольшая задержка для стабилизации
      const timer = setTimeout(() => {
        if (sessionState === SessionState.ACTIVE && isFaceValid && !isMeasuring) {
            try {
            logger.session('start - запуск измерения')
            sessionRef.current.start()
          } catch (err) {
            logger.error('Error starting measurement - ошибка запуска измерения', err)
            setError('Не удалось начать измерение')
          }
        }
      }, 1000) // Задержка 1 секунда для стабилизации

      return () => clearTimeout(timer)
    }
  }, [sessionState, isFaceValid, isMeasuring])

  // Callback для валидации изображения
  const onImageData = useCallback((imageValidity) => {
    // Логируем только изменения статуса (чтобы не засорять консоль)
    if (imageValidity !== ImageValidity.VALID) {
      logger.debug('onImageData - изображение невалидно', { imageValidity })
    }
    if (imageValidity === ImageValidity.VALID) {
      setIsFaceDetected(true)
      setIsFaceValid(true)
      if (sessionState === SessionState.ACTIVE && !isMeasuring) {
        setInstructionText('Отлично! Нажмите для начала измерения')
      }
    } else {
      setIsFaceValid(false)
      let message = 'Поместите лицо в овал'
      
      switch (imageValidity) {
        case ImageValidity.INVALID_DEVICE_ORIENTATION:
          message = 'Неподдерживаемая ориентация устройства'
          break
        case ImageValidity.TILTED_HEAD:
          message = 'Голова наклонена. Смотрите прямо в камеру'
          break
        case ImageValidity.UNEVEN_LIGHT:
          message = 'Неравномерное освещение. Встаньте напротив источника света'
          break
        case ImageValidity.INVALID_ROI:
        default:
          message = 'Лицо не обнаружено. Поместите лицо в овал'
          setIsFaceDetected(false)
          break
      }
      
      if (!isMeasuring) {
        setInstructionText(message)
      }
    }
  }, [sessionState, isMeasuring])

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
        
        // Согласно документации SDK, productId не передается в initialize
        // SDK использует licenseKey для активации
        logger.debug('Инициализация SDK с параметрами', {
          hasLicenseKey: !!SDK_CONFIG.licenseKey,
          licenseKeyLength: SDK_CONFIG.licenseKey?.length || 0,
          licenseKeyPreview: SDK_CONFIG.licenseKey ? `${SDK_CONFIG.licenseKey.substring(0, 10)}...` : 'empty',
        })
        
        await healthMonitorManager.initialize({
          licenseKey: SDK_CONFIG.licenseKey.trim(),
          licenseInfo: {
            onEnabledVitalSigns,
            onOfflineMeasurement,
            onActivation,
          },
        })
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
            video: { facingMode: 'environment' },
            audio: false,
          })
          logger.perf('Camera access granted', cameraStartTime)
          logger.info('Доступ к камере получен')

          // Получаем ID камеры
          const devices = await navigator.mediaDevices.enumerateDevices()
          const videoDevices = devices.filter((device) => device.kind === 'videoinput')
          if (videoDevices.length > 0) {
            cameraIdRef.current = videoDevices[0].deviceId
            logger.debug('Камера выбрана', { 
              deviceId: cameraIdRef.current,
              totalDevices: videoDevices.length 
            })
          }

          if (videoRef.current) {
            videoRef.current.srcObject = stream
            
            // Обработка ошибок видео
            videoRef.current.onerror = (err) => {
              logger.error('Video error - ошибка загрузки видео', err)
              setError('Ошибка загрузки видео')
              setIsLoading(false)
            }
            
            videoRef.current.onloadedmetadata = async () => {
              logger.info('Video metadata loaded - метаданные видео загружены', {
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
              })
              
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
                const options = {
                  input: videoRef.current,
                  cameraDeviceId: cameraIdRef.current,
                  processingTime,
                  onVitalSign,
                  onFinalResults,
                  onError,
                  onWarning,
                  onStateChange,
                  onImageData,
                  orientation: DeviceOrientation.PORTRAIT,
                  strictMeasurementGuidance: true,
                  ...(userInformation && { userInformation }),
                }

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
                logger.session('createFaceSession - сессия успешно создана')
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
        sessionRef.current.terminate().catch((err) => {
          logger.error('Ошибка при завершении сессии при размонтировании', err)
        })
        sessionRef.current = null
      }
    }
  }, [])


  // Определяем цвет овала
  const ovalColorClass = isMeasuring
    ? 'face-oval-scanning'
    : isFaceValid
      ? 'face-oval-success'
      : isFaceDetected
        ? 'face-oval-warning'
        : 'face-oval-default'
  
  // Вычисляем длину дуги для прогресс-бара
  const a = 143
  const b = 198.5
  const circumference = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)))
  const ovalPath = `M 149 6 A ${a} ${b} 0 1 1 149 403 A ${a} ${b} 0 1 1 149 6`
  const progressOffset = circumference - (circumference * scanProgress) / 100

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
          className={`camera-video ${error ? 'hidden' : ''}`}
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
                <mask id="mask0_138_3429" style={{maskType: 'alpha'}} maskUnits="userSpaceOnUse" x="0" y="0" width="298" height="409">
                  <ellipse cx="149" cy="204.5" rx="143" ry="198.5" stroke="black" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round"/>
                </mask>
                <g mask="url(#mask0_138_3429)">
                  <ellipse cx="149.5" cy="204.5" rx="154.5" ry="210.5" fill="#D3E8F4"/>
                </g>
                {scanProgress > 0 && (
                  <path
                    d={ovalPath}
                    stroke="#5DAF2E"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={progressOffset}
                    style={{
                      transition: 'stroke-dashoffset 0.1s linear',
                    }}
                  />
                )}
                <ellipse 
                  cx="149" 
                  cy="204.5" 
                  rx="143" 
                  ry="198.5" 
                  stroke="currentColor" 
                  strokeWidth="12" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  fill="none"
                  opacity={scanProgress > 0 ? 0.3 : 1}
                />
              </svg>
            </div>
            <div className="camera-instruction-container">
              {scanProgress > 0 ? (
                <>
                  <p className="camera-instruction-percent">{Math.round(scanProgress)}%</p>
                  <p className="camera-instruction-text">{scanStage}</p>
                </>
              ) : (
                <p className="camera-instruction-text">{instructionText}</p>
              )}
            </div>
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

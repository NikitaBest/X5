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
import { useAuth } from '../contexts/AuthContext.jsx'
import { postScanSaveRppg } from '../api/client.js'
import { SDK_CONFIG } from '../config/sdkConfig.js'
import logger from '../utils/logger.js'
import Page from '../layout/Page.jsx'
import Modal from '../ui/Modal.jsx'
import LoadingScreen from '../components/LoadingScreen.jsx'
import './Camera.css'

// Отладка SDK в консоль: что приходит от SDK и что показываем пользователю
const SDK_DEBUG = true
function sdkDebug(label, data) {
  if (SDK_DEBUG && typeof console !== 'undefined') {
    console.log('[SDK отладка]', label, data !== undefined ? data : '')
  }
}

// Карта оповещений SDK (основные коды из "Список оповещений.MD")
// Используется только для красивого логирования в консоль.
const SDK_ALERTS = {
  8: {
    code: 8,
    name: 'DEVICE_CODE_MINIMUM_OS_VERSION_ERROR',
    domain: 'DEVICE',
    cause: 'Версия операционной системы ниже минимально поддерживаемой.',
    solution: 'Обновите операционную систему устройства или используйте другое устройство.',
  },
  17: {
    code: 17,
    name: 'DEVICE_CODE_CLOCK_SKEW_ERROR',
    domain: 'DEVICE',
    cause: 'Обнаружено серьёзное искажение времени на устройстве.',
    solution: 'Проверьте дату, время и часовой пояс. Рекомендуется включить автонастройку времени.',
  },
  18: {
    code: 18,
    name: 'DEVICE_CODE_MINIMUM_BROWSER_VERSION_ERROR',
    domain: 'DEVICE',
    cause: 'Версия браузера ниже минимально поддерживаемой.',
    solution: 'Обновите браузер или используйте другой браузер.',
  },
  1001: {
    code: 1001,
    name: 'CAMERA_CODE_NO_CAMERA_ERROR',
    domain: 'CAMERA',
    cause: 'Устройство не имеет камеры с требуемыми характеристиками (как минимум 640x480 @ 30fps).',
    solution: 'Используйте устройство с поддерживаемой камерой и убедитесь, что камера работает корректно.',
  },
  1002: {
    code: 1002,
    name: 'CAMERA_CODE_CAMERA_OPEN_ERROR',
    domain: 'CAMERA',
    cause: 'Не удалось запустить камеру.',
    solution: 'Проверьте, что камера не занята другим приложением и работает корректно, затем попробуйте снова.',
  },
  1005: {
    code: 1005,
    name: 'CAMERA_CODE_CAMERA_MISSING_PERMISSIONS_ERROR',
    domain: 'CAMERA',
    cause: 'Приложению не предоставлено разрешение на использование камеры.',
    solution: 'Разрешите доступ к камере в настройках браузера/устройства.',
  },
  1501: {
    code: 1501,
    name: 'CAMERA_CODE_UNEXPECTED_IMAGE_DIMENSIONS_WARNING',
    domain: 'CAMERA',
    cause: 'Фактическое разрешение камеры отличается от запрошенного.',
    solution: 'Попросите пользователя повторить измерение; при повторении проблемы возможно устройство не поддерживает VGA.',
  },
  2002: {
    code: 2002,
    name: 'LICENSE_CODE_ACTIVATION_LIMIT_REACHED_ERROR',
    domain: 'LICENSE',
    cause: 'Достигнут лимит устройств для данной лицензии.',
    solution: 'Свяжитесь с отделом продаж для увеличения количества разрешённых устройств.',
  },
  2003: {
    code: 2003,
    name: 'LICENSE_CODE_METER_ATTRIBUTE_USES_LIMIT_REACHED_ERROR',
    domain: 'LICENSE',
    cause: 'Лимит измерений по лицензии исчерпан.',
    solution: 'Свяжитесь с отделом продаж для увеличения количества доступных измерений.',
  },
  2004: {
    code: 2004,
    name: 'LICENSE_CODE_AUTHENTICATION_FAILED_ERROR',
    domain: 'LICENSE',
    cause: 'SDK не смог аутентифицировать лицензию (расхождение времени, сеть, неверный токен).',
    solution: 'Проверьте интернет, корректность времени на устройстве и свободное место, затем попробуйте снова.',
  },
  2007: {
    code: 2007,
    name: 'LICENSE_CODE_INVALID_LICENSE_KEY_ERROR',
    domain: 'LICENSE',
    cause: 'Недействительный лицензионный ключ.',
    solution: 'Используйте корректный ключ, предоставленный поддержкой BiosenseSignal.',
  },
  2010: {
    code: 2010,
    name: 'LICENSE_CODE_REVOKED_LICENSE_ERROR',
    domain: 'LICENSE',
    cause: 'Лицензия отозвана.',
    solution: 'Свяжитесь со службой поддержки клиентов.',
  },
  2016: {
    code: 2016,
    name: 'LICENSE_CODE_INTERNAL_ERROR_9',
    domain: 'LICENSE',
    cause: 'Ошибка SSL при аутентификации ответа сервера лицензий.',
    solution: 'Проверьте время, интернет‑подключение, попробуйте другую сеть или повторите позже.',
  },
  2017: {
    code: 2017,
    name: 'LICENSE_CODE_LICENSE_EXPIRED_ERROR',
    domain: 'LICENSE',
    cause: 'Срок действия лицензии истёк.',
    solution: 'Свяжитесь со службой поддержки клиентов для продления лицензии.',
  },
  2018: {
    code: 2018,
    name: 'LICENSE_CODE_LICENSE_SUSPENDED_ERROR',
    domain: 'LICENSE',
    cause: 'Лицензия приостановлена.',
    solution: 'Свяжитесь со службой поддержки клиентов.',
  },
  2024: {
    code: 2024,
    name: 'LICENSE_CODE_NETWORK_ISSUES_ERROR',
    domain: 'DEVICE',
    cause: 'Нет подключения к интернету.',
    solution: 'Проверьте интернет‑подключение и повторите попытку.',
  },
  2025: {
    code: 2025,
    name: 'LICENSE_CODE_SSL_HANDSHAKE_ERROR',
    domain: 'DEVICE',
    cause: 'Проблема безопасности SSL‑сертификата.',
    solution: 'Проверьте время на устройстве, интернет и сеть; при необходимости попробуйте другую сеть.',
  },
  2032: {
    code: 2032,
    name: 'LICENSE_CODE_INPUT_LICENSE_KEY_EMPTY_ERROR',
    domain: 'LICENSE',
    cause: 'Лицензионный ключ не передан в SDK.',
    solution: 'Запустите SDK с действительным лицензионным ключом.',
  },
  2034: {
    code: 2034,
    name: 'LICENSE_CODE_INPUT_PRODUCT_ID_ILLEGAL_ERROR',
    domain: 'LICENSE',
    cause: 'Указан недопустимый productId.',
    solution: 'Передавайте корректный productId или null, согласно настройке лицензии.',
  },
  2035: {
    code: 2035,
    name: 'LICENSE_CODE_CANNOT_OPEN_FILE_FOR_READ_ERROR',
    domain: 'LICENSE',
    cause: 'SDK не может прочитать необходимые данные из файловой системы.',
    solution: 'Попросите пользователя переустановить/восстановить приложение.',
  },
  2036: {
    code: 2036,
    name: 'LICENSE_CODE_MONTHLY_USAGE_TRACKING_REQUIRES_SYNC_ERROR',
    domain: 'LICENSE',
    cause: 'SDK не смог аутентифицироваться на сервере лицензий для отслеживания использования.',
    solution: 'Проверьте интернет‑подключение и повторите попытку.',
  },
  2037: {
    code: 2037,
    name: 'LICENSE_CODE_SSL_HANDSHAKE_DEVICE_DATE_ERROR',
    domain: 'LICENSE',
    cause: 'Проблема с SSL‑сертификатом из‑за некорректной даты на устройстве.',
    solution: 'Проверьте дату и время на устройстве и интернет‑подключение.',
  },
  2038: {
    code: 2038,
    name: 'LICENSE_CODE_SSL_HANDSHAKE_CERTIFICATE_EXPIRED_ERROR',
    domain: 'LICENSE',
    cause: 'Срок действия SSL‑сертификата истёк.',
    solution: 'Проверьте время и сеть; при повторении проблемы свяжитесь с поддержкой.',
  },
  2039: {
    code: 2039,
    name: 'LICENSE_CODE_MIN_SDK_ERROR',
    domain: 'LICENSE',
    cause: 'Версия SDK слишком старая для этой лицензии.',
    solution: 'Обновите SDK до поддерживаемой версии.',
  },
  2042: {
    code: 2042,
    name: 'LICENSE_CODE_NETWORK_TIMEOUT_ERROR',
    domain: 'LICENSE',
    cause: 'Таймаут сетевого запроса к серверу лицензий.',
    solution: 'Проверьте качество интернет‑соединения, перезапустите приложение или попробуйте позже.',
  },
  3003: {
    code: 3003,
    name: 'MEASUREMENT_CODE_MISDETECTION_DURATION_EXCEEDS_LIMIT_ERROR',
    domain: 'MEASUREMENT',
    cause: 'Лицо несколько раз не распознавалось более 0,5 секунд.',
    solution: 'Попросите пользователя сидеть ровно, не двигаться и держать лицо в овале.',
  },
  3004: {
    code: 3004,
    name: 'MEASUREMENT_CODE_INVALID_RECENT_DETECTION_RATE_ERROR',
    domain: 'MEASUREMENT',
    cause: 'Обнаружено много потерь кадров (низкий FPS или плохой свет).',
    solution: 'Закройте тяжёлые приложения, улучшите освещение и повторите измерение.',
  },
  3006: {
    code: 3006,
    name: 'MEASUREMENT_CODE_LICENSE_ACTIVATION_FAILED_ERROR',
    domain: 'MEASUREMENT',
    cause: 'Сбой активации лицензии во время измерения.',
    solution: 'Проверьте интернет и настройки прокси; при повторении обратитесь в поддержку.',
  },
  3008: {
    code: 3008,
    name: 'MEASUREMENT_CODE_INVALID_MEASUREMENT_AVERAGE_DETECTION_RATE_ERROR',
    domain: 'MEASUREMENT',
    cause: 'Средняя частота обнаружения лиц/кадров значительно ниже ожидаемой.',
    solution: 'Освободите ресурсы устройства, улучшите освещение, при необходимости используйте другое устройство.',
  },
  3009: {
    code: 3009,
    name: 'MEASUREMENT_CODE_TOO_MANY_FRAMES_INORDER_ERROR',
    domain: 'MEASUREMENT',
    cause: 'Получено много кадров с неправильным порядком временных меток.',
    solution: 'Попросите пользователя повторить измерение.',
  },
  3500: {
    code: 3500,
    name: 'MEASUREMENT_CODE_MISDETECTION_DURATION_EXCEEDS_LIMIT_WARNING',
    domain: 'MEASUREMENT',
    cause: 'Лицо не обнаруживалось более 0,5 секунд.',
    solution: 'Напомните пользователю держать лицо в овале и не двигаться.',
  },
  3505: {
    code: 3505,
    name: 'MEASUREMENT_CODE_INVALID_RECENT_FPS_RATE_WARNING',
    domain: 'MEASUREMENT',
    cause: 'Частота кадров камеры упала и может повлиять на качество измерений.',
    solution: 'Снизьте нагрузку на устройство и следуйте рекомендациям по измерению.',
  },
  3506: {
    code: 3506,
    name: 'MEASUREMENT_CODE_MEASUREMENT_MISPLACED_FRAME_WARNING',
    domain: 'MEASUREMENT',
    cause: 'Получен кадр с некорректным порядком временных меток.',
    solution: 'Обычно достаточно повторить измерение; предупреждение не является критичным.',
  },
  4505: {
    code: 4505,
    name: 'VITAL_SIGN_CODE_BLOOD_PRESSURE_PROCESSING_FAILED_WARNING',
    domain: 'VITAL_SIGNS',
    cause: 'Не удалось рассчитать артериальное давление в этом измерении.',
    solution: 'Будут показаны остальные показатели; при повторении проблемы переустановите приложение.',
  },
  4506: {
    code: 4506,
    name: 'VITAL_SIGN_CODE_MEASURING_WITH_NO_ENABLED_VITAL_SIGNS_WARNING',
    domain: 'VITAL_SIGNS',
    cause: 'В рамках текущего измерения не включены жизненно важные показатели.',
    solution: 'Проверьте конфигурацию лицензии и интернет‑подключение, затем выполните новое измерение.',
  },
  6004: {
    code: 6004,
    name: 'SESSION_CODE_ILLEGAL_START_CALL_ERROR',
    domain: 'SESSION',
    cause: 'start() был вызван, когда сессия не готова к измерению.',
    solution: 'Вызывайте start() только после перехода сессии в состояние ACTIVE.',
  },
  6005: {
    code: 6005,
    name: 'SESSION_CODE_ILLEGAL_STOP_CALL_ERROR',
    domain: 'SESSION',
    cause: 'stop() был вызван, когда сессия не находилась в состоянии MEASURING.',
    solution: 'Вызывайте stop() только во время активного измерения.',
  },
  7002: {
    code: 7002,
    name: 'INITIALIZATION_CODE_INVALID_PROCESSING_TIME_ERROR',
    domain: 'INITIALIZATION',
    cause: 'Указано недопустимое время измерения (processingTime).',
    solution: 'Используйте время в диапазоне 20–180 секунд.',
  },
  7005: {
    code: 7005,
    name: 'INITIALIZATION_CODE_INVALID_LICENSE_FORMAT',
    domain: 'INITIALIZATION',
    cause: 'Лицензионный ключ пустой или имеет неверный формат.',
    solution: 'Проверьте, что ключ соответствует формату и не содержит лишних символов.',
  },
  7006: {
    code: 7006,
    name: 'INITIALIZATION_CODE_SDK_LOAD_FAILURE',
    domain: 'INITIALIZATION',
    cause: 'Не удалось загрузить алгоритмический двоичный файл SDK (a.wasm.gz).',
    solution: 'Убедитесь, что a.wasm.gz доступен и не блокируется сервером или браузером.',
  },
  7007: {
    code: 7007,
    name: 'INITIALIZATION_CODE_UNSUPPORTED_USER_WEIGHT',
    domain: 'INITIALIZATION',
    cause: 'Указан вес вне поддерживаемого диапазона 40–200 кг.',
    solution: 'Укажите вес в пределах диапазона или не указывайте его.',
  },
  7008: {
    code: 7008,
    name: 'INITIALIZATION_CODE_UNSUPPORTED_USER_AGE',
    domain: 'INITIALIZATION',
    cause: 'Указан возраст вне поддерживаемого диапазона 18–110 лет.',
    solution: 'Укажите возраст в пределах диапазона или не указывайте его.',
  },
  7009: {
    code: 7009,
    name: 'INITIALIZATION_CODE_CONCURRENT_SESSIONS_ERROR',
    domain: 'INITIALIZATION',
    cause: 'Попытка создать новую сессию до завершения предыдущей.',
    solution: 'Завершите предыдущую сессию перед созданием новой.',
  },
  7012: {
    code: 7012,
    name: 'INITIALIZATION_CODE_UNSUPPORTED_USER_HEIGHT',
    domain: 'INITIALIZATION',
    cause: 'Указан рост вне поддерживаемого диапазона 130–230 см.',
    solution: 'Укажите рост в пределах диапазона или не указывайте его.',
  },
  7013: {
    code: 7013,
    name: 'INITIALIZATION_CODE_MEMORY_ALLOCATION_ERROR',
    domain: 'INITIALIZATION',
    cause: 'Сбой выделения памяти (известная проблема WebKit/Emscripten на старых iOS).',
    solution: 'Рекомендуется закрыть вкладку/браузер и повторить измерение в новой вкладке.',
  },
  7014: {
    code: 7014,
    name: 'INITIALIZATION_CODE_INITIAL_MEMORY_ALLOCATION_ERROR',
    domain: 'INITIALIZATION',
    cause: 'Не удалось выделить память при старте SDK.',
    solution: 'Закройте лишние приложения и вкладки, подождите и попробуйте снова; при повторении проблема в слабом устройстве.',
  },
  7015: {
    code: 7015,
    name: 'INITIALIZATION_CODE_BROWSER_NOT_SUPPORTING_SHARED_ARRAY_BUFFER_ERROR',
    domain: 'INITIALIZATION',
    cause: 'Браузер не поддерживает SharedArrayBuffer.',
    solution: 'Обновите браузер или используйте устройство/браузер с поддержкой SharedArrayBuffer.',
  },
  7501: {
    code: 7501,
    name: 'INITIALIZATION_MEMORY_USAGE_WARNING',
    domain: 'INITIALIZATION',
    cause: 'SDK повторно запускается в той же вкладке, что может приводить к утечкам памяти на iOS 17 и ниже.',
    solution: 'Рекомендуется запускать измерения в новой вкладке или перезапустить браузер.',
  },
}

// Короткие сообщения для пользователя при предупреждениях SDK (показываем на экране)
function getUserMessageForAlert(alertInfo) {
  if (!alertInfo || !alertInfo.solution) return null
  const messages = {
    3500: 'Держите лицо в овале и не двигайтесь — лицо не обнаруживалось более 0,5 сек.',
    3505: 'Держите лицо в овале. Снижена частота кадров — закройте другие приложения.',
    3506: 'Получен кадр не по порядку. Держите лицо в овале и не двигайтесь.',
    1501: 'Разрешение камеры отличается от ожидаемого. Попробуйте ещё раз.',
  }
  return messages[alertInfo.code] || alertInfo.solution
}

function Camera() {
  const navigate = useNavigate()
  const { userData } = useUserData()
  const { token } = useAuth()
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
  const [showCompletionSuccess, setShowCompletionSuccess] = useState(false) // Уведомление «Готово» перед переходом на результаты
  
  // scanIntervalRef удален - прогресс обновляется только в onVitalSign
  const isCreatingSessionRef = useRef(false) // Флаг для предотвращения множественного создания сессий
  const isMounted = useRef(true) // Для отслеживания монтирования компонента
  const measurementPausedTimeRef = useRef(null) // Время, когда измерение было приостановлено
  const totalPausedTimeRef = useRef(0) // Общее время паузы
  const lastValidImageTimeRef = useRef(null) // Время последнего валидного изображения
  const measurementCompletedRef = useRef(false) // Флаг завершения измерения - не запускать автоматически
  const lastImageValidityRef = useRef(null) // Последний статус валидности для логирования
  const lastInstructionValidityRef = useRef(null) // Обновляем текст инструкции только при смене статуса (не каждый кадр)
  const lastLogTimeRef = useRef(0) // Время последнего лога для ограничения частоты
  const measurementStartTimeRef = useRef(null) // Ref для хранения времени начала измерения (избегаем проблем с замыканием)
  const sessionStateRef = useRef(SessionState.INIT) // Актуальное состояние сессии для проверки внутри таймера
  const hasAutoStartScheduledRef = useRef(false)   // Не планировать start() дважды за один ACTIVE

  const getMetricValue = (item) => {
    if (item === null || item === undefined) return null
    if (typeof item === 'object' && 'value' in item) return item.value
    if (typeof item === 'number' || typeof item === 'string') return item
    return null
  }

  // scanStages удален - используем только тексты, основанные на реальных состояниях SDK

  // Обновление прогресса измерения
  // ВАЖНО: Прогресс обновляется ТОЛЬКО когда SDK реально обрабатывает данные (isProcessingFrames === true)
  // Прогресс рассчитывается на основе времени с начала измерения, но только когда SDK работает
  useEffect(() => {
    // Если SDK не обрабатывает данные и измерение остановлено, сбрасываем прогресс
    if (!isProcessingFrames && !isMeasuring) {
      setScanProgress(0)
      measurementPausedTimeRef.current = null
      totalPausedTimeRef.current = 0
      lastValidImageTimeRef.current = null
      return
    }
    
    // Обновляем прогресс только когда SDK обрабатывает данные (isProcessingFrames === true)
    // Это гарантирует, что "сканирование" видно только во время реальной обработки
    if (isProcessingFrames && measurementStartTimeRef.current) {
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
    sdkDebug('SDK обрабатывает кадры (onVitalSign):', {
      '→ Пользователю': 'прогресс % и зелёный овал',
      pulseRate: vitalSign?.pulseRate?.value,
    })
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
    sdkDebug('SDK завершил измерение (onFinalResults):', {
      '→ Пользователю': 'переход на экран результатов',
      pulseRate: vitalSignsResults?.results?.pulseRate?.value,
    })
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
    setShowCompletionSuccess(true) // Показываем уведомление «Готово» ✓
    // НЕ сбрасываем measurementStartTime здесь - он может понадобиться для логирования
    
    // ВАЖНО: Устанавливаем флаг, чтобы предотвратить автоматический перезапуск после завершения
    measurementCompletedRef.current = true

    // Сохраняем результат сканирования в бэкенд (не блокируем переход на экран результатов).
    try {
      const sdkResults = vitalSignsResults?.results || {}
      const pulseRate = sdkResults?.pulseRate
      const respirationRate = sdkResults?.respirationRate
      const stressLevel = sdkResults?.stressLevel
      const sdnn = sdkResults?.sdnn
      const bloodPressure = sdkResults?.bloodPressure

      let bloodPressureSystolic = null
      let bloodPressureDiastolic = null
      if (bloodPressure && typeof bloodPressure === 'object') {
        if (bloodPressure.value && typeof bloodPressure.value === 'object') {
          bloodPressureSystolic = getMetricValue(bloodPressure.value.systolic)
          bloodPressureDiastolic = getMetricValue(bloodPressure.value.diastolic)
        } else {
          bloodPressureSystolic = getMetricValue(bloodPressure.systolic)
          bloodPressureDiastolic = getMetricValue(bloodPressure.diastolic)
        }
      }

      const payload = {
        takenAt: new Date().toISOString(),
        source: 'web_sdk',
        metrics: {
          pulseRate: {
            value: getMetricValue(pulseRate),
            unit: 'bpm',
            confidence: pulseRate?.confidence ?? pulseRate?.confidenceLevel ?? null,
          },
          respirationRate: {
            value: getMetricValue(respirationRate),
            unit: 'breaths_per_min',
            confidence: respirationRate?.confidence ?? respirationRate?.confidenceLevel ?? null,
          },
          stressLevel: {
            value: getMetricValue(stressLevel),
            unit: 'ratio',
            confidence: stressLevel?.confidence ?? stressLevel?.confidenceLevel ?? null,
          },
          sdnn: {
            value: getMetricValue(sdnn),
            unit: 'ms',
            confidence: sdnn?.confidence ?? sdnn?.confidenceLevel ?? null,
          },
          bloodPressure: {
            systolic: bloodPressureSystolic,
            diastolic: bloodPressureDiastolic,
            unit: 'mmHg',
            confidence: bloodPressure?.confidence ?? bloodPressure?.confidenceLevel ?? null,
          },
        },
        sdkRaw: vitalSignsResults,
      }

      postScanSaveRppg(token, payload)
        .then(() => {
          logger.info('scan/save-rppg: результат успешно сохранён')
        })
        .catch((err) => {
          logger.warn('scan/save-rppg: не удалось сохранить результат', err)
        })
    } catch (err) {
      logger.warn('scan/save-rppg: не удалось сериализовать результат', err)
    }
    
    // Переход на страницу результатов через 1 секунду (пользователь видит уведомление «Готово»)
    setTimeout(() => {
      navigate('/results', { state: { results: vitalSignsResults } })
    }, 1000)
  }, [navigate, token, userData])

  // Callback для обработки ошибок
  const onError = useCallback((errorData) => {
    logger.error('SDK Error - получена ошибка от SDK', errorData)
    
    // Дополнительное логирование по карте оповещений SDK
    if (errorData.code) {
      const alertInfo = SDK_ALERTS[errorData.code]
      if (alertInfo) {
        logger.error('SDK Alert details', {
          code: alertInfo.code,
          name: alertInfo.name,
          domain: alertInfo.domain,
          cause: alertInfo.cause,
          solution: alertInfo.solution,
        })
      } else {
        logger.error('SDK Alert (unknown code)', {
          code: errorData.code,
          domain: errorData.domain,
        })
      }
    }
    
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
      const userMsg = 'Ошибка измерения. Убедитесь, что лицо находится в овале и не двигается. Поместите лицо в овал для начала нового измерения.'
      setHasMeasurementError(true)
      setError('')
      setInstructionText(userMsg)
      sdkDebug('SDK ошибка измерения (onError):', {
        code: errorData.code,
        domain: errorData.domain,
        '→ Пользователю': userMsg,
      })
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

  // Callback для обработки предупреждений — показываем пользователю, что делать
  const onWarning = useCallback((warningData) => {
    logger.warn('SDK Warning - получено предупреждение от SDK', warningData)

    if (warningData.code) {
      const alertInfo = SDK_ALERTS[warningData.code]
      if (alertInfo) {
        logger.warn('SDK Warning details', {
          code: alertInfo.code,
          name: alertInfo.name,
          domain: alertInfo.domain,
          cause: alertInfo.cause,
          solution: alertInfo.solution,
        })
        // Показываем пользователю понятную подсказку на экране (не только в консоли)
        const userMessage = getUserMessageForAlert(alertInfo)
        if (userMessage) {
          setInstructionText(userMessage)
          sdkDebug('SDK предупреждение (onWarning):', {
            code: alertInfo.code,
            name: alertInfo.name,
            '→ Пользователю': userMessage,
          })
        }
      } else {
        logger.warn('SDK Warning (unknown code)', {
          code: warningData.code,
          domain: warningData.domain,
        })
      }
    }
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
    sessionStateRef.current = state

    sdkDebug('Состояние сессии (SDK):', {
      state: stateName,
      '→ что делаем': state === SessionState.ACTIVE ? 'ждём 1 сек, затем start()' : state === SessionState.MEASURING ? 'ждём onImageData и onVitalSign (~8 сек)' : '',
    })

    if (state === SessionState.ACTIVE) {
      hasAutoStartScheduledRef.current = false // разрешаем запланировать автостарт при следующем ACTIVE
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
      hasAutoStartScheduledRef.current = false
      lastInstructionValidityRef.current = null // чтобы первая подсказка от onImageData точно показалась
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
  
  // Запуск измерения.
  // ВАЖНО: согласно документации SDK, валидация кадров (ImageValidity / onImageData)
  // происходит "во время измерения" (during the measurement). То есть SDK
  // начинает проверять лицо и возвращать статусы только ПОСЛЕ вызова start().
  // Поэтому мы не можем ждать ImageValidity.VALID до старта – иначе измерение
  // никогда не начнется. Мы запускаем измерение автоматически после перехода
  // сессии в ACTIVE, а уже во время измерения используем onImageData для
  // подсказок и контроля прогресса.
  const startTimerRef = useRef(null)
  
  useEffect(() => {
    // Если была ошибка измерения или измерение завершено, не запускаем автоматически
    if (hasMeasurementError || measurementCompletedRef.current) {
      return
    }

    // Автостарт измерения: ориентируемся на состояние сессии SDK.
    // Как только сессия перешла в ACTIVE, через 1 секунду вызываем start().
    // SDK сам решает, какие кадры валидны (strictMeasurementGuidance: true),
    // а мы уже по onImageData/onVitalSign подсвечиваем овал и прогресс.
    if (
      sessionState === SessionState.ACTIVE &&
      !isMeasuring &&
      sessionRef.current &&
      !hasAutoStartScheduledRef.current
    ) {
      hasAutoStartScheduledRef.current = true
      logger.debug('⏱️ Автозапуск измерения через 1 секунду после перехода в ACTIVE')
      startTimerRef.current = setTimeout(() => {
        if (
          sessionStateRef.current === SessionState.ACTIVE &&
          sessionRef.current &&
          !hasMeasurementError
        ) {
          try {
            logger.session('▶️ start() - автозапуск измерения после ACTIVE (1 секунда)')
            sessionRef.current.start()
          } catch (err) {
            logger.error('❌ Ошибка запуска измерения', err)
            setError('Не удалось начать измерение')
          }
        }
        hasAutoStartScheduledRef.current = false
      }, 1000)
    }

    return () => {
      if (startTimerRef.current) {
        clearTimeout(startTimerRef.current)
        startTimerRef.current = null
      }
    }
  }, [sessionState, isMeasuring, hasMeasurementError])
  
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

    // Текст инструкции обновляем только при смене ImageValidity, чтобы не мигал (onImageData вызывается каждый кадр)
    const instructionValidityChanged = lastInstructionValidityRef.current !== imageValidity
    if (instructionValidityChanged) {
      lastInstructionValidityRef.current = imageValidity
    }
    
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
      if (instructionValidityChanged) {
        let userMsg = ''
        if (isProcessingFrames) {
          userMsg = 'Анализ идет. Продолжайте держать лицо в овале'
          setInstructionText(userMsg)
        } else if (isMeasuring) {
          userMsg = 'Анализ запущен. Ожидаем начала обработки данных...'
          setInstructionText(userMsg)
        } else {
          if (hasMeasurementError) {
            userMsg = 'Лицо обнаружено. Начинаем новое измерение...'
            setInstructionText(userMsg)
          } else {
            userMsg = 'Отлично! Лицо обнаружено, начинаем измерение...'
            setInstructionText(userMsg)
          }
        }
        sdkDebug('Лицо (SDK):', {
          ImageValidity: imageValidityName,
          faceDetected: true,
          faceValid: true,
          '→ Пользователю': userMsg,
          '→ Овал': 'зелёный (лицо валидно)',
        })
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
      
      // Обновляем текст инструкции только при смене статуса (чтобы подсказка не мигала)
      if (instructionValidityChanged) {
        const userMsg = !isMeasuring || imageValidity === ImageValidity.INVALID_ROI
          ? message
          : `${message}. Держите лицо в овале для продолжения.`
        setInstructionText(userMsg)
        const ovalLabel = !faceDetected ? 'жёлтый (лицо не в овале)' : 'серый (лицо видно, но не валидно)'
        sdkDebug('Лицо (SDK):', {
          ImageValidity: imageValidityName,
          faceDetected,
          faceValid: false,
          '→ Пользователю': userMsg,
          '→ Овал': ovalLabel,
        })
      }
      
      // ВАЖНО: Если SDK обрабатывал данные, но лицо стало невалидным,
      // мы сразу ставим «паузу» анализа для более точного UX:
      // прогресс и индикация сканирования останавливаются мгновенно.
      if (isProcessingFrames && imageValidity !== ImageValidity.VALID) {
        logger.debug('⏸️ SDK перестал обрабатывать данные - лицо стало невалидным')
        setIsProcessingFrames(false)
        if (measurementPausedTimeRef.current === null && measurementStartTime) {
          measurementPausedTimeRef.current = Date.now()
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
  // ЛОГИКА ЦВЕТА ОВАЛА (UX поверх ImageValidity SDK):
  // - Желтый (warning): лицо НЕ обнаружено в овале (INVALID_ROI / INVALID_DEVICE_ORIENTATION).
  // - Серый (default): лицо распознано в кадре, но измерение ещё не запущено/лицо невалидно.
  // - Зеленый (success):
  //     - сразу после старта измерения, когда сессия в MEASURING и лицо валидно (SDK говорит, что всё ок);
  //     - и далее, пока SDK реально обрабатывает данные (isProcessingFrames === true).
  // 
  // ПРАВИЛЬНАЯ ЛОГИКА ПРОГРЕСС-БАРА:
  // - Синий прогресс-бар: ТОЛЬКО когда SDK реально обрабатывает данные (isProcessingFrames === true).
  // - Проценты берутся из scanProgress, который обновляется только когда SDK обрабатывает данные.
  
  const ovalColorClass = !isFaceDetected
    ? 'face-oval-warning' // Желтый - лицо не обнаружено в овале
    : (sessionState === SessionState.MEASURING && isFaceValid) || isProcessingFrames
      ? 'face-oval-success' // Зеленый - измерение запущено и лицо валидно / SDK обрабатывает данные
      : 'face-oval-default' // Серый - лицо в кадре, но либо измерение ещё не началось, либо лицо невалидно
  
  // Показываем прогресс-бар ТОЛЬКО когда SDK реально обрабатывает данные
  // (isProcessingFrames устанавливается в true когда вызывается onVitalSign)
  // ВАЖНО: isProcessingFrames - главный индикатор "идет ли анализ"
  const showProgressBar = isProcessingFrames
  
  // Показываем индикатор ожидания когда измерение запущено, но SDK еще не обрабатывает данные
  // Это помогает пользователю понять, что происходит (ожидание ~8 секунд до первого onVitalSign)
  const showWaitingIndicator = isMeasuring && !isProcessingFrames
  
  // Логируем только при изменении состояния овала или прогресс-бара
  const lastOvalStateRef = useRef({ color: null, progress: false })
  const currentOvalState = { color: ovalColorClass, progress: showProgressBar }
  
  if (lastOvalStateRef.current.color !== ovalColorClass || 
      lastOvalStateRef.current.progress !== showProgressBar) {
    const ovalLabel = ovalColorClass === 'face-oval-success' ? 'зелёный' : ovalColorClass === 'face-oval-warning' ? 'жёлтый' : 'серый'
    sdkDebug('Экран (что видит пользователь):', {
      овал: ovalLabel,
      прогресс: showProgressBar ? `${Math.round(scanProgress)}%` : 'не показываем',
      isFaceDetected,
      isFaceValid,
      isProcessingFrames,
    })
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
  
  // Сдвиг пунктира: начинаем ровно с первого штриха без смещения,
  // чтобы прогресс заполнял пунктир "с самого начала".
  const dashOffset = 0
  
  // Толщина пунктирного "кольца": рисуем в 2 раза толще и маской убираем внутреннюю половину,
  // чтобы внешний край был закругленным, а внутренний — ровным (как на референсе).
  const dashStroke = 6
  const outerAlignedStroke = dashStroke * 2
  const progressMaskStroke = outerAlignedStroke + 2

  // Плавный прогресс (маска раскрывается непрерывно), но видимыми остаются только пунктиры
  const progressFraction = Math.max(0, Math.min(1, scanProgress / 100))
  const progressOffset = circumference - circumference * progressFraction

  return (
    <>
      {isLoading && <LoadingScreen text="Инициализация камеры..." />}
      <div className="camera-page">
        <div className="camera-preview">
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
            {showCompletionSuccess && (
              <div className="camera-completion-notification" aria-live="polite">
                <span className="camera-completion-notification-icon" aria-hidden="true">✓</span>
                <span className="camera-completion-notification-text">Готово</span>
              </div>
            )}
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
            {/* При завершении показываем только уведомление «Готово» — без текста инструкции и процентов под ним */}
            {!showCompletionSuccess && (
              isMeasuring && isFaceValid && isProcessingFrames ? (
                <div className="camera-scan-percent" aria-live="polite">
                  {Math.round(scanProgress)}%
                </div>
              ) : (
                <div className="camera-instruction-container">
                  <p className="camera-instruction-text">{instructionText}</p>
                </div>
              )
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
    </>
  )
}

export default Camera

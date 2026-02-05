/**
 * Система логирования для отладки на продакшене
 * 
 * Использование:
 * import logger from './utils/logger'
 * 
 * logger.info('SDK initialized', { licenseKey: '...' })
 * logger.error('SDK Error', errorData)
 * logger.sdk('onVitalSign', { pulseRate: 72 })
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
}

// Определяем уровень логирования из переменных окружения
const getLogLevel = () => {
  const envLevel = import.meta.env.VITE_LOG_LEVEL?.toUpperCase()
  const isDev = import.meta.env.DEV
  const isProd = import.meta.env.PROD
  
  // В продакшене по умолчанию только ошибки, но можно включить через переменную
  if (isProd && !envLevel) {
    return LOG_LEVELS.ERROR
  }
  
  // В dev режиме по умолчанию все логи
  if (isDev && !envLevel) {
    return LOG_LEVELS.DEBUG
  }
  
  // Если указан уровень в переменных окружения
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return LOG_LEVELS[envLevel]
  }
  
  return LOG_LEVELS.INFO
}

const currentLogLevel = getLogLevel()
const enableSDKLogs = import.meta.env.VITE_ENABLE_SDK_LOGS !== 'false'

// Форматирование времени
const getTimestamp = () => {
  const now = new Date()
  return now.toISOString()
}

// Форматирование сообщения с метаданными
const formatMessage = (category, message) => {
  const timestamp = getTimestamp()
  return `[${timestamp}] [${category}] ${message}`
}

const logger = {
  /**
   * Логирование общих информационных сообщений
   */
  info: (message, data = null) => {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      const formatted = formatMessage('INFO', message)
      if (data) {
        console.log(formatted, data)
      } else {
        console.log(formatted)
      }
    }
  },

  /**
   * Логирование отладочных сообщений (только в dev или если включено)
   */
  debug: (message, data = null) => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      const formatted = formatMessage('DEBUG', message)
      if (data) {
        console.log(formatted, data)
      } else {
        console.log(formatted)
      }
    }
  },

  /**
   * Логирование предупреждений
   */
  warn: (message, data = null) => {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      const formatted = formatMessage('WARN', message)
      if (data) {
        console.warn(formatted, data)
      } else {
        console.warn(formatted)
      }
    }
  },

  /**
   * Логирование ошибок (всегда логируется)
   */
  error: (message, error = null) => {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      const formatted = formatMessage('ERROR', message)
      if (error) {
        console.error(formatted, error)
      } else {
        console.error(formatted)
      }
    }
  },

  /**
   * Специальное логирование для SDK событий
   */
  sdk: (event, data = null) => {
    if (!enableSDKLogs) return
    
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      const formatted = formatMessage('SDK', event)
      if (data) {
        console.log(formatted, data)
      } else {
        console.log(formatted)
      }
    }
  },

  /**
   * Логирование жизненного цикла сессии
   */
  session: (action, state = null, data = null) => {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      const formatted = formatMessage('SESSION', action)
      const logData = state ? { state, ...data } : data
      if (logData) {
        console.log(formatted, logData)
      } else {
        console.log(formatted)
      }
    }
  },

  /**
   * Логирование пользовательских действий
   */
  user: (action, data = null) => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      const formatted = formatMessage('USER', action)
      if (data) {
        console.log(formatted, data)
      } else {
        console.log(formatted)
      }
    }
  },

  /**
   * Группировка логов (для удобства в консоли)
   */
  group: (label, callback) => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      console.group(`[${getTimestamp()}] ${label}`)
      callback()
      console.groupEnd()
    } else {
      callback()
    }
  },

  /**
   * Логирование производительности
   */
  perf: (label, startTime) => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      const duration = Date.now() - startTime
      console.log(`[${getTimestamp()}] [PERF] ${label}: ${duration}ms`)
    }
  },
}

// Логируем текущий уровень логирования при инициализации
if (currentLogLevel <= LOG_LEVELS.INFO) {
  logger.info('Logger initialized', {
    level: Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === currentLogLevel),
    env: import.meta.env.MODE,
    sdkLogsEnabled: enableSDKLogs,
  })
}

export default logger


// Конфигурация для BiosenseSignal SDK
// ВАЖНО: Замените на ваш реальный license key и productId
export const SDK_CONFIG = {
  // Получите license key от BiosenseSignal
  // Для тестирования можно использовать пустую строку, но SDK не будет работать
  licenseKey: import.meta.env.VITE_BIOSENSESIGNAL_LICENSE_KEY || '',

  // Product ID - передается в HealthMonitorManager.initialize() для использования выделенного Product ID
  // Если не указан явно, SDK определит его автоматически из licenseKey
  // Укажите VITE_BIOSENSESIGNAL_PRODUCT_ID в .env, если у вас есть выделенный Product ID
  productId: import.meta.env.VITE_BIOSENSESIGNAL_PRODUCT_ID || '',

  // Длительность измерения в секундах (по умолчанию 45 секунд)
  defaultProcessingTime: 45,
}


// Конфигурация для BiosenseSignal SDK
// ВАЖНО: Замените на ваш реальный license key и productId
export const SDK_CONFIG = {
  // Получите license key от BiosenseSignal
  // Для тестирования можно использовать пустую строку, но SDK не будет работать
  licenseKey: import.meta.env.VITE_BIOSENSESIGNAL_LICENSE_KEY || '',
  
  // Product ID (обычно совпадает с License Key, но может отличаться)
  // Если не указан, будет использоваться licenseKey
  productId: import.meta.env.VITE_BIOSENSESIGNAL_PRODUCT_ID || import.meta.env.VITE_BIOSENSESIGNAL_LICENSE_KEY || '',
  
  // Длительность измерения в секундах (по умолчанию 45 секунд)
  defaultProcessingTime: 45,
}


import { hasTranscriptsInResponse } from './scanHistory.js'
import { getAuthUserIdFromStorage } from './storageUserScope.js'

const LEGACY_SCAN_ENVELOPE_KEY = 'x5_last_scan_envelope_v1'

function scanEnvelopeKeyForUser(userId) {
  if (!userId) return null
  return `x5_last_scan_envelope_v1_u_${userId}`
}

/**
 * Кеш только для текущего userId (из localStorage после login).
 * Без id пользователя кеш не читаем и не пишем — иначе после смены аккаунта видны чужие результаты.
 */
export function readCachedScanEnvelope() {
  try {
    const uid = getAuthUserIdFromStorage()
    const key = scanEnvelopeKeyForUser(uid)
    if (key) {
      const s = window.localStorage.getItem(key)
      if (s) {
        const o = JSON.parse(s)
        if (o && typeof o === 'object' && hasTranscriptsInResponse(o)) return o
      }
    }
    const legacy = window.localStorage.getItem(LEGACY_SCAN_ENVELOPE_KEY)
    if (legacy) {
      window.localStorage.removeItem(LEGACY_SCAN_ENVELOPE_KEY)
    }
    return null
  } catch {
    return null
  }
}

export function writeCachedScanEnvelope(envelope) {
  try {
    const uid = getAuthUserIdFromStorage()
    const key = scanEnvelopeKeyForUser(uid)
    if (!key) return
    if (envelope && typeof envelope === 'object' && hasTranscriptsInResponse(envelope)) {
      window.localStorage.setItem(key, JSON.stringify(envelope))
    }
    window.localStorage.removeItem(LEGACY_SCAN_ENVELOPE_KEY)
  } catch {
    // квота / приватный режим
  }
}

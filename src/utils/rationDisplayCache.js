import { getAuthUserIdFromStorage } from './storageUserScope.js'

const LEGACY_RATION_CACHE_KEY = 'x5_nutrition_ration_display_v1'
const MAX_CACHE_CHARS = 4_500_000

function rationCacheKeyForUser(userId) {
  if (!userId) return null
  return `x5_nutrition_ration_display_v1_u_${userId}`
}

export function readCachedRationDisplay() {
  try {
    const uid = getAuthUserIdFromStorage()
    const key = rationCacheKeyForUser(uid)
    if (key) {
      const s = window.localStorage.getItem(key)
      if (s) {
        const o = JSON.parse(s)
        if (!o || typeof o !== 'object') return null
        const rows = Array.isArray(o.rows) ? o.rows : []
        const rationId = o.rationId != null ? String(o.rationId) : null
        if (rows.length === 0) return null
        return { rows, rationId }
      }
    }
    const legacy = window.localStorage.getItem(LEGACY_RATION_CACHE_KEY)
    if (legacy) {
      window.localStorage.removeItem(LEGACY_RATION_CACHE_KEY)
    }
    return null
  } catch {
    return null
  }
}

export function writeCachedRationDisplay(rows, rationId) {
  try {
    const uid = getAuthUserIdFromStorage()
    const key = rationCacheKeyForUser(uid)
    if (!key) return
    if (!Array.isArray(rows) || rows.length === 0) return
    const payload = JSON.stringify({
      rows,
      rationId: rationId != null ? String(rationId) : null,
    })
    if (payload.length > MAX_CACHE_CHARS) return
    window.localStorage.setItem(key, payload)
    window.localStorage.removeItem(LEGACY_RATION_CACHE_KEY)
  } catch {
    // квота
  }
}

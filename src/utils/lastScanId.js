import { getAuthUserIdFromStorage } from './storageUserScope.js'

const LEGACY_LAST_SCAN_ID_KEY = 'x5_last_scan_id'

function lastScanIdKeyForUser(userId) {
  if (!userId) return null
  return `x5_last_scan_id_u_${userId}`
}

export function readLastScanId() {
  try {
    const uid = getAuthUserIdFromStorage()
    const key = lastScanIdKeyForUser(uid)
    if (key) {
      const s = window.localStorage.getItem(key)
      if (s != null && String(s).trim()) return String(s).trim()
    }
    const legacy = window.localStorage.getItem(LEGACY_LAST_SCAN_ID_KEY)
    if (legacy) {
      window.localStorage.removeItem(LEGACY_LAST_SCAN_ID_KEY)
    }
    return null
  } catch {
    return null
  }
}

export function writeLastScanId(id) {
  try {
    const uid = getAuthUserIdFromStorage()
    const key = lastScanIdKeyForUser(uid)
    if (!key) return
    if (id != null && String(id).trim()) {
      window.localStorage.setItem(key, String(id).trim())
    } else {
      window.localStorage.removeItem(key)
    }
    window.localStorage.removeItem(LEGACY_LAST_SCAN_ID_KEY)
  } catch {
    // ignore
  }
}

import { getAuthUserIdFromStorage } from './storageUserScope.js'

const LEGACY_KEY = 'lastRationId'

function storageKey() {
  const uid = getAuthUserIdFromStorage()
  return uid ? `x5_last_ration_id_u_${uid}` : null
}

export function readLastRationIdFromStorage() {
  try {
    const key = storageKey()
    if (key) {
      const s = window.localStorage.getItem(key)
      if (s != null && String(s).trim()) return String(s).trim()
    }
    if (window.localStorage.getItem(LEGACY_KEY)) {
      window.localStorage.removeItem(LEGACY_KEY)
    }
    return null
  } catch {
    return null
  }
}

export function writeLastRationIdToStorage(id) {
  try {
    const key = storageKey()
    if (!key) return
    if (id != null && String(id).trim()) {
      window.localStorage.setItem(key, String(id).trim())
    } else {
      window.localStorage.removeItem(key)
    }
    window.localStorage.removeItem(LEGACY_KEY)
  } catch {
    // ignore
  }
}

const LAST_SCAN_ID_KEY = 'x5_last_scan_id'

export function readLastScanId() {
  try {
    const s = window.localStorage.getItem(LAST_SCAN_ID_KEY)
    return s != null && String(s).trim() ? String(s).trim() : null
  } catch {
    return null
  }
}

export function writeLastScanId(id) {
  try {
    if (id != null && String(id).trim()) {
      window.localStorage.setItem(LAST_SCAN_ID_KEY, String(id).trim())
    } else {
      window.localStorage.removeItem(LAST_SCAN_ID_KEY)
    }
  } catch {
    // ignore
  }
}

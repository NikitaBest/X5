/** Маркер: после аллергий вызван regenerate, на /nutrition нужен такой же опрос статуса, как у «Подобрать другой рацион». */
const KEY = 'x5_ration_regen_poll_scan_id'

export function setRationRegenPollPending(scanId) {
  if (scanId == null || String(scanId).trim() === '') return
  try {
    window.sessionStorage.setItem(KEY, String(scanId).trim())
  } catch {
    // игнор
  }
}

/** Однократно: если маркер совпал со scanId, удаляет ключ и возвращает true (атомарно между вкладками не гарантируется). */
export function takeRationRegenPollPendingForScan(scanId) {
  if (scanId == null || String(scanId).trim() === '') return false
  try {
    const want = String(scanId).trim()
    const s = window.sessionStorage.getItem(KEY)
    if (s == null || String(s) !== want) return false
    window.sessionStorage.removeItem(KEY)
    return true
  } catch {
    return false
  }
}

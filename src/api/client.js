const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

/**
 * POST /auth/login — авторизация, возвращает JWT для дальнейшей работы с API.
 * @param {{ id: string|null, utm: string|null }} body - для первого входа передать { id: null, utm: null }
 * @returns {Promise<{ token: string, [key: string]: unknown }>}
 */
export async function postAuthLogin(body = { id: null, utm: null }) {
  const url = `${BASE_URL.replace(/\/$/, '')}/auth/login`
  if (import.meta.env.DEV) {
    console.log('[auth] POST', url, body)
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`auth/login failed: ${res.status} ${errText}`)
  }
  const data = await res.json()
  return data
}

/**
 * Достаёт JWT из ответа /auth/login (поле может называться token, accessToken, access_token).
 */
export function getTokenFromLoginResponse(data) {
  return data?.token ?? data?.accessToken ?? data?.access_token ?? null
}

/**
 * PUT /user/update — обновление профиля пользователя.
 * @param {string} token - JWT из auth/login
 * @param {{ age: number, height: number, weight: number, gender: number, smokeStatus: number, goals: string[] }} body
 */
export async function putUserUpdate(token, body) {
  const url = `${BASE_URL.replace(/\/$/, '')}/user/update`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`user/update failed: ${res.status} ${errText}`)
  }
  const data = await res.json().catch(() => ({}))
  return data
}

/**
 * GET /exclude-products/get — список продуктов-исключений.
 * @param {string} token - JWT из auth/login
 * @param {{ search?: string, pageNumber?: number, pageSize?: number }} params
 */
export async function getExcludeProducts(token, params = {}) {
  const {
    search = '',
    pageNumber = 1,
    pageSize = 100,
  } = params

  const url = new URL(`${BASE_URL.replace(/\/$/, '')}/exclude-products/get`)
  if (search?.trim()) url.searchParams.set('search', search.trim())
  url.searchParams.set('pageNumber', String(pageNumber))
  url.searchParams.set('pageSize', String(pageSize))

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`exclude-products failed: ${res.status} ${errText}`)
  }

  const data = await res.json().catch(() => ({}))
  return data
}

/**
 * POST /exclude-products/save-for-user — сохранить исключения пользователя.
 * @param {string} token - JWT из auth/login
 * @param {string[]} products - список исключений
 */
export async function postExcludeProducts(token, products = []) {
  const url = `${BASE_URL.replace(/\/$/, '')}/exclude-products/save-for-user`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      products: Array.isArray(products) ? products : [],
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`exclude-products create failed: ${res.status} ${errText}`)
  }

  const data = await res.json().catch(() => ({}))
  return data
}

/**
 * GET /exclude-products/get-for-user — получить сохранённые исключения пользователя.
 * @param {string} token - JWT из auth/login
 */
export async function getExcludeProductsForUser(token) {
  const url = `${BASE_URL.replace(/\/$/, '')}/exclude-products/get-for-user`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`exclude-products get-for-user failed: ${res.status} ${errText}`)
  }

  const data = await res.json().catch(() => ({}))
  return data
}

/**
 * POST /scan/save-rppg — сохранить результат сканирования rPPG.
 * @param {string} token - JWT из auth/login
 * @param {object} scanResult - объект результата сканирования
 */
export async function postScanSaveRppg(token, scanResult) {
  const url = `${BASE_URL.replace(/\/$/, '')}/scan/save-rppg`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      scanResult: scanResult ?? {},
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`scan/save-rppg failed: ${res.status} ${errText}`)
  }

  const data = await res.json().catch(() => ({}))
  return data
}

/**
 * GET /scan/get — получить историю сканов пользователя.
 * Для последнего скана передайте pageNumber=1, pageSize=1.
 * @param {string} token - JWT из auth/login
 * @param {{ pageNumber?: number, pageSize?: number }} params
 */
export async function getScanHistory(token, params = {}) {
  const { pageNumber = 1, pageSize = 1 } = params
  const url = new URL(`${BASE_URL.replace(/\/$/, '')}/scan/get`)
  url.searchParams.set('pageNumber', String(pageNumber))
  url.searchParams.set('pageSize', String(pageSize))

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`scan/get failed: ${res.status} ${errText}`)
  }

  const data = await res.json().catch(() => ({}))
  return data
}

/**
 * Достаёт идентификатор скана из ответа save-rppg / scan/get (разные формы value).
 * @param {unknown} envelope
 * @returns {string|null}
 */
export function extractScanIdFromEnvelope(envelope) {
  if (envelope == null || typeof envelope !== 'object') return null
  const v = envelope.value != null && typeof envelope.value === 'object' ? envelope.value : envelope
  const scan = v.scan != null && typeof v.scan === 'object' ? v.scan : null
  const candidates = [
    scan?.id,
    scan?.scanId,
    scan?.scanID,
    v.scanId,
    v.scanID,
    v.scan_id,
    v.id,
    envelope.scanId,
    envelope.id,
  ]
  for (const c of candidates) {
    if (c != null && String(c).trim() !== '') return String(c).trim()
  }
  return null
}

/**
 * GET /ration/scan/{scanId} — запросить подбор рациона по скану.
 * @param {string} token
 * @param {string} scanId
 */
export async function getRationByScan(token, scanId) {
  const id = encodeURIComponent(String(scanId))
  const url = `${BASE_URL.replace(/\/$/, '')}/ration/scan/${id}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`ration/scan failed: ${res.status} ${errText}`)
  }
  return res.json().catch(() => ({}))
}

/**
 * GET /ration/scan/{scanId}/generation-status — статус генерации рациона.
 * @param {string} token
 * @param {string} scanId
 */
export async function getRationGenerationStatus(token, scanId) {
  const id = encodeURIComponent(String(scanId))
  const url = `${BASE_URL.replace(/\/$/, '')}/ration/scan/${id}/generation-status`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`ration generation-status failed: ${res.status} ${errText}`)
  }
  return res.json().catch(() => ({}))
}

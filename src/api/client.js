const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const IN_FLIGHT_REQUESTS = new Map()

function withInFlightDedupe(key, factory) {
  const k = String(key)
  if (IN_FLIGHT_REQUESTS.has(k)) return IN_FLIGHT_REQUESTS.get(k)
  const p = Promise.resolve()
    .then(factory)
    .finally(() => {
      IN_FLIGHT_REQUESTS.delete(k)
    })
  IN_FLIGHT_REQUESTS.set(k, p)
  return p
}

/**
 * POST /auth/login — авторизация, возвращает JWT для дальнейшей работы с API.
 * @param {{ id: string|null, utm: string|null }} body - для первого входа передать { id: null, utm: null }
 * @returns {Promise<{ token: string, [key: string]: unknown }>}
 */
export async function postAuthLogin(body = { id: null, utm: null }) {
  const url = `${BASE_URL.replace(/\/$/, '')}/auth/login`
  const reqBody = body ?? { id: null, utm: null }
  return withInFlightDedupe(`POST:${url}:${JSON.stringify(reqBody)}`, async () => {
    if (import.meta.env.DEV) {
      console.log('[auth] POST', url, reqBody)
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reqBody),
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`auth/login failed: ${res.status} ${errText}`)
    }
    return res.json()
  })
}

/**
 * GET /user/me — получить данные текущего пользователя (профиль, исключения и т.п.).
 * @param {string|null} token
 */
export async function getUserMe(token) {
  const url = `${BASE_URL.replace(/\/$/, '')}/user/me`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`user/me failed: ${res.status} ${errText}`)
  }
  return res.json().catch(() => ({}))
}

/**
 * POST /app/stat-event — сохранить событие статистики.
 * @param {string | null | undefined} token
 * @param {{ type: string, data: string, durationSeconds: number }} body
 */
export async function postAppStatEvent(token, body) {
  const url = `${BASE_URL.replace(/\/$/, '')}/app/stat-event`
  const payload = {
    type: String(body?.type ?? '').trim(),
    data: String(body?.data ?? '').trim(),
    durationSeconds: Number.isFinite(Number(body?.durationSeconds))
      ? Math.max(0, Math.round(Number(body.durationSeconds)))
      : 0,
  }
  if (!payload.type) return null
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`app/stat-event failed: ${res.status} ${errText}`)
  }
  return res.json().catch(() => ({}))
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
 * Достаёт идентификатор скана из ответа save-rppg, сырого GET /scan/get (value.data[0]) или нормализованного конверта.
 * @param {unknown} envelope
 * @returns {string|null}
 */
export function extractScanIdFromEnvelope(envelope) {
  if (envelope == null || typeof envelope !== 'object') return null

  const tryBlock = (block) => {
    if (block == null || typeof block !== 'object') return null
    const scan = block.scan != null && typeof block.scan === 'object' ? block.scan : null
    const candidates = [
      scan?.id,
      scan?.scanId,
      scan?.scanID,
      block.scanId,
      block.scanID,
      block.scan_id,
      block.id,
    ]
    for (const c of candidates) {
      if (c != null && String(c).trim() !== '') return String(c).trim()
    }
    return null
  }

  const v = envelope.value != null && typeof envelope.value === 'object' ? envelope.value : envelope
  const fromFlat = tryBlock(v)
  if (fromFlat) return fromFlat

  const firstRow = Array.isArray(v.data) && v.data.length > 0 && typeof v.data[0] === 'object' ? v.data[0] : null
  const fromList = tryBlock(firstRow)
  if (fromList) return fromList

  for (const c of [envelope.scanId, envelope.id]) {
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
 * POST /ration/scan/regenerate — запустить перегенерацию рациона по scanId.
 * @param {string} token
 * @param {string} scanId
 */
export async function postRationRegenerate(token, scanId) {
  const url = `${BASE_URL.replace(/\/$/, '')}/ration/scan/regenerate`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ scanId: String(scanId) }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`ration/scan/regenerate failed: ${res.status} ${errText}`)
  }
  return res.json().catch(() => ({}))
}

/**
 * POST /ration/item/replace — заменить товар в позиции рациона.
 * @param {string} token
 * @param {{ id: string, productId: number, weigth: number }} body
 */
export async function postRationItemReplace(token, body) {
  const url = `${BASE_URL.replace(/\/$/, '')}/ration/item/replace`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`ration/item/replace failed: ${res.status} ${errText}`)
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

/**
 * GET /ration/{rationId} — получить рацион по идентификатору.
 * @param {string | null | undefined} token
 * @param {string} rationId
 */
export async function getRationById(token, rationId) {
  const id = encodeURIComponent(String(rationId))
  const url = `${BASE_URL.replace(/\/$/, '')}/ration/${id}`
  return withInFlightDedupe(`GET:${url}:auth:${token ? '1' : '0'}`, async () => {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`ration/{id} failed: ${res.status} ${errText}`)
    }
    return res.json().catch(() => ({}))
  })
}

/**
 * GET /ration/{rationId}/owner — получить владельца рациона, профиль и исключения.
 * Публичный метод, token необязателен.
 * @param {string | null | undefined} token
 * @param {string} rationId
 */
export async function getRationOwnerById(token, rationId) {
  const id = encodeURIComponent(String(rationId))
  const url = `${BASE_URL.replace(/\/$/, '')}/ration/${id}/owner`
  return withInFlightDedupe(`GET:${url}:auth:${token ? '1' : '0'}`, async () => {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`ration/{id}/owner failed: ${res.status} ${errText}`)
    }
    return res.json().catch(() => ({}))
  })
}

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

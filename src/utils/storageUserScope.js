/** Совпадает с AuthContext — id пользователя после /auth/login */
export const AUTH_USER_ID_STORAGE_KEY = 'x5_user_id'

export function getAuthUserIdFromStorage() {
  try {
    const u = window.localStorage.getItem(AUTH_USER_ID_STORAGE_KEY)
    return u != null && String(u).trim() ? String(u).trim() : null
  } catch {
    return null
  }
}

import { createContext, useContext, useState, useCallback } from 'react'
import { postAuthLogin, getTokenFromLoginResponse } from '../api/client.js'
import { AUTH_USER_ID_STORAGE_KEY } from '../utils/storageUserScope.js'

const TOKEN_STORAGE_KEY = 'x5_auth_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY)
    } catch {
      return null
    }
  })

  const [userId, setUserIdState] = useState(() => {
    try {
      return localStorage.getItem(AUTH_USER_ID_STORAGE_KEY)
    } catch {
      return null
    }
  })

  const setToken = useCallback((value) => {
    setTokenState(value)
    try {
      if (value) localStorage.setItem(TOKEN_STORAGE_KEY, value)
      else localStorage.removeItem(TOKEN_STORAGE_KEY)
    } catch {}
  }, [])

  const setUserId = useCallback((value) => {
    setUserIdState(value)
    try {
      if (value) localStorage.setItem(AUTH_USER_ID_STORAGE_KEY, value)
      else localStorage.removeItem(AUTH_USER_ID_STORAGE_KEY)
    } catch {}
  }, [])

  const login = useCallback(
    async (body) => {
      const finalBody = body ?? { id: userId ?? null, utm: null }
      const data = await postAuthLogin(finalBody)
      const jwt = getTokenFromLoginResponse(data)
      if (jwt) setToken(jwt)

      const returnedUserId = data?.user?.id
      if (returnedUserId) setUserId(returnedUserId)

      return data
    },
    [setToken, setUserId, userId],
  )

  return (
    <AuthContext.Provider value={{ token, userId, setToken, setUserId, login }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

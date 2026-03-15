import { createContext, useContext, useState, useCallback } from 'react'
import { postAuthLogin, getTokenFromLoginResponse } from '../api/client.js'

const STORAGE_KEY = 'x5_auth_token'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })

  const setToken = useCallback((value) => {
    setTokenState(value)
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value)
      else localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }, [])

  const login = useCallback(async (body = { id: null, utm: null }) => {
    const data = await postAuthLogin(body)
    const jwt = getTokenFromLoginResponse(data)
    if (jwt) setToken(jwt)
    return data
  }, [setToken])

  return (
    <AuthContext.Provider value={{ token, setToken, login }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { UserDataProvider, useUserData } from './contexts/UserDataContext.jsx'
import { postAppStatEvent } from './api/client.js'
import MobileAppShell from './layout/MobileAppShell.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import Welcome from './pages/Welcome.jsx'
import PrioritySelection from './pages/PrioritySelection.jsx'
import AlgorithmSettings from './pages/AlgorithmSettings.jsx'
import Allergies from './pages/Allergies.jsx'
import Preparation from './pages/Preparation.jsx'
import Camera from './pages/Camera.jsx'
import Results from './pages/Results.jsx'
import NutritionPlan from './pages/NutritionPlan.jsx'
import NutritionReportPage from './pages/NutritionReportPage.jsx'
import Cart from './pages/Cart.jsx'
import Survey from './pages/Survey.jsx'
import './App.css'

function App() {
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  if (isInitialLoad) {
    return <LoadingScreen text="Загрузка..." onComplete={() => setIsInitialLoad(false)} />
  }

  return (
    <AuthProvider>
      <UserDataProvider>
        <AuthInit />
        <BrowserRouter>
        <StatEventTracker />
        <Routes>
          <Route element={<MobileAppShell />}>
            <Route path="/" element={<Welcome />} />
            <Route path="/recent-activity" element={<Navigate to="/algorithm-settings" replace />} />
            <Route path="/priority" element={<PrioritySelection />} />
            <Route path="/algorithm-settings" element={<AlgorithmSettings />} />
            <Route path="/allergies" element={<Allergies />} />
            <Route path="/preparation" element={<Preparation />} />
            <Route path="/camera" element={<Camera />} />
            <Route path="/results" element={<Results />} />
            <Route path="/nutrition" element={<NutritionPlan />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/survey" element={<Survey />} />
            <Route path="/nutrition-report" element={<NutritionReportPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserDataProvider>
    </AuthProvider>
  )
}

function AuthInit() {
  const { token, userId, login } = useAuth()
  const { updateUserData } = useUserData()
  const loginSentRef = useRef(false)
  useEffect(() => {
    if (loginSentRef.current) return
    loginSentRef.current = true
    if (import.meta.env.DEV) {
      console.log('[auth] Отправляем POST /auth/login (один раз)', {
        hasToken: !!token,
        userId,
      })
    }
    login({ id: userId ?? null, utm: null })
      .then((data) => {
        const profile = data?.user?.profile
        if (profile) {
          const mapped = {
            gender: profile.gender === 0 ? 'MALE' : profile.gender === 1 ? 'FEMALE' : null,
            age: profile.age ?? null,
            height: profile.height ?? null,
            weight: profile.weight ?? null,
            smokingStatus: profile.smokeStatus === 1 ? 'SMOKER' : profile.smokeStatus === 0 ? 'NON_SMOKER' : null,
            goals: Array.isArray(profile.goals) ? profile.goals : [],
          }
          updateUserData(mapped)
        }
      })
      .catch((err) => {
        loginSentRef.current = false
        console.warn('Auth login failed', err)
      })
  }, [token, userId, login, updateUserData])
  return null
}

function normalizePathToType(pathname) {
  const normalized = String(pathname || '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase()
  return normalized || 'home'
}

function buildActionLabel(target) {
  if (!target) return ''
  const aria = target.getAttribute?.('aria-label')
  if (aria && aria.trim()) return aria.trim()
  const dataTrack = target.getAttribute?.('data-track')
  if (dataTrack && dataTrack.trim()) return dataTrack.trim()
  const text = target.textContent
  if (text && text.trim()) return text.trim().slice(0, 80)
  const id = target.id
  if (id && id.trim()) return `#${id.trim()}`
  return target.tagName?.toLowerCase?.() || 'action'
}

function StatEventTracker() {
  const location = useLocation()
  const { token } = useAuth()
  const pageEnterAtRef = useRef(Date.now())
  const lastPathRef = useRef(location.pathname)
  const isFirstPathEffectRef = useRef(true)

  useEffect(() => {
    const prevPath = lastPathRef.current
    const now = Date.now()
    if (!isFirstPathEffectRef.current && prevPath) {
      const duration = Math.max(0, Math.round((now - pageEnterAtRef.current) / 1000))
      const type = `cjm_screen_${normalizePathToType(prevPath)}`
      const data = `Пользователь был на экране ${prevPath} ${duration} сек`
      void postAppStatEvent(token, { type, data, durationSeconds: duration }).catch(() => {})
    }
    isFirstPathEffectRef.current = false
    lastPathRef.current = location.pathname
    pageEnterAtRef.current = now
  }, [location.pathname, token])

  useEffect(() => {
    const handleClick = (event) => {
      const element = event.target instanceof Element ? event.target : null
      if (!element) return
      const actionable = element.closest('button, a, [role="button"], input[type="submit"]')
      if (!actionable) return
      const type = `cjm_action_${normalizePathToType(location.pathname)}`
      const label = buildActionLabel(actionable)
      const data = `Действие на экране ${location.pathname}: ${label}`
      void postAppStatEvent(token, { type, data, durationSeconds: 0 }).catch(() => {})
    }
    document.addEventListener('click', handleClick, true)
    return () => {
      document.removeEventListener('click', handleClick, true)
    }
  }, [location.pathname, token])

  useEffect(() => {
    return () => {
      const duration = Math.max(0, Math.round((Date.now() - pageEnterAtRef.current) / 1000))
      const currentPath = lastPathRef.current
      if (!currentPath) return
      const type = `cjm_screen_${normalizePathToType(currentPath)}`
      const data = `Пользователь покинул экран ${currentPath} через ${duration} сек`
      void postAppStatEvent(token, { type, data, durationSeconds: duration }).catch(() => {})
    }
  }, [token])

  return null
}

export default App

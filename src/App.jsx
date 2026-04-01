import { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth, AUTH_TOKEN_STORAGE_KEY } from './contexts/AuthContext.jsx'
import { UserDataProvider, useUserData } from './contexts/UserDataContext.jsx'
import { postAppStatEvent } from './api/client.js'
import MobileAppShell from './layout/MobileAppShell.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import HomeRoute from './pages/HomeRoute.jsx'
import { canAccessHealthScreens, profileResponseHasBasics } from './utils/userProfileGate.js'
import './App.css'

const Welcome = lazy(() => import('./pages/Welcome.jsx'))
const PrioritySelection = lazy(() => import('./pages/PrioritySelection.jsx'))
const AlgorithmSettings = lazy(() => import('./pages/AlgorithmSettings.jsx'))
const Allergies = lazy(() => import('./pages/Allergies.jsx'))
const Preparation = lazy(() => import('./pages/Preparation.jsx'))
const Camera = lazy(() => import('./pages/Camera.jsx'))
const Results = lazy(() => import('./pages/Results.jsx'))
const NutritionPlan = lazy(() => import('./pages/NutritionPlan.jsx'))
const NutritionReportPage = lazy(() => import('./pages/NutritionReportPage.jsx'))
const Cart = lazy(() => import('./pages/Cart.jsx'))
const Survey = lazy(() => import('./pages/Survey.jsx'))
const LAST_VISITED_PATH_KEY = 'x5_last_visited_path'
const LAST_NON_CAMERA_PATH_KEY = 'x5_last_non_camera_path'
const RESUME_ALLOWED_PATHS = new Set([
  '/welcome',
  '/priority',
  '/algorithm-settings',
  '/allergies',
  '/preparation',
  '/results',
  '/nutrition',
  '/cart',
  '/survey',
  '/nutrition-report',
])

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
        <LastVisitedPathTracker />
        <InitialDeepLinkResumeGuard />
        <PersistedTokenDeepLinkGuard />
        <HealthScreensOnboardingGuard />
        <StatEventTracker />
        <Suspense fallback={<LoadingScreen text="Загрузка экрана..." />}>
          <Routes>
            <Route element={<MobileAppShell />}>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/welcome" element={<Welcome />} />
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
        </Suspense>
      </BrowserRouter>
    </UserDataProvider>
    </AuthProvider>
  )
}

const PATHS_NEED_PERSISTED_TOKEN = ['/results', '/nutrition', '/cart', '/nutrition-report']

/**
 * Если в localStorage нет сохранённого JWT, не остаёмся на «глубоких» URL после обновления
 * (пользователь очистил Application → ожидает вход с корня, а не экран результатов).
 * Авторизация всё равно выполнится на /, но без «призрачного» /results до редиректа HomeRoute.
 */
function PersistedTokenDeepLinkGuard() {
  const location = useLocation()
  const navigate = useNavigate()

  useLayoutEffect(() => {
    const path = location.pathname
    const needsToken = PATHS_NEED_PERSISTED_TOKEN.some((p) => path === p || path.startsWith(`${p}/`))
    if (!needsToken) return
    try {
      const t = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
      if (t != null && String(t).trim()) return
    } catch {
      // treat as no token
    }
    navigate('/', { replace: true })
  }, [location.pathname, location.key, navigate])

  return null
}

/**
 * Пустой профиль с бэка и нет локального онбординга (Welcome) — не держим на результатах/рационе/корзине.
 */
function HealthScreensOnboardingGuard() {
  const location = useLocation()
  const navigate = useNavigate()
  const { token, hasServerProfileBasics, initialAuthFinished } = useAuth()
  const { userData } = useUserData()

  const allowed = canAccessHealthScreens(hasServerProfileBasics, userData)

  useLayoutEffect(() => {
    if (!initialAuthFinished || !token) return
    const path = location.pathname
    const gated = PATHS_NEED_PERSISTED_TOKEN.some((p) => path === p || path.startsWith(`${p}/`))
    if (!gated) return
    if (allowed) return
    navigate('/', { replace: true })
  }, [initialAuthFinished, token, allowed, location.pathname, location.key, navigate])

  return null
}

function AuthInit() {
  const { token, userId, setUserId, login, setHasServerProfileBasics, setInitialAuthFinished } = useAuth()
  const { updateUserData } = useUserData()
  const loginSentRef = useRef(false)
  useEffect(() => {
    if (loginSentRef.current) return
    loginSentRef.current = true
    let deepLinkId = null
    let deepLinkUtm = null
    try {
      const params = new URLSearchParams(window.location.search || '')
      const rawId = String(params.get('id') || '').trim()
      const rawUtm = String(params.get('utm') || '').trim()
      deepLinkId = rawId || null
      deepLinkUtm = rawUtm || null
    } catch {
      deepLinkId = null
      deepLinkUtm = null
    }
    const loginBody = {
      id: deepLinkId ?? userId ?? null,
      utm: deepLinkUtm,
    }
    if (import.meta.env.DEV) {
      console.log('[auth] Отправляем POST /auth/login (один раз)', {
        hasToken: !!token,
        userId,
        deepLinkId,
        deepLinkUtm,
      })
    }
    if (deepLinkId) setUserId(deepLinkId)
    login(loginBody)
      .then((data) => {
        setHasServerProfileBasics(profileResponseHasBasics(data?.user?.profile))
        const profile = data?.user?.profile
        if (profile) {
          const mapped = {
            gender: profile.gender === 0 ? 'MALE' : profile.gender === 1 ? 'FEMALE' : null,
            age: profile.age ?? null,
            height: profile.height ?? null,
            weight: profile.weight ?? null,
            smokingStatus: profile.smokeStatus === 1 ? 'SMOKER' : profile.smokeStatus === 0 ? 'NON_SMOKER' : null,
          }
          if (Array.isArray(profile.goals) && profile.goals.length > 0) {
            mapped.goals = profile.goals
          }
          updateUserData(mapped)
        }
      })
      .catch((err) => {
        loginSentRef.current = false
        console.warn('Auth login failed', err)
      })
      .finally(() => {
        setInitialAuthFinished(true)
      })
  }, [token, userId, setUserId, login, updateUserData, setHasServerProfileBasics, setInitialAuthFinished])
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

function LastVisitedPathTracker() {
  const location = useLocation()

  useEffect(() => {
    const path = String(location.pathname || '/')
    try {
      localStorage.setItem(LAST_VISITED_PATH_KEY, path)
      if (path !== '/camera') {
        localStorage.setItem(LAST_NON_CAMERA_PATH_KEY, path)
      }
    } catch {
      // ignore
    }
  }, [location.pathname])

  return null
}

function InitialDeepLinkResumeGuard() {
  const location = useLocation()
  const navigate = useNavigate()
  const { token, hasServerProfileBasics, initialAuthFinished } = useAuth()
  const { userData } = useUserData()
  const checkedRef = useRef(false)
  const hasOnboardingData = canAccessHealthScreens(hasServerProfileBasics, userData)

  useLayoutEffect(() => {
    if (checkedRef.current) return
    if (!initialAuthFinished) return
    checkedRef.current = true

    const path = location.pathname
    const guardedPaths = ['/algorithm-settings', '/allergies', '/preparation', '/camera']
    if (!guardedPaths.includes(path)) return

    let lastNonCameraPath = ''
    try {
      lastNonCameraPath = String(localStorage.getItem(LAST_NON_CAMERA_PATH_KEY) || '').trim()
    } catch {
      // ignore
    }

    if (!token || !hasOnboardingData) {
      navigate('/welcome', { replace: true })
      return
    }

    if (lastNonCameraPath && lastNonCameraPath !== path && RESUME_ALLOWED_PATHS.has(lastNonCameraPath)) {
      navigate(lastNonCameraPath, { replace: true })
    }
  }, [hasOnboardingData, initialAuthFinished, location.pathname, navigate, token])

  return null
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

import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { UserDataProvider } from './contexts/UserDataContext.jsx'
import MobileAppShell from './layout/MobileAppShell.jsx'
import LoadingScreen from './components/LoadingScreen.jsx'
import Welcome from './pages/Welcome.jsx'
import RecentActivity from './pages/RecentActivity.jsx'
import PrioritySelection from './pages/PrioritySelection.jsx'
import AlgorithmSettings from './pages/AlgorithmSettings.jsx'
import Allergies from './pages/Allergies.jsx'
import Preparation from './pages/Preparation.jsx'
import Camera from './pages/Camera.jsx'
import Results from './pages/Results.jsx'
import NutritionPlan from './pages/NutritionPlan.jsx'
import Cart from './pages/Cart.jsx'
import './App.css'

function App() {
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  if (isInitialLoad) {
    return <LoadingScreen text="Загрузка..." onComplete={() => setIsInitialLoad(false)} />
  }

  return (
    <AuthProvider>
      <AuthInit />
      <UserDataProvider>
        <BrowserRouter>
        <Routes>
          <Route element={<MobileAppShell />}>
            <Route path="/" element={<Welcome />} />
            <Route path="/recent-activity" element={<RecentActivity />} />
            <Route path="/priority" element={<PrioritySelection />} />
            <Route path="/algorithm-settings" element={<AlgorithmSettings />} />
            <Route path="/allergies" element={<Allergies />} />
            <Route path="/preparation" element={<Preparation />} />
            <Route path="/camera" element={<Camera />} />
            <Route path="/results" element={<Results />} />
            <Route path="/nutrition" element={<NutritionPlan />} />
            <Route path="/cart" element={<Cart />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserDataProvider>
    </AuthProvider>
  )
}

function AuthInit() {
  const { token, userId, login } = useAuth()
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
    login({ id: userId ?? null, utm: null }).catch((err) => {
      loginSentRef.current = false
      console.warn('Auth login failed', err)
    })
  }, [token, userId, login])
  return null
}

export default App

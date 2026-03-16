import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { UserDataProvider, useUserData } from './contexts/UserDataContext.jsx'
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
      <UserDataProvider>
        <AuthInit />
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

export default App

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { UserDataProvider } from './contexts/UserDataContext.jsx'
import MobileAppShell from './layout/MobileAppShell.jsx'
import Welcome from './pages/Welcome.jsx'
import RecentActivity from './pages/RecentActivity.jsx'
import PrioritySelection from './pages/PrioritySelection.jsx'
// import AlgorithmSettings from './pages/AlgorithmSettings.jsx'
import Preparation from './pages/Preparation.jsx'
import Camera from './pages/Camera.jsx'
import './App.css'

function App() {
  return (
    <UserDataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<MobileAppShell />}>
            <Route path="/" element={<Welcome />} />
            <Route path="/recent-activity" element={<RecentActivity />} />
            <Route path="/priority" element={<PrioritySelection />} />
            {/* <Route path="/algorithm-settings" element={<AlgorithmSettings />} /> */}
            <Route path="/preparation" element={<Preparation />} />
            <Route path="/camera" element={<Camera />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserDataProvider>
  )
}

export default App

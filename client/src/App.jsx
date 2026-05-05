import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { track } from './analytics.js'
import AppLayout from './components/AppLayout.jsx'
import WelcomeScreen from './screens/WelcomeScreen.jsx'
import GameScreen from './screens/GameScreen.jsx'
import ProgressScreen from './screens/ProgressScreen.jsx'
import ParentScreen from './screens/ParentScreen.jsx'

export default function App() {
  const location = useLocation()

  useEffect(() => {
    const screenByPath = {
      '/': 'landing',
      '/play': 'game',
      '/progress': 'progress',
      '/parent': 'parent',
    }
    track('screen_view', { screen: screenByPath[location.pathname] ?? 'unknown' })
  }, [location.pathname])

  return (
    <Routes>
      <Route path="/" element={<WelcomeScreen />} />
      <Route path="/parent" element={<ParentScreen />} />
      <Route
        path="/play"
        element={
          <AppLayout>
            <GameScreen />
          </AppLayout>
        }
      />
      <Route
        path="/progress"
        element={
          <AppLayout>
            <ProgressScreen />
          </AppLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

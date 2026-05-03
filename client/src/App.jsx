import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/AppLayout.jsx'
import WelcomeScreen from './screens/WelcomeScreen.jsx'
import GameScreen from './screens/GameScreen.jsx'
import ProgressScreen from './screens/ProgressScreen.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WelcomeScreen />} />
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

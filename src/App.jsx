import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Chat from './pages/Chat'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'

import { AuthProvider } from './contexts/AuthContext'

import Signup from './pages/Signup'
import GameDetail from './pages/GameDetail'
import DailyPicks from './pages/DailyPicks'
import TopGames from './pages/TopGames'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Chat />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/game/:id" element={<GameDetail />} />
          <Route path="/picks" element={<DailyPicks />} />
          <Route path="/top-games" element={<TopGames />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App

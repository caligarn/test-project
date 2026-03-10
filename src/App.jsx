import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import Home from './pages/Home'
import GameDetail from './pages/GameDetail'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Settings from './pages/Settings'
import Subscribe from './pages/Subscribe'
import PlayGame from './pages/PlayGame'
import VotePage from './pages/VotePage'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="flex-1 pb-20 md:pb-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game/:gameId" element={<GameDetail />} />
            <Route path="/play/:gameId" element={<PlayGame />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/subscribe" element={<Subscribe />} />
            <Route path="/vote/:code" element={<VotePage />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </AuthProvider>
  )
}

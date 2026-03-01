import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Gamepad2, Crown, Settings, LogIn } from 'lucide-react'

export default function Header() {
  const { user } = useAuth()

  return (
    <header className="glass sticky top-0 z-50 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold gradient-text hidden sm:block">
            AI Arcade
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/"
            className="text-sm text-gray-400 hover:text-white transition-colors no-underline"
          >
            Games
          </Link>
          <Link
            to="/leaderboard"
            className="text-sm text-gray-400 hover:text-white transition-colors no-underline"
          >
            Leaderboard
          </Link>
          <Link
            to="/subscribe"
            className="text-sm text-gray-400 hover:text-white transition-colors no-underline flex items-center gap-1"
          >
            <Crown className="w-3.5 h-3.5 text-warning" />
            Pro
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to="/profile"
              className="flex items-center gap-2 no-underline"
            >
              <span className="text-xl">{user.avatar}</span>
              <span className="text-sm font-medium text-gray-300 hidden sm:block">
                {user.username}
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-dark transition-colors text-white text-sm font-medium no-underline"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

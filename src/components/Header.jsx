import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCredits } from '../context/CreditContext'
import { Gamepad2, Coins, LogIn } from 'lucide-react'

const NAV_LINK = 'text-sm font-bold text-white/80 hover:text-white transition-colors no-underline uppercase tracking-wide'

export default function Header() {
  const { user, loading } = useAuth()
  const { credits } = useCredits()

  return (
    <header className="sticky top-0 z-50 bg-navy border-b-4 border-highlight">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <div className="w-9 h-9 border-2 border-white bg-primary flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-black text-white uppercase tracking-tight hidden sm:block">
            Gen Arcade
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className={NAV_LINK}>Games</Link>
          <Link to="/play/daily" className={NAV_LINK}>Daily</Link>
          <Link to="/leaderboard" className={NAV_LINK}>Leaderboard</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/subscribe"
            title="Your credits"
            aria-label={credits ? `${credits.total} credits` : 'Credits'}
            className="flex items-center gap-1 px-2 py-1 border-2 border-highlight text-highlight text-xs font-black no-underline hover:bg-highlight hover:text-navy transition-colors"
          >
            <Coins className="w-3.5 h-3.5" />
            {credits ? credits.total : '-'}
          </Link>
          {loading ? (
            <span className="w-8 h-8" aria-hidden="true" />
          ) : user ? (
            <Link
              to="/profile"
              className="flex items-center gap-2 no-underline"
            >
              <span className="text-xl">{user.avatar}</span>
              <span className="text-sm font-bold text-white hidden sm:block">
                {user.username}
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-primary border-2 border-highlight text-white text-sm font-black uppercase tracking-wide no-underline hover:bg-primary-dark transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Join Us!
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

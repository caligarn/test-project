import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getScores } from '../lib/storage'
import {
  Settings,
  LogOut,
  Trophy,
  Gamepad2,
  Star,
  TrendingUp,
  Calendar,
} from 'lucide-react'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) {
    return (
      <div className="max-w-sm mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">👤</p>
        <p className="text-white font-bold text-lg mb-2">Not Signed In</p>
        <p className="text-gray-400 text-sm mb-6">
          Sign in to view your profile, track scores, and compete on
          leaderboards.
        </p>
        <Link
          to="/login"
          className="inline-block px-6 py-3 rounded-xl bg-primary text-white font-medium text-sm no-underline"
        >
          Sign In
        </Link>
      </div>
    )
  }

  const allScores = getScores().filter((s) => s.username === user.username)
  const recentGames = allScores.slice(-5).reverse()
  const joinDate = new Date(user.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Profile Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/30 via-surface to-accent/20 p-8 mb-6 border border-white/5">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-surface-lighter flex items-center justify-center text-4xl border-2 border-primary/30">
            {user.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white truncate">
              {user.username}
            </h1>
            <p className="text-gray-400 text-sm flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5" />
              Joined {joinDate}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/settings"
              className="p-2.5 rounded-xl bg-surface-light border border-white/5 text-gray-400 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-surface-light border border-white/5 text-gray-400 hover:text-danger transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {
            icon: Gamepad2,
            label: 'Games Played',
            value: user.gamesPlayed || 0,
            color: 'text-primary',
          },
          {
            icon: Trophy,
            label: 'Total Score',
            value: user.totalScore || 0,
            color: 'text-warning',
          },
          {
            icon: Star,
            label: 'Best Streak',
            value: user.streak || 0,
            color: 'text-accent',
          },
          {
            icon: TrendingUp,
            label: 'Achievements',
            value: user.achievements?.length || 0,
            color: 'text-success',
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <div
            key={label}
            className="bg-surface-light rounded-xl p-4 border border-white/5"
          >
            <Icon className={`w-5 h-5 ${color} mb-2`} />
            <p className="text-white font-bold text-xl">{value}</p>
            <p className="text-gray-500 text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <section className="mb-6">
        <h2 className="text-lg font-bold text-white mb-3">Achievements</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = (user.achievements || []).includes(ach.id)
            return (
              <div
                key={ach.id}
                className={`rounded-xl p-4 border text-center transition-all ${
                  unlocked
                    ? 'bg-surface-light border-primary/30'
                    : 'bg-surface border-white/5 opacity-40'
                }`}
              >
                <span className="text-2xl block mb-2">{ach.icon}</span>
                <p className="text-white text-xs font-medium">{ach.title}</p>
                <p className="text-gray-500 text-[10px] mt-0.5">
                  {ach.description}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Recent Games */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">Recent Games</h2>
        <div className="bg-surface-light rounded-xl border border-white/5 overflow-hidden">
          {recentGames.length > 0 ? (
            recentGames.map((game, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0"
              >
                <span className="text-lg">🎮</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm">{game.gameId}</p>
                  <p className="text-gray-500 text-xs">
                    {new Date(game.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-primary font-bold text-sm">
                  {game.score}
                </span>
              </div>
            ))
          ) : (
            <div className="py-8 text-center">
              <Gamepad2 className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">
                No games played yet. Jump into a game!
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

const ACHIEVEMENTS = [
  {
    id: 'first-game',
    icon: '🎮',
    title: 'First Steps',
    description: 'Play your first game',
  },
  {
    id: 'ten-games',
    icon: '🔥',
    title: 'On Fire',
    description: 'Play 10 games',
  },
  {
    id: 'high-scorer',
    icon: '🏆',
    title: 'High Scorer',
    description: 'Score over 1000 in a single game',
  },
  {
    id: 'all-games',
    icon: '🌟',
    title: 'Explorer',
    description: 'Try every game at least once',
  },
  {
    id: 'streak-5',
    icon: '⚡',
    title: 'Streak Master',
    description: '5 correct answers in a row',
  },
  {
    id: 'social',
    icon: '🤝',
    title: 'Social Butterfly',
    description: 'Compete on the leaderboard',
  },
]

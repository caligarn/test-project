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
        <p className="text-navy font-black text-lg mb-2 uppercase">Not Signed In</p>
        <p className="text-navy/50 text-sm mb-6 font-medium">
          Sign in to view your profile, track scores, and compete on
          leaderboards.
        </p>
        <Link
          to="/login"
          className="btn-brutalist bg-primary text-white no-underline inline-flex"
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
      <div className="brutalist-card-pink p-8 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-white flex items-center justify-center text-4xl border-3" style={{ borderWidth: '3px', borderColor: '#1A1A2E' }}>
            {user.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black text-white truncate uppercase">
              {user.username}
            </h1>
            <p className="text-white/70 text-sm flex items-center gap-1.5 mt-1 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              Joined {joinDate}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/settings"
              className="p-2.5 bg-white/20 border-2 border-white/30 text-white hover:bg-white/30 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2.5 bg-white/20 border-2 border-white/30 text-white hover:bg-danger transition-colors"
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
            bg: 'bg-[#8B5CF6]',
          },
          {
            icon: Trophy,
            label: 'Total Score',
            value: user.totalScore || 0,
            bg: 'bg-highlight',
          },
          {
            icon: Star,
            label: 'Best Streak',
            value: user.streak || 0,
            bg: 'bg-accent',
          },
          {
            icon: TrendingUp,
            label: 'Achievements',
            value: user.achievements?.length || 0,
            bg: 'bg-[#00D4FF]',
          },
        ].map(({ icon: Icon, label, value, bg }) => {
          const isLight = bg === 'bg-highlight' || bg === 'bg-accent'
          return (
            <div
              key={label}
              className={`${bg} p-4 border-3`}
              style={{ borderWidth: '3px', borderColor: '#1A1A2E' }}
            >
              <Icon className={`w-5 h-5 ${isLight ? 'text-navy/60' : 'text-white/70'} mb-2`} />
              <p className={`${isLight ? 'text-navy' : 'text-white'} font-black text-xl`}>{value}</p>
              <p className={`${isLight ? 'text-navy/50' : 'text-white/60'} text-xs font-bold uppercase`}>{label}</p>
            </div>
          )
        })}
      </div>

      {/* Achievements */}
      <section className="mb-6">
        <h2 className="text-lg font-black text-navy mb-3 uppercase">Achievements</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = (user.achievements || []).includes(ach.id)
            return (
              <div
                key={ach.id}
                className={`p-4 text-center transition-all border-3 ${
                  unlocked
                    ? 'bg-white'
                    : 'bg-surface-light opacity-40'
                }`}
                style={{ borderWidth: '3px', borderColor: unlocked ? '#1A1A2E' : '#C8C2B0' }}
              >
                <span className="text-2xl block mb-2">{ach.icon}</span>
                <p className="text-navy text-xs font-black uppercase">{ach.title}</p>
                <p className="text-navy/40 text-[10px] mt-0.5 font-medium">
                  {ach.description}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Recent Games */}
      <section>
        <h2 className="text-lg font-black text-navy mb-3 uppercase">Recent Games</h2>
        <div className="brutalist-card overflow-hidden">
          {recentGames.length > 0 ? (
            recentGames.map((game, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 border-b-2 border-navy/10 last:border-0"
              >
                <span className="text-lg">🎮</span>
                <div className="flex-1 min-w-0">
                  <p className="text-navy text-sm font-bold">{game.gameId}</p>
                  <p className="text-navy/40 text-xs font-medium">
                    {new Date(game.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-primary font-black text-sm">
                  {game.score}
                </span>
              </div>
            ))
          ) : (
            <div className="py-8 text-center">
              <Gamepad2 className="w-8 h-8 text-navy/20 mx-auto mb-2" />
              <p className="text-navy/40 text-sm font-medium">
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

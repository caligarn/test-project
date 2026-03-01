import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Play,
  Users,
  Trophy,
  Clock,
  Star,
  Lock,
} from 'lucide-react'
import { getGame } from '../lib/gameData'
import { getLeaderboard } from '../lib/storage'
import { useAuth } from '../context/AuthContext'

export default function GameDetail() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const game = getGame(gameId)
  const leaderboard = getLeaderboard(gameId, 5)

  if (!game) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-4xl mb-4">🎮</p>
        <p className="text-gray-400">Game not found.</p>
        <Link
          to="/"
          className="inline-block mt-4 text-primary text-sm no-underline"
        >
          Back to Games
        </Link>
      </div>
    )
  }

  const SAMPLE_SCREENSHOTS = [1, 2, 3]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Hero */}
      <div
        className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${game.gradient} p-8 md:p-12 mb-6`}
      >
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10">
          <span className="text-5xl md:text-6xl mb-4 block">{game.icon}</span>
          <div className="flex items-center gap-2 mb-2">
            {game.isNew && (
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
                New
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                game.difficulty === 'Easy'
                  ? 'bg-green-500/20 text-green-300'
                  : game.difficulty === 'Medium'
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-red-500/20 text-red-300'
              }`}
            >
              {game.difficulty}
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {game.title}
          </h1>
          <p className="text-white/70 text-sm md:text-base max-w-lg mb-6">
            {game.description}
          </p>

          {user ? (
            <Link
              to={`/play/${game.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-gray-900 font-bold text-sm hover:bg-gray-100 transition-colors no-underline pulse-glow"
            >
              <Play className="w-4 h-4" />
              Play Now
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/20 text-white font-bold text-sm hover:bg-white/30 transition-colors no-underline"
            >
              <Lock className="w-4 h-4" />
              Sign In to Play
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { icon: Users, label: 'Players', value: game.players },
          { icon: Trophy, label: 'High Score', value: leaderboard[0]?.score || '—' },
          { icon: Clock, label: 'Avg. Time', value: '3 min' },
        ].map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="bg-surface-light rounded-xl p-4 text-center border border-white/5"
          >
            <Icon className="w-5 h-5 text-gray-400 mx-auto mb-2" />
            <p className="text-white font-bold text-lg">{value}</p>
            <p className="text-gray-500 text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Screenshots Placeholder */}
      <section className="mb-6">
        <h2 className="text-lg font-bold text-white mb-3">Screenshots</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {SAMPLE_SCREENSHOTS.map((i) => (
            <div
              key={i}
              className={`shrink-0 w-56 h-36 rounded-xl bg-gradient-to-br ${game.gradient} opacity-60 flex items-center justify-center`}
            >
              <span className="text-white/40 text-sm">Preview {i}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How to Play */}
      <section className="mb-6">
        <h2 className="text-lg font-bold text-white mb-3">How to Play</h2>
        <div className="bg-surface-light rounded-xl p-5 border border-white/5">
          <ol className="space-y-3">
            {[
              'AI generates an image using Fal.ai',
              'Study the image carefully',
              'Submit your answer before time runs out',
              'Score points based on accuracy',
              'Climb the leaderboard!',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 shrink-0 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-gray-300">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Top Players</h2>
          <Link
            to={`/leaderboard?game=${game.id}`}
            className="text-primary text-xs no-underline hover:underline"
          >
            View All
          </Link>
        </div>
        <div className="bg-surface-light rounded-xl border border-white/5 overflow-hidden">
          {leaderboard.length > 0 ? (
            leaderboard.map((entry, i) => (
              <div
                key={entry.username}
                className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0"
              >
                <span
                  className={`w-6 text-center text-sm font-bold ${
                    i === 0
                      ? 'text-gold'
                      : i === 1
                      ? 'text-silver'
                      : i === 2
                      ? 'text-bronze'
                      : 'text-gray-500'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="text-sm text-white flex-1">
                  {entry.username}
                </span>
                <span className="text-sm font-bold text-primary">
                  {entry.score}
                </span>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center">
              <Star className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">
                No scores yet. Be the first!
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

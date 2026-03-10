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
        <p className="text-navy/60 font-medium">Game not found.</p>
        <Link
          to="/"
          className="inline-block mt-4 text-primary text-sm font-bold no-underline uppercase"
        >
          Back to Games
        </Link>
      </div>
    )
  }

  const isLightBg = game.color === '#C8FF00' || game.color === '#FFD600'
  const SAMPLE_SCREENSHOTS = [1, 2, 3]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold mb-4 transition-colors uppercase"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Hero */}
      <div
        className="relative overflow-hidden p-8 md:p-12 mb-6 border-3"
        style={{ backgroundColor: game.color, borderWidth: '3px', borderColor: '#1A1A2E' }}
      >
        <div className="relative z-10">
          <span className="text-5xl md:text-6xl mb-4 block">{game.icon}</span>
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`tag ${
                game.difficulty === 'Easy'
                  ? 'tag-green'
                  : game.difficulty === 'Medium'
                  ? 'tag-yellow'
                  : 'tag-pink'
              }`}
            >
              {game.difficulty}
            </span>
          </div>
          <h1 className={`text-3xl md:text-4xl font-black ${isLightBg ? 'text-navy' : 'text-white'} mb-2 uppercase`}>
            {game.title}
          </h1>
          <p className={`${isLightBg ? 'text-navy/70' : 'text-white/80'} text-sm md:text-base max-w-lg mb-6 font-medium`}>
            {game.description}
          </p>

          <Link
            to={`/play/${game.id}`}
            className="btn-brutalist bg-white text-navy no-underline"
          >
            <Play className="w-4 h-4" />
            Play Now
          </Link>
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
            className="brutalist-card p-4 text-center"
          >
            <Icon className="w-5 h-5 text-navy/40 mx-auto mb-2" />
            <p className="text-navy font-black text-lg">{value}</p>
            <p className="text-navy/50 text-xs font-bold uppercase">{label}</p>
          </div>
        ))}
      </div>

      {/* Screenshots Placeholder */}
      <section className="mb-6">
        <h2 className="text-lg font-black text-navy mb-3 uppercase">Screenshots</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {SAMPLE_SCREENSHOTS.map((i) => (
            <div
              key={i}
              className="shrink-0 w-56 h-36 flex items-center justify-center border-3"
              style={{ backgroundColor: game.color, opacity: 0.6, borderWidth: '3px', borderColor: '#1A1A2E' }}
            >
              <span className={`${isLightBg ? 'text-navy/40' : 'text-white/40'} text-sm font-bold`}>Preview {i}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How to Play */}
      <section className="mb-6">
        <h2 className="text-lg font-black text-navy mb-3 uppercase">How to Play</h2>
        <div className="brutalist-card p-5">
          <ol className="space-y-3">
            {[
              'AI generates an image using Fal.ai',
              'Study the image carefully',
              'Submit your answer before time runs out',
              'Score points based on accuracy',
              'Climb the leaderboard!',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 shrink-0 bg-primary text-white text-xs font-black flex items-center justify-center border-2 border-navy">
                  {i + 1}
                </span>
                <span className="text-navy/80 font-medium">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-navy uppercase">Top Players</h2>
          <Link
            to={`/leaderboard?game=${game.id}`}
            className="text-primary text-xs font-bold no-underline hover:underline uppercase"
          >
            View All
          </Link>
        </div>
        <div className="brutalist-card overflow-hidden">
          {leaderboard.length > 0 ? (
            leaderboard.map((entry, i) => (
              <div
                key={entry.username}
                className="flex items-center gap-3 px-4 py-3 border-b-2 border-navy/10 last:border-0"
              >
                <span
                  className={`w-6 text-center text-sm font-black ${
                    i === 0
                      ? 'text-gold'
                      : i === 1
                      ? 'text-silver'
                      : i === 2
                      ? 'text-bronze'
                      : 'text-navy/30'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="text-sm text-navy font-bold flex-1">
                  {entry.username}
                </span>
                <span className="text-sm font-black text-primary">
                  {entry.score}
                </span>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center">
              <Star className="w-8 h-8 text-navy/20 mx-auto mb-2" />
              <p className="text-navy/50 text-sm font-medium">
                No scores yet. Be the first!
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

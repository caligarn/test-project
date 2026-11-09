import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Trophy, Star, Users, Coins, RefreshCw } from 'lucide-react'
import { getGame, DAILY } from '../lib/gameData'
import { gameLimits } from '../lib/gameLimits'
import { getLeaderboard } from '../lib/storage'
import { api } from '../lib/api'

function rankColor(i) {
  return i === 0 ? 'text-gold' : i === 1 ? 'text-silver' : i === 2 ? 'text-bronze' : 'text-navy/30'
}

export default function GameDetail() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const game = getGame(gameId)
  const id = game?.id
  const [plays, setPlays] = useState(0)
  const [board, setBoard] = useState({ id: null, rows: [], error: null })

  useEffect(() => {
    if (!id) return
    let active = true
    getLeaderboard(id, 5)
      .then((rows) => { if (active) setBoard({ id, rows: rows || [], error: null }) })
      .catch((err) => { if (active) setBoard({ id, rows: [], error: err.message || 'Could not load scores.' }) })
    if (id !== DAILY.id) {
      api('/stats')
        .then((data) => { if (active) setPlays(Number(data.plays?.[id]) || 0) })
        .catch(() => { /* play count is optional */ })
    }
    return () => { active = false }
  }, [id])

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
  const isDaily = game.id === DAILY.id
  const limits = gameLimits(game.id)
  const loadingBoard = board.id !== game.id
  const leaderboard = loadingBoard ? [] : board.rows

  const stats = [
    { icon: Trophy, label: isDaily ? 'Today\'s best' : 'High score', value: loadingBoard ? '...' : leaderboard[0]?.score?.toLocaleString() || 'None yet' },
    { icon: Users, label: 'Mode', value: game.party ? 'Solo or party' : isDaily ? 'Once a day' : 'Solo' },
    isDaily
      ? { icon: Coins, label: 'Cost', value: 'Free' }
      : plays > 0
      ? { icon: Play, label: 'Plays', value: plays.toLocaleString() }
      : { icon: Coins, label: 'Cost', value: '1 credit' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold mb-4 transition-colors uppercase"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Hero */}
      <div
        className="relative overflow-hidden p-6 md:p-12 mb-6 border-3"
        style={{ backgroundColor: game.color, borderWidth: '3px', borderColor: '#1A1A2E' }}
      >
        <div className="relative z-10">
          <span className="text-5xl md:text-6xl mb-4 block">{game.icon}</span>
          <div className="flex flex-wrap items-center gap-2 mb-2">
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
            {game.party && <span className="tag bg-white text-navy">Party</span>}
            {plays > 0 && (
              <span className={`text-xs font-bold ${isLightBg ? 'text-navy/70' : 'text-white/80'}`}>
                {plays.toLocaleString()} {plays === 1 ? 'play' : 'plays'}
              </span>
            )}
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
        {stats.map((s) => {
          const StatIcon = s.icon
          return (
            <div key={s.label} className="brutalist-card p-3 sm:p-4 text-center">
              <StatIcon className="w-5 h-5 text-navy/40 mx-auto mb-2" />
              <p className="text-navy font-black text-sm sm:text-lg">{s.value}</p>
              <p className="text-navy/50 text-[10px] sm:text-xs font-bold uppercase">{s.label}</p>
            </div>
          )
        })}
      </div>

      {/* How to Play */}
      <section className="mb-6">
        <h2 className="text-lg font-black text-navy mb-3 uppercase">How to Play</h2>
        <div className="brutalist-card p-5 space-y-3">
          <p className="text-navy/80 text-sm font-medium">{game.howToPlay}</p>
          {game.party && (
            <p className="text-navy/80 text-sm font-medium">
              <span className="font-black uppercase text-navy">Party mode:</span> play with friends on your phones. One person starts a room and shares the code, everyone else joins.
            </p>
          )}
          <p className="text-navy/50 text-xs font-bold uppercase">
            {isDaily
              ? 'Free to play. Log in to get on today\'s leaderboard.'
              : `1 credit per game, good for up to ${limits?.maxUnits || 10} AI images or judge calls.`}
          </p>
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-navy uppercase">{isDaily ? 'Today\'s Top Players' : 'Top Players'}</h2>
          <Link
            to={`/leaderboard?game=${game.id}`}
            className="text-primary text-xs font-bold no-underline hover:underline uppercase"
          >
            View All
          </Link>
        </div>
        <div className="brutalist-card overflow-hidden">
          {loadingBoard ? (
            <div className="px-4 py-8 text-center">
              <RefreshCw className="w-6 h-6 text-navy/30 mx-auto mb-2 animate-spin" />
              <p className="text-navy/50 text-xs font-bold uppercase">Loading scores...</p>
            </div>
          ) : board.error ? (
            <div className="px-4 py-8 text-center" role="alert">
              <p className="text-danger text-sm font-black">{board.error}</p>
            </div>
          ) : leaderboard.length > 0 ? (
            leaderboard.map((entry, i) => (
              <div
                key={entry.username}
                className="flex items-center gap-3 px-4 py-3 border-b-2 border-navy/10 last:border-0"
              >
                <span className={`w-6 text-center text-sm font-black ${rankColor(i)}`}>
                  {entry.rank || i + 1}
                </span>
                <span className="text-lg">{entry.avatar || '🤖'}</span>
                <span className="text-sm text-navy font-bold flex-1 min-w-0 truncate">
                  {entry.username}
                </span>
                <span className="text-sm font-black text-primary">
                  {entry.score.toLocaleString()}
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

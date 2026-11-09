import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Trophy, Medal, RefreshCw, CalendarDays } from 'lucide-react'
import { getLeaderboard } from '../lib/storage'
import { ALL_GAMES, DAILY, getGame } from '../lib/gameData'
import { useAuth } from '../context/AuthContext'
import BannerAd from '../components/BannerAd'

const BOARD_GAMES = ALL_GAMES.filter((g) => g.id !== DAILY.id)

function boardInfo(board) {
  if (board === 'all') return { title: 'Overall', note: 'Each player\'s best score in every game, added up.' }
  if (board === 'daily') return { title: 'Today\'s Daily', note: 'Today\'s Daily Challenge totals. A new board starts every day.' }
  const game = getGame(board)
  return { title: game?.title || board, note: `Best score per player in ${game?.title || 'this game'}.` }
}

function rankColor(i) {
  return i === 0 ? 'text-gold' : i === 1 ? 'text-silver' : i === 2 ? 'text-bronze' : 'text-navy/30'
}

export default function Leaderboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('game') || 'all'
  const board = requested === 'all' || requested === 'daily' || BOARD_GAMES.some((g) => g.id === requested)
    ? requested
    : getGame(requested)?.id || 'all'
  const { user } = useAuth()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ key: null, rows: [], error: null })
  const key = `${board}:${attempt}`

  useEffect(() => {
    let active = true
    getLeaderboard(board, 50)
      .then((rows) => { if (active) setResult({ key, rows: rows || [], error: null }) })
      .catch((err) => { if (active) setResult({ key, rows: [], error: err.message || 'Could not load the leaderboard.' }) })
    return () => { active = false }
  }, [board, key])

  const loading = result.key !== key
  const rows = loading ? [] : result.rows
  const info = boardInfo(board)

  function select(id) {
    setSearchParams(id === 'all' ? {} : { game: id }, { replace: true })
  }

  const tabClass = (active) =>
    `flex items-center gap-1 px-3 py-1.5 text-xs font-black whitespace-nowrap transition-colors uppercase border-2 border-navy ${
      active ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-surface-light'
    }`

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-navy flex items-center gap-2 uppercase">
          <Trophy className="w-6 h-6 text-highlight" />
          Leaderboard
        </h1>
        <p className="text-navy/50 text-sm mt-1 font-medium">
          Shared boards for every player. {info.note}
        </p>
      </div>

      {/* Board picker */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6" role="tablist" aria-label="Leaderboards">
        <button role="tab" aria-selected={board === 'all'} onClick={() => select('all')} className={tabClass(board === 'all')}>
          Overall
        </button>
        <button role="tab" aria-selected={board === 'daily'} onClick={() => select('daily')} className={tabClass(board === 'daily')}>
          <CalendarDays className="w-3.5 h-3.5" />
          Today&apos;s Daily
        </button>
        {BOARD_GAMES.map((game) => (
          <button
            key={game.id}
            role="tab"
            aria-selected={board === game.id}
            onClick={() => select(game.id)}
            className={tabClass(board === game.id)}
          >
            <span>{game.icon}</span>
            {game.title}
          </button>
        ))}
      </div>

      {!user && (
        <div className="mb-6 px-4 py-3 bg-highlight/30 border-2 border-navy text-sm text-navy font-medium">
          Guest scores stay on this device.{' '}
          <Link to="/login" className="text-primary font-black no-underline hover:underline">Log in or sign up</Link>{' '}
          to get your scores on these boards.
        </div>
      )}

      {loading && (
        <div className="brutalist-card py-12 text-center" aria-live="polite">
          <RefreshCw className="w-8 h-8 text-navy/30 mx-auto mb-3 animate-spin" />
          <p className="text-navy/50 text-sm font-bold uppercase">Loading {info.title}...</p>
        </div>
      )}

      {!loading && result.error && (
        <div className="bg-white p-5 text-center border-3" style={{ borderWidth: '3px', borderColor: '#FF3B30' }} role="alert">
          <p className="text-navy font-black text-sm uppercase mb-1">Could not load the leaderboard</p>
          <p className="text-navy/60 text-xs font-medium mb-3">{result.error}</p>
          <button onClick={() => setAttempt((n) => n + 1)} className="btn-brutalist bg-navy text-white text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      )}

      {!loading && !result.error && (
        <>
          {/* Top 3 podium */}
          {rows.length >= 3 && (
            <div className="flex items-end justify-center gap-3 mb-8">
              <Podium entry={rows[1]} place={2} />
              <Podium entry={rows[0]} place={1} />
              <Podium entry={rows[2]} place={3} />
            </div>
          )}

          <BannerAd slot="inline" className="mb-6" />

          <div className="brutalist-card overflow-hidden">
            {rows.map((entry, i) => {
              const mine = user && entry.username.toLowerCase() === user.username.toLowerCase()
              return (
                <div
                  key={entry.username}
                  className={`flex items-center gap-3 px-4 py-3 border-b-2 border-navy/10 last:border-0 transition-colors ${
                    mine ? 'bg-highlight/30' : 'hover:bg-surface-light/50'
                  }`}
                >
                  <span className={`w-8 text-center text-sm font-black ${rankColor(i)}`}>
                    #{entry.rank || i + 1}
                  </span>
                  <span className="text-lg">{entry.avatar || '🤖'}</span>
                  <p className="flex-1 min-w-0 text-navy text-sm font-bold truncate">
                    {entry.username}
                    {mine && <span className="ml-2 text-[10px] font-black uppercase text-primary">You</span>}
                  </p>
                  <p className="text-primary font-black text-sm">{entry.score.toLocaleString()}</p>
                </div>
              )
            })}
            {rows.length === 0 && (
              <div className="py-12 px-4 text-center">
                <Trophy className="w-10 h-10 text-navy/20 mx-auto mb-3" />
                <p className="text-navy/50 text-sm font-medium mb-4">
                  {board === 'daily'
                    ? 'No one has finished today\'s challenge yet. Be the first!'
                    : 'No scores yet. Play a game to claim the top spot!'}
                </p>
                <Link
                  to={board === 'all' ? '/' : `/play/${board}`}
                  className="btn-brutalist bg-primary text-white text-xs no-underline"
                >
                  {board === 'all' ? 'Pick a game' : 'Play now'}
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

const PODIUM = {
  1: { box: 'w-16 h-16 text-3xl bg-highlight pulse-glow', border: '#1A1A2E', bar: 'w-24 h-28 bg-highlight/20', color: 'text-gold', name: 'text-sm font-black' },
  2: { box: 'w-14 h-14 text-2xl bg-surface-light', border: '#A8A8A8', bar: 'w-20 h-20 bg-silver/20', color: 'text-silver', name: 'text-xs font-bold' },
  3: { box: 'w-14 h-14 text-2xl bg-surface-light', border: '#CD7F32', bar: 'w-20 h-16 bg-bronze/20', color: 'text-bronze', name: 'text-xs font-bold' },
}

function Podium({ entry, place }) {
  const s = PODIUM[place]
  const PlaceIcon = place === 1 ? Trophy : Medal
  return (
    <div className="flex flex-col items-center min-w-0">
      <div className={`${s.box} flex items-center justify-center mb-2 border-3`} style={{ borderWidth: '3px', borderColor: s.border }}>
        {entry.avatar || '👾'}
      </div>
      <p className={`text-navy ${s.name} truncate max-w-[88px]`}>{entry.username}</p>
      <div className={`mt-2 ${s.bar} flex flex-col items-center justify-center border-2 border-navy/20`}>
        <PlaceIcon className={`w-5 h-5 ${s.color} mb-1`} />
        <span className={`${s.color} ${place === 1 ? 'text-lg' : 'text-sm'} font-black`}>{entry.score.toLocaleString()}</span>
      </div>
    </div>
  )
}

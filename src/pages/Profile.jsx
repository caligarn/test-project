import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getLocalScores } from '../lib/storage'
import { api } from '../lib/api'
import { getGame } from '../lib/gameData'
import {
  Settings,
  LogOut,
  Trophy,
  Gamepad2,
  Star,
  Calendar,
  Sigma,
  RefreshCw,
  UserPlus,
} from 'lucide-react'

function gameLabel(gameId) {
  const game = getGame(gameId)
  return { icon: game?.icon || '🎮', title: game?.title || gameId }
}

function formatDate(ms) {
  if (!ms) return ''
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Loading({ label }) {
  return (
    <div className="max-w-sm mx-auto px-4 py-16 text-center" aria-live="polite">
      <RefreshCw className="w-8 h-8 text-navy/30 mx-auto mb-3 animate-spin" />
      <p className="text-navy/50 text-sm font-bold uppercase">{label}</p>
    </div>
  )
}

export default function Profile() {
  const { user, loading } = useAuth()
  if (loading) return <Loading label="Loading profile..." />
  return user ? <UserProfile user={user} /> : <GuestProfile />
}

// --- logged-in player: stats from the server ------------------------------

function UserProfile({ user }) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const key = `${user.username}:${attempt}`

  useEffect(() => {
    let active = true
    api(`/profile/${encodeURIComponent(user.username)}`)
      .then((data) => { if (active) setResult({ key, data, error: null }) })
      .catch((err) => { if (active) setResult({ key, data: null, error: err.message || 'Could not load your profile.' }) })
    return () => { active = false }
  }, [user.username, key])

  function handleLogout() {
    logout()
    navigate('/')
  }

  const loadingStats = result.key !== key
  const data = loadingStats ? null : result.data
  const bests = Object.entries(data?.bests || {}).sort((a, b) => b[1] - a[1])
  const topScore = bests.length ? bests[0][1] : 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Profile header */}
      <div className="brutalist-card-pink p-5 sm:p-8 mb-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 bg-white flex items-center justify-center text-3xl sm:text-4xl border-3" style={{ borderWidth: '3px', borderColor: '#1A1A2E' }}>
            {user.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-white truncate uppercase">
              {user.username}
            </h1>
            {user.createdAt && (
              <p className="text-white/70 text-sm flex items-center gap-1.5 mt-1 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              to="/settings"
              aria-label="Settings"
              className="p-2.5 bg-white/20 border-2 border-white/30 text-white hover:bg-white/30 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <button
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
              className="p-2.5 bg-white/20 border-2 border-white/30 text-white hover:bg-danger transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {loadingStats && <Loading label="Loading your stats..." />}

      {!loadingStats && result.error && (
        <div className="bg-white p-5 text-center border-3 mb-6" style={{ borderWidth: '3px', borderColor: '#FF3B30' }} role="alert">
          <p className="text-navy font-black text-sm uppercase mb-1">Could not load your stats</p>
          <p className="text-navy/60 text-xs font-medium mb-3">{result.error}</p>
          <button onClick={() => setAttempt((n) => n + 1)} className="btn-brutalist bg-navy text-white text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      )}

      {data && (
        <>
          <StatGrid
            items={[
              { icon: Gamepad2, label: 'Games played', value: data.gamesPlayed, bg: 'bg-[#8B5CF6]' },
              { icon: Sigma, label: 'Total score', value: data.totalScore, bg: 'bg-highlight' },
              { icon: Trophy, label: 'Top score', value: topScore, bg: 'bg-accent' },
              { icon: Star, label: 'Games ranked', value: bests.length, bg: 'bg-[#00D4FF]' },
            ]}
          />

          {/* Best per game */}
          <section className="mb-6">
            <h2 className="text-lg font-black text-navy mb-3 uppercase">Best per game</h2>
            <div className="brutalist-card overflow-hidden">
              {bests.length > 0 ? (
                bests.map(([gameId, score]) => {
                  const g = gameLabel(gameId)
                  return (
                    <Link
                      key={gameId}
                      to={`/leaderboard?game=${gameId}`}
                      className="flex items-center gap-3 px-4 py-3 border-b-2 border-navy/10 last:border-0 no-underline hover:bg-surface-light/50"
                    >
                      <span className="text-lg">{g.icon}</span>
                      <span className="flex-1 min-w-0 text-navy text-sm font-bold truncate">{g.title}</span>
                      <span className="text-primary font-black text-sm">{score.toLocaleString()}</span>
                    </Link>
                  )
                })
              ) : (
                <EmptyGames text="No scores on the boards yet. Finish a game to get ranked!" />
              )}
            </div>
          </section>

          {/* Recent games */}
          <section>
            <h2 className="text-lg font-black text-navy mb-3 uppercase">Recent games</h2>
            <HistoryList entries={data.recent.map((r) => ({ gameId: r.gameId, score: r.score, at: r.at }))} />
          </section>
        </>
      )}
    </div>
  )
}

// --- guest: local history on this device --------------------------------

function GuestProfile() {
  const [entries] = useState(() => getLocalScores().map((s) => ({ gameId: s.gameId, score: s.score, at: s.timestamp })))
  const total = entries.reduce((sum, e) => sum + (Number(e.score) || 0), 0)
  const best = entries.reduce((max, e) => Math.max(max, Number(e.score) || 0), 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="brutalist-card p-6 mb-6 text-center">
        <p className="text-5xl mb-3">👤</p>
        <h1 className="text-navy font-black text-xl mb-2 uppercase">Playing as a guest</h1>
        <p className="text-navy/60 text-sm mb-5 font-medium max-w-md mx-auto">
          Your scores are saved on this device only. Sign up (it is free) so your scores count on the shared leaderboards and follow you to any device.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link to="/login?mode=signup" className="btn-brutalist bg-primary text-white no-underline">
            <UserPlus className="w-4 h-4" />
            Sign up
          </Link>
          <Link to="/login" className="btn-brutalist bg-white text-navy no-underline">
            Log in
          </Link>
        </div>
      </div>

      <StatGrid
        items={[
          { icon: Gamepad2, label: 'Games on this device', value: entries.length, bg: 'bg-[#8B5CF6]' },
          { icon: Sigma, label: 'Total score', value: total, bg: 'bg-highlight' },
          { icon: Trophy, label: 'Top score', value: best, bg: 'bg-accent' },
        ]}
      />

      <section>
        <h2 className="text-lg font-black text-navy mb-3 uppercase">Your recent games</h2>
        <HistoryList entries={entries.slice(0, 30)} />
      </section>
    </div>
  )
}

// --- shared bits ------------------------------------------------------------

function StatGrid({ items }) {
  return (
    <div className={`grid grid-cols-2 ${items.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-3 mb-6`}>
      {items.map((item) => {
        const ItemIcon = item.icon
        const isLight = item.bg === 'bg-highlight' || item.bg === 'bg-accent'
        return (
          <div key={item.label} className={`${item.bg} p-4 border-3`} style={{ borderWidth: '3px', borderColor: '#1A1A2E' }}>
            <ItemIcon className={`w-5 h-5 ${isLight ? 'text-navy/60' : 'text-white/70'} mb-2`} />
            <p className={`${isLight ? 'text-navy' : 'text-white'} font-black text-xl`}>{Number(item.value || 0).toLocaleString()}</p>
            <p className={`${isLight ? 'text-navy/50' : 'text-white/60'} text-xs font-bold uppercase`}>{item.label}</p>
          </div>
        )
      })}
    </div>
  )
}

function EmptyGames({ text }) {
  return (
    <div className="py-8 px-4 text-center">
      <Gamepad2 className="w-8 h-8 text-navy/20 mx-auto mb-2" />
      <p className="text-navy/40 text-sm font-medium mb-3">{text}</p>
      <Link to="/" className="text-primary text-xs font-black no-underline hover:underline uppercase">Pick a game</Link>
    </div>
  )
}

function HistoryList({ entries }) {
  return (
    <div className="brutalist-card overflow-hidden">
      {entries.length > 0 ? (
        entries.map((entry, i) => {
          const g = gameLabel(entry.gameId)
          return (
            <div key={`${entry.at}-${i}`} className="flex items-center gap-3 px-4 py-3 border-b-2 border-navy/10 last:border-0">
              <span className="text-lg">{g.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-navy text-sm font-bold truncate">{g.title}</p>
                <p className="text-navy/40 text-xs font-medium">{formatDate(entry.at)}</p>
              </div>
              <span className="text-primary font-black text-sm">{Number(entry.score || 0).toLocaleString()}</span>
            </div>
          )
        })
      ) : (
        <EmptyGames text="No games played yet. Jump into a game!" />
      )}
    </div>
  )
}

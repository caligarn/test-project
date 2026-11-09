import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { getLeaderboard } from '../lib/storage'
import ErrorBanner from '../components/game/ErrorBanner'
import GeneratingSpinner from '../components/game/GeneratingSpinner'
import GameImage from '../components/game/GameImage'

// Daily Challenge: the same 5 images for everyone today, one guess each.
// The server holds the prompts, scores each guess, and records the total on
// today's leaderboard (logged-in players), so this page never calls addScore.

const ROUNDS = 5
const MAX_PER_ROUND = 100

function band(score) {
  if (score >= 60) return { square: '🟩', color: '#16a34a', label: 'Great' }
  if (score >= 25) return { square: '🟨', color: '#FFD600', label: 'Close' }
  return { square: '🟥', color: '#FF2D55', label: 'Miss' }
}

function shareText(date, played) {
  const scores = Array.from({ length: ROUNDS }, (_, i) => played[i]?.score)
  const total = scores.reduce((sum, s) => sum + (s || 0), 0)
  const squares = scores.map((s) => (s == null ? '⬜' : band(s).square)).join('')
  return `Gen Arcade Daily ${date}: ${total}/${ROUNDS * MAX_PER_ROUND} ${squares}`
}

async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the old way
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

/** "2026-11-09" -> "Nov 9" (the daily date is a UTC day). */
function shortDate(date) {
  try {
    return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  } catch {
    return date
  }
}

const firstUnplayed = (rounds, played) => {
  const next = rounds.find((r) => !played[r.index])
  return next ? next.index : null
}

export default function DailyChallengeGame() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState(null) // { date, rounds, played }
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [viewing, setViewing] = useState(null) // round index, or 'summary'
  const [guess, setGuess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [board, setBoard] = useState(null)
  const [boardError, setBoardError] = useState(null)
  const [shareState, setShareState] = useState(null) // 'copied' | 'manual'
  const loadId = useRef(0)

  const load = useCallback(async () => {
    const id = ++loadId.current
    setLoading(true)
    setLoadError(null)
    try {
      const d = await api('/daily')
      if (id !== loadId.current) return
      const played = d.played || {}
      setData({ ...d, played })
      const next = firstUnplayed(d.rounds, played)
      setViewing(next == null ? 'summary' : next)
    } catch (err) {
      if (id !== loadId.current) return
      setLoadError(err?.message || 'Could not load today\'s challenge.')
    } finally {
      if (id === loadId.current) setLoading(false)
    }
  }, [])

  // Reload when the player logs in or out (progress is kept per account).
  const username = user?.username || null
  useEffect(() => {
    load()
  }, [load, username])
  useEffect(() => () => {
    loadId.current++
  }, [])

  const played = data?.played || {}
  const rounds = data?.rounds || []
  const playedCount = Object.keys(played).length
  const done = data && playedCount >= ROUNDS
  const total = Object.values(played).reduce((sum, r) => sum + (r?.score || 0), 0)

  const loadBoard = useCallback(async () => {
    setBoardError(null)
    try {
      setBoard(await getLeaderboard('daily', 10))
    } catch {
      setBoardError('Could not load the leaderboard.')
    }
  }, [])

  useEffect(() => {
    if (viewing === 'summary' && done) loadBoard()
  }, [viewing, done, loadBoard])

  const submitGuess = async (e) => {
    e.preventDefault()
    const text = guess.trim()
    if (!text || submitting || typeof viewing !== 'number' || played[viewing]) return
    setSubmitting(true)
    setError(null)
    const index = viewing
    try {
      const res = await api('/daily/guess', { method: 'POST', body: { index, guess: text } })
      const entry = { score: res.score, prompt: res.prompt, matchedWords: res.matchedWords || [], guess: res.guess }
      setData((prev) => (prev ? { ...prev, played: { ...prev.played, [index]: entry } } : prev))
      setGuess('')
    } catch (err) {
      setError(err?.message || 'Could not send your guess. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const goNext = () => {
    const next = firstUnplayed(rounds, played)
    setViewing(next == null ? 'summary' : next)
    setGuess('')
    setError(null)
  }

  const share = async () => {
    const text = shareText(data.date, played)
    const ok = await copyText(text)
    setShareState(ok ? 'copied' : 'manual')
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col gap-2">
        <GeneratingSpinner label="Getting today's images..." color="#1A1A2E" />
        <p className="text-navy/50 text-xs font-medium text-center">The first visit each day can take a few seconds.</p>
      </div>
    )
  }

  if (loadError && !data) {
    return <ErrorBanner message={loadError} onRetry={load} />
  }

  if (!data) return null

  const current = typeof viewing === 'number' ? rounds.find((r) => r.index === viewing) : null
  const currentResult = current ? played[current.index] : null

  return (
    <div className="flex flex-col gap-4">
      {/* Header: date, progress, running total */}
      <div className="grid grid-cols-3 gap-3">
        <div className="brutalist-card p-3 sm:p-4 text-center">
          <p className="text-xs font-bold uppercase text-navy/40">Date</p>
          <p className="text-xl sm:text-3xl font-black text-navy whitespace-nowrap" title={data.date}>{shortDate(data.date)}</p>
        </div>
        <div className="brutalist-card p-3 sm:p-4 text-center">
          <p className="text-xs font-bold uppercase text-navy/40">Played</p>
          <p className="text-xl sm:text-3xl font-black text-navy">{playedCount}/{ROUNDS}</p>
        </div>
        <div className="brutalist-card p-3 sm:p-4 text-center">
          <p className="text-xs font-bold uppercase text-navy/40">Score</p>
          <p className="text-xl sm:text-3xl font-black text-primary">{total}</p>
        </div>
      </div>

      {!user && !authLoading && !done && (
        <p className="text-sm text-navy font-medium p-3 bg-highlight/20 border-2 border-highlight">
          Playing as a guest. <Link to="/login" className="font-black text-primary uppercase">Log in</Link> to appear on today's leaderboard.
        </p>
      )}

      {/* Image strip */}
      <div className="grid grid-cols-5 gap-2">
        {rounds.map((r) => {
          const res = played[r.index]
          const active = viewing === r.index
          return (
            <button
              key={r.index}
              onClick={() => { setViewing(r.index); setError(null) }}
              aria-label={res ? `Image ${r.index + 1}, scored ${res.score}` : `Image ${r.index + 1}, not played yet`}
              className="relative aspect-square overflow-hidden bg-white"
              style={{ border: `3px solid ${active ? '#FF2D55' : '#1A1A2E'}` }}
            >
              <GameImage src={r.imageUrl} alt={`Daily image ${r.index + 1}`} className="w-full h-full object-cover" eager />
              <span
                className="absolute bottom-0 inset-x-0 text-[10px] sm:text-xs font-black uppercase text-center py-0.5"
                style={{ background: res ? band(res.score).color : '#1A1A2E', color: res && res.score >= 25 && res.score < 60 ? '#1A1A2E' : 'white' }}
              >
                {res ? res.score : `#${r.index + 1}`}
              </span>
            </button>
          )
        })}
      </div>
      {done && viewing !== 'summary' && (
        <button onClick={() => setViewing('summary')}
          className="self-center px-4 py-2 text-navy text-xs font-black uppercase"
          style={{ border: '2px solid #1A1A2E' }}>
          Back to summary
        </button>
      )}

      {/* Guess an image */}
      {current && !currentResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
            <GameImage src={current.imageUrl} alt={`Daily image ${current.index + 1}`} className="w-full aspect-square object-cover" eager />
          </div>
          <div className="brutalist-card p-4 sm:p-6 flex flex-col gap-3">
            <h3 className="font-black text-navy uppercase text-sm">Image {current.index + 1} of {ROUNDS}: what was the prompt?</h3>
            <p className="text-navy/50 text-xs font-medium">One guess only. Name the subject, the setting, and any details you can see.</p>
            <ErrorBanner message={error} />
            <form onSubmit={submitGuess} className="flex flex-col gap-3 flex-1">
              <textarea
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                maxLength={300}
                rows={4}
                disabled={submitting}
                placeholder="Describe what you think the prompt was..."
                className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium resize-none flex-1"
                style={{ border: '3px solid #1A1A2E' }}
              />
              <button type="submit" disabled={!guess.trim() || submitting}
                className="w-full py-3 bg-primary text-white text-sm font-black uppercase disabled:opacity-40"
                style={{ border: '2px solid #1A1A2E' }}>
                {submitting ? 'Checking...' : 'Lock In Guess'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Result for one image */}
      {current && currentResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div style={{ border: `3px solid ${band(currentResult.score).color}`, overflow: 'hidden' }}>
            <GameImage src={current.imageUrl} alt={`Daily image ${current.index + 1}`} className="w-full aspect-square object-cover" eager />
          </div>
          <div className="brutalist-card p-4 sm:p-6 flex flex-col gap-3">
            <div className="text-center">
              <p className="text-4xl mb-1">{band(currentResult.score).square}</p>
              <p className="text-3xl font-black text-primary">+{currentResult.score} pts</p>
              <p className="text-xs font-black text-navy/50 uppercase">Image {current.index + 1}: {band(currentResult.score).label}</p>
            </div>
            <div>
              <p className="text-xs font-black text-navy/50 uppercase mb-1">Your guess</p>
              <p className="text-sm text-navy font-medium break-words">{currentResult.guess}</p>
            </div>
            <div>
              <p className="text-xs font-black text-navy/50 uppercase mb-1">Real prompt</p>
              <p className="text-sm text-primary font-bold break-words">{currentResult.prompt}</p>
            </div>
            <p className="text-xs text-navy/50 font-medium">
              {currentResult.matchedWords?.length
                ? `Matched words: ${currentResult.matchedWords.join(', ')}`
                : 'No matching words on this one.'}
            </p>
            {!done ? (
              <button onClick={goNext}
                className="w-full py-3 bg-navy text-white font-black uppercase text-sm"
                style={{ border: '2px solid #1A1A2E' }}>
                Next Image →
              </button>
            ) : (
              <button onClick={() => setViewing('summary')}
                className="w-full py-3 bg-navy text-white font-black uppercase text-sm"
                style={{ border: '2px solid #1A1A2E' }}>
                See Today's Result
              </button>
            )}
          </div>
        </div>
      )}

      {/* Final summary */}
      {viewing === 'summary' && done && (
        <div className="flex flex-col gap-4">
          <div className="brutalist-card p-6 sm:p-8 text-center">
            <span className="text-5xl block mb-3">📅</span>
            <h2 className="text-xl sm:text-2xl font-black text-navy uppercase mb-1">Daily Complete!</h2>
            <p className="text-5xl font-black text-primary mb-1">{total}<span className="text-2xl text-navy/40">/{ROUNDS * MAX_PER_ROUND}</span></p>
            <p className="text-3xl tracking-widest mb-4" aria-label="Your rounds">
              {rounds.map((r) => (played[r.index] ? band(played[r.index].score).square : '⬜')).join('')}
            </p>
            <button onClick={share} className="btn-brutalist bg-accent text-navy">
              Share Result
            </button>
            {shareState === 'copied' && (
              <p className="text-xs font-black text-green-600 uppercase mt-2">Copied! Paste it anywhere.</p>
            )}
            {shareState === 'manual' && (
              <div className="mt-3">
                <p className="text-xs font-bold text-navy/50 mb-1">Copy this text:</p>
                <p className="text-sm font-medium text-navy p-2 select-all break-words" style={{ border: '2px dashed #1A1A2E' }}>
                  {shareText(data.date, played)}
                </p>
              </div>
            )}
            <p className="text-navy/50 text-xs font-medium mt-4">New images every day at midnight UTC. Come back tomorrow!</p>
          </div>

          <div className="brutalist-card p-4 sm:p-6">
            <h3 className="font-black text-navy uppercase text-sm mb-3">Your rounds</h3>
            <ul className="flex flex-col gap-2">
              {rounds.map((r) => {
                const res = played[r.index]
                if (!res) return null
                return (
                  <li key={r.index} className="flex items-start gap-3 text-sm">
                    <span className="shrink-0">{band(res.score).square}</span>
                    <span className="shrink-0 w-10 font-black text-navy">{res.score}</span>
                    <span className="text-navy/70 font-medium break-words min-w-0">{res.prompt}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="brutalist-card p-4 sm:p-6">
            <h3 className="font-black text-navy uppercase text-sm mb-3">Today's leaderboard</h3>
            {!user && (
              <p className="text-sm text-navy font-medium mb-3 p-3 bg-highlight/20 border-2 border-highlight">
                You played as a guest, so your score is not on the leaderboard.{' '}
                <Link to="/login" className="font-black text-primary uppercase">Log in</Link> to appear on it next time.
              </p>
            )}
            {boardError && <ErrorBanner message={boardError} onRetry={loadBoard} />}
            {!board && !boardError && <p className="text-navy/50 text-sm font-medium">Loading...</p>}
            {board && board.length === 0 && (
              <p className="text-navy/50 text-sm font-medium">No scores yet today. Be the first!</p>
            )}
            {board && board.length > 0 && (
              <ol className="flex flex-col gap-1">
                {board.map((row) => {
                  const me = user && row.username.toLowerCase() === user.username.toLowerCase()
                  return (
                    <li key={row.username}
                      className={`flex items-center gap-3 px-3 py-2 text-sm ${me ? 'bg-accent/40' : ''}`}
                      style={{ border: '2px solid #1A1A2E' }}>
                      <span className="w-6 font-black text-navy">{row.rank}</span>
                      <span>{row.avatar || '🎮'}</span>
                      <span className="flex-1 font-bold text-navy truncate">{row.username}{me ? ' (you)' : ''}</span>
                      <span className="font-black text-primary">{row.score}</span>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

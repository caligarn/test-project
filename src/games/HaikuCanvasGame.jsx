import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'
import { useSharedGallery } from '../hooks/useSharedGallery'
import StatsBar from '../components/game/StatsBar'
import ErrorBanner from '../components/game/ErrorBanner'
import GameImage from '../components/game/GameImage'

const TARGETS = [5, 7, 5]
// One session = up to this many haiku, then the score is saved and a new
// session starts. 12 x 75 = 900, under maxScore (1000) in gameLimits.js.
const SESSION_MAX = 12

function countWordSyllables(word) {
  const norm = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!norm) return 0
  const vowels = 'aeiouy'
  let count = 0
  let prev = false
  for (const ch of norm) {
    const v = vowels.includes(ch)
    if (v && !prev) count++
    prev = v
  }
  // Silent-e rule, applied per word
  if (norm.endsWith('e') && count > 1) count--
  return Math.max(1, count)
}

function countSyllables(text) {
  if (!text.trim()) return 0
  // Count per word so vowel groups never merge across word boundaries
  // ("the old pond" is 3, not 2).
  return text
    .trim()
    .split(/\s+/)
    .reduce((sum, word) => sum + countWordSyllables(word), 0)
}

const ART_STYLES = [
  { id: 'watercolor', label: '🎨 Watercolor', prompt: 'soft watercolor painting' },
  { id: 'ink_wash', label: '🖌️ Ink Wash', prompt: 'traditional ink wash sumi-e' },
  { id: 'oil_painting', label: '🖼️ Oil Painting', prompt: 'rich oil painting' },
  { id: 'digital_art', label: '💻 Digital Art', prompt: 'vibrant digital illustration' },
]

function errorText(err, fallback) {
  return err?.status && err.status !== 500 && err.message ? err.message : fallback
}

/** The lines of a shared gallery item (meta.lines, else the text split on new lines). */
function haikuLines(item) {
  if (Array.isArray(item.meta?.lines)) return item.meta.lines.map(String).slice(0, 3)
  return (item.text || '').split('\n').slice(0, 3)
}

/**
 * Points add up during a session; the total is posted once, when the player
 * saves, reaches SESSION_MAX, or leaves the game.
 */
function useSessionScore(gameId, username) {
  const pending = useRef({ points: 0, count: 0 })
  const [total, setTotal] = useState(0)
  const [unsaved, setUnsaved] = useState(0)
  const [savedNote, setSavedNote] = useState(null)

  const save = useCallback(() => {
    const s = pending.current
    if (s.points <= 0) return
    pending.current = { points: 0, count: 0 }
    addScore(gameId, username, s.points, { haiku: s.count })
    setUnsaved(0)
    setSavedNote(`Saved ${s.points} pts for ${s.count} haiku.`)
  }, [gameId, username])

  const award = useCallback((pts) => {
    const s = pending.current
    pending.current = { points: s.points + pts, count: s.count + 1 }
    setTotal((t) => t + pts)
    setUnsaved(pending.current.points)
    setSavedNote(null)
    if (pending.current.count >= SESSION_MAX) save()
  }, [save])

  useEffect(() => {
    window.addEventListener('pagehide', save)
    return () => {
      window.removeEventListener('pagehide', save)
      save()
    }
  }, [save])

  return { total, unsaved, savedNote, award, save }
}

export default function HaikuCanvasGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const pts = game.pointsPerAction || 75
  const [lines, setLines] = useState(['', '', ''])
  const [style, setStyle] = useState('watercolor')
  const gallery = useSharedGallery('haiku-canvas')
  const [sort, setSort] = useState('new')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [mineCount, setMineCount] = useState(0)
  const [latest, setLatest] = useState(null)
  const session = useSessionScore(game.id, username)

  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false }
  }, [])

  const sylCounts = lines.map(countSyllables)
  const lineOk = lines.map((l, i) => l.trim() && sylCounts[i] === TARGETS[i])
  const allOk = lineOk.every(Boolean)
  const allFilled = lines.every(l => l.trim())
  const selectedStyle = ART_STYLES.find(s => s.id === style)

  const sorted = useMemo(() => {
    const list = [...gallery.items]
    if (sort === 'top') list.sort((a, b) => b.votes - a.votes || b.createdAt - a.createdAt)
    return list
  }, [gallery.items, sort])

  // Show the player's own newest haiku, or else the newest one in the gallery.
  const shown = latest ? gallery.items.find(i => i.id === latest.id) || latest : gallery.items[0]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!allFilled || generating) return
    setGenerating(true)
    setError(null)
    const clean = lines.map(l => l.trim())
    const haiku = clean.join(' / ')
    let url
    try {
      url = await generateImage(
        `${selectedStyle.prompt} artwork inspired by haiku: "${haiku}". Evocative, artistic, beautiful mood.`,
        { width: 768, height: 512 }
      )
    } catch (err) {
      if (aliveRef.current) {
        setError(errorText(err, 'Image generation failed. Please try again.'))
        setGenerating(false)
      }
      return
    }
    if (!aliveRef.current) return
    try {
      const item = await gallery.add({ imageUrl: url, text: clean.join('\n'), meta: { lines: clean, style } })
      if (!aliveRef.current) return
      setLatest(item)
    } catch (err) {
      if (!aliveRef.current) return
      // The art was made, so the haiku still counts; it just is not shared.
      setLatest({ id: 'local', imageUrl: url, text: clean.join('\n'), meta: { lines: clean }, username: user?.username || null, votes: 0, local: true })
      setError(errorText(err, 'Could not add your haiku to the shared gallery.'))
    }
    session.award(pts)
    setMineCount(c => c + 1)
    setLines(['', '', ''])
    setGenerating(false)
  }

  const handleVote = async (id) => {
    try {
      await gallery.vote(id)
    } catch (err) {
      setError(errorText(err, 'Vote failed. Please try again.'))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <StatsBar
          className="mb-2!"
          stats={[
            { label: 'Your Haiku', value: mineCount },
            { label: 'Gallery', value: gallery.items.length },
            { label: 'Score', value: session.total, color: '#FF2D55' },
          ]}
        />
        <div className="flex items-center justify-end gap-2 text-xs font-bold text-navy/50 min-h-7">
          {session.savedNote && <span className="text-[#16a34a]">{session.savedNote}</span>}
          {session.unsaved > 0 && (
            <>
              <span>{session.unsaved} pts unsaved. Saved when you leave.</span>
              <button onClick={session.save} className="px-2 py-1 font-black uppercase text-navy" style={{ border: '2px solid #1A1A2E' }}>
                Save now
              </button>
            </>
          )}
        </div>
      </div>

      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="brutalist-card p-4 sm:p-6 flex flex-col gap-4">
          <h3 className="font-black text-navy uppercase text-sm">Write your haiku (5-7-5)</h3>
          {lines.map((line, i) => {
            const syl = sylCounts[i]
            const target = TARGETS[i]
            const ok = lineOk[i]
            const over = syl > target && line.trim()
            const color = ok ? '#16a34a' : over ? '#dc2626' : '#1A1A2E'
            return (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <label htmlFor={`haiku-line-${i}`} className="text-xs font-black text-navy/50 uppercase">Line {i + 1}</label>
                  <span className="text-xs font-black" style={{ color }}>{line.trim() ? `${syl}/${target} syllables` : `${target} syllables`}</span>
                </div>
                <input id={`haiku-line-${i}`} type="text" value={line} maxLength={80}
                  onChange={e => { const l = [...lines]; l[i] = e.target.value; setLines(l) }}
                  placeholder={['An old silent pond', 'A frog jumps into the pond', 'Splash! Silence again'][i]}
                  className="w-full px-4 py-2 text-navy text-sm focus:outline-none font-medium"
                  style={{ border: `2px solid ${color}` }} />
              </div>
            )
          })}
          <div>
            <p className="text-xs font-black text-navy/50 uppercase mb-2">Art Style</p>
            <div className="grid grid-cols-2 gap-2">
              {ART_STYLES.map(s => (
                <button key={s.id} type="button" onClick={() => setStyle(s.id)}
                  className="px-2 py-2 text-xs font-black uppercase transition-colors text-left"
                  style={{ border: `2px solid ${style === s.id ? '#FF2D55' : '#1A1A2E'}`, background: style === s.id ? '#FF2D55' : 'white', color: style === s.id ? 'white' : '#1A1A2E' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {allFilled && !allOk && (
            <p className="text-xs font-medium" style={{ color: '#dc2626' }}>
              Syllable counts look off. The counter is only a guess, so you can still submit.
            </p>
          )}
          <button type="submit" disabled={!allFilled || generating}
            className="w-full py-3 font-black uppercase text-sm disabled:opacity-40 transition-opacity"
            style={{ background: allFilled ? '#FF2D55' : '#ccc', color: 'white', border: '2px solid #1A1A2E' }}>
            {generating ? '✦ Painting your haiku...' : `Submit & Paint (+${pts} pts)`}
          </button>
        </form>

        {/* Latest image */}
        <div className="flex flex-col gap-3">
          <h3 className="font-black text-navy uppercase text-sm">{latest ? 'Your Latest Haiku' : 'Newest In The Gallery'}</h3>
          {shown ? (
            <HaikuCard item={shown} onVote={shown.local ? null : handleVote} large />
          ) : (
            <div className="flex-1 flex items-center justify-center text-navy/30 font-medium text-sm p-4 text-center" style={{ border: '3px dashed #1A1A2E', minHeight: 200 }}>
              {gallery.loading ? 'Loading the gallery...' : 'No haiku yet. Write the first one!'}
            </div>
          )}
        </div>
      </div>

      {/* Shared gallery */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-2">
          <h3 className="font-black text-navy uppercase text-sm">Shared Gallery ({gallery.items.length})</h3>
          <div className="flex gap-1">
            {[['new', 'Newest'], ['top', 'Top voted']].map(([id, label]) => (
              <button key={id} onClick={() => setSort(id)}
                className="px-2 py-1 text-[10px] font-black uppercase"
                style={{ border: '2px solid #1A1A2E', background: sort === id ? '#1A1A2E' : 'white', color: sort === id ? 'white' : '#1A1A2E' }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {gallery.error && gallery.items.length === 0 ? (
          <ErrorBanner message="Could not load the gallery." onRetry={gallery.reload} />
        ) : sorted.length === 0 ? (
          <p className="text-sm text-navy/40 font-medium">{gallery.loading ? 'Loading...' : 'Nothing here yet.'}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sorted.map(item => <HaikuCard key={item.id} item={item} onVote={handleVote} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function HaikuCard({ item, onVote, large = false }) {
  const lines = haikuLines(item)
  return (
    <div className="bg-white flex flex-col" style={{ border: large ? '3px solid #1A1A2E' : '2px solid #1A1A2E', overflow: 'hidden' }}>
      <GameImage eager={large} src={item.imageUrl} alt={lines.join(' / ')}
        className="w-full object-cover" style={{ aspectRatio: '3 / 2', maxHeight: large ? 260 : undefined }} />
      <div className={`${large ? 'p-3' : 'p-2'} flex flex-col gap-1 flex-1`}>
        <div className="flex-1">
          {lines.map((l, i) => <p key={i} className={`${large ? 'text-sm' : 'text-[11px] leading-snug'} italic text-navy break-words`}>{l}</p>)}
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-[10px] text-navy/50 font-bold truncate">{item.avatar || '👤'} {item.username || 'Guest'}</p>
          {onVote && (
            <button onClick={() => onVote(item.id)}
              aria-label={item.voted ? 'Remove your vote' : 'Vote for this haiku'}
              title={item.voted ? 'Remove your vote' : 'Vote for this haiku'}
              className={`shrink-0 px-2 py-0.5 text-xs font-black ${item.voted ? 'bg-primary text-white' : 'text-navy hover:text-primary'}`}
              style={{ border: '2px solid #1A1A2E' }}>
              ♥ {item.votes || 0}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

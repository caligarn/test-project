import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'
import { useSharedGallery } from '../hooks/useSharedGallery'
import { useMachine } from '../hooks/useMachine'
import { communityComicMachine } from '../machines/communityComic.js'
import ErrorBanner from '../components/game/ErrorBanner'
import GameImage from '../components/game/GameImage'
import { BookOpen, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react'

const PANELS_PER_PAGE = 6
const CONTEXT_PANELS = 3
const TEXT_MAX = 240
// One session = up to this many panels, then the score is saved and a new
// session starts. 12 x 80 = 960, under maxScore (1000) in gameLimits.js.
const SESSION_MAX = 12

function errorText(err, fallback) {
  return err?.status && err.status !== 500 && err.message ? err.message : fallback
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
    addScore(gameId, username, s.points, { panels: s.count })
    setUnsaved(0)
    setSavedNote(`Saved ${s.points} pts for ${s.count} panel${s.count === 1 ? '' : 's'}.`)
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

export default function CommunityComicGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const pts = game.pointsPerAction || 80
  const gallery = useSharedGallery('community-comic', { limit: 100 })
  const [page, setPage] = useState(null) // null = follow the newest page
  const flow = useMachine(communityComicMachine) // see src/machines/communityComic.js
  const showForm = !flow.is('reading')
  const generating = flow.is('drawing', 'adding')
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const [zoom, setZoom] = useState(null) // lightbox: independent of the add-panel flow
  const session = useSessionScore(game.id, username)

  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false }
  }, [])

  // The server lists newest first; the comic reads oldest first.
  const panels = useMemo(
    () => [...gallery.items].reverse().map((p, i) => ({ ...p, panelNumber: i + 1 })),
    [gallery.items]
  )
  const recent = panels.slice(-CONTEXT_PANELS)
  const previous = panels[panels.length - 1]

  const totalPages = Math.max(1, Math.ceil(panels.length / PANELS_PER_PAGE))
  const currentPage = page === null ? totalPages - 1 : Math.min(page, totalPages - 1)
  const pagePanels = panels.slice(currentPage * PANELS_PER_PAGE, (currentPage + 1) * PANELS_PER_PAGE)
  const zoomed = zoom ? panels.find((p) => p.id === zoom) : null

  // Escape closes the zoom modal
  useEffect(() => {
    if (!zoom) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setZoom(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [zoom])

  const openForm = () => {
    // Ignored while a panel is being drawn.
    if (!flow.send('OPEN')) return
    setError(null)
    gallery.reload() // make sure we continue from the real latest panel
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    const scene = text.trim().slice(0, TEXT_MAX)
    if (!scene) return
    // Only allowed from the open form: a second tap while drawing is ignored.
    if (!flow.send('SUBMIT')) return
    setError(null)

    // Continuity: the previous panel matters most, earlier ones set the scene.
    const earlier = recent.slice(0, -1).map((p) => p.text.slice(0, 120)).join(' Then: ')
    const context = [
      earlier && `Story so far: ${earlier}.`,
      previous && `Previous panel: "${previous.text.slice(0, 200)}".`,
    ].filter(Boolean).join(' ')

    let url
    try {
      url = await generateImage(
        `Comic book panel, dramatic illustration, bold outlines, vibrant colors, cinematic composition. ${context} This panel shows: ${scene}. Keep the same characters and setting style as the previous panels.`,
        { width: 512, height: 384 }
      )
    } catch (err) {
      if (aliveRef.current) {
        setError(errorText(err, 'Image generation failed. Please try again.'))
        flow.send('DRAW_FAILED')
      }
      return
    }
    if (!aliveRef.current || !flow.send('DRAWN')) return
    try {
      await gallery.add({ imageUrl: url, text: scene, meta: previous ? { after: previous.id } : {} })
      if (!aliveRef.current) return
      session.award(pts)
      setText('')
      setPage(null) // jump to the newest page
      flow.send('ADDED')
    } catch (err) {
      if (!aliveRef.current) return
      setError(errorText(err, 'Could not add your panel to the comic. Please try again.'))
      flow.send('ADD_FAILED')
    }
  }

  const handleVote = async (id) => {
    try {
      await gallery.vote(id)
    } catch (err) {
      setError(errorText(err, 'Vote failed. Please try again.'))
    }
  }

  return (
    <div className="flex flex-col gap-4" {...flow.attrs}>
      {/* Header bar */}
      <div className="brutalist-card p-3 sm:p-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <BookOpen className="w-5 h-5 text-navy shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-black text-navy/50 uppercase">Shared Comic</p>
            <p className="text-base sm:text-lg font-black text-navy">{panels.length} Panel{panels.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={openForm}
          className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 text-white text-xs sm:text-sm font-black uppercase shrink-0"
          style={{ border: '2px solid #1A1A2E', background: '#FF2D55' }}>
          <Plus className="w-4 h-4" /> Add Panel
        </button>
        <div className="text-right">
          <p className="text-[10px] sm:text-xs font-black text-navy/50 uppercase">Score</p>
          <p className="text-xl sm:text-2xl font-black text-primary">{session.total}</p>
        </div>
      </div>
      {(session.savedNote || session.unsaved > 0) && (
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs font-bold text-navy/50 -mt-2">
          {session.savedNote && <span className="text-[#16a34a]">{session.savedNote}</span>}
          {session.unsaved > 0 && (
            <>
              <span>{session.unsaved} pts unsaved. Saved when you leave.</span>
              <button onClick={session.save} className="px-2 py-1 font-black uppercase text-navy" style={{ border: '2px solid #1A1A2E' }}>Save now</button>
            </>
          )}
        </div>
      )}

      <ErrorBanner message={error} />
      {gallery.error && panels.length === 0 && <ErrorBanner message="Could not load the comic." onRetry={gallery.reload} />}

      {/* Add panel form */}
      {showForm && (
        <div className="brutalist-card p-4 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-navy uppercase text-sm">Add Panel #{panels.length + 1}</h3>
            <button onClick={() => flow.send('CLOSE')} disabled={generating} aria-label="Close" className="text-navy/40 hover:text-navy disabled:opacity-30"><X className="w-4 h-4" /></button>
          </div>
          {recent.length > 0 ? (
            <div className="p-3 bg-gray-50" style={{ border: '2px solid #e5e7eb' }}>
              <p className="text-xs font-black text-navy/50 uppercase mb-2">The story so far</p>
              <div className="flex flex-col gap-2">
                {recent.map((p) => {
                  const last = p.id === previous.id
                  return (
                    <div key={p.id} className="flex gap-2 items-start">
                      <GameImage src={p.imageUrl} alt={`Panel ${p.panelNumber}`} className="shrink-0 object-cover"
                        style={{ width: last ? 96 : 56, aspectRatio: '4 / 3', border: `2px solid ${last ? '#FF2D55' : '#1A1A2E'}` }} />
                      <p className={`text-xs font-medium min-w-0 break-words ${last ? 'text-navy' : 'text-navy/60'}`}>
                        <span className="font-black">#{p.panelNumber}{last ? ' (last)' : ''}:</span> {p.text}
                      </p>
                    </div>
                  )
                })}
              </div>
              <p className="text-[11px] text-navy/50 font-bold mt-2">What happens next?</p>
            </div>
          ) : (
            <p className="text-xs text-navy/50 font-medium">You are starting the comic. Set the scene and introduce a hero!</p>
          )}
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div>
              <label htmlFor="comic-text" className="text-xs font-black text-navy/50 uppercase block mb-1">Your panel</label>
              <textarea id="comic-text" autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={TEXT_MAX}
                placeholder={previous ? 'Suddenly, the lights go out...' : 'The hero steps into a neon-lit alley...'}
                className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium resize-none"
                style={{ border: '3px solid #1A1A2E' }} />
            </div>
            <p className="text-xs text-navy/40 font-medium">The AI draws your panel using the last panel as context, so the story stays connected.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => flow.send('CLOSE')} disabled={generating}
                className="flex-1 py-2 text-navy text-sm font-black uppercase hover:bg-gray-100 disabled:opacity-40"
                style={{ border: '2px solid #1A1A2E' }}>Cancel</button>
              <button type="submit" disabled={!text.trim() || generating}
                className="flex-1 py-2 text-white text-sm font-black uppercase disabled:opacity-40"
                style={{ border: '2px solid #1A1A2E', background: '#FF2D55' }}>
                {generating ? '✦ Drawing...' : `Create Panel (+${pts} pts)`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Comic page grid */}
      {panels.length === 0 && !showForm ? (
        <div className="text-center py-16" style={{ border: '3px dashed #1A1A2E' }}>
          <BookOpen className="w-12 h-12 text-navy/30 mx-auto mb-3" />
          <p className="font-black text-navy/50 uppercase text-sm">{gallery.loading ? 'Loading the comic...' : 'No panels yet'}</p>
          {!gallery.loading && <p className="text-navy/40 text-xs mt-1 font-medium">Be the first to add a panel!</p>}
        </div>
      ) : panels.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pagePanels.map((panel) => (
              <div key={panel.id} className="flex flex-col bg-white" style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
                <button type="button" onClick={() => setZoom(panel.id)} className="block p-0 text-left"
                  style={{ position: 'relative', aspectRatio: '4/3', background: '#f3f4f6', overflow: 'hidden' }}>
                  <GameImage src={panel.imageUrl} alt={`Panel ${panel.panelNumber}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <span style={{ position: 'absolute', top: 6, left: 6, background: '#1A1A2E', color: 'white', padding: '2px 8px', fontSize: 11, fontWeight: 900 }}>#{panel.panelNumber}</span>
                </button>
                <div className="flex items-start justify-between gap-2" style={{ padding: '8px 12px', borderTop: '2px solid #1A1A2E' }}>
                  <div className="min-w-0">
                    <p className="text-sm text-navy font-medium leading-snug line-clamp-2 break-words">{panel.text}</p>
                    <p className="text-xs text-navy/40 mt-1 font-bold truncate">{panel.avatar || '👤'} {panel.username || 'Guest'}</p>
                  </div>
                  <VoteButton item={panel} onVote={handleVote} />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}
                className="flex items-center gap-1 px-3 py-2 text-xs font-black uppercase disabled:opacity-30"
                style={{ border: '2px solid #1A1A2E' }}>
                <ChevronLeft className="w-3 h-3" /> Prev
              </button>
              <span className="text-sm font-black text-navy">Page {currentPage + 1} / {totalPages}</span>
              <button onClick={() => setPage(currentPage + 1 >= totalPages - 1 ? null : currentPage + 1)} disabled={currentPage >= totalPages - 1}
                className="flex items-center gap-1 px-3 py-2 text-xs font-black uppercase disabled:opacity-30"
                style={{ border: '2px solid #1A1A2E' }}>
                Next <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Zoom modal */}
      {zoomed && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4" onClick={() => setZoom(null)}>
          <div className="max-w-lg w-full bg-white" style={{ border: '4px solid #1A1A2E' }} onClick={(e) => e.stopPropagation()}>
            <GameImage eager src={zoomed.imageUrl} alt="" className="w-full" style={{ display: 'block' }} />
            <div className="flex items-start justify-between gap-2" style={{ padding: '12px 16px', borderTop: '3px solid #1A1A2E' }}>
              <div className="min-w-0">
                <p className="text-sm text-navy font-medium break-words">{zoomed.text}</p>
                <p className="text-xs text-navy/40 mt-1 font-bold">{zoomed.username || 'Guest'} · Panel #{zoomed.panelNumber}</p>
              </div>
              <VoteButton item={zoomed} onVote={handleVote} />
            </div>
            <button onClick={() => setZoom(null)} className="w-full py-2 bg-navy text-white text-xs font-black uppercase">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

function VoteButton({ item, onVote }) {
  return (
    <button onClick={() => onVote(item.id)}
      aria-label={item.voted ? 'Remove your vote' : 'Vote for this panel'}
      title={item.voted ? 'Remove your vote' : 'Vote for this panel'}
      className={`shrink-0 px-2 py-0.5 text-xs font-black ${item.voted ? 'bg-primary text-white' : 'text-navy hover:text-primary bg-white'}`}
      style={{ border: '2px solid #1A1A2E' }}>
      ♥ {item.votes || 0}
    </button>
  )
}

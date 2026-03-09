import { useState } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'
import { BookOpen, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react'

const STORAGE_KEY = 'ai_arcade_comic_panels'
const PANELS_PER_PAGE = 6

export default function CommunityComicGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const [panels, setPanels] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
  const [page, setPage] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [text, setText] = useState('')
  const [generating, setGenerating] = useState(false)
  const [score, setScore] = useState(0)
  const [error, setError] = useState(null)
  const [zoom, setZoom] = useState(null)

  const totalPages = Math.max(1, Math.ceil(panels.length / PANELS_PER_PAGE))
  const pagePanels = panels.slice(page * PANELS_PER_PAGE, (page + 1) * PANELS_PER_PAGE)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!text.trim() || generating) return
    setGenerating(true)
    setError(null)

    // Build context from last 3 panels
    const recent = panels.slice(-3).map(p => p.text).join('. ')
    const contextPrompt = recent ? `Continuing from: "${recent}". New scene: ${text.trim()}` : text.trim()

    try {
      const url = await generateImage(
        `Comic book panel art style, dramatic illustration. ${contextPrompt}. Bold outlines, vibrant colors, cinematic composition.`,
        { width: 512, height: 384 }
      )
      const panel = {
        id: Date.now(),
        url,
        text: text.trim(),
        author: username,
        panelNumber: panels.length + 1,
      }
      const updated = [...panels, panel]
      setPanels(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      const pts = game.pointsPerAction || 80
      setScore(s => s + pts)
      addScore(game.id, username, pts, { text })
      setText('')
      setShowForm(false)
      // Jump to last page
      setPage(Math.floor(updated.length / PANELS_PER_PAGE))
    } catch (err) {
      setError('Generation failed — check your Fal.ai key.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex items-center justify-between brutalist-card p-4">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-navy" />
          <div>
            <p className="text-xs font-black text-navy/50 uppercase">Community Comic</p>
            <p className="text-lg font-black text-navy">{panels.length} Panel{panels.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button onClick={() => { setShowForm(true); setError(null) }}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-black uppercase"
          style={{ border: '2px solid #1A1A2E', background: '#FF2D55' }}>
          <Plus className="w-4 h-4" /> Add Panel
        </button>
        <div className="text-right"><p className="text-xs font-black text-navy/50 uppercase">Score</p><p className="text-2xl font-black text-primary">{score}</p></div>
      </div>

      {error && <div className="p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium">{error}</div>}

      {/* Add panel form */}
      {showForm && (
        <div className="brutalist-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-navy uppercase text-sm">Add Panel #{panels.length + 1}</h3>
            <button onClick={() => setShowForm(false)} className="text-navy/40 hover:text-navy"><X className="w-4 h-4" /></button>
          </div>
          {panels.length > 0 && (
            <div className="p-3 bg-gray-50" style={{ border: '2px solid #e5e7eb' }}>
              <p className="text-xs font-black text-navy/50 uppercase mb-2">Story so far (last 3 panels):</p>
              {panels.slice(-3).map(p => (
                <p key={p.id} className="text-xs text-navy/70 font-medium">
                  <span className="font-black">#{p.panelNumber}:</span> {p.text.slice(0, 90)}{p.text.length > 90 ? '...' : ''}
                </p>
              ))}
            </div>
          )}
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-black text-navy/50 uppercase block mb-1">Panel text / scene description</label>
              <textarea autoFocus value={text} onChange={e => setText(e.target.value)} rows={3}
                placeholder="The hero steps into the neon-lit alley, shadow at their heels..."
                className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium resize-none"
                style={{ border: '3px solid #1A1A2E' }} />
            </div>
            <p className="text-xs text-navy/40 font-medium">AI will generate comic-style art based on your text and story context.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 py-2 text-navy text-sm font-black uppercase hover:bg-gray-100"
                style={{ border: '2px solid #1A1A2E' }}>Cancel</button>
              <button type="submit" disabled={!text.trim() || generating}
                className="flex-1 py-2 text-white text-sm font-black uppercase disabled:opacity-40"
                style={{ border: '2px solid #1A1A2E', background: '#FF2D55' }}>
                {generating ? '✦ Generating...' : `Create Panel (+${game.pointsPerAction} pts)`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Comic page grid */}
      {panels.length === 0 && !showForm ? (
        <div className="text-center py-16" style={{ border: '3px dashed #1A1A2E' }}>
          <BookOpen className="w-12 h-12 text-navy/30 mx-auto mb-3" />
          <p className="font-black text-navy/50 uppercase text-sm">No panels yet</p>
          <p className="text-navy/40 text-xs mt-1 font-medium">Be the first to add a panel!</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {pagePanels.map(panel => (
              <div key={panel.id} className="flex flex-col" style={{ border: '3px solid #1A1A2E', overflow: 'hidden', cursor: 'pointer' }}
                onClick={() => setZoom(panel)}>
                <div style={{ position: 'relative', aspectRatio: '4/3', background: '#f3f4f6', overflow: 'hidden' }}>
                  <img src={panel.url} alt={`Panel ${panel.panelNumber}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', top: 6, left: 6, background: '#1A1A2E', color: 'white', padding: '2px 8px', fontSize: 11, fontWeight: 900 }}>#{panel.panelNumber}</div>
                </div>
                <div style={{ padding: '8px 12px', background: 'white', borderTop: '2px solid #1A1A2E' }}>
                  <p className="text-sm text-navy font-medium leading-snug line-clamp-2">{panel.text}</p>
                  <p className="text-xs text-navy/40 mt-1 font-bold">— {panel.author}</p>
                </div>
              </div>
            ))}
            {/* Empty slots */}
            {pagePanels.length < PANELS_PER_PAGE && Array.from({ length: PANELS_PER_PAGE - pagePanels.length }).map((_, i) => (
              <div key={`e${i}`} className="flex items-center justify-center" style={{ aspectRatio: '4/3', border: '3px dashed #d1d5db' }}>
                <p className="text-navy/20 text-sm font-medium">Empty slot</p>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="flex items-center gap-1 px-3 py-2 text-xs font-black uppercase disabled:opacity-30"
              style={{ border: '2px solid #1A1A2E' }}>
              <ChevronLeft className="w-3 h-3" /> Prev
            </button>
            <span className="text-sm font-black text-navy">Page {page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="flex items-center gap-1 px-3 py-2 text-xs font-black uppercase disabled:opacity-30"
              style={{ border: '2px solid #1A1A2E' }}>
              Next <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </>
      )}

      {/* Zoom modal */}
      {zoom && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setZoom(null)}>
          <div className="max-w-lg w-full" style={{ border: '4px solid #1A1A2E' }} onClick={e => e.stopPropagation()}>
            <img src={zoom.url} alt="" className="w-full" style={{ display: 'block' }} />
            <div style={{ background: 'white', padding: '12px 16px', borderTop: '3px solid #1A1A2E' }}>
              <p className="text-sm text-navy font-medium">{zoom.text}</p>
              <p className="text-xs text-navy/40 mt-1 font-bold">— {zoom.author} · Panel #{zoom.panelNumber}</p>
            </div>
            <button onClick={() => setZoom(null)} className="w-full py-2 bg-navy text-white text-xs font-black uppercase">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'

const STORAGE_KEY = 'ai_arcade_mosaic'
const ACCENT_COLORS = ['#FF2D55','#C8FF00','#FF6B35','#FFD600','#8B5CF6','#00D4FF','#FF9500','#34D399']

export default function MosaicGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const [pieces, setPieces] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
  const [prompt, setPrompt] = useState('')
  const [accent, setAccent] = useState(ACCENT_COLORS[0])
  const [generating, setGenerating] = useState(false)
  const [score, setScore] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState(null)
  const [hover, setHover] = useState(null)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!prompt.trim() || generating) return
    setGenerating(true)
    setError(null)
    try {
      const url = await generateImage(
        `${prompt.trim()}, mosaic tile art, colorful geometric abstract, vibrant`,
        { width: 512, height: 512 }
      )
      const piece = { id: Date.now(), url, prompt: prompt.trim(), accent, author: username }
      const updated = [...pieces, piece].slice(-60)
      setPieces(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      const pts = game.pointsPerAction || 60
      setScore(s => s + pts)
      addScore(game.id, username, pts, { prompt })
      setPrompt('')
      setShowForm(false)
    } catch (err) {
      setError('Generation failed — check your Fal.ai key.')
    } finally {
      setGenerating(false)
    }
  }

  const mine = pieces.filter(p => p.author === username).length

  return (
    <div className="flex flex-col gap-4">
      {/* Stats + toggle */}
      <div className="flex items-center justify-between brutalist-card p-4">
        <div><p className="text-xs font-black text-navy/50 uppercase">My Pieces</p><p className="text-3xl font-black text-navy">{mine}</p></div>
        <div className="flex gap-2">
          <button onClick={() => { setShowForm(false) }}
            className="px-3 py-2 text-xs font-black uppercase transition-colors"
            style={{ border: '2px solid #1A1A2E', background: !showForm ? '#1A1A2E' : 'white', color: !showForm ? 'white' : '#1A1A2E' }}>
            🧩 Mosaic
          </button>
          <button onClick={() => { setShowForm(true); setError(null) }}
            className="px-3 py-2 text-xs font-black uppercase transition-colors"
            style={{ border: '2px solid #1A1A2E', background: showForm ? '#FF2D55' : 'white', color: showForm ? 'white' : '#1A1A2E' }}>
            + Add Piece
          </button>
        </div>
        <div className="text-right"><p className="text-xs font-black text-navy/50 uppercase">Score</p><p className="text-3xl font-black text-primary">{score}</p></div>
      </div>

      {error && <div className="p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium">{error}</div>}

      {showForm ? (
        <form onSubmit={handleCreate} className="brutalist-card p-6 flex flex-col gap-4">
          <h3 className="font-black text-navy uppercase text-sm">Create a Mosaic Piece</h3>
          <div>
            <label className="text-xs font-black text-navy/50 uppercase block mb-1">Prompt</label>
            <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} autoFocus
              placeholder="A swirling galaxy of colors..."
              className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium"
              style={{ border: '3px solid #1A1A2E' }} />
          </div>
          <div>
            <label className="text-xs font-black text-navy/50 uppercase block mb-2">Accent Color</label>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setAccent(c)}
                  style={{ width: 32, height: 32, backgroundColor: c, border: accent === c ? '3px solid #1A1A2E' : '2px solid rgba(0,0,0,0.1)', outline: accent === c ? '2px solid white' : 'none' }}
                  className="transition-transform hover:scale-110" />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 py-3 text-navy text-sm font-black uppercase hover:bg-gray-100 transition-colors"
              style={{ border: '2px solid #1A1A2E' }}>Cancel</button>
            <button type="submit" disabled={!prompt.trim() || generating}
              className="flex-1 py-3 text-white text-sm font-black uppercase disabled:opacity-40"
              style={{ border: '2px solid #1A1A2E', background: '#FF2D55' }}>
              {generating ? 'Generating...' : `Create (+${game.pointsPerAction} pts)`}
            </button>
          </div>
        </form>
      ) : pieces.length === 0 ? (
        <div className="text-center py-16 text-navy/40 font-medium" style={{ border: '3px dashed #1A1A2E' }}>
          <p className="text-4xl mb-3">🧩</p>
          <p>No pieces yet — add the first one!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 4 }}>
          {pieces.map(piece => (
            <div key={piece.id} style={{ position: 'relative', aspectRatio: '1', overflow: 'hidden', border: `3px solid ${piece.accent}`, cursor: 'pointer' }}
              onMouseEnter={() => setHover(piece.id)} onMouseLeave={() => setHover(null)}>
              <img src={piece.url} alt={piece.prompt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {hover === piece.id && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 6 }}>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 9, textAlign: 'right', lineHeight: 1.3 }}>{piece.prompt}</p>
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9 }}>— {piece.author}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState, useEffect } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import * as fal from '@fal-ai/client'

const STORAGE_KEY = 'ai_arcade_mosaic_pieces'
const COLORS = ['#FF2D55','#C8FF00','#FF6B35','#FFD600','#8B5CF6','#00D4FF','#1E1B4B','#0F172A']

export default function MosaicGame({ game }) {
  const { user } = useAuth()
  const [pieces, setPieces] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
  const [prompt, setPrompt] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [generating, setGenerating] = useState(false)
  const [score, setScore] = useState(0)
  const [showForm, setShowForm] = useState(false)

  const savePieces = (updated) => {
    setPieces(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!prompt.trim() || generating) return
    setGenerating(true)
    try {
      const result = await fal.run('fal-ai/flux/schnell', {
        input: { prompt: `${prompt.trim()}, mosaic tile art, colorful, geometric, vibrant`, image_size: 'square', num_images: 1 }
      })
      const imageUrl = result?.images?.[0]?.url
      if (imageUrl) {
        const piece = { id: Date.now(), imageUrl, prompt: prompt.trim(), color, author: user.username, timestamp: Date.now() }
        savePieces([...pieces, piece].slice(-50))
        const pts = game.pointsPerAction || 60
        setScore(s => s + pts)
        addScore(game.id, user.username, pts, { prompt })
        setPrompt('')
        setShowForm(false)
      }
    } catch (err) {
      console.error('Generation failed', err)
    } finally {
      setGenerating(false)
    }
  }

  const myPieces = pieces.filter(p => p.author === user.username).length

  return (
    <div className="flex flex-col gap-4">
      {/* Score + Add */}
      <div className="flex items-center justify-between brutalist-card p-3">
        <div><p className="text-xs font-black text-navy/50 uppercase">My Pieces</p><p className="text-2xl font-black text-navy">{myPieces}</p></div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-white text-sm font-black uppercase"
          style={{ border: '2px solid #1A1A2E' }}>
          {showForm ? 'View Mosaic' : '+ Add Piece'}
        </button>
        <div className="text-right"><p className="text-xs font-black text-navy/50 uppercase">Score</p><p className="text-2xl font-black text-primary">{score}</p></div>
      </div>

      {showForm ? (
        <form onSubmit={handleCreate} className="brutalist-card p-6 flex flex-col gap-4">
          <h3 className="font-black text-navy uppercase text-sm">Create a Mosaic Piece</h3>
          <div>
            <label className="text-xs font-bold text-navy/50 uppercase block mb-1">Prompt</label>
            <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)}
              placeholder="A swirling galaxy of colors..." autoFocus
              className="w-full px-4 py-2 text-navy text-sm focus:outline-none font-medium"
              style={{ border: '2px solid #1A1A2E' }} />
          </div>
          <div>
            <label className="text-xs font-bold text-navy/50 uppercase block mb-2">Accent Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-8 h-8 transition-transform hover:scale-110"
                  style={{ backgroundColor: c, border: color === c ? '3px solid #1A1A2E' : '2px solid transparent', outline: color === c ? '2px solid white' : 'none' }} />
              ))}
            </div>
          </div>
          <button type="submit" disabled={!prompt.trim() || generating}
            className="w-full py-3 bg-primary text-white font-black uppercase disabled:opacity-40"
            style={{ border: '2px solid #1A1A2E' }}>
            {generating ? 'Generating...' : `Create Piece (+${game.pointsPerAction} pts)`}
          </button>
        </form>
      ) : (
        <div>
          {pieces.length === 0 ? (
            <div className="text-center py-12 text-navy/40 font-medium">
              No pieces yet — be the first to add one!
            </div>
          ) : (
            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
              {pieces.map(piece => (
                <div key={piece.id} className="group relative aspect-square overflow-hidden cursor-pointer"
                  style={{ border: `2px solid ${piece.color}` }}>
                  <img src={piece.imageUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-end justify-end p-1">
                    <p className="text-[9px] text-white/80 text-right leading-tight">{piece.prompt}</p>
                    <p className="text-[9px] text-white/50">— {piece.author}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

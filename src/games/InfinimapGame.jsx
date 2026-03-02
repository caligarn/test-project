import { useState } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import * as fal from '@fal-ai/client'

const TILE_SIZE = 120
const GRID_COLS = 7
const GRID_ROWS = 5

function TileCell({ tile, onClick, loading }) {
  return (
    <div
      onClick={onClick}
      className="relative border border-white/10 cursor-pointer hover:border-white/40 transition-all overflow-hidden"
      style={{ width: TILE_SIZE, height: TILE_SIZE, minWidth: TILE_SIZE }}
    >
      {tile?.imageUrl ? (
        <img src={tile.imageUrl} alt="" className="w-full h-full object-cover" />
      ) : loading ? (
        <div className="w-full h-full flex items-center justify-center bg-white/5">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/60 border-t-transparent" />
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors">
          <span className="text-white/20 text-2xl">+</span>
        </div>
      )}
    </div>
  )
}

export default function InfinimapGame({ game }) {
  const { user } = useAuth()
  const [tiles, setTiles] = useState({})
  const [loadingTile, setLoadingTile] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [pendingCoord, setPendingCoord] = useState(null)
  const [score, setScore] = useState(0)
  const [showPrompt, setShowPrompt] = useState(false)

  const tileKey = (r, c) => `${r},${c}`

  const handleTileClick = (r, c) => {
    if (loadingTile) return
    setPendingCoord({ r, c })
    setPrompt('')
    setShowPrompt(true)
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!prompt.trim() || !pendingCoord) return
    const { r, c } = pendingCoord
    const key = tileKey(r, c)
    setShowPrompt(false)
    setLoadingTile(key)

    try {
      const result = await fal.run('fal-ai/flux/schnell', {
        input: { prompt: prompt.trim(), image_size: 'square', num_images: 1 }
      })
      const imageUrl = result?.images?.[0]?.url
      if (imageUrl) {
        setTiles(prev => ({ ...prev, [key]: { imageUrl, prompt } }))
        const pts = game.pointsPerAction || 50
        setScore(s => s + pts)
        addScore(game.id, user.username, pts, { prompt, tile: key })
      }
    } catch (err) {
      console.error('Generation failed', err)
    } finally {
      setLoadingTile(null)
      setPendingCoord(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between brutalist-card p-3">
        <div><p className="text-xs font-black text-navy/50 uppercase">Tiles</p><p className="text-2xl font-black text-navy">{Object.keys(tiles).length}</p></div>
        <div className="text-right"><p className="text-xs font-black text-navy/50 uppercase">Score</p><p className="text-2xl font-black text-primary">{score}</p></div>
      </div>

      <div className="overflow-auto" style={{ border: '3px solid #1A1A2E' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_COLS}, ${TILE_SIZE}px)` }}>
          {Array.from({ length: GRID_ROWS }, (_, r) =>
            Array.from({ length: GRID_COLS }, (_, c) => {
              const key = tileKey(r, c)
              return (
                <TileCell key={key} tile={tiles[key]} loading={loadingTile === key} onClick={() => handleTileClick(r, c)} />
              )
            })
          )}
        </div>
      </div>

      {showPrompt && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="brutalist-card p-6 w-full max-w-md">
            <h3 className="font-black text-navy uppercase mb-3">What to paint here?</h3>
            <form onSubmit={handleGenerate} className="flex flex-col gap-3">
              <input autoFocus type="text" placeholder="A misty mountain at dawn..."
                value={prompt} onChange={e => setPrompt(e.target.value)}
                className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium"
                style={{ border: '3px solid #1A1A2E' }} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPrompt(false)}
                  className="flex-1 py-2 text-navy text-sm font-black uppercase hover:bg-gray-100 transition-colors"
                  style={{ border: '2px solid #1A1A2E' }}>Cancel</button>
                <button type="submit" disabled={!prompt.trim()}
                  className="flex-1 py-2 bg-primary text-white text-sm font-black uppercase disabled:opacity-40"
                  style={{ border: '2px solid #1A1A2E' }}>Generate (+{game.pointsPerAction} pts)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <p className="text-center text-navy/40 text-xs font-medium">Click any empty tile to paint it with AI</p>
    </div>
  )
}

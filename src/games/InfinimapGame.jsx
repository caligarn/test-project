import { useState } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'

const GRID_COLS = 6
const GRID_ROWS = 4
const TILE_PX = 130

function TileCell({ tile, onClick, loading }) {
  return (
    <div
      onClick={onClick}
      style={{ width: TILE_PX, height: TILE_PX, border: '2px solid #1A1A2E', cursor: loading ? 'wait' : 'pointer', overflow: 'hidden', position: 'relative', flexShrink: 0 }}
    >
      {tile?.url ? (
        <img src={tile.url} alt={tile.prompt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : loading ? (
        <div style={{ width: '100%', height: '100%', background: '#1E1B4B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-spin rounded-full" style={{ width: 28, height: 28, border: '3px solid #fff', borderTopColor: 'transparent' }} />
        </div>
      ) : (
        <div style={{ width: '100%', height: '100%', background: '#13131F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          className="hover:bg-[#1E1B4B] transition-colors">
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 28 }}>+</span>
        </div>
      )}
    </div>
  )
}

const STORAGE_KEY = 'ai_arcade_infinimap'

export default function InfinimapGame({ game }) {
  const { user } = useAuth()
  const [tiles, setTiles] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'))
  const [loadingTile, setLoadingTile] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [pendingCoord, setPendingCoord] = useState(null)
  const [score, setScore] = useState(0)
  const [error, setError] = useState(null)

  const tileKey = (r, c) => `${r},${c}`

  const handleTileClick = (r, c) => {
    if (loadingTile) return
    const key = tileKey(r, c)
    if (tiles[key]) return // already painted
    setPendingCoord({ r, c })
    setPrompt('')
    setError(null)
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!prompt.trim() || !pendingCoord) return
    const { r, c } = pendingCoord
    const key = tileKey(r, c)
    setPendingCoord(null)
    setLoadingTile(key)
    setError(null)
    try {
      const url = await generateImage(prompt.trim(), { width: 512, height: 512 })
      const updated = { ...tiles, [key]: { url, prompt: prompt.trim(), author: user.username } }
      setTiles(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      const pts = game.pointsPerAction || 50
      setScore(s => s + pts)
      addScore(game.id, user.username, pts, { prompt, tile: key })
    } catch (err) {
      setError('Generation failed — check your Fal.ai key.')
    } finally {
      setLoadingTile(null)
    }
  }

  const painted = Object.keys(tiles).length
  const total = GRID_COLS * GRID_ROWS

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center justify-between brutalist-card p-4">
        <div><p className="text-xs font-black text-navy/50 uppercase">Tiles Painted</p><p className="text-3xl font-black text-navy">{painted}/{total}</p></div>
        <div className="text-center"><p className="text-xs font-black text-navy/50 uppercase">Progress</p>
          <div className="mt-1 h-3 w-32 bg-gray-200 border-2 border-navy"><div className="h-full bg-primary transition-all" style={{ width: `${(painted/total)*100}%` }} /></div>
        </div>
        <div className="text-right"><p className="text-xs font-black text-navy/50 uppercase">Score</p><p className="text-3xl font-black text-primary">{score}</p></div>
      </div>

      {error && <div className="p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium">{error}</div>}

      {/* Canvas */}
      <div style={{ overflowX: 'auto', border: '3px solid #1A1A2E' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${GRID_COLS}, ${TILE_PX}px)`, width: GRID_COLS * TILE_PX }}>
          {Array.from({ length: GRID_ROWS }, (_, r) =>
            Array.from({ length: GRID_COLS }, (_, c) => {
              const key = tileKey(r, c)
              return <TileCell key={key} tile={tiles[key]} loading={loadingTile === key} onClick={() => handleTileClick(r, c)} />
            })
          )}
        </div>
      </div>
      <p className="text-center text-navy/40 text-xs font-medium">Click any empty tile to generate AI art · Each tile earns +{game.pointsPerAction} pts</p>

      {/* Prompt modal */}
      {pendingCoord && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPendingCoord(null)}>
          <div className="brutalist-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-navy uppercase mb-1">Paint this tile</h3>
            <p className="text-xs text-navy/50 mb-4 font-medium">Row {pendingCoord.r + 1}, Col {pendingCoord.c + 1}</p>
            <form onSubmit={handleGenerate} className="flex flex-col gap-3">
              <input autoFocus type="text" placeholder="A misty mountain at dawn..." value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium"
                style={{ border: '3px solid #1A1A2E' }} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setPendingCoord(null)}
                  className="flex-1 py-2 text-navy text-sm font-black uppercase transition-colors hover:bg-gray-100"
                  style={{ border: '2px solid #1A1A2E' }}>Cancel</button>
                <button type="submit" disabled={!prompt.trim()}
                  className="flex-1 py-2 bg-primary text-white text-sm font-black uppercase disabled:opacity-40"
                  style={{ border: '2px solid #1A1A2E' }}>Generate (+{game.pointsPerAction} pts)</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

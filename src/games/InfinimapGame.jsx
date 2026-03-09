import { useState, useRef, useCallback, useEffect } from 'react'
import { addScore, getScores } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'

const TILE_PX = 130
const VISIBLE_COLS = 6
const VISIBLE_ROWS = 4

function userStorageKey(username) {
  return `ai_arcade_infinimap_${username}`
}

function loadTiles(username) {
  return JSON.parse(localStorage.getItem(userStorageKey(username)) || '{}')
}

function saveTiles(username, tiles) {
  localStorage.setItem(userStorageKey(username), JSON.stringify(tiles))
}

function loadScore(username) {
  return getScores()
    .filter(s => s.gameId === 'infinimap' && s.username === username)
    .reduce((sum, s) => sum + s.score, 0)
}

function TileCell({ tile, onClick, loading, coordLabel }) {
  return (
    <div
      onClick={onClick}
      title={tile?.prompt || coordLabel}
      style={{
        width: TILE_PX,
        height: TILE_PX,
        border: '2px solid #1A1A2E',
        cursor: loading ? 'wait' : 'pointer',
        overflow: 'hidden',
        position: 'relative',
        flexShrink: 0,
      }}
    >
      {tile?.url ? (
        <>
          <img
            src={tile.url}
            alt={tile.prompt}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all flex items-end justify-center opacity-0 hover:opacity-100">
            <p className="text-white text-[10px] font-bold px-2 py-1 truncate w-full text-center bg-black/60">
              {tile.prompt}
            </p>
          </div>
        </>
      ) : loading ? (
        <div style={{ width: '100%', height: '100%', background: '#1E1B4B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            className="animate-spin rounded-full"
            style={{ width: 28, height: 28, border: '3px solid #fff', borderTopColor: 'transparent' }}
          />
        </div>
      ) : (
        <div
          style={{ width: '100%', height: '100%', background: '#13131F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          className="hover:bg-[#1E1B4B] transition-colors"
        >
          <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 28 }}>+</span>
        </div>
      )}
    </div>
  )
}

export default function InfinimapGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const [tiles, setTiles] = useState(() => loadTiles(username))
  const [loadingTile, setLoadingTile] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [pendingCoord, setPendingCoord] = useState(null)
  const [score, setScore] = useState(() => loadScore(username))
  const [error, setError] = useState(null)

  // Camera: which tile coords are at the top-left of the viewport
  const [camera, setCamera] = useState({ col: 0, row: 0 })

  // Drag-to-pan
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef(null)
  const cameraStart = useRef(null)
  const hasDragged = useRef(false)

  const tileKey = (r, c) => `${r},${c}`

  // Keyboard navigation (WASD / Arrows)
  useEffect(() => {
    const handler = (e) => {
      if (pendingCoord) return
      const step = e.shiftKey ? 3 : 1
      switch (e.key) {
        case 'ArrowUp':    case 'w': case 'W': setCamera(c => ({ ...c, row: c.row - step })); e.preventDefault(); break
        case 'ArrowDown':  case 's': case 'S': setCamera(c => ({ ...c, row: c.row + step })); e.preventDefault(); break
        case 'ArrowLeft':  case 'a': case 'A': setCamera(c => ({ ...c, col: c.col - step })); e.preventDefault(); break
        case 'ArrowRight': case 'd': case 'D': setCamera(c => ({ ...c, col: c.col + step })); e.preventDefault(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pendingCoord])

  // Pointer drag-to-pan
  const handlePointerDown = useCallback((e) => {
    if (e.target.closest('button, form, input')) return
    setDragging(true)
    hasDragged.current = false
    dragStart.current = { x: e.clientX, y: e.clientY }
    cameraStart.current = { ...camera }
  }, [camera])

  const handlePointerMove = useCallback((e) => {
    if (!dragging || !dragStart.current || !cameraStart.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) hasDragged.current = true
    const colDelta = Math.round(-dx / TILE_PX)
    const rowDelta = Math.round(-dy / TILE_PX)
    setCamera({
      col: cameraStart.current.col + colDelta,
      row: cameraStart.current.row + rowDelta,
    })
  }, [dragging])

  const handlePointerUp = useCallback(() => {
    setDragging(false)
    dragStart.current = null
    cameraStart.current = null
  }, [])

  const handleTileClick = (r, c) => {
    if (hasDragged.current) return
    if (loadingTile) return
    const key = tileKey(r, c)
    if (tiles[key]) return
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
      const updated = { ...tiles, [key]: { url, prompt: prompt.trim(), author: username } }
      setTiles(updated)
      saveTiles(username, updated)
      const pts = game.pointsPerAction || 50
      setScore(s => s + pts)
      addScore(game.id, username, pts, { prompt: prompt.trim(), tile: key })
    } catch {
      setError('Generation failed — check your Fal.ai key.')
    } finally {
      setLoadingTile(null)
    }
  }

  const navigate = (dr, dc) => setCamera(c => ({ col: c.col + dc, row: c.row + dr }))
  const goHome = () => setCamera({ col: 0, row: 0 })

  const painted = Object.keys(tiles).length

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center justify-between brutalist-card p-4">
        <div>
          <p className="text-xs font-black text-navy/50 uppercase">Tiles Painted</p>
          <p className="text-3xl font-black text-navy">{painted}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-black text-navy/50 uppercase">Position</p>
          <p className="text-sm font-black text-navy">{camera.col}, {camera.row}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-navy/50 uppercase">Score</p>
          <p className="text-3xl font-black text-primary">{score}</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium">{error}</div>}

      {/* Navigation controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <button onClick={() => navigate(-1, 0)} className="w-8 h-8 flex items-center justify-center text-navy font-black text-sm hover:bg-gray-100 transition-colors" style={{ border: '2px solid #1A1A2E' }}>
            &uarr;
          </button>
          <button onClick={() => navigate(1, 0)} className="w-8 h-8 flex items-center justify-center text-navy font-black text-sm hover:bg-gray-100 transition-colors" style={{ border: '2px solid #1A1A2E' }}>
            &darr;
          </button>
          <button onClick={() => navigate(0, -1)} className="w-8 h-8 flex items-center justify-center text-navy font-black text-sm hover:bg-gray-100 transition-colors" style={{ border: '2px solid #1A1A2E' }}>
            &larr;
          </button>
          <button onClick={() => navigate(0, 1)} className="w-8 h-8 flex items-center justify-center text-navy font-black text-sm hover:bg-gray-100 transition-colors" style={{ border: '2px solid #1A1A2E' }}>
            &rarr;
          </button>
          <button onClick={goHome} className="h-8 px-2 flex items-center justify-center text-navy text-[10px] font-black uppercase hover:bg-gray-100 transition-colors" style={{ border: '2px solid #1A1A2E' }}>
            0,0
          </button>
        </div>
        <p className="text-navy/30 text-[10px] font-bold uppercase hidden sm:block">WASD / Arrows · Drag to pan · Click to paint</p>
      </div>

      {/* Infinite Canvas */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{
          overflow: 'hidden',
          border: '3px solid #1A1A2E',
          cursor: dragging ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${VISIBLE_COLS}, ${TILE_PX}px)`,
            width: VISIBLE_COLS * TILE_PX,
          }}
        >
          {Array.from({ length: VISIBLE_ROWS }, (_, ri) =>
            Array.from({ length: VISIBLE_COLS }, (_, ci) => {
              const r = camera.row + ri
              const c = camera.col + ci
              const key = tileKey(r, c)
              return (
                <TileCell
                  key={key}
                  tile={tiles[key]}
                  loading={loadingTile === key}
                  onClick={() => handleTileClick(r, c)}
                  coordLabel={`${c}, ${r}`}
                />
              )
            })
          )}
        </div>
      </div>
      <p className="text-center text-navy/40 text-xs font-medium">
        Infinite canvas — explore in every direction · Each tile earns +{game.pointsPerAction} pts
      </p>

      {/* Prompt modal */}
      {pendingCoord && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setPendingCoord(null)}
        >
          <div className="brutalist-card p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-navy uppercase mb-1">Paint this tile</h3>
            <p className="text-xs text-navy/50 mb-4 font-medium">
              Position ({pendingCoord.c}, {pendingCoord.r})
            </p>
            <form onSubmit={handleGenerate} className="flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                placeholder="A misty mountain at dawn..."
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium"
                style={{ border: '3px solid #1A1A2E' }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPendingCoord(null)}
                  className="flex-1 py-2 text-navy text-sm font-black uppercase transition-colors hover:bg-gray-100"
                  style={{ border: '2px solid #1A1A2E' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!prompt.trim()}
                  className="flex-1 py-2 bg-primary text-white text-sm font-black uppercase disabled:opacity-40"
                  style={{ border: '2px solid #1A1A2E' }}
                >
                  Generate (+{game.pointsPerAction} pts)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

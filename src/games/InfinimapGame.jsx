import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'
import { api } from '../lib/api'
import { withTicket } from '../lib/play'
import { useMachine } from '../hooks/useMachine'
import { infinimapMachine } from '../machines/infinimap.js'
import StatsBar from '../components/game/StatsBar'
import ErrorBanner from '../components/game/ErrorBanner'
import GameImage from '../components/game/GameImage'

// One shared board for everyone (server: GET/POST /api/tiles/main).
const BOARD = 'main'
const POLL_MS = 15000
const MAP_LIMIT = 500 // the server accepts |x|, |y| <= 500
const MAX_CONCURRENT = 3
const PROMPT_MAX = 200
// One session = up to this many tiles, then the score is saved and a new
// session starts. 18 x 50 = 900, under maxScore (1000) in gameLimits.js.
const SESSION_MAX = 18

// A daily theme gives strangers a shared idea to build on.
const THEMES = [
  'a floating island kingdom',
  'an underwater city',
  'a candy land with rivers of syrup',
  'a neon cyberpunk metropolis',
  'a giant enchanted forest',
  'a desert of crystal dunes',
  'a busy space harbour',
  'a cozy winter village',
  'a jungle full of ancient ruins',
  'a steampunk sky city',
]

const DIRS = [
  { dx: 0, dy: -1, label: 'Above' },
  { dx: -1, dy: 0, label: 'Left' },
  { dx: 1, dy: 0, label: 'Right' },
  { dx: 0, dy: 1, label: 'Below' },
  { dx: -1, dy: -1, label: 'Top left' },
  { dx: 1, dy: -1, label: 'Top right' },
  { dx: -1, dy: 1, label: 'Bottom left' },
  { dx: 1, dy: 1, label: 'Bottom right' },
]

const key = (x, y) => `${x},${y}`
const clampCoord = (n) => Math.max(-MAP_LIMIT, Math.min(MAP_LIMIT, n))

function todayTheme() {
  const day = Math.floor(Date.now() / 86400000)
  return THEMES[day % THEMES.length]
}

function errorText(err, fallback) {
  return err?.status && err.status !== 500 && err.message ? err.message : fallback
}

function neighboursOf(tiles, x, y) {
  return DIRS.map((d) => ({ ...d, tile: tiles[key(x + d.dx, y + d.dy)] })).filter((n) => n.tile)
}

function buildPrompt(userPrompt, neighbours, blend) {
  const near = blend
    ? neighbours.slice(0, 4).map((n) => `${n.label.toLowerCase()}: ${n.tile.prompt.slice(0, 80)}`)
    : []
  const context = near.length
    ? ` Continue the neighbouring tiles so the edges flow together (${near.join('; ')}).`
    : ''
  return `${userPrompt}. One square tile of a giant shared painted world, colorful illustrated style, fills the whole frame.${context}`
}

/** Nearest empty tile around (x, y), searching outward ring by ring. */
function nearestFree(tiles, busy, x, y, maxRadius = 4) {
  for (let r = 1; r <= maxRadius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue
        const nx = x + dx
        const ny = y + dy
        if (Math.abs(nx) > MAP_LIMIT || Math.abs(ny) > MAP_LIMIT) continue
        const k = key(nx, ny)
        if (!tiles[k] && !busy.has(k)) return { x: nx, y: ny }
      }
    }
  }
  return null
}

function sameTiles(a, b) {
  const ak = Object.keys(a)
  if (ak.length !== Object.keys(b).length) return false
  return ak.every((k) => b[k] && b[k].createdAt === a[k].createdAt)
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
    addScore(gameId, username, s.points, { tiles: s.count })
    setUnsaved(0)
    setSavedNote(`Saved ${s.points} pts for ${s.count} tile${s.count === 1 ? '' : 's'}.`)
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

function TileCell({ tile, loading, size, label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={tile ? `Tile ${label}: ${tile.prompt}` : `Paint empty tile ${label}`}
      title={tile ? tile.prompt : `Paint tile ${label}`}
      className="relative overflow-hidden block p-0"
      style={{
        width: size,
        height: size,
        border: selected ? '2px solid #C8FF00' : '1px solid #2A2A40',
        cursor: loading ? 'wait' : 'pointer',
        background: tile ? '#13131F' : loading ? '#1E1B4B' : '#13131F',
      }}
    >
      {tile ? (
        <GameImage src={tile.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
      ) : loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="animate-spin rounded-full" style={{ width: 24, height: 24, border: '3px solid #fff', borderTopColor: 'transparent' }} />
        </span>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center hover:bg-[#1E1B4B] transition-colors" style={{ color: 'rgba(255,255,255,0.18)', fontSize: Math.round(size / 4) }}>+</span>
      )}
    </button>
  )
}

export default function InfinimapGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const pts = game.pointsPerAction || 50
  const theme = useMemo(todayTheme, [])

  // The player's step (see src/machines/infinimap.js). Everything below is data.
  const flow = useMachine(infinimapMachine)
  const [tiles, setTiles] = useState({})
  // Polling errors come and go on their own, independent of the flow.
  const [loadError, setLoadError] = useState(null)
  // Tiles painting in the background (up to MAX_CONCURRENT at once).
  const [loadingKeys, setLoadingKeys] = useState(() => new Set())
  const [pending, setPending] = useState(null) // { x, y } of the tile being prompted (composing)
  const [prompt, setPrompt] = useState('')
  const [blend, setBlend] = useState(true)
  // Inspect panel for a painted tile: a view, works in any step.
  const [selected, setSelected] = useState(null) // { x, y } of a painted tile
  // Art whose tile was taken first: { imageUrl, prompt, x, y }. Offered in the
  // 'taken' step. A ref mirrors it so async code sees the newest one.
  const [orphan, setOrphanState] = useState(null)
  const orphanRef = useRef(null)
  const setOrphan = (o) => {
    orphanRef.current = o
    setOrphanState(o)
  }
  // One-line messages (toasts). Not part of the flow.
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)
  const [mine, setMine] = useState(0)
  const session = useSessionScore(game.id, username)

  const { send } = flow
  const tilesRef = useRef(tiles)
  useEffect(() => { tilesRef.current = tiles }, [tiles])
  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false }
  }, [])

  // ---- load + poll the shared board --------------------------------------
  const refresh = useCallback(async () => {
    try {
      const data = await api(`/tiles/${BOARD}`)
      if (!aliveRef.current) return tilesRef.current
      const next = data.tiles || {}
      setTiles((prev) => (sameTiles(prev, next) ? prev : next))
      setLoadError(null)
      return next
    } catch (err) {
      if (aliveRef.current) setLoadError(errorText(err, 'Could not load the map.'))
      return tilesRef.current
    } finally {
      // Only the first load moves the flow; later polls are ignored here.
      if (aliveRef.current) send('LOADED')
    }
  }, [send])

  useEffect(() => {
    refresh()
    const id = setInterval(() => {
      if (!document.hidden) refresh()
    }, POLL_MS)
    const onVisible = () => { if (!document.hidden) refresh() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  // ---- viewport size (fits the screen, fewer columns on phones) ------------
  const viewRef = useRef(null)
  const [viewWidth, setViewWidth] = useState(0)
  useEffect(() => {
    const el = viewRef.current
    if (!el) return
    const measure = () => setViewWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const cols = viewWidth && viewWidth < 520 ? 4 : 6
  const rows = cols === 4 ? 5 : 4
  const size = viewWidth ? Math.floor(viewWidth / cols) : 100

  // Camera = the tile at the centre of the view.
  const [camera, setCamera] = useState({ x: 0, y: 0 })
  const left = camera.x - Math.floor(cols / 2)
  const top = camera.y - Math.floor(rows / 2)
  const move = useCallback((dx, dy) => setCamera((c) => ({ x: clampCoord(c.x + dx), y: clampCoord(c.y + dy) })), [])

  // Keyboard navigation (WASD / arrows), off while the prompt dialog is open
  const composing = flow.is('composing')
  useEffect(() => {
    const handler = (e) => {
      if (composing) return
      if (e.target instanceof Element && e.target.matches('input, textarea, select, [contenteditable]')) return
      const step = e.shiftKey ? 3 : 1
      const moves = {
        ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
        ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
        ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
        ArrowRight: [1, 0], d: [1, 0], D: [1, 0],
      }
      const m = moves[e.key]
      if (!m) return
      e.preventDefault()
      move(m[0] * step, m[1] * step)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [composing, move])

  // Drag to pan. Pointer capture starts only once the pointer really moves,
  // so a plain tap still reaches the tile button.
  const drag = useRef(null)
  const dragged = useRef(false)
  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    drag.current = { x: e.clientX, y: e.clientY, cam: camera, id: e.pointerId, captured: false }
    dragged.current = false
  }
  const onPointerMove = (e) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.captured) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      d.captured = true
      dragged.current = true
      try { e.currentTarget.setPointerCapture(d.id) } catch { /* pointer already gone */ }
    }
    setCamera({ x: clampCoord(d.cam.x - Math.round(dx / size)), y: clampCoord(d.cam.y - Math.round(dy / size)) })
  }
  const onPointerUp = () => { drag.current = null }
  const onClickCapture = (e) => {
    if (dragged.current) {
      e.stopPropagation()
      e.preventDefault()
      dragged.current = false
    }
  }

  // ---- painting -------------------------------------------------------------
  const setBusy = (k, on) => setLoadingKeys((prev) => {
    const next = new Set(prev)
    if (on) next.add(k)
    else next.delete(k)
    return next
  })

  const handleTileClick = (x, y) => {
    const k = key(x, y)
    if (tiles[k]) {
      setSelected((s) => (s && s.x === x && s.y === y ? null : { x, y }))
      return
    }
    if (loadingKeys.has(k)) return
    if (loadingKeys.size >= MAX_CONCURRENT) {
      setNotice(`Up to ${MAX_CONCURRENT} tiles can paint at once. Wait for one to finish.`)
      return
    }
    // Allowed while browsing or while leftover art is offered.
    if (!flow.send('COMPOSE')) return
    setSelected(null)
    setPending({ x, y })
    setPrompt('')
    setError(null)
    setNotice(null)
  }

  /** Close the prompt dialog. Leftover art that arrived meanwhile is offered now. */
  const closeComposer = (event) => {
    if (!flow.send(event)) return false
    if (orphanRef.current) flow.send('TAKEN')
    return true
  }

  /** POST the art to a tile. Returns true when placed, false when taken. */
  const place = async (x, y, imageUrl, tilePrompt) => {
    try {
      const { tile } = await withTicket((ticket) => api(`/tiles/${BOARD}`, {
        method: 'POST', body: { x, y, imageUrl, prompt: tilePrompt }, ticket,
      }), game.id)
      if (aliveRef.current) setTiles((t) => ({ ...t, [key(x, y)]: tile }))
      return true
    } catch (err) {
      if (err?.status === 409) return false
      throw err
    }
  }

  const tileTaken = (x, y, imageUrl, tilePrompt) => {
    setOrphan({ imageUrl, prompt: tilePrompt, x, y })
    // Ignored while composing or placing: closeComposer / placeOrphan offer it after.
    flow.send('TAKEN')
  }

  const placed = () => {
    session.award(pts)
    setMine((m) => m + 1)
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    const tilePrompt = prompt.trim().slice(0, PROMPT_MAX)
    if (!tilePrompt || !pending) return
    const { x, y } = pending
    const k = key(x, y)
    if (loadingKeys.size >= MAX_CONCURRENT || loadingKeys.has(k)) return
    if (!closeComposer('PAINT')) return
    const neighbours = neighboursOf(tiles, x, y)
    setPending(null)
    setBusy(k, true)
    setError(null)
    setNotice(null)
    try {
      // Check the tile is still free before spending an AI image on it.
      const latest = await refresh()
      if (latest[k]) {
        setNotice('Someone just painted that tile. Pick another empty one.')
        return
      }
      const url = await generateImage(buildPrompt(tilePrompt, neighbours, blend), { width: 512, height: 512 })
      if (!aliveRef.current) return
      if (await place(x, y, url, tilePrompt)) placed()
      else {
        await refresh()
        if (aliveRef.current) tileTaken(x, y, url, tilePrompt)
      }
    } catch (err) {
      if (aliveRef.current) setError(errorText(err, 'Painting failed. Please try again.'))
    } finally {
      if (aliveRef.current) setBusy(k, false)
    }
  }

  const placeOrphan = async () => {
    const art = orphanRef.current
    // PLACE is only allowed in 'taken': a double tap cannot place the art twice.
    if (!art || !flow.send('PLACE')) return
    /** Back to browsing; newer leftover art that came in meanwhile is offered next. */
    const finish = (event) => {
      if (orphanRef.current === art) setOrphan(null)
      flow.send(event)
      if (orphanRef.current) flow.send('TAKEN')
    }
    const latest = await refresh()
    if (!aliveRef.current) return
    const spot = nearestFree(latest, loadingKeys, art.x, art.y)
    if (!spot) {
      setNotice('No free tile nearby. Pan somewhere quieter and paint a new tile.')
      finish('NO_SPOT')
      return
    }
    const k = key(spot.x, spot.y)
    setBusy(k, true)
    try {
      if (await place(spot.x, spot.y, art.imageUrl, art.prompt)) {
        if (!aliveRef.current) return
        placed()
        setNotice(`Placed on tile ${spot.x}, ${spot.y}.`)
        setCamera(spot)
        finish('PLACED')
      } else {
        if (!aliveRef.current) return
        setNotice('That one was taken too. Try again.')
        flow.send('PLACE_FAILED')
      }
    } catch (err) {
      if (!aliveRef.current) return
      setError(errorText(err, 'Could not place your tile.'))
      flow.send('PLACE_FAILED')
    } finally {
      if (aliveRef.current) setBusy(k, false)
    }
  }

  const dismissOrphan = () => {
    if (!flow.send('DISMISS')) return
    setOrphan(null)
  }

  // ---- derived ----------------------------------------------------------------
  const painted = Object.keys(tiles).length
  const recent = useMemo(
    () => Object.entries(tiles)
      .map(([k, t]) => {
        const [x, y] = k.split(',').map(Number)
        return { k, x, y, ...t }
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 8),
    [tiles]
  )
  const showComposer = composing && pending
  const pendingNeighbours = showComposer ? neighboursOf(tiles, pending.x, pending.y) : []
  const offering = flow.is('taken', 'placing') && orphan
  const selectedTile = selected ? tiles[key(selected.x, selected.y)] : null

  const navBtn = 'w-9 h-9 flex items-center justify-center text-navy font-black text-sm hover:bg-gray-100 transition-colors bg-white'

  return (
    <div className="flex flex-col gap-4" {...flow.attrs}>
      <div>
        <StatsBar
          className="mb-2!"
          stats={[
            { label: 'Tiles On Map', value: painted },
            { label: 'Yours', value: mine },
            { label: 'Score', value: session.total, color: '#FF2D55' },
          ]}
        />
        <div className="flex flex-wrap items-center justify-end gap-2 text-xs font-bold text-navy/50 min-h-7">
          {session.savedNote && <span className="text-[#16a34a]">{session.savedNote}</span>}
          {session.unsaved > 0 && (
            <>
              <span>{session.unsaved} pts unsaved. Saved when you leave.</span>
              <button onClick={session.save} className="px-2 py-1 font-black uppercase text-navy" style={{ border: '2px solid #1A1A2E' }}>Save now</button>
            </>
          )}
        </div>
      </div>

      <div className="p-3 bg-highlight/30 text-navy text-xs font-bold" style={{ border: '2px solid #1A1A2E' }}>
        <span className="uppercase font-black">Today's theme:</span> {theme}. Build on it, or continue whatever your neighbours painted.
      </div>

      <ErrorBanner message={error} />
      {loadError && <ErrorBanner message={loadError} onRetry={refresh} />}
      {offering && (
        <div className="p-3 bg-white text-navy text-sm font-medium flex flex-wrap items-center justify-between gap-2" style={{ border: '2px solid #1A1A2E' }}>
          <span>Someone painted that tile a moment before you. The map is refreshed. You can still place your art on a free tile nearby.</span>
          <span className="flex gap-2">
            <button onClick={placeOrphan} disabled={!flow.is('taken')} className="px-3 py-1 bg-primary text-white text-xs font-black uppercase disabled:opacity-40" style={{ border: '2px solid #1A1A2E' }}>
              {flow.is('placing') ? 'Placing...' : 'Place nearby'}
            </button>
            <button onClick={dismissOrphan} disabled={!flow.is('taken')} className="px-3 py-1 text-xs font-black uppercase disabled:opacity-40" style={{ border: '2px solid #1A1A2E' }}>OK</button>
          </span>
        </div>
      )}
      {notice && (
        <div className="p-3 bg-white text-navy text-sm font-medium flex flex-wrap items-center justify-between gap-2" style={{ border: '2px solid #1A1A2E' }}>
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="px-3 py-1 text-xs font-black uppercase" style={{ border: '2px solid #1A1A2E' }}>OK</button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1" style={{ border: '0' }}>
          <button aria-label="Pan up" onClick={() => move(0, -1)} className={navBtn} style={{ border: '2px solid #1A1A2E' }}>&uarr;</button>
          <button aria-label="Pan down" onClick={() => move(0, 1)} className={navBtn} style={{ border: '2px solid #1A1A2E' }}>&darr;</button>
          <button aria-label="Pan left" onClick={() => move(-1, 0)} className={navBtn} style={{ border: '2px solid #1A1A2E' }}>&larr;</button>
          <button aria-label="Pan right" onClick={() => move(1, 0)} className={navBtn} style={{ border: '2px solid #1A1A2E' }}>&rarr;</button>
          <button onClick={() => setCamera({ x: 0, y: 0 })} className="h-9 px-2 text-navy text-[10px] font-black uppercase hover:bg-gray-100 bg-white" style={{ border: '2px solid #1A1A2E' }}>Center</button>
          {recent[0] && (
            <button onClick={() => setCamera({ x: recent[0].x, y: recent[0].y })} className="h-9 px-2 text-navy text-[10px] font-black uppercase hover:bg-gray-100 bg-white" style={{ border: '2px solid #1A1A2E' }}>Newest</button>
          )}
        </div>
        <p className="text-navy/40 text-[10px] font-bold uppercase">
          At {camera.x}, {camera.y}<span className="hidden sm:inline"> · WASD or arrows · Drag to pan</span>
        </p>
      </div>

      {/* The shared map */}
      <div
        ref={viewRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        className="relative"
        style={{ border: '3px solid #1A1A2E', background: '#0B0B14', userSelect: 'none', touchAction: 'none', cursor: 'grab', overflow: 'hidden' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${size}px)`, gridAutoRows: `${size}px` }}>
          {Array.from({ length: rows * cols }, (_, i) => {
            const x = left + (i % cols)
            const y = top + Math.floor(i / cols)
            const k = key(x, y)
            return (
              <TileCell
                key={k}
                tile={tiles[k]}
                loading={loadingKeys.has(k)}
                size={size}
                label={`${x}, ${y}`}
                selected={selected && selected.x === x && selected.y === y}
                onClick={() => handleTileClick(x, y)}
              />
            )
          })}
        </div>
        {flow.is('loading') && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xs font-black uppercase">Loading the map...</div>
        )}
      </div>

      {selectedTile ? (
        <div className="brutalist-card p-3 flex gap-3 items-start">
          <GameImage src={selectedTile.imageUrl} alt="" className="shrink-0 object-cover" style={{ width: 72, height: 72, border: '2px solid #1A1A2E' }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-navy break-words">{selectedTile.prompt}</p>
            <p className="text-[10px] font-bold text-navy/50 uppercase mt-1">
              By {selectedTile.username || 'Guest'} · Tile {selected.x}, {selected.y}
            </p>
          </div>
          <button onClick={() => setSelected(null)} aria-label="Close" className="text-navy/40 hover:text-navy font-black px-1">✕</button>
        </div>
      ) : (
        <p className="text-center text-navy/40 text-xs font-medium">
          Tap an empty tile to paint it (+{pts} pts). Tap a painted tile to see its prompt. Everyone shares this map.
        </p>
      )}

      {/* Recent tiles: jump to where people are painting */}
      {recent.length > 0 && (
        <div>
          <h3 className="font-black text-navy uppercase text-xs mb-2">Recently painted</h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recent.map((t) => (
              <button key={t.k} onClick={() => { setCamera({ x: t.x, y: t.y }); setSelected({ x: t.x, y: t.y }) }}
                className="shrink-0 text-left bg-white" style={{ width: 88, border: '2px solid #1A1A2E' }} title={t.prompt}>
                <GameImage src={t.imageUrl} alt="" className="block object-cover" style={{ width: 84, height: 64 }} />
                <span className="block px-1 py-0.5 text-[9px] font-bold text-navy truncate">{t.username || 'Guest'}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Prompt modal */}
      {showComposer && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-3 sm:p-4" onClick={() => closeComposer('CANCEL')}>
          <div className="brutalist-card p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-black text-navy uppercase mb-1">Paint tile {pending.x}, {pending.y}</h3>
            {pendingNeighbours.length > 0 ? (
              <div className="mb-3">
                <p className="text-xs text-navy/50 font-bold mb-2">Your neighbours. Continue their scene so the map flows:</p>
                <div className="flex flex-col gap-1.5">
                  {pendingNeighbours.slice(0, 4).map((n) => (
                    <div key={n.label} className="flex items-center gap-2">
                      <GameImage src={n.tile.imageUrl} alt="" className="shrink-0 object-cover" style={{ width: 36, height: 36, border: '1px solid #1A1A2E' }} />
                      <p className="text-xs text-navy min-w-0">
                        <span className="font-black uppercase text-[10px] text-navy/50">{n.label}:</span> <span className="break-words">{n.tile.prompt}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-navy/50 font-medium mb-3">No neighbours yet. Start something new, maybe {theme}?</p>
            )}
            <form onSubmit={handleGenerate} className="flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                maxLength={PROMPT_MAX}
                placeholder={pendingNeighbours[0] ? `More of: ${pendingNeighbours[0].tile.prompt.slice(0, 40)}` : 'A misty mountain at dawn'}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium"
                style={{ border: '3px solid #1A1A2E' }}
              />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setPrompt(theme)} className="px-2 py-1 text-[10px] font-black uppercase text-navy bg-highlight" style={{ border: '2px solid #1A1A2E' }}>
                  Use theme
                </button>
                {pendingNeighbours.length > 0 && (
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-navy">
                    <input type="checkbox" checked={blend} onChange={(e) => setBlend(e.target.checked)} />
                    Blend with neighbours
                  </label>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => closeComposer('CANCEL')} className="flex-1 py-2 text-navy text-sm font-black uppercase hover:bg-gray-100" style={{ border: '2px solid #1A1A2E' }}>
                  Cancel
                </button>
                <button type="submit" disabled={!prompt.trim()} className="flex-1 py-2 bg-primary text-white text-sm font-black uppercase disabled:opacity-40" style={{ border: '2px solid #1A1A2E' }}>
                  Paint (+{pts} pts)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useMemo } from 'react'
import { ArrowLeft, Loader2, Sparkles, RefreshCw, ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { generateImage } from '../lib/fal'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'

const MOSAIC_KEY = 'mosaic_maker_data'

function loadPieces() {
  try { return JSON.parse(localStorage.getItem(MOSAIC_KEY) || '[]') } catch { return [] }
}
function savePieces(p) { localStorage.setItem(MOSAIC_KEY, JSON.stringify(p)) }

function getNextPosition(pieces) {
  if (pieces.length === 0) return { x: 0, y: 0 }
  // Spiral outward from center
  const occupied = new Set(pieces.map(p => `${p.positionX},${p.positionY}`))
  const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]]
  let x = 0, y = 0, steps = 1, dirIdx = 0, stepCount = 0, turnCount = 0
  while (true) {
    x += dirs[dirIdx][0]
    y += dirs[dirIdx][1]
    stepCount++
    if (!occupied.has(`${x},${y}`)) return { x, y }
    if (stepCount >= steps) {
      stepCount = 0
      dirIdx = (dirIdx + 1) % 4
      turnCount++
      if (turnCount >= 2) { turnCount = 0; steps++ }
    }
  }
}

export default function MosaicGame() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [pieces, setPieces] = useState(loadPieces)
  const [prompt, setPrompt] = useState('')
  const [creatorName, setCreatorName] = useState(user?.username || '')
  const [generating, setGenerating] = useState(false)
  const [score, setScore] = useState(0)
  const [selectedPiece, setSelectedPiece] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showForm, setShowForm] = useState(false)

  const gridLayout = useMemo(() => {
    if (pieces.length === 0) return { minX: 0, minY: 0, gridWidth: 0, gridHeight: 0 }
    let minX = pieces[0].positionX, maxX = pieces[0].positionX
    let minY = pieces[0].positionY, maxY = pieces[0].positionY
    pieces.forEach(p => {
      minX = Math.min(minX, p.positionX); maxX = Math.max(maxX, p.positionX)
      minY = Math.min(minY, p.positionY); maxY = Math.max(maxY, p.positionY)
    })
    return { minX, minY, gridWidth: maxX - minX + 1, gridHeight: maxY - minY + 1 }
  }, [pieces])

  const tileSize = useMemo(() => {
    if (pieces.length === 0) return 200
    const vw = typeof window !== 'undefined' ? window.innerWidth * 0.65 : 800
    const vh = typeof window !== 'undefined' ? window.innerHeight * 0.7 : 600
    const byW = vw / gridLayout.gridWidth
    const byH = vh / gridLayout.gridHeight
    return Math.max(40, Math.min(500, Math.min(byW, byH) * zoomLevel))
  }, [gridLayout, zoomLevel, pieces.length])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setGenerating(true)
    const pos = getNextPosition(pieces)

    try {
      const imageUrl = await generateImage(
        `${prompt.trim()}, abstract psychedelic artwork, soft pastel colors, dreamy swirling patterns, seamless tile`,
        { width: 512, height: 512 }
      )

      const piece = {
        id: Date.now(),
        imageUrl,
        prompt: prompt.trim(),
        creatorName: creatorName.trim() || 'Anonymous',
        positionX: pos.x,
        positionY: pos.y,
        createdAt: Date.now(),
      }

      const updated = [...pieces, piece]
      setPieces(updated)
      savePieces(updated)

      const pts = 60
      setScore(prev => prev + pts)
      addScore('mosaic-maker', user.username, pts, { prompt: prompt.trim() })
      refreshUser()

      setPrompt('')
      setShowForm(false)
    } catch (err) {
      console.error('Failed to generate piece:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handleClearAll = () => {
    if (pieces.length === 0) return
    if (!confirm(`Clear all ${pieces.length} pieces? This cannot be undone.`)) return
    setPieces([])
    savePieces([])
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ minHeight: 'calc(100vh - 130px)' }}>
      {/* Header */}
      <header className="border-b-3 border-navy bg-white/50 backdrop-blur-sm sticky top-0 z-40" style={{ borderBottomWidth: '3px' }}>
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold transition-colors uppercase"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-lg font-black text-navy uppercase">Collaborative Mosaic</h1>
                <p className="text-xs text-navy/50 font-medium">
                  {pieces.length} {pieces.length === 1 ? 'piece' : 'pieces'} created &middot; +60 pts each
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setPieces(loadPieces()) }}
                className="btn-brutalist bg-white text-navy py-1 px-2 text-xs"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="btn-brutalist bg-primary text-white py-1 px-3 text-xs hidden sm:flex"
              >
                {showForm ? 'View Mosaic' : 'Create Piece'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Desktop: Side-by-side */}
        <div className="hidden lg:flex lg:flex-1">
          {/* Mosaic Viewer */}
          <div className="flex-1 border-r-3 border-navy/10 relative" style={{ borderRightWidth: '3px' }}>
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
              <button onClick={() => setZoomLevel(z => Math.min(4, z + 0.25))} disabled={zoomLevel >= 4}
                className="btn-brutalist bg-white text-navy p-1.5 text-xs"><ZoomIn className="w-4 h-4" /></button>
              <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.25))} disabled={zoomLevel <= 0.5}
                className="btn-brutalist bg-white text-navy p-1.5 text-xs"><ZoomOut className="w-4 h-4" /></button>
              <button onClick={() => setZoomLevel(1)}
                className="btn-brutalist bg-white text-navy p-1.5 text-xs"><Maximize2 className="w-4 h-4" /></button>
              <div className="text-[10px] text-center bg-white border-2 border-navy px-1.5 py-0.5 font-black">
                {Math.round(zoomLevel * 100)}%
              </div>
            </div>

            {pieces.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center p-8">
                  <p className="text-5xl mb-4">🎨</p>
                  <h3 className="text-lg font-black text-navy uppercase mb-2">No pieces yet</h3>
                  <p className="text-navy/50 text-sm max-w-md font-medium">
                    Be the first to create a piece for this collaborative mosaic! Your psychedelic
                    artwork will be placed in the center, and the mosaic will grow outward from there.
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full h-full overflow-auto">
                <div className="flex items-center justify-center min-h-full p-8">
                  <div className="relative" style={{
                    width: `${gridLayout.gridWidth * tileSize}px`,
                    height: `${gridLayout.gridHeight * tileSize}px`,
                  }}>
                    {pieces.map(piece => {
                      const px = (piece.positionX - gridLayout.minX) * tileSize
                      const py = (piece.positionY - gridLayout.minY) * tileSize
                      return (
                        <div
                          key={piece.id}
                          className="absolute cursor-pointer group"
                          style={{ left: `${px}px`, top: `${py}px`, width: `${tileSize}px`, height: `${tileSize}px` }}
                          onClick={() => setSelectedPiece(piece)}
                        >
                          <img src={piece.imageUrl} alt={piece.prompt} className="w-full h-full object-cover block" />
                          {tileSize > 80 && (
                            <div className="absolute inset-0 bg-navy/75 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3">
                              <div className="text-white text-xs text-center space-y-1">
                                <p className="line-clamp-3 font-medium">{piece.prompt}</p>
                                <p className="text-[10px] opacity-75">({piece.positionX}, {piece.positionY})</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Creation Panel (always visible on desktop) */}
          <div className="w-[380px] p-6 overflow-auto">
            <CreatePieceForm
              prompt={prompt} setPrompt={setPrompt}
              creatorName={creatorName} setCreatorName={setCreatorName}
              generating={generating} onSubmit={handleSubmit}
            />
          </div>
        </div>

        {/* Mobile: Toggle */}
        <div className="lg:hidden flex-1 flex flex-col">
          {showForm ? (
            <div className="p-4 overflow-auto">
              <CreatePieceForm
                prompt={prompt} setPrompt={setPrompt}
                creatorName={creatorName} setCreatorName={setCreatorName}
                generating={generating} onSubmit={handleSubmit}
              />
            </div>
          ) : (
            <div className="flex-1 overflow-auto p-4">
              {pieces.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-5xl mb-4">🎨</p>
                  <p className="text-navy/50 text-sm font-medium">No pieces yet. Create the first one!</p>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <div className="relative" style={{
                    width: `${gridLayout.gridWidth * 80}px`,
                    height: `${gridLayout.gridHeight * 80}px`,
                  }}>
                    {pieces.map(piece => {
                      const px = (piece.positionX - gridLayout.minX) * 80
                      const py = (piece.positionY - gridLayout.minY) * 80
                      return (
                        <div key={piece.id} className="absolute" style={{ left: `${px}px`, top: `${py}px`, width: '80px', height: '80px' }}
                          onClick={() => setSelectedPiece(piece)}>
                          <img src={piece.imageUrl} alt="" className="w-full h-full object-cover block" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile FAB */}
          <div className="fixed bottom-24 right-4 lg:hidden z-30">
            <button
              onClick={() => setShowForm(!showForm)}
              className="w-14 h-14 bg-primary text-white border-3 border-navy shadow-[4px_4px_0px_#1A1A2E] flex items-center justify-center text-2xl font-black"
              style={{ borderWidth: '3px' }}
            >
              {showForm ? '🎨' : '+'}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-3 border-navy/10 py-3 bg-white/30 px-4" style={{ borderTopWidth: '3px' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-xs text-navy/40 font-medium">
            Create together &middot; Share the link &middot; Watch the mosaic grow
          </p>
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-navy">Score: {score}</span>
            <button
              onClick={handleClearAll}
              disabled={pieces.length === 0}
              className={`btn-brutalist py-1 px-3 text-xs ${pieces.length === 0 ? 'bg-surface-light text-navy/30 border-navy/20' : 'bg-white text-danger'}`}
            >
              Clear All
            </button>
          </div>
        </div>
      </footer>

      {/* Detail Modal */}
      {selectedPiece && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPiece(null)}>
          <div className="brutalist-card max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPiece.imageUrl} alt={selectedPiece.prompt} className="w-full" />
            <div className="p-5 space-y-3">
              <div>
                <p className="text-xs font-black text-navy uppercase mb-1">Prompt</p>
                <p className="text-sm text-navy/70 font-medium">{selectedPiece.prompt}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="font-black text-navy">Creator:</span> <span className="text-navy/60">{selectedPiece.creatorName}</span></div>
                <div><span className="font-black text-navy">Position:</span> <span className="text-navy/60">({selectedPiece.positionX}, {selectedPiece.positionY})</span></div>
                <div className="col-span-2"><span className="font-black text-navy">Created:</span> <span className="text-navy/60">{new Date(selectedPiece.createdAt).toLocaleString()}</span></div>
              </div>
              <button onClick={() => setSelectedPiece(null)} className="w-full btn-brutalist bg-white text-navy justify-center">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CreatePieceForm({ prompt, setPrompt, creatorName, setCreatorName, generating, onSubmit }) {
  return (
    <div className="brutalist-card p-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="font-black text-navy uppercase text-sm">Create Your Piece</h3>
      </div>
      <p className="text-xs text-navy/50 font-medium mb-4">
        Describe what you want to create. The AI will generate an abstract psychedelic artwork
        with soft pastel colors and dreamy swirling patterns.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-navy/50 uppercase block mb-1">Image Prompt</label>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., A peaceful mountain landscape at sunset"
            disabled={generating}
            className="w-full px-3 py-2 text-sm border-2 border-navy bg-white text-navy placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
          />
          <p className="text-[10px] text-navy/40 font-medium mt-1">
            Your prompt will be rendered in abstract psychedelic style with soft pastel colors
          </p>
        </div>
        <div>
          <label className="text-xs font-bold text-navy/50 uppercase block mb-1">Your Name (optional)</label>
          <input
            type="text"
            value={creatorName}
            onChange={(e) => setCreatorName(e.target.value)}
            placeholder="Anonymous"
            disabled={generating}
            className="w-full px-3 py-2 text-sm border-2 border-navy bg-white text-navy placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
          />
        </div>
        <button
          type="submit"
          disabled={generating || !prompt.trim()}
          className={`w-full btn-brutalist justify-center ${
            !generating && prompt.trim() ? 'bg-primary text-white' : 'bg-surface-light text-navy/30 border-navy/20'
          }`}
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generating & Placing...</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Generate Image</>
          )}
        </button>
        {generating && (
          <div className="space-y-1.5 text-xs text-navy/50 font-medium">
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Generating your image with AI...
            </p>
            <p className="flex items-center gap-2">
              <span className="w-2 h-2 bg-highlight rounded-full animate-pulse" />
              Finding the perfect spot in the mosaic...
            </p>
            <p className="text-[10px] text-navy/30">This may take 10-20 seconds</p>
          </div>
        )}
      </form>
    </div>
  )
}

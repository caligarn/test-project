import { useState, useCallback } from 'react'
import { ArrowLeft, Info, Loader2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { generateImage } from '../lib/fal'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'

const GRID_SIZE = 7
const TILE_SIZE_PX = 80

const STYLE_PRESETS = [
  { key: 'none', label: 'None', description: 'No style preset applied' },
  { key: 'isometric', label: 'Isometric', description: 'Isometric perspective, clean geometric shapes' },
  { key: 'watercolor', label: 'Watercolor', description: 'Soft watercolor painting with flowing edges' },
  { key: 'pixel-art', label: 'Pixel Art', description: 'Retro pixel art style, blocky details' },
  { key: 'fantasy-map', label: 'Fantasy Map', description: 'Hand-drawn fantasy cartography style' },
  { key: 'sci-fi', label: 'Sci-Fi', description: 'Futuristic sci-fi environment with neon accents' },
]

export default function InfinimapGame() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [tiles, setTiles] = useState({})
  const [loading, setLoading] = useState({})
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [score, setScore] = useState(0)
  const [tilesExplored, setTilesExplored] = useState(0)
  const [showInfo, setShowInfo] = useState(false)

  // Generation modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCoord, setSelectedCoord] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [stylePreset, setStylePreset] = useState('none')

  const tileKey = (x, y) => `${x + offsetX},${y + offsetY}`

  const handleTileClick = (x, y) => {
    const key = tileKey(x, y)
    if (tiles[key] || loading[key]) return
    setSelectedCoord({ x, y })
    setPrompt('')
    setStylePreset('none')
    setModalOpen(true)
  }

  const handleGenerate = useCallback(async () => {
    if (!selectedCoord || !prompt.trim()) return

    const { x, y } = selectedCoord
    const key = tileKey(x, y)
    setModalOpen(false)
    setLoading(prev => ({ ...prev, [key]: true }))

    const style = STYLE_PRESETS.find(s => s.key === stylePreset)
    const styleSuffix = style && style.key !== 'none' ? `, ${style.description}` : ''

    try {
      const imageUrl = await generateImage(
        `${prompt.trim()}${styleSuffix}, seamless tile, top-down map view`,
        { width: 512, height: 512 }
      )
      setTiles(prev => ({ ...prev, [key]: { url: imageUrl, prompt: prompt.trim() } }))
      const pts = 50
      setScore(prev => prev + pts)
      setTilesExplored(prev => prev + 1)
      addScore('infinimap', user.username, pts, { prompt: prompt.trim() })
      refreshUser()
    } catch (err) {
      console.error('Failed to generate tile:', err)
      setTiles(prev => ({
        ...prev,
        [key]: { url: null, prompt: prompt.trim(), error: true }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }))
    }
  }, [selectedCoord, prompt, stylePreset, tiles, loading, offsetX, offsetY, user, refreshUser])

  const handlePan = (dx, dy) => {
    setOffsetX(prev => prev + dx)
    setOffsetY(prev => prev + dy)
  }

  return (
    <div className="relative w-full" style={{ minHeight: 'calc(100vh - 130px)' }}>
      {/* Overlay Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-navy/80 to-transparent">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-bold transition-colors uppercase"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <h1 className="text-xl font-black text-white uppercase">InfiniMap</h1>
            <button
              onClick={() => setShowInfo(true)}
              className="text-white/50 hover:text-white transition-colors"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-4 text-white/80">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-white/40">Score</p>
              <p className="text-lg font-black">{score}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-white/40">Tiles</p>
              <p className="text-lg font-black">{tilesExplored}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase text-white/40">Position</p>
              <p className="text-xs font-bold">({offsetX},{offsetY})</p>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="w-full overflow-auto bg-[#1a1a2e] flex items-center justify-center" style={{ minHeight: 'calc(100vh - 130px)' }}>
        <div className="pt-16 pb-8 px-4">
          <div
            className="grid gap-[2px] mx-auto"
            style={{
              gridTemplateColumns: `repeat(${GRID_SIZE}, ${TILE_SIZE_PX}px)`,
              gridTemplateRows: `repeat(${GRID_SIZE}, ${TILE_SIZE_PX}px)`,
            }}
          >
            {Array.from({ length: GRID_SIZE }).map((_, y) =>
              Array.from({ length: GRID_SIZE }).map((_, x) => {
                const key = tileKey(x, y)
                const tile = tiles[key]
                const isLoading = loading[key]

                return (
                  <button
                    key={key}
                    onClick={() => handleTileClick(x, y)}
                    disabled={!!tile || isLoading}
                    className={`relative overflow-hidden transition-all ${
                      tile ? 'cursor-default' : isLoading ? 'cursor-wait' : 'cursor-pointer hover:brightness-125'
                    }`}
                    style={{
                      width: TILE_SIZE_PX,
                      height: TILE_SIZE_PX,
                      backgroundColor: tile ? '#111' : '#333',
                      border: '1px solid #555',
                    }}
                  >
                    {tile && tile.url ? (
                      <img src={tile.url} alt={tile.prompt} className="w-full h-full object-cover" />
                    ) : tile && tile.error ? (
                      <div className="w-full h-full flex items-center justify-center bg-red-900/30">
                        <span className="text-white/30 text-xs">!</span>
                      </div>
                    ) : isLoading ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-white/10 text-[10px]">{x + offsetX},{y + offsetY}</span>
                      </div>
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Pan Controls */}
          <div className="flex justify-center gap-2 mt-4">
            {[
              { label: 'W', dx: 0, dy: -1 },
              { label: 'A', dx: -1, dy: 0 },
              { label: 'S', dx: 0, dy: 1 },
              { label: 'D', dx: 1, dy: 0 },
            ].map(({ label, dx, dy }) => (
              <button
                key={label}
                onClick={() => handlePan(dx, dy)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white/60 text-sm font-black border border-white/20 transition-colors uppercase"
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-center text-white/20 text-[10px] mt-2 font-bold uppercase">
            Click tile to generate &middot; WASD to pan
          </p>
        </div>
      </div>

      {/* Generation Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div className="brutalist-card max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-black text-navy uppercase text-sm">Generate Tile</h3>
                {selectedCoord && (
                  <p className="text-xs text-navy/50 font-medium mt-0.5">
                    Coordinates ({selectedCoord.x + offsetX}, {selectedCoord.y + offsetY})
                  </p>
                )}
              </div>
              <button onClick={() => setModalOpen(false)} className="text-navy/30 hover:text-navy">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-navy/50 uppercase block mb-1">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what to generate (e.g., 'isometric fantasy island with castle')"
                  rows={3}
                  className="w-full px-3 py-2 text-sm border-2 border-navy bg-white text-navy placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight font-medium resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-navy/50 uppercase block mb-1">Style Preset (optional)</label>
                <select
                  value={stylePreset}
                  onChange={(e) => setStylePreset(e.target.value)}
                  className="w-full px-3 py-2 text-sm border-2 border-navy bg-white text-navy focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
                >
                  {STYLE_PRESETS.map(preset => (
                    <option key={preset.key} value={preset.key}>{preset.label}</option>
                  ))}
                </select>
                {stylePreset !== 'none' && (
                  <p className="text-[10px] text-navy/40 font-medium mt-1">
                    {STYLE_PRESETS.find(s => s.key === stylePreset)?.description}
                  </p>
                )}
              </div>

              <div className="bg-surface-light border-2 border-navy/10 p-3 text-xs text-navy/50 space-y-1 font-medium">
                <p>The AI will consider neighboring tiles for seamless blending</p>
                <p>Generation may take 10-30 seconds</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setModalOpen(false)}
                  className="btn-brutalist bg-white text-navy flex-1 justify-center"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className={`btn-brutalist flex-1 justify-center ${
                    prompt.trim() ? 'bg-primary text-white' : 'bg-surface-light text-navy/30 border-navy/20'
                  }`}
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowInfo(false)}>
          <div className="brutalist-card max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-navy uppercase text-sm">About InfiniMap</h3>
              <button onClick={() => setShowInfo(false)} className="text-navy/30 hover:text-navy">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-navy/60 font-medium mb-4">
              An AI-powered infinite canvas for generating seamless, neighbor-aware imagery.
            </p>
            <div className="space-y-3 text-xs text-navy/50 font-medium">
              <div>
                <p className="font-black text-navy uppercase mb-1">How It Works</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Click any tile to generate AI-powered imagery</li>
                  <li>The AI considers neighboring tiles for seamless blending</li>
                  <li>Use WASD or buttons to pan the infinite canvas</li>
                  <li>Each tile generated earns 50 points</li>
                </ul>
              </div>
              <div>
                <p className="font-black text-navy uppercase mb-1">Style Presets</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Choose from isometric, watercolor, pixel art, and more</li>
                  <li>Presets add style direction to your prompts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useCallback } from 'react'
import { ArrowLeft, MapPin, Compass, Loader2, Move } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { generateImage } from '../lib/fal'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'

const GRID_SIZE = 5
const TILE_PROMPTS = [
  'mystical forest with glowing mushrooms',
  'ancient stone ruins overgrown with vines',
  'crystal cave with bioluminescent pools',
  'floating islands above the clouds',
  'underwater temple with coral pillars',
  'volcanic landscape with lava rivers',
  'frozen tundra with aurora borealis',
  'desert oasis with golden sand dunes',
  'enchanted garden with giant flowers',
  'steampunk clocktower city',
  'dragon nest on a mountain peak',
  'fairy village inside a hollow tree',
  'alien planet with purple vegetation',
  'pirate cove with treasure chests',
  'samurai temple in cherry blossoms',
  'cyberpunk neon-lit alleyway',
  'medieval castle on a cliff',
  'witch cottage in a swamp',
  'space station orbiting a nebula',
  'underground dwarven forge',
  'elven bridge over a waterfall',
  'haunted lighthouse on stormy coast',
  'zen garden with koi pond',
  'nomad camp in vast grasslands',
  'sunken ship in coral reef',
]

function getPromptForTile(row, col, offsetRow, offsetCol) {
  const globalRow = row + offsetRow
  const globalCol = col + offsetCol
  const idx = Math.abs((globalRow * 7 + globalCol * 13 + globalRow * globalCol * 3) % TILE_PROMPTS.length)
  return TILE_PROMPTS[idx]
}

export default function InfinimapGame() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [tiles, setTiles] = useState({})
  const [loading, setLoading] = useState({})
  const [offsetRow, setOffsetRow] = useState(0)
  const [offsetCol, setOffsetCol] = useState(0)
  const [score, setScore] = useState(0)
  const [tilesExplored, setTilesExplored] = useState(0)
  const [customPrompt, setCustomPrompt] = useState('')
  const [selectedTile, setSelectedTile] = useState(null)
  const [showPromptInput, setShowPromptInput] = useState(false)

  const tileKey = (r, c) => `${r + offsetRow},${c + offsetCol}`

  const exploreTile = useCallback(async (row, col, prompt) => {
    const key = tileKey(row, col)
    if (tiles[key] || loading[key]) return

    setLoading(prev => ({ ...prev, [key]: true }))
    try {
      const finalPrompt = prompt || getPromptForTile(row, col, offsetRow, offsetCol)
      const imageUrl = await generateImage(
        `${finalPrompt}, top-down map tile view, fantasy cartography style, vibrant colors`,
        { width: 512, height: 512 }
      )
      setTiles(prev => ({ ...prev, [key]: { url: imageUrl, prompt: finalPrompt } }))
      const pts = 50
      setScore(prev => prev + pts)
      setTilesExplored(prev => prev + 1)
      addScore('infinimap', user.username, pts, { prompt: finalPrompt })
      refreshUser()
    } catch (err) {
      console.error('Failed to generate tile:', err)
      // Create a colored placeholder on error
      setTiles(prev => ({
        ...prev,
        [key]: {
          url: null,
          prompt: prompt || getPromptForTile(row, col, offsetRow, offsetCol),
          error: true
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }))
    }
  }, [tiles, loading, offsetRow, offsetCol, user, refreshUser])

  const handleTileClick = (row, col) => {
    const key = tileKey(row, col)
    if (tiles[key] || loading[key]) return
    setSelectedTile({ row, col })
    setCustomPrompt('')
    setShowPromptInput(true)
  }

  const handleExplore = () => {
    if (!selectedTile) return
    exploreTile(selectedTile.row, selectedTile.col, customPrompt || null)
    setShowPromptInput(false)
    setSelectedTile(null)
  }

  const handlePan = (dr, dc) => {
    setOffsetRow(prev => prev + dr)
    setOffsetCol(prev => prev + dc)
  }

  const getColorForTile = (row, col) => {
    const r = row + offsetRow
    const c = col + offsetCol
    const hue = (r * 47 + c * 73) % 360
    return `hsl(${hue}, 60%, 75%)`
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold transition-colors uppercase"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <span className="font-black text-navy uppercase">InfiniMap</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-navy/50" />
          <span className="text-xs font-bold text-navy/50 uppercase">
            ({offsetCol},{offsetRow})
          </span>
        </div>
      </div>

      {/* Score Bar */}
      <div className="flex items-center justify-between brutalist-card p-3 mb-4">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] text-navy/40 font-bold uppercase">Score</p>
            <p className="text-xl font-black text-navy">{score}</p>
          </div>
          <div>
            <p className="text-[10px] text-navy/40 font-bold uppercase">Explored</p>
            <p className="text-xl font-black text-primary">{tilesExplored}</p>
          </div>
        </div>
        <div className="text-xs text-navy/40 font-bold uppercase">
          +50 pts / tile
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex justify-center gap-2 mb-3">
        <button
          onClick={() => handlePan(-1, 0)}
          className="btn-brutalist bg-white text-navy py-1.5 px-3 text-xs"
        >
          North
        </button>
        <button
          onClick={() => handlePan(0, -1)}
          className="btn-brutalist bg-white text-navy py-1.5 px-3 text-xs"
        >
          West
        </button>
        <button
          onClick={() => handlePan(0, 1)}
          className="btn-brutalist bg-white text-navy py-1.5 px-3 text-xs"
        >
          East
        </button>
        <button
          onClick={() => handlePan(1, 0)}
          className="btn-brutalist bg-white text-navy py-1.5 px-3 text-xs"
        >
          South
        </button>
      </div>

      {/* Map Grid */}
      <div className="brutalist-card p-3 mb-4">
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)` }}
        >
          {Array.from({ length: GRID_SIZE }).map((_, row) =>
            Array.from({ length: GRID_SIZE }).map((_, col) => {
              const key = tileKey(row, col)
              const tile = tiles[key]
              const isLoading = loading[key]
              const isSelected = selectedTile?.row === row && selectedTile?.col === col

              return (
                <button
                  key={key}
                  onClick={() => handleTileClick(row, col)}
                  disabled={!!tile || isLoading}
                  className={`relative aspect-square border-2 border-navy transition-all overflow-hidden ${
                    tile
                      ? 'cursor-default'
                      : isLoading
                      ? 'cursor-wait'
                      : 'cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_#1A1A2E]'
                  } ${isSelected ? 'ring-2 ring-primary' : ''}`}
                  style={{
                    backgroundColor: tile ? '#1A1A2E' : getColorForTile(row, col),
                  }}
                >
                  {tile && tile.url ? (
                    <img
                      src={tile.url}
                      alt={tile.prompt}
                      className="w-full h-full object-cover"
                    />
                  ) : tile && tile.error ? (
                    <div className="w-full h-full flex items-center justify-center bg-navy/10">
                      <MapPin className="w-4 h-4 text-navy/40" />
                    </div>
                  ) : isLoading ? (
                    <div className="w-full h-full flex items-center justify-center bg-white/50">
                      <Loader2 className="w-5 h-5 text-navy animate-spin" />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-navy/30 text-lg">?</span>
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Prompt Input Modal */}
      {showPromptInput && (
        <div className="brutalist-card p-4 mb-4">
          <p className="text-sm font-black text-navy uppercase mb-2">
            Explore this tile
          </p>
          <p className="text-xs text-navy/50 font-medium mb-3">
            Enter a custom prompt or leave blank for a random location.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. enchanted mushroom forest..."
              className="flex-1 px-3 py-2 text-sm border-2 border-navy bg-white text-navy placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
              onKeyDown={(e) => e.key === 'Enter' && handleExplore()}
            />
            <button
              onClick={handleExplore}
              className="btn-brutalist bg-primary text-white"
            >
              <Move className="w-4 h-4" />
              Explore
            </button>
          </div>
          <button
            onClick={() => { setShowPromptInput(false); setSelectedTile(null) }}
            className="text-xs text-navy/40 font-bold uppercase mt-2 hover:text-navy transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="brutalist-card-green p-4">
        <p className="text-sm font-black text-navy uppercase mb-1">How to Play</p>
        <p className="text-xs text-navy/70 font-medium">
          Click any unexplored tile on the map to generate an AI image for that location.
          Use the compass buttons to pan across the infinite map. Each tile explored earns 50 points.
          Enter custom prompts or let the map surprise you!
        </p>
      </div>
    </div>
  )
}

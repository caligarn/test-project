import { useState } from 'react'
import { ArrowLeft, Grid3X3, Loader2, Palette, RotateCcw, Eye } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { generateImage } from '../lib/fal'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'

const MOSAIC_KEY = 'mosaic_maker_data'
const GRID_COLS = 4
const GRID_ROWS = 4
const TOTAL_TILES = GRID_COLS * GRID_ROWS

const THEMES = [
  { id: 'nature', label: 'Nature', icon: '🌿', suffix: 'natural environment, organic' },
  { id: 'space', label: 'Space', icon: '🚀', suffix: 'cosmic, nebula, stars' },
  { id: 'ocean', label: 'Ocean', icon: '🌊', suffix: 'underwater, marine, deep sea' },
  { id: 'fantasy', label: 'Fantasy', icon: '🧙', suffix: 'magical, mystical, enchanted' },
]

function loadMosaic() {
  try {
    return JSON.parse(localStorage.getItem(MOSAIC_KEY) || 'null')
  } catch {
    return null
  }
}

function saveMosaic(data) {
  localStorage.setItem(MOSAIC_KEY, JSON.stringify(data))
}

export default function MosaicGame() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [mosaic, setMosaic] = useState(() => loadMosaic() || { tiles: {}, theme: null })
  const [prompt, setPrompt] = useState('')
  const [selectedTile, setSelectedTile] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [score, setScore] = useState(0)
  const [viewMode, setViewMode] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState(mosaic.theme)

  const filledCount = Object.keys(mosaic.tiles).length
  const progress = Math.round((filledCount / TOTAL_TILES) * 100)

  const handleSelectTheme = (theme) => {
    setSelectedTheme(theme.id)
    const updated = { ...mosaic, theme: theme.id }
    setMosaic(updated)
    saveMosaic(updated)
  }

  const handleTileClick = (index) => {
    if (mosaic.tiles[index] || generating || viewMode) return
    setSelectedTile(index)
    setPrompt('')
  }

  const handleGenerate = async () => {
    if (selectedTile === null || !prompt.trim()) return

    setGenerating(true)
    const theme = THEMES.find(t => t.id === selectedTheme)
    const themeSuffix = theme ? `, ${theme.suffix}` : ''

    try {
      const imageUrl = await generateImage(
        `${prompt.trim()}${themeSuffix}, mosaic tile art style, vibrant, flat design, square composition`,
        { width: 512, height: 512 }
      )

      const updatedTiles = {
        ...mosaic.tiles,
        [selectedTile]: {
          url: imageUrl,
          prompt: prompt.trim(),
          author: user.username,
          createdAt: Date.now(),
        }
      }
      const updated = { ...mosaic, tiles: updatedTiles }
      setMosaic(updated)
      saveMosaic(updated)

      const pts = 60
      setScore(prev => prev + pts)
      addScore('mosaic-maker', user.username, pts, { prompt: prompt.trim() })
      refreshUser()

      setSelectedTile(null)
      setPrompt('')
    } catch (err) {
      console.error('Failed to generate tile:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handleReset = () => {
    const fresh = { tiles: {}, theme: selectedTheme }
    setMosaic(fresh)
    saveMosaic(fresh)
    setSelectedTile(null)
    setPrompt('')
  }

  const getPlaceholderColor = (index) => {
    const hue = (index * 22 + 180) % 360
    return `hsl(${hue}, 40%, 85%)`
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
          <span className="text-xl">🧩</span>
          <span className="font-black text-navy uppercase">Mosaic Maker</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode(!viewMode)}
            className={`btn-brutalist py-1.5 px-3 text-xs ${viewMode ? 'bg-navy text-white' : 'bg-white text-navy'}`}
          >
            <Eye className="w-3 h-3" />
            {viewMode ? 'Edit' : 'View'}
          </button>
          <button
            onClick={handleReset}
            className="btn-brutalist bg-white text-navy py-1.5 px-3 text-xs"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Score & Progress */}
      <div className="flex items-center justify-between brutalist-card p-3 mb-4">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] text-navy/40 font-bold uppercase">Score</p>
            <p className="text-xl font-black text-navy">{score}</p>
          </div>
          <div>
            <p className="text-[10px] text-navy/40 font-bold uppercase">Progress</p>
            <p className="text-xl font-black text-primary">{progress}%</p>
          </div>
          <div>
            <p className="text-[10px] text-navy/40 font-bold uppercase">Tiles</p>
            <p className="text-xl font-black text-navy">{filledCount}/{TOTAL_TILES}</p>
          </div>
        </div>
        <div className="text-xs text-navy/40 font-bold uppercase">
          +60 pts / tile
        </div>
      </div>

      {/* Theme Picker */}
      {!selectedTheme && !viewMode && (
        <div className="brutalist-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-5 h-5 text-primary" />
            <h3 className="font-black text-navy uppercase text-sm">Choose a Theme</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {THEMES.map(theme => (
              <button
                key={theme.id}
                onClick={() => handleSelectTheme(theme)}
                className="brutalist-card p-4 text-center hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#1A1A2E] transition-all"
              >
                <span className="text-2xl block mb-1">{theme.icon}</span>
                <span className="text-xs font-black text-navy uppercase">{theme.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mosaic Grid */}
      <div className={`brutalist-card p-3 mb-4 ${viewMode ? 'p-0 overflow-hidden' : ''}`}>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gap: viewMode ? '0px' : '4px',
          }}
        >
          {Array.from({ length: TOTAL_TILES }).map((_, index) => {
            const tile = mosaic.tiles[index]
            const isSelected = selectedTile === index

            return (
              <button
                key={index}
                onClick={() => handleTileClick(index)}
                disabled={!!tile || generating || viewMode || !selectedTheme}
                className={`relative aspect-square overflow-hidden transition-all ${
                  viewMode ? '' : 'border-2 border-navy'
                } ${
                  tile
                    ? 'cursor-default'
                    : !selectedTheme || viewMode
                    ? 'cursor-not-allowed'
                    : 'cursor-pointer hover:opacity-80'
                } ${isSelected ? 'ring-3 ring-primary' : ''}`}
                style={{
                  backgroundColor: tile ? '#1A1A2E' : getPlaceholderColor(index),
                }}
              >
                {tile ? (
                  <img
                    src={tile.url}
                    alt={tile.prompt}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Grid3X3 className="w-5 h-5 text-navy/15" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Prompt Input */}
      {selectedTile !== null && !viewMode && (
        <div className="brutalist-card p-4 mb-4">
          <p className="text-sm font-black text-navy uppercase mb-2">
            Tile #{selectedTile + 1}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe this mosaic piece..."
              className="flex-1 px-3 py-2 text-sm border-2 border-navy bg-white text-navy placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || generating}
              className={`btn-brutalist ${
                prompt.trim() && !generating
                  ? 'bg-primary text-white'
                  : 'bg-surface-light text-navy/30 cursor-not-allowed border-navy/20'
              }`}
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Create'
              )}
            </button>
          </div>
          <button
            onClick={() => setSelectedTile(null)}
            className="text-xs text-navy/40 font-bold uppercase mt-2 hover:text-navy transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="brutalist-card-pink p-4">
        <p className="text-sm font-black text-white uppercase mb-1">How to Play</p>
        <p className="text-xs text-white/80 font-medium">
          Choose a theme, then click empty tiles to fill them with AI-generated mosaic pieces.
          Describe each piece and watch your mosaic come together. Toggle view mode to see
          the complete artwork without borders. Each tile earns 60 points!
        </p>
      </div>
    </div>
  )
}

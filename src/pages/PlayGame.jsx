import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, Key } from 'lucide-react'
import { getGame } from '../lib/gameData'
import { useAuth } from '../context/AuthContext'
import { isConfigured, configureFal } from '../lib/fal'
import InfinimapGame from '../games/InfinimapGame'
import HaikuCanvasGame from '../games/HaikuCanvasGame'
import MosaicGame from '../games/MosaicGame'
import CommunityComicGame from '../games/CommunityComicGame'

const GAME_COMPONENTS = {
  'infinimap': InfinimapGame,
  'haiku-canvas': HaikuCanvasGame,
  'mosaic-maker': MosaicGame,
  'community-comic': CommunityComicGame,
}

export default function PlayGame() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const game = getGame(gameId)
  const [apiKey, setApiKey] = useState('')
  const [hasKey, setHasKey] = useState(isConfigured())

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-4xl mb-4">🔒</p>
        <p className="text-navy font-black text-lg mb-2 uppercase">Sign in Required</p>
        <p className="text-navy/50 text-sm mb-4 font-medium">You need to be signed in to play games.</p>
        <Link to="/login" className="btn-brutalist bg-primary text-white no-underline inline-flex">Sign In</Link>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-4xl mb-4">🎮</p>
        <p className="text-navy/50 font-medium">Game not found.</p>
        <Link to="/" className="block mt-4 text-primary text-sm font-bold uppercase no-underline">← Back to Games</Link>
      </div>
    )
  }

  function handleSetKey(e) {
    e.preventDefault()
    if (apiKey.trim()) {
      configureFal(apiKey.trim())
      setHasKey(true)
    }
  }

  if (!hasKey) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold mb-6 transition-colors uppercase">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="brutalist-card p-8 text-center">
          <div className="w-16 h-16 bg-primary flex items-center justify-center mx-auto mb-4 border-2 border-navy">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black text-navy mb-2 uppercase">Fal.ai API Key Required</h2>
          <p className="text-navy/50 text-sm mb-6 font-medium">
            All games use AI image generation via Fal.ai. Enter your key once and it's stored locally — never sent anywhere.
          </p>
          <form onSubmit={handleSetKey} className="space-y-3">
            <input type="password" placeholder="fal-ai key..."
              value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-3 bg-white text-navy text-sm placeholder-navy/30 focus:outline-none font-medium"
              style={{ border: '3px solid #1A1A2E' }} />
            <button type="submit" className="w-full btn-brutalist bg-primary text-white justify-center">
              Save & Play
            </button>
          </form>
          <p className="text-navy/40 text-xs mt-4 font-medium">
            Get a free key at <a href="https://fal.ai" target="_blank" rel="noopener noreferrer" className="text-primary font-bold">fal.ai</a>
          </p>
        </div>
      </div>
    )
  }

  const GameComponent = GAME_COMPONENTS[gameId]
  const isLightBg = game.color === '#C8FF00' || game.color === '#FFD600'

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold transition-colors uppercase">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">{game.icon}</span>
          <span className="font-black text-navy uppercase">{game.title}</span>
          {game.isNew && <span className="tag tag-yellow text-[10px]">New</span>}
        </div>
        <div />
      </div>

      {/* Game */}
      {GameComponent ? (
        <GameComponent game={game} />
      ) : (
        <>
          <div className="relative overflow-hidden min-h-[400px] flex items-center justify-center"
            style={{ backgroundColor: game.color, border: '3px solid #1A1A2E' }}>
            <div className="text-center p-8">
              <span className="text-6xl mb-6 block animate-float">{game.icon}</span>
              <h2 className={`text-2xl font-black ${isLightBg ? 'text-navy' : 'text-white'} mb-3 uppercase`}>{game.title}</h2>
              <p className={`${isLightBg ? 'text-navy/70' : 'text-white/80'} text-sm max-w-md mx-auto mb-6 font-medium`}>{game.description}</p>
              <div className={`inline-flex items-center gap-2 px-6 py-3 ${isLightBg ? 'bg-navy text-white' : 'bg-white text-navy'} text-sm font-black uppercase border-2 border-navy`}>
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                Coming soon
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between brutalist-card p-4">
            <div><p className="text-xs text-navy/40 font-bold uppercase">Score</p><p className="text-2xl font-black text-navy">0</p></div>
            <div><p className="text-xs text-navy/40 font-bold uppercase">Round</p><p className="text-2xl font-black text-navy">1/5</p></div>
            <div><p className="text-xs text-navy/40 font-bold uppercase">Time</p><p className="text-2xl font-black text-primary">0:30</p></div>
          </div>
        </>
      )}
    </div>
  )
}

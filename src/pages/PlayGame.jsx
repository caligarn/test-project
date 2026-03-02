import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, Settings, Key } from 'lucide-react'
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
        <p className="text-navy/50 text-sm mb-4 font-medium">
          You need to be signed in to play games.
        </p>
        <Link
          to="/login"
          className="btn-brutalist bg-primary text-white no-underline inline-flex"
        >
          Sign In
        </Link>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-4xl mb-4">🎮</p>
        <p className="text-navy/50 font-medium">Game not found.</p>
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
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold mb-6 transition-colors uppercase"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="brutalist-card p-8 text-center">
          <div className="w-16 h-16 bg-primary flex items-center justify-center mx-auto mb-4 border-2 border-navy">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-black text-navy mb-2 uppercase">
            Fal.ai API Key Required
          </h2>
          <p className="text-navy/50 text-sm mb-6 font-medium">
            This game uses AI image generation. Enter your Fal.ai API key to
            play. Your key is stored locally and never sent to our servers.
          </p>
          <form onSubmit={handleSetKey} className="space-y-3">
            <input
              type="password"
              placeholder="Enter your Fal.ai API key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-3 bg-white text-navy text-sm placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
              style={{ borderWidth: '3px', borderStyle: 'solid', borderColor: '#1A1A2E' }}
            />
            <button
              type="submit"
              className="w-full btn-brutalist bg-primary text-white justify-center"
            >
              Save & Continue
            </button>
          </form>
          <p className="text-navy/40 text-xs mt-4 font-medium">
            Get your API key at{' '}
            <span className="text-primary font-bold">fal.ai</span>
          </p>
        </div>
      </div>
    )
  }

  // Check if this game has a real component
  const GameComponent = GAME_COMPONENTS[gameId]

  if (GameComponent) {
    return <GameComponent />
  }

  // Fallback: Coming soon placeholder for original 6 games
  const isLightBg = game.color === '#C8FF00' || game.color === '#FFD600'

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold transition-colors uppercase"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">{game.icon}</span>
          <span className="font-black text-navy uppercase">{game.title}</span>
        </div>
        <button className="p-2 bg-white text-navy border-2 border-navy hover:bg-surface-light transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Game Area Placeholder */}
      <div
        className="relative overflow-hidden min-h-[400px] md:min-h-[500px] flex items-center justify-center border-3"
        style={{ backgroundColor: game.color, borderWidth: '3px', borderColor: '#1A1A2E' }}
      >
        <div className="relative z-10 text-center p-8">
          <span className="text-6xl mb-6 block animate-float">{game.icon}</span>
          <h2 className={`text-2xl font-black ${isLightBg ? 'text-navy' : 'text-white'} mb-3 uppercase`}>{game.title}</h2>
          <p className={`${isLightBg ? 'text-navy/70' : 'text-white/80'} text-sm max-w-md mx-auto mb-6 font-medium`}>
            {game.description}
          </p>
          <div className={`inline-flex items-center gap-2 px-6 py-3 ${isLightBg ? 'bg-navy text-white' : 'bg-white text-navy'} text-sm font-black uppercase border-2 border-navy`}>
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            Coming Soon
          </div>
        </div>
      </div>

      {/* Score Area */}
      <div className="mt-4 flex items-center justify-between brutalist-card p-4">
        <div>
          <p className="text-xs text-navy/40 font-bold uppercase">Score</p>
          <p className="text-2xl font-black text-navy">0</p>
        </div>
        <div>
          <p className="text-xs text-navy/40 font-bold uppercase">Round</p>
          <p className="text-2xl font-black text-navy">1/5</p>
        </div>
        <div>
          <p className="text-xs text-navy/40 font-bold uppercase">Time</p>
          <p className="text-2xl font-black text-primary">0:30</p>
        </div>
      </div>
    </div>
  )
}

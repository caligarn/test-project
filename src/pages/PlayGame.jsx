import { useParams, Link, useNavigate } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { ArrowLeft, Coins } from 'lucide-react'
import { getGame } from '../lib/gameData'
import { useAuth } from '../context/AuthContext'
import { isConfigured } from '../lib/fal'
import { getCredits } from '../lib/storage'
import BannerAd from '../components/BannerAd'

const GAME_COMPONENTS = {
  'prompt-off': lazy(() => import('../games/PromptOffGame')),
  'infinimap': lazy(() => import('../games/InfinimapGame')),
  'haiku-canvas': lazy(() => import('../games/HaikuCanvasGame')),
  'mosaic-maker': lazy(() => import('../games/MosaicGame')),
  'community-comic': lazy(() => import('../games/CommunityComicGame')),
  'prompt-guesser': lazy(() => import('../games/PromptGuesserGame')),
  'pixel-duel': lazy(() => import('../games/PixelDuelGame')),
  'style-roulette': lazy(() => import('../games/StyleRouletteGame')),
  'speed-prompt': lazy(() => import('../games/SpeedPromptGame')),
  'dream-caption': lazy(() => import('../games/DreamCaptionGame')),
  'ai-remix': lazy(() => import('../games/AIRemixGame')),
  'telephone': lazy(() => import('../games/TelephoneGame')),
  'spot-the-fake': lazy(() => import('../games/SpotTheFakeGame')),
  'before-after': lazy(() => import('../games/BeforeAfterGame')),
  'emoji-prompt': lazy(() => import('../games/EmojiPromptGame')),
}

export default function PlayGame() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const game = getGame(gameId)

  // Ensure FAL is configured with default key on mount
  useEffect(() => { isConfigured() }, [])

  if (!game) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-4xl mb-4">🎮</p>
        <p className="text-navy/50 font-medium">Game not found.</p>
        <Link to="/" className="block mt-4 text-primary text-sm font-bold no-underline uppercase">← Back to Games</Link>
      </div>
    )
  }

  const GameComponent = GAME_COMPONENTS[gameId]
  const username = user?.username || 'guest'
  const credits = getCredits(username)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Top banner ad */}
      <BannerAd slot="top" className="mb-4" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold transition-colors uppercase">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">{game.icon}</span>
          <span className="font-black text-navy uppercase">{game.title}</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-black text-navy/50">
          <Coins className="w-3.5 h-3.5" />
          {credits}
        </div>
      </div>

      {/* How to play */}
      {game.howToPlay && (
        <div className="mb-6 p-4 rounded-lg border-2 border-navy/10 bg-navy/[0.03]">
          <p className="text-xs font-bold uppercase text-navy/40 mb-1">How to Play</p>
          <p className="text-sm text-navy/70 font-medium leading-relaxed">{game.howToPlay}</p>
        </div>
      )}

      {/* Render live game */}
      {GameComponent ? (
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="text-center">
              <div className="animate-spin rounded-full mx-auto mb-3"
                style={{ width: 32, height: 32, border: '4px solid #1A1A2E22', borderTopColor: '#1A1A2E' }} />
              <p className="text-navy/50 text-sm font-bold uppercase">Loading game...</p>
            </div>
          </div>
        }>
          <GameComponent game={game} />
          <BannerAd slot="inline" className="mt-6" />
        </Suspense>
      ) : (
        <div className="relative overflow-hidden min-h-[400px] flex items-center justify-center"
          style={{ backgroundColor: game.color, border: '3px solid #1A1A2E' }}>
          <div className="text-center p-8">
            <span className="text-6xl mb-6 block animate-float">{game.icon}</span>
            <h2 className={`text-2xl font-black ${game.color === '#C8FF00' || game.color === '#FFD600' ? 'text-navy' : 'text-white'} mb-3 uppercase`}>{game.title}</h2>
            <p className={`${game.color === '#C8FF00' || game.color === '#FFD600' ? 'text-navy/70' : 'text-white/80'} text-sm max-w-md mx-auto mb-6 font-medium`}>{game.description}</p>
            <div className={`inline-flex items-center gap-2 px-6 py-3 ${game.color === '#C8FF00' || game.color === '#FFD600' ? 'bg-navy text-white' : 'bg-white text-navy'} text-sm font-black uppercase border-2 border-navy`}>
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Coming soon
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

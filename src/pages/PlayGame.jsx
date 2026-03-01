import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ArrowLeft, Settings, Key } from 'lucide-react'
import { getGame } from '../lib/gameData'
import { useAuth } from '../context/AuthContext'
import { isConfigured, configureFal } from '../lib/fal'

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
        <p className="text-white font-bold text-lg mb-2">Sign in Required</p>
        <p className="text-gray-400 text-sm mb-4">
          You need to be signed in to play games.
        </p>
        <Link
          to="/login"
          className="inline-block px-5 py-2.5 rounded-xl bg-primary text-white font-medium text-sm no-underline"
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
        <p className="text-gray-400">Game not found.</p>
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
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="bg-surface-light rounded-2xl p-8 border border-white/5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Fal.ai API Key Required
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            This game uses AI image generation. Enter your Fal.ai API key to
            play. Your key is stored locally and never sent to our servers.
          </p>
          <form onSubmit={handleSetKey} className="space-y-3">
            <input
              type="password"
              placeholder="Enter your Fal.ai API key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-surface border border-white/10 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-primary/50"
            />
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium text-sm transition-colors"
            >
              Save & Continue
            </button>
          </form>
          <p className="text-gray-500 text-xs mt-4">
            Get your API key at{' '}
            <span className="text-primary">fal.ai</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">{game.icon}</span>
          <span className="font-bold text-white">{game.title}</span>
        </div>
        <button className="p-2 rounded-lg bg-surface-light text-gray-400 hover:text-white transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Game Area Placeholder */}
      <div
        className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${game.gradient} min-h-[400px] md:min-h-[500px] flex items-center justify-center`}
      >
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 text-center p-8">
          <span className="text-6xl mb-6 block animate-float">{game.icon}</span>
          <h2 className="text-2xl font-bold text-white mb-3">{game.title}</h2>
          <p className="text-white/70 text-sm max-w-md mx-auto mb-6">
            {game.description}
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/20 text-white text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Game ready — implementation coming soon
          </div>
        </div>
      </div>

      {/* Game Controls Placeholder */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {['Hint', 'Skip', 'Submit'].map((action) => (
          <button
            key={action}
            className="py-3 rounded-xl bg-surface-light border border-white/5 text-gray-400 text-sm font-medium hover:bg-surface-lighter hover:text-white transition-colors"
          >
            {action}
          </button>
        ))}
      </div>

      {/* Score Area */}
      <div className="mt-4 flex items-center justify-between bg-surface-light rounded-xl p-4 border border-white/5">
        <div>
          <p className="text-xs text-gray-500">Score</p>
          <p className="text-2xl font-bold text-white">0</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Round</p>
          <p className="text-2xl font-bold text-white">1/5</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Time</p>
          <p className="text-2xl font-bold text-accent">0:30</p>
        </div>
      </div>
    </div>
  )
}

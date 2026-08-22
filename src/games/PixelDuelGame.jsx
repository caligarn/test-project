import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'
import { useGameRounds } from '../hooks/useGameRounds'
import { promptSimilarity, pickRandom } from '../lib/similarity'
import StatsBar from '../components/game/StatsBar'
import GameOverCard from '../components/game/GameOverCard'
import GeneratingSpinner from '../components/game/GeneratingSpinner'
import ErrorBanner from '../components/game/ErrorBanner'
import GameImage from '../components/game/GameImage'

const CHALLENGES = [
  'A majestic snow-covered mountain peak at sunrise with pink clouds',
  'A cozy reading nook with a window overlooking rain',
  'A futuristic city skyline at night with neon lights',
  'A peaceful zen garden with raked sand and stones',
  'A colorful hot air balloon festival over green hills',
  'A mystical forest path with glowing mushrooms',
  'An old wooden sailboat on a calm turquoise sea',
  'A vibrant marketplace with hanging lanterns and spices',
  'A wolf howling at a full moon on a snowy ridge',
  'A glass greenhouse filled with exotic tropical plants',
  'A cyberpunk motorcycle parked in a rainy alley',
  'A fairy tale cottage with a thatched roof in wildflowers',
  'A bioluminescent cave with crystal formations',
  'An ancient temple overgrown with vines in the jungle',
  'A retro diner with chrome finishes and neon signs at dusk',
]

const MAX_ROUNDS = 5

export default function PixelDuelGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const { round, totalScore, gameOver, token, isStale, recordScore, nextRound, restart } =
    useGameRounds({ gameId: game.id, username, maxRounds: MAX_ROUNDS })
  const [targetUrl, setTargetUrl] = useState(null)
  const [playerUrl, setPlayerUrl] = useState(null)
  const [targetPrompt, setTargetPrompt] = useState(null)
  const [playerPrompt, setPlayerPrompt] = useState('')
  const [phase, setPhase] = useState('idle') // idle, loading-target, guessing, loading-player, result
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [usedChallenges, setUsedChallenges] = useState([])

  const startRound = async () => {
    setPhase('loading-target')
    setError(null)
    setPlayerUrl(null)
    setPlayerPrompt('')
    setResult(null)
    const prompt = pickRandom(CHALLENGES, usedChallenges)
    setTargetPrompt(prompt)
    setUsedChallenges(prev => [...prev, prompt])
    const t = token()
    try {
      const url = await generateImage(prompt)
      if (isStale(t)) return
      setTargetUrl(url)
      setPhase('guessing')
    } catch {
      if (isStale(t)) return
      setError('Failed to generate target image.')
      setPhase('idle')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!playerPrompt.trim()) return
    setPhase('loading-player')
    setError(null)
    const t = token()
    try {
      const url = await generateImage(playerPrompt.trim())
      if (isStale(t)) return
      setPlayerUrl(url)
      const similarity = promptSimilarity(playerPrompt, targetPrompt)
      const pts = Math.min(150, Math.round(similarity * 1.5))
      setResult({ similarity, pts })
      recordScore(pts)
      setPhase('result')
    } catch {
      if (isStale(t)) return
      setError('Failed to generate your image.')
      setPhase('guessing')
    }
  }

  const handleNextRound = () => {
    nextRound()
    setTargetUrl(null)
    setPlayerUrl(null)
    setResult(null)
    setPhase('idle')
  }

  const handleRestart = () => {
    restart()
    setTargetUrl(null)
    setPlayerUrl(null)
    setTargetPrompt(null)
    setPlayerPrompt('')
    setResult(null)
    setError(null)
    setUsedChallenges([])
    setPhase('idle')
  }

  if (gameOver) {
    return (
      <div className="flex flex-col gap-4">
        <GameOverCard
          emoji="⚔️"
          title="Duel Complete!"
          score={`${totalScore} pts`}
          subtitle={`across ${MAX_ROUNDS} rounds`}
          onRestart={handleRestart}
          restartLabel="Duel Again"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <StatsBar
        stats={[
          { label: 'Round', value: `${round}/${MAX_ROUNDS}` },
          { label: 'Prompt Match', value: result ? `${result.similarity}%` : '—' },
          { label: 'Score', value: totalScore, color: '#FF2D55' },
        ]}
      />

      <ErrorBanner message={error} />

      {phase === 'idle' && (
        <div className="brutalist-card p-12 text-center">
          <p className="text-5xl mb-4">⚔️</p>
          <h3 className="font-black text-navy uppercase mb-2">Round {round} — Ready?</h3>
          <p className="text-navy/50 text-sm mb-6 font-medium">A target image will appear. Write a prompt to recreate it as closely as possible!</p>
          <button onClick={startRound}
            className="px-8 py-3 bg-primary text-white font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Show Target
          </button>
        </div>
      )}

      {phase === 'loading-target' && (
        <GeneratingSpinner label="Generating target image..." color="#1A1A2E" />
      )}

      {phase === 'guessing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-black text-navy/50 uppercase mb-2">Target — Recreate This</p>
            <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
              <GameImage src={targetUrl} alt="Target" className="w-full object-cover" style={{ maxHeight: 400 }} eager />
            </div>
          </div>
          <div className="brutalist-card p-6 flex flex-col gap-4">
            <h3 className="font-black text-navy uppercase text-sm">Write your prompt</h3>
            <p className="text-navy/50 text-xs font-medium">Describe the image in your own words. AI will generate a new image from your prompt.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
              <textarea
                autoFocus
                value={playerPrompt}
                onChange={(e) => setPlayerPrompt(e.target.value)}
                placeholder="Describe the target image..."
                rows={5}
                className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium resize-none flex-1"
                style={{ border: '3px solid #1A1A2E' }}
              />
              <button type="submit" disabled={!playerPrompt.trim()}
                className="w-full py-3 bg-accent text-navy text-sm font-black uppercase disabled:opacity-40"
                style={{ border: '2px solid #1A1A2E' }}>
                Generate My Version
              </button>
            </form>
          </div>
        </div>
      )}

      {phase === 'loading-player' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-black text-navy/50 uppercase mb-2">Target</p>
            <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
              <GameImage src={targetUrl} alt="Target" className="w-full object-cover" style={{ maxHeight: 400 }} eager />
            </div>
          </div>
          <GeneratingSpinner label="Generating your image..." color="#1A1A2E" />
        </div>
      )}

      {phase === 'result' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-black text-navy/50 uppercase mb-2">Target</p>
              <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
                <GameImage src={targetUrl} alt="Target" className="w-full object-cover" style={{ maxHeight: 350 }} eager />
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-navy/50 uppercase mb-2">Your Recreation</p>
              <div style={{ border: '3px solid #C8FF00', overflow: 'hidden' }}>
                <GameImage src={playerUrl} alt="Player" className="w-full object-cover" style={{ maxHeight: 350 }} eager />
              </div>
            </div>
          </div>
          <div className="brutalist-card p-6 text-center">
            <p className="text-4xl mb-2">{result.similarity >= 60 ? '🎯' : result.similarity >= 30 ? '⚔️' : '💪'}</p>
            <p className="text-3xl font-black text-primary mb-1">+{result.pts} pts</p>
            <p className="text-sm font-black text-navy/50 uppercase mb-3">{result.similarity}% prompt match</p>
            <div className="text-left max-w-md mx-auto space-y-1 mb-4">
              <p className="text-xs font-black text-navy/50 uppercase">Original prompt</p>
              <p className="text-sm text-navy font-medium">{targetPrompt}</p>
            </div>
            <button onClick={handleNextRound}
              className="px-8 py-3 bg-navy text-white font-black uppercase text-sm"
              style={{ border: '2px solid #1A1A2E' }}>
              {round >= MAX_ROUNDS ? 'See Final Score' : 'Next Round →'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

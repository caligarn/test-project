import { useState, useCallback } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'

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

function promptSimilarity(playerPrompt, targetPrompt) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean)
  const playerWords = new Set(normalize(playerPrompt))
  const targetWords = normalize(targetPrompt)
  const targetSet = new Set(targetWords)

  let semanticScore = 0
  for (const w of playerWords) {
    if (targetSet.has(w)) semanticScore += 2
    else {
      for (const tw of targetWords) {
        if (tw.includes(w) || w.includes(tw)) { semanticScore += 1; break }
      }
    }
  }
  const maxPossible = targetWords.length * 2
  return Math.min(100, Math.round((semanticScore / maxPossible) * 100))
}

export default function PixelDuelGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const [round, setRound] = useState(1)
  const [totalScore, setTotalScore] = useState(0)
  const [targetUrl, setTargetUrl] = useState(null)
  const [playerUrl, setPlayerUrl] = useState(null)
  const [targetPrompt, setTargetPrompt] = useState(null)
  const [playerPrompt, setPlayerPrompt] = useState('')
  const [phase, setPhase] = useState('idle') // idle, loading-target, guessing, loading-player, result, gameover
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [usedChallenges, setUsedChallenges] = useState([])

  const maxRounds = 5

  const pickChallenge = useCallback(() => {
    const available = CHALLENGES.filter(c => !usedChallenges.includes(c))
    const pool = available.length > 0 ? available : CHALLENGES
    return pool[Math.floor(Math.random() * pool.length)]
  }, [usedChallenges])

  const startRound = async () => {
    setPhase('loading-target')
    setError(null)
    setPlayerUrl(null)
    setPlayerPrompt('')
    setResult(null)
    const prompt = pickChallenge()
    setTargetPrompt(prompt)
    setUsedChallenges(prev => [...prev, prompt])
    try {
      const url = await generateImage(prompt)
      setTargetUrl(url)
      setPhase('guessing')
    } catch {
      setError('Failed to generate target image.')
      setPhase('idle')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!playerPrompt.trim()) return
    setPhase('loading-player')
    setError(null)
    try {
      const url = await generateImage(playerPrompt.trim())
      setPlayerUrl(url)
      const similarity = promptSimilarity(playerPrompt, targetPrompt)
      const pts = Math.round(similarity * 1.5)
      setResult({ similarity, pts })
      setTotalScore(s => s + pts)
      addScore(game.id, username, pts, { playerPrompt, targetPrompt, similarity })
      setPhase('result')
    } catch {
      setError('Failed to generate your image.')
      setPhase('guessing')
    }
  }

  const nextRound = () => {
    if (round >= maxRounds) {
      setPhase('gameover')
      return
    }
    setRound(r => r + 1)
    setTargetUrl(null)
    setPhase('idle')
  }

  const restart = () => {
    setRound(1)
    setTotalScore(0)
    setTargetUrl(null)
    setPlayerUrl(null)
    setTargetPrompt(null)
    setResult(null)
    setUsedChallenges([])
    setPhase('idle')
  }

  if (phase === 'gameover') {
    return (
      <div className="flex flex-col gap-4">
        <div className="brutalist-card p-8 text-center">
          <p className="text-5xl mb-4">⚔️</p>
          <h3 className="text-2xl font-black text-navy uppercase mb-2">Duel Complete!</h3>
          <p className="text-4xl font-black text-primary mb-2">{totalScore} pts</p>
          <p className="text-navy/50 text-sm font-medium mb-6">across {maxRounds} rounds</p>
          <button onClick={restart}
            className="px-8 py-3 bg-primary text-white font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Duel Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center justify-between brutalist-card p-4">
        <div><p className="text-xs font-black text-navy/50 uppercase">Round</p><p className="text-3xl font-black text-navy">{round}/{maxRounds}</p></div>
        <div className="text-center"><p className="text-xs font-black text-navy/50 uppercase">Similarity</p>
          <p className="text-3xl font-black text-navy">{result ? `${result.similarity}%` : '—'}</p>
        </div>
        <div className="text-right"><p className="text-xs font-black text-navy/50 uppercase">Score</p><p className="text-3xl font-black text-primary">{totalScore}</p></div>
      </div>

      {error && <div className="p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium">{error}</div>}

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
        <div className="brutalist-card p-12 text-center">
          <div className="animate-spin rounded-full mx-auto mb-4" style={{ width: 40, height: 40, border: '4px solid #1A1A2E', borderTopColor: 'transparent' }} />
          <p className="font-black text-navy uppercase">Generating target image...</p>
        </div>
      )}

      {phase === 'guessing' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-black text-navy/50 uppercase mb-2">Target — Recreate This</p>
            <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
              <img src={targetUrl} alt="Target" className="w-full object-cover" style={{ maxHeight: 400 }} />
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
              <img src={targetUrl} alt="Target" className="w-full object-cover" style={{ maxHeight: 400 }} />
            </div>
          </div>
          <div className="brutalist-card p-12 text-center flex items-center justify-center">
            <div>
              <div className="animate-spin rounded-full mx-auto mb-4" style={{ width: 40, height: 40, border: '4px solid #1A1A2E', borderTopColor: 'transparent' }} />
              <p className="font-black text-navy uppercase text-sm">Generating your image...</p>
            </div>
          </div>
        </div>
      )}

      {phase === 'result' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-black text-navy/50 uppercase mb-2">Target</p>
              <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
                <img src={targetUrl} alt="Target" className="w-full object-cover" style={{ maxHeight: 350 }} />
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-navy/50 uppercase mb-2">Your Recreation</p>
              <div style={{ border: '3px solid #C8FF00', overflow: 'hidden' }}>
                <img src={playerUrl} alt="Player" className="w-full object-cover" style={{ maxHeight: 350 }} />
              </div>
            </div>
          </div>
          <div className="brutalist-card p-6 text-center">
            <p className="text-4xl mb-2">{result.similarity >= 60 ? '🎯' : result.similarity >= 30 ? '⚔️' : '💪'}</p>
            <p className="text-3xl font-black text-primary mb-1">+{result.pts} pts</p>
            <p className="text-sm font-black text-navy/50 uppercase mb-3">{result.similarity}% prompt similarity</p>
            <div className="text-left max-w-md mx-auto space-y-1 mb-4">
              <p className="text-xs font-black text-navy/50 uppercase">Original prompt</p>
              <p className="text-sm text-navy font-medium">{targetPrompt}</p>
            </div>
            <button onClick={nextRound}
              className="px-8 py-3 bg-navy text-white font-black uppercase text-sm"
              style={{ border: '2px solid #1A1A2E' }}>
              {round >= maxRounds ? 'See Final Score' : 'Next Round →'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

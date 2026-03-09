import { useState, useCallback } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'

const PROMPTS = [
  'A cat wearing a tiny top hat sitting on a throne',
  'A lighthouse on a cliff during a thunderstorm at night',
  'A robot painting a self portrait in an art studio',
  'An underwater city with glowing jellyfish streetlights',
  'A dragon reading a book in a cozy library',
  'A fox running through a field of sunflowers at sunset',
  'Astronaut playing guitar on the surface of Mars',
  'A medieval castle made entirely of candy and sweets',
  'A whale flying through clouds above a mountain range',
  'A vintage car driving on a road through a giant forest',
  'A wizard casting spells in a neon-lit cyberpunk alley',
  'A polar bear ice skating on a frozen lake at dawn',
  'A treehouse city connected by rope bridges in a jungle',
  'A giant octopus wrapping around a pirate ship',
  'A cozy cabin in the woods during a snowstorm with warm light',
  'A steampunk train crossing a bridge over a canyon',
  'A garden of crystal flowers glowing under moonlight',
  'A samurai standing in a cherry blossom storm',
  'A floating island with a waterfall pouring into clouds',
  'A hummingbird made of stained glass in a cathedral',
]

function scoreSimilarity(guess, original) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean)
  const guessWords = normalize(guess)
  const origWords = normalize(original)
  if (guessWords.length === 0) return 0

  const origSet = new Set(origWords)
  let matches = 0
  for (const w of guessWords) {
    if (origSet.has(w)) matches++
    else {
      for (const ow of origWords) {
        if (ow.includes(w) || w.includes(ow)) { matches += 0.5; break }
      }
    }
  }

  const precision = matches / guessWords.length
  const recall = matches / origWords.length
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
  return Math.round(f1 * 100)
}

export default function PromptGuesserGame({ game }) {
  const { user } = useAuth()
  const [round, setRound] = useState(1)
  const [totalScore, setTotalScore] = useState(0)
  const [imageUrl, setImageUrl] = useState(null)
  const [hiddenPrompt, setHiddenPrompt] = useState(null)
  const [guess, setGuess] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [hintUsed, setHintUsed] = useState(false)
  const [hint, setHint] = useState('')
  const [usedPrompts, setUsedPrompts] = useState([])

  const maxRounds = 5

  const pickPrompt = useCallback(() => {
    const available = PROMPTS.filter(p => !usedPrompts.includes(p))
    const pool = available.length > 0 ? available : PROMPTS
    return pool[Math.floor(Math.random() * pool.length)]
  }, [usedPrompts])

  const startRound = async () => {
    setGenerating(true)
    setResult(null)
    setGuess('')
    setHint('')
    setHintUsed(false)
    setError(null)
    const prompt = pickPrompt()
    setHiddenPrompt(prompt)
    setUsedPrompts(prev => [...prev, prompt])
    try {
      const url = await generateImage(prompt)
      setImageUrl(url)
    } catch {
      setError('Image generation failed — check your API key.')
    } finally {
      setGenerating(false)
    }
  }

  const handleGuess = (e) => {
    e.preventDefault()
    if (!guess.trim() || !hiddenPrompt) return
    const similarity = scoreSimilarity(guess, hiddenPrompt)
    const hintPenalty = hintUsed ? 0.5 : 1
    const pts = Math.round(similarity * hintPenalty)
    setResult({ similarity, pts })
    setTotalScore(s => s + pts)
    addScore(game.id, user.username, pts, { guess, actual: hiddenPrompt, similarity })
  }

  const showHint = () => {
    if (hintUsed || !hiddenPrompt) return
    const words = hiddenPrompt.split(' ')
    const revealCount = Math.max(1, Math.floor(words.length * 0.3))
    const indices = []
    while (indices.length < revealCount) {
      const i = Math.floor(Math.random() * words.length)
      if (!indices.includes(i)) indices.push(i)
    }
    const hintWords = words.map((w, i) => indices.includes(i) ? w : '____')
    setHint(hintWords.join(' '))
    setHintUsed(true)
  }

  const nextRound = () => {
    if (round >= maxRounds) {
      setResult({ ...result, gameOver: true })
      return
    }
    setRound(r => r + 1)
    setImageUrl(null)
    setHiddenPrompt(null)
    setResult(null)
  }

  const restart = () => {
    setRound(1)
    setTotalScore(0)
    setImageUrl(null)
    setHiddenPrompt(null)
    setResult(null)
    setUsedPrompts([])
    setError(null)
  }

  // Game over screen
  if (result?.gameOver) {
    return (
      <div className="flex flex-col gap-4">
        <div className="brutalist-card p-8 text-center">
          <p className="text-5xl mb-4">🏆</p>
          <h3 className="text-2xl font-black text-navy uppercase mb-2">Game Over!</h3>
          <p className="text-4xl font-black text-primary mb-2">{totalScore} pts</p>
          <p className="text-navy/50 text-sm font-medium mb-6">across {maxRounds} rounds</p>
          <button onClick={restart}
            className="px-8 py-3 bg-primary text-white font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Play Again
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
        <div className="text-center"><p className="text-xs font-black text-navy/50 uppercase">Accuracy</p>
          <p className="text-3xl font-black text-navy">{result ? `${result.similarity}%` : '—'}</p>
        </div>
        <div className="text-right"><p className="text-xs font-black text-navy/50 uppercase">Score</p><p className="text-3xl font-black text-primary">{totalScore}</p></div>
      </div>

      {error && <div className="p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium">{error}</div>}

      {/* No image yet — start round */}
      {!imageUrl && !generating && (
        <div className="brutalist-card p-12 text-center">
          <p className="text-5xl mb-4">🔍</p>
          <h3 className="font-black text-navy uppercase mb-2">Ready for Round {round}?</h3>
          <p className="text-navy/50 text-sm mb-6 font-medium">AI will generate an image from a hidden prompt. Try to guess what it was!</p>
          <button onClick={startRound}
            className="px-8 py-3 bg-primary text-white font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Generate Image
          </button>
        </div>
      )}

      {/* Generating */}
      {generating && (
        <div className="brutalist-card p-12 text-center">
          <div className="animate-spin rounded-full mx-auto mb-4" style={{ width: 40, height: 40, border: '4px solid #1A1A2E', borderTopColor: 'transparent' }} />
          <p className="font-black text-navy uppercase">Generating mystery image...</p>
        </div>
      )}

      {/* Image shown — guessing phase */}
      {imageUrl && !result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
            <img src={imageUrl} alt="Mystery" className="w-full object-cover" style={{ maxHeight: 400 }} />
          </div>
          <div className="brutalist-card p-6 flex flex-col gap-4">
            <h3 className="font-black text-navy uppercase text-sm">What prompt created this?</h3>
            {hint && (
              <div className="p-3 bg-highlight/20 border-2 border-highlight text-navy text-sm font-medium">
                <span className="font-black uppercase text-xs block mb-1">Hint (-50% pts)</span>
                {hint}
              </div>
            )}
            <form onSubmit={handleGuess} className="flex flex-col gap-3 flex-1">
              <textarea
                autoFocus
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Describe what you think the prompt was..."
                rows={4}
                className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium resize-none flex-1"
                style={{ border: '3px solid #1A1A2E' }}
              />
              <div className="flex gap-2">
                {!hintUsed && (
                  <button type="button" onClick={showHint}
                    className="px-4 py-2 text-navy text-sm font-black uppercase hover:bg-gray-100 transition-colors"
                    style={{ border: '2px solid #1A1A2E' }}>
                    💡 Hint
                  </button>
                )}
                <button type="submit" disabled={!guess.trim()}
                  className="flex-1 py-2 bg-primary text-white text-sm font-black uppercase disabled:opacity-40"
                  style={{ border: '2px solid #1A1A2E' }}>
                  Submit Guess
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Result shown */}
      {result && !result.gameOver && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
            <img src={imageUrl} alt="Mystery" className="w-full object-cover" style={{ maxHeight: 400 }} />
          </div>
          <div className="brutalist-card p-6 flex flex-col gap-4">
            <div className="text-center">
              <p className="text-4xl mb-2">{result.similarity >= 60 ? '🎯' : result.similarity >= 30 ? '👍' : '😅'}</p>
              <p className="text-3xl font-black text-primary">+{result.pts} pts</p>
              <p className="text-sm font-black text-navy/50 uppercase">{result.similarity}% match</p>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-black text-navy/50 uppercase mb-1">Your Guess</p>
                <p className="text-sm text-navy font-medium">{guess}</p>
              </div>
              <div>
                <p className="text-xs font-black text-navy/50 uppercase mb-1">Actual Prompt</p>
                <p className="text-sm text-primary font-bold">{hiddenPrompt}</p>
              </div>
            </div>
            <button onClick={nextRound}
              className="w-full py-3 bg-navy text-white font-black uppercase text-sm"
              style={{ border: '2px solid #1A1A2E' }}>
              {round >= maxRounds ? 'See Final Score' : 'Next Round →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

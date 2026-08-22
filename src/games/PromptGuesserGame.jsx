import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'
import { useGameRounds } from '../hooks/useGameRounds'
import { promptSimilarityDetail, pickRandom, shuffle } from '../lib/similarity'
import StatsBar from '../components/game/StatsBar'
import GameOverCard from '../components/game/GameOverCard'
import GeneratingSpinner from '../components/game/GeneratingSpinner'
import ErrorBanner from '../components/game/ErrorBanner'
import GameImage from '../components/game/GameImage'

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

const MAX_ROUNDS = 5

export default function PromptGuesserGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const { round, totalScore, gameOver, token, isStale, recordScore, nextRound, restart } =
    useGameRounds({ gameId: game.id, username, maxRounds: MAX_ROUNDS })
  const [imageUrl, setImageUrl] = useState(null)
  const [hiddenPrompt, setHiddenPrompt] = useState(null)
  const [guess, setGuess] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [hintUsed, setHintUsed] = useState(false)
  const [hint, setHint] = useState('')
  const [usedPrompts, setUsedPrompts] = useState([])

  const startRound = async () => {
    setGenerating(true)
    setResult(null)
    setGuess('')
    setHint('')
    setHintUsed(false)
    setError(null)
    const prompt = pickRandom(PROMPTS, usedPrompts)
    setHiddenPrompt(prompt)
    setUsedPrompts(prev => [...prev, prompt])
    const t = token()
    try {
      const url = await generateImage(prompt)
      if (isStale(t)) return
      setImageUrl(url)
    } catch {
      if (isStale(t)) return
      setError('Image generation failed — check your API key.')
    } finally {
      if (!isStale(t)) setGenerating(false)
    }
  }

  const handleGuess = (e) => {
    e.preventDefault()
    if (!guess.trim() || !hiddenPrompt) return
    const { score, matchedWords } = promptSimilarityDetail(guess, hiddenPrompt)
    const hintPenalty = hintUsed ? 0.5 : 1
    const pts = Math.round(score * hintPenalty)
    setResult({ similarity: score, matchedWords, pts })
    recordScore(pts)
  }

  const showHint = () => {
    if (hintUsed || !hiddenPrompt) return
    const words = hiddenPrompt.split(' ')
    // Only reveal content words (4+ characters), never filler like "a" or "the"
    const contentIndices = words
      .map((w, i) => (w.replace(/[^a-zA-Z0-9]/g, '').length >= 4 ? i : -1))
      .filter(i => i !== -1)
    const revealCount = Math.max(1, Math.floor(contentIndices.length * 0.3))
    const revealed = new Set(shuffle(contentIndices).slice(0, revealCount))
    const hintWords = words.map((w, i) => (revealed.has(i) ? w : '____'))
    setHint(hintWords.join(' '))
    setHintUsed(true)
  }

  const handleNextRound = () => {
    nextRound()
    setImageUrl(null)
    setHiddenPrompt(null)
    setResult(null)
  }

  const handleRestart = () => {
    restart()
    setImageUrl(null)
    setHiddenPrompt(null)
    setGuess('')
    setGenerating(false)
    setResult(null)
    setError(null)
    setHintUsed(false)
    setHint('')
    setUsedPrompts([])
  }

  // Game over screen
  if (gameOver) {
    return (
      <div className="flex flex-col gap-4">
        <GameOverCard
          emoji="🏆"
          title="Game Over!"
          score={`${totalScore} pts`}
          subtitle={`across ${MAX_ROUNDS} rounds`}
          onRestart={handleRestart}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <StatsBar
        stats={[
          { label: 'Round', value: `${round}/${MAX_ROUNDS}` },
          { label: 'Accuracy', value: result ? `${result.similarity}%` : '—' },
          { label: 'Score', value: totalScore, color: '#FF2D55' },
        ]}
      />

      <ErrorBanner message={error} />

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
        <GeneratingSpinner label="Generating mystery image..." color="#1A1A2E" />
      )}

      {/* Image shown — guessing phase */}
      {imageUrl && !generating && !result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
            <GameImage src={imageUrl} alt="Mystery" className="w-full object-cover" style={{ maxHeight: 400 }} eager />
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
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
            <GameImage src={imageUrl} alt="Mystery" className="w-full object-cover" style={{ maxHeight: 400 }} eager />
          </div>
          <div className="brutalist-card p-6 flex flex-col gap-4">
            <div className="text-center">
              <p className="text-4xl mb-2">{result.similarity >= 60 ? '🎯' : result.similarity >= 30 ? '👍' : '😅'}</p>
              <p className="text-3xl font-black text-primary">+{result.pts} pts</p>
              <p className="text-sm font-black text-navy/50 uppercase">{result.similarity}% match</p>
              {result.matchedWords.length > 0 && (
                <p className="text-xs text-navy/50 font-medium mt-1">
                  Matched: {result.matchedWords.join(', ')}
                </p>
              )}
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
            <button onClick={handleNextRound}
              className="w-full py-3 bg-navy text-white font-black uppercase text-sm"
              style={{ border: '2px solid #1A1A2E' }}>
              {round >= MAX_ROUNDS ? 'See Final Score' : 'Next Round →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

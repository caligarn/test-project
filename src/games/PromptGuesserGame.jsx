import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { generateImage, judge } from '../lib/fal'
import { useGameRounds } from '../hooks/useGameRounds'
import { useMachine } from '../hooks/useMachine'
import { promptGuesserMachine } from '../machines/promptGuesser'
import { promptSimilarityDetail, pickRandom, shuffle } from '../lib/similarity'
import StatsBar from '../components/game/StatsBar'
import GameOverCard from '../components/game/GameOverCard'
import GeneratingSpinner from '../components/game/GeneratingSpinner'
import ErrorBanner from '../components/game/ErrorBanner'
import GameImage from '../components/game/GameImage'

// Prompt Guesser (merged with the old Pixel Duel): guess the hidden prompt,
// we draw the guess, and the score is words found + how alike the images look.
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
  // From the old Pixel Duel challenge list
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
// Up to 100 for words + up to 100 for looks = 200 per round, 1000 per game
// (the maxScore for prompt-guesser in gameLimits.js).
const HINT_PENALTY = 0.5

function scoreRound(wordScore, lookScore, hintUsed) {
  const raw = wordScore + lookScore
  return Math.round(hintUsed ? raw * HINT_PENALTY : raw)
}

export default function PromptGuesserGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const { round, totalScore, gameOver, token, isStale, recordScore, nextRound, restart } =
    useGameRounds({ gameId: game.id, username, maxRounds: MAX_ROUNDS })
  const flow = useMachine(promptGuesserMachine) // see src/machines/promptGuesser.js
  const phase = flow.state
  const [imageUrl, setImageUrl] = useState(null)
  const [guessUrl, setGuessUrl] = useState(null)
  const [hiddenPrompt, setHiddenPrompt] = useState(null)
  const [guess, setGuess] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [hintUsed, setHintUsed] = useState(false)
  const [hint, setHint] = useState('')
  const [usedPrompts, setUsedPrompts] = useState([])

  const startRound = async () => {
    if (!flow.send('START')) return
    setResult(null)
    setGuess('')
    setGuessUrl(null)
    setHint('')
    setHintUsed(false)
    setError(null)
    const prompt = pickRandom(PROMPTS, usedPrompts)
    const t = token()
    try {
      const url = await generateImage(prompt)
      if (isStale(t)) return
      if (!flow.send('LOADED')) return
      setHiddenPrompt(prompt)
      setUsedPrompts(prev => [...prev, prompt])
      setImageUrl(url)
    } catch (err) {
      if (isStale(t)) return
      if (!flow.send('LOAD_FAILED')) return
      setError(err?.message ? `Could not make the image: ${err.message}` : 'Could not make the image. Try again.')
    }
  }

  const handleGuess = async (e) => {
    e.preventDefault()
    const text = guess.trim()
    if (!text || !hiddenPrompt) return
    // Only one guess per round: a second submit while drawing is ignored.
    if (!flow.send('GUESS')) return
    setError(null)
    const { score: wordScore, matchedWords } = promptSimilarityDetail(text, hiddenPrompt)
    const t = token()

    // 1. Draw the player's guess.
    let drawn = null
    try {
      drawn = await generateImage(text)
    } catch {
      drawn = null
    }
    if (isStale(t)) return
    if (!flow.send(drawn ? 'DRAWN' : 'DRAW_FAILED')) return
    setGuessUrl(drawn)

    // 2. Ask the judge how close the two images look.
    let verdict = { score: null, comment: '' }
    if (drawn) {
      verdict = await judge('match-image', { targetUrl: imageUrl, imageUrl: drawn })
      if (isStale(t)) return
      if (!flow.send('JUDGED')) return
    }

    const judged = verdict.score != null
    const lookScore = judged ? verdict.score : wordScore
    const pts = scoreRound(wordScore, lookScore, hintUsed)
    setResult({
      wordScore,
      lookScore,
      judged,
      drawn: !!drawn,
      comment: judged ? verdict.comment : '',
      matchedWords,
      pts,
    })
    recordScore(pts)
  }

  const showHint = () => {
    if (hintUsed || !hiddenPrompt || !flow.is('guessing')) return
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
    setGuessUrl(null)
    setHiddenPrompt(null)
    setResult(null)
    flow.send(round >= MAX_ROUNDS ? 'FINISH' : 'NEXT')
  }

  const handleRestart = () => {
    restart()
    setImageUrl(null)
    setGuessUrl(null)
    setHiddenPrompt(null)
    setGuess('')
    setResult(null)
    setError(null)
    setHintUsed(false)
    setHint('')
    setUsedPrompts([])
    flow.send('RESTART')
  }

  if (gameOver) {
    return (
      <div className="flex flex-col gap-4" {...flow.attrs}>
        <GameOverCard
          emoji="🏆"
          title="Game Over!"
          score={`${totalScore} pts`}
          subtitle={`across ${MAX_ROUNDS} rounds (max ${MAX_ROUNDS * 200})`}
          onRestart={handleRestart}
        />
      </div>
    )
  }

  const busy = phase === 'drawing' || phase === 'judging'

  return (
    <div className="flex flex-col gap-4" {...flow.attrs}>
      <StatsBar
        stats={[
          { label: 'Round', value: `${round}/${MAX_ROUNDS}` },
          { label: 'Last', value: result ? `+${result.pts}` : '-' },
          { label: 'Score', value: totalScore, color: '#FF2D55' },
        ]}
      />

      <ErrorBanner message={error} />

      {phase === 'idle' && (
        <div className="brutalist-card p-8 sm:p-12 text-center">
          <p className="text-5xl mb-4">🔍</p>
          <h3 className="font-black text-navy uppercase mb-2">Ready for Round {round}?</h3>
          <p className="text-navy/50 text-sm mb-6 font-medium max-w-md mx-auto">
            The AI makes an image from a hidden prompt. Guess the prompt. We draw your guess too, and you score for matching words and matching looks.
          </p>
          <button onClick={startRound}
            className="px-8 py-3 bg-primary text-white font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Show Mystery Image
          </button>
        </div>
      )}

      {phase === 'loading-target' && (
        <GeneratingSpinner label="Making the mystery image..." color="#1A1A2E" />
      )}

      {(phase === 'guessing' || busy) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-black text-navy/50 uppercase mb-2">Mystery image</p>
            <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
              <GameImage src={imageUrl} alt="Mystery" className="w-full object-cover" style={{ maxHeight: 400 }} eager />
            </div>
          </div>
          {busy ? (
            <div className="flex flex-col gap-2">
              <GeneratingSpinner
                label={phase === 'drawing' ? 'Drawing your guess...' : 'The judge is comparing...'}
                color="#1A1A2E"
              />
              <p className="text-navy/50 text-xs font-medium text-center break-words">"{guess.trim()}"</p>
            </div>
          ) : (
            <div className="brutalist-card p-4 sm:p-6 flex flex-col gap-4">
              <h3 className="font-black text-navy uppercase text-sm">What prompt made this?</h3>
              {hint && (
                <div className="p-3 bg-highlight/20 border-2 border-highlight text-navy text-sm font-medium">
                  <span className="font-black uppercase text-xs block mb-1">Hint (half points)</span>
                  {hint}
                </div>
              )}
              <form onSubmit={handleGuess} className="flex flex-col gap-3 flex-1">
                <textarea
                  autoFocus
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  maxLength={300}
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
                    Guess and Draw
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {phase === 'result' && result && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-black text-navy/50 uppercase mb-2">Original</p>
              <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
                <GameImage src={imageUrl} alt="Original" className="w-full aspect-square object-cover" eager />
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-navy/50 uppercase mb-2">Your guess, drawn</p>
              <div style={{ border: '3px solid #C8FF00', overflow: 'hidden' }}>
                <GameImage src={guessUrl} alt="Your guess" className="w-full aspect-square object-cover" eager />
              </div>
            </div>
          </div>

          <div className="brutalist-card p-4 sm:p-6 flex flex-col gap-4">
            <div className="text-center">
              <p className="text-4xl mb-1">{result.pts >= 120 ? '🎯' : result.pts >= 60 ? '👍' : '😅'}</p>
              <p className="text-3xl font-black text-primary">+{result.pts} pts</p>
              {hintUsed && <p className="text-xs font-bold text-navy/50 uppercase">Hint used: half points</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 text-center" style={{ border: '2px solid #1A1A2E' }}>
                <p className="text-xs font-black text-navy/50 uppercase">Words</p>
                <p className="text-2xl font-black text-navy">{result.wordScore}<span className="text-sm text-navy/40">/100</span></p>
              </div>
              <div className="p-3 text-center" style={{ border: '2px solid #1A1A2E' }}>
                <p className="text-xs font-black text-navy/50 uppercase">Looks</p>
                <p className="text-2xl font-black text-navy">{result.lookScore}<span className="text-sm text-navy/40">/100</span></p>
              </div>
            </div>

            {result.comment && (
              <p className="text-sm text-navy font-bold text-center italic">⚖️ "{result.comment}"</p>
            )}
            {!result.judged && (
              <p className="text-xs text-navy/50 font-medium text-center">
                {result.drawn
                  ? 'The visual judge is unavailable right now, so Looks uses your word score.'
                  : 'We could not draw your guess, so Looks uses your word score.'}
              </p>
            )}

            <div className="space-y-2">
              <div>
                <p className="text-xs font-black text-navy/50 uppercase mb-1">Your guess</p>
                <p className="text-sm text-navy font-medium break-words">{guess}</p>
              </div>
              <div>
                <p className="text-xs font-black text-navy/50 uppercase mb-1">Real prompt</p>
                <p className="text-sm text-primary font-bold break-words">{hiddenPrompt}</p>
              </div>
              <p className="text-xs text-navy/50 font-medium">
                {result.matchedWords.length > 0
                  ? `Matched words: ${result.matchedWords.join(', ')}`
                  : 'No matching words this time.'}
              </p>
            </div>
            <button onClick={handleNextRound}
              className="w-full py-3 bg-navy text-white font-black uppercase text-sm"
              style={{ border: '2px solid #1A1A2E' }}>
              {round >= MAX_ROUNDS ? 'See Final Score' : 'Next Round →'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

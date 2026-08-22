import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'
import { useGameRounds } from '../hooks/useGameRounds'
import { useRoundTimer } from '../hooks/useRoundTimer'
import { pickRandom } from '../lib/similarity'
import StatsBar from '../components/game/StatsBar'
import GameOverCard from '../components/game/GameOverCard'
import GeneratingSpinner from '../components/game/GeneratingSpinner'
import ErrorBanner from '../components/game/ErrorBanner'
import GameImage from '../components/game/GameImage'

const CONCEPTS = [
  { concept: 'A peaceful morning', hint: 'Think sunrise, coffee, calm...' },
  { concept: 'Space exploration', hint: 'Think rockets, stars, astronauts...' },
  { concept: 'Underwater world', hint: 'Think coral, fish, deep blue...' },
  { concept: 'Autumn in the city', hint: 'Think falling leaves, warm tones...' },
  { concept: 'Fantasy battle', hint: 'Think swords, dragons, magic...' },
  { concept: 'Cozy winter night', hint: 'Think fireplace, snow, warmth...' },
  { concept: 'Tropical paradise', hint: 'Think beaches, palm trees, sunset...' },
  { concept: 'Steampunk invention', hint: 'Think gears, brass, Victorian...' },
  { concept: 'Haunted mansion', hint: 'Think ghosts, shadows, creaky doors...' },
  { concept: 'Garden of Eden', hint: 'Think lush, flowers, paradise...' },
  { concept: 'Racing through neon', hint: 'Think speed, lights, night city...' },
  { concept: 'Ancient ruins discovery', hint: 'Think archaeology, temple, mystery...' },
  { concept: 'Sky kingdom', hint: 'Think floating islands, clouds, castles...' },
  { concept: 'Robot companion', hint: 'Think friendly, mechanical, futuristic...' },
  { concept: 'Storm at sea', hint: 'Think waves, lightning, ships...' },
]

const MAX_ROUNDS = 5
const TIME_LIMIT = 30

export default function SpeedPromptGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const { round, totalScore, gameOver, token, isStale, recordScore, nextRound, restart } =
    useGameRounds({ gameId: game.id, username, maxRounds: MAX_ROUNDS })
  const [concept, setConcept] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [phase, setPhase] = useState('idle') // idle, writing, generating, result
  const [imageUrl, setImageUrl] = useState(null)
  const [error, setError] = useState(null)
  const [roundScore, setRoundScore] = useState(0)
  const [usedConcepts, setUsedConcepts] = useState([])
  const inputRef = useRef(null)

  // Auto-submit through a latest-render ref so the timer never submits a stale prompt
  const submitRef = useRef(() => {})
  const { timeLeft, start: startTimer, stop: stopTimer } = useRoundTimer(() => submitRef.current())

  const startRound = () => {
    const c = pickRandom(CONCEPTS, usedConcepts)
    setConcept(c)
    setUsedConcepts(prev => [...prev, c])
    setPrompt('')
    setImageUrl(null)
    setError(null)
    setPhase('writing')
    startTimer(TIME_LIMIT)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleSubmit = async () => {
    if (phase !== 'writing') return
    stopTimer()

    const finalPrompt = prompt.trim()
    if (!finalPrompt) {
      // No prompt written — 0 points
      setRoundScore(0)
      recordScore(0)
      setPhase('result')
      return
    }

    // Score: word count bonus + time remaining bonus + detail bonus.
    // Computable before generation — awarded even if the image fails.
    const words = finalPrompt.split(/\s+/).length
    const wordScore = Math.min(50, words * 5)
    const timeScore = (timeLeft || 0) * 3
    const detailBonus = finalPrompt.length > 60 ? 20 : finalPrompt.length > 30 ? 10 : 0
    const pts = wordScore + timeScore + detailBonus

    setPhase('generating')
    const t = token()
    try {
      const url = await generateImage(finalPrompt)
      if (isStale(t)) return
      setImageUrl(url)
    } catch {
      if (isStale(t)) return
      setError('The image couldn\'t be generated, but your prompt still scored.')
    }
    if (isStale(t)) return
    setRoundScore(pts)
    recordScore(pts)
    setPhase('result')
  }
  submitRef.current = handleSubmit

  const handleNextRound = () => {
    stopTimer()
    nextRound()
    setPhase('idle')
  }

  const handleRestart = () => {
    stopTimer()
    restart()
    setConcept(null)
    setPrompt('')
    setImageUrl(null)
    setError(null)
    setRoundScore(0)
    setUsedConcepts([])
    setPhase('idle')
  }

  if (gameOver) {
    return (
      <div className="flex flex-col gap-4">
        <GameOverCard
          emoji="⚡"
          title="Time's Up!"
          score={`${totalScore} pts`}
          subtitle={`${MAX_ROUNDS} rounds completed`}
          onRestart={handleRestart}
        />
      </div>
    )
  }

  const timerPercent = ((timeLeft ?? 0) / TIME_LIMIT) * 100
  const timerColor = (timeLeft ?? 0) <= 10 ? '#FF2D55' : (timeLeft ?? 0) <= 20 ? '#FFD600' : '#16a34a'

  return (
    <div className="flex flex-col gap-4">
      <StatsBar
        stats={[
          { label: 'Round', value: `${round}/${MAX_ROUNDS}` },
          {
            label: 'Timer',
            value: phase === 'writing' ? `${timeLeft ?? TIME_LIMIT}s` : '—',
            color: phase === 'writing' ? timerColor : undefined,
          },
          { label: 'Score', value: totalScore, color: '#FF2D55' },
        ]}
      />

      <ErrorBanner message={error} />

      {phase === 'idle' && (
        <div className="brutalist-card p-12 text-center">
          <p className="text-5xl mb-4">⚡</p>
          <h3 className="font-black text-navy uppercase mb-2">Round {round}</h3>
          <p className="text-navy/50 text-sm mb-6 font-medium">You'll get a concept and {TIME_LIMIT} seconds to write the best prompt you can!</p>
          <button onClick={startRound}
            className="px-8 py-3 bg-highlight text-navy font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Start Timer
          </button>
        </div>
      )}

      {phase === 'writing' && concept && (
        <div className="brutalist-card p-6 flex flex-col gap-4">
          {/* Timer bar */}
          <div className="h-2 w-full bg-gray-200" style={{ border: '1px solid #1A1A2E' }}>
            <div className="h-full transition-all duration-1000" style={{ width: `${timerPercent}%`, background: timerColor }} />
          </div>

          <div className="text-center">
            <h3 className="text-xl font-black text-navy uppercase mb-1">"{concept.concept}"</h3>
            <p className="text-navy/40 text-xs font-medium">{concept.hint}</p>
          </div>

          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Write the most descriptive prompt you can..."
            rows={4}
            className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium resize-none"
            style={{ border: '3px solid #1A1A2E' }}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-navy/40 uppercase">{prompt.split(/\s+/).filter(Boolean).length} words</span>
            <button onClick={handleSubmit} disabled={!prompt.trim()}
              className="px-8 py-3 bg-highlight text-navy font-black uppercase text-sm disabled:opacity-40"
              style={{ border: '2px solid #1A1A2E' }}>
              Submit Early (+time bonus)
            </button>
          </div>
        </div>
      )}

      {phase === 'generating' && (
        <div className="flex flex-col gap-2">
          <GeneratingSpinner label="Generating your image..." color="#1A1A2E" />
          <p className="text-navy/50 text-xs font-medium text-center">"{prompt}"</p>
        </div>
      )}

      {phase === 'result' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {imageUrl ? (
              <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
                <GameImage src={imageUrl} alt="Generated" className="w-full object-cover" style={{ maxHeight: 400 }} eager />
              </div>
            ) : (
              <div className="brutalist-card p-12 text-center">
                <p className="text-4xl mb-2">⏱️</p>
                <p className="font-black text-navy/50 uppercase text-sm">
                  {prompt.trim() ? 'Image couldn\'t be generated' : 'No prompt submitted'}
                </p>
              </div>
            )}
          </div>
          <div className="brutalist-card p-6 text-center flex flex-col justify-center gap-3">
            <p className="text-4xl">{roundScore >= 80 ? '⚡' : roundScore >= 40 ? '👍' : '⏱️'}</p>
            <p className="text-3xl font-black text-primary">+{roundScore} pts</p>
            <div className="text-left space-y-1 text-sm">
              <p className="text-navy/50 font-bold uppercase text-xs">Concept: "{concept?.concept}"</p>
              {prompt && <p className="text-navy font-medium">Your prompt: "{prompt}"</p>}
              {timeLeft > 0 && prompt && <p className="text-green-600 font-bold text-xs">Time bonus: +{timeLeft * 3} pts</p>}
              {prompt.trim() && !imageUrl && (
                <p className="text-navy/50 font-medium text-xs">Note: the image couldn't be generated this round.</p>
              )}
            </div>
            <button onClick={handleNextRound}
              className="mt-2 w-full py-3 bg-navy text-white font-black uppercase text-sm"
              style={{ border: '2px solid #1A1A2E' }}>
              {round >= MAX_ROUNDS ? 'See Final Score' : 'Next Round →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { generateImage, judge } from '../lib/fal'
import { useGameRounds } from '../hooks/useGameRounds'
import { useMachine } from '../hooks/useMachine'
import { speedPromptMachine } from '../machines/speedPrompt'
import { useRoundTimer } from '../hooks/useRoundTimer'
import { pickRandom, promptSimilarity } from '../lib/similarity'
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
// The judge score (0-100) is the main score. A small speed bonus (up to 20)
// is added only when the image is decent, so fast spam cannot win.
// Max 120 per round, 600 per game (maxScore for speed-prompt is 1000).
const MAX_SPEED_BONUS = 20
const BONUS_MIN_SCORE = 50

function speedBonus(score, secondsLeft) {
  if (score < BONUS_MIN_SCORE) return 0
  return Math.round((Math.max(0, secondsLeft) / TIME_LIMIT) * MAX_SPEED_BONUS)
}

/** Fallback when the judge is unavailable: words shared with the concept and its hint. */
function fallbackScore(prompt, concept) {
  const hintWords = concept.hint.replace(/^think\s+/i, '')
  return promptSimilarity(prompt, `${concept.concept} ${hintWords}`)
}

export default function SpeedPromptGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const { round, totalScore, gameOver, token, isStale, recordScore, nextRound, restart } =
    useGameRounds({ gameId: game.id, username, maxRounds: MAX_ROUNDS })
  const [concept, setConcept] = useState(null)
  const [prompt, setPrompt] = useState('')
  const flow = useMachine(speedPromptMachine) // see src/machines/speedPrompt.js
  const phase = flow.state
  const [imageUrl, setImageUrl] = useState(null)
  const [error, setError] = useState(null)
  const [roundScore, setRoundScore] = useState(0)
  const [breakdown, setBreakdown] = useState(null) // { score, bonus, secondsLeft, judged, comment }
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
    setBreakdown(null)
    setError(null)
    flow.send('START')
    startTimer(TIME_LIMIT)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleSubmit = async () => {
    const finalPrompt = prompt.trim()
    // The machine only accepts a submit while writing: a second tap or the
    // timer firing after a manual submit is ignored here.
    if (!flow.send(finalPrompt ? 'SUBMIT' : 'SUBMIT_EMPTY')) return
    const secondsLeft = timeLeft || 0
    stopTimer()

    if (!finalPrompt) {
      // No prompt written: 0 points
      setRoundScore(0)
      setBreakdown(null)
      recordScore(0)
      return
    }

    const t = token()
    let url = null
    try {
      url = await generateImage(finalPrompt)
    } catch {
      url = null
    }
    if (isStale(t)) return
    setImageUrl(url)
    if (!url) setError('The image could not be made, so this round is scored on your words.')

    let verdict = { score: null, comment: '' }
    if (!flow.send(url ? 'DRAWN' : 'DRAW_FAILED')) return
    if (url) {
      verdict = await judge('match-text', { imageUrl: url, text: concept.concept })
      if (isStale(t)) return
    }

    const judged = verdict.score != null
    const score = judged ? verdict.score : fallbackScore(finalPrompt, concept)
    const bonus = speedBonus(score, secondsLeft)
    const pts = score + bonus
    setBreakdown({ score, bonus, secondsLeft, judged, comment: judged ? verdict.comment : '' })
    setRoundScore(pts)
    recordScore(pts)
    flow.send('JUDGED')
  }

  // Keep the ref pointing at the latest handleSubmit so the timer's
  // auto-submit never fires a stale closure with an old prompt.
  useEffect(() => {
    submitRef.current = handleSubmit
  })

  const handleNextRound = () => {
    stopTimer()
    nextRound()
    setError(null)
    flow.send(round >= MAX_ROUNDS ? 'FINISH' : 'NEXT')
  }

  const handleRestart = () => {
    stopTimer()
    restart()
    setConcept(null)
    setPrompt('')
    setImageUrl(null)
    setError(null)
    setRoundScore(0)
    setBreakdown(null)
    setUsedConcepts([])
    flow.send('RESTART')
  }

  if (gameOver) {
    return (
      <div className="flex flex-col gap-4" {...flow.attrs}>
        <GameOverCard
          emoji="⚡"
          title="Time's Up!"
          score={`${totalScore} pts`}
          subtitle={`${MAX_ROUNDS} rounds completed (max ${MAX_ROUNDS * (100 + MAX_SPEED_BONUS)})`}
          onRestart={handleRestart}
        />
      </div>
    )
  }

  const timerPercent = ((timeLeft ?? 0) / TIME_LIMIT) * 100
  const timerColor = (timeLeft ?? 0) <= 10 ? '#FF2D55' : (timeLeft ?? 0) <= 20 ? '#FFD600' : '#16a34a'

  return (
    <div className="flex flex-col gap-4" {...flow.attrs}>
      <StatsBar
        stats={[
          { label: 'Round', value: `${round}/${MAX_ROUNDS}` },
          {
            label: 'Timer',
            value: phase === 'writing' ? `${timeLeft ?? TIME_LIMIT}s` : '-',
            color: phase === 'writing' ? timerColor : undefined,
          },
          { label: 'Score', value: totalScore, color: '#FF2D55' },
        ]}
      />

      <ErrorBanner message={error} />

      {phase === 'idle' && (
        <div className="brutalist-card p-8 sm:p-12 text-center">
          <p className="text-5xl mb-4">⚡</p>
          <h3 className="font-black text-navy uppercase mb-2">Round {round}</h3>
          <p className="text-navy/50 text-sm mb-6 font-medium max-w-md mx-auto">
            You get a concept and {TIME_LIMIT} seconds to write a prompt. The AI judge scores how well your image shows the concept. Good images that finish early earn a small speed bonus.
          </p>
          <button onClick={startRound}
            className="px-8 py-3 bg-highlight text-navy font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Start Timer
          </button>
        </div>
      )}

      {phase === 'writing' && concept && (
        <div className="brutalist-card p-4 sm:p-6 flex flex-col gap-4">
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
            maxLength={500}
            placeholder="Write a prompt that shows this concept..."
            rows={4}
            className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium resize-none"
            style={{ border: '3px solid #1A1A2E' }}
          />

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black text-navy/40 uppercase">{prompt.split(/\s+/).filter(Boolean).length} words</span>
            <button onClick={handleSubmit} disabled={!prompt.trim()}
              className="px-6 sm:px-8 py-3 bg-highlight text-navy font-black uppercase text-sm disabled:opacity-40"
              style={{ border: '2px solid #1A1A2E' }}>
              Submit Now
            </button>
          </div>
        </div>
      )}

      {(phase === 'generating' || phase === 'judging') && (
        <div className="flex flex-col gap-2">
          <GeneratingSpinner
            label={phase === 'generating' ? 'Drawing your image...' : 'The judge is looking...'}
            color="#1A1A2E"
          />
          <p className="text-navy/50 text-xs font-medium text-center break-words">"{prompt}"</p>
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
                  {prompt.trim() ? 'Image could not be made' : 'No prompt submitted'}
                </p>
              </div>
            )}
          </div>
          <div className="brutalist-card p-4 sm:p-6 text-center flex flex-col justify-center gap-3">
            <p className="text-4xl">{roundScore >= 80 ? '⚡' : roundScore >= 40 ? '👍' : '⏱️'}</p>
            <p className="text-3xl font-black text-primary">+{roundScore} pts</p>
            {breakdown && (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2" style={{ border: '2px solid #1A1A2E' }}>
                  <p className="text-xs font-black text-navy/50 uppercase">{breakdown.judged ? 'Judge' : 'Word match'}</p>
                  <p className="text-xl font-black text-navy">{breakdown.score}<span className="text-xs text-navy/40">/100</span></p>
                </div>
                <div className="p-2" style={{ border: '2px solid #1A1A2E' }}>
                  <p className="text-xs font-black text-navy/50 uppercase">Speed bonus</p>
                  <p className="text-xl font-black text-navy">+{breakdown.bonus}</p>
                </div>
              </div>
            )}
            {breakdown?.comment && (
              <p className="text-sm text-navy font-bold italic">⚖️ "{breakdown.comment}"</p>
            )}
            <div className="text-left space-y-1 text-sm">
              <p className="text-navy/50 font-bold uppercase text-xs">Concept: "{concept?.concept}"</p>
              {prompt.trim() ? (
                <p className="text-navy font-medium break-words">Your prompt: "{prompt}"</p>
              ) : (
                <p className="text-navy/50 font-medium text-xs">No prompt, no points. Type faster next time!</p>
              )}
              {breakdown && !breakdown.judged && (
                <p className="text-navy/50 font-medium text-xs">The judge is unavailable, so this round is scored on words shared with the concept.</p>
              )}
              {breakdown && breakdown.bonus === 0 && breakdown.score < BONUS_MIN_SCORE && breakdown.secondsLeft > 0 && (
                <p className="text-navy/50 font-medium text-xs">Speed bonus needs a score of {BONUS_MIN_SCORE} or more.</p>
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

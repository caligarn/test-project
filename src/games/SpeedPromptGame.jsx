import { useState, useEffect, useRef } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'

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

export default function SpeedPromptGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const [round, setRound] = useState(1)
  const [totalScore, setTotalScore] = useState(0)
  const [concept, setConcept] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)
  const [phase, setPhase] = useState('idle') // idle, writing, generating, result, gameover
  const [imageUrl, setImageUrl] = useState(null)
  const [error, setError] = useState(null)
  const [roundScore, setRoundScore] = useState(0)
  const [usedConcepts, setUsedConcepts] = useState([])
  const timerRef = useRef(null)
  const inputRef = useRef(null)

  const maxRounds = 5
  const timeLimit = 30

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const pickConcept = () => {
    const available = CONCEPTS.filter(c => !usedConcepts.includes(c.concept))
    const pool = available.length > 0 ? available : CONCEPTS
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const startRound = () => {
    const c = pickConcept()
    setConcept(c)
    setUsedConcepts(prev => [...prev, c.concept])
    setPrompt('')
    setTimeLeft(timeLimit)
    setImageUrl(null)
    setError(null)
    setPhase('writing')

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && phase === 'writing') {
      handleSubmit()
    }
  }, [timeLeft, phase])

  const handleSubmit = async () => {
    if (phase !== 'writing') return
    if (timerRef.current) clearInterval(timerRef.current)

    const finalPrompt = prompt.trim()
    if (!finalPrompt) {
      // No prompt written — 0 points
      setRoundScore(0)
      setPhase('result')
      return
    }

    setPhase('generating')
    try {
      const url = await generateImage(finalPrompt)
      setImageUrl(url)

      // Score: word count bonus + time remaining bonus + detail bonus
      const words = finalPrompt.split(/\s+/).length
      const wordScore = Math.min(50, words * 5)
      const timeScore = timeLeft * 3
      const detailBonus = finalPrompt.length > 60 ? 20 : finalPrompt.length > 30 ? 10 : 0
      const pts = wordScore + timeScore + detailBonus

      setRoundScore(pts)
      setTotalScore(s => s + pts)
      addScore(game.id, username, pts, { prompt: finalPrompt, concept: concept.concept, timeLeft })
    } catch {
      setError('Generation failed — check your API key.')
      setRoundScore(0)
    }
    setPhase('result')
  }

  const nextRound = () => {
    if (round >= maxRounds) {
      setPhase('gameover')
      return
    }
    setRound(r => r + 1)
    setPhase('idle')
  }

  const restart = () => {
    setRound(1)
    setTotalScore(0)
    setUsedConcepts([])
    setPhase('idle')
  }

  if (phase === 'gameover') {
    return (
      <div className="flex flex-col gap-4">
        <div className="brutalist-card p-8 text-center">
          <p className="text-5xl mb-4">⚡</p>
          <h3 className="text-2xl font-black text-navy uppercase mb-2">Time's Up!</h3>
          <p className="text-4xl font-black text-primary mb-2">{totalScore} pts</p>
          <p className="text-navy/50 text-sm font-medium mb-6">{maxRounds} rounds completed</p>
          <button onClick={restart}
            className="px-8 py-3 bg-primary text-white font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Play Again
          </button>
        </div>
      </div>
    )
  }

  const timerPercent = (timeLeft / timeLimit) * 100
  const timerColor = timeLeft <= 10 ? '#FF2D55' : timeLeft <= 20 ? '#FFD600' : '#16a34a'

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center justify-between brutalist-card p-4">
        <div><p className="text-xs font-black text-navy/50 uppercase">Round</p><p className="text-3xl font-black text-navy">{round}/{maxRounds}</p></div>
        <div className="text-center">
          <p className="text-xs font-black text-navy/50 uppercase">Timer</p>
          <p className="text-3xl font-black" style={{ color: phase === 'writing' ? timerColor : '#1A1A2E' }}>
            {phase === 'writing' ? `${timeLeft}s` : '—'}
          </p>
        </div>
        <div className="text-right"><p className="text-xs font-black text-navy/50 uppercase">Score</p><p className="text-3xl font-black text-primary">{totalScore}</p></div>
      </div>

      {error && <div className="p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium">{error}</div>}

      {phase === 'idle' && (
        <div className="brutalist-card p-12 text-center">
          <p className="text-5xl mb-4">⚡</p>
          <h3 className="font-black text-navy uppercase mb-2">Round {round}</h3>
          <p className="text-navy/50 text-sm mb-6 font-medium">You'll get a concept and {timeLimit} seconds to write the best prompt you can!</p>
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
        <div className="brutalist-card p-12 text-center">
          <div className="animate-spin rounded-full mx-auto mb-4" style={{ width: 40, height: 40, border: '4px solid #1A1A2E', borderTopColor: 'transparent' }} />
          <p className="font-black text-navy uppercase">Generating your image...</p>
          <p className="text-navy/50 text-xs font-medium mt-2">"{prompt}"</p>
        </div>
      )}

      {phase === 'result' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {imageUrl ? (
              <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
                <img src={imageUrl} alt="Generated" className="w-full object-cover" style={{ maxHeight: 400 }} />
              </div>
            ) : (
              <div className="brutalist-card p-12 text-center">
                <p className="text-4xl mb-2">⏱️</p>
                <p className="font-black text-navy/50 uppercase text-sm">No prompt submitted</p>
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
            </div>
            <button onClick={nextRound}
              className="mt-2 w-full py-3 bg-navy text-white font-black uppercase text-sm"
              style={{ border: '2px solid #1A1A2E' }}>
              {round >= maxRounds ? 'See Final Score' : 'Next Round →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

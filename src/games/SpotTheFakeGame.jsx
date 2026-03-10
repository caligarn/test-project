import { useState, useEffect, useRef } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'

const PROMPTS = [
  'A castle on top of a mountain at sunset',
  'A cat sitting on a windowsill watching rain',
  'A robot walking through a field of flowers',
  'An underwater city with glowing buildings',
  'A treehouse village connected by rope bridges',
  'A spaceship landing on a purple planet',
  'A fox curled up by a campfire in the snow',
  'A dragon flying over a medieval town',
  'A library with books floating in the air',
  'A lighthouse in a storm with crashing waves',
  'A garden made entirely of crystals',
  'A train traveling through the clouds',
  'A bear fishing in a mountain stream',
  'A wizard tower surrounded by stars',
  'An enchanted forest with glowing mushrooms',
]

const FAKE_PROMPTS = [
  'A peaceful beach with palm trees and hammock',
  'A busy city street at night with neon signs',
  'A hot air balloon festival at sunrise',
  'A snowy mountain peak with an eagle',
  'A carnival with a ferris wheel at dusk',
  'A vintage car on a desert highway',
  'A waterfall in a tropical jungle',
  'A pirate ship on calm waters',
  'A cottage garden with butterflies',
  'A night sky full of shooting stars',
  'A sushi restaurant interior, Japanese style',
  'A roller coaster at an amusement park',
  'A cozy coffee shop with bookshelves',
  'A submarine exploring deep ocean trenches',
  'A medieval market with merchants and stalls',
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const MAX_ROUNDS = 6
const TIME_PER_ROUND = 20

export default function SpotTheFakeGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const [round, setRound] = useState(1)
  const [totalScore, setTotalScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [phase, setPhase] = useState('idle') // idle, loading, playing, result, gameover
  const [images, setImages] = useState([]) // { url, isFake }
  const [selected, setSelected] = useState(null)
  const [fakeIndex, setFakeIndex] = useState(null)
  const [error, setError] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const timerRef = useRef(null)
  const [usedPrompts, setUsedPrompts] = useState([])
  const [usedFakes, setUsedFakes] = useState([])

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const startRound = async () => {
    setPhase('loading')
    setError(null)
    setSelected(null)

    // Pick a real prompt and a fake prompt
    const availableReal = PROMPTS.filter(p => !usedPrompts.includes(p))
    const realPool = availableReal.length > 0 ? availableReal : PROMPTS
    const realPrompt = realPool[Math.floor(Math.random() * realPool.length)]

    const availableFake = FAKE_PROMPTS.filter(p => !usedFakes.includes(p))
    const fakePool = availableFake.length > 0 ? availableFake : FAKE_PROMPTS
    const fakePrompt = fakePool[Math.floor(Math.random() * fakePool.length)]

    setUsedPrompts(prev => [...prev, realPrompt])
    setUsedFakes(prev => [...prev, fakePrompt])

    try {
      // Generate 3 real + 1 fake in parallel
      const results = await Promise.all([
        generateImage(realPrompt),
        generateImage(realPrompt),
        generateImage(realPrompt),
        generateImage(fakePrompt),
      ])

      const items = [
        { url: results[0], isFake: false },
        { url: results[1], isFake: false },
        { url: results[2], isFake: false },
        { url: results[3], isFake: true },
      ]
      const shuffled = shuffle(items)
      setImages(shuffled)
      setFakeIndex(shuffled.findIndex(img => img.isFake))
      setPhase('playing')

      // Start timer
      setTimeLeft(TIME_PER_ROUND)
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch {
      setError('Image generation failed.')
      setPhase('idle')
    }
  }

  // Handle timeout
  useEffect(() => {
    if (timeLeft === 0 && phase === 'playing') {
      setSelected(-1) // timeout
      setStreak(0)
      setPhase('result')
    }
  }, [timeLeft, phase])

  const handleSelect = (index) => {
    if (selected !== null || phase !== 'playing') return
    if (timerRef.current) clearInterval(timerRef.current)
    setSelected(index)

    const isCorrect = images[index].isFake
    const timeBonus = Math.max(0, (timeLeft || 0) * 3)
    const streakBonus = streak * 10
    const pts = isCorrect ? 100 + timeBonus + streakBonus : 0
    setStreak(isCorrect ? streak + 1 : 0)
    setTotalScore(s => s + pts)
    if (isCorrect) {
      addScore(game.id, username, pts, { round, timeLeft })
    }
    setPhase('result')
  }

  const nextRound = () => {
    if (round >= MAX_ROUNDS) {
      setPhase('gameover')
      return
    }
    setRound(r => r + 1)
    setPhase('idle')
  }

  const restart = () => {
    setRound(1)
    setTotalScore(0)
    setStreak(0)
    setUsedPrompts([])
    setUsedFakes([])
    setPhase('idle')
  }

  if (phase === 'gameover') {
    return (
      <div className="flex flex-col gap-4">
        <div className="brutalist-card p-8 text-center">
          <p className="text-5xl mb-4">🕵️</p>
          <h3 className="text-2xl font-black text-navy uppercase mb-2">Investigation Complete!</h3>
          <p className="text-4xl font-black text-primary mb-2">{totalScore} pts</p>
          <p className="text-navy/50 text-sm font-medium mb-6">{MAX_ROUNDS} rounds completed</p>
          <button onClick={restart}
            className="px-8 py-3 bg-primary text-white font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Play Again
          </button>
        </div>
      </div>
    )
  }

  const timerColor = timeLeft !== null ? (timeLeft <= 5 ? '#FF2D55' : timeLeft <= 10 ? '#FFD600' : '#16a34a') : '#1A1A2E'

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center justify-between brutalist-card p-4">
        <div>
          <p className="text-xs font-black text-navy/50 uppercase">Round</p>
          <p className="text-3xl font-black text-navy">{round}/{MAX_ROUNDS}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-black text-navy/50 uppercase">Streak</p>
          <p className="text-3xl font-black text-navy">{streak > 0 ? `🔥 ${streak}` : '—'}</p>
        </div>
        {phase === 'playing' && timeLeft !== null && (
          <div className="text-center">
            <p className="text-xs font-black text-navy/50 uppercase">Time</p>
            <p className="text-3xl font-black" style={{ color: timerColor }}>{timeLeft}s</p>
          </div>
        )}
        <div className="text-right">
          <p className="text-xs font-black text-navy/50 uppercase">Score</p>
          <p className="text-3xl font-black text-primary">{totalScore}</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium">{error}</div>}

      {phase === 'idle' && (
        <div className="brutalist-card p-12 text-center">
          <p className="text-5xl mb-4">🕵️</p>
          <h3 className="font-black text-navy uppercase mb-2">Round {round}</h3>
          <p className="text-navy/50 text-sm mb-6 font-medium max-w-md mx-auto">
            Four images — three share the same prompt, one is the imposter. Find the fake!
          </p>
          <button onClick={startRound}
            className="px-8 py-3 bg-[#0D9488] text-white font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Show Images
          </button>
        </div>
      )}

      {phase === 'loading' && (
        <div className="brutalist-card p-12 text-center">
          <div className="animate-spin rounded-full mx-auto mb-4" style={{ width: 40, height: 40, border: '4px solid #0D9488', borderTopColor: 'transparent' }} />
          <p className="font-black text-navy uppercase">Generating 4 images...</p>
          <p className="text-navy/40 text-xs font-medium mt-2">This may take a moment</p>
        </div>
      )}

      {(phase === 'playing' || phase === 'result') && (
        <div>
          <p className="text-sm font-black text-navy uppercase mb-3 text-center">
            {phase === 'playing' ? 'Tap the imposter!' : selected === -1 ? 'Time\'s up!' : images[selected]?.isFake ? 'You found it!' : 'Wrong one!'}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {images.map((img, i) => {
              let borderColor = '#1A1A2E'
              let borderWidth = 3
              if (phase === 'result') {
                if (img.isFake) { borderColor = '#16a34a'; borderWidth = 4 }
                else if (selected === i) { borderColor = '#dc2626'; borderWidth = 4 }
              }
              return (
                <button key={i} onClick={() => handleSelect(i)} disabled={phase === 'result'}
                  className="relative overflow-hidden aspect-square disabled:cursor-default transition-transform hover:scale-[1.02]"
                  style={{ border: `${borderWidth}px solid ${borderColor}` }}>
                  <img src={img.url} alt={`Option ${i + 1}`} className="w-full h-full object-cover" />
                  {phase === 'result' && img.isFake && (
                    <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                      <span className="bg-green-600 text-white px-3 py-1 text-xs font-black uppercase">Fake</span>
                    </div>
                  )}
                  {phase === 'result' && selected === i && !img.isFake && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                      <span className="bg-red-600 text-white px-3 py-1 text-xs font-black uppercase">Real</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          {phase === 'result' && (
            <div className="text-center mt-4">
              {selected !== -1 && images[selected]?.isFake ? (
                <p className="text-lg font-black text-green-600 mb-3">
                  Correct! +{100 + Math.max(0, (timeLeft || 0) * 3) + (streak > 0 ? (streak - 1) * 10 : 0)} pts
                </p>
              ) : (
                <p className="text-lg font-black text-red-500 mb-3">
                  {selected === -1 ? 'Time ran out!' : 'That was a real one!'} 0 pts
                </p>
              )}
              <button onClick={nextRound}
                className="px-8 py-3 bg-navy text-white font-black uppercase text-sm"
                style={{ border: '2px solid #1A1A2E' }}>
                {round >= MAX_ROUNDS ? 'See Final Score' : 'Next Round →'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

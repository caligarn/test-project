import { useState, useCallback } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'

const STYLES = [
  { id: 'impressionist', label: 'Impressionist', prompt: 'impressionist painting style, soft brushstrokes, light and color' },
  { id: 'pixel_art', label: 'Pixel Art', prompt: 'pixel art style, 16-bit retro game aesthetic' },
  { id: 'watercolor', label: 'Watercolor', prompt: 'watercolor painting, soft washes, delicate colors' },
  { id: 'art_deco', label: 'Art Deco', prompt: 'art deco style, geometric patterns, gold and bold lines' },
  { id: 'ukiyo_e', label: 'Ukiyo-e', prompt: 'Japanese ukiyo-e woodblock print style' },
  { id: 'pop_art', label: 'Pop Art', prompt: 'pop art style, bold colors, Ben-Day dots, comic style' },
  { id: 'surrealism', label: 'Surrealism', prompt: 'surrealist painting, dreamlike, melting forms, Salvador Dali inspired' },
  { id: 'minimalist', label: 'Minimalist', prompt: 'minimalist art style, simple shapes, limited color palette' },
  { id: 'cyberpunk', label: 'Cyberpunk', prompt: 'cyberpunk style, neon lights, dark atmosphere, futuristic' },
  { id: 'art_nouveau', label: 'Art Nouveau', prompt: 'art nouveau style, flowing organic lines, decorative' },
]

const SUBJECTS = [
  'a city street', 'a mountain landscape', 'a cat', 'a flower garden',
  'a portrait of a woman', 'a sailing ship', 'a forest', 'a still life with fruit',
  'a bridge over a river', 'a bird in flight', 'a sunset over the ocean',
  'a medieval castle', 'a bustling cafe', 'a rainy day scene',
]

function pickRandom(arr, exclude = []) {
  const available = arr.filter(item => !exclude.includes(item.id || item))
  return available[Math.floor(Math.random() * available.length)]
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function StyleRouletteGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const [round, setRound] = useState(1)
  const [totalScore, setTotalScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [imageUrl, setImageUrl] = useState(null)
  const [correctStyle, setCorrectStyle] = useState(null)
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(null)
  const [phase, setPhase] = useState('idle') // idle, loading, playing, result, gameover
  const [error, setError] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [timerId, setTimerId] = useState(null)

  const maxRounds = 8
  const baseTime = 15

  const startRound = async () => {
    setPhase('loading')
    setError(null)
    setSelected(null)

    const subject = pickRandom(SUBJECTS)
    const correct = pickRandom(STYLES)
    setCorrectStyle(correct)

    // Pick 3 wrong styles
    const wrongStyles = shuffle(STYLES.filter(s => s.id !== correct.id)).slice(0, 3)
    setOptions(shuffle([correct, ...wrongStyles]))

    try {
      const url = await generateImage(`${subject}, ${correct.prompt}`)
      setImageUrl(url)
      setPhase('playing')
      // Start timer
      const deadline = baseTime
      setTimeLeft(deadline)
      const id = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(id)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      setTimerId(id)
    } catch {
      setError('Image generation failed.')
      setPhase('idle')
    }
  }

  const handleSelect = (style) => {
    if (selected || phase !== 'playing') return
    if (timerId) clearInterval(timerId)
    setSelected(style.id)
    const isCorrect = style.id === correctStyle.id
    const timeBonus = Math.max(0, (timeLeft || 0) * 2)
    const streakBonus = streak * 5
    const pts = isCorrect ? 100 + timeBonus + streakBonus : 0
    setStreak(isCorrect ? streak + 1 : 0)
    setTotalScore(s => s + pts)
    if (isCorrect) {
      addScore(game.id, username, pts, { style: correctStyle.id, round, timeLeft })
    }
    setPhase('result')
  }

  // Handle time running out
  if (timeLeft === 0 && phase === 'playing') {
    setSelected('timeout')
    setStreak(0)
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
    setStreak(0)
    setPhase('idle')
  }

  if (phase === 'gameover') {
    return (
      <div className="flex flex-col gap-4">
        <div className="brutalist-card p-8 text-center">
          <p className="text-5xl mb-4">🎨</p>
          <h3 className="text-2xl font-black text-navy uppercase mb-2">Roulette Complete!</h3>
          <p className="text-4xl font-black text-primary mb-2">{totalScore} pts</p>
          <p className="text-navy/50 text-sm font-medium mb-6">{maxRounds} rounds completed</p>
          <button onClick={restart}
            className="px-8 py-3 bg-primary text-white font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Spin Again
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
        <div className="text-center"><p className="text-xs font-black text-navy/50 uppercase">Streak</p><p className="text-3xl font-black text-navy">🔥 {streak}</p></div>
        {phase === 'playing' && timeLeft !== null && (
          <div className="text-center"><p className="text-xs font-black text-navy/50 uppercase">Time</p>
            <p className={`text-3xl font-black ${timeLeft <= 5 ? 'text-primary' : 'text-navy'}`}>{timeLeft}s</p>
          </div>
        )}
        <div className="text-right"><p className="text-xs font-black text-navy/50 uppercase">Score</p><p className="text-3xl font-black text-primary">{totalScore}</p></div>
      </div>

      {error && <div className="p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium">{error}</div>}

      {phase === 'idle' && (
        <div className="brutalist-card p-12 text-center">
          <p className="text-5xl mb-4">🎨</p>
          <h3 className="font-black text-navy uppercase mb-2">Round {round}</h3>
          <p className="text-navy/50 text-sm mb-6 font-medium">Identify the art style of the AI-generated image. You have {baseTime} seconds!</p>
          <button onClick={startRound}
            className="px-8 py-3 bg-[#FF6B35] text-white font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Spin the Roulette
          </button>
        </div>
      )}

      {phase === 'loading' && (
        <div className="brutalist-card p-12 text-center">
          <div className="animate-spin rounded-full mx-auto mb-4" style={{ width: 40, height: 40, border: '4px solid #1A1A2E', borderTopColor: 'transparent' }} />
          <p className="font-black text-navy uppercase">Generating styled image...</p>
        </div>
      )}

      {(phase === 'playing' || phase === 'result') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
            <img src={imageUrl} alt="Styled image" className="w-full object-cover" style={{ maxHeight: 400 }} />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="font-black text-navy uppercase text-sm">What art style is this?</h3>
            {options.map(style => {
              const isCorrect = style.id === correctStyle.id
              const isChosen = selected === style.id
              let borderColor = '#1A1A2E'
              let bg = 'white'
              let textColor = '#1A1A2E'
              if (phase === 'result') {
                if (isCorrect) { borderColor = '#16a34a'; bg = '#dcfce7'; textColor = '#16a34a' }
                else if (isChosen && !isCorrect) { borderColor = '#dc2626'; bg = '#fef2f2'; textColor = '#dc2626' }
              }
              return (
                <button key={style.id}
                  onClick={() => handleSelect(style)}
                  disabled={phase === 'result'}
                  className="w-full px-4 py-3 text-left font-black uppercase text-sm transition-all hover:bg-gray-50 disabled:cursor-default"
                  style={{ border: `3px solid ${borderColor}`, background: bg, color: textColor }}>
                  {style.label}
                  {phase === 'result' && isCorrect && ' ✓'}
                  {phase === 'result' && isChosen && !isCorrect && ' ✗'}
                </button>
              )
            })}
            {phase === 'result' && (
              <div className="text-center mt-2">
                {selected === correctStyle.id ? (
                  <p className="text-lg font-black text-green-600">Correct! +{100 + Math.max(0, (timeLeft || 0) * 2) + (streak > 0 ? (streak - 1) * 5 : 0)} pts</p>
                ) : (
                  <p className="text-lg font-black text-red-500">{selected === 'timeout' ? 'Time\'s up!' : 'Wrong!'} The style was {correctStyle.label}</p>
                )}
                <button onClick={nextRound}
                  className="mt-3 px-8 py-3 bg-navy text-white font-black uppercase text-sm"
                  style={{ border: '2px solid #1A1A2E' }}>
                  {round >= maxRounds ? 'See Final Score' : 'Next Round →'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

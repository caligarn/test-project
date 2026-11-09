import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'
import { useGameRounds } from '../hooks/useGameRounds'
import { useRoundTimer } from '../hooks/useRoundTimer'
import { useMachine } from '../hooks/useMachine'
import { styleRouletteMachine } from '../machines/styleRoulette'
import { pickRandom, shuffle, preloadImages } from '../lib/similarity'
import StatsBar from '../components/game/StatsBar'
import GameOverCard from '../components/game/GameOverCard'
import GeneratingSpinner from '../components/game/GeneratingSpinner'
import ErrorBanner from '../components/game/ErrorBanner'
import GameImage from '../components/game/GameImage'

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

const MAX_ROUNDS = 5
// Max per round: 100 + 15s * 2 + streak bonus; at most 700 per game (maxScore 1500).
const BASE_TIME = 15

export default function StyleRouletteGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const { round, totalScore, gameOver, token, isStale, recordScore, nextRound, restart } =
    useGameRounds({ gameId: game.id, username, maxRounds: MAX_ROUNDS })
  const [streak, setStreak] = useState(0)
  const [imageUrl, setImageUrl] = useState(null)
  const [correctStyle, setCorrectStyle] = useState(null)
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(null)
  const [roundPts, setRoundPts] = useState(0)
  const flow = useMachine(styleRouletteMachine) // see src/machines/styleRoulette.js
  const phase = flow.state
  const [error, setError] = useState(null)
  const [usedSubjects, setUsedSubjects] = useState([])
  const [usedStyles, setUsedStyles] = useState([])

  const { timeLeft, start: startTimer, stop: stopTimer } = useRoundTimer(() => {
    // Time ran out. Ignored unless a round is being played (the player may have just answered).
    if (!flow.send('TIMEOUT')) return
    setSelected('timeout')
    setStreak(0)
    setRoundPts(0)
    recordScore(0)
  })

  const startRound = async () => {
    if (!flow.send('START')) return
    setError(null)
    setSelected(null)

    const subject = pickRandom(SUBJECTS, usedSubjects)
    const correct = pickRandom(STYLES, usedStyles)
    setCorrectStyle(correct)
    setUsedSubjects(prev => [...prev, subject])
    setUsedStyles(prev => [...prev, correct])

    // Pick 3 wrong styles
    const wrongStyles = shuffle(STYLES.filter(s => s.id !== correct.id)).slice(0, 3)
    setOptions(shuffle([correct, ...wrongStyles]))

    const t = token()
    try {
      const url = await generateImage(`${subject}, ${correct.prompt}`)
      if (isStale(t)) return
      // Preload so the countdown never runs against a blank image
      await preloadImages([url])
      if (isStale(t)) return
      if (!flow.send('LOADED')) return
      setImageUrl(url)
      startTimer(BASE_TIME)
    } catch {
      if (isStale(t)) return
      if (!flow.send('LOAD_FAILED')) return
      setError('Could not make the image. Try again.')
    }
  }

  const handleSelect = (style) => {
    // One answer per round; a tap after the timer ran out is ignored
    if (!flow.send('ANSWER')) return
    stopTimer()
    setSelected(style.id)
    const isCorrect = style.id === correctStyle.id
    const timeBonus = Math.max(0, (timeLeft || 0) * 2)
    const streakBonus = streak * 5
    const pts = isCorrect ? 100 + timeBonus + streakBonus : 0
    setStreak(isCorrect ? streak + 1 : 0)
    setRoundPts(pts)
    recordScore(pts)
  }

  const handleNextRound = () => {
    stopTimer()
    nextRound()
    setImageUrl(null)
    setSelected(null)
    flow.send(round >= MAX_ROUNDS ? 'FINISH' : 'NEXT')
  }

  const handleRestart = () => {
    stopTimer()
    restart()
    setStreak(0)
    setImageUrl(null)
    setCorrectStyle(null)
    setOptions([])
    setSelected(null)
    setRoundPts(0)
    setError(null)
    setUsedSubjects([])
    setUsedStyles([])
    flow.send('RESTART')
  }

  if (gameOver) {
    return (
      <div className="flex flex-col gap-4" {...flow.attrs}>
        <GameOverCard
          emoji="🎨"
          title="Roulette Complete!"
          score={`${totalScore} pts`}
          subtitle={`${MAX_ROUNDS} rounds completed`}
          onRestart={handleRestart}
          restartLabel="Spin Again"
        />
      </div>
    )
  }

  const stats = [
    { label: 'Round', value: `${round}/${MAX_ROUNDS}` },
    { label: 'Streak', value: `🔥 ${streak}` },
    ...(phase === 'playing' && timeLeft !== null
      ? [{ label: 'Time', value: `${timeLeft}s`, color: timeLeft <= 5 ? '#FF2D55' : undefined }]
      : []),
    { label: 'Score', value: totalScore, color: '#FF2D55' },
  ]

  return (
    <div className="flex flex-col gap-4" {...flow.attrs}>
      <StatsBar stats={stats} />

      <ErrorBanner message={error} />

      {phase === 'idle' && (
        <div className="brutalist-card p-8 sm:p-12 text-center">
          <p className="text-5xl mb-4">🎨</p>
          <h3 className="font-black text-navy uppercase mb-2">Round {round}</h3>
          <p className="text-navy/50 text-sm mb-6 font-medium">Identify the art style of the AI-generated image. You have {BASE_TIME} seconds!</p>
          <button onClick={startRound}
            className="px-8 py-3 bg-[#FF6B35] text-white font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Spin the Roulette
          </button>
        </div>
      )}

      {phase === 'loading' && (
        <GeneratingSpinner label="Generating styled image..." color="#FF6B35" />
      )}

      {(phase === 'playing' || phase === 'result') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
            <GameImage src={imageUrl} alt="Styled image" className="w-full object-cover" style={{ maxHeight: 400 }} eager />
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
                  <p className="text-lg font-black text-green-600">Correct! +{roundPts} pts</p>
                ) : (
                  <p className="text-lg font-black text-red-500">{selected === 'timeout' ? 'Time\'s up!' : 'Wrong!'} The style was {correctStyle.label}</p>
                )}
                <button onClick={handleNextRound}
                  className="mt-3 px-8 py-3 bg-navy text-white font-black uppercase text-sm"
                  style={{ border: '2px solid #1A1A2E' }}>
                  {round >= MAX_ROUNDS ? 'See Final Score' : 'Next Round →'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

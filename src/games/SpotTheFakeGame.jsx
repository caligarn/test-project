import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { generateImage, generateImageVariations } from '../lib/fal'
import { useGameRounds } from '../hooks/useGameRounds'
import { useRoundTimer } from '../hooks/useRoundTimer'
import { pickRandom, shuffle, preloadImages } from '../lib/similarity'
import StatsBar from '../components/game/StatsBar'
import GameOverCard from '../components/game/GameOverCard'
import GeneratingSpinner from '../components/game/GeneratingSpinner'
import ErrorBanner from '../components/game/ErrorBanner'
import GameImage from '../components/game/GameImage'

// Each round: three images of `real` and one of `fake`, a slightly different
// prompt (one key detail changed), as the game description promises.
const ROUNDS = [
  { real: 'A castle on top of a mountain at sunset', fake: 'A castle on top of a mountain in a snowstorm' },
  { real: 'A cat sitting on a windowsill watching rain', fake: 'A dog sitting on a windowsill watching rain' },
  { real: 'A robot walking through a field of flowers', fake: 'A robot walking through a field of snow' },
  { real: 'An underwater city with glowing buildings', fake: 'An underwater city of dark ruins' },
  { real: 'A treehouse village connected by rope bridges', fake: 'A treehouse village on fire at night' },
  { real: 'A spaceship landing on a purple planet', fake: 'A spaceship landing on a green ocean planet' },
  { real: 'A fox curled up by a campfire in the snow', fake: 'A fox curled up by a campfire on a sunny beach' },
  { real: 'A dragon flying over a medieval town', fake: 'A hot air balloon flying over a medieval town' },
  { real: 'A library with books floating in the air', fake: 'A library with fish swimming in the air' },
  { real: 'A lighthouse in a storm with crashing waves', fake: 'A lighthouse on a calm sunny day' },
  { real: 'A garden made entirely of crystals', fake: 'A garden made entirely of candy' },
  { real: 'A train traveling through the clouds', fake: 'A train traveling through a desert' },
  { real: 'A bear fishing in a mountain stream', fake: 'A bear playing guitar by a mountain stream' },
  { real: 'A wizard tower surrounded by stars', fake: 'A wizard tower surrounded by sunflowers' },
  { real: 'An enchanted forest with glowing mushrooms', fake: 'An enchanted forest with glowing jellyfish' },
]

const MAX_ROUNDS = 5
// Max per round: 100 + 20s * 3 + streak bonus; at most 900 per game (maxScore 1500).
const TIME_PER_ROUND = 20

export default function SpotTheFakeGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const { round, totalScore, gameOver, token, isStale, recordScore, nextRound, restart } =
    useGameRounds({ gameId: game.id, username, maxRounds: MAX_ROUNDS })
  const [streak, setStreak] = useState(0)
  const [phase, setPhase] = useState('idle') // idle, loading, playing, result
  const [images, setImages] = useState([]) // { url, isFake }
  const [selected, setSelected] = useState(null)
  const [roundPts, setRoundPts] = useState(0)
  const [error, setError] = useState(null)
  const [usedRounds, setUsedRounds] = useState([])
  const [pair, setPair] = useState(null)

  const { timeLeft, start: startTimer, stop: stopTimer } = useRoundTimer(() => {
    // Time ran out
    if (phase !== 'playing') return
    setSelected(-1) // timeout
    setStreak(0)
    setRoundPts(0)
    recordScore(0)
    setPhase('result')
  })

  const startRound = async () => {
    setPhase('loading')
    setError(null)
    setSelected(null)

    const picked = pickRandom(ROUNDS, usedRounds)
    const realPrompt = picked.real
    const fakePrompt = picked.fake

    const t = token()
    try {
      // 3 variations of the real prompt + 1 fake: 2 requests instead of 4
      const [realUrls, fakeUrl] = await Promise.all([
        generateImageVariations(realPrompt, 3),
        generateImage(fakePrompt),
      ])
      if (isStale(t)) return

      const items = shuffle([
        ...realUrls.map(url => ({ url, isFake: false })),
        { url: fakeUrl, isFake: true },
      ])
      // Preload all 4 before the clock starts
      await preloadImages(items.map(img => img.url))
      if (isStale(t)) return

      // Only consume the prompts once generation succeeded
      setUsedRounds(prev => [...prev, picked])
      setPair(picked)
      setImages(items)
      setPhase('playing')
      startTimer(TIME_PER_ROUND)
    } catch {
      if (isStale(t)) return
      setError('Could not make the images. Try again.')
      setPhase('idle')
    }
  }

  const handleSelect = (index) => {
    if (selected !== null || phase !== 'playing') return
    stopTimer()
    setSelected(index)

    const isCorrect = images[index].isFake
    const timeBonus = Math.max(0, (timeLeft || 0) * 3)
    const streakBonus = streak * 10
    const pts = isCorrect ? 100 + timeBonus + streakBonus : 0
    setStreak(isCorrect ? streak + 1 : 0)
    setRoundPts(pts)
    recordScore(pts)
    setPhase('result')
  }

  const handleNextRound = () => {
    stopTimer()
    nextRound()
    setImages([])
    setSelected(null)
    setPhase('idle')
  }

  const handleRestart = () => {
    stopTimer()
    restart()
    setStreak(0)
    setImages([])
    setSelected(null)
    setRoundPts(0)
    setError(null)
    setUsedRounds([])
    setPair(null)
    setPhase('idle')
  }

  if (gameOver) {
    return (
      <div className="flex flex-col gap-4">
        <GameOverCard
          emoji="🕵️"
          title="Investigation Complete!"
          score={`${totalScore} pts`}
          subtitle={`${MAX_ROUNDS} rounds completed`}
          onRestart={handleRestart}
        />
      </div>
    )
  }

  const timerColor = timeLeft !== null ? (timeLeft <= 5 ? '#FF2D55' : timeLeft <= 10 ? '#FFD600' : '#16a34a') : '#1A1A2E'

  const stats = [
    { label: 'Round', value: `${round}/${MAX_ROUNDS}` },
    { label: 'Streak', value: streak > 0 ? `🔥 ${streak}` : '-' },
    ...(phase === 'playing' && timeLeft !== null
      ? [{ label: 'Time', value: `${timeLeft}s`, color: timerColor }]
      : []),
    { label: 'Score', value: totalScore, color: '#FF2D55' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <StatsBar stats={stats} />

      <ErrorBanner message={error} />

      {phase === 'idle' && (
        <div className="brutalist-card p-8 sm:p-12 text-center">
          <p className="text-5xl mb-4">🕵️</p>
          <h3 className="font-black text-navy uppercase mb-2">Round {round}</h3>
          <p className="text-navy/50 text-sm mb-6 font-medium max-w-md mx-auto">
            Four images: three share the same prompt, one has a small twist. Find the fake!
          </p>
          <button onClick={startRound}
            className="px-8 py-3 bg-[#0D9488] text-white font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Show Images
          </button>
        </div>
      )}

      {phase === 'loading' && (
        <GeneratingSpinner label="Generating 4 images..." color="#0D9488" />
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
                  <GameImage src={img.url} alt={`Option ${i + 1}`} className="w-full h-full object-cover" eager />
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
                  Correct! +{roundPts} pts
                </p>
              ) : (
                <p className="text-lg font-black text-red-500 mb-3">
                  {selected === -1 ? 'Time ran out!' : 'That was a real one!'} 0 pts
                </p>
              )}
              {pair && (
                <div className="text-left max-w-md mx-auto mb-3 space-y-1 text-sm">
                  <p className="font-medium text-navy"><span className="text-xs font-black text-navy/50 uppercase">Real: </span>{pair.real}</p>
                  <p className="font-medium text-navy"><span className="text-xs font-black text-green-600 uppercase">Fake: </span>{pair.fake}</p>
                </div>
              )}
              <button onClick={handleNextRound}
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

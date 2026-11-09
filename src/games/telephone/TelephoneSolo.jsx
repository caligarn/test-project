import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { generateImage, judge } from '../../lib/fal'
import { promptSimilarityDetail, pickRandom } from '../../lib/similarity'
import { useGameRounds } from '../../hooks/useGameRounds'
import StatsBar from '../../components/game/StatsBar'
import ErrorBanner from '../../components/game/ErrorBanner'
import GeneratingSpinner from '../../components/game/GeneratingSpinner'
import GameImage from '../../components/game/GameImage'
import GameOverCard from '../../components/game/GameOverCard'
import ChainStrip from './ChainStrip'
import { STARTING_PROMPTS, SOLO_STEPS, MAX_TEXT, soloScore, DRIFT_WEIGHT, WORD_WEIGHT } from './logic'

const PINK = '#D946EF'

export default function TelephoneSolo({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const g = useGameRounds({ gameId: game.id, username, maxRounds: SOLO_STEPS })

  const [phase, setPhase] = useState('idle') // idle, loading, describe, judging, over
  const [secret, setSecret] = useState('')
  const [images, setImages] = useState([]) // images[0] is drawn from the secret prompt
  const [descriptions, setDescriptions] = useState([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  const start = async () => {
    g.restart()
    const t = g.token()
    const prompt = pickRandom(STARTING_PROMPTS, secret ? [secret] : [])
    setSecret(prompt)
    setImages([])
    setDescriptions([])
    setDraft('')
    setResult(null)
    setError(null)
    setPhase('loading')
    try {
      const url = await generateImage(prompt)
      if (g.isStale(t)) return
      setImages([url])
      setPhase('describe')
    } catch {
      if (g.isStale(t)) return
      setError('Could not draw the secret prompt. Try again.')
      setPhase('idle')
    }
  }

  const submit = async (e) => {
    e?.preventDefault()
    const text = draft.trim()
    if (!text || phase !== 'describe') return
    const step = descriptions.length + 1
    const t = g.token()
    setError(null)
    setPhase('loading')
    let url
    try {
      url = await generateImage(text)
    } catch {
      if (g.isStale(t)) return
      setError('Could not draw your description. It is still in the box, try again.')
      setPhase('describe')
      return
    }
    if (g.isStale(t)) return
    const nextImages = [...images, url]
    const nextDescriptions = [...descriptions, text]
    setImages(nextImages)
    setDescriptions(nextDescriptions)
    setDraft('')

    if (step < SOLO_STEPS) {
      g.nextRound()
      setPhase('describe')
      return
    }

    // Last step: judge how much of the first image survived.
    setPhase('judging')
    const verdict = await judge('drift', { targetUrl: nextImages[0], imageUrl: url })
    if (g.isStale(t)) return
    const words = promptSimilarityDetail(text, secret)
    const score = soloScore({ driftScore: verdict.score, wordScore: words.score })
    setResult({
      ...score,
      driftScore: verdict.score,
      comment: verdict.score == null ? '' : verdict.comment,
      wordScore: words.score,
      matchedWords: words.matchedWords,
    })
    g.recordScore(score.total)
    g.nextRound() // last round: saves the total once
    setPhase('over')
  }

  const latest = images[images.length - 1]
  const step = Math.min(descriptions.length + 1, SOLO_STEPS)

  if (phase === 'over' && result) {
    const cards = [
      { label: 'Secret prompt', text: secret, imageUrl: images[0] },
      ...descriptions.map((d, i) => ({ label: `Your description ${i + 1}`, text: d, imageUrl: images[i + 1] })),
    ]
    return (
      <div className="flex flex-col gap-4">
        <GameOverCard emoji="📞" title="Chain complete!" score={`${result.total} pts`}
          subtitle="Here is how the message drifted." onRestart={start} restartLabel="Play again">
          <div className="flex flex-col gap-3 text-left mb-2">
            {result.judged ? (
              <div className="p-3 border-2 border-navy bg-highlight/30">
                <p className="text-[10px] font-black text-navy/50 uppercase">AI judge</p>
                <p className="text-sm font-bold text-navy">{result.comment || 'No comment.'}</p>
              </div>
            ) : (
              <p className="text-xs font-bold text-navy/50 uppercase">Judge unavailable, scored on words only.</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 border-2 border-navy">
                <p className="text-[10px] font-black text-navy/50 uppercase">First vs last image</p>
                <p className="text-lg font-black text-navy">{result.judged ? `${result.driftScore}/100` : 'n/a'}</p>
                <p className="text-xs font-bold text-primary">+{result.driftPts} pts{result.judged ? ` (x${DRIFT_WEIGHT})` : ''}</p>
              </div>
              <div className="p-3 border-2 border-navy">
                <p className="text-[10px] font-black text-navy/50 uppercase">Words that survived</p>
                <p className="text-lg font-black text-navy">{result.wordScore}/100</p>
                <p className="text-xs font-bold text-primary">+{result.wordPts} pts (x{WORD_WEIGHT})</p>
              </div>
            </div>
            <div className="p-3 border-2 border-navy border-l-8 border-l-green-500">
              <p className="text-[10px] font-black text-navy/50 uppercase">The secret prompt was</p>
              <p className="text-sm font-bold text-navy">"{secret}"</p>
              {result.matchedWords.length > 0 && (
                <p className="text-xs text-navy/60 font-medium mt-1">Survived: {result.matchedWords.join(', ')}</p>
              )}
            </div>
          </div>
        </GameOverCard>
        <h3 className="font-black text-navy uppercase text-sm">The whole chain</h3>
        <ChainStrip cards={cards} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <StatsBar className="!mb-0" stats={[
        { label: 'Step', value: `${phase === 'idle' ? 0 : step}/${SOLO_STEPS}` },
        { label: 'Images', value: images.length },
        { label: 'Secret', value: '???', color: PINK },
      ]} />

      <ErrorBanner message={error} onRetry={phase === 'describe' && draft.trim() ? submit : phase === 'idle' ? start : undefined} />

      {phase === 'idle' && (
        <div className="brutalist-card p-8 text-center">
          <p className="text-5xl mb-4">📞</p>
          <h3 className="font-black text-navy uppercase mb-2">Solo telephone</h3>
          <p className="text-navy/60 text-sm mb-6 font-medium max-w-md mx-auto">
            The AI draws a secret prompt you never see. Describe the picture, the AI draws your words, and so on for {SOLO_STEPS} steps.
            The judge scores how much of the first image is still there at the end.
          </p>
          <button onClick={start} className="btn-brutalist text-white text-sm" style={{ background: PINK }}>
            Start chain
          </button>
        </div>
      )}

      {phase === 'loading' && (
        <GeneratingSpinner color={PINK}
          label={images.length === 0 ? 'Drawing the secret prompt...' : `Drawing your description (${step}/${SOLO_STEPS})...`} />
      )}

      {phase === 'judging' && (
        <GeneratingSpinner color={PINK} label="The judge is comparing the first and last image..." />
      )}

      {phase === 'describe' && latest && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-black text-navy/50 uppercase mb-2">
              {images.length === 1 ? 'The secret prompt, drawn' : 'Your last description, drawn'}
            </p>
            <div className="border-[3px] border-navy overflow-hidden aspect-square">
              <GameImage eager src={latest} alt="Describe this image" className="w-full h-full object-cover" />
            </div>
          </div>
          <form onSubmit={submit} className="brutalist-card p-5 flex flex-col gap-3">
            <h3 className="font-black text-navy uppercase text-sm">Describe this image ({step}/{SOLO_STEPS})</h3>
            <p className="text-navy/50 text-xs font-medium">Say what you see as clearly as you can. Your words become the next image.</p>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_TEXT))}
              placeholder="A dragon sleeping on golden coins..."
              rows={4}
              aria-label="Your description"
              className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium resize-none flex-1"
              style={{ border: `3px solid ${PINK}` }}
            />
            <button type="submit" disabled={!draft.trim()}
              className="btn-brutalist justify-center text-white text-sm disabled:opacity-40" style={{ background: PINK }}>
              {step >= SOLO_STEPS ? 'Finish chain' : `Draw it (${step}/${SOLO_STEPS})`}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

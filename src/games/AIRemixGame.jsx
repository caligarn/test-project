import { useState, useRef, useEffect } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'
import { useLocalGallery } from '../hooks/useLocalGallery'
import ErrorBanner from '../components/game/ErrorBanner'
import GeneratingSpinner from '../components/game/GeneratingSpinner'
import GameImage from '../components/game/GameImage'

const STARTER_PROMPTS = [
  'A simple red house on a green hill',
  'A plain white cup on a wooden table',
  'A single tree in an empty field',
  'A small boat on a calm lake',
  'A cat sitting on a windowsill',
  'A lantern glowing in the dark',
  'A lone flower growing through concrete',
  'A bird perched on a fence post',
]

const STORAGE_KEY = 'ai_arcade_remix_chains'

export default function AIRemixGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const [chain, setChain] = useState([])
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [phase, setPhase] = useState('start') // start, remixing, generating, viewing
  const [error, setError] = useState(null)
  const [score, setScore] = useState(0)
  const { items: savedChains, add: addSavedChain } = useLocalGallery(STORAGE_KEY, { cap: 20, mode: 'prepend' })
  const [generating, setGenerating] = useState(false)

  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false }
  }, [])

  const maxSteps = 6

  const startChain = async (starterPrompt) => {
    setPhase('generating')
    setGenerating(true)
    setError(null)
    try {
      const url = await generateImage(starterPrompt)
      if (!aliveRef.current) return
      setChain([{ prompt: starterPrompt, url, step: 1 }])
      setCurrentPrompt('')
      setPhase('remixing')
    } catch {
      if (!aliveRef.current) return
      setError('Image generation failed.')
      setPhase('start')
    } finally {
      if (aliveRef.current) setGenerating(false)
    }
  }

  const handleRemix = async (e) => {
    e.preventDefault()
    if (!currentPrompt.trim() || generating) return

    const prevStep = chain[chain.length - 1]
    const remixPrompt = `${currentPrompt.trim()}, evolved from: ${prevStep.prompt}`

    setGenerating(true)
    setPhase('generating')
    setError(null)
    try {
      const url = await generateImage(remixPrompt)
      if (!aliveRef.current) return
      const newStep = { prompt: currentPrompt.trim(), fullPrompt: remixPrompt, url, step: chain.length + 1 }
      const updated = [...chain, newStep]
      setChain(updated)
      setCurrentPrompt('')

      const pts = 50 + (chain.length * 10) // increasing points per step
      const newScore = score + pts
      setScore(newScore)

      if (updated.length >= maxSteps) {
        // Chain complete — award the accumulated total in a single play
        addScore(game.id, username, newScore, { steps: updated.length })
        // Save chain
        const chainEntry = {
          id: crypto.randomUUID(),
          steps: updated,
          author: username,
        }
        addSavedChain(chainEntry)
        setPhase('viewing')
      } else {
        setPhase('remixing')
      }
    } catch {
      if (!aliveRef.current) return
      setError('Remix generation failed.')
      setPhase('remixing')
    } finally {
      if (aliveRef.current) setGenerating(false)
    }
  }

  const newChain = () => {
    setChain([])
    setScore(0)
    setPhase('start')
    setError(null)
  }

  const latestStep = chain[chain.length - 1]

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center justify-between brutalist-card p-4">
        <div><p className="text-xs font-black text-navy/50 uppercase">Step</p><p className="text-3xl font-black text-navy">{chain.length}/{maxSteps}</p></div>
        <div className="text-center"><p className="text-xs font-black text-navy/50 uppercase">Evolution</p>
          <div className="flex gap-1 mt-1">
            {Array.from({ length: maxSteps }, (_, i) => (
              <div key={i} className="w-4 h-4" style={{
                background: i < chain.length ? '#00D4FF' : '#e5e7eb',
                border: '1px solid #1A1A2E'
              }} />
            ))}
          </div>
        </div>
        <div className="text-right"><p className="text-xs font-black text-navy/50 uppercase">Score</p><p className="text-3xl font-black text-primary">{score}</p></div>
      </div>

      <ErrorBanner message={error} />

      {phase === 'start' && (
        <div className="brutalist-card p-6">
          <div className="text-center mb-6">
            <p className="text-5xl mb-4">🔄</p>
            <h3 className="font-black text-navy uppercase mb-2">Start Your Remix Chain</h3>
            <p className="text-navy/50 text-sm font-medium">Pick a starting image. Then remix it {maxSteps - 1} times to evolve it into something completely different!</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STARTER_PROMPTS.map((p, i) => (
              <button key={i} onClick={() => startChain(p)}
                className="p-3 text-left text-xs font-bold text-navy hover:bg-[#00D4FF]/10 transition-colors uppercase"
                style={{ border: '2px solid #1A1A2E' }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === 'generating' && (
        <GeneratingSpinner
          label={chain.length === 0 ? 'Creating your starting image...' : `Generating remix #${chain.length + 1}...`}
          color="#00D4FF"
        />
      )}

      {phase === 'remixing' && latestStep && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-black text-navy/50 uppercase mb-2">Current — Step {latestStep.step}</p>
            <div style={{ border: '3px solid #00D4FF', overflow: 'hidden' }}>
              <GameImage eager src={latestStep.url} alt={`Step ${latestStep.step}`} className="w-full object-cover" style={{ maxHeight: 400 }} />
            </div>
            <p className="text-xs text-navy/50 font-medium mt-1">"{latestStep.prompt}"</p>
          </div>
          <div className="brutalist-card p-6 flex flex-col gap-4">
            <h3 className="font-black text-navy uppercase text-sm">Remix It! (Step {chain.length + 1}/{maxSteps})</h3>
            <p className="text-navy/40 text-xs font-medium">Describe how to transform or evolve this image. Each remix builds on the last!</p>
            <form onSubmit={handleRemix} className="flex flex-col gap-3 flex-1">
              <textarea
                autoFocus
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                placeholder="Add neon lights and make it cyberpunk..."
                rows={4}
                className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium resize-none flex-1"
                style={{ border: '3px solid #00D4FF' }}
              />
              <button type="submit" disabled={!currentPrompt.trim() || generating}
                className="w-full py-3 text-white text-sm font-black uppercase disabled:opacity-40"
                style={{ background: '#00D4FF', border: '2px solid #1A1A2E' }}>
                Remix (+{50 + chain.length * 10} pts)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Evolution timeline */}
      {chain.length > 1 && phase !== 'start' && (
        <div>
          <h3 className="font-black text-navy uppercase text-sm mb-3">Evolution Timeline</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {chain.map((step, i) => (
              <div key={i} className="flex-none relative" style={{ width: 120 }}>
                <div style={{ border: '2px solid #1A1A2E', overflow: 'hidden', height: 120 }}>
                  <GameImage src={step.url} alt={`Step ${step.step}`} className="w-full h-full object-cover" />
                </div>
                <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-navy text-white text-[10px] font-black">
                  #{step.step}
                </div>
                <p className="text-[10px] text-navy/50 font-medium mt-1 truncate">{step.prompt}</p>
                {i < chain.length - 1 && (
                  <div className="absolute top-1/2 -right-2 text-navy font-black text-xs z-10">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete chain view */}
      {phase === 'viewing' && (
        <div className="brutalist-card p-6 text-center">
          <p className="text-4xl mb-2">🎉</p>
          <h3 className="text-xl font-black text-navy uppercase mb-2">Remix Chain Complete!</h3>
          <p className="text-3xl font-black text-primary mb-1">{score} pts</p>
          <p className="text-navy/50 text-sm font-medium mb-4">{maxSteps} evolutions from "{chain[0]?.prompt}" to "{chain[chain.length - 1]?.prompt}"</p>
          <button onClick={newChain}
            className="px-8 py-3 text-white font-black uppercase text-sm"
            style={{ background: '#00D4FF', border: '2px solid #1A1A2E' }}>
            Start New Chain
          </button>
        </div>
      )}

      {/* Saved chains */}
      {savedChains.length > 0 && phase === 'start' && (
        <div>
          <h3 className="font-black text-navy uppercase text-sm mb-3">Past Chains ({savedChains.length})</h3>
          <div className="space-y-3">
            {savedChains.slice(0, 3).map(saved => (
              <div key={saved.id} className="brutalist-card p-3">
                <div className="flex gap-2 overflow-x-auto">
                  {saved.steps.map((step, i) => (
                    <div key={i} className="flex-none" style={{ width: 80, height: 80, border: '1px solid #1A1A2E', overflow: 'hidden' }}>
                      <GameImage src={step.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-navy/40 font-medium mt-2">by {saved.author} · {saved.steps.length} steps</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

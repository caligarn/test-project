import { useState } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'

const STARTING_PROMPTS = [
  'A dragon sleeping on a pile of gold coins in a cave',
  'A cat wearing a top hat having tea in a garden',
  'A treehouse in the clouds with a rope ladder',
  'A penguin surfing a giant wave at sunset',
  'A wizard casting colorful spells in a dusty library',
  'A mermaid playing electric guitar underwater',
  'A dinosaur wearing sunglasses at a pool party',
  'An owl professor teaching math in a forest classroom',
  'A fox riding a bicycle through a medieval village',
  'A cozy cabin in the woods during a heavy snowfall',
  'A raccoon DJ playing turntables at a rooftop party',
  'A robot painting a sunset at the beach with an easel',
  'A pirate ship made of candy sailing on chocolate seas',
  'A knight jousting a windmill in a sunflower field',
  'A giant octopus wrapping around a skyscraper at night',
]

const TOTAL_ROUNDS = 5

export default function TelephoneGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const [phase, setPhase] = useState('idle') // idle, generating, describe, result, summary
  const [chain, setChain] = useState([]) // { type: 'prompt'|'image', value }
  const [guess, setGuess] = useState('')
  const [error, setError] = useState(null)
  const [score, setScore] = useState(0)

  const currentRound = Math.floor(chain.length / 2) // each round = prompt + image

  const startGame = async () => {
    const prompt = STARTING_PROMPTS[Math.floor(Math.random() * STARTING_PROMPTS.length)]
    setChain([{ type: 'prompt', value: prompt }])
    setPhase('generating')
    setError(null)
    setGuess('')

    try {
      const url = await generateImage(prompt)
      setChain([{ type: 'prompt', value: prompt }, { type: 'image', value: url }])
      setPhase('describe')
    } catch {
      setError('Image generation failed.')
      setPhase('idle')
    }
  }

  const submitGuess = async () => {
    if (!guess.trim()) return
    const newChain = [...chain, { type: 'prompt', value: guess.trim() }]
    setChain(newChain)
    setGuess('')

    const roundNum = Math.floor(newChain.length / 2)
    if (roundNum >= TOTAL_ROUNDS) {
      // Game done — score based on similarity between first and last prompt
      const original = chain[0].value.toLowerCase()
      const final = guess.trim().toLowerCase()
      const origWords = new Set(original.split(/\s+/))
      const finalWords = final.split(/\s+/)
      const overlap = finalWords.filter(w => origWords.has(w)).length
      const similarity = Math.round((overlap / Math.max(origWords.size, 1)) * 100)
      const pts = Math.max(20, similarity * 2)
      setScore(pts)
      addScore(game.id, username, pts, { rounds: TOTAL_ROUNDS, similarity })
      setPhase('summary')
      return
    }

    setPhase('generating')
    try {
      const url = await generateImage(guess.trim())
      setChain([...newChain, { type: 'image', value: url }])
      setPhase('describe')
    } catch {
      setError('Image generation failed.')
      setPhase('describe')
    }
  }

  const restart = () => {
    setChain([])
    setScore(0)
    setError(null)
    setGuess('')
    setPhase('idle')
  }

  if (phase === 'summary') {
    return (
      <div className="flex flex-col gap-4">
        <div className="brutalist-card p-8 text-center">
          <p className="text-5xl mb-4">📞</p>
          <h3 className="text-2xl font-black text-navy uppercase mb-2">Chain Complete!</h3>
          <p className="text-4xl font-black text-primary mb-2">{score} pts</p>
          <p className="text-navy/50 text-sm font-medium mb-6">See how your message drifted</p>
        </div>

        {/* Full chain reveal */}
        <div className="flex flex-col gap-3">
          {chain.map((step, i) => (
            <div key={i} className={`brutalist-card p-4 ${i === 0 ? 'border-l-4 border-l-green-500' : i === chain.length - 1 ? 'border-l-4 border-l-primary' : ''}`}>
              <p className="text-[10px] font-black text-navy/40 uppercase mb-2">
                {i === 0 ? 'Original Prompt' : step.type === 'prompt' ? `Round ${Math.ceil(i / 2)} — Description` : `Round ${Math.ceil(i / 2)} — AI Generated`}
              </p>
              {step.type === 'prompt' ? (
                <p className="text-sm text-navy font-medium">"{step.value}"</p>
              ) : (
                <div style={{ border: '2px solid #1A1A2E', overflow: 'hidden', maxWidth: 300 }}>
                  <img src={step.value} alt="" className="w-full object-cover" />
                </div>
              )}
            </div>
          ))}
        </div>

        <button onClick={restart}
          className="w-full py-3 bg-[#D946EF] text-white font-black uppercase text-sm"
          style={{ border: '2px solid #1A1A2E' }}>
          Play Again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center justify-between brutalist-card p-4">
        <div>
          <p className="text-xs font-black text-navy/50 uppercase">Round</p>
          <p className="text-3xl font-black text-navy">{Math.min(currentRound + 1, TOTAL_ROUNDS)}/{TOTAL_ROUNDS}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-navy/50 uppercase">Chain Length</p>
          <p className="text-3xl font-black text-navy">{chain.length}</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium">{error}</div>}

      {phase === 'idle' && (
        <div className="brutalist-card p-12 text-center">
          <p className="text-5xl mb-4">📞</p>
          <h3 className="font-black text-navy uppercase mb-2">Telephone</h3>
          <p className="text-navy/50 text-sm mb-6 font-medium max-w-md mx-auto">
            A prompt creates an image. You describe the image. That description creates a new image. Repeat {TOTAL_ROUNDS} times and see how far it drifts!
          </p>
          <button onClick={startGame}
            className="px-8 py-3 bg-[#D946EF] text-white font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Start Chain
          </button>
        </div>
      )}

      {phase === 'generating' && (
        <div className="brutalist-card p-12 text-center">
          <div className="animate-spin rounded-full mx-auto mb-4" style={{ width: 40, height: 40, border: '4px solid #D946EF', borderTopColor: 'transparent' }} />
          <p className="font-black text-navy uppercase">Generating image...</p>
          <p className="text-navy/40 text-xs font-medium mt-2">Round {currentRound + 1} of {TOTAL_ROUNDS}</p>
        </div>
      )}

      {phase === 'describe' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-black text-navy/40 uppercase mb-2">What do you see?</p>
            <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
              <img src={chain[chain.length - 1]?.value} alt="Describe this" className="w-full object-cover" style={{ maxHeight: 400 }} />
            </div>
          </div>
          <div className="brutalist-card p-6 flex flex-col gap-4">
            <h3 className="font-black text-navy uppercase text-sm">Describe this image</h3>
            <p className="text-navy/40 text-xs font-medium">Don't overthink it — describe what you see as clearly as you can.</p>
            <textarea
              autoFocus
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="A dragon sleeping on golden coins..."
              rows={4}
              className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium resize-none flex-1"
              style={{ border: '3px solid #D946EF' }}
            />
            <button onClick={submitGuess} disabled={!guess.trim()}
              className="w-full py-3 bg-[#D946EF] text-white text-sm font-black uppercase disabled:opacity-40"
              style={{ border: '2px solid #1A1A2E' }}>
              {currentRound + 1 >= TOTAL_ROUNDS ? 'Finish Chain' : `Next Round (${currentRound + 1}/${TOTAL_ROUNDS})`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

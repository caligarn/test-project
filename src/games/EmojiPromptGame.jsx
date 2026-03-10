import { useState } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'

const EMOJI_CATEGORIES = [
  {
    label: 'People & Faces',
    emojis: ['👤', '👶', '👧', '👦', '👨', '👩', '👴', '👵', '🤴', '👸', '🧙', '🧛', '🧟', '🧜', '🦸', '🧑‍🚀', '🧑‍🎨', '🧑‍🔬', '🧑‍🍳', '👻', '🤖', '👽', '💀', '🎅'],
  },
  {
    label: 'Animals',
    emojis: ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦅', '🦆', '🦉', '🐴', '🦄', '🐙', '🦋', '🐛', '🐝', '🐠', '🐬', '🦈', '🐊', '🐉', '🦕', '🦖', '🐘', '🦒', '🐪'],
  },
  {
    label: 'Nature & Weather',
    emojis: ['🌸', '🌺', '🌻', '🌹', '🌲', '🌳', '🌴', '🍀', '🌵', '🍄', '🌊', '🔥', '❄️', '⛈️', '🌈', '⭐', '🌙', '☀️', '🌍', '🌋', '⛰️', '🏔️', '🏖️', '🏜️', '🌅', '🌌'],
  },
  {
    label: 'Food & Drink',
    emojis: ['🍎', '🍕', '🍔', '🌮', '🍣', '🍰', '🎂', '🍩', '🍪', '🍫', '🍿', '☕', '🍷', '🧁', '🍦', '🥐', '🥑', '🍉', '🍇', '🧀'],
  },
  {
    label: 'Places & Transport',
    emojis: ['🏠', '🏰', '🏯', '⛪', '🕌', '🏛️', '🏗️', '🏭', '🎡', '🎢', '🚀', '✈️', '🚂', '🚗', '⛵', '🏍️', '🚁', '🛸', '🗼', '🗽', '🏝️'],
  },
  {
    label: 'Objects & Tools',
    emojis: ['⚔️', '🛡️', '🏹', '🔮', '💎', '👑', '🎭', '🎨', '🎸', '🎹', '🎺', '📷', '🔭', '🔬', '💡', '🕯️', '📚', '✏️', '🗝️', '⏰', '🧲', '🪄'],
  },
  {
    label: 'Vibes & Symbols',
    emojis: ['💖', '💔', '💤', '💥', '✨', '🎉', '🎊', '👀', '💪', '🙏', '👋', '🤝', '💃', '🕺', '🏃', '🧘', '🎯', '🏆', '🥇', '🎮'],
  },
  {
    label: 'Fantasy & Spooky',
    emojis: ['🧝', '🧞', '🧚', '🪽', '👹', '👺', '🎃', '🕸️', '🦇', '🌑', '⚡', '🔱', '🗡️', '🐲', '🧿', '💫', '🪐', '☄️', '🌠', '👁️'],
  },
]

const PROMPTS = [
  'A peaceful morning scene',
  'An epic battle',
  'A magical creature',
  'A cozy home',
  'A wild adventure',
  'An underwater world',
  'A futuristic city',
  'A spooky night',
  'A garden paradise',
  'A feast for royalty',
  'A space journey',
  'A mysterious forest',
  'A stormy confrontation',
  'A celebration party',
  'A winter wonderland',
]

export default function EmojiPromptGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const [phase, setPhase] = useState('idle') // idle, building, generating, result, gameover
  const [prompt, setPrompt] = useState(null)
  const [emojiSequence, setEmojiSequence] = useState([])
  const [imageUrl, setImageUrl] = useState(null)
  const [error, setError] = useState(null)
  const [round, setRound] = useState(1)
  const [totalScore, setTotalScore] = useState(0)
  const [roundScore, setRoundScore] = useState(0)
  const [expandedCategory, setExpandedCategory] = useState(null)

  const maxRounds = 5
  const maxEmojis = 20

  const startRound = () => {
    const p = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]
    setPrompt(p)
    setEmojiSequence([])
    setImageUrl(null)
    setError(null)
    setRoundScore(0)
    setExpandedCategory(null)
    setPhase('building')
  }

  const addEmoji = (emoji) => {
    if (emojiSequence.length >= maxEmojis) return
    setEmojiSequence(prev => [...prev, emoji])
  }

  const removeLastEmoji = () => {
    setEmojiSequence(prev => prev.slice(0, -1))
  }

  const clearEmojis = () => {
    setEmojiSequence([])
  }

  const submitEmojis = async () => {
    if (emojiSequence.length === 0) return
    setPhase('generating')

    const emojiString = emojiSequence.join(' ')
    const aiPrompt = `Create an image based on these emojis: ${emojiString}. The emojis describe a scene about: ${prompt}. Interpret the emojis literally and combine them into a cohesive, detailed scene.`

    try {
      const url = await generateImage(aiPrompt)
      setImageUrl(url)

      // Score based on emoji count (variety/effort) + base
      const countBonus = Math.min(60, emojiSequence.length * 5)
      const uniqueEmojis = new Set(emojiSequence).size
      const varietyBonus = Math.min(40, uniqueEmojis * 4)
      const pts = 20 + countBonus + varietyBonus
      setRoundScore(pts)
      setTotalScore(s => s + pts)
      addScore(game.id, username, pts, { emojis: emojiString, prompt })
      setPhase('result')
    } catch {
      setError('Image generation failed.')
      setPhase('building')
    }
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
    setPhase('idle')
  }

  if (phase === 'gameover') {
    return (
      <div className="flex flex-col gap-4">
        <div className="brutalist-card p-8 text-center">
          <p className="text-5xl mb-4">😎</p>
          <h3 className="text-2xl font-black text-navy uppercase mb-2">Emoji Master!</h3>
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

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center justify-between brutalist-card p-4">
        <div>
          <p className="text-xs font-black text-navy/50 uppercase">Round</p>
          <p className="text-3xl font-black text-navy">{round}/{maxRounds}</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-black text-navy/50 uppercase">Emojis</p>
          <p className="text-3xl font-black text-navy">{emojiSequence.length}/{maxEmojis}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-navy/50 uppercase">Score</p>
          <p className="text-3xl font-black text-primary">{totalScore}</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium">{error}</div>}

      {phase === 'idle' && (
        <div className="brutalist-card p-12 text-center">
          <p className="text-5xl mb-4">😎</p>
          <h3 className="font-black text-navy uppercase mb-2">Round {round}</h3>
          <p className="text-navy/50 text-sm mb-6 font-medium max-w-md mx-auto">
            You'll get a theme — use only emojis to describe a scene. AI turns your emoji prompt into art!
          </p>
          <button onClick={startRound}
            className="px-8 py-3 bg-[#F59E0B] text-navy font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Get Theme
          </button>
        </div>
      )}

      {phase === 'building' && (
        <div className="flex flex-col gap-4">
          {/* Theme */}
          <div className="brutalist-card p-4 text-center">
            <p className="text-[10px] font-black text-navy/40 uppercase mb-1">Your Theme</p>
            <p className="text-lg font-black text-navy uppercase">"{prompt}"</p>
          </div>

          {/* Emoji sequence display */}
          <div className="brutalist-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black text-navy/40 uppercase">Your Emoji Prompt</p>
              <div className="flex gap-2">
                <button onClick={removeLastEmoji} disabled={emojiSequence.length === 0}
                  className="px-2 py-1 text-[10px] font-black uppercase text-navy/50 hover:text-navy disabled:opacity-30"
                  style={{ border: '1px solid #1A1A2E44' }}>
                  Undo
                </button>
                <button onClick={clearEmojis} disabled={emojiSequence.length === 0}
                  className="px-2 py-1 text-[10px] font-black uppercase text-navy/50 hover:text-navy disabled:opacity-30"
                  style={{ border: '1px solid #1A1A2E44' }}>
                  Clear
                </button>
              </div>
            </div>
            <div className="min-h-[60px] p-3 flex flex-wrap gap-1 items-start"
              style={{ border: '3px solid #F59E0B', background: '#FFFBEB' }}>
              {emojiSequence.length === 0 ? (
                <span className="text-sm text-navy/30 font-medium">Tap emojis below to build your prompt...</span>
              ) : (
                emojiSequence.map((e, i) => (
                  <span key={i} className="text-2xl cursor-default hover:scale-125 transition-transform">{e}</span>
                ))
              )}
            </div>
          </div>

          {/* Emoji picker */}
          <div className="brutalist-card p-4 flex flex-col gap-2">
            {EMOJI_CATEGORIES.map((cat, ci) => (
              <div key={ci}>
                <button onClick={() => setExpandedCategory(expandedCategory === ci ? null : ci)}
                  className="w-full text-left px-2 py-1.5 text-[10px] font-black text-navy/60 uppercase flex items-center justify-between hover:bg-gray-50"
                  style={{ borderBottom: '1px solid #1A1A2E11' }}>
                  {cat.label}
                  <span className="text-navy/30">{expandedCategory === ci ? '▼' : '▶'}</span>
                </button>
                {expandedCategory === ci && (
                  <div className="flex flex-wrap gap-1 p-2">
                    {cat.emojis.map((emoji, ei) => (
                      <button key={ei} onClick={() => addEmoji(emoji)}
                        disabled={emojiSequence.length >= maxEmojis}
                        className="w-10 h-10 text-xl flex items-center justify-center hover:bg-amber-100 transition-colors rounded disabled:opacity-30"
                        style={{ border: '1px solid #1A1A2E22' }}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit */}
          <button onClick={submitEmojis} disabled={emojiSequence.length === 0}
            className="w-full py-3 bg-[#F59E0B] text-navy font-black uppercase text-sm disabled:opacity-40"
            style={{ border: '2px solid #1A1A2E' }}>
            Generate from {emojiSequence.length} Emojis
          </button>
        </div>
      )}

      {phase === 'generating' && (
        <div className="brutalist-card p-12 text-center">
          <div className="animate-spin rounded-full mx-auto mb-4" style={{ width: 40, height: 40, border: '4px solid #F59E0B', borderTopColor: 'transparent' }} />
          <p className="font-black text-navy uppercase">Turning emojis into art...</p>
          <p className="text-3xl mt-3">{emojiSequence.join(' ')}</p>
        </div>
      )}

      {phase === 'result' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-black text-navy/40 uppercase mb-2">Your Emoji Prompt</p>
            <div className="brutalist-card p-4 mb-3">
              <p className="text-2xl leading-relaxed">{emojiSequence.join(' ')}</p>
            </div>
            <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
              <img src={imageUrl} alt="Generated from emojis" className="w-full object-cover" style={{ maxHeight: 400 }} />
            </div>
          </div>
          <div className="brutalist-card p-6 text-center flex flex-col justify-center gap-3">
            <p className="text-4xl">{roundScore >= 80 ? '🔥' : roundScore >= 50 ? '😎' : '👍'}</p>
            <p className="text-3xl font-black text-primary">+{roundScore} pts</p>
            <div className="text-left space-y-1 text-sm">
              <p className="text-navy/50 font-bold uppercase text-xs">Theme: "{prompt}"</p>
              <p className="text-navy/50 font-bold text-xs">{emojiSequence.length} emojis used, {new Set(emojiSequence).size} unique</p>
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

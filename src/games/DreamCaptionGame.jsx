import { useState } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'

const DREAM_PROMPTS = [
  'A staircase made of books leading to a door in the clouds',
  'A fish bowl containing an entire galaxy with tiny planets',
  'Clocks melting off the edge of a floating table in the desert',
  'A door standing alone in the middle of the ocean, slightly open',
  'Trees growing upside down from the ceiling of a grand ballroom',
  'A teacup the size of a house with people living inside it',
  'A train made of light traveling through a tunnel of flowers',
  'A mirror reflecting a completely different world than the room it is in',
  'A garden where the flowers are made of glass and glow at night',
  'Rain falling upward from puddles into the sky',
  'A piano whose keys transform into butterflies when played',
  'An hourglass filled with tiny glowing fireflies instead of sand',
  'A bridge made of frozen lightning connecting two mountain peaks',
  'A library where the books fly around like birds',
  'A ship sailing on a sea of clouds at sunset',
  'A forest of giant mushrooms under a purple sky with two moons',
  'A window floating in space showing a cozy kitchen inside',
  'A city built entirely on the back of a sleeping giant turtle',
]

const STORAGE_KEY = 'ai_arcade_dream_captions'

export default function DreamCaptionGame({ game }) {
  const { user } = useAuth()
  const [gallery, setGallery] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
  const [imageUrl, setImageUrl] = useState(null)
  const [dreamPrompt, setDreamPrompt] = useState(null)
  const [caption, setCaption] = useState('')
  const [phase, setPhase] = useState('idle') // idle, generating, captioning, submitted
  const [error, setError] = useState(null)
  const [score, setScore] = useState(0)

  const generateDream = async () => {
    setPhase('generating')
    setError(null)
    setCaption('')
    const prompt = DREAM_PROMPTS[Math.floor(Math.random() * DREAM_PROMPTS.length)]
    setDreamPrompt(prompt)
    try {
      const url = await generateImage(`Surreal dreamlike artwork: ${prompt}. Ethereal, mystical, impossible, dreamscape.`)
      setImageUrl(url)
      setPhase('captioning')
    } catch {
      setError('Image generation failed.')
      setPhase('idle')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!caption.trim()) return

    // Score based on caption quality (length, creativity indicators)
    const words = caption.trim().split(/\s+/).length
    const lengthScore = Math.min(40, words * 4)
    const punctuationBonus = /[!?…—]/.test(caption) ? 10 : 0
    const poeticBonus = /\b(whisper|dream|echo|shadow|shimmer|dance|drift|glow|murmur|silence)\b/i.test(caption) ? 15 : 0
    const pts = lengthScore + punctuationBonus + poeticBonus + 25 // base 25

    const entry = {
      id: Date.now(),
      imageUrl,
      caption: caption.trim(),
      author: user.username,
      votes: 0,
      pts,
    }

    const updated = [entry, ...gallery].slice(0, 50)
    setGallery(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setScore(s => s + pts)
    addScore(game.id, user.username, pts, { caption: caption.trim() })
    setPhase('submitted')
  }

  const handleVote = (entryId) => {
    const updated = gallery.map(g =>
      g.id === entryId ? { ...g, votes: (g.votes || 0) + 1 } : g
    )
    setGallery(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const newDream = () => {
    setImageUrl(null)
    setDreamPrompt(null)
    setCaption('')
    setPhase('idle')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center justify-between brutalist-card p-4">
        <div><p className="text-xs font-black text-navy/50 uppercase">Your Captions</p><p className="text-3xl font-black text-navy">{gallery.filter(g => g.author === user.username).length}</p></div>
        <div className="text-center"><p className="text-xs font-black text-navy/50 uppercase">Gallery</p><p className="text-3xl font-black text-navy">{gallery.length}</p></div>
        <div className="text-right"><p className="text-xs font-black text-navy/50 uppercase">Score</p><p className="text-3xl font-black text-primary">{score}</p></div>
      </div>

      {error && <div className="p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium">{error}</div>}

      {phase === 'idle' && (
        <div className="brutalist-card p-12 text-center">
          <p className="text-5xl mb-4">💭</p>
          <h3 className="font-black text-navy uppercase mb-2">Dream Caption</h3>
          <p className="text-navy/50 text-sm mb-6 font-medium">AI will generate a surreal, dreamlike image. Write the most creative caption you can!</p>
          <button onClick={generateDream}
            className="px-8 py-3 bg-[#8B5CF6] text-white font-black uppercase text-sm"
            style={{ border: '2px solid #1A1A2E' }}>
            Generate a Dream
          </button>
        </div>
      )}

      {phase === 'generating' && (
        <div className="brutalist-card p-12 text-center">
          <div className="animate-spin rounded-full mx-auto mb-4" style={{ width: 40, height: 40, border: '4px solid #8B5CF6', borderTopColor: 'transparent' }} />
          <p className="font-black text-navy uppercase">Dreaming up something surreal...</p>
        </div>
      )}

      {(phase === 'captioning' || phase === 'submitted') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
            <img src={imageUrl} alt="Dream" className="w-full object-cover" style={{ maxHeight: 400 }} />
          </div>
          <div className="brutalist-card p-6 flex flex-col gap-4">
            {phase === 'captioning' ? (
              <>
                <h3 className="font-black text-navy uppercase text-sm">Caption this dream</h3>
                <p className="text-navy/40 text-xs font-medium">Be poetic, funny, profound — creativity scores higher!</p>
                <form onSubmit={handleSubmit} className="flex flex-col gap-3 flex-1">
                  <textarea
                    autoFocus
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write a creative caption..."
                    rows={4}
                    className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium resize-none flex-1"
                    style={{ border: '3px solid #8B5CF6' }}
                  />
                  <button type="submit" disabled={!caption.trim()}
                    className="w-full py-3 bg-[#8B5CF6] text-white text-sm font-black uppercase disabled:opacity-40"
                    style={{ border: '2px solid #1A1A2E' }}>
                    Submit Caption
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center flex flex-col justify-center flex-1 gap-3">
                <p className="text-4xl">✨</p>
                <p className="text-3xl font-black text-primary">+{gallery[0]?.pts || 0} pts</p>
                <p className="text-sm text-navy italic">"{gallery[0]?.caption}"</p>
                <button onClick={newDream}
                  className="mt-4 w-full py-3 bg-[#8B5CF6] text-white font-black uppercase text-sm"
                  style={{ border: '2px solid #1A1A2E' }}>
                  Dream Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gallery */}
      {gallery.length > 0 && (
        <div>
          <h3 className="font-black text-navy uppercase text-sm mb-3">Caption Gallery ({gallery.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gallery.slice(0, 8).map(entry => (
              <div key={entry.id} className="brutalist-card p-0 overflow-hidden flex" style={{ height: 140 }}>
                <img src={entry.imageUrl} alt="" className="w-28 h-full object-cover flex-none" />
                <div className="p-3 flex flex-col justify-between flex-1 min-w-0">
                  <p className="text-xs text-navy italic leading-tight line-clamp-3">"{entry.caption}"</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-navy/40 font-bold">— {entry.author}</span>
                    <button onClick={() => handleVote(entry.id)}
                      className="text-xs font-black text-navy/50 hover:text-primary transition-colors">
                      ♥ {entry.votes || 0}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

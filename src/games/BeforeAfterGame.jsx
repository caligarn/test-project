import { useState } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'

const SCENES = [
  { scene: 'An abandoned factory', prompt: 'an old abandoned factory building, rusty metal, broken windows, industrial decay' },
  { scene: 'A quiet village square', prompt: 'a quiet village square with a fountain, cobblestone street, old buildings, daytime' },
  { scene: 'A desert highway', prompt: 'a straight desert highway stretching to the horizon, flat barren landscape, blue sky' },
  { scene: 'A frozen lake', prompt: 'a frozen lake surrounded by pine trees, snow covered, winter, cold atmosphere' },
  { scene: 'An old library', prompt: 'an old dusty library with tall wooden shelves full of books, dim lighting, cozy' },
  { scene: 'A city rooftop', prompt: 'a flat city rooftop with water tanks and air vents, urban skyline in background' },
  { scene: 'A shipwreck on the beach', prompt: 'an old wooden shipwreck half-buried in sand on a beach, weathered and decaying' },
  { scene: 'A train station platform', prompt: 'an empty train station platform, metal benches, overhead canopy, tracks visible' },
  { scene: 'A crumbling castle', prompt: 'a crumbling medieval castle on a hilltop, overgrown with ivy, cloudy sky' },
  { scene: 'A moonlit forest clearing', prompt: 'a forest clearing bathed in moonlight, tall dark trees around the edges, mystical' },
  { scene: 'A junkyard', prompt: 'a junkyard full of old cars and scrap metal, rusted, overgrown with weeds' },
  { scene: 'An empty classroom', prompt: 'an empty school classroom with wooden desks, chalkboard, sunlight through windows' },
]

const TRANSFORMATIONS = [
  '🌊 Underwater', '🌿 Overgrown by nature', '🚀 Year 3000',
  '❄️ Frozen in ice', '🔥 After a fire', '🌸 Cherry blossom paradise',
  '🌙 Haunted at midnight', '🎪 Turned into a carnival', '🏜️ Buried in sand',
  '🌈 Made of candy', '🤖 Run by robots', '🎨 As a painting',
]

const STORAGE_KEY = 'ai_arcade_before_after'

export default function BeforeAfterGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const [gallery, setGallery] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
  const [phase, setPhase] = useState('idle') // idle, pick, custom, generating-before, generating-after, result
  const [scene, setScene] = useState(null)
  const [beforeUrl, setBeforeUrl] = useState(null)
  const [afterUrl, setAfterUrl] = useState(null)
  const [transformation, setTransformation] = useState('')
  const [customTransformation, setCustomTransformation] = useState('')
  const [error, setError] = useState(null)
  const [score, setScore] = useState(0)
  const [showGallery, setShowGallery] = useState(false)

  const startRound = async () => {
    const s = SCENES[Math.floor(Math.random() * SCENES.length)]
    setScene(s)
    setBeforeUrl(null)
    setAfterUrl(null)
    setTransformation('')
    setCustomTransformation('')
    setError(null)
    setPhase('generating-before')

    try {
      const url = await generateImage(s.prompt)
      setBeforeUrl(url)
      setPhase('pick')
    } catch {
      setError('Image generation failed.')
      setPhase('idle')
    }
  }

  const applyTransformation = async (t) => {
    const label = t || customTransformation.trim()
    if (!label) return
    setTransformation(label)
    setPhase('generating-after')

    // Strip emoji prefix for prompt
    const clean = label.replace(/^[\p{Emoji}\s]+/u, '').trim() || label
    const afterPrompt = `${scene.prompt}, but transformed: ${clean}, dramatic transformation, detailed`

    try {
      const url = await generateImage(afterPrompt)
      setAfterUrl(url)

      const entry = {
        id: Date.now(),
        scene: scene.scene,
        beforeUrl,
        afterUrl: url,
        transformation: label,
        author: username,
        votes: 0,
      }

      const pts = game.pointsPerAction || 75
      setScore(s => s + pts)
      addScore(game.id, username, pts, { scene: scene.scene, transformation: label })

      const updated = [entry, ...gallery].slice(0, 40)
      setGallery(updated)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      setPhase('result')
    } catch {
      setError('After image generation failed.')
      setPhase('pick')
    }
  }

  const handleVote = (entryId) => {
    const updated = gallery.map(g =>
      g.id === entryId ? { ...g, votes: (g.votes || 0) + 1 } : g
    )
    setGallery(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const mine = gallery.filter(g => g.author === username).length

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="flex items-center justify-between brutalist-card p-4">
        <div>
          <p className="text-xs font-black text-navy/50 uppercase">My Transforms</p>
          <p className="text-3xl font-black text-navy">{mine}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGallery(false)}
            className="px-3 py-2 text-xs font-black uppercase transition-colors"
            style={{ border: '2px solid #1A1A2E', background: !showGallery ? '#1A1A2E' : 'white', color: !showGallery ? 'white' : '#1A1A2E' }}>
            🔮 Play
          </button>
          <button onClick={() => setShowGallery(true)}
            className="px-3 py-2 text-xs font-black uppercase transition-colors"
            style={{ border: '2px solid #1A1A2E', background: showGallery ? '#059669' : 'white', color: showGallery ? 'white' : '#1A1A2E' }}>
            🖼️ Gallery ({gallery.length})
          </button>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-navy/50 uppercase">Score</p>
          <p className="text-3xl font-black text-primary">{score}</p>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium">{error}</div>}

      {showGallery ? (
        gallery.length === 0 ? (
          <div className="text-center py-16 text-navy/40 font-medium" style={{ border: '3px dashed #1A1A2E' }}>
            <p className="text-4xl mb-3">🔮</p>
            <p>No transformations yet — be the first!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {gallery.slice(0, 8).map(entry => (
              <div key={entry.id} className="brutalist-card p-0 overflow-hidden">
                <div className="grid grid-cols-2">
                  <div className="relative">
                    <img src={entry.beforeUrl} alt="Before" className="w-full aspect-square object-cover" />
                    <span className="absolute top-2 left-2 bg-navy/80 text-white text-[10px] font-black uppercase px-2 py-0.5">Before</span>
                  </div>
                  <div className="relative">
                    <img src={entry.afterUrl} alt="After" className="w-full aspect-square object-cover" />
                    <span className="absolute top-2 left-2 bg-[#059669]/90 text-white text-[10px] font-black uppercase px-2 py-0.5">After</span>
                  </div>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-navy uppercase">{entry.scene}</p>
                    <p className="text-[10px] text-navy/50 font-medium">{entry.transformation} — by {entry.author}</p>
                  </div>
                  <button onClick={() => handleVote(entry.id)}
                    className="text-xs font-black text-navy/50 hover:text-primary transition-colors">
                    ♥ {entry.votes || 0}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          {phase === 'idle' && (
            <div className="brutalist-card p-12 text-center">
              <p className="text-5xl mb-4">🔮</p>
              <h3 className="font-black text-navy uppercase mb-2">Before & After</h3>
              <p className="text-navy/50 text-sm mb-6 font-medium max-w-md mx-auto">
                See a scene, pick a transformation, and watch AI reimagine it!
              </p>
              <button onClick={startRound}
                className="px-8 py-3 bg-[#059669] text-white font-black uppercase text-sm"
                style={{ border: '2px solid #1A1A2E' }}>
                Generate Scene
              </button>
            </div>
          )}

          {phase === 'generating-before' && (
            <div className="brutalist-card p-12 text-center">
              <div className="animate-spin rounded-full mx-auto mb-4" style={{ width: 40, height: 40, border: '4px solid #059669', borderTopColor: 'transparent' }} />
              <p className="font-black text-navy uppercase">Generating the "before" scene...</p>
            </div>
          )}

          {phase === 'pick' && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-[10px] font-black text-navy/40 uppercase mb-2">Before: {scene.scene}</p>
                <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
                  <img src={beforeUrl} alt="Before" className="w-full object-cover" style={{ maxHeight: 400 }} />
                </div>
              </div>
              <div className="brutalist-card p-6">
                <h3 className="font-black text-navy uppercase text-sm mb-3">Pick a transformation</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {TRANSFORMATIONS.map(t => (
                    <button key={t} onClick={() => applyTransformation(t)}
                      className="px-3 py-2 text-xs font-black uppercase text-navy hover:bg-gray-100 transition-colors text-left"
                      style={{ border: '2px solid #1A1A2E' }}>
                      {t}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={customTransformation}
                    onChange={e => setCustomTransformation(e.target.value)}
                    placeholder="Or type your own..."
                    className="flex-1 px-4 py-2 text-navy text-sm focus:outline-none font-medium"
                    style={{ border: '3px solid #1A1A2E' }} />
                  <button onClick={() => applyTransformation()} disabled={!customTransformation.trim()}
                    className="px-4 py-2 bg-[#059669] text-white text-xs font-black uppercase disabled:opacity-40"
                    style={{ border: '2px solid #1A1A2E' }}>
                    Go
                  </button>
                </div>
              </div>
            </div>
          )}

          {phase === 'generating-after' && (
            <div className="flex flex-col gap-4">
              <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
                <img src={beforeUrl} alt="Before" className="w-full object-cover" style={{ maxHeight: 300 }} />
              </div>
              <div className="brutalist-card p-12 text-center">
                <div className="animate-spin rounded-full mx-auto mb-4" style={{ width: 40, height: 40, border: '4px solid #059669', borderTopColor: 'transparent' }} />
                <p className="font-black text-navy uppercase">Applying: {transformation}</p>
              </div>
            </div>
          )}

          {phase === 'result' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-black text-navy/40 uppercase mb-2">Before</p>
                  <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
                    <img src={beforeUrl} alt="Before" className="w-full aspect-square object-cover" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-navy/40 uppercase mb-2">After: {transformation}</p>
                  <div style={{ border: '3px solid #059669', overflow: 'hidden' }}>
                    <img src={afterUrl} alt="After" className="w-full aspect-square object-cover" />
                  </div>
                </div>
              </div>
              <div className="brutalist-card p-6 text-center">
                <p className="text-3xl font-black text-primary mb-2">+{game.pointsPerAction || 75} pts</p>
                <p className="text-sm text-navy/50 font-medium mb-4">{scene.scene} → {transformation}</p>
                <div className="flex gap-2">
                  <button onClick={startRound}
                    className="flex-1 py-3 bg-[#059669] text-white font-black uppercase text-sm"
                    style={{ border: '2px solid #1A1A2E' }}>
                    New Scene
                  </button>
                  <button onClick={() => setShowGallery(true)}
                    className="flex-1 py-3 bg-navy text-white font-black uppercase text-sm"
                    style={{ border: '2px solid #1A1A2E' }}>
                    View Gallery
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

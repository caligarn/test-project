import { useState } from 'react'
import { ArrowLeft, Loader2, Trash2, X, Play, Pause, SkipBack, SkipForward } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { generateImage } from '../lib/fal'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'

const STORAGE_KEY = 'haiku_canvas_gallery'
const CANVAS_KEY = 'haiku_canvas_settings'

const ART_STYLES = [
  { id: 'watercolor', name: 'Watercolor', description: 'Soft washes of translucent color', suffix: 'watercolor painting style, soft washes, translucent colors, delicate brushstrokes' },
  { id: 'oil_painting', name: 'Oil Painting', description: 'Rich textures and deep colors', suffix: 'oil painting style, rich textures, deep colors, classical painterly technique' },
  { id: 'ink_wash', name: 'Ink Wash', description: 'Traditional East Asian sumi-e', suffix: 'ink wash painting, sumi-e style, black ink gradients, minimalist, traditional East Asian' },
  { id: 'digital_art', name: 'Digital Art', description: 'Modern vibrant illustrations', suffix: 'digital art style, vibrant colors, modern illustration, clean lines' },
]

function countSyllables(text) {
  const vowels = 'aeiouy'
  let count = 0
  let prevVowel = false
  const normalized = text.toLowerCase().replace(/[^a-z]/g, '')
  for (let i = 0; i < normalized.length; i++) {
    const isVowel = vowels.includes(normalized[i])
    if (isVowel && !prevVowel) count++
    prevVowel = isVowel
  }
  if (normalized.endsWith('e') && count > 1) count--
  return Math.max(count === 0 && normalized.length > 0 ? 1 : count, 0)
}

function countLineSyllables(line) {
  return line.trim().split(/\s+/).filter(Boolean).reduce((sum, w) => sum + countSyllables(w), 0)
}

function loadGallery() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
function saveGallery(g) { localStorage.setItem(STORAGE_KEY, JSON.stringify(g)) }
function loadCanvas() {
  try { return JSON.parse(localStorage.getItem(CANVAS_KEY) || 'null') } catch { return null }
}
function saveCanvas(c) { localStorage.setItem(CANVAS_KEY, JSON.stringify(c)) }

export default function HaikuCanvasGame() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [gallery, setGallery] = useState(loadGallery)
  const [canvas, setCanvas] = useState(loadCanvas)
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [line3, setLine3] = useState('')
  const [authorName, setAuthorName] = useState(user?.username || '')
  const [artStyle, setArtStyle] = useState(canvas?.artStyle || 'watercolor')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [score, setScore] = useState(0)
  const [showTimeLapse, setShowTimeLapse] = useState(false)
  const [tlIndex, setTlIndex] = useState(0)
  const [tlPlaying, setTlPlaying] = useState(false)

  const s1 = countLineSyllables(line1)
  const s2 = countLineSyllables(line2)
  const s3 = countLineSyllables(line3)
  const isValid = s1 === 5 && s2 === 7 && s3 === 5
  const isCanvasEmpty = gallery.length === 0
  const lockedStyle = canvas?.artStyle

  const getSyllableColor = (count, target) => {
    if (count === 0) return 'text-navy/30'
    if (count === target) return 'text-success'
    return 'text-primary'
  }

  const handleSubmit = async () => {
    if (!isValid) { setError('Please follow the 5-7-5 syllable pattern'); return }
    if (!authorName.trim()) { setError('Please enter your name'); return }

    setError('')
    setGenerating(true)

    const style = ART_STYLES.find(s => s.id === artStyle)
    const haiku = { line1: line1.trim(), line2: line2.trim(), line3: line3.trim(), authorName: authorName.trim() }
    const haikuText = `${haiku.line1}\n${haiku.line2}\n${haiku.line3}`

    try {
      const imageUrl = await generateImage(
        `Beautiful artistic illustration inspired by this haiku poem: "${haikuText}". ${style.suffix}, ethereal, atmospheric, soft lighting`,
        { width: 768, height: 512 }
      )

      const entry = {
        id: Date.now(),
        imageUrl,
        haiku,
        artStyle: artStyle,
        createdAt: Date.now(),
      }

      const updated = [entry, ...gallery]
      setGallery(updated)
      saveGallery(updated)

      // Lock canvas style on first submission
      if (!canvas) {
        const newCanvas = { artStyle }
        setCanvas(newCanvas)
        saveCanvas(newCanvas)
      }

      const pts = 75
      setScore(prev => prev + pts)
      addScore('haiku-canvas', user.username, pts, { haiku: haikuText })
      refreshUser()

      setLine1('')
      setLine2('')
      setLine3('')
    } catch (err) {
      console.error('Failed to generate:', err)
      setError('Failed to generate artwork. Check your API key.')
    } finally {
      setGenerating(false)
    }
  }

  const handleResetCanvas = () => {
    if (!confirm('Reset canvas? This clears the gallery and unlocks the art style.')) return
    setGallery([])
    saveGallery([])
    setCanvas(null)
    saveCanvas(null)
  }

  const handleDeleteEntry = (id) => {
    const updated = gallery.filter(e => e.id !== id)
    setGallery(updated)
    saveGallery(updated)
  }

  // Time-lapse controls
  const handleTlPlayPause = () => {
    if (tlIndex >= gallery.length - 1) setTlIndex(0)
    setTlPlaying(!tlPlaying)
  }

  // Auto-advance time-lapse
  useState(() => {
    if (!tlPlaying || gallery.length === 0) return
    const interval = setInterval(() => {
      setTlIndex(prev => {
        if (prev >= gallery.length - 1) { setTlPlaying(false); return prev }
        return prev + 1
      })
    }, 1500)
    return () => clearInterval(interval)
  }, [tlPlaying, gallery.length])

  const latestImage = gallery.length > 0 ? gallery[0] : null
  const reversedGallery = [...gallery].reverse()

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <header className="border-b-3 border-navy bg-white/50 backdrop-blur-sm">
        <div className="px-6 py-6">
          <div className="flex justify-between items-center mb-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold transition-colors uppercase"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTimeLapse(!showTimeLapse)}
                disabled={gallery.length === 0}
                className={`btn-brutalist py-1 px-3 text-xs ${gallery.length === 0 ? 'bg-surface-light text-navy/30 border-navy/20' : 'bg-white text-navy'}`}
              >
                {showTimeLapse ? 'Hide' : 'View'} Time-lapse
              </button>
              <button
                onClick={handleResetCanvas}
                disabled={gallery.length === 0}
                className={`btn-brutalist py-1 px-3 text-xs ${gallery.length === 0 ? 'bg-surface-light text-navy/30 border-navy/20' : 'bg-white text-navy'}`}
              >
                Reset Canvas
              </button>
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-navy text-center tracking-tight uppercase">
            俳句キャンバス
          </h1>
          <p className="text-center text-navy/50 mt-1 text-sm font-medium">
            Haiku Canvas &middot; Collaborative Poetry to Art
          </p>
        </div>
      </header>

      {/* Gallery Section */}
      <section className="border-b-3 border-navy/10 bg-white/30 px-6 py-6">
        <h2 className="text-lg font-black text-navy uppercase mb-4">Gallery</h2>
        {gallery.length > 0 ? (
          <div className="overflow-x-auto pb-3">
            <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
              {gallery.map((item) => (
                <div
                  key={item.id}
                  className="group relative w-72 h-44 border-2 border-navy overflow-hidden flex-shrink-0"
                >
                  <img src={item.imageUrl} alt="Artwork" className="w-full h-full object-cover" />
                  {/* Hover overlay with haiku */}
                  <div className="absolute inset-0 bg-navy/85 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-5 text-white">
                    <p className="text-base italic text-center">{item.haiku.line1}</p>
                    <p className="text-base italic text-center">{item.haiku.line2}</p>
                    <p className="text-base italic text-center">{item.haiku.line3}</p>
                    <p className="text-xs mt-3 text-white/70">— {item.haiku.authorName}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteEntry(item.id) }}
                      className="absolute top-2 right-2 text-white/50 hover:text-white"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-navy/40 text-sm font-medium">No artworks yet. Submit the first haiku to begin!</p>
          </div>
        )}
      </section>

      {/* Latest Creation */}
      {latestImage && !showTimeLapse && (
        <section className="border-b-3 border-navy/10 px-6 py-8">
          <h2 className="text-lg font-black text-navy uppercase text-center mb-4">Latest Creation</h2>
          <div className="max-w-3xl mx-auto brutalist-card overflow-hidden">
            <img src={latestImage.imageUrl} alt="Latest artwork" className="w-full" />
            <div className="p-6 text-center">
              <p className="text-lg italic text-navy">{latestImage.haiku.line1}</p>
              <p className="text-lg italic text-navy">{latestImage.haiku.line2}</p>
              <p className="text-lg italic text-navy">{latestImage.haiku.line3}</p>
              <p className="text-xs mt-3 text-navy/50">— {latestImage.haiku.authorName}</p>
            </div>
          </div>
        </section>
      )}

      {/* Time-lapse Viewer */}
      {showTimeLapse && reversedGallery.length > 0 && (
        <section className="border-b-3 border-navy/10 px-6 py-8">
          <h2 className="text-lg font-black text-navy uppercase text-center mb-4">
            Time-lapse: Artwork Evolution
          </h2>
          <div className="max-w-3xl mx-auto">
            <div className="brutalist-card overflow-hidden relative">
              <div className="relative aspect-video bg-surface-light">
                <img
                  src={reversedGallery[tlIndex]?.imageUrl}
                  alt="Time-lapse frame"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-navy/80 text-white text-xs font-black px-2 py-1">
                  {tlIndex + 1} / {reversedGallery.length}
                </div>
                <div className="absolute top-3 right-3 bg-navy/80 text-white text-[10px] px-2 py-1 uppercase font-bold">
                  {reversedGallery[tlIndex]?.artStyle?.replace(/_/g, ' ')}
                </div>
              </div>
              {reversedGallery[tlIndex]?.haiku && (
                <div className="p-5 text-center">
                  <p className="text-base italic text-navy">{reversedGallery[tlIndex].haiku.line1}</p>
                  <p className="text-base italic text-navy">{reversedGallery[tlIndex].haiku.line2}</p>
                  <p className="text-base italic text-navy">{reversedGallery[tlIndex].haiku.line3}</p>
                  <p className="text-xs mt-2 text-navy/50">— {reversedGallery[tlIndex].haiku.authorName}</p>
                </div>
              )}
            </div>

            {/* Playback Controls */}
            <div className="flex justify-center items-center gap-3 mt-4">
              <button onClick={() => { setTlPlaying(false); setTlIndex(i => Math.max(0, i - 1)) }} disabled={tlIndex === 0}
                className="btn-brutalist bg-white text-navy py-1 px-2"><SkipBack className="w-4 h-4" /></button>
              <button onClick={handleTlPlayPause}
                className="btn-brutalist bg-primary text-white py-2 px-3">
                {tlPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button onClick={() => { setTlPlaying(false); setTlIndex(i => Math.min(reversedGallery.length - 1, i + 1)) }}
                disabled={tlIndex >= reversedGallery.length - 1}
                className="btn-brutalist bg-white text-navy py-1 px-2"><SkipForward className="w-4 h-4" /></button>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 h-1.5 bg-surface-light border border-navy/10 overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300"
                style={{ width: `${((tlIndex + 1) / reversedGallery.length) * 100}%` }} />
            </div>

            {/* Thumbnail Strip */}
            <div className="overflow-x-auto mt-3 pb-2">
              <div className="flex gap-1.5" style={{ minWidth: 'max-content' }}>
                {reversedGallery.map((img, idx) => (
                  <button key={img.id} onClick={() => { setTlIndex(idx); setTlPlaying(false) }}
                    className={`relative w-16 h-11 flex-shrink-0 border-2 overflow-hidden transition-all ${
                      idx === tlIndex ? 'border-primary scale-110' : 'border-navy/20 opacity-60 hover:opacity-100'
                    }`}>
                    <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-navy/70 text-white text-[8px] text-center py-0.5 font-bold">{idx + 1}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Submission Form */}
      <section className="px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-black text-navy uppercase text-center mb-4">Submit Your Haiku</h2>
          <div className="brutalist-card p-6 md:p-8">
            <div className="space-y-5">
              {/* Author Name */}
              <div>
                <label className="text-xs font-bold text-navy/50 uppercase block mb-1">Your Name</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 border-2 border-navy bg-white text-navy text-sm placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
                />
              </div>

              {/* Art Style Picker */}
              {isCanvasEmpty ? (
                <div>
                  <label className="text-xs font-bold text-navy/50 uppercase block mb-1">Choose Art Style</label>
                  <p className="text-[10px] text-navy/40 font-medium mb-2">
                    This will set the style for all future submissions to this canvas
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {ART_STYLES.map(style => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setArtStyle(style.id)}
                        className={`p-3 text-left transition-all border-2 ${
                          artStyle === style.id
                            ? 'border-primary bg-primary/5 shadow-[3px_3px_0px_#1A1A2E]'
                            : 'border-navy/20 bg-white hover:border-navy/40'
                        }`}
                      >
                        <p className="text-xs font-black text-navy">{style.name}</p>
                        <p className="text-[10px] text-navy/50 font-medium mt-0.5">{style.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-navy/50 uppercase block mb-1">Canvas Art Style</label>
                  <div className="p-3 border-2 border-navy/20 bg-surface-light">
                    <p className="text-xs font-black text-navy">
                      {ART_STYLES.find(s => s.id === lockedStyle)?.name || 'Locked'}
                    </p>
                    <p className="text-[10px] text-navy/50 font-medium mt-0.5">
                      {ART_STYLES.find(s => s.id === lockedStyle)?.description}
                    </p>
                    <p className="text-[10px] text-navy/40 italic mt-1">
                      All submissions use this style for visual consistency
                    </p>
                  </div>
                </div>
              )}

              {/* Haiku Lines */}
              <div>
                <p className="text-[10px] text-navy/40 font-medium mb-2">Follow the 5-7-5 syllable pattern</p>
                <div className="space-y-3">
                  {[
                    { value: line1, set: setLine1, target: 5, count: s1, label: 'First Line' },
                    { value: line2, set: setLine2, target: 7, count: s2, label: 'Second Line' },
                    { value: line3, set: setLine3, target: 5, count: s3, label: 'Third Line' },
                  ].map((line) => (
                    <div key={line.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-navy/50 uppercase">{line.label}</span>
                        <span className={`text-xs font-black ${getSyllableColor(line.count, line.target)}`}>
                          {line.count} / {line.target} syllables
                        </span>
                      </div>
                      <input
                        type="text"
                        value={line.value}
                        onChange={(e) => line.set(e.target.value)}
                        placeholder={`${line.target} syllables`}
                        disabled={generating}
                        className="w-full px-4 py-3 border-2 border-navy bg-white text-navy text-sm placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-danger font-bold">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={generating}
                className={`w-full btn-brutalist justify-center py-4 text-base ${
                  !generating ? 'bg-primary text-white' : 'bg-surface-light text-navy/30 border-navy/20'
                }`}
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating Artwork...</>
                ) : (
                  'Submit Haiku & Generate Art'
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Score Footer */}
      <div className="brutalist-card-green mx-6 mb-6 p-4 flex items-center justify-between">
        <p className="text-xs text-navy font-medium">
          Each haiku builds upon the last, creating a collaborative visual journey
        </p>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] text-navy/50 font-bold uppercase">Score</p>
            <p className="text-lg font-black text-navy">{score}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-navy/50 font-bold uppercase">+75 pts</p>
            <p className="text-xs font-bold text-navy/40">per haiku</p>
          </div>
        </div>
      </div>
    </div>
  )
}

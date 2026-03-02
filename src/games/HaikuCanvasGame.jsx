import { useState } from 'react'
import { ArrowLeft, Feather, Image, Loader2, Trash2, Download, Palette } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { generateImage } from '../lib/fal'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'

const STORAGE_KEY = 'haiku_canvas_gallery'

const ART_STYLES = [
  { id: 'watercolor', label: 'Watercolor', desc: 'Soft washes of translucent color', suffix: 'watercolor painting style, soft washes, translucent colors, delicate brushstrokes' },
  { id: 'oil_painting', label: 'Oil Painting', desc: 'Rich textures and deep colors', suffix: 'oil painting style, rich textures, deep colors, classical painterly technique' },
  { id: 'ink_wash', label: 'Ink Wash', desc: 'Traditional East Asian sumi-e', suffix: 'ink wash painting, sumi-e style, black ink gradients, minimalist, traditional East Asian' },
  { id: 'digital_art', label: 'Digital Art', desc: 'Modern vibrant illustrations', suffix: 'digital art style, vibrant colors, modern illustration, clean lines' },
]

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!word) return 0
  if (word.length <= 2) return 1
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  word = word.replace(/^y/, '')
  const matches = word.match(/[aeiouy]{1,2}/g)
  return matches ? matches.length : 1
}

function countLineSyllables(line) {
  return line.trim().split(/\s+/).filter(Boolean).reduce((sum, w) => sum + countSyllables(w), 0)
}

function loadGallery() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveGallery(gallery) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gallery))
}

export default function HaikuCanvasGame() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [line3, setLine3] = useState('')
  const [generating, setGenerating] = useState(false)
  const [gallery, setGallery] = useState(loadGallery)
  const [score, setScore] = useState(0)
  const [previewImage, setPreviewImage] = useState(null)
  const [error, setError] = useState('')
  const [showGallery, setShowGallery] = useState(false)
  const [artStyle, setArtStyle] = useState('watercolor')

  const s1 = countLineSyllables(line1)
  const s2 = countLineSyllables(line2)
  const s3 = countLineSyllables(line3)
  const isValid = s1 === 5 && s2 === 7 && s3 === 5

  const getStatusColor = (count, target) => {
    if (count === 0) return 'text-navy/30'
    if (count === target) return 'text-success'
    return 'text-primary'
  }

  const handleGenerate = async () => {
    if (!isValid) {
      setError('Haiku must follow 5-7-5 syllable pattern')
      return
    }

    setError('')
    setGenerating(true)
    setPreviewImage(null)

    const haiku = `${line1.trim()}\n${line2.trim()}\n${line3.trim()}`
    const style = ART_STYLES.find(s => s.id === artStyle)
    try {
      const imageUrl = await generateImage(
        `Beautiful artistic illustration inspired by this haiku poem: "${haiku}". ${style.suffix}, ethereal, atmospheric, soft lighting`,
        { width: 768, height: 512 }
      )
      setPreviewImage({ url: imageUrl, haiku })
    } catch (err) {
      console.error('Failed to generate:', err)
      setError('Failed to generate artwork. Check your API key.')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveToGallery = () => {
    if (!previewImage) return
    const entry = {
      id: Date.now(),
      haiku: previewImage.haiku,
      imageUrl: previewImage.url,
      author: user.username,
      createdAt: Date.now(),
    }
    const updated = [entry, ...gallery]
    setGallery(updated)
    saveGallery(updated)

    const pts = 75
    setScore(prev => prev + pts)
    addScore('haiku-canvas', user.username, pts, { haiku: previewImage.haiku })
    refreshUser()

    setPreviewImage(null)
    setLine1('')
    setLine2('')
    setLine3('')
  }

  const handleDeleteEntry = (id) => {
    const updated = gallery.filter(e => e.id !== id)
    setGallery(updated)
    saveGallery(updated)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-navy/50 hover:text-navy text-sm font-bold transition-colors uppercase"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">🎋</span>
          <span className="font-black text-navy uppercase">Haiku Canvas</span>
        </div>
        <button
          onClick={() => setShowGallery(!showGallery)}
          className="btn-brutalist bg-white text-navy py-1.5 px-3 text-xs"
        >
          <Image className="w-3 h-3" />
          Gallery ({gallery.length})
        </button>
      </div>

      {/* Score Bar */}
      <div className="flex items-center justify-between brutalist-card p-3 mb-4">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] text-navy/40 font-bold uppercase">Score</p>
            <p className="text-xl font-black text-navy">{score}</p>
          </div>
          <div>
            <p className="text-[10px] text-navy/40 font-bold uppercase">Haikus</p>
            <p className="text-xl font-black text-primary">{gallery.length}</p>
          </div>
        </div>
        <div className="text-xs text-navy/40 font-bold uppercase">
          +75 pts / haiku
        </div>
      </div>

      {!showGallery ? (
        <>
          {/* Haiku Input */}
          <div className="brutalist-card p-6 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Feather className="w-5 h-5 text-primary" />
              <h3 className="font-black text-navy uppercase text-sm">Compose Your Haiku</h3>
            </div>

            <div className="space-y-3">
              {[
                { value: line1, set: setLine1, target: 5, count: s1, label: 'Line 1' },
                { value: line2, set: setLine2, target: 7, count: s2, label: 'Line 2' },
                { value: line3, set: setLine3, target: 5, count: s3, label: 'Line 3' },
              ].map((line) => (
                <div key={line.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-navy/50 uppercase">{line.label}</span>
                    <span className={`text-xs font-black ${getStatusColor(line.count, line.target)}`}>
                      {line.count}/{line.target} syllables
                    </span>
                  </div>
                  <input
                    type="text"
                    value={line.value}
                    onChange={(e) => line.set(e.target.value)}
                    placeholder={`${line.target} syllables...`}
                    className="w-full px-4 py-3 border-2 border-navy bg-white text-navy text-sm placeholder-navy/30 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
                  />
                </div>
              ))}
            </div>

            {/* Art Style Picker */}
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Palette className="w-4 h-4 text-navy/50" />
                <span className="text-xs font-bold text-navy/50 uppercase">Art Style</span>
              </div>
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
                    <p className="text-xs font-black text-navy uppercase">{style.label}</p>
                    <p className="text-[10px] text-navy/50 font-medium mt-0.5">{style.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-danger font-bold mt-3">{error}</p>
            )}

            <button
              onClick={handleGenerate}
              disabled={!isValid || generating}
              className={`w-full mt-4 btn-brutalist justify-center ${
                isValid && !generating
                  ? 'bg-primary text-white'
                  : 'bg-surface-light text-navy/30 cursor-not-allowed border-navy/20'
              }`}
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Painting...
                </>
              ) : (
                <>
                  <Image className="w-4 h-4" />
                  Generate Artwork
                </>
              )}
            </button>
          </div>

          {/* Preview */}
          {previewImage && (
            <div className="brutalist-card overflow-hidden mb-4">
              <img
                src={previewImage.url}
                alt="Haiku artwork"
                className="w-full aspect-[3/2] object-cover"
              />
              <div className="p-5">
                <pre className="font-serif text-navy text-base mb-4 whitespace-pre-line leading-relaxed">
                  {previewImage.haiku}
                </pre>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveToGallery}
                    className="flex-1 btn-brutalist bg-accent text-navy justify-center"
                  >
                    <Download className="w-4 h-4" />
                    Save to Gallery
                  </button>
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="btn-brutalist bg-white text-navy"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="brutalist-card-yellow p-4">
            <p className="text-sm font-black text-navy uppercase mb-1">How to Play</p>
            <p className="text-xs text-navy/70 font-medium">
              Write a haiku following the traditional 5-7-5 syllable pattern. Once your
              syllables match, generate AI artwork inspired by your poem. Save your
              favorites to your gallery. Each saved haiku earns 75 points!
            </p>
          </div>
        </>
      ) : (
        <>
          {/* Gallery View */}
          <div className="mb-4">
            <h3 className="font-black text-navy uppercase text-sm mb-3">
              Your Gallery
            </h3>
            {gallery.length === 0 ? (
              <div className="brutalist-card p-8 text-center">
                <p className="text-3xl mb-2">🎋</p>
                <p className="text-navy/50 text-sm font-medium">
                  No haikus yet. Compose your first poem!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gallery.map((entry) => (
                  <div key={entry.id} className="brutalist-card overflow-hidden">
                    <img
                      src={entry.imageUrl}
                      alt="Haiku artwork"
                      className="w-full aspect-[3/2] object-cover"
                    />
                    <div className="p-4">
                      <pre className="font-serif text-navy text-sm mb-2 whitespace-pre-line leading-relaxed">
                        {entry.haiku}
                      </pre>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-navy/40 font-bold uppercase">
                          {new Date(entry.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-navy/30 hover:text-danger transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage } from '../lib/fal'
import { useLocalGallery } from '../hooks/useLocalGallery'
import StatsBar from '../components/game/StatsBar'
import ErrorBanner from '../components/game/ErrorBanner'
import GameImage from '../components/game/GameImage'

const STORAGE_KEY = 'ai_arcade_haiku_gallery'
const TARGETS = [5, 7, 5]

function countWordSyllables(word) {
  const norm = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!norm) return 0
  const vowels = 'aeiouy'
  let count = 0
  let prev = false
  for (const ch of norm) {
    const v = vowels.includes(ch)
    if (v && !prev) count++
    prev = v
  }
  // Silent-e rule, applied per word
  if (norm.endsWith('e') && count > 1) count--
  return Math.max(1, count)
}

function countSyllables(text) {
  if (!text.trim()) return 0
  // Count per word so vowel groups never merge across word boundaries
  // ("the old pond" is 3, not 2).
  return text
    .trim()
    .split(/\s+/)
    .reduce((sum, word) => sum + countWordSyllables(word), 0)
}

const ART_STYLES = [
  { id: 'watercolor', label: '🎨 Watercolor', prompt: 'soft watercolor painting' },
  { id: 'ink_wash', label: '🖌️ Ink Wash', prompt: 'traditional ink wash sumi-e' },
  { id: 'oil_painting', label: '🖼️ Oil Painting', prompt: 'rich oil painting' },
  { id: 'digital_art', label: '💻 Digital Art', prompt: 'vibrant digital illustration' },
]

export default function HaikuCanvasGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const [lines, setLines] = useState(['', '', ''])
  const [style, setStyle] = useState('watercolor')
  const { items: gallery, add: addToGallery } = useLocalGallery(STORAGE_KEY, { cap: 30, mode: 'prepend' })
  const [generating, setGenerating] = useState(false)
  const [score, setScore] = useState(0)
  const [error, setError] = useState(null)

  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false }
  }, [])

  const sylCounts = lines.map(countSyllables)
  const lineOk = lines.map((l, i) => l.trim() && sylCounts[i] === TARGETS[i])
  const allOk = lineOk.every(Boolean)
  const allFilled = lines.every(l => l.trim())
  const selectedStyle = ART_STYLES.find(s => s.id === style)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!allFilled || generating) return
    setGenerating(true)
    setError(null)
    const haiku = lines.join(' / ')
    try {
      const url = await generateImage(
        `${selectedStyle.prompt} artwork inspired by haiku: "${haiku}". Evocative, artistic, beautiful mood.`,
        { width: 768, height: 512 }
      )
      if (!aliveRef.current) return
      const entry = { id: crypto.randomUUID(), url, lines: [...lines], style, author: username }
      addToGallery(entry)
      const pts = game.pointsPerAction || 75
      setScore(s => s + pts)
      addScore(game.id, username, pts, { haiku })
      setLines(['', '', ''])
    } catch {
      if (!aliveRef.current) return
      setError('Image generation failed — please try again.')
    } finally {
      if (aliveRef.current) setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <StatsBar
        stats={[
          { label: 'Your Haikus', value: gallery.filter(g => g.author === username).length },
          { label: 'Total Gallery', value: gallery.length },
          { label: 'Score', value: score, color: '#FF2D55' },
        ]}
      />

      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="brutalist-card p-6 flex flex-col gap-4">
          <h3 className="font-black text-navy uppercase text-sm">Write your haiku (5-7-5)</h3>
          {lines.map((line, i) => {
            const syl = sylCounts[i]
            const target = TARGETS[i]
            const ok = lineOk[i]
            const over = syl > target && line.trim()
            const color = ok ? '#16a34a' : over ? '#dc2626' : '#1A1A2E'
            return (
              <div key={i}>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-black text-navy/50 uppercase">Line {i + 1}</label>
                  <span className="text-xs font-black" style={{ color }}>{line.trim() ? `${syl}/${target} syllables` : `${target} syllables`}</span>
                </div>
                <input type="text" value={line} onChange={e => { const l = [...lines]; l[i] = e.target.value; setLines(l) }}
                  placeholder={['An old silent pond...', 'A frog jumps into the pond—', 'Splash! Silence again.'][i]}
                  className="w-full px-4 py-2 text-navy text-sm focus:outline-none font-medium"
                  style={{ border: `2px solid ${color}` }} />
              </div>
            )
          })}
          <div>
            <p className="text-xs font-black text-navy/50 uppercase mb-2">Art Style</p>
            <div className="grid grid-cols-2 gap-2">
              {ART_STYLES.map(s => (
                <button key={s.id} type="button" onClick={() => setStyle(s.id)}
                  className="px-2 py-2 text-xs font-black uppercase transition-colors text-left"
                  style={{ border: `2px solid ${style === s.id ? '#FF2D55' : '#1A1A2E'}`, background: style === s.id ? '#FF2D55' : 'white', color: style === s.id ? 'white' : '#1A1A2E' }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {allFilled && !allOk && (
            <p className="text-xs font-medium" style={{ color: '#dc2626' }}>
              Syllable counts look off — the counter is only a heuristic, so you can still submit.
            </p>
          )}
          <button type="submit" disabled={!allFilled || generating}
            className="w-full py-3 font-black uppercase text-sm disabled:opacity-40 transition-opacity"
            style={{ background: allFilled ? '#FF2D55' : '#ccc', color: 'white', border: '2px solid #1A1A2E' }}>
            {generating ? '✦ Generating...' : `Submit & Generate Art (+${game.pointsPerAction} pts)`}
          </button>
        </form>

        {/* Latest image */}
        <div className="flex flex-col gap-3">
          <h3 className="font-black text-navy uppercase text-sm">Latest Creation</h3>
          {gallery.length > 0 ? (
            <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
              <GameImage eager src={gallery[0].url} alt="Latest haiku art" className="w-full object-cover" style={{ maxHeight: 240 }} />
              <div className="p-3 bg-white">
                {gallery[0].lines.map((l, i) => <p key={i} className="text-sm italic text-navy">{l}</p>)}
                <p className="text-xs text-navy/50 mt-1">— {gallery[0].author}</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-navy/30 font-medium text-sm" style={{ border: '3px dashed #1A1A2E', minHeight: 200 }}>
              Submit a haiku to see art here
            </div>
          )}
        </div>
      </div>

      {/* Gallery */}
      {gallery.length > 1 && (
        <div>
          <h3 className="font-black text-navy uppercase text-sm mb-3">Gallery ({gallery.length})</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {gallery.slice(1).map(item => (
              <div key={item.id} className="group relative flex-none overflow-hidden cursor-pointer" style={{ width: 160, height: 160, border: '2px solid #1A1A2E' }}>
                <GameImage src={item.url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-white">
                  {item.lines.map((l, i) => <p key={i} className="text-[10px] italic text-center leading-tight">{l}</p>)}
                  <p className="text-[9px] text-white/50 mt-1">— {item.author}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

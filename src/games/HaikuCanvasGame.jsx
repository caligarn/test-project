import { useState, useEffect } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import * as fal from '@fal-ai/client'

const STORAGE_KEY = 'ai_arcade_haiku_gallery'
const SYLLABLE_TARGETS = [5, 7, 5]

function countSyllables(text) {
  const vowels = 'aeiouy'
  let count = 0
  let prevVowel = false
  const norm = text.toLowerCase().replace(/[^a-z]/g, '')
  for (const ch of norm) {
    const isVowel = vowels.includes(ch)
    if (isVowel && !prevVowel) count++
    prevVowel = isVowel
  }
  if (norm.endsWith('e') && count > 1) count--
  return Math.max(1, count)
}

export default function HaikuCanvasGame({ game }) {
  const { user } = useAuth()
  const [lines, setLines] = useState(['', '', ''])
  const [gallery, setGallery] = useState(() => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))
  const [generating, setGenerating] = useState(false)
  const [score, setScore] = useState(0)
  const [artStyle, setArtStyle] = useState('watercolor')

  const styles = [
    { id: 'watercolor', label: '🎨 Watercolor' },
    { id: 'ink_wash', label: '🖌️ Ink Wash' },
    { id: 'oil_painting', label: '🖼️ Oil Painting' },
    { id: 'digital_art', label: '💻 Digital Art' },
  ]

  const syllableOk = lines.map((l, i) => countSyllables(l) === SYLLABLE_TARGETS[i])
  const allOk = syllableOk.every(Boolean) && lines.every(l => l.trim())

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!allOk || generating) return
    setGenerating(true)
    const haiku = lines.join(' / ')
    const styleDesc = artStyle.replace('_', ' ')

    try {
      const result = await fal.run('fal-ai/flux/schnell', {
        input: {
          prompt: `${styleDesc} artwork inspired by this haiku: "${haiku}". Beautiful, artistic, evocative.`,
          image_size: 'square_hd',
          num_images: 1,
        }
      })
      const imageUrl = result?.images?.[0]?.url
      if (imageUrl) {
        const entry = { id: Date.now(), imageUrl, lines: [...lines], author: user.username, style: artStyle, timestamp: Date.now() }
        const updated = [entry, ...gallery].slice(0, 20)
        setGallery(updated)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        const pts = game.pointsPerAction || 75
        setScore(s => s + pts)
        addScore(game.id, user.username, pts, { haiku })
        setLines(['', '', ''])
      }
    } catch (err) {
      console.error('Generation failed', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Score */}
      <div className="flex items-center justify-between brutalist-card p-3">
        <div><p className="text-xs font-black text-navy/50 uppercase">Haikus</p><p className="text-2xl font-black text-navy">{gallery.filter(g => g.author === user.username).length}</p></div>
        <div className="text-right"><p className="text-xs font-black text-navy/50 uppercase">Score</p><p className="text-2xl font-black text-primary">{score}</p></div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="brutalist-card p-6 flex flex-col gap-4">
        <h3 className="font-black text-navy uppercase text-sm">Write your haiku (5-7-5)</h3>

        {lines.map((line, i) => {
          const syl = countSyllables(line)
          const target = SYLLABLE_TARGETS[i]
          const ok = syl === target && line.trim()
          const over = syl > target
          return (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <label className="text-xs font-bold text-navy/50 uppercase">Line {i + 1}</label>
                <span className={`text-xs font-bold ${ok ? 'text-green-600' : over ? 'text-red-500' : 'text-navy/40'}`}>
                  {line ? `${syl}/${target}` : `${target} syllables`}
                </span>
              </div>
              <input type="text" value={line} onChange={e => { const l = [...lines]; l[i] = e.target.value; setLines(l) }}
                placeholder={['An old silent pond...', 'A frog jumps into the pond—', 'Splash! Silence again.'][i]}
                className="w-full px-4 py-2 text-navy text-sm focus:outline-none font-medium"
                style={{ border: `2px solid ${ok ? '#22c55e' : over ? '#ef4444' : '#1A1A2E'}` }} />
            </div>
          )
        })}

        {/* Art Style */}
        <div>
          <p className="text-xs font-bold text-navy/50 uppercase mb-2">Art Style</p>
          <div className="flex flex-wrap gap-2">
            {styles.map(s => (
              <button key={s.id} type="button" onClick={() => setArtStyle(s.id)}
                className={`px-3 py-1 text-xs font-black uppercase transition-colors ${artStyle === s.id ? 'bg-primary text-white' : 'bg-white text-navy hover:bg-gray-100'}`}
                style={{ border: '2px solid #1A1A2E' }}>{s.label}</button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={!allOk || generating}
          className="w-full py-3 bg-primary text-white font-black uppercase disabled:opacity-40 transition-opacity"
          style={{ border: '2px solid #1A1A2E' }}>
          {generating ? 'Generating...' : `Submit & Generate Art (+${game.pointsPerAction} pts)`}
        </button>
      </form>

      {/* Gallery */}
      {gallery.length > 0 && (
        <div>
          <h3 className="font-black text-navy uppercase text-sm mb-3">Gallery</h3>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {gallery.map(item => (
              <div key={item.id} className="group relative flex-none w-48 h-48 overflow-hidden cursor-pointer"
                style={{ border: '2px solid #1A1A2E' }}>
                <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-3 text-white">
                  {item.lines.map((l, i) => <p key={i} className="text-xs italic text-center">{l}</p>)}
                  <p className="text-[10px] text-white/60 mt-2">— {item.author}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

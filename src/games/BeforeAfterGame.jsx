import { useState, useRef, useEffect, useMemo } from 'react'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { generateImage, editImage, judge } from '../lib/fal'
import { useSharedGallery } from '../hooks/useSharedGallery'
import { useMachine } from '../hooks/useMachine'
import { beforeAfterMachine } from '../machines/beforeAfter'
import ErrorBanner from '../components/game/ErrorBanner'
import GeneratingSpinner from '../components/game/GeneratingSpinner'
import GameImage from '../components/game/GameImage'

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

const CUSTOM_MAX = 150
// Points per round = the judge's 0-100 score (one addScore per round, so
// always under maxScore). When the judge is unavailable: a flat score.
const FALLBACK_POINTS = 75
// Reuse "before" scenes other players already made (saves an AI image and
// lets the gallery compare transformations of the same scene).
const REUSE_MAX_AGE = 3 * 24 * 3600 * 1000

function errorText(err, fallback) {
  return err?.status && err.status !== 500 && err.message ? err.message : fallback
}

/** "🌊 Underwater" -> "Underwater". Extended_Pictographic, not \p{Emoji}, which also matches digits. */
function cleanLabel(label) {
  return label.replace(/^[\p{Extended_Pictographic}️‍\s]+/u, '').trim() || label
}

export default function BeforeAfterGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const gallery = useSharedGallery('before-after')
  const flow = useMachine(beforeAfterMachine) // see src/machines/beforeAfter.js
  const phase = flow.state
  const [scene, setScene] = useState(null)
  const [beforeUrl, setBeforeUrl] = useState(null)
  const [afterUrl, setAfterUrl] = useState(null)
  const [transformation, setTransformation] = useState('')
  const [customTransformation, setCustomTransformation] = useState('')
  const [result, setResult] = useState(null) // { points, score, comment }
  const [error, setError] = useState(null)
  const [score, setScore] = useState(0)
  const [mine, setMine] = useState(0)
  const [showGallery, setShowGallery] = useState(false)
  const [sort, setSort] = useState('new')
  const beforeCache = useRef({}) // scene name -> before url made in this visit

  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => { aliveRef.current = false }
  }, [])

  const startRound = async () => {
    const choices = SCENES.filter((s) => s.scene !== scene?.scene)
    const s = choices[Math.floor(Math.random() * choices.length)]
    const now = Date.now()
    const shared = gallery.items.filter((i) => i.meta?.scene === s.scene && i.beforeUrl && now - i.createdAt < REUSE_MAX_AGE)
    const reuse = beforeCache.current[s.scene] || shared[Math.floor(Math.random() * shared.length)]?.beforeUrl
    // A reused "before" goes straight to picking; otherwise the AI paints one.
    if (!flow.send(reuse ? 'REUSE_SCENE' : 'NEW_SCENE')) return

    setScene(s)
    setBeforeUrl(reuse || null)
    setAfterUrl(null)
    setResult(null)
    setTransformation('')
    setCustomTransformation('')
    setError(null)
    if (reuse) return

    try {
      const url = await generateImage(s.prompt, { width: 768, height: 768 })
      if (!aliveRef.current) return
      if (!flow.send('SCENE_READY')) return
      beforeCache.current[s.scene] = url
      setBeforeUrl(url)
    } catch (err) {
      if (!aliveRef.current) return
      if (!flow.send('SCENE_FAILED')) return
      setError(errorText(err, 'Could not paint the "before" scene. Please try again.'))
    }
  }

  const sameSceneAgain = () => {
    if (!flow.send('SAME_SCENE')) return
    setAfterUrl(null)
    setResult(null)
    setTransformation('')
    setCustomTransformation('')
    setError(null)
  }

  const applyTransformation = async (t) => {
    const label = (t || customTransformation.trim()).slice(0, CUSTOM_MAX)
    if (!label || !beforeUrl) return
    // One transformation at a time: a second tap while editing is ignored.
    if (!flow.send('APPLY')) return
    const clean = cleanLabel(label)
    setTransformation(label)
    setError(null)

    let url
    try {
      // A real edit of the "before" image: same scene, with the change applied.
      url = await editImage(`Transform this scene: ${clean}. Keep the same place, layout and camera angle.`, beforeUrl)
    } catch (err) {
      if (!aliveRef.current) return
      if (!flow.send('EDIT_FAILED')) return
      // A reused "before" may have expired: forget it so the next scene is fresh.
      delete beforeCache.current[scene.scene]
      setError(errorText(err, 'The transformation failed. Please try again.'))
      return
    }
    if (!aliveRef.current) return
    if (!flow.send('EDITED')) return
    setAfterUrl(url)

    const verdict = await judge('edit', { beforeUrl, imageUrl: url, text: clean })
    if (!aliveRef.current) return
    if (!flow.send('JUDGED')) return
    const judged = verdict.score !== null && verdict.score !== undefined
    const points = judged ? Math.max(0, Math.min(100, Math.round(verdict.score))) : FALLBACK_POINTS
    setResult({ points, score: judged ? points : null, comment: judged ? verdict.comment : '' })
    setScore((s) => s + points)
    setMine((m) => m + 1)
    addScore(game.id, username, points, { scene: scene.scene, transformation: label })

    try {
      await gallery.add({ imageUrl: url, beforeUrl, text: label, meta: { scene: scene.scene, score: judged ? points : null } })
    } catch (err) {
      if (aliveRef.current) setError(errorText(err, 'Could not add your transformation to the shared gallery.'))
    }
  }

  const handleVote = async (id) => {
    try {
      await gallery.vote(id)
    } catch (err) {
      setError(errorText(err, 'Vote failed. Please try again.'))
    }
  }

  const sorted = useMemo(() => {
    const list = [...gallery.items]
    if (sort === 'top') list.sort((a, b) => b.votes - a.votes || b.createdAt - a.createdAt)
    return list
  }, [gallery.items, sort])

  const tabBtn = (active, color) => ({ border: '2px solid #1A1A2E', background: active ? color : 'white', color: active ? 'white' : '#1A1A2E' })

  return (
    <div className="flex flex-col gap-4" {...flow.attrs}>
      {/* Stats */}
      <div className="flex items-center justify-between gap-2 brutalist-card p-3 sm:p-4">
        <div>
          <p className="text-[10px] sm:text-xs font-black text-navy/50 uppercase">My Transforms</p>
          <p className="text-2xl sm:text-3xl font-black text-navy">{mine}</p>
        </div>
        <div className="flex gap-1 sm:gap-2">
          <button onClick={() => setShowGallery(false)} className="px-2 sm:px-3 py-2 text-[10px] sm:text-xs font-black uppercase" style={tabBtn(!showGallery, '#1A1A2E')}>
            🔮 Play
          </button>
          <button onClick={() => setShowGallery(true)} className="px-2 sm:px-3 py-2 text-[10px] sm:text-xs font-black uppercase" style={tabBtn(showGallery, '#059669')}>
            🖼️ Gallery ({gallery.items.length})
          </button>
        </div>
        <div className="text-right">
          <p className="text-[10px] sm:text-xs font-black text-navy/50 uppercase">Score</p>
          <p className="text-2xl sm:text-3xl font-black text-primary">{score}</p>
        </div>
      </div>

      <ErrorBanner message={error} />

      {showGallery ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-navy/50 uppercase">Everyone's transformations</p>
            <div className="flex gap-1">
              {[['new', 'Newest'], ['top', 'Top voted']].map(([id, label]) => (
                <button key={id} onClick={() => setSort(id)} className="px-2 py-1 text-[10px] font-black uppercase" style={tabBtn(sort === id, '#1A1A2E')}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {gallery.error && sorted.length === 0 ? (
            <ErrorBanner message="Could not load the gallery." onRetry={gallery.reload} />
          ) : sorted.length === 0 ? (
            <div className="text-center py-16 text-navy/40 font-medium" style={{ border: '3px dashed #1A1A2E' }}>
              <p className="text-4xl mb-3">🔮</p>
              <p>{gallery.loading ? 'Loading...' : 'No transformations yet. Be the first!'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sorted.map((entry) => <GalleryEntry key={entry.id} entry={entry} onVote={handleVote} />)}
            </div>
          )}
        </div>
      ) : (
        <>
          {phase === 'idle' && (
            <div className="brutalist-card p-8 sm:p-12 text-center">
              <p className="text-5xl mb-4">🔮</p>
              <h3 className="font-black text-navy uppercase mb-2">Before & After</h3>
              <p className="text-navy/50 text-sm mb-6 font-medium max-w-md mx-auto">
                Get a scene, choose a transformation, and the AI edits that exact image. The judge scores how well the change came through.
              </p>
              <button onClick={startRound} className="px-8 py-3 bg-[#059669] text-white font-black uppercase text-sm" style={{ border: '2px solid #1A1A2E' }}>
                Get A Scene
              </button>
            </div>
          )}

          {phase === 'generating-before' && (
            <GeneratingSpinner label='Painting the "before" scene...' color="#059669" />
          )}

          {phase === 'pick' && (
            <div className="flex flex-col gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black text-navy/40 uppercase">Before: {scene.scene}</p>
                  <button onClick={startRound} className="text-[10px] font-black uppercase text-navy/60 hover:text-navy underline">Different scene</button>
                </div>
                <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
                  <GameImage eager src={beforeUrl} alt="Before" className="w-full object-cover" style={{ maxHeight: 400 }} />
                </div>
              </div>
              <div className="brutalist-card p-4 sm:p-6">
                <h3 className="font-black text-navy uppercase text-sm mb-3">Pick a transformation</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                  {TRANSFORMATIONS.map((t) => (
                    <button key={t} onClick={() => applyTransformation(t)}
                      className="px-3 py-2 text-xs font-black uppercase text-navy hover:bg-gray-100 transition-colors text-left"
                      style={{ border: '2px solid #1A1A2E' }}>
                      {t}
                    </button>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); applyTransformation() }} className="flex gap-2">
                  <input type="text" value={customTransformation} maxLength={CUSTOM_MAX}
                    onChange={(e) => setCustomTransformation(e.target.value)}
                    placeholder="Or type your own..."
                    className="flex-1 min-w-0 px-4 py-2 text-navy text-sm focus:outline-none font-medium"
                    style={{ border: '3px solid #1A1A2E' }} />
                  <button type="submit" disabled={!customTransformation.trim()}
                    className="px-4 py-2 bg-[#059669] text-white text-xs font-black uppercase disabled:opacity-40"
                    style={{ border: '2px solid #1A1A2E' }}>
                    Go
                  </button>
                </form>
              </div>
            </div>
          )}

          {phase === 'generating-after' && (
            <div className="flex flex-col gap-4">
              <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
                <GameImage eager src={beforeUrl} alt="Before" className="w-full object-cover" style={{ maxHeight: 300 }} />
              </div>
              <GeneratingSpinner label={`Editing: ${transformation}`} color="#059669" />
            </div>
          )}

          {(phase === 'judging' || phase === 'result') && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <p className="text-[10px] font-black text-navy/40 uppercase mb-2">Before</p>
                  <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
                    <GameImage eager src={beforeUrl} alt="Before" className="w-full aspect-square object-cover" />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-navy/40 uppercase mb-2 truncate">After: {transformation}</p>
                  <div style={{ border: '3px solid #059669', overflow: 'hidden' }}>
                    <GameImage eager src={afterUrl} alt="After" className="w-full aspect-square object-cover" />
                  </div>
                </div>
              </div>
              {phase === 'judging' ? (
                <GeneratingSpinner label="The judge is comparing..." color="#059669" />
              ) : (
                <div className="brutalist-card p-4 sm:p-6 text-center">
                  <p className="text-3xl font-black text-primary mb-1">+{result.points} pts</p>
                  {result.score !== null ? (
                    <>
                      <p className="text-xs font-black text-navy/50 uppercase mb-2">Judge score {result.score}/100</p>
                      {result.comment && <p className="text-sm text-navy font-medium italic mb-3">"{result.comment}"</p>}
                    </>
                  ) : (
                    <p className="text-xs font-bold text-navy/50 mb-3">Judge unavailable, flat score.</p>
                  )}
                  <p className="text-sm text-navy/50 font-medium mb-4">{scene.scene} → {transformation}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button onClick={sameSceneAgain} className="py-3 bg-white text-navy font-black uppercase text-sm" style={{ border: '2px solid #1A1A2E' }}>
                      Same Scene Again
                    </button>
                    <button onClick={startRound} className="py-3 bg-[#059669] text-white font-black uppercase text-sm" style={{ border: '2px solid #1A1A2E' }}>
                      New Scene
                    </button>
                    <button onClick={() => setShowGallery(true)} className="py-3 bg-navy text-white font-black uppercase text-sm" style={{ border: '2px solid #1A1A2E' }}>
                      View Gallery
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function GalleryEntry({ entry, onVote }) {
  return (
    <div className="brutalist-card p-0 overflow-hidden">
      <div className="grid grid-cols-2">
        <div className="relative">
          <GameImage src={entry.beforeUrl} alt="Before" className="w-full aspect-square object-cover" />
          <span className="absolute top-2 left-2 bg-navy/80 text-white text-[10px] font-black uppercase px-2 py-0.5">Before</span>
        </div>
        <div className="relative" style={{ borderLeft: '2px solid #1A1A2E' }}>
          <GameImage src={entry.imageUrl} alt={`After: ${entry.text}`} className="w-full aspect-square object-cover" />
          <span className="absolute top-2 left-2 bg-[#059669]/90 text-white text-[10px] font-black uppercase px-2 py-0.5">After</span>
        </div>
      </div>
      <div className="p-3 flex items-center justify-between gap-2" style={{ borderTop: '2px solid #1A1A2E' }}>
        <div className="min-w-0">
          <p className="text-xs font-black text-navy uppercase truncate">{entry.text}</p>
          <p className="text-[10px] text-navy/50 font-medium truncate">
            {entry.meta?.scene ? `${entry.meta.scene} · ` : ''}{entry.username || 'Guest'}
            {typeof entry.meta?.score === 'number' ? ` · Judge ${entry.meta.score}` : ''}
          </p>
        </div>
        <button onClick={() => onVote(entry.id)}
          aria-label={entry.voted ? 'Remove your vote' : 'Vote for this transformation'}
          title={entry.voted ? 'Remove your vote' : 'Vote for this transformation'}
          className={`shrink-0 px-2 py-0.5 text-xs font-black ${entry.voted ? 'bg-primary text-white' : 'text-navy hover:text-primary'}`}
          style={{ border: '2px solid #1A1A2E' }}>
          ♥ {entry.votes || 0}
        </button>
      </div>
    </div>
  )
}

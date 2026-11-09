import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { generateImage, judge } from '../lib/fal'
import { useGameRounds } from '../hooks/useGameRounds'
import { useSharedGallery } from '../hooks/useSharedGallery'
import { pickRandom } from '../lib/similarity'
import StatsBar from '../components/game/StatsBar'
import ErrorBanner from '../components/game/ErrorBanner'
import GeneratingSpinner from '../components/game/GeneratingSpinner'
import GameImage from '../components/game/GameImage'
import GameOverCard from '../components/game/GameOverCard'
import ModeToggle from './party/ModeToggle'
import SubmitVoteParty from './party/SubmitVoteParty'

const COLOR = '#8B5CF6'
const MAX_ROUNDS = 3
const POINTS_PER_JUDGE_POINT = 3 // judge 0-100 -> up to 300 per round, 900 per game
const FALLBACK_POINTS = 50 // judge unavailable: small flat score
const MAX_CAPTION = 140
const MY_POSTS_KEY = 'gen_arcade_dream_caption_posts'

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
  'A whale swimming through a desert of sand dunes',
  'A lighthouse whose beam is a river of stars',
]

const dreamPrompt = (p) => `Surreal dreamlike artwork: ${p}. Ethereal, mystical, impossible, dreamscape.`

function loadMyPosts() {
  try {
    const list = JSON.parse(sessionStorage.getItem(MY_POSTS_KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}
function saveMyPosts(ids) {
  try {
    sessionStorage.setItem(MY_POSTS_KEY, JSON.stringify(ids.slice(-100)))
  } catch {
    // storage unavailable: own entries just stay votable
  }
}

export default function DreamCaptionGame({ game }) {
  const [mode, setMode] = useState(() => (new URLSearchParams(window.location.search).get('room') ? 'party' : 'solo'))
  return (
    <div className="flex flex-col gap-4">
      <ModeToggle mode={mode} onChange={setMode} color={COLOR} />
      {mode === 'solo' ? <DreamCaptionSolo game={game} /> : <DreamCaptionParty gameId={game.id} />}
    </div>
  )
}

// ---------------------------------------------------------------- solo ----

function DreamCaptionSolo({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const { round, totalScore, gameOver, token, isStale, recordScore, nextRound, restart } =
    useGameRounds({ gameId: game.id, username, maxRounds: MAX_ROUNDS })
  const gallery = useSharedGallery(game.id)
  const [myPosts, setMyPosts] = useState(loadMyPosts)
  const [phase, setPhase] = useState('idle') // idle, generating, captioning, judging, result
  const [imageUrl, setImageUrl] = useState(null)
  const [caption, setCaption] = useState('')
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null) // { pts, score, comment, posted }
  const [history, setHistory] = useState([]) // [{ imageUrl, caption, pts }]
  const [usedPrompts, setUsedPrompts] = useState([])

  const generateDream = async () => {
    setPhase('generating')
    setError(null)
    setCaption('')
    setResult(null)
    const p = pickRandom(DREAM_PROMPTS, usedPrompts)
    setUsedPrompts((u) => [...u, p])
    const t = token()
    try {
      const url = await generateImage(dreamPrompt(p))
      if (isStale(t)) return
      setImageUrl(url)
      setPhase('captioning')
    } catch (err) {
      if (isStale(t)) return
      setError(err?.message || 'Image generation failed.')
      setPhase('idle')
    }
  }

  const submitCaption = async (e) => {
    e.preventDefault()
    const text = caption.trim()
    if (!text) return
    setPhase('judging')
    const t = token()
    const verdict = await judge('caption', { imageUrl, text })
    if (isStale(t)) return
    const judged = verdict.score != null
    const pts = judged ? Math.round(verdict.score * POINTS_PER_JUDGE_POINT) : FALLBACK_POINTS
    recordScore(pts)
    setHistory((h) => [...h, { imageUrl, caption: text, pts }])
    setResult({ pts, score: verdict.score, comment: judged ? verdict.comment : '', posted: null })
    setPhase('result')
    try {
      const item = await gallery.add({ imageUrl, text, meta: { round } })
      const ids = [...loadMyPosts(), item.id]
      saveMyPosts(ids)
      setMyPosts(ids)
      if (!isStale(t)) setResult((r) => (r ? { ...r, posted: true } : r))
    } catch {
      if (!isStale(t)) setResult((r) => (r ? { ...r, posted: false } : r))
    }
  }

  const handleNext = () => {
    nextRound()
    setImageUrl(null)
    setResult(null)
    setPhase('idle')
  }

  const handleRestart = () => {
    restart()
    setImageUrl(null)
    setCaption('')
    setResult(null)
    setHistory([])
    setError(null)
    setPhase('idle')
  }

  const isMine = (entry) =>
    myPosts.includes(entry.id) || (!!user?.username && !!entry.username && entry.username.toLowerCase() === user.username.toLowerCase())

  return (
    <div className="flex flex-col gap-4">
      {gameOver ? (
        <GameOverCard emoji="💭" title="Dreams captioned!" score={`${totalScore} pts`} subtitle={`${MAX_ROUNDS} rounds completed`} onRestart={handleRestart}>
          <div className="flex flex-col gap-2 text-left my-4">
            {history.map((h, i) => (
              <div key={i} className="flex gap-3 items-center border-2 border-navy p-2 bg-white">
                <GameImage src={h.imageUrl} alt="" className="w-14 h-14 object-cover flex-none" />
                <p className="text-xs text-navy italic flex-1 min-w-0 line-clamp-2">"{h.caption}"</p>
                <span className="text-sm font-black text-primary flex-none">+{h.pts}</span>
              </div>
            ))}
          </div>
        </GameOverCard>
      ) : (
        <>
          <StatsBar
            className="mb-0"
            stats={[
              { label: 'Round', value: `${round}/${MAX_ROUNDS}` },
              { label: 'Score', value: totalScore, color: '#FF2D55' },
            ]}
          />

          <ErrorBanner message={error} />

          {phase === 'idle' && (
            <div className="brutalist-card p-8 sm:p-12 text-center">
              <p className="text-5xl mb-4">💭</p>
              <h3 className="font-black text-navy uppercase mb-2">Round {round}</h3>
              <p className="text-navy/50 text-sm mb-6 font-medium max-w-md mx-auto">
                The AI dreams up a surreal image. Write a caption that fits and makes people smile. The AI judge scores it.
              </p>
              <button onClick={generateDream} className="btn-brutalist text-white text-sm" style={{ background: COLOR }}>
                Generate a dream
              </button>
            </div>
          )}

          {phase === 'generating' && <GeneratingSpinner label="Dreaming up something surreal..." color={COLOR} />}

          {(phase === 'captioning' || phase === 'judging' || phase === 'result') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
                <GameImage eager src={imageUrl} alt="Dream" className="w-full object-cover" style={{ maxHeight: 400 }} />
              </div>
              <div className="brutalist-card p-5 flex flex-col gap-4">
                {phase === 'captioning' && (
                  <form onSubmit={submitCaption} className="flex flex-col gap-3 flex-1">
                    <h3 className="font-black text-navy uppercase text-sm">Caption this dream</h3>
                    <p className="text-navy/40 text-xs font-medium">Funny, poetic, or absurd. It just has to fit the picture.</p>
                    <textarea
                      autoFocus
                      value={caption}
                      onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
                      placeholder="Write a caption..."
                      rows={3}
                      className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium resize-none"
                      style={{ border: `3px solid ${COLOR}` }}
                    />
                    <p className="text-[10px] text-navy/40 font-bold text-right -mt-2">{caption.length}/{MAX_CAPTION}</p>
                    <button type="submit" disabled={!caption.trim()} className="btn-brutalist text-white text-sm disabled:opacity-40" style={{ background: COLOR }}>
                      Submit caption
                    </button>
                  </form>
                )}
                {phase === 'judging' && <GeneratingSpinner label="The judge is reading your caption..." color={COLOR} />}
                {phase === 'result' && result && (
                  <div className="text-center flex flex-col justify-center flex-1 gap-3">
                    <p className="text-3xl font-black text-primary">+{result.pts} pts</p>
                    <p className="text-sm text-navy italic">"{caption.trim()}"</p>
                    {result.score != null ? (
                      <div className="border-2 border-navy p-3 bg-highlight/20 text-left">
                        <p className="text-[10px] font-black text-navy/50 uppercase">Judge: {result.score}/100</p>
                        {result.comment && <p className="text-sm text-navy font-medium">{result.comment}</p>}
                      </div>
                    ) : (
                      <p className="text-xs text-navy/50 font-bold uppercase">Judge unavailable, flat {FALLBACK_POINTS} pts</p>
                    )}
                    <p className="text-[11px] text-navy/50 font-bold uppercase">
                      {result.posted === null ? 'Posting to the gallery...' : result.posted ? 'Posted to the gallery below' : 'Could not post to the gallery'}
                    </p>
                    <button onClick={handleNext} className="btn-brutalist bg-navy text-white text-sm">
                      {round >= MAX_ROUNDS ? 'See final score' : 'Next round'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <CaptionGallery gallery={gallery} isMine={isMine} />
    </div>
  )
}

function CaptionGallery({ gallery, isMine }) {
  const [busy, setBusy] = useState(null)
  const [voteError, setVoteError] = useState(null)
  const items = gallery.items.filter((e) => e.text && e.imageUrl)

  const vote = async (id) => {
    setBusy(id)
    setVoteError(null)
    try {
      await gallery.vote(id)
    } catch (err) {
      setVoteError(err?.message || 'Vote failed.')
    } finally {
      setBusy(null)
    }
  }

  if (gallery.loading && items.length === 0) return null
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-black text-navy uppercase text-sm">Caption gallery ({items.length})</h3>
        <p className="text-[10px] text-navy/40 font-bold uppercase">Tap ♥ to vote</p>
      </div>
      {voteError && <p className="text-xs font-bold text-danger mb-2">{voteError}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-navy/40 font-medium">No captions yet. Be the first!</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.slice(0, 20).map((entry) => {
            const mine = isMine(entry)
            return (
              <div key={entry.id} className="brutalist-card p-0 overflow-hidden flex" style={{ minHeight: 120 }}>
                <GameImage src={entry.imageUrl} alt="" className="w-28 object-cover flex-none" />
                <div className="p-3 flex flex-col justify-between flex-1 min-w-0 gap-2">
                  <p className="text-xs text-navy italic leading-tight line-clamp-4">"{entry.text}"</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-navy/40 font-bold truncate">
                      {entry.avatar || '👤'} {entry.username || 'Guest'}{mine ? ' (you)' : ''}
                    </span>
                    <button
                      onClick={() => vote(entry.id)}
                      disabled={mine || busy === entry.id}
                      title={mine ? 'You cannot vote for your own caption' : entry.voted ? 'Remove your vote' : 'Vote for this caption'}
                      aria-label={mine ? 'Your caption' : entry.voted ? 'Remove vote' : 'Vote'}
                      className={`text-xs font-black px-2 py-1 border-2 border-navy flex-none disabled:opacity-40 ${entry.voted ? 'bg-primary text-white' : 'bg-white text-navy hover:bg-primary/10'}`}>
                      ♥ {entry.votes || 0}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// --------------------------------------------------------------- party ----

function DreamCaptionParty({ gameId }) {
  return (
    <SubmitVoteParty
      gameId={gameId}
      title="Dream Caption party"
      color={COLOR}
      rounds={3}
      submitSeconds={90}
      voteSeconds={40}
      intro="The host makes a dream image each round. Everyone writes a caption on their own phone, then votes for the best one (not their own). +100 per vote, plus a small bonus from the AI judge."
      pickWaitLabel="The host is dreaming up an image..."
      renderPick={(props) => <DreamPick key={props.round} {...props} />}
      renderChallenge={(c, { compact }) => (
        <div className="mx-auto w-full" style={{ border: '3px solid #1A1A2E', overflow: 'hidden', maxWidth: compact ? 280 : 480 }}>
          <GameImage eager src={c?.imageUrl} alt="Dream to caption" className="w-full object-cover" />
        </div>
      )}
      renderSubmit={(props) => <CaptionComposer {...props} />}
      renderEntry={(e) => <p className="text-sm text-navy italic font-medium break-words">"{e.text}"</p>}
    />
  )
}

function DreamPick({ round, onPick }) {
  const [url, setUrl] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [used, setUsed] = useState([])

  const make = async () => {
    setBusy(true)
    setError(null)
    const p = pickRandom(DREAM_PROMPTS, used)
    setUsed((u) => [...u, p])
    try {
      setUrl(await generateImage(dreamPrompt(p)))
    } catch (err) {
      setError(err?.message || 'Image generation failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="brutalist-card p-5 flex flex-col gap-4 items-center text-center">
      <h3 className="font-black text-navy uppercase">Round {round}: make the dream</h3>
      <ErrorBanner message={error} />
      {busy ? (
        <GeneratingSpinner label="Dreaming up something surreal..." color={COLOR} />
      ) : url ? (
        <>
          <div className="w-full max-w-sm" style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
            <GameImage eager src={url} alt="Dream preview" className="w-full object-cover" />
          </div>
          <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
            <button onClick={make} className="btn-brutalist bg-white text-navy text-xs">New image</button>
            <button onClick={() => onPick({ imageUrl: url })} className="btn-brutalist text-white text-xs" style={{ background: COLOR }}>Start captions</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-navy/60 font-medium">You are the host. Make a surreal image for everyone to caption.</p>
          <button onClick={make} className="btn-brutalist text-white text-sm" style={{ background: COLOR }}>Generate a dream</button>
        </>
      )}
    </div>
  )
}

function CaptionComposer({ challenge, onSubmit }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const alive = useAlive()

  const submit = async (e) => {
    e.preventDefault()
    const caption = text.trim()
    if (!caption || busy) return
    setBusy(true)
    const verdict = await judge('caption', { imageUrl: challenge.imageUrl, text: caption })
    if (!alive.current) return
    onSubmit({ text: caption, judgeScore: verdict.score, judgeComment: verdict.score != null ? verdict.comment : '' })
  }

  return (
    <form onSubmit={submit} className="brutalist-card p-4 flex flex-col gap-3">
      <h3 className="font-black text-navy uppercase text-sm">Your caption</h3>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX_CAPTION))}
        placeholder="Write a caption..."
        rows={3}
        disabled={busy}
        className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium resize-none"
        style={{ border: `3px solid ${COLOR}` }}
      />
      <button type="submit" disabled={!text.trim() || busy} className="btn-brutalist text-white text-sm disabled:opacity-40" style={{ background: COLOR }}>
        {busy ? 'Sending...' : 'Submit caption'}
      </button>
    </form>
  )
}

function useAlive() {
  const [ref] = useState(() => ({ current: true }))
  useEffect(() => {
    ref.current = true
    return () => {
      ref.current = false
    }
  }, [ref])
  return ref
}

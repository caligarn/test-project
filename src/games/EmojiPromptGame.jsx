import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { generateImage, judge } from '../lib/fal'
import { useGameRounds } from '../hooks/useGameRounds'
import { pickRandom, shuffle } from '../lib/similarity'
import StatsBar from '../components/game/StatsBar'
import GameOverCard from '../components/game/GameOverCard'
import GeneratingSpinner from '../components/game/GeneratingSpinner'
import ErrorBanner from '../components/game/ErrorBanner'
import GameImage from '../components/game/GameImage'
import ModeToggle from './party/ModeToggle'
import SubmitVoteParty from './party/SubmitVoteParty'
import { useAlive } from './party/useAlive'

const COLOR = '#F59E0B'
const MAX_ROUNDS = 5
const MAX_EMOJIS = 15
const POINTS_PER_JUDGE_POINT = 2 // judge 0-100 -> up to 200 per round
const SHORT_BONUS = 20 // said it with 5 emojis or fewer, and the judge got it (50+)
const SHORT_MAX = 5
const FALLBACK_POINTS = 40 // judge unavailable: small flat score
// Max per game: 5 x (200 + 20) = 1100, under the 1500 limit.

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

const SCENES = [
  'A pirate on a desert island',
  'A cat astronaut on the moon',
  'A wizard cooking pizza',
  'A dragon at a birthday party',
  'A robot walking a dog in the rain',
  'A ghost relaxing at the beach',
  'A snowman lost in the desert',
  'A king riding a bicycle',
  'Dinosaurs at a rock concert',
  'A mermaid reading in a library',
  'A vampire at the dentist',
  'An alien ordering tacos',
  'A unicorn stuck in a traffic jam',
  'A bear camping under the stars',
  'An owl detective solving a mystery',
  'A penguin on a tropical vacation',
  'A princess fighting a dragon',
  'A monkey painting a portrait',
  'Zombies having a picnic',
  'A rocket launching at sunset',
  'A haunted castle on a stormy night',
  'A frog prince with a crown',
  'A chef baking a giant cake',
  'A superhero stuck in the snow',
  'A fox playing the guitar in a forest',
]

const emojiImagePrompt = (emojis) =>
  `Create an image based only on these emojis: ${emojis}. Interpret the emojis literally and combine them into one cohesive, detailed scene.`

/** Generate from the emojis only (never the scene text), then let the judge compare with the scene. */
async function playEmojis(emojiList, scene) {
  const emojis = emojiList.join(' ')
  const imageUrl = await generateImage(emojiImagePrompt(emojis))
  const verdict = await judge('emoji', { imageUrl, text: scene })
  return { emojis, imageUrl, verdict }
}

export default function EmojiPromptGame({ game }) {
  const [mode, setMode] = useState(() => (new URLSearchParams(window.location.search).get('room') ? 'party' : 'solo'))
  return (
    <div className="flex flex-col gap-4">
      <ModeToggle mode={mode} onChange={setMode} color={COLOR} />
      {mode === 'solo' ? <EmojiSolo game={game} /> : <EmojiParty gameId={game.id} />}
    </div>
  )
}

// ---------------------------------------------------------------- solo ----

function EmojiSolo({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const { round, totalScore, gameOver, token, isStale, recordScore, nextRound, restart } =
    useGameRounds({ gameId: game.id, username, maxRounds: MAX_ROUNDS })
  const [phase, setPhase] = useState('idle') // idle, building, generating, result
  const [scene, setScene] = useState(null)
  const [emojis, setEmojis] = useState([])
  const [result, setResult] = useState(null) // { imageUrl, emojis, score, comment, base, bonus, pts }
  const [error, setError] = useState(null)
  const [usedScenes, setUsedScenes] = useState([])

  const startRound = () => {
    const s = pickRandom(SCENES, usedScenes)
    setScene(s)
    setUsedScenes((u) => [...u, s])
    setEmojis([])
    setResult(null)
    setError(null)
    setPhase('building')
  }

  const submit = async (list) => {
    setEmojis(list)
    setPhase('generating')
    setError(null)
    const t = token()
    try {
      const { emojis: str, imageUrl, verdict } = await playEmojis(list, scene)
      if (isStale(t)) return
      let base = FALLBACK_POINTS
      let bonus = 0
      if (verdict.score != null) {
        base = Math.round(verdict.score * POINTS_PER_JUDGE_POINT)
        if (list.length <= SHORT_MAX && verdict.score >= 50) bonus = SHORT_BONUS
      }
      const pts = base + bonus
      recordScore(pts)
      setResult({ imageUrl, emojis: str, score: verdict.score, comment: verdict.score != null ? verdict.comment : '', base, bonus, pts })
      setPhase('result')
    } catch (err) {
      if (isStale(t)) return
      setError(err?.message || 'Image generation failed.')
      setPhase('building')
    }
  }

  const handleNext = () => {
    nextRound()
    setPhase('idle')
  }

  const handleRestart = () => {
    restart()
    setScene(null)
    setEmojis([])
    setResult(null)
    setError(null)
    setUsedScenes([])
    setPhase('idle')
  }

  if (gameOver) {
    return (
      <GameOverCard emoji="😎" title="Emoji master!" score={`${totalScore} pts`} subtitle={`${MAX_ROUNDS} rounds completed`} onRestart={handleRestart} />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <StatsBar
        stats={[
          { label: 'Round', value: `${round}/${MAX_ROUNDS}` },
          { label: 'Score', value: totalScore, color: '#FF2D55' },
        ]}
      />

      <ErrorBanner message={error} />

      {phase === 'idle' && (
        <div className="brutalist-card p-8 sm:p-12 text-center">
          <p className="text-5xl mb-4">😎</p>
          <h3 className="font-black text-navy uppercase mb-2">Round {round}</h3>
          <p className="text-navy/50 text-sm mb-6 font-medium max-w-md mx-auto">
            You get a scene. Describe it with emojis only. The AI draws only your emojis, then the judge checks if the picture shows the scene.
          </p>
          <button onClick={startRound} className="btn-brutalist text-navy text-sm" style={{ background: COLOR }}>
            Get scene
          </button>
        </div>
      )}

      {phase === 'building' && (
        <>
          <SceneCard scene={scene} />
          <EmojiComposer initial={emojis} onSubmit={submit} />
          <p className="text-[11px] text-navy/40 font-bold uppercase text-center">
            Tip: 5 emojis or fewer that the judge gets earns +{SHORT_BONUS}
          </p>
        </>
      )}

      {phase === 'generating' && (
        <div className="flex flex-col gap-2">
          <GeneratingSpinner label="Turning emojis into art..." color={COLOR} />
          <p className="text-3xl text-center break-words">{emojis.join(' ')}</p>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-3">
            <div className="brutalist-card p-3">
              <p className="text-[10px] font-black text-navy/40 uppercase mb-1">Your emojis</p>
              <p className="text-2xl leading-relaxed break-words">{result.emojis}</p>
            </div>
            <div style={{ border: '3px solid #1A1A2E', overflow: 'hidden' }}>
              <GameImage src={result.imageUrl} alt="Generated from emojis" className="w-full object-cover" style={{ maxHeight: 400 }} eager />
            </div>
          </div>
          <div className="brutalist-card p-5 text-center flex flex-col justify-center gap-3">
            <p className="text-4xl">{result.pts >= 150 ? '🔥' : result.pts >= 80 ? '😎' : '👍'}</p>
            <p className="text-3xl font-black text-primary">+{result.pts} pts</p>
            <p className="text-navy/50 font-bold uppercase text-xs">Scene: "{scene}"</p>
            {result.score != null ? (
              <div className="border-2 border-navy p-3 bg-highlight/20 text-left">
                <p className="text-[10px] font-black text-navy/50 uppercase">Judge: {result.score}/100 (+{result.base})</p>
                {result.comment && <p className="text-sm text-navy font-medium">{result.comment}</p>}
                {result.bonus > 0 && <p className="text-xs font-black text-navy mt-1 uppercase">Short and clear: +{result.bonus}</p>}
              </div>
            ) : (
              <p className="text-xs text-navy/50 font-bold uppercase">Judge unavailable, flat {FALLBACK_POINTS} pts</p>
            )}
            <button onClick={handleNext} className="btn-brutalist bg-navy text-white text-sm">
              {round >= MAX_ROUNDS ? 'See final score' : 'Next round'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SceneCard({ scene, compact }) {
  return (
    <div className={`brutalist-card text-center ${compact ? 'p-3' : 'p-4'}`}>
      <p className="text-[10px] font-black text-navy/40 uppercase mb-1">The scene</p>
      <p className={`${compact ? 'text-base' : 'text-lg'} font-black text-navy uppercase`}>"{scene}"</p>
    </div>
  )
}

function EmojiComposer({ initial = [], onSubmit, busy = false, submitLabel = 'Generate' }) {
  const [list, setList] = useState(initial)
  const [open, setOpen] = useState(0)

  const add = (e) => setList((l) => (l.length >= MAX_EMOJIS ? l : [...l, e]))

  return (
    <div className="flex flex-col gap-4">
      <div className="brutalist-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black text-navy/40 uppercase">Your emojis ({list.length}/{MAX_EMOJIS})</p>
          <div className="flex gap-2">
            <button onClick={() => setList((l) => l.slice(0, -1))} disabled={list.length === 0 || busy}
              className="px-2 py-1 text-[10px] font-black uppercase text-navy/50 hover:text-navy disabled:opacity-30" style={{ border: '1px solid #1A1A2E44' }}>
              Undo
            </button>
            <button onClick={() => setList([])} disabled={list.length === 0 || busy}
              className="px-2 py-1 text-[10px] font-black uppercase text-navy/50 hover:text-navy disabled:opacity-30" style={{ border: '1px solid #1A1A2E44' }}>
              Clear
            </button>
          </div>
        </div>
        <div className="min-h-[60px] p-3 flex flex-wrap gap-1 items-start" style={{ border: `3px solid ${COLOR}`, background: '#FFFBEB' }} data-testid="emoji-sequence">
          {list.length === 0 ? (
            <span className="text-sm text-navy/30 font-medium">Tap emojis below...</span>
          ) : (
            list.map((e, i) => <span key={i} className="text-2xl">{e}</span>)
          )}
        </div>
      </div>

      <div className="brutalist-card p-3 flex flex-col gap-1">
        {EMOJI_CATEGORIES.map((cat, ci) => (
          <div key={cat.label}>
            <button onClick={() => setOpen(open === ci ? null : ci)}
              className="w-full text-left px-2 py-2 text-[11px] font-black text-navy/60 uppercase flex items-center justify-between hover:bg-gray-50"
              style={{ borderBottom: '1px solid #1A1A2E11' }}>
              {cat.label}
              <span className="text-navy/30">{open === ci ? '▼' : '▶'}</span>
            </button>
            {open === ci && (
              <div className="flex flex-wrap gap-1 p-2">
                {cat.emojis.map((emoji) => (
                  <button key={emoji} onClick={() => add(emoji)} disabled={list.length >= MAX_EMOJIS || busy}
                    className="w-10 h-10 text-xl flex items-center justify-center hover:bg-amber-100 transition-colors rounded disabled:opacity-30"
                    style={{ border: '1px solid #1A1A2E22' }} aria-label={`Add ${emoji}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => onSubmit(list)} disabled={list.length === 0 || busy}
        className="btn-brutalist text-navy text-sm disabled:opacity-40" style={{ background: COLOR }}>
        {busy ? 'Working...' : `${submitLabel} from ${list.length} emoji${list.length === 1 ? '' : 's'}`}
      </button>
    </div>
  )
}

// --------------------------------------------------------------- party ----

function EmojiParty({ gameId }) {
  return (
    <SubmitVoteParty
      gameId={gameId}
      title="Emoji Prompt party"
      color={COLOR}
      rounds={3}
      submitSeconds={120}
      voteSeconds={40}
      intro="The host picks a scene each round. Everyone describes it with emojis on their own phone, the AI draws each one, then everyone votes for the best picture (not their own). +100 per vote, plus a small bonus from the AI judge."
      pickWaitLabel="The host is picking a scene..."
      renderPick={(props) => <ScenePick key={props.round} {...props} />}
      renderChallenge={(c, { compact }) => <SceneCard scene={c?.scene} compact={compact} />}
      renderSubmit={(props) => <PartyEmojiSubmit {...props} />}
      renderEntry={(e) => (
        <div className="flex flex-col gap-2">
          {e.imageUrl && (
            <div style={{ border: '2px solid #1A1A2E', overflow: 'hidden' }}>
              <GameImage src={e.imageUrl} alt="Emoji art" className="w-full object-cover" />
            </div>
          )}
          <p className="text-xl leading-relaxed break-words">{e.text}</p>
        </div>
      )}
    />
  )
}

function ScenePick({ round, onPick }) {
  const [options, setOptions] = useState(() => shuffle(SCENES).slice(0, 3))
  const [custom, setCustom] = useState('')

  return (
    <div className="brutalist-card p-5 flex flex-col gap-3">
      <h3 className="font-black text-navy uppercase text-center">Round {round}: pick a scene</h3>
      <p className="text-xs text-navy/50 font-medium text-center">Everyone will describe it with emojis only.</p>
      {options.map((sc) => (
        <button key={sc} onClick={() => onPick({ scene: sc })} className="btn-brutalist bg-white text-navy text-sm text-left">
          {sc}
        </button>
      ))}
      <button onClick={() => setOptions(shuffle(SCENES).slice(0, 3))} className="text-xs font-black text-navy/50 hover:text-navy uppercase">
        Shuffle scenes
      </button>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (custom.trim()) onPick({ scene: custom.trim().slice(0, 80) }) }}>
        <input value={custom} onChange={(e) => setCustom(e.target.value.slice(0, 80))} placeholder="Or write your own scene"
          className="flex-1 min-w-0 px-3 py-2 border-2 border-navy text-navy text-sm font-medium focus:outline-none" />
        <button type="submit" disabled={!custom.trim()} className="btn-brutalist text-navy text-xs disabled:opacity-40" style={{ background: COLOR }}>Use</button>
      </form>
    </div>
  )
}

function PartyEmojiSubmit({ challenge, onSubmit }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [last, setLast] = useState([])
  const alive = useAlive()

  const submit = async (list) => {
    setBusy(true)
    setError(null)
    setLast(list)
    try {
      const { emojis, imageUrl, verdict } = await playEmojis(list, challenge.scene)
      if (!alive.current) return
      onSubmit({ text: emojis, imageUrl, judgeScore: verdict.score, judgeComment: verdict.score != null ? verdict.comment : '' })
    } catch (err) {
      if (!alive.current) return
      setError(err?.message || 'Image generation failed. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <ErrorBanner message={error} />
      {busy ? (
        <div className="flex flex-col gap-2">
          <GeneratingSpinner label="Turning emojis into art..." color={COLOR} />
          <p className="text-3xl text-center break-words">{last.join(' ')}</p>
        </div>
      ) : (
        <EmojiComposer initial={last} onSubmit={submit} submitLabel="Draw and submit" />
      )}
    </div>
  )
}

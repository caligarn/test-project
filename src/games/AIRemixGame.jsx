import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { generateImage, editImage, judge } from '../lib/fal'
import { useGameRounds } from '../hooks/useGameRounds'
import { useLocalGallery } from '../hooks/useLocalGallery'
import StatsBar from '../components/game/StatsBar'
import ErrorBanner from '../components/game/ErrorBanner'
import GeneratingSpinner from '../components/game/GeneratingSpinner'
import GameImage from '../components/game/GameImage'
import GameOverCard from '../components/game/GameOverCard'

const STARTER_PROMPTS = [
  'A simple red house on a green hill',
  'A plain white cup on a wooden table',
  'A single tree in an empty field',
  'A small boat on a calm lake',
  'A cat sitting on a windowsill',
  'A lantern glowing in the dark',
  'A lone flower growing through concrete',
  'A bird perched on a fence post',
]

const TWEAK_IDEAS = ['Make it night', 'Add a dragon', 'Turn it into winter', 'Make it underwater', 'Paint it like Van Gogh', 'Add a rainbow']

const STORAGE_KEY = 'ai_arcade_remix_chains'
const CHANGES = 5
const PTS_PER_JUDGE_POINT = 1.8 // judge 0-100 -> up to 180 per change, 900 per game
const FALLBACK_PTS = 50
const CYAN = '#00D4FF'
const MAX_TEXT = 200

function pointsFor(score) {
  return score == null ? FALLBACK_PTS : Math.round(Math.max(0, Math.min(100, score)) * PTS_PER_JUDGE_POINT)
}

export default function AIRemixGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const g = useGameRounds({ gameId: game.id, username, maxRounds: CHANGES })
  const { items: savedChains, add: addSavedChain } = useLocalGallery(STORAGE_KEY, { cap: 20, mode: 'prepend' })

  const [phase, setPhase] = useState('start') // start, loading, editing, judging, remix, over
  const [steps, setSteps] = useState([]) // [{ text, url, score?, comment?, pts?, judged? }], steps[0] is the starter
  const [pendingUrl, setPendingUrl] = useState(null)
  const [draft, setDraft] = useState('')
  const [custom, setCustom] = useState('')
  const [error, setError] = useState(null)

  const start = async (starter) => {
    const prompt = starter.trim()
    if (!prompt) return
    g.restart()
    const t = g.token()
    setSteps([])
    setDraft('')
    setError(null)
    setPhase('loading')
    try {
      const url = await generateImage(prompt)
      if (g.isStale(t)) return
      setSteps([{ text: prompt, url }])
      setPhase('remix')
    } catch {
      if (g.isStale(t)) return
      setError('Could not create the starting image. Try again.')
      setPhase('start')
    }
  }

  const remix = async (e) => {
    e?.preventDefault()
    const tweak = draft.trim()
    if (!tweak || phase !== 'remix') return
    const before = steps[steps.length - 1]
    const t = g.token()
    setError(null)
    setPhase('editing')
    let url
    try {
      url = await editImage(tweak, before.url)
    } catch {
      if (g.isStale(t)) return
      setError('The edit failed. Your change is still in the box, try again.')
      setPhase('remix')
      return
    }
    if (g.isStale(t)) return
    setPendingUrl(url)
    setPhase('judging')
    const verdict = await judge('edit', { beforeUrl: before.url, imageUrl: url, text: tweak })
    if (g.isStale(t)) return
    const judged = verdict.score != null
    const pts = pointsFor(verdict.score)
    const next = [...steps, { text: tweak, url, score: verdict.score, comment: judged ? verdict.comment : '', pts, judged }]
    setSteps(next)
    setPendingUrl(null)
    setDraft('')
    g.recordScore(pts)
    g.nextRound() // saves the total once, after the last change
    if (next.length - 1 >= CHANGES) {
      addSavedChain({
        id: crypto.randomUUID(),
        steps: next.map((s) => ({ prompt: s.text, url: s.url })),
        author: username,
        score: g.totalScore + pts,
      })
      setPhase('over')
    } else {
      setPhase('remix')
    }
  }

  const reset = () => {
    g.restart()
    setSteps([])
    setDraft('')
    setError(null)
    setPhase('start')
  }

  const changesDone = Math.max(0, steps.length - 1)
  const latest = steps[steps.length - 1]
  const lastChange = changesDone > 0 ? latest : null

  const strip = steps.length > 1 && (
    <div className="text-left">
      <h3 className="font-black text-navy uppercase text-sm mb-2">Evolution</h3>
      <ol className="flex gap-3 overflow-x-auto pb-2 list-none p-0 m-0">
        {steps.map((s, i) => (
          <li key={i} className="flex-none w-32">
            <div className="relative border-2 border-navy overflow-hidden aspect-square">
              <GameImage src={s.url} alt={s.text} className="w-full h-full object-cover" />
              <span className="absolute top-1 left-1 px-1.5 py-0.5 bg-navy text-white text-[10px] font-black">
                {i === 0 ? 'START' : `#${i}`}
              </span>
              {i > 0 && (
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-highlight text-navy text-[10px] font-black border border-navy">
                  +{s.pts}
                </span>
              )}
            </div>
            <p className="text-[10px] text-navy/70 font-bold mt-1 line-clamp-2">{s.text}</p>
            {phase === 'over' && s.comment && (
              <p className="text-[10px] text-navy/50 font-medium italic mt-0.5 line-clamp-3">{s.comment}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  )

  if (phase === 'over') {
    return (
      <div className="flex flex-col gap-4">
        <GameOverCard emoji="🔄" title="Remix complete!" score={`${g.totalScore} pts`}
          subtitle={`${CHANGES} changes, from "${steps[0]?.text}" to this.`} onRestart={reset} restartLabel="New remix">
          {latest && (
            <div className="max-w-xs mx-auto border-[3px] border-navy overflow-hidden aspect-square mb-4">
              <GameImage src={latest.url} alt="Final image" className="w-full h-full object-cover" />
            </div>
          )}
          {strip}
          {steps.slice(1).some((s) => !s.judged) && (
            <p className="text-xs font-bold text-navy/50 uppercase mt-2">Judge unavailable for some changes: {FALLBACK_PTS} pts each.</p>
          )}
        </GameOverCard>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <StatsBar stats={[
        { label: 'Changes', value: `${changesDone}/${CHANGES}` },
        { label: 'Last', value: lastChange ? `+${lastChange.pts}` : '-', color: CYAN },
        { label: 'Score', value: g.totalScore, color: '#FF2D55' },
      ]} />

      <ErrorBanner message={error} onRetry={phase === 'remix' && draft.trim() ? remix : undefined} />

      {phase === 'start' && (
        <div className="brutalist-card p-5 sm:p-6 flex flex-col gap-4">
          <div className="text-center">
            <p className="text-5xl mb-3">🔄</p>
            <h3 className="font-black text-navy uppercase mb-2">Pick a starting image</h3>
            <p className="text-navy/60 text-sm font-medium">
              Then make {CHANGES} changes. The AI edits the real image each time, and the judge scores how well each change worked.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STARTER_PROMPTS.map((p) => (
              <button key={p} onClick={() => start(p)}
                className="p-3 text-left text-xs font-bold text-navy hover:bg-[#00D4FF]/10 transition-colors uppercase border-2 border-navy">
                {p}
              </button>
            ))}
          </div>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); start(custom) }}>
            <input value={custom} onChange={(e) => setCustom(e.target.value.slice(0, MAX_TEXT))} placeholder="Or write your own start..."
              aria-label="Your own starting prompt"
              className="flex-1 min-w-0 px-3 py-2 border-2 border-navy text-navy text-sm font-medium focus:outline-none focus:ring-2 focus:ring-highlight" />
            <button type="submit" disabled={!custom.trim()} className="btn-brutalist text-navy text-xs disabled:opacity-40" style={{ background: CYAN }}>
              Go
            </button>
          </form>
        </div>
      )}

      {phase === 'loading' && <GeneratingSpinner label="Creating your starting image..." color={CYAN} />}
      {phase === 'editing' && <GeneratingSpinner label={`Editing your image (change ${changesDone + 1}/${CHANGES})...`} color={CYAN} />}

      {phase === 'judging' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-[3px] border-navy overflow-hidden aspect-square">
            <GameImage eager src={pendingUrl} alt="Edited image" className="w-full h-full object-cover" />
          </div>
          <GeneratingSpinner label="The judge is looking at your change..." color={CYAN} />
        </div>
      )}

      {phase === 'remix' && latest && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-black text-navy/50 uppercase mb-2">
              {changesDone === 0 ? 'Your starting image' : `After change ${changesDone}`}
            </p>
            <div className="border-[3px] overflow-hidden aspect-square" style={{ borderColor: CYAN }}>
              <GameImage eager src={latest.url} alt="Current image" className="w-full h-full object-cover" />
            </div>
            <p className="text-xs text-navy/60 font-medium mt-1">"{latest.text}"</p>
          </div>
          <div className="flex flex-col gap-3">
            {lastChange && (
              <div className="p-3 border-2 border-navy bg-highlight/30">
                <p className="text-[10px] font-black text-navy/50 uppercase">
                  {lastChange.judged ? `AI judge: ${lastChange.score}/100 · +${lastChange.pts} pts` : `Judge unavailable · +${lastChange.pts} pts`}
                </p>
                {lastChange.comment && <p className="text-sm font-bold text-navy">{lastChange.comment}</p>}
              </div>
            )}
            <form onSubmit={remix} className="brutalist-card p-5 flex flex-col gap-3 flex-1">
              <h3 className="font-black text-navy uppercase text-sm">Change {changesDone + 1} of {CHANGES}</h3>
              <p className="text-navy/50 text-xs font-medium">Type one change. The AI edits this exact image.</p>
              <textarea
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_TEXT))}
                placeholder="Make it night with neon lights..."
                rows={3}
                aria-label="Your change"
                className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium resize-none"
                style={{ border: `3px solid ${CYAN}` }}
              />
              <div className="flex flex-wrap gap-1.5">
                {TWEAK_IDEAS.map((idea) => (
                  <button key={idea} type="button" onClick={() => setDraft(idea)}
                    className="px-2 py-1 text-[10px] font-black uppercase text-navy border-2 border-navy hover:bg-[#00D4FF]/10">
                    {idea}
                  </button>
                ))}
              </div>
              <button type="submit" disabled={!draft.trim()}
                className="btn-brutalist justify-center text-navy text-sm disabled:opacity-40" style={{ background: CYAN }}>
                Apply change
              </button>
            </form>
          </div>
        </div>
      )}

      {phase !== 'start' && strip}

      {phase === 'start' && savedChains.length > 0 && (
        <div>
          <h3 className="font-black text-navy uppercase text-sm mb-3">Your past remixes ({savedChains.length})</h3>
          <div className="space-y-3">
            {savedChains.slice(0, 3).map((saved) => (
              <div key={saved.id} className="brutalist-card p-3">
                <div className="flex gap-2 overflow-x-auto">
                  {saved.steps.map((step, i) => (
                    <div key={i} className="flex-none w-20 h-20 border border-navy overflow-hidden">
                      <GameImage src={step.url} alt={step.prompt || ''} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-navy/50 font-medium mt-2">
                  by {saved.author} · {saved.steps.length} steps{saved.score != null ? ` · ${saved.score} pts` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

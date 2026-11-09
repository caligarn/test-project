import { useState, useRef, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usePeerRoom } from '../../hooks/usePeerRoom'
import { useMachine, useMachineView } from '../../hooks/useMachine'
import { telephonePartyMachine } from '../../machines/telephoneParty.js'
import { telephoneTurnMachine } from '../../machines/telephoneTurn.js'
import { generateImage } from '../../lib/fal'
import { addScore } from '../../lib/storage'
import { pickRandom } from '../../lib/similarity'
import RoomLobby from '../../components/game/RoomLobby'
import ErrorBanner from '../../components/game/ErrorBanner'
import GeneratingSpinner from '../../components/game/GeneratingSpinner'
import GameImage from '../../components/game/GameImage'
import ChainStrip from './ChainStrip'
import {
  STARTING_PROMPTS, MAX_TEXT, MAX_PARTY_STEPS, LOBBY_STATE, TURN_PTS, VOTE_PTS, STARTER_PTS,
  reduceParty, chainForSeat, latestImage, pendingPlayers, revealableChains, voteCounts, partyScores, canVote,
} from './logic'

const PINK = '#D946EF'

export default function TelephoneParty({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'
  const setSharedRef = useRef(null)
  const room = usePeerRoom({
    gameId: game.id,
    initialState: LOBBY_STATE,
    onAction: (action, fromId, { players }) => {
      setSharedRef.current?.((prev) => reduceParty(prev, action, fromId, players))
    },
  })
  useEffect(() => {
    setSharedRef.current = room.setShared
  }, [room.setShared])

  const s = room.state || LOBBY_STATE
  // The shared phase is moved by the host's reducer through telephonePartyMachine.
  const machineAttrs = useMachineView(telephonePartyMachine, s.phase).attrs
  const players = room.players
  const nameOf = (id) => {
    const p = players.find((x) => x.id === id)
    return p ? `${p.avatar || ''} ${p.name}`.trim() : 'Player'
  }

  // Save my party total once per finished game.
  const scoredRef = useRef(null)
  const inGame = Array.isArray(s.order) && s.order.includes(room.myId)
  const myTotal = s.phase === 'done' && inGame ? partyScores(s)[room.myId].total : null
  const scoreKey = `${room.code}-${s.gameNo}`
  useEffect(() => {
    if (myTotal == null || scoredRef.current === scoreKey) return
    scoredRef.current = scoreKey
    addScore(game.id, username, myTotal, { mode: 'party', players: s.order.length })
  }, [myTotal, scoreKey, game.id, username, s.order])

  if (room.status !== 'open' || s.phase === 'lobby') {
    return (
      <div {...machineAttrs}>
        <RoomLobby room={room} title="Telephone party" minPlayers={2} startLabel="Start telephone"
          onStart={() => room.dispatch({ type: 'start' })}>
          <div className="brutalist-card p-4">
            <p className="text-xs font-black text-navy/50 uppercase mb-1">How it works</p>
            <p className="text-sm text-navy/70 font-medium">
              Everyone writes a secret starting prompt. Each step, the chains move to the next player, who sees only the latest image and describes it.
              Up to {MAX_PARTY_STEPS} steps. At the end you see how every chain drifted and vote for the funniest one.
            </p>
          </div>
        </RoomLobby>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4" {...machineAttrs}>
      <div className="brutalist-card p-3 flex items-center justify-between gap-3">
        <p className="text-xs font-black text-navy uppercase min-w-0 truncate">
          Room {room.code}
          {s.phase === 'play' && <span className="text-navy/50"> · Step {s.step + 1}/{s.steps}</span>}
        </p>
        <button onClick={room.leave} className="inline-flex items-center gap-1 text-xs font-black text-navy/50 hover:text-danger uppercase shrink-0">
          <LogOut className="w-3.5 h-3.5" /> Leave
        </button>
      </div>

      {s.phase === 'play' && <PlayPhase room={room} s={s} nameOf={nameOf} />}
      {s.phase === 'reveal' && <RevealPhase room={room} s={s} nameOf={nameOf} />}
      {s.phase === 'vote' && <VotePhase room={room} s={s} nameOf={nameOf} />}
      {s.phase === 'done' && <DonePhase room={room} s={s} nameOf={nameOf} />}
    </div>
  )
}

// What I see during play is derived from the shared state: watching (joined
// late), my turn (TurnPanel, with its own local machine), or waiting (played).
function PlayPhase({ room, s, nameOf }) {
  const n = s.order.length
  const seat = s.order.indexOf(room.myId)
  const pending = pendingPlayers(s)
  const chainIdx = seat >= 0 ? chainForSeat(seat, s.step, n) : -1
  const chain = chainIdx >= 0 ? s.chains[chainIdx] : null
  const mine = chain ? chain.entries[s.step] : null
  const othersPending = pending.filter((id) => id !== room.myId)

  return (
    <>
      <div className="brutalist-card p-3">
        <p className="text-[10px] font-black text-navy/50 uppercase mb-2">
          {s.step === 0 ? 'Writing starting prompts' : `Step ${s.step + 1} of ${s.steps}: describing images`}
        </p>
        <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
          {s.order.map((id) => {
            const waiting = pending.includes(id)
            const gone = !room.players.find((p) => p.id === id)?.connected
            return (
              <li key={id} className={`px-2 py-1 border-2 border-navy text-xs font-bold ${waiting ? 'bg-white text-navy' : 'bg-accent text-navy'} ${gone ? 'opacity-40 line-through' : ''}`}>
                {waiting ? '✏️' : '✓'} {nameOf(id)}
              </li>
            )
          })}
        </ul>
      </div>

      {seat < 0 && (
        <div className="brutalist-card p-6 text-center">
          <p className="font-black text-navy uppercase mb-1">Game in progress</p>
          <p className="text-sm text-navy/60 font-medium">You joined after the start. Stay here to watch the reveal.</p>
        </div>
      )}

      {chain && !mine && (
        <TurnPanel
          key={`${s.gameNo}-${s.step}`}
          step={s.step}
          imageUrl={s.step > 0 ? latestImage(chain) : null}
          onSubmit={(text, imageUrl) => room.dispatch({ type: 'submit', step: s.step, chain: chainIdx, text, imageUrl })}
        />
      )}

      {chain && mine && (
        <div className="brutalist-card p-6 text-center">
          <p className="text-4xl mb-2">{mine.skipped ? '⏭️' : '📞'}</p>
          <p className="font-black text-navy uppercase mb-1">{mine.skipped ? 'Your turn was skipped' : 'Sent!'}</p>
          <p className="text-sm text-navy/60 font-medium">
            {othersPending.length > 0
              ? `Waiting for ${othersPending.map(nameOf).join(', ')}...`
              : 'Moving on...'}
          </p>
        </div>
      )}

      {room.isHost && othersPending.length > 0 && (mine || seat < 0) && (
        <button onClick={() => room.dispatch({ type: 'skipPending' })}
          className="btn-brutalist justify-center bg-white text-navy text-xs">
          Skip players still writing
        </button>
      )}
    </>
  )
}

function TurnPanel({ step, imageUrl, onSubmit }) {
  const [draft, setDraft] = useState('')
  const flow = useMachine(telephoneTurnMachine) // see src/machines/telephoneTurn.js
  const [error, setError] = useState(null)
  const aliveRef = useRef(true)
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
    }
  }, [])

  const submit = async (e) => {
    e?.preventDefault()
    const text = draft.trim()
    // Only from edit: a double tap or Enter during drawing is ignored.
    if (!text || !flow.send('SUBMIT')) return
    setError(null)
    try {
      const url = await generateImage(text)
      if (!aliveRef.current || !flow.send('DRAWN')) return
      onSubmit(text, url)
    } catch {
      if (!aliveRef.current || !flow.send('DRAW_FAILED')) return
      setError('Could not draw that. Your text is still here, try again.')
    }
  }

  if (flow.is('drawing', 'sent')) {
    return (
      <div {...flow.attrs}>
        <GeneratingSpinner color={PINK} label={flow.is('drawing') ? 'Drawing your words...' : 'Sending...'} />
      </div>
    )
  }

  const first = step === 0
  return (
    <div className="flex flex-col gap-3" {...flow.attrs}>
      <ErrorBanner message={error} onRetry={draft.trim() ? submit : undefined} />
      <div className={`grid grid-cols-1 gap-4 ${first ? '' : 'md:grid-cols-2'}`}>
        {!first && (
          <div>
            <p className="text-[10px] font-black text-navy/50 uppercase mb-2">What do you see?</p>
            <div className="border-[3px] border-navy overflow-hidden aspect-square">
              <GameImage eager src={imageUrl} alt="Describe this image" className="w-full h-full object-cover" />
            </div>
          </div>
        )}
        <form onSubmit={submit} className="brutalist-card p-5 flex flex-col gap-3">
          <h3 className="font-black text-navy uppercase text-sm">{first ? 'Write a secret starting prompt' : 'Describe this image'}</h3>
          <p className="text-navy/50 text-xs font-medium">
            {first
              ? 'Something fun to draw. Nobody else sees your words until the end.'
              : 'Say what you see. Your words become the next image in this chain.'}
          </p>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_TEXT))}
            placeholder={first ? 'A giraffe stuck in a tiny elevator...' : 'A dragon sleeping on golden coins...'}
            rows={3}
            aria-label={first ? 'Starting prompt' : 'Your description'}
            className="w-full px-4 py-3 text-navy text-sm focus:outline-none font-medium resize-none"
            style={{ border: `3px solid ${PINK}` }}
          />
          <div className="flex gap-2">
            {first && (
              <button type="button" onClick={() => setDraft(pickRandom(STARTING_PROMPTS, [draft]))}
                className="btn-brutalist justify-center bg-highlight text-navy text-xs flex-1">
                🎲 Random idea
              </button>
            )}
            <button type="submit" disabled={!draft.trim()}
              className="btn-brutalist justify-center text-white text-xs flex-1 disabled:opacity-40" style={{ background: PINK }}>
              {first ? 'Draw it' : 'Draw and pass on'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function chainCards(chain, nameOf) {
  return chain.entries.map((e, k) => ({
    label: k === 0 ? `Start: ${nameOf(e.by)}` : nameOf(e.by),
    text: e.text,
    imageUrl: e.imageUrl,
    skipped: e.skipped,
  }))
}

function RevealPhase({ room, s, nameOf }) {
  const list = revealableChains(s)
  const pos = Math.min(s.revealPos || 0, Math.max(0, list.length - 1))
  const chain = s.chains[list[pos]]
  const last = pos >= list.length - 1

  return (
    <div className="flex flex-col gap-4">
      <div className="brutalist-card p-4 text-center">
        <p className="text-[10px] font-black text-navy/50 uppercase">Chain {pos + 1} of {list.length}</p>
        <h3 className="font-black text-navy uppercase">Started by {chain ? nameOf(chain.starter) : '?'}</h3>
      </div>
      {chain ? <ChainStrip cards={chainCards(chain, nameOf)} /> : <p className="text-sm text-navy/60">No chains to show.</p>}
      {room.isHost ? (
        <div className="grid grid-cols-2 gap-3">
          <button disabled={pos === 0} onClick={() => room.dispatch({ type: 'revealPos', pos: pos - 1 })}
            className="btn-brutalist justify-center bg-white text-navy text-sm disabled:opacity-40">
            Back
          </button>
          {last ? (
            <button onClick={() => room.dispatch({ type: 'startVote' })} className="btn-brutalist justify-center bg-accent text-navy text-sm">
              Vote time
            </button>
          ) : (
            <button onClick={() => room.dispatch({ type: 'revealPos', pos: pos + 1 })} className="btn-brutalist justify-center bg-accent text-navy text-sm">
              Next chain
            </button>
          )}
        </div>
      ) : (
        <p className="text-center text-xs font-black text-navy/50 uppercase">The host shows the next chain</p>
      )}
    </div>
  )
}

function VotePhase({ room, s, nameOf }) {
  const list = revealableChains(s)
  const myVote = s.votes?.[room.myId]
  const inGame = s.order.includes(room.myId)
  const voters = s.order.filter((id) => room.players.find((p) => p.id === id)?.connected && canVote(s, id))
  const voted = voters.filter((id) => s.votes?.[id] != null).length

  return (
    <div className="flex flex-col gap-4">
      <div className="brutalist-card p-4 text-center">
        <h3 className="font-black text-navy uppercase">Vote for the funniest chain</h3>
        <p className="text-xs text-navy/60 font-medium">
          Every vote gives +{VOTE_PTS} to everyone who played in that chain. You cannot vote for the chain you started. {voted}/{voters.length} voted.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {list.map((i) => {
          const c = s.chains[i]
          const own = c.starter === room.myId
          const picked = myVote === i
          const firstImg = c.entries[0]?.imageUrl
          const lastImg = latestImage(c)
          return (
            <button key={i} disabled={!inGame || own} onClick={() => room.dispatch({ type: 'vote', chain: i })}
              className={`brutalist-card p-3 text-left flex flex-col gap-2 disabled:opacity-50 ${picked ? 'bg-accent' : ''}`}>
              <div className="grid grid-cols-2 gap-2">
                <div className="border-2 border-navy overflow-hidden aspect-square">
                  <GameImage src={firstImg} alt="First image" className="w-full h-full object-cover" />
                </div>
                <div className="border-2 border-navy overflow-hidden aspect-square">
                  <GameImage src={lastImg} alt="Last image" className="w-full h-full object-cover" />
                </div>
              </div>
              <p className="text-xs font-black text-navy uppercase">
                {picked ? '✓ Your vote · ' : ''}Started by {nameOf(c.starter)}{own ? ' (yours)' : ''}
              </p>
            </button>
          )
        })}
      </div>
      {room.isHost && (
        <button onClick={() => room.dispatch({ type: 'finish' })} className="btn-brutalist justify-center bg-navy text-white text-sm">
          Show scores
        </button>
      )}
    </div>
  )
}

function DonePhase({ room, s, nameOf }) {
  const scores = partyScores(s)
  const counts = voteCounts(s)
  const ranked = [...s.order].sort((a, b) => scores[b].total - scores[a].total)
  const list = revealableChains(s)
  const best = list.reduce((acc, i) => (acc == null || counts[i] > counts[acc] ? i : acc), null)
  const bestChain = best != null && counts[best] > 0 ? s.chains[best] : null

  return (
    <div className="flex flex-col gap-4">
      <div className="brutalist-card p-5">
        <p className="text-4xl text-center mb-2">🏆</p>
        <h3 className="font-black text-navy uppercase text-center mb-3">Scores</h3>
        <ol className="flex flex-col gap-2 list-none p-0 m-0">
          {ranked.map((id, k) => {
            const sc = scores[id]
            return (
              <li key={id} className={`p-3 border-2 border-navy flex items-center justify-between gap-3 ${id === room.myId ? 'bg-highlight/40' : 'bg-white'}`}>
                <div className="min-w-0">
                  <p className="text-sm font-black text-navy truncate">{k + 1}. {nameOf(id)}{id === room.myId ? ' (you)' : ''}</p>
                  <p className="text-[10px] font-bold text-navy/50 uppercase">
                    {sc.turns} turn{sc.turns === 1 ? '' : 's'} +{sc.turnPts} · votes +{sc.votePts} · starter +{sc.starterPts}
                  </p>
                </div>
                <p className="text-xl font-black text-primary shrink-0">{sc.total}</p>
              </li>
            )
          })}
        </ol>
        <p className="text-[10px] text-navy/50 font-medium mt-3">
          {TURN_PTS} per turn played, {VOTE_PTS} per vote on a chain you played in, {STARTER_PTS} more per vote on the chain you started.
        </p>
      </div>

      {bestChain && (
        <>
          <h3 className="font-black text-navy uppercase text-sm">
            Funniest chain: started by {nameOf(bestChain.starter)} ({counts[best]} vote{counts[best] === 1 ? '' : 's'})
          </h3>
          <ChainStrip cards={chainCards(bestChain, nameOf)} />
        </>
      )}

      {room.isHost ? (
        <button onClick={() => room.dispatch({ type: 'newGame' })} className="btn-brutalist justify-center bg-accent text-navy text-sm">
          Play again
        </button>
      ) : (
        <p className="text-center text-xs font-black text-navy/50 uppercase">Waiting for the host to start a new game</p>
      )}
    </div>
  )
}

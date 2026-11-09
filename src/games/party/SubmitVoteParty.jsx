import { useState, useEffect, useRef, useCallback } from 'react'
import { LogOut } from 'lucide-react'
import { usePeerRoom } from '../../hooks/usePeerRoom'
import { useMachineView } from '../../hooks/useMachine'
import RoomLobby from '../../components/game/RoomLobby'
import { addScore } from '../../lib/storage'
import { gameLimits } from '../../lib/gameLimits'
import { useAuth } from '../../context/AuthContext'
import { POINTS_PER_VOTE, MAX_JUDGE_BONUS, freshSecret, initialPartyState, applyPartyAction, partyMachine, standings } from './partyLogic'

const MEDALS = ['🥇', '🥈', '🥉']

function newEntryId() {
  return 'e' + Math.random().toString(36).slice(2, 12)
}

function useSecondsLeft(deadline, seconds) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!deadline) return undefined
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [deadline])
  if (!deadline) return null
  return Math.max(0, Math.min(seconds, Math.ceil((deadline - now) / 1000)))
}

/**
 * Shared "submit and vote" party engine (Dream Caption, Emoji Prompt).
 *
 * Per round: the host picks the challenge, everyone submits on their own
 * device, then everyone votes for one entry that is not their own. +100 per
 * vote received, plus a small judge bonus (0-30) from the AI judge that ran
 * on the submitter's device. After the last round each player posts their
 * own total once with addScore.
 *
 * The game supplies the parts that differ:
 *   renderPick({ round, onPick })        host only: choose the challenge, then onPick(challenge)
 *   renderChallenge(challenge, { compact })
 *   renderSubmit({ challenge, onSubmit }) composer: makes its AI calls, then onSubmit({ text, imageUrl?, judgeScore, judgeComment })
 *   renderEntry(entry)                   one entry: { text, imageUrl? }
 */
export default function SubmitVoteParty({
  gameId,
  title = 'Party mode',
  color = '#8B5CF6',
  rounds = 3,
  submitSeconds = 90,
  voteSeconds = 40,
  intro,
  pickWaitLabel = 'The host is picking the challenge...',
  renderPick,
  renderChallenge,
  renderSubmit,
  renderEntry,
}) {
  const { user } = useAuth()
  const maxScore = gameLimits(gameId)?.maxScore || 1000
  const secretRef = useRef(freshSecret())
  const roomRef = useRef(null)

  // Host only: the pure reducer in partyLogic.js decides; the phase moves
  // through partyMachine (src/machines/submitVoteParty.js).
  const onAction = useCallback(
    (action, fromId, { players, state }) => {
      const room = roomRef.current
      if (!room) return
      const next = applyPartyAction(state, secretRef.current, action, { fromId, players, now: Date.now(), submitSeconds, voteSeconds })
      secretRef.current = next.secret
      if (next.state !== state) room.setShared(next.state)
    },
    [submitSeconds, voteSeconds]
  )

  const room = usePeerRoom({ gameId, initialState: initialPartyState(rounds), onAction })
  useEffect(() => {
    roomRef.current = room
  })

  const s = room.state || initialPartyState(rounds)
  const key = `${s.game}:${s.round}`
  const [mine, setMine] = useState({}) // round key -> my entry id
  const [myVotes, setMyVotes] = useState({}) // round key -> entry id I voted for
  const postedRef = useRef({}) // game number -> true
  const secondsLeft = useSecondsLeft(s.phase === 'submit' || s.phase === 'vote' ? s.deadline : null, s.seconds)

  // Host: end the phase when the timer runs out.
  const { isHost, dispatch } = room
  useEffect(() => {
    if (!isHost || !s.deadline || (s.phase !== 'submit' && s.phase !== 'vote')) return undefined
    const t = setTimeout(() => dispatch({ type: '$timeout', phase: s.phase, round: s.round }), Math.max(0, s.deadline - Date.now()) + 250)
    return () => clearTimeout(t)
  }, [isHost, dispatch, s.deadline, s.phase, s.round])

  // Everyone: post my own total once when the game ends.
  const myTotal = s.scores?.[room.myId]
  const finalGame = s.phase === 'final' && myTotal != null ? s.game : null
  const playerCount = Object.keys(s.scores || {}).length
  useEffect(() => {
    if (finalGame == null || postedRef.current[finalGame]) return
    postedRef.current[finalGame] = true
    addScore(gameId, user?.username || 'guest', Math.min(maxScore, myTotal), { mode: 'party', rounds, players: playerCount })
  }, [finalGame, gameId, user, maxScore, myTotal, rounds, playerCount])

  const onSubmit = useCallback(
    (entry) => {
      const id = newEntryId()
      setMine((m) => ({ ...m, [key]: id }))
      dispatch({ type: 'submit', round: s.round, entry: { ...entry, id } })
    },
    [dispatch, key, s.round]
  )

  const vote = (entryId) => {
    setMyVotes((v) => ({ ...v, [key]: entryId }))
    dispatch({ type: 'vote', round: s.round, entryId })
  }

  // Every device shows the host's phase. Outside an open room it is the lobby.
  const inLobby = room.status !== 'open' || s.phase === 'lobby'
  const partyAttrs = useMachineView(partyMachine, inLobby ? partyMachine.initial : s.phase).attrs

  if (inLobby) {
    return (
      <div {...partyAttrs}>
        <RoomLobby room={room} title={title} minPlayers={2} startLabel={`Start ${rounds} rounds`} onStart={() => dispatch({ type: 'start' })}>
          {intro && <div className="brutalist-card p-4 text-sm text-navy/70 font-medium">{intro}</div>}
        </RoomLobby>
      </div>
    )
  }

  const connected = room.players.filter((p) => p.connected)
  const nameOf = (id) => room.players.find((p) => p.id === id)
  const myEntryId = mine[key]
  const iSubmitted = s.submitted.includes(room.myId)
  const iVoted = s.voted.includes(room.myId) || !!myVotes[key]
  // My own step inside the shared phase. Derived, not a machine: it is the
  // host's lists plus what this device already sent this round.
  const myStep = s.phase === 'submit' ? (iSubmitted || myEntryId ? 'submitted' : 'composing')
    : s.phase === 'vote' ? (iVoted ? 'voted' : 'voting')
      : undefined
  const board = standings(s.scores, room.players)
  const roundLabel = s.phase === 'final' ? 'Final' : `Round ${s.round}/${s.rounds}`

  const statusOf = (p) => {
    if (s.phase === 'submit') return s.submitted.includes(p.id) ? '✓' : '⏳'
    if (s.phase === 'vote') return s.voted.includes(p.id) ? '✓' : '⏳'
    return null
  }

  return (
    <div className="flex flex-col gap-4" {...partyAttrs} data-step={myStep}>
      {/* Room bar */}
      <div className="brutalist-card p-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-xs font-black text-navy/50 uppercase">Room <span className="text-navy tracking-widest">{room.code}</span></span>
        <span className="text-xs font-black uppercase" style={{ color }}>{roundLabel}</span>
        {secondsLeft != null && (
          <span className={`text-xs font-black uppercase ${secondsLeft <= 10 ? 'text-danger' : 'text-navy'}`} data-testid="party-timer">{secondsLeft}s left</span>
        )}
        <button onClick={room.leave} className="ml-auto inline-flex items-center gap-1 text-xs font-black text-navy/50 hover:text-danger uppercase">
          <LogOut className="w-3.5 h-3.5" /> Leave
        </button>
        <ul className="w-full flex flex-wrap gap-1.5">
          {room.players.map((p) => (
            <li key={p.id} className={`px-2 py-1 border-2 border-navy text-xs font-bold ${p.connected ? 'bg-white text-navy' : 'bg-navy/5 text-navy/40 line-through'}`}>
              {p.avatar} {p.name}{p.id === room.myId ? ' (you)' : ''} {p.connected && statusOf(p)}
            </li>
          ))}
        </ul>
      </div>

      {s.phase === 'pick' && (room.isHost ? (
        renderPick({ round: s.round, onPick: (challenge) => dispatch({ type: 'pick', challenge }) })
      ) : (
        <div className="brutalist-card p-8 text-center">
          <p className="text-4xl mb-3">⏳</p>
          <p className="text-sm font-black text-navy/60 uppercase">{pickWaitLabel}</p>
        </div>
      ))}

      {s.phase === 'submit' && (
        <>
          {renderChallenge(s.challenge, { compact: false })}
          {myStep === 'submitted' ? (
            <div className="brutalist-card p-6 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="font-black text-navy uppercase text-sm">Submitted!</p>
              <p className="text-xs text-navy/50 font-bold uppercase mt-1">
                Waiting for others ({s.submitted.length}/{connected.length})
              </p>
            </div>
          ) : (
            renderSubmit({ challenge: s.challenge, onSubmit })
          )}
          {room.isHost && (
            <button onClick={() => dispatch({ type: 'advance' })} className="btn-brutalist bg-white text-navy text-xs">
              Start voting now
            </button>
          )}
        </>
      )}

      {s.phase === 'vote' && (
        <>
          {renderChallenge(s.challenge, { compact: true })}
          <div className="brutalist-card p-3 text-center">
            <p className="font-black text-navy uppercase text-sm">
              {iVoted ? `Vote in! Waiting for others (${s.voted.length})` : 'Vote for your favorite (not your own)'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {s.entries.map((e) => {
              const isMine = e.id === myEntryId
              const picked = myVotes[key] === e.id
              return (
                <div key={e.id} className="brutalist-card p-3 flex flex-col gap-2" style={picked ? { outline: `4px solid ${color}` } : undefined}>
                  {renderEntry(e)}
                  {isMine ? (
                    <p className="text-center text-xs font-black text-navy/40 uppercase py-2">Yours</p>
                  ) : (
                    <button onClick={() => vote(e.id)} disabled={iVoted}
                      className="btn-brutalist text-xs text-white disabled:opacity-40" style={{ background: color }}>
                      {picked ? 'Voted' : 'Vote'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {room.isHost && (
            <button onClick={() => dispatch({ type: 'advance' })} className="btn-brutalist bg-white text-navy text-xs">
              Show results now
            </button>
          )}
        </>
      )}

      {s.phase === 'results' && (
        <>
          {renderChallenge(s.challenge, { compact: true })}
          <div className="brutalist-card p-4">
            <h3 className="font-black text-navy uppercase text-sm mb-3">Round {s.round} results</h3>
            {s.results.length === 0 && <p className="text-sm text-navy/50 font-medium">Nobody submitted this round.</p>}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {s.results.map((r, i) => {
                const p = nameOf(r.playerId)
                return (
                  <div key={r.id} className="border-2 border-navy p-3 flex flex-col gap-2 bg-white">
                    {renderEntry(r)}
                    <p className="text-sm font-black text-navy">
                      {i === 0 && r.points > 0 ? '👑 ' : ''}{p?.avatar || '🙂'} {p?.name || 'Player'}{r.playerId === room.myId ? ' (you)' : ''}
                    </p>
                    <p className="text-xs font-bold text-navy/60 uppercase">
                      {r.votes} vote{r.votes === 1 ? '' : 's'} (+{r.votes * POINTS_PER_VOTE}){r.bonus ? `, judge +${r.bonus}` : ''}
                      <span className="text-primary"> = +{r.points}</span>
                    </p>
                    {r.judgeComment && <p className="text-xs text-navy/60 italic">Judge: {r.judgeComment}</p>}
                  </div>
                )
              })}
            </div>
          </div>
          <Standings board={board} myId={room.myId} />
          {room.isHost ? (
            <button onClick={() => dispatch({ type: 'advance' })} className="btn-brutalist bg-accent text-navy text-sm">
              {s.round >= s.rounds ? 'Final standings' : 'Next round'}
            </button>
          ) : (
            <p className="text-center text-sm font-black text-navy/50 uppercase">Waiting for the host...</p>
          )}
        </>
      )}

      {s.phase === 'final' && (
        <div className="brutalist-card p-6 text-center flex flex-col gap-4">
          <p className="text-5xl">🏆</p>
          <h2 className="text-2xl font-black text-navy uppercase">Final standings</h2>
          {myTotal != null && (
            <p className="text-sm font-black text-navy/60 uppercase">
              Your total: <span className="text-primary text-2xl">{Math.min(maxScore, myTotal)}</span>
            </p>
          )}
          <Standings board={board} myId={room.myId} />
          {room.isHost ? (
            <button onClick={() => dispatch({ type: 'again' })} className="btn-brutalist bg-navy text-white text-sm">Play again</button>
          ) : (
            <p className="text-center text-xs font-black text-navy/50 uppercase">The host can start a new game.</p>
          )}
        </div>
      )}

      <p className="text-[11px] text-navy/40 font-bold uppercase text-center">
        +{POINTS_PER_VOTE} per vote. Judge bonus up to +{MAX_JUDGE_BONUS}.
      </p>
    </div>
  )
}

function Standings({ board, myId }) {
  return (
    <div className="brutalist-card p-4 text-left">
      <p className="text-xs font-black text-navy/50 uppercase mb-2">Standings</p>
      <ol className="flex flex-col gap-1">
        {board.map((b, i) => (
          <li key={b.id} className={`flex items-center justify-between gap-2 px-2 py-1.5 border-2 border-navy text-sm font-bold ${b.id === myId ? 'bg-highlight/40' : 'bg-white'} ${b.connected ? 'text-navy' : 'text-navy/40'}`}>
            <span className="truncate">{MEDALS[i] || `${i + 1}.`} {b.avatar} {b.name}{b.id === myId ? ' (you)' : ''}{b.connected ? '' : ' (left)'}</span>
            <span className="font-black">{b.score}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// Pure game logic for Telephone (solo scoring and the party-mode reducer).
// No React and no browser APIs here, so it can be unit tested in Node.
// The party phase moves only through telephonePartyMachine (src/machines/telephoneParty.js).
import { telephonePartyMachine } from '../../machines/telephoneParty.js'

export const STARTING_PROMPTS = [
  'A dragon sleeping on a pile of gold coins in a cave',
  'A cat wearing a top hat having tea in a garden',
  'A treehouse in the clouds with a rope ladder',
  'A penguin surfing a giant wave at sunset',
  'A wizard casting colorful spells in a dusty library',
  'A mermaid playing electric guitar underwater',
  'A dinosaur wearing sunglasses at a pool party',
  'An owl professor teaching math in a forest classroom',
  'A fox riding a bicycle through a medieval village',
  'A cozy cabin in the woods during a heavy snowfall',
  'A raccoon DJ playing turntables at a rooftop party',
  'A robot painting a sunset at the beach with an easel',
  'A pirate ship made of candy sailing on chocolate seas',
  'A knight jousting a windmill in a sunflower field',
  'A giant octopus wrapping around a skyscraper at night',
  'A grandma skateboarding through a busy farmers market',
  'A snowman sunbathing on a tropical beach',
  'A giraffe stuck in a tiny elevator',
]

export const SOLO_STEPS = 5
export const MAX_PARTY_STEPS = 6
export const MAX_TEXT = 200
export const MAX_SCORE = 1000

// Solo: the drift judge is the main part, surviving words a smaller part.
export const DRIFT_WEIGHT = 7 // 0-100 judge score -> up to 700
export const WORD_WEIGHT = 3 // 0-100 word overlap -> up to 300

/** Solo total. driftScore is the judge's 0-100 (or null when unavailable). */
export function soloScore({ driftScore, wordScore }) {
  const judged = typeof driftScore === 'number' && Number.isFinite(driftScore)
  const driftPts = judged ? Math.round(clamp(driftScore, 0, 100) * DRIFT_WEIGHT) : 0
  const wordPts = Math.round(clamp(wordScore || 0, 0, 100) * WORD_WEIGHT)
  return { judged, driftPts, wordPts, total: Math.min(MAX_SCORE, driftPts + wordPts) }
}

// Party scoring
export const TURN_PTS = 20 // per turn you actually played
export const VOTE_PTS = 100 // per vote, to everyone who played in that chain
export const STARTER_PTS = 50 // per vote, extra for the player who started the chain

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

/** Chain i is played at `step` by the seat (i + step) mod n. */
export function assigneeSeat(chainIndex, step, n) {
  return (chainIndex + step) % n
}

/** The chain the player in `seat` plays at `step`. */
export function chainForSeat(seat, step, n) {
  return (((seat - step) % n) + n) % n
}

/** Latest image of a chain (skipped turns keep the previous image). */
export function latestImage(chain) {
  for (let i = chain.entries.length - 1; i >= 0; i--) {
    const e = chain.entries[i]
    if (e && !e.skipped && e.imageUrl) return e.imageUrl
  }
  return null
}

/** Indexes of chains that got at least one image (dropped chains are hidden). */
export function revealableChains(state) {
  return (state.chains || []).map((c, i) => (latestImage(c) ? i : -1)).filter((i) => i >= 0)
}

export const LOBBY_STATE = { phase: telephonePartyMachine.initial, gameNo: 0 }

/** Next party phase for `event`, or the same phase when the machine does not allow it. */
function nextPhase(phase, event) {
  return telephonePartyMachine.transition(phase, event) ?? phase
}

function connectedIds(players) {
  return new Set((players || []).filter((p) => p.connected).map((p) => p.id))
}

function hostIdOf(players) {
  return (players || []).find((p) => p.host)?.id
}

function cloneChains(chains) {
  return chains.map((c) => ({ ...c, entries: [...c.entries] }))
}

/** Players still to play the current step. */
export function pendingPlayers(state) {
  if (state.phase !== 'play') return []
  const n = state.order.length
  const out = []
  state.chains.forEach((c, i) => {
    if (c.entries.length <= state.step) out.push(state.order[assigneeSeat(i, state.step, n)])
  })
  return out
}

/**
 * Fill turns that cannot be played (player gone, or chain has no image yet),
 * then move on while a step is complete. Mutates `s` (a fresh copy).
 */
function advance(s, connected) {
  const n = s.order.length
  for (;;) {
    s.chains.forEach((c, i) => {
      if (c.entries.length > s.step) return
      const who = s.order[assigneeSeat(i, s.step, n)]
      if (!connected.has(who) || (s.step > 0 && !latestImage(c))) {
        c.entries.push({ by: who, skipped: true })
      }
    })
    const complete = s.chains.every((c) => c.entries.length > s.step)
    if (!complete) return s
    if (s.step + 1 >= s.steps) {
      s.phase = nextPhase(s.phase, 'ALL_PLAYED')
      s.revealPos = 0
      return s
    }
    s.step += 1
  }
}

function allVoted(s, connected) {
  const voters = s.order.filter((id) => connected.has(id) && canVote(s, id))
  return voters.length > 0 && voters.every((id) => s.votes[id] != null)
}

/** A player can vote if some revealable chain was not started by them. */
export function canVote(state, playerId) {
  return revealableChains(state).some((i) => state.chains[i].starter !== playerId)
}

/** Host-side reducer: returns the next shared state (or the same object to ignore). */
export function reduceParty(state, action, fromId, players) {
  const connected = connectedIds(players)
  const hostId = hostIdOf(players)
  const isHost = fromId === hostId
  const type = action?.type

  if (type === 'start') {
    if (!isHost || !telephonePartyMachine.can(state.phase, 'START')) return state
    const order = (players || []).filter((p) => p.connected).map((p) => p.id)
    if (order.length < 2) return state
    const s = {
      phase: nextPhase(state.phase, 'START'),
      gameNo: (state.gameNo || 0) + 1,
      order,
      steps: Math.min(order.length, MAX_PARTY_STEPS),
      step: 0,
      chains: order.map((id) => ({ starter: id, entries: [] })),
      revealPos: 0,
      votes: {},
    }
    return advance(s, connected)
  }

  if (type === 'newGame') {
    if (!isHost) return state
    return { phase: nextPhase(state.phase, 'NEW_GAME'), gameNo: state.gameNo || 0 }
  }

  if (state.phase === 'play') {
    const n = state.order.length
    if (type === 'submit') {
      const { step, chain, text, imageUrl } = action
      if (step !== state.step || !Number.isInteger(chain) || chain < 0 || chain >= n) return state
      if (state.order[assigneeSeat(chain, step, n)] !== fromId) return state
      if (state.chains[chain].entries.length !== step) return state
      if (typeof imageUrl !== 'string' || !imageUrl || imageUrl.length > 60000) return state
      const clean = String(text || '').trim().slice(0, MAX_TEXT)
      if (!clean) return state
      const s = { ...state, chains: cloneChains(state.chains) }
      s.chains[chain].entries.push({ by: fromId, text: clean, imageUrl })
      return advance(s, connected)
    }
    if (type === 'skipPending' || type === '$leave') {
      if (type === 'skipPending' && !isHost) return state
      const s = { ...state, chains: cloneChains(state.chains) }
      s.chains.forEach((c, i) => {
        const who = state.order[assigneeSeat(i, state.step, n)]
        if (c.entries.length === state.step && (type === 'skipPending' || who === action.playerId)) {
          c.entries.push({ by: who, skipped: true })
        }
      })
      return advance(s, connected)
    }
    return state
  }

  if (state.phase === 'reveal') {
    if (type === 'revealPos' && isHost) {
      const max = revealableChains(state).length - 1
      return { ...state, revealPos: clamp(Number(action.pos) || 0, 0, Math.max(0, max)) }
    }
    if (type === 'startVote' && isHost) {
      return { ...state, phase: nextPhase(state.phase, 'START_VOTE'), votes: {} }
    }
    return state
  }

  if (state.phase === 'vote') {
    if (type === 'vote') {
      const chain = action.chain
      if (!state.order.includes(fromId)) return state
      if (!revealableChains(state).includes(chain)) return state
      if (state.chains[chain].starter === fromId) return state
      const s = { ...state, votes: { ...state.votes, [fromId]: chain } }
      if (allVoted(s, connected)) s.phase = nextPhase(s.phase, 'ALL_VOTED')
      return s
    }
    if (type === 'finish' && isHost) return { ...state, phase: nextPhase(state.phase, 'FINISH') }
    if (type === '$leave') {
      if (allVoted(state, connected)) return { ...state, phase: nextPhase(state.phase, 'ALL_VOTED') }
    }
    return state
  }

  return state
}

/** Votes per chain index. */
export function voteCounts(state) {
  const counts = (state.chains || []).map(() => 0)
  for (const c of Object.values(state.votes || {})) {
    if (Number.isInteger(c) && c >= 0 && c < counts.length) counts[c] += 1
  }
  return counts
}

/** Per-player score breakdown for a finished party game. */
export function partyScores(state) {
  const counts = voteCounts(state)
  const out = {}
  for (const id of state.order || []) {
    let turns = 0
    let votePts = 0
    let starterPts = 0
    state.chains.forEach((c, i) => {
      const played = c.entries.filter((e) => e.by === id && !e.skipped).length
      turns += played
      if (played > 0) votePts += counts[i] * VOTE_PTS
      if (c.starter === id && c.entries[0] && !c.entries[0].skipped) starterPts += counts[i] * STARTER_PTS
    })
    const turnPts = turns * TURN_PTS
    out[id] = { turns, turnPts, votePts, starterPts, total: Math.min(MAX_SCORE, turnPts + votePts + starterPts) }
  }
  return out
}

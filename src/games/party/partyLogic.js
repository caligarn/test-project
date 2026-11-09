// Pure round logic for the shared "submit and vote" party engine.
// The host runs these on its copy of the shared state. Entries stay in a
// host-only `secret` object until voting starts, so nobody can peek at (or
// copy) other players' answers, and authors stay hidden until the results.
//
// The phase moves only through submitVotePartyMachine (src/machines/submitVoteParty.js):
// each step asks machine.transition(phase, EVENT) and returns the state
// unchanged when the event is not allowed in the current phase.

import { shuffle } from '../../lib/similarity'
import { submitVotePartyMachine as machine } from '../../machines/submitVoteParty.js'

export { machine as partyMachine }

export const POINTS_PER_VOTE = 100
export const MAX_JUDGE_BONUS = 30

export function freshSecret() {
  return { entries: {}, votes: {} } // entries: playerId -> entry, votes: voterId -> entryId
}

export function initialPartyState(rounds) {
  return { phase: machine.initial, game: 0, round: 0, rounds, challenge: null, deadline: null, seconds: 0, submitted: [], entries: [], voted: [], results: [], scores: {} }
}

const connectedIds = (players) => players.filter((p) => p.connected).map((p) => p.id)

export function judgeBonus(judgeScore) {
  const s = Number(judgeScore)
  if (!Number.isFinite(s)) return 0
  return Math.round((Math.max(0, Math.min(100, s)) / 100) * MAX_JUDGE_BONUS)
}

/** Keep only the fields we expect, with sane sizes. */
export function cleanEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = typeof raw.id === 'string' ? raw.id.slice(0, 24) : ''
  if (!/^[a-z0-9-]{4,24}$/i.test(id)) return null
  const text = typeof raw.text === 'string' ? raw.text.trim().slice(0, 200) : ''
  const imageUrl = typeof raw.imageUrl === 'string' && raw.imageUrl.length < 200000 ? raw.imageUrl : null
  if (!text && !imageUrl) return null
  const score = Number(raw.judgeScore)
  return {
    id,
    text,
    imageUrl,
    judgeScore: raw.judgeScore == null || !Number.isFinite(score) ? null : Math.max(0, Math.min(100, Math.round(score))),
    judgeComment: typeof raw.judgeComment === 'string' ? raw.judgeComment.slice(0, 160) : '',
  }
}

/** Lobby or final -> pick (round 1 of a new game). */
export function startGame(prev, players) {
  const phase = machine.transition(prev.phase, 'START')
  if (!phase) return prev
  const scores = {}
  for (const id of connectedIds(players)) scores[id] = 0
  return { ...initialPartyState(prev.rounds), game: (prev.game || 0) + 1, round: 1, phase, scores }
}

/** Pick -> submit with the host's challenge. */
export function startSubmit(prev, challenge, seconds, now) {
  const phase = machine.transition(prev.phase, 'PICK')
  if (!phase) return prev
  return { ...prev, phase, challenge, deadline: now + seconds * 1000, seconds, submitted: [], entries: [], voted: [], results: [] }
}

/** Submit -> vote with the shuffled entries (straight to results when nobody submitted). */
export function toVote(prev, secret, seconds, now) {
  const list = shuffle(Object.values(secret.entries)).map(({ id, text, imageUrl }) => ({ id, text, imageUrl }))
  if (list.length === 0) return toResults(prev, secret)
  const phase = machine.transition(prev.phase, 'START_VOTE')
  if (!phase) return prev
  return { ...prev, phase, entries: list, voted: [], deadline: now + seconds * 1000, seconds }
}

/** Submit or vote -> results: count votes, add points. */
export function toResults(prev, secret) {
  const phase = machine.transition(prev.phase, 'TALLY')
  if (!phase) return prev
  const counts = {}
  for (const entryId of Object.values(secret.votes)) counts[entryId] = (counts[entryId] || 0) + 1
  const scores = { ...prev.scores }
  const results = Object.entries(secret.entries).map(([playerId, e]) => {
    const votes = counts[e.id] || 0
    const bonus = judgeBonus(e.judgeScore)
    const points = votes * POINTS_PER_VOTE + bonus
    scores[playerId] = (scores[playerId] || 0) + points
    return { ...e, playerId, votes, bonus, points }
  })
  results.sort((a, b) => b.points - a.points)
  return { ...prev, phase, deadline: null, results, scores }
}

/** Results -> pick (next round) or final (after the last round). */
export function nextRound(prev) {
  const last = prev.round >= prev.rounds
  const phase = machine.transition(prev.phase, last ? 'FINISH' : 'NEXT')
  if (!phase) return prev
  if (last) return { ...prev, phase, deadline: null, challenge: null, entries: [], submitted: [], voted: [] }
  return { ...prev, phase, round: prev.round + 1, challenge: null, deadline: null, submitted: [], entries: [], voted: [], results: [] }
}

/** Players who can vote: connected, with at least one entry that is not theirs. */
export function eligibleVoters(state, secret, players) {
  const own = {}
  for (const [pid, e] of Object.entries(secret.entries)) own[pid] = e.id
  return connectedIds(players).filter((id) => state.entries.some((e) => e.id !== own[id]))
}

/** Move on early when everyone still here has submitted / voted. */
export function maybeAdvance(state, secret, players, { voteSeconds, now }) {
  if (state.phase === 'submit') {
    const ids = connectedIds(players)
    if (ids.length > 0 && ids.every((id) => state.submitted.includes(id))) {
      return maybeAdvance(toVote(state, secret, voteSeconds, now), secret, players, { voteSeconds, now })
    }
  } else if (state.phase === 'vote') {
    const voters = eligibleVoters(state, secret, players)
    if (voters.every((id) => state.voted.includes(id))) return toResults(state, secret)
  }
  return state
}

/**
 * The host's whole reducer: one room action -> { state, secret }.
 * Pure: returns the same objects when the action changes nothing (not allowed
 * now, wrong round, not from the host, a repeat), so the caller can skip the sync.
 *   ctx: { fromId, players, now, submitSeconds, voteSeconds }
 */
export function applyPartyAction(state, secret, action, { fromId, players, now, submitSeconds, voteSeconds }) {
  const same = { state, secret }
  if (!action) return same
  const fromHost = fromId === players.find((p) => p.host)?.id
  const advance = (next, sec) => maybeAdvance(next, sec, players, { voteSeconds, now })
  const fresh = (next) => (next === state ? same : { state: next, secret: freshSecret() })
  // The host ends submit or vote early ('advance'), or their timer ran out ('$timeout').
  const endStep = () => {
    if (state.phase === 'submit') return { state: advance(toVote(state, secret, voteSeconds, now), secret), secret }
    if (state.phase === 'vote') return { state: toResults(state, secret), secret }
    return same
  }

  switch (action.type) {
    case 'start':
    case 'again':
      return fromHost ? fresh(startGame(state, players)) : same
    case 'pick':
      return fromHost && action.challenge ? fresh(startSubmit(state, action.challenge, submitSeconds, now)) : same
    case 'submit': {
      if (!machine.can(state.phase, 'SUBMIT_ENTRY') || action.round !== state.round || state.submitted.includes(fromId)) return same
      const entry = cleanEntry(action.entry)
      if (!entry || Object.values(secret.entries).some((e) => e.id === entry.id)) return same
      const next = { ...secret, entries: { ...secret.entries, [fromId]: entry } }
      return {
        secret: next,
        state: advance({
          ...state,
          submitted: [...state.submitted, fromId],
          scores: fromId in state.scores ? state.scores : { ...state.scores, [fromId]: 0 },
        }, next),
      }
    }
    case 'vote': {
      if (!machine.can(state.phase, 'CAST_VOTE') || action.round !== state.round || state.voted.includes(fromId)) return same
      const target = state.entries.find((e) => e.id === action.entryId)
      if (!target || secret.entries[fromId]?.id === target.id) return same
      const next = { ...secret, votes: { ...secret.votes, [fromId]: target.id } }
      return { secret: next, state: advance({ ...state, voted: [...state.voted, fromId] }, next) }
    }
    case 'advance':
      if (!fromHost) return same
      return state.phase === 'results' ? { state: nextRound(state), secret } : endStep()
    case '$timeout':
      if (!fromHost || action.phase !== state.phase || action.round !== state.round) return same
      return endStep()
    case '$join':
      if (state.phase === 'lobby' || action.playerId in state.scores) return same
      return { state: { ...state, scores: { ...state.scores, [action.playerId]: 0 } }, secret }
    case '$leave':
      // Do not wait for players who left: move on if everyone left has acted.
      return { state: advance(state, secret), secret }
    default:
      return same
  }
}

export function standings(scores, players) {
  return Object.entries(scores || {})
    .map(([id, score]) => {
      const p = players.find((x) => x.id === id)
      return { id, score, name: p?.name || 'Player', avatar: p?.avatar || '🙂', connected: !!p?.connected }
    })
    .sort((a, b) => b.score - a.score)
}

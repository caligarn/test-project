// Pure round logic for the shared "submit and vote" party engine.
// The host runs these on its copy of the shared state. Entries stay in a
// host-only `secret` object until voting starts, so nobody can peek at (or
// copy) other players' answers, and authors stay hidden until the results.

import { shuffle } from '../../lib/similarity'

export const POINTS_PER_VOTE = 100
export const MAX_JUDGE_BONUS = 30

export function freshSecret() {
  return { entries: {}, votes: {} } // entries: playerId -> entry, votes: voterId -> entryId
}

export function initialPartyState(rounds) {
  return { phase: 'lobby', game: 0, round: 0, rounds, challenge: null, deadline: null, seconds: 0, submitted: [], entries: [], voted: [], results: [], scores: {} }
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

export function startGame(prev, players) {
  const scores = {}
  for (const id of connectedIds(players)) scores[id] = 0
  return { ...initialPartyState(prev.rounds), game: (prev.game || 0) + 1, round: 1, phase: 'pick', scores }
}

export function startSubmit(prev, challenge, seconds, now) {
  return { ...prev, phase: 'submit', challenge, deadline: now + seconds * 1000, seconds, submitted: [], entries: [], voted: [], results: [] }
}

export function toVote(prev, secret, seconds, now) {
  const list = shuffle(Object.values(secret.entries)).map(({ id, text, imageUrl }) => ({ id, text, imageUrl }))
  if (list.length === 0) return toResults(prev, secret)
  return { ...prev, phase: 'vote', entries: list, voted: [], deadline: now + seconds * 1000, seconds }
}

export function toResults(prev, secret) {
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
  return { ...prev, phase: 'results', deadline: null, results, scores }
}

export function nextRound(prev) {
  if (prev.round >= prev.rounds) return { ...prev, phase: 'final', deadline: null, challenge: null, entries: [], submitted: [], voted: [] }
  return { ...prev, phase: 'pick', round: prev.round + 1, challenge: null, deadline: null, submitted: [], entries: [], voted: [], results: [] }
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

export function standings(scores, players) {
  return Object.entries(scores || {})
    .map(([id, score]) => {
      const p = players.find((x) => x.id === id)
      return { id, score, name: p?.name || 'Player', avatar: p?.avatar || '🙂', connected: !!p?.connected }
    })
    .sort((a, b) => b.score - a.score)
}

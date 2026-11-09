import { describe, it, expect } from 'vitest'
import { reachableStates } from '../src/lib/machine.js'
import {
  partyMachine, freshSecret, initialPartyState, applyPartyAction, startGame, startSubmit, toVote, toResults, nextRound,
} from '../src/games/party/partyLogic.js'
import { submitVotePartyMachine } from '../src/machines/submitVoteParty.js'
import { partyEntryMachine } from '../src/machines/partyEntry.js'
import { dreamPickMachine } from '../src/machines/dreamPick.js'
import { dreamCaptionMachine } from '../src/machines/dreamCaption.js'
import { emojiPromptMachine } from '../src/machines/emojiPrompt.js'

const HOST = 'h'
const players = (ids = [HOST, 'a', 'b'], gone = []) =>
  ids.map((id) => ({ id, name: id, host: id === HOST, connected: !gone.includes(id) }))

/** A tiny host: applies actions and checks every phase change is a machine transition. */
function makeHost({ rounds = 2, who = players() } = {}) {
  const h = { state: initialPartyState(rounds), secret: freshSecret(), players: who, now: 1000, moves: [] }
  h.act = (fromId, action) => {
    const before = h.state
    const r = applyPartyAction(h.state, h.secret, action, { fromId, players: h.players, now: h.now, submitSeconds: 90, voteSeconds: 40 })
    if (r.state.phase !== before.phase) {
      const allowed = partyMachine.eventsFrom(before.phase).some((e) => partyMachine.transition(before.phase, e) === r.state.phase)
      expect(allowed, `${before.phase} -> ${r.state.phase}`).toBe(true)
      h.moves.push(`${before.phase}>${r.state.phase}`)
    }
    h.state = r.state
    h.secret = r.secret
    return r.state !== before
  }
  h.submit = (id, text) => h.act(id, { type: 'submit', round: h.state.round, entry: { id: 'e-' + id + h.state.round, text } })
  h.vote = (id, forPlayer) => h.act(id, { type: 'vote', round: h.state.round, entryId: 'e-' + forPlayer + h.state.round })
  return h
}

describe('party machines', () => {
  const all = [submitVotePartyMachine, partyEntryMachine, dreamPickMachine, dreamCaptionMachine, emojiPromptMachine]
  it('reach every state and have a description everywhere', () => {
    for (const m of all) {
      const r = reachableStates(m)
      expect(m.stateNames.filter((s) => !r.has(s)), m.id).toEqual([])
      for (const s of m.stateNames) expect(m.states[s].description, `${m.id}.${s}`).toBeTruthy()
      expect(m.stateNames.filter((s) => !m.states[s].final && m.eventsFrom(s).length === 0), m.id).toEqual([])
    }
  })
  it('the reducer uses the party machine', () => {
    expect(partyMachine).toBe(submitVotePartyMachine)
    expect(initialPartyState(3).phase).toBe(partyMachine.initial)
  })
})

describe('party reducer + machine', () => {
  it('plays a full game: lobby, pick, submit, vote, results, final, again', () => {
    const h = makeHost({ rounds: 2 })
    expect(h.act(HOST, { type: 'start' })).toBe(true)
    for (let round = 1; round <= 2; round++) {
      expect(h.state.phase).toBe('pick')
      h.act(HOST, { type: 'pick', challenge: { scene: 'x' } })
      expect(h.state.phase).toBe('submit')
      h.submit(HOST, 'one')
      h.submit('a', 'two')
      expect(h.state.phase).toBe('submit')
      h.submit('b', 'three') // last one in: voting opens by itself
      expect(h.state.phase).toBe('vote')
      expect(h.state.entries).toHaveLength(3)
      h.vote(HOST, 'a')
      h.vote('a', 'b')
      h.vote('b', 'a')
      expect(h.state.phase).toBe('results')
      expect(h.state.results[0].playerId).toBe('a')
      h.act(HOST, { type: 'advance' })
    }
    expect(h.state.phase).toBe('final')
    expect(h.state.scores.a).toBeGreaterThanOrEqual(400)
    h.act(HOST, { type: 'again' })
    expect(h.state).toMatchObject({ phase: 'pick', round: 1, game: 2 })
    expect(h.moves).toEqual([
      'lobby>pick', 'pick>submit', 'submit>vote', 'vote>results', 'results>pick',
      'pick>submit', 'submit>vote', 'vote>results', 'results>final', 'final>pick',
    ])
  })

  it('ignores impossible steps and keeps the same objects', () => {
    const h = makeHost()
    expect(h.act('a', { type: 'start' })).toBe(false) // not the host
    expect(h.act(HOST, { type: 'pick', challenge: { scene: 'x' } })).toBe(false) // still in the lobby
    expect(h.submit('a', 'early')).toBe(false)
    h.act(HOST, { type: 'start' })
    expect(h.act(HOST, { type: 'start' })).toBe(false) // already playing
    expect(h.act(HOST, { type: 'pick' })).toBe(false) // no challenge
    h.act(HOST, { type: 'pick', challenge: { scene: 'x' } })
    expect(h.act(HOST, { type: 'pick', challenge: { scene: 'y' } })).toBe(false) // a second pick
    expect(h.state.challenge.scene).toBe('x')
    h.submit('a', 'hi')
    expect(h.submit('a', 'again')).toBe(false) // one entry each
    expect(h.vote(HOST, 'a')).toBe(false) // no votes while submitting
    expect(h.act(HOST, { type: '$timeout', phase: 'vote', round: 1 })).toBe(false) // stale timer
    expect(h.act(HOST, { type: '$timeout', phase: 'submit', round: 9 })).toBe(false)
    expect(h.act('a', { type: 'advance' })).toBe(false)
    h.act(HOST, { type: 'advance' }) // host skips: vote with one entry
    expect(h.state.phase).toBe('vote')
    expect(h.vote('a', 'a')).toBe(false) // own entry
    expect(h.submit('b', 'late')).toBe(false) // no entries while voting
  })

  it('pure step functions refuse the wrong phase', () => {
    const lobby = initialPartyState(3)
    expect(startSubmit(lobby, { scene: 'x' }, 90, 0)).toBe(lobby)
    expect(toResults(lobby, freshSecret())).toBe(lobby)
    expect(nextRound(lobby)).toBe(lobby)
    const pick = startGame(lobby, players())
    expect(startGame(pick, players())).toBe(pick)
    expect(toVote(pick, { entries: { a: { id: 'e1', text: 't' } }, votes: {} }, 40, 0)).toBe(pick)
  })

  it('goes straight to results when nobody submitted, and on timeouts', () => {
    const h = makeHost()
    h.act(HOST, { type: 'start' })
    h.act(HOST, { type: 'pick', challenge: { scene: 'x' } })
    h.act(HOST, { type: '$timeout', phase: 'submit', round: 1 })
    expect(h.state.phase).toBe('results')
    expect(h.state.results).toEqual([])
    h.act(HOST, { type: 'advance' })
    h.act(HOST, { type: 'pick', challenge: { scene: 'y' } })
    h.submit('a', 'one')
    h.submit('b', 'two')
    h.act(HOST, { type: '$timeout', phase: 'submit', round: 2 })
    expect(h.state.phase).toBe('vote')
    h.act(HOST, { type: '$timeout', phase: 'vote', round: 2 })
    expect(h.state.phase).toBe('results')
  })

  it('does not wait for players who left', () => {
    const h = makeHost()
    h.act(HOST, { type: 'start' })
    h.act(HOST, { type: 'pick', challenge: { scene: 'x' } })
    h.submit(HOST, 'one')
    h.submit('a', 'two')
    h.players = players([HOST, 'a', 'b'], ['b'])
    h.act('b', { type: '$leave', playerId: 'b' })
    expect(h.state.phase).toBe('vote')
    h.vote(HOST, 'a')
    h.players = players([HOST, 'a', 'b'], ['a', 'b'])
    h.act('a', { type: '$leave', playerId: 'a' })
    expect(h.state.phase).toBe('results')
  })

  it('a late joiner gets a score slot outside the lobby only', () => {
    const h = makeHost()
    expect(h.act('c', { type: '$join', playerId: 'c' })).toBe(false)
    h.act(HOST, { type: 'start' })
    expect(h.act('c', { type: '$join', playerId: 'c' })).toBe(true)
    expect(h.state.scores.c).toBe(0)
    expect(h.state.phase).toBe('pick')
  })
})

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { defineMachine, reachableStates } from '../src/lib/machine.js'
import { MACHINES } from '../src/machines/index.js'
import { renderMachinesDoc } from '../scripts/stateMachinesDoc.mjs'

describe('defineMachine', () => {
  const m = defineMachine({
    id: 'demo',
    initial: 'a',
    on: { RESET: 'a' },
    states: { a: { on: { GO: 'b' } }, b: { on: { GO: { target: 'c' } } }, c: { final: true } },
  })
  it('moves only on listed events', () => {
    expect(m.transition('a', 'GO')).toBe('b')
    expect(m.transition('b', { type: 'GO' })).toBe('c')
    expect(m.transition('a', 'NOPE')).toBeNull()
    expect(m.transition('c', 'GO')).toBeNull()
  })
  it('applies global events from any state', () => {
    expect(m.transition('c', 'RESET')).toBe('a')
    expect(m.eventsFrom('a').sort()).toEqual(['GO', 'RESET'])
  })
  it('rejects broken definitions', () => {
    expect(() => defineMachine({ id: 'x', initial: 'nope', states: { a: {} } })).toThrow(/initial/)
    expect(() => defineMachine({ id: 'x', initial: 'a', states: { a: { on: { GO: 'zzz' } } } })).toThrow(/not a state/)
    expect(() => defineMachine({ id: 'x', initial: 'a', states: { a: { on: { go: 'a' } } } })).toThrow(/UPPER_SNAKE/)
  })
})

describe('every app machine', () => {
  it('has a unique id', () => {
    const ids = MACHINES.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  for (const m of MACHINES) {
    describe(m.id, () => {
      it('has a description for itself and each state', () => {
        expect(m.description).toBeTruthy()
        for (const name of m.stateNames) expect(m.states[name].description, `${m.id}.${name}`).toBeTruthy()
      })
      it('reaches every state from the start', () => {
        const reached = reachableStates(m)
        expect(m.stateNames.filter((s) => !reached.has(s))).toEqual([])
      })
      it('has a way out of every state that is not an end state', () => {
        const stuck = m.stateNames.filter((s) => !m.states[s].final && m.eventsFrom(s).length === 0)
        expect(stuck).toEqual([])
      })
    })
  }
})

describe('docs/state-machines.md', () => {
  it('is up to date (run npm run docs:machines)', () => {
    const current = readFileSync(new URL('../docs/state-machines.md', import.meta.url), 'utf8')
    expect(current).toBe(renderMachinesDoc(MACHINES))
  })
})

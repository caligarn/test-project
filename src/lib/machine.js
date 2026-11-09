// Tiny finite state machines: game flows written as data.
//
// A machine lists its states and, for each state, which events move it to
// which state. Anything not listed is not allowed, so impossible steps (a
// second submit, a late timer, a stale network message) are ignored instead
// of corrupting the screen. The config is a small subset of XState's format
// ({ id, initial, states: { name: { on: { EVENT: 'target' } } } }), so a later
// move to XState stays easy.
//
// Pure and dependency-free: used by the useMachine hook, by reducers, by the
// docs generator (scripts/state-machines.mjs), and by tests in Node.

const EVENT_RE = /^[A-Z][A-Z0-9_]*$/

function targetOf(t) {
  return typeof t === 'string' ? t : t?.target
}

/**
 * defineMachine({
 *   id: 'speed-prompt',                     // unique; shown as data-machine
 *   description: 'One round of Speed Prompt',
 *   initial: 'idle',
 *   on: { RESTART: 'idle' },                // events allowed in every state
 *   states: {
 *     idle:    { on: { START: 'writing' }, description: 'Waiting to start' },
 *     writing: { on: { SUBMIT: 'drawing', SUBMIT_EMPTY: 'result' } },
 *     result:  { final: true },             // a resting state, exits only via global events
 *   },
 * })
 * Throws on a broken definition (unknown target, bad event name).
 */
export function defineMachine(config) {
  const { id, initial, states, on: global = {}, description = '' } = config
  if (!id || typeof id !== 'string') throw new Error('Machine needs an id')
  if (!states || !states[initial]) throw new Error(`Machine ${id}: initial state "${initial}" is not defined`)
  const names = Object.keys(states)
  const check = (from, event, t) => {
    if (!EVENT_RE.test(event)) throw new Error(`Machine ${id}: event "${event}" must be UPPER_SNAKE_CASE`)
    if (!names.includes(targetOf(t))) throw new Error(`Machine ${id}: ${from} --${event}--> "${targetOf(t)}" is not a state`)
  }
  for (const [event, t] of Object.entries(global)) check('*', event, t)
  for (const [name, def] of Object.entries(states)) {
    for (const [event, t] of Object.entries(def.on || {})) check(name, event, t)
  }

  function transition(state, event) {
    const type = typeof event === 'string' ? event : event?.type
    const local = states[state]?.on?.[type]
    const t = local !== undefined ? local : global[type]
    return t === undefined ? null : targetOf(t)
  }

  function eventsFrom(state) {
    return [...new Set([...Object.keys(states[state]?.on || {}), ...Object.keys(global)])]
  }

  return Object.freeze({
    id,
    description,
    initial,
    states,
    on: global,
    stateNames: names,
    transition,
    can: (state, event) => transition(state, event) !== null,
    eventsFrom,
  })
}

/** All states reachable from the initial state (for tests and docs). */
export function reachableStates(machine) {
  const seen = new Set([machine.initial])
  const queue = [machine.initial]
  while (queue.length) {
    const s = queue.shift()
    for (const e of machine.eventsFrom(s)) {
      const t = machine.transition(s, e)
      if (t && !seen.has(t)) {
        seen.add(t)
        queue.push(t)
      }
    }
  }
  return seen
}

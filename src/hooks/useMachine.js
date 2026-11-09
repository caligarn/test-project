import { useState, useRef, useCallback, useEffect } from 'react'

const DEV = Boolean(import.meta.env?.DEV)

// Development only: a live view of every mounted machine, for people and
// agents driving the app (window.__GEN_ARCADE_MACHINES__['speed-prompt']).
function devRegistry() {
  if (!DEV || typeof window === 'undefined') return null
  window.__GEN_ARCADE_MACHINES__ ||= {}
  return window.__GEN_ARCADE_MACHINES__
}

/**
 * Run a machine from src/lib/machine.js inside a component.
 *
 *   const m = useMachine(speedPromptMachine)
 *   m.state                 // 'writing'
 *   m.send('SUBMIT')        // true if it moved; false if SUBMIT is not allowed now
 *   m.can('SUBMIT')         // check without moving
 *   m.is('drawing', 'judging')
 *   <div {...m.attrs}>      // data-machine="speed-prompt" data-state="writing"
 *
 * send() reads the latest state synchronously, so two sends in one handler
 * (or a send from a late async callback) always see the real current state.
 *
 * options.initial: start in another state of the machine (read once, at mount).
 */
export function useMachine(machine, { initial } = {}) {
  const [start] = useState(() => {
    if (initial === undefined) return machine.initial
    if (!machine.states[initial]) throw new Error(`Machine ${machine.id}: unknown initial state "${initial}"`)
    return initial
  })
  const [state, setState] = useState(start)
  const stateRef = useRef(start)

  const send = useCallback(
    (event) => {
      const from = stateRef.current
      const to = machine.transition(from, event)
      const type = typeof event === 'string' ? event : event?.type
      if (to === null) {
        if (DEV) {
          console.debug(`[machine ${machine.id}] ignored ${type} in "${from}"; allowed: ${machine.eventsFrom(from).join(', ') || 'none'}`)
        }
        return false
      }
      stateRef.current = to
      setState(to)
      const reg = devRegistry()
      if (reg) {
        const entry = (reg[machine.id] ||= { history: [] })
        entry.history = [...entry.history, { from, event: type, to, at: Date.now() }].slice(-30)
      }
      return true
    },
    [machine]
  )

  const can = useCallback((event) => machine.can(stateRef.current, event), [machine])
  const is = (...names) => names.includes(state)

  useEffect(() => {
    const reg = devRegistry()
    if (!reg) return
    const entry = (reg[machine.id] ||= { history: [] })
    entry.state = state
    entry.allowed = machine.eventsFrom(state)
    entry.description = machine.description
  }, [machine, state])

  return { state, send, can, is, attrs: { 'data-machine': machine.id, 'data-state': state } }
}

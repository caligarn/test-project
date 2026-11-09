import { useEffect, useRef } from 'react'

/**
 * A ref that always holds the latest value. Use it for callbacks that are
 * called later from outside React (PeerJS events, timers), so they never see
 * stale state and no effect has to re-run when they change.
 */
export function useLatestRef(value) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  })
  return ref
}

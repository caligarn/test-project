import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Countdown timer that cleans up after itself.
 *
 * - start(seconds) begins (or restarts) the countdown
 * - stop() halts it (e.g. when the player answers)
 * - onExpire fires exactly once when the countdown reaches 0
 * - the interval is cleared on unmount, and expiry is detected in an effect
 *   (never during render, never inside a state updater)
 */
export function useRoundTimer(onExpire) {
  const [timeLeft, setTimeLeft] = useState(null)
  const intervalRef = useRef(null)
  const expireRef = useRef(onExpire)
  useEffect(() => {
    expireRef.current = onExpire
  })

  // True between start() and stop()/expiry. Survives an effect re-run, so a
  // hot reload during development resumes the countdown instead of freezing it.
  const runningRef = useRef(false)

  const clear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const tick = useCallback(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => (t == null || t <= 0 ? 0 : t - 1))
    }, 1000)
  }, [])

  const stop = useCallback(() => {
    runningRef.current = false
    clear()
  }, [clear])

  const start = useCallback(
    (seconds) => {
      clear()
      runningRef.current = true
      setTimeLeft(seconds)
      tick()
    },
    [clear, tick]
  )

  useEffect(() => {
    if (timeLeft === 0 && runningRef.current) {
      stop()
      expireRef.current?.()
    }
  }, [timeLeft, stop])

  // Unmount clears the interval. If the effect runs again while a countdown
  // is still running (React Fast Refresh), it picks the countdown back up.
  useEffect(() => {
    if (runningRef.current && !intervalRef.current) tick()
    return clear
  }, [tick, clear])

  return { timeLeft, start, stop }
}

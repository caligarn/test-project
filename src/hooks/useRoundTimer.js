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
  expireRef.current = onExpire

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const start = useCallback(
    (seconds) => {
      stop()
      setTimeLeft(seconds)
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => (t == null || t <= 0 ? 0 : t - 1))
      }, 1000)
    },
    [stop]
  )

  useEffect(() => {
    if (timeLeft === 0 && intervalRef.current) {
      stop()
      expireRef.current?.()
    }
  }, [timeLeft, stop])

  useEffect(() => stop, [stop])

  return { timeLeft, start, stop }
}

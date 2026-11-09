import { useState, useEffect, useEffectEvent } from 'react'
import { COUNTDOWN_SECONDS, GAME_DURATION } from './constants'

/**
 * Countdown, then the round clock. Both follow the host's `endsAt` (ms epoch),
 * so the two players stay in sync. Calls onCountdownDone() once the countdown
 * reaches zero and onTimeUp() when the round is over (each tick until the
 * phase changes).
 */
export function useMatchClock({ phase, endsAt, onCountdownDone, onTimeUp }) {
  // Tagged with endsAt, so a new match starts from full values.
  const [clock, setClock] = useState({ endsAt: 0, countdown: COUNTDOWN_SECONDS, timeLeft: GAME_DURATION })
  const countdownDone = useEffectEvent(() => onCountdownDone())
  const timeUp = useEffectEvent(() => onTimeUp())

  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'playing') return
    const tick = () => {
      const now = Date.now()
      if (phase === 'countdown') {
        const left = Math.ceil((endsAt - GAME_DURATION * 1000 - now) / 1000)
        setClock((c) => ({ ...c, endsAt, countdown: Math.max(0, left) }))
        if (left <= 0) countdownDone()
        return
      }
      const left = Math.max(0, Math.ceil((endsAt - now) / 1000))
      setClock((c) => ({ ...c, endsAt, timeLeft: left }))
      if (left <= 0) timeUp()
    }
    const interval = setInterval(tick, 250)
    return () => clearInterval(interval)
  }, [phase, endsAt])

  const fresh = clock.endsAt === endsAt
  return { countdown: fresh ? clock.countdown : COUNTDOWN_SECONDS, timeLeft: fresh ? clock.timeLeft : GAME_DURATION }
}

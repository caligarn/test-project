import { useState, useRef, useCallback, useEffect } from 'react'
import { addScore } from '../lib/storage'

/**
 * Owns round progression, score accumulation, and stale-async protection for
 * the round-based games.
 *
 * - The total is persisted ONCE, when the last round completes - the
 *   leaderboard ranks whole games, and gamesPlayed increments once per game.
 * - token()/isStale(t) guard async work: capture `const t = token()` before an
 *   await; if `isStale(t)` afterwards, the player restarted/advanced/left and
 *   the result must be dropped.
 *
 * Usage:
 *   const g = useGameRounds({ gameId, username, maxRounds: 5 })
 *   ... g.recordScore(pts) when the round is answered ...
 *   ... g.nextRound() on the "Next Round" button (persists on last round) ...
 */
export function useGameRounds({ gameId, username, maxRounds }) {
  const [round, setRound] = useState(1)
  const [totalScore, setTotalScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const totalRef = useRef(0)
  const tokenRef = useRef(0)
  const roundRef = useRef(1)

  useEffect(() => {
    const ref = tokenRef
    return () => {
      ref.current++
    }
  }, [])

  const token = useCallback(() => tokenRef.current, [])
  const isStale = useCallback((t) => t !== tokenRef.current, [])

  const recordScore = useCallback((pts) => {
    totalRef.current += pts
    setTotalScore(totalRef.current)
  }, [])

  const nextRound = useCallback(() => {
    tokenRef.current++
    if (roundRef.current >= maxRounds) {
      setGameOver(true)
      addScore(gameId, username, totalRef.current, { rounds: maxRounds })
    } else {
      roundRef.current += 1
      setRound(roundRef.current)
    }
  }, [gameId, username, maxRounds])

  const restart = useCallback(() => {
    tokenRef.current++
    totalRef.current = 0
    roundRef.current = 1
    setRound(1)
    setTotalScore(0)
    setGameOver(false)
  }, [])

  return { round, totalScore, gameOver, token, isStale, recordScore, nextRound, restart }
}

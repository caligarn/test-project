import { useState, useRef, useCallback, useEffect } from 'react'
import { createPeer, makeRoomCode } from '../../lib/peer'
import { votePeerId, ROOM_CODE_LENGTH } from './constants'
import { useLatestRef } from './useLatestRef'

const NO_VOTES = { A: 0, B: 0 }

/**
 * The host's audience voting room. While `active`, it owns peer id
 * `promptoff-vote-<code>` (a fresh code each match), sends `voteData` to every
 * viewer (again whenever it changes) and counts one vote per viewer.
 * onReady(code) runs once the room is reachable, so the guest can show it too.
 * close() ends voting, sends the results to all viewers and returns them.
 */
export function useVoteRoom({ active, voteData, onReady }) {
  const [code, setCode] = useState('')
  const [votes, setVotes] = useState(NO_VOTES)
  const [viewers, setViewers] = useState(0)
  const [closed, setClosed] = useState(false)
  const connsRef = useRef([])
  const votesRef = useRef(NO_VOTES)
  const closedRef = useRef(false)
  const latest = useLatestRef({ voteData, onReady })

  useEffect(() => {
    if (!active) return
    let disposed = false
    const roomCode = makeRoomCode(ROOM_CODE_LENGTH)
    const voted = new Set()
    const conns = []
    connsRef.current = conns
    votesRef.current = NO_VOTES
    closedRef.current = false
    const peer = createPeer(votePeerId(roomCode))

    peer.on('open', () => {
      if (disposed) return
      setCode(roomCode)
      setVotes(NO_VOTES)
      setViewers(0)
      setClosed(false)
      latest.current.onReady?.(roomCode)
    })

    peer.on('connection', (conn) => {
      conn.on('open', () => {
        if (disposed) return
        conns.push(conn)
        setViewers(conns.length)
        if (closedRef.current) {
          conn.send({ type: 'vote-data', ...latest.current.voteData })
          conn.send({ type: 'vote-results', results: { votesA: votesRef.current.A, votesB: votesRef.current.B } })
        } else conn.send({ type: 'vote-data', ...latest.current.voteData })
      })
      conn.on('data', (msg) => {
        if (disposed || closedRef.current) return
        if (msg?.type !== 'vote' || (msg.vote !== 'A' && msg.vote !== 'B')) return
        if (voted.has(conn.peer)) return
        voted.add(conn.peer)
        votesRef.current = { ...votesRef.current, [msg.vote]: votesRef.current[msg.vote] + 1 }
        setVotes(votesRef.current)
      })
      conn.on('close', () => {
        const idx = conns.indexOf(conn)
        if (idx === -1) return
        conns.splice(idx, 1)
        if (!disposed) setViewers(conns.length)
      })
    })

    peer.on('error', (err) => console.warn('Vote room error:', err.type))

    return () => {
      disposed = true
      connsRef.current = []
      try {
        peer.destroy()
      } catch {
        // ignore
      }
    }
  }, [active, latest])

  // Final images can land after viewers joined: send them the update.
  useEffect(() => {
    if (!active) return
    for (const conn of connsRef.current) {
      if (conn.open) conn.send({ type: 'vote-data', ...voteData })
    }
  }, [active, voteData])

  const close = useCallback(() => {
    closedRef.current = true
    const results = { votesA: votesRef.current.A, votesB: votesRef.current.B }
    for (const conn of connsRef.current) {
      if (conn.open) conn.send({ type: 'vote-results', results })
    }
    setClosed(true)
    return results
  }, [])

  // Values from an earlier match are hidden until the new room is open.
  const ready = active && code !== ''
  return {
    code: ready ? code : '',
    votes: ready ? votes : NO_VOTES,
    viewers: ready ? viewers : 0,
    closed: ready && closed,
    close,
  }
}

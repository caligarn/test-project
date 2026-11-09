import { useState, useRef, useCallback, useEffect } from 'react'
import { createPeer, makeRoomCode } from '../../lib/peer'
import { gamePeerId, JOIN_TIMEOUT_MS, ROOM_CODE_LENGTH } from './constants'
import { useLatestRef } from './useLatestRef'

const isTransient = (err) => err.type === 'network' || err.type === 'disconnected' || err.type === 'server-error'

/**
 * The PeerJS link between the two Prompt Off players.
 * The host owns peer id `promptoff-<code>` and accepts one opponent while
 * `accepting` is true; the guest connects to it.
 *
 * Callbacks (always the latest version is used):
 *   onMessage(msg)       a message from the opponent
 *   onClosed()           the opponent's connection closed
 *   onFailed(message)    the room could not be created or joined (session ended)
 */
export function useDuelConnection({ username, accepting, onMessage, onClosed, onFailed }) {
  const [roomCode, setRoomCode] = useState('')
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const peerRef = useRef(null)
  const connRef = useRef(null)
  const joinTimerRef = useRef(null)
  const latest = useLatestRef({ username, accepting, onMessage, onClosed, onFailed })

  const teardown = useCallback(() => {
    if (joinTimerRef.current) {
      clearTimeout(joinTimerRef.current)
      joinTimerRef.current = null
    }
    const conn = connRef.current
    const peer = peerRef.current
    connRef.current = null
    peerRef.current = null
    try {
      conn?.close()
    } catch {
      // ignore
    }
    try {
      peer?.destroy()
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => teardown, [teardown])

  /** End the session. An optional message is shown in the lobby. */
  const leave = useCallback(
    (message = null) => {
      teardown()
      setConnected(false)
      setError(message)
    },
    [teardown]
  )

  const fail = useCallback(
    (peer, message) => {
      if (peerRef.current !== peer) return // an old session
      leave(message)
      latest.current.onFailed?.(message)
    },
    [leave, latest]
  )

  const attach = useCallback(
    (peer, conn) => {
      connRef.current = conn
      conn.on('open', () => {
        if (peerRef.current !== peer) return
        if (joinTimerRef.current) {
          clearTimeout(joinTimerRef.current)
          joinTimerRef.current = null
        }
        setConnected(true)
        conn.send({ type: 'hello', name: latest.current.username })
      })
      conn.on('data', (msg) => {
        if (peerRef.current !== peer || connRef.current !== conn) return
        if (msg && typeof msg === 'object') latest.current.onMessage?.(msg)
      })
      conn.on('close', () => {
        if (peerRef.current !== peer || connRef.current !== conn) return
        connRef.current = null
        setConnected(false)
        latest.current.onClosed?.()
      })
      conn.on('error', () => {
        if (peerRef.current === peer) setError('Connection error. Try again.')
      })
    },
    [latest]
  )

  const handlePeerError = useCallback(
    (peer, err, message) => {
      if (isTransient(err) && connRef.current?.open) {
        console.warn('PeerJS transient error (ignored, game in progress):', err.type)
        return
      }
      fail(peer, message)
    },
    [fail]
  )

  const create = useCallback(() => {
    teardown()
    setError(null)
    setConnected(false)
    const code = makeRoomCode(ROOM_CODE_LENGTH)
    setRoomCode(code)
    const peer = createPeer(gamePeerId(code))
    peerRef.current = peer
    peer.on('connection', (conn) => {
      // Only one opponent, and only while waiting in the room.
      if (peerRef.current !== peer || connRef.current?.open || !latest.current.accepting) {
        conn.close()
        return
      }
      attach(peer, conn)
    })
    peer.on('error', (err) =>
      handlePeerError(peer, err, err.type === 'unavailable-id' ? 'Room code taken. Try again.' : 'Connection failed. Check your network.')
    )
  }, [teardown, attach, handlePeerError, latest])

  const join = useCallback(
    (rawCode) => {
      const code = rawCode.trim().toUpperCase()
      if (!code) return
      teardown()
      setError(null)
      setConnected(false)
      setRoomCode(code)
      const peer = createPeer()
      peerRef.current = peer
      peer.on('open', () => {
        if (peerRef.current !== peer) return
        attach(peer, peer.connect(gamePeerId(code), { reliable: true }))
        joinTimerRef.current = setTimeout(() => {
          joinTimerRef.current = null
          if (!connRef.current?.open) fail(peer, 'Could not connect. Check the room code.')
        }, JOIN_TIMEOUT_MS)
      })
      peer.on('error', (err) => handlePeerError(peer, err, 'Could not connect. Check the room code.'))
    },
    [teardown, attach, fail, handlePeerError]
  )

  const send = useCallback((msg) => {
    const conn = connRef.current
    if (!conn?.open) return
    try {
      conn.send(msg)
    } catch (err) {
      console.warn('Prompt Off send failed:', err)
    }
  }, [])

  return { roomCode, connected, error, setError, create, join, leave, send }
}

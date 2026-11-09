import { useState, useRef, useCallback, useEffect } from 'react'
import { createPeer, makeRoomCode } from '../../lib/peer'
import { useMachine } from '../../hooks/useMachine'
import { duelLinkMachine } from '../../machines/duelLink'
import { gamePeerId, JOIN_TIMEOUT_MS, ROOM_CODE_LENGTH } from './constants'
import { useLatestRef } from './useLatestRef'

const isTransient = (err) => err.type === 'network' || err.type === 'disconnected' || err.type === 'server-error'

/**
 * The PeerJS link between the two Prompt Off players.
 * The host owns peer id `promptoff-<code>` and accepts one opponent while
 * `accepting` is true; the guest connects to it.
 *
 * The link's step (hosting, joining, connected...) is the machine in
 * src/machines/duelLink.js; `connected` is true in its `connected` state.
 *
 * Callbacks (always the latest version is used):
 *   onMessage(msg)       a message from the opponent
 *   onClosed()           the opponent's connection closed
 *   onFailed(message)    the room could not be created or joined (session ended)
 */
export function useDuelConnection({ username, accepting, onMessage, onClosed, onFailed }) {
  const [roomCode, setRoomCode] = useState('')
  const link = useMachine(duelLinkMachine) // see src/machines/duelLink.js
  const sendLink = link.send
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

  const end = useCallback(
    (event, message) => {
      teardown()
      sendLink(event)
      setError(message)
    },
    [teardown, sendLink]
  )

  /** End the session. An optional message is shown in the lobby. */
  const leave = useCallback((message = null) => end('LEAVE', message), [end])

  const fail = useCallback(
    (peer, message) => {
      if (peerRef.current !== peer) return // an old session
      end('FAILED', message)
      latest.current.onFailed?.(message)
    },
    [end, latest]
  )

  const attach = useCallback(
    // closedEvent: OPPONENT_LEFT for the host (the room stays open), HOST_LEFT for the guest.
    (peer, conn, closedEvent) => {
      connRef.current = conn
      conn.on('open', () => {
        if (peerRef.current !== peer || connRef.current !== conn) return
        if (joinTimerRef.current) {
          clearTimeout(joinTimerRef.current)
          joinTimerRef.current = null
        }
        if (!sendLink('OPENED')) return
        conn.send({ type: 'hello', name: latest.current.username })
      })
      conn.on('data', (msg) => {
        if (peerRef.current !== peer || connRef.current !== conn) return
        if (msg && typeof msg === 'object') latest.current.onMessage?.(msg)
      })
      conn.on('close', () => {
        if (peerRef.current !== peer || connRef.current !== conn) return
        connRef.current = null
        sendLink(closedEvent)
        latest.current.onClosed?.()
      })
      conn.on('error', () => {
        if (peerRef.current === peer) setError('Connection error. Try again.')
      })
    },
    [latest, sendLink]
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
    sendLink('CREATE')
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
      attach(peer, conn, 'OPPONENT_LEFT')
    })
    peer.on('error', (err) =>
      handlePeerError(peer, err, err.type === 'unavailable-id' ? 'Room code taken. Try again.' : 'Connection failed. Check your network.')
    )
  }, [teardown, attach, handlePeerError, latest, sendLink])

  const join = useCallback(
    (rawCode) => {
      const code = rawCode.trim().toUpperCase()
      if (!code) return
      teardown()
      setError(null)
      sendLink('JOIN')
        setRoomCode(code)
      const peer = createPeer()
      peerRef.current = peer
      peer.on('open', () => {
        if (peerRef.current !== peer) return
        attach(peer, peer.connect(gamePeerId(code), { reliable: true }), 'HOST_LEFT')
        joinTimerRef.current = setTimeout(() => {
          joinTimerRef.current = null
          if (!connRef.current?.open) fail(peer, 'Could not connect. Check the room code.')
        }, JOIN_TIMEOUT_MS)
      })
      peer.on('error', (err) => handlePeerError(peer, err, 'Could not connect. Check the room code.'))
    },
    [teardown, attach, fail, handlePeerError, sendLink]
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

  return { roomCode, connected: link.is('connected'), error, setError, create, join, leave, send, attrs: link.attrs }
}

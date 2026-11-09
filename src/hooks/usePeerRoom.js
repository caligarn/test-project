import { useState, useRef, useCallback, useEffect } from 'react'
import { createPeer, makeRoomCode } from '../lib/peer'
import { useMachine } from './useMachine'
import { roomMachine } from '../machines/room.js'

const MAX_PLAYERS = 8
const HEARTBEAT_MS = 3000
const TIMEOUT_MS = 10000

function stablePlayerId() {
  // Per tab, so two tabs in one browser are two players (handy for testing).
  try {
    let id = sessionStorage.getItem('gen_arcade_player_id')
    if (!id) {
      id = 'p-' + Math.random().toString(36).slice(2, 10)
      sessionStorage.setItem('gen_arcade_player_id', id)
    }
    return id
  } catch {
    return 'p-' + Math.random().toString(36).slice(2, 10)
  }
}

/**
 * Host-authoritative party room over PeerJS.
 *
 * The host keeps the shared state and the player list and broadcasts both
 * after every change. Everyone (host included) sends actions with dispatch();
 * actions reach the host's onAction(action, fromPlayerId), which updates the
 * state with setShared(). Players are keyed by a stable per-tab id, so a
 * player who reconnects keeps their seat.
 *
 *   const room = usePeerRoom({ gameId: 'telephone', initialState: {...}, onAction })
 *   room.create({ name, avatar }) / room.join(code, { name, avatar }) / room.leave()
 *   room.status: 'idle' | 'connecting' | 'open' | 'closed' | 'error'
 *   room.isHost, room.code, room.myId, room.players, room.state, room.error
 *   room.dispatch(action)          // anyone
 *   room.setShared(nextOrUpdater)  // host only
 */
export function usePeerRoom({ gameId, initialState = {}, onAction }) {
  const lifecycle = useMachine(roomMachine) // see src/machines/room.js
  const status = lifecycle.state
  const sendRoom = lifecycle.send
  const [error, setError] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [code, setCode] = useState(null)
  const [players, setPlayers] = useState([])
  const [state, setState] = useState(initialState)

  const [myId] = useState(stablePlayerId)
  const peerRef = useRef(null)
  const connsRef = useRef(new Map()) // host: peerConnId -> { conn, playerId }
  const hostConnRef = useRef(null) // client: connection to host
  const playersRef = useRef([])
  const stateRef = useRef(initialState)
  const isHostRef = useRef(false)
  const heartbeatRef = useRef(null)
  const lastSeenRef = useRef(new Map()) // host: connectionId -> ms; client: 'host' -> ms
  const onActionRef = useRef(onAction)
  const initialRef = useRef(initialState)
  useEffect(() => {
    onActionRef.current = onAction
  })

  const broadcast = useCallback(() => {
    const msg = { type: 'sync', players: playersRef.current, state: stateRef.current }
    for (const { conn } of connsRef.current.values()) {
      if (conn.open) {
        try {
          conn.send(msg)
        } catch {
          // a dropped connection is cleaned up by its close handler
        }
      }
    }
  }, [])

  const setPlayersBoth = useCallback((next) => {
    playersRef.current = next
    setPlayers(next)
  }, [])

  const setShared = useCallback(
    (next) => {
      if (!isHostRef.current) return
      stateRef.current = typeof next === 'function' ? next(stateRef.current) : next
      setState(stateRef.current)
      broadcast()
    },
    [broadcast]
  )

  const handleAction = useCallback((action, fromId) => {
    onActionRef.current?.(action, fromId, { players: playersRef.current, state: stateRef.current })
  }, [])

  const teardown = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
    lastSeenRef.current.clear()
    const bye = hostConnRef.current
    if (bye?.open) {
      try {
        bye.send({ type: 'bye' })
      } catch {
        // ignore
      }
    }
    for (const { conn } of connsRef.current.values()) {
      try {
        conn.close()
      } catch {
        // ignore
      }
    }
    connsRef.current.clear()
    hostConnRef.current = null
    if (peerRef.current) {
      try {
        peerRef.current.destroy()
      } catch {
        // ignore
      }
      peerRef.current = null
    }
  }, [])

  useEffect(() => {
    window.addEventListener('pagehide', teardown)
    return () => {
      window.removeEventListener('pagehide', teardown)
      teardown()
    }
  }, [teardown])

  const reset = useCallback(() => {
    teardown()
    isHostRef.current = false
    setIsHost(false)
    setCode(null)
    setPlayersBoth([])
    stateRef.current = initialRef.current
    setState(initialRef.current)
  }, [teardown, setPlayersBoth])

  const createRef = useRef(null) // lets create() retry itself with a new code
  const create = useCallback(
    ({ name, avatar } = {}, attempt = 0) => {
      reset()
      setError(null)
      sendRoom('LEAVE') // from any state, then start fresh
      sendRoom('CREATE')
      const roomCode = makeRoomCode()
      const peer = createPeer(`genarcade-${gameId}-${roomCode}`)
      peerRef.current = peer
      peer.on('open', () => {
        isHostRef.current = true
        setIsHost(true)
        setCode(roomCode)
        setPlayersBoth([{ id: myId, name: name || 'Host', avatar: avatar || '🎮', host: true, connected: true }])
        sendRoom('OPENED')
      })
      const dropConnection = (conn) => {
        const info = connsRef.current.get(conn.connectionId)
        connsRef.current.delete(conn.connectionId)
        lastSeenRef.current.delete(conn.connectionId)
        try {
          conn.close()
        } catch {
          // ignore
        }
        if (!info) return
        const stillConnected = [...connsRef.current.values()].some((c) => c.playerId === info.playerId)
        if (!stillConnected) {
          setPlayersBoth(playersRef.current.map((p) => (p.id === info.playerId ? { ...p, connected: false } : p)))
          broadcast()
          handleAction({ type: '$leave', playerId: info.playerId }, info.playerId)
        }
      }
      heartbeatRef.current = setInterval(() => {
        const now = Date.now()
        for (const [id, { conn }] of [...connsRef.current.entries()]) {
          if (now - (lastSeenRef.current.get(id) || now) > TIMEOUT_MS) dropConnection(conn)
          else if (conn.open) {
            try {
              conn.send({ type: 'ping' })
            } catch {
              // ignore
            }
          }
        }
      }, HEARTBEAT_MS)
      peer.on('connection', (conn) => {
        lastSeenRef.current.set(conn.connectionId, Date.now())
        conn.on('data', (msg) => {
          if (!msg || typeof msg !== 'object') return
          lastSeenRef.current.set(conn.connectionId, Date.now())
          if (msg.type === 'ping') return
          if (msg.type === 'bye') {
            dropConnection(conn)
            return
          }
          if (msg.type === 'hello') {
            const pid = String(msg.playerId || conn.peer).slice(0, 40)
            const existing = playersRef.current.find((p) => p.id === pid)
            if (!existing && playersRef.current.length >= MAX_PLAYERS) {
              conn.send({ type: 'refused', reason: 'Room is full.' })
              setTimeout(() => conn.close(), 200)
              return
            }
            connsRef.current.set(conn.connectionId, { conn, playerId: pid })
            const entry = { id: pid, name: String(msg.name || 'Player').slice(0, 20), avatar: String(msg.avatar || '🙂').slice(0, 8), host: false, connected: true }
            setPlayersBoth(existing ? playersRef.current.map((p) => (p.id === pid ? { ...p, ...entry } : p)) : [...playersRef.current, entry])
            broadcast()
            handleAction({ type: '$join', playerId: pid }, pid)
          } else if (msg.type === 'action') {
            const info = connsRef.current.get(conn.connectionId)
            if (info) handleAction(msg.action, info.playerId)
          }
        })
        conn.on('close', () => dropConnection(conn))
      })
      peer.on('error', (err) => {
        if (err.type === 'unavailable-id' && attempt < 3) {
          createRef.current({ name, avatar }, attempt + 1)
          return
        }
        if (isHostRef.current && (err.type === 'peer-unavailable' || err.type === 'network')) return
        setError('Could not open a room. Check your connection and try again.')
        sendRoom('FAILED')
      })
      peer.on('disconnected', () => {
        // Lost the signalling server; existing player connections keep working.
        try {
          peer.reconnect()
        } catch {
          // ignore
        }
      })
    },
    [gameId, myId, reset, broadcast, handleAction, setPlayersBoth, sendRoom]
  )

  useEffect(() => {
    createRef.current = create
  })

  const join = useCallback(
    (roomCode, { name, avatar } = {}) => {
      reset()
      setError(null)
      sendRoom('LEAVE')
      sendRoom('JOIN')
      const clean = String(roomCode || '').trim().toUpperCase()
      const peer = createPeer()
      peerRef.current = peer
      let opened = false
      peer.on('open', () => {
        const conn = peer.connect(`genarcade-${gameId}-${clean}`, { reliable: true })
        hostConnRef.current = conn
        const hostGone = () => {
          if (heartbeatRef.current) clearInterval(heartbeatRef.current)
          heartbeatRef.current = null
          setError(opened ? 'The host left the room.' : 'Could not join that room.')
          sendRoom(opened ? 'HOST_LEFT' : 'FAILED')
        }
        conn.on('open', () => {
          opened = true
          setCode(clean)
          conn.send({ type: 'hello', playerId: myId, name, avatar })
          sendRoom('OPENED')
          lastSeenRef.current.set('host', Date.now())
          heartbeatRef.current = setInterval(() => {
            if (Date.now() - (lastSeenRef.current.get('host') || 0) > TIMEOUT_MS) {
              hostGone()
              return
            }
            if (conn.open) {
              try {
                conn.send({ type: 'ping' })
              } catch {
                // ignore
              }
            }
          }, HEARTBEAT_MS)
        })
        conn.on('data', (msg) => {
          lastSeenRef.current.set('host', Date.now())
          if (msg?.type === 'ping') return
          if (msg?.type === 'sync') {
            setPlayersBoth(msg.players || [])
            stateRef.current = msg.state
            setState(msg.state)
          } else if (msg?.type === 'refused') {
            setError(msg.reason || 'Could not join.')
            sendRoom('FAILED')
          }
        })
        conn.on('close', () => {
          if (hostConnRef.current === conn) hostGone()
        })
      })
      peer.on('error', (err) => {
        setError(err.type === 'peer-unavailable' ? `No room with code ${clean}. Check the code.` : 'Connection problem. Try again.')
        sendRoom('FAILED')
      })
    },
    [gameId, myId, reset, setPlayersBoth, sendRoom]
  )

  const dispatch = useCallback(
    (action) => {
      if (isHostRef.current) {
        handleAction(action, myId)
        return
      }
      const conn = hostConnRef.current
      if (conn?.open) conn.send({ type: 'action', action })
    },
    [handleAction, myId]
  )

  const leave = useCallback(() => {
    reset()
    setError(null)
    sendRoom('LEAVE')
  }, [reset, sendRoom])

  return { status, error, isHost, code, myId, players, state, create, join, leave, dispatch, setShared, attrs: lifecycle.attrs }
}

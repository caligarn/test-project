import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Users, Copy, Check, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

/**
 * Lobby for party (multiplayer) modes built on usePeerRoom.
 * Before joining: name + "Create room" / "Join with code".
 * In the room: big code, QR join link, player list, and the host's start button.
 * A ?room=CODE link in the URL joins that room automatically.
 */
export default function RoomLobby({ room, title = 'Party mode', minPlayers = 2, onStart, startLabel = 'Start game', children }) {
  const { user } = useAuth()
  const [name, setName] = useState(user?.username || '')
  const [joinCode, setJoinCode] = useState(() => new URLSearchParams(window.location.search).get('room') || '')
  const [copied, setCopied] = useState(false)
  const autoJoined = useRef(false)
  const avatar = user?.avatar || '🙂'

  useEffect(() => {
    // Auto-join from a QR / shared link, once we know a name.
    const code = new URLSearchParams(window.location.search).get('room')
    if (code && !autoJoined.current && room.status === 'idle' && user?.username) {
      autoJoined.current = true
      room.join(code, { name: user.username, avatar })
    }
  }, [room, user, avatar])

  const link = room.code ? `${window.location.origin}${window.location.pathname}?room=${room.code}` : ''
  const connected = room.players.filter((p) => p.connected)

  function copy() {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }).catch(() => {})
  }

  if (room.status === 'idle' || room.status === 'error' || room.status === 'closed') {
    const playerName = name.trim() || 'Player'
    return (
      <div className="brutalist-card p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-navy" />
          <h3 className="font-black text-navy uppercase">{title}</h3>
        </div>
        {room.error && <p className="text-sm font-bold text-danger">{room.error}</p>}
        <label className="flex flex-col gap-1">
          <span className="text-xs font-black text-navy/50 uppercase">Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 20))} placeholder="Player"
            className="px-3 py-2 border-2 border-navy text-navy font-medium focus:outline-none focus:ring-2 focus:ring-highlight" />
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <button onClick={() => room.create({ name: playerName, avatar })} className="btn-brutalist bg-primary text-white text-sm">
            Create room
          </button>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (joinCode.trim()) room.join(joinCode, { name: playerName, avatar }) }}>
            <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))} placeholder="CODE" aria-label="Room code"
              className="w-24 px-3 py-2 border-2 border-navy text-navy font-black tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-highlight" />
            <button type="submit" disabled={!joinCode.trim()} className="btn-brutalist bg-highlight text-navy text-sm flex-1 disabled:opacity-40">Join</button>
          </form>
        </div>
      </div>
    )
  }

  if (room.status === 'connecting') {
    return (
      <div className="brutalist-card p-8 text-center">
        <p className="text-sm font-black text-navy/50 uppercase">Connecting...</p>
      </div>
    )
  }

  // status === 'open'
  return (
    <div className="flex flex-col gap-4">
      <div className="brutalist-card p-5 flex flex-col sm:flex-row gap-5 items-center">
        {room.isHost && link && (
          <div className="bg-white p-2 border-2 border-navy shrink-0">
            <QRCodeSVG value={link} size={128} />
          </div>
        )}
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <p className="text-xs font-black text-navy/50 uppercase">Room code</p>
          <p className="text-4xl font-black text-navy tracking-[0.3em]">{room.code}</p>
          {room.isHost && (
            <button onClick={copy} className="mt-2 inline-flex items-center gap-1 text-xs font-black text-navy/60 hover:text-navy uppercase">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy invite link'}
            </button>
          )}
        </div>
        <button onClick={room.leave} className="inline-flex items-center gap-1 text-xs font-black text-navy/50 hover:text-danger uppercase">
          <LogOut className="w-3.5 h-3.5" /> Leave
        </button>
      </div>

      <div className="brutalist-card p-4">
        <p className="text-xs font-black text-navy/50 uppercase mb-2">Players ({connected.length})</p>
        <ul className="flex flex-wrap gap-2">
          {room.players.map((p) => (
            <li key={p.id} className={`px-3 py-1.5 border-2 border-navy text-sm font-bold ${p.connected ? 'bg-white text-navy' : 'bg-navy/5 text-navy/40 line-through'}`}>
              {p.avatar} {p.name}{p.host ? ' (host)' : ''}{p.id === room.myId ? ' (you)' : ''}
            </li>
          ))}
        </ul>
      </div>

      {children}

      {onStart && (room.isHost ? (
        <button onClick={onStart} disabled={connected.length < minPlayers} className="btn-brutalist bg-accent text-navy text-sm disabled:opacity-40">
          {connected.length < minPlayers ? `Waiting for ${minPlayers - connected.length} more player${minPlayers - connected.length === 1 ? '' : 's'}...` : startLabel}
        </button>
      ) : (
        <p className="text-center text-sm font-black text-navy/50 uppercase">Waiting for the host to start...</p>
      ))}
    </div>
  )
}

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { ROOM_CODE_LENGTH } from './constants'

function Spinner({ label }) {
  return (
    <div className="flex items-center justify-center gap-2 text-navy/40 text-sm">
      <div className="animate-spin rounded-full" style={{ width: 16, height: 16, border: '2px solid #1A1A2E33', borderTopColor: '#1A1A2E' }} />
      <span className="font-medium">{label}</span>
    </div>
  )
}

export function CopyButton({ text, title = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }
  return (
    <button onClick={copy} className="p-2 hover:bg-navy/5 transition-colors shrink-0" title={title} aria-label={title}>
      {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-navy/40" />}
    </button>
  )
}

export function LobbyView({ error, onCreate, onJoin }) {
  const [joinCode, setJoinCode] = useState('')
  function submit(e) {
    e.preventDefault()
    if (joinCode.trim()) onJoin(joinCode)
  }
  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <div className="brutalist-card p-6 sm:p-8 text-center">
        <p className="text-5xl mb-4">🥊</p>
        <h3 className="text-2xl font-black text-navy uppercase mb-2">Prompt Off</h3>
        <p className="text-navy/50 text-sm font-medium mb-6">
          Head-to-head AI art battle! Draw and prompt in real time to make the best image. Your canvas feeds the AI live.
        </p>

        {error && <div className="p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium mb-4">{error}</div>}

        <button onClick={onCreate} className="w-full py-4 bg-primary text-white font-black uppercase text-sm mb-4" style={{ border: '2px solid #1A1A2E' }}>
          Create Room
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-navy/10" /></div>
          <div className="relative flex justify-center"><span className="bg-white px-4 text-xs font-black text-navy/30 uppercase">or join</span></div>
        </div>

        <form onSubmit={submit} className="flex gap-2">
          <input
            type="text"
            placeholder="ROOM CODE"
            aria-label="Room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={ROOM_CODE_LENGTH}
            autoCapitalize="characters"
            autoComplete="off"
            className="flex-1 min-w-0 px-4 py-3 text-center text-navy text-lg font-black uppercase tracking-widest focus:outline-none"
            style={{ border: '3px solid #1A1A2E' }}
          />
          <button
            type="submit"
            disabled={joinCode.trim().length < ROOM_CODE_LENGTH}
            className="px-6 py-3 bg-accent text-navy font-black uppercase text-sm disabled:opacity-40"
            style={{ border: '2px solid #1A1A2E' }}
          >
            Join
          </button>
        </form>
      </div>
    </div>
  )
}

export function WaitingView({ isHost, connected, roomCode, opponentName, onStart, onLeave }) {
  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <div className="brutalist-card p-6 sm:p-8 text-center">
        {isHost ? (
          <>
            <p className="text-4xl mb-4">📡</p>
            <h3 className="font-black text-navy uppercase mb-2">{connected ? 'Opponent Connected!' : 'Waiting for Opponent...'}</h3>
            <div className="flex items-center justify-center gap-2 my-6">
              <span className="text-3xl font-black text-primary tracking-[0.3em]">{roomCode}</span>
              <CopyButton text={roomCode} title="Copy code" />
            </div>
            <p className="text-navy/40 text-xs font-medium mb-6">Share this code with your opponent</p>
            {connected ? (
              <div className="space-y-3">
                <p className="text-sm font-bold text-green-600">🟢 {opponentName} has joined!</p>
                <button onClick={onStart} className="w-full py-4 bg-accent text-navy font-black uppercase text-sm animate-pulse" style={{ border: '2px solid #1A1A2E' }}>
                  Start Game!
                </button>
              </div>
            ) : (
              <Spinner label="Listening for connections..." />
            )}
          </>
        ) : (
          <>
            <p className="text-4xl mb-4">{connected ? '🟢' : '🔌'}</p>
            <h3 className="font-black text-navy uppercase mb-2">{connected ? 'Connected!' : 'Connecting...'}</h3>
            <p className="text-sm text-navy/50 font-medium">
              {connected ? `Waiting for ${opponentName || 'the host'} to start...` : `Connecting to room ${roomCode}...`}
            </p>
          </>
        )}
        <button onClick={onLeave} className="mt-6 text-xs font-black text-navy/40 hover:text-navy uppercase">
          Leave room
        </button>
      </div>
    </div>
  )
}

export function CountdownView({ count }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
      <div className="text-center">
        <p className="text-8xl font-black text-primary mb-4 animate-bounce">{count > 0 ? count : 'GO!'}</p>
        <p className="text-navy/50 font-black uppercase text-sm">Get ready to draw & prompt!</p>
      </div>
    </div>
  )
}

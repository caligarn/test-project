// Audience voting for Prompt Off (players show a QR code that opens /vote/:code).
// Protocol: see src/games/promptoff/constants.js.
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { createPeer } from '../lib/peer'
import { useMachine } from '../hooks/useMachine'
import { promptOffVoteMachine } from '../machines/promptOffVote'
import GameImage from '../components/game/GameImage'

const A_COLOR = '#C8FF00'
const B_COLOR = '#FF2D55'
const CONNECT_TIMEOUT_MS = 15000
const RETRY_MS = 4000

function Centered({ children, ...attrs }) {
  return (
    <div {...attrs} className="flex items-center justify-center px-4" style={{ minHeight: '60vh' }}>
      <div className="text-center max-w-sm">{children}</div>
    </div>
  )
}

function Spinner({ size = 48 }) {
  return (
    <div
      className="animate-spin rounded-full mx-auto"
      style={{ width: size, height: size, border: `${size > 30 ? 4 : 3}px solid #1A1A2E22`, borderTopColor: '#1A1A2E' }}
    />
  )
}

function Picture({ src, alt }) {
  return src ? (
    <GameImage key={src} src={src} alt={alt} eager className="w-full h-full" style={{ objectFit: 'cover', display: 'block' }} />
  ) : (
    <div className="flex items-center justify-center bg-white text-navy/30 text-sm font-bold uppercase w-full h-full">No image</div>
  )
}

function Badge({ children, bg, color, side = 'left' }) {
  return (
    <div className={`absolute top-2 ${side === 'left' ? 'left-2' : 'right-2'} px-2 py-1 text-xs font-black uppercase`} style={{ background: bg, color }}>
      {children}
    </div>
  )
}

function VoteBar({ votes, total, color, textOnFill }) {
  const pct = total > 0 ? Math.round((votes / total) * 100) : 0
  return (
    <div className="w-full h-8 relative bg-white" style={{ border: `2px solid ${color}` }}>
      <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      <span className="absolute inset-0 flex items-center justify-center text-xs font-black" style={{ color: pct > 50 ? textOnFill : '#1A1A2E' }}>
        {pct}% ({votes})
      </span>
    </div>
  )
}

export default function VotePage() {
  const { code } = useParams()
  // connecting | voting | voted | results | closed | error
  const flow = useMachine(promptOffVoteMachine) // see src/machines/promptOffVote.js
  const status = flow.state
  const send = flow.send
  const [data, setData] = useState({ prompt: '', imageA: null, imageB: null, labelA: 'Player 1', labelB: 'Player 2' })
  const [myVote, setMyVote] = useState(null)
  const [results, setResults] = useState(null)
  const connRef = useRef(null)

  useEffect(() => {
    if (!code) return
    let disposed = false
    let timer = null
    // Ignored once the results are in: they stay on screen.
    const fail = () => {
      if (!disposed) send('FAILED')
    }
    const peer = createPeer()
    // Joining = own peer opens, link to the host opens, first vote data
    // arrives. If the data does not come, try a fresh link (a crowded network
    // can drop the first message); give up after CONNECT_TIMEOUT_MS.
    let gotData = false
    let retryTimer = null
    const giveUp = setTimeout(() => {
      if (!gotData) fail()
    }, CONNECT_TIMEOUT_MS)
    timer = giveUp

    const connect = () => {
      if (disposed) return
      const conn = peer.connect(`promptoff-vote-${code.toUpperCase()}`, { reliable: true })
      connRef.current = conn
      conn.on('open', () => {
        conn.send({ type: 'viewer-hello' })
      })
      conn.on('data', (msg) => {
        if (disposed || !msg || connRef.current !== conn) return
        if (msg.type === 'vote-data') {
          gotData = true
          setData({
            prompt: msg.prompt || '',
            imageA: msg.imageA,
            imageB: msg.imageB,
            labelA: msg.labelA || 'Player 1',
            labelB: msg.labelB || 'Player 2',
          })
          // The host re-sends vote-data when final images land: this only
          // moves on from connecting, so a cast vote is kept.
          send('VOTE_DATA')
        } else if (msg.type === 'vote-results' && msg.results) {
          gotData = true
          setResults(msg.results)
          send('RESULTS')
        }
      })
      conn.on('close', () => {
        // A link we replaced while retrying is not the room closing.
        if (!disposed && connRef.current === conn && gotData) send('ROOM_CLOSED')
      })
      conn.on('error', () => {
        if (connRef.current === conn && gotData) fail()
      })
      clearTimeout(retryTimer)
      retryTimer = setTimeout(() => {
        if (disposed || gotData) return
        try {
          conn.close()
        } catch {
          // ignore
        }
        connect()
      }, RETRY_MS)
    }

    peer.on('open', () => connect())
    peer.on('error', () => fail())

    return () => {
      disposed = true
      clearTimeout(timer)
      clearTimeout(retryTimer)
      connRef.current = null
      try {
        peer.destroy()
      } catch {
        // ignore
      }
    }
  }, [code, send])

  function vote(choice) {
    if (!send('VOTE')) return // one vote, and none after the results
    setMyVote(choice)
    if (connRef.current?.open) connRef.current.send({ type: 'vote', vote: choice })
  }

  const { prompt, imageA, imageB, labelA, labelB } = data

  if (status === 'error' || status === 'closed') {
    return (
      <Centered {...flow.attrs}>
        <p className="text-5xl mb-4">😔</p>
        <h2 className="text-xl font-black text-navy uppercase mb-2">{status === 'error' ? "Can't Connect" : 'Voting Closed'}</h2>
        <p className="text-navy/50 text-sm font-medium">The voting room may have closed. Ask the host for a new code.</p>
      </Centered>
    )
  }

  if (status === 'connecting') {
    return (
      <Centered {...flow.attrs}>
        <Spinner />
        <h2 className="text-xl font-black text-navy uppercase mt-4 mb-2">Joining Vote Room</h2>
        <p className="text-navy/50 text-sm font-medium">Connecting to {code}...</p>
      </Centered>
    )
  }


  const header = (
    <div className="text-center">
      <p className="text-[10px] font-black text-navy/40 uppercase mb-0.5">The prompt was</p>
      <p className="text-lg font-black text-navy">&quot;{prompt}&quot;</p>
    </div>
  )

  if (status === 'voting') {
    return (
      <div {...flow.attrs} className="flex flex-col gap-4 max-w-3xl mx-auto px-4 py-6">
        {header}
        <p className="text-sm text-navy/60 font-bold uppercase text-center">Tap the image you think is better!</p>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[['A', labelA, imageA, A_COLOR, '#1A1A2E'], ['B', labelB, imageB, B_COLOR, '#FFFFFF']].map(([choice, label, image, color, text]) => (
            <div key={choice} className="flex flex-col gap-2 min-w-0">
              <p className="text-sm font-black text-navy uppercase text-center truncate">{label}</p>
              <button
                onClick={() => vote(choice)}
                aria-label={`Vote for ${label}`}
                className="w-full transition-transform hover:scale-[1.03] active:scale-95 relative bg-white p-0 cursor-pointer"
                style={{ border: `3px solid ${color}`, aspectRatio: '1', overflow: 'hidden' }}
              >
                <Picture src={image} alt={label} />
                <div className="absolute inset-x-0 bottom-0 py-2 text-center text-xs sm:text-sm font-black uppercase" style={{ background: color, color: text }}>
                  Vote for this
                </div>
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (status === 'voted') {
    return (
      <div {...flow.attrs} className="flex flex-col gap-4 max-w-3xl mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-5xl mb-3">🗳️</p>
          <h2 className="text-xl font-black text-navy uppercase mb-2">Vote Cast!</h2>
          <p className="text-navy/60 text-sm font-medium">
            You voted for <span className="font-black text-navy">{myVote === 'A' ? labelA : labelB}</span>
          </p>
          <p className="text-navy/40 text-xs font-medium mt-2 mb-4">Waiting for results...</p>
          <Spinner size={24} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[['A', labelA, imageA, A_COLOR, '#1A1A2E'], ['B', labelB, imageB, B_COLOR, '#FFFFFF']].map(([choice, label, image, color, text]) => (
            <div key={choice} className="relative bg-white" style={{ border: `3px solid ${myVote === choice ? color : '#1A1A2E33'}`, aspectRatio: '1', overflow: 'hidden', opacity: myVote === choice ? 1 : 0.5 }}>
              <Picture src={image} alt={label} />
              {myVote === choice && <Badge bg={color} color={text} side="right">Your Vote</Badge>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (status === 'results' && results) {
    const votesA = results.votesA || 0
    const votesB = results.votesB || 0
    const total = votesA + votesB
    const winner = votesA > votesB ? 'A' : votesB > votesA ? 'B' : null
    return (
      <div {...flow.attrs} className="flex flex-col gap-4 max-w-3xl mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-5xl mb-3">🏆</p>
          <h2 className="text-2xl font-black text-navy uppercase mb-1">{winner ? `${winner === 'A' ? labelA : labelB} Wins!` : "It's a Tie!"}</h2>
          <p className="text-navy/50 text-sm font-medium">{total} vote{total !== 1 ? 's' : ''} cast</p>
        </div>
        {header}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {[['A', labelA, imageA, A_COLOR, '#1A1A2E', votesA], ['B', labelB, imageB, B_COLOR, '#FFFFFF', votesB]].map(([choice, label, image, color, text, count]) => (
            <div key={choice} className="flex flex-col gap-2 min-w-0">
              <p className="text-sm font-black text-navy uppercase text-center truncate">{label}</p>
              <div className="relative bg-white" style={{ border: `3px solid ${winner === choice ? color : '#1A1A2E'}`, aspectRatio: '1', overflow: 'hidden' }}>
                <Picture src={image} alt={label} />
                {winner === choice && <Badge bg={color} color={text}>Winner</Badge>}
                {myVote === choice && <Badge bg="#1A1A2E" color="#FFFFFF" side="right">You</Badge>}
              </div>
              <VoteBar votes={count} total={total} color={color} textOnFill={text} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}

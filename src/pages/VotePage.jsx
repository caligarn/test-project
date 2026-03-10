import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import Peer from 'peerjs'

export default function VotePage() {
  const { code } = useParams()
  const [status, setStatus] = useState('connecting') // connecting | voting | voted | results | error
  const [targetPrompt, setTargetPrompt] = useState('')
  const [imageA, setImageA] = useState(null)
  const [imageB, setImageB] = useState(null)
  const [labelA, setLabelA] = useState('Player 1')
  const [labelB, setLabelB] = useState('Player 2')
  const [myVote, setMyVote] = useState(null)
  const [results, setResults] = useState(null)
  const connRef = useRef(null)
  const peerRef = useRef(null)
  const statusRef = useRef(status)
  const retryCountRef = useRef(0)
  const MAX_RETRIES = 3

  useEffect(() => { statusRef.current = status }, [status])

  const connectToPeer = (code) => {
    // Cleanup previous attempt
    if (connRef.current) { connRef.current.close(); connRef.current = null }
    if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null }

    setStatus('connecting')
    const peer = new Peer()
    peerRef.current = peer

    peer.on('open', () => {
      const conn = peer.connect(`promptoff-vote-${code.toUpperCase()}`, { reliable: true })
      connRef.current = conn

      conn.on('open', () => {
        retryCountRef.current = 0
        conn.send({ type: 'viewer-hello' })
      })

      conn.on('data', (msg) => {
        switch (msg.type) {
          case 'vote-data':
            setTargetPrompt(msg.prompt)
            setImageA(msg.imageA)
            setImageB(msg.imageB)
            setLabelA(msg.labelA || 'Player 1')
            setLabelB(msg.labelB || 'Player 2')
            setStatus('voting')
            break
          case 'vote-results':
            setResults(msg.results)
            if (myVote) setStatus('results')
            break
          default:
            break
        }
      })

      conn.on('close', () => {
        // Use ref to avoid stale closure over status
        if (statusRef.current === 'connecting' || statusRef.current === 'voting') {
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current++
            const delay = 1000 * Math.pow(2, retryCountRef.current - 1)
            setTimeout(() => connectToPeer(code), delay)
          } else {
            setStatus('error')
          }
        }
      })

      conn.on('error', () => {
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++
          const delay = 1000 * Math.pow(2, retryCountRef.current - 1)
          setTimeout(() => connectToPeer(code), delay)
        } else {
          setStatus('error')
        }
      })

      setTimeout(() => {
        if (!connRef.current?.open && statusRef.current === 'connecting') {
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current++
            connectToPeer(code)
          } else {
            setStatus('error')
          }
        }
      }, 10000)
    })

    peer.on('error', () => {
      if (retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current++
        const delay = 1000 * Math.pow(2, retryCountRef.current - 1)
        setTimeout(() => connectToPeer(code), delay)
      } else {
        setStatus('error')
      }
    })
  }

  useEffect(() => {
    if (!code) return
    connectToPeer(code)

    return () => {
      if (connRef.current) connRef.current.close()
      if (peerRef.current) peerRef.current.destroy()
    }
  }, [code])

  // When results arrive after we already voted, show them
  useEffect(() => {
    if (myVote && results) setStatus('results')
  }, [myVote, results])

  function vote(choice) {
    setMyVote(choice)
    if (connRef.current?.open) {
      connRef.current.send({ type: 'vote', vote: choice })
    }
    setStatus(results ? 'results' : 'voted')
  }

  // CONNECTING
  if (status === 'connecting') {
    return (
      <div className="flex items-center justify-center px-4" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full mx-auto mb-4"
            style={{ width: 48, height: 48, border: '4px solid #ffffff33', borderTopColor: '#C8FF00' }} />
          <h2 className="text-xl font-black text-white uppercase mb-2">Joining Vote Room</h2>
          <p className="text-white/40 text-sm font-medium">Connecting to {code}...</p>
        </div>
      </div>
    )
  }

  // ERROR
  if (status === 'error') {
    return (
      <div className="flex items-center justify-center px-4" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <p className="text-5xl mb-4">😔</p>
          <h2 className="text-xl font-black text-white uppercase mb-2">Can't Connect</h2>
          <p className="text-white/40 text-sm font-medium">The voting room may have closed. Ask the host for a new code.</p>
        </div>
      </div>
    )
  }

  // VOTING — click on an image to vote
  if (status === 'voting') {
    return (
      <div className="flex flex-col gap-4 max-w-3xl mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-[10px] font-black text-white/30 uppercase mb-0.5">The prompt was</p>
          <p className="text-lg font-black text-white">"{targetPrompt}"</p>
          <p className="text-sm text-white/50 font-bold mt-2 uppercase">Tap the image you think is better!</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Image A */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-black text-[#C8FF00] uppercase text-center">{labelA}</p>
            <button onClick={() => vote('A')}
              className="w-full transition-transform hover:scale-[1.03] active:scale-95"
              style={{ border: '3px solid #C8FF00', aspectRatio: '1', overflow: 'hidden', position: 'relative', background: 'none', padding: 0, cursor: 'pointer' }}>
              {imageA ? (
                <img src={imageA} alt={labelA} className="w-full h-full" style={{ objectFit: 'cover', display: 'block' }} />
              ) : (
                <div className="flex items-center justify-center bg-white text-navy/20 text-sm font-bold uppercase w-full h-full">
                  No image
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 py-3 text-center text-sm font-black uppercase"
                style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: '#C8FF00' }}>
                Vote for this
              </div>
            </button>
          </div>

          {/* Image B */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-black text-[#FF2D55] uppercase text-center">{labelB}</p>
            <button onClick={() => vote('B')}
              className="w-full transition-transform hover:scale-[1.03] active:scale-95"
              style={{ border: '3px solid #FF2D55', aspectRatio: '1', overflow: 'hidden', position: 'relative', background: 'none', padding: 0, cursor: 'pointer' }}>
              {imageB ? (
                <img src={imageB} alt={labelB} className="w-full h-full" style={{ objectFit: 'cover', display: 'block' }} />
              ) : (
                <div className="flex items-center justify-center bg-white text-navy/20 text-sm font-bold uppercase w-full h-full">
                  No image
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 py-3 text-center text-sm font-black uppercase"
                style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: '#FF2D55' }}>
                Vote for this
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // VOTED — waiting for results
  if (status === 'voted') {
    return (
      <div className="flex flex-col gap-4 max-w-3xl mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-5xl mb-3">🗳️</p>
          <h2 className="text-xl font-black text-white uppercase mb-2">Vote Cast!</h2>
          <p className="text-white/40 text-sm font-medium">
            You voted for <span className="font-black text-white">{myVote === 'A' ? labelA : labelB}</span>
          </p>
          <p className="text-white/30 text-xs font-medium mt-2">Waiting for results...</p>
          <div className="animate-spin rounded-full mx-auto mt-4"
            style={{ width: 24, height: 24, border: '3px solid #ffffff22', borderTopColor: '#C8FF00' }} />
        </div>

        {/* Show both images with vote badge */}
        <div className="grid grid-cols-2 gap-4">
          <div style={{ border: `3px solid ${myVote === 'A' ? '#C8FF00' : '#333'}`, aspectRatio: '1', overflow: 'hidden', position: 'relative', opacity: myVote === 'A' ? 1 : 0.5 }}>
            {imageA && <img src={imageA} alt={labelA} className="w-full h-full" style={{ objectFit: 'cover', display: 'block' }} />}
            {myVote === 'A' && (
              <div className="absolute top-2 right-2 px-2 py-1 text-xs font-black uppercase"
                style={{ background: '#C8FF00', color: '#1A1A2E' }}>Your Vote</div>
            )}
          </div>
          <div style={{ border: `3px solid ${myVote === 'B' ? '#FF2D55' : '#333'}`, aspectRatio: '1', overflow: 'hidden', position: 'relative', opacity: myVote === 'B' ? 1 : 0.5 }}>
            {imageB && <img src={imageB} alt={labelB} className="w-full h-full" style={{ objectFit: 'cover', display: 'block' }} />}
            {myVote === 'B' && (
              <div className="absolute top-2 right-2 px-2 py-1 text-xs font-black uppercase"
                style={{ background: '#FF2D55', color: '#fff' }}>Your Vote</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // RESULTS
  if (status === 'results' && results) {
    const totalVotes = results.votesA + results.votesB
    const pctA = totalVotes > 0 ? Math.round((results.votesA / totalVotes) * 100) : 0
    const pctB = totalVotes > 0 ? Math.round((results.votesB / totalVotes) * 100) : 0
    const winnerLabel = results.votesA > results.votesB ? labelA : results.votesB > results.votesA ? labelB : null

    return (
      <div className="flex flex-col gap-4 max-w-3xl mx-auto px-4 py-6">
        <div className="text-center">
          <p className="text-5xl mb-3">🏆</p>
          <h2 className="text-2xl font-black text-white uppercase mb-1">
            {winnerLabel ? `${winnerLabel} Wins!` : "It's a Tie!"}
          </h2>
          <p className="text-white/40 text-sm font-medium">{totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Image A result */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-black text-[#C8FF00] uppercase text-center">{labelA}</p>
            <div style={{ border: `3px solid ${results.votesA >= results.votesB ? '#C8FF00' : '#333'}`, aspectRatio: '1', overflow: 'hidden', position: 'relative' }}>
              {imageA && <img src={imageA} alt={labelA} className="w-full h-full" style={{ objectFit: 'cover', display: 'block' }} />}
              {results.votesA >= results.votesB && results.votesA > 0 && (
                <div className="absolute top-2 left-2 px-2 py-1 text-xs font-black uppercase"
                  style={{ background: '#C8FF00', color: '#1A1A2E' }}>Winner</div>
              )}
              {myVote === 'A' && (
                <div className="absolute top-2 right-2 px-2 py-1 text-xs font-black uppercase"
                  style={{ background: '#fff', color: '#1A1A2E' }}>You</div>
              )}
            </div>
            {/* Vote bar */}
            <div className="w-full h-8 relative" style={{ border: '2px solid #C8FF00', background: '#1a1a2e' }}>
              <div className="h-full transition-all duration-700" style={{ width: `${pctA}%`, background: '#C8FF00' }} />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black"
                style={{ color: pctA > 50 ? '#1A1A2E' : '#C8FF00' }}>
                {pctA}% ({results.votesA})
              </span>
            </div>
          </div>

          {/* Image B result */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-black text-[#FF2D55] uppercase text-center">{labelB}</p>
            <div style={{ border: `3px solid ${results.votesB >= results.votesA ? '#FF2D55' : '#333'}`, aspectRatio: '1', overflow: 'hidden', position: 'relative' }}>
              {imageB && <img src={imageB} alt={labelB} className="w-full h-full" style={{ objectFit: 'cover', display: 'block' }} />}
              {results.votesB >= results.votesA && results.votesB > 0 && (
                <div className="absolute top-2 left-2 px-2 py-1 text-xs font-black uppercase"
                  style={{ background: '#FF2D55', color: '#fff' }}>Winner</div>
              )}
              {myVote === 'B' && (
                <div className="absolute top-2 right-2 px-2 py-1 text-xs font-black uppercase"
                  style={{ background: '#fff', color: '#1A1A2E' }}>You</div>
              )}
            </div>
            {/* Vote bar */}
            <div className="w-full h-8 relative" style={{ border: '2px solid #FF2D55', background: '#1a1a2e' }}>
              <div className="h-full transition-all duration-700" style={{ width: `${pctB}%`, background: '#FF2D55' }} />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-black"
                style={{ color: pctB > 50 ? '#fff' : '#FF2D55' }}>
                {pctB}% ({results.votesB})
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

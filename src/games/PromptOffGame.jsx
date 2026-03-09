import { useState, useEffect, useRef, useCallback } from 'react'
import Peer from 'peerjs'
import { generateFromSketch, connectRealtime, generateImage } from '../lib/fal'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { Copy, Check, Trash2, Clock, Trophy } from 'lucide-react'

const PROMPTS = [
  'A dragon sleeping on a pile of gold coins in a cave',
  'An astronaut riding a horse on the surface of Mars',
  'A cat wearing a top hat having tea in a garden',
  'A robot painting a sunset at the beach with an easel',
  'A treehouse in the clouds with a rope ladder',
  'A penguin surfing a giant wave at sunset',
  'A wizard casting colorful spells in a dusty library',
  'A steampunk train flying through a stormy sky',
  'A mermaid playing electric guitar underwater',
  'A samurai standing in a cherry blossom storm',
  'A dinosaur wearing sunglasses at a pool party',
  'A pirate ship made of candy sailing on chocolate seas',
  'An owl professor teaching math in a forest classroom',
  'A fox riding a bicycle through a medieval village',
  'A haunted lighthouse on a cliff during a thunderstorm',
  'A corgi astronaut floating in a space station',
  'A giant octopus wrapping around a skyscraper at night',
  'A cozy cabin in the woods during a heavy snowfall',
  'A knight jousting a windmill in a sunflower field',
  'A raccoon DJ playing turntables at a rooftop party',
]

const BRUSH_COLORS = ['#1A1A2E', '#FF2D55', '#FF6B35', '#FFD600', '#C8FF00', '#00D4FF', '#8B5CF6', '#FFFFFF']
const BRUSH_SIZES = [3, 8, 16]
const GAME_DURATION = 60

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default function PromptOffGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'

  // Connection
  const [phase, setPhase] = useState('lobby')
  const [isHost, setIsHost] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const [opponentName, setOpponentName] = useState('Opponent')
  const [copied, setCopied] = useState(false)

  // Game
  const [targetPrompt, setTargetPrompt] = useState('')
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [countdownNum, setCountdownNum] = useState(3)
  const [myPromptText, setMyPromptText] = useState('')
  const [myLiveUrl, setMyLiveUrl] = useState(null)
  const [opponentLiveUrl, setOpponentLiveUrl] = useState(null)
  const [myFinalUrl, setMyFinalUrl] = useState(null)
  const [myFinalPrompt, setMyFinalPrompt] = useState('')
  const [opponentFinalUrl, setOpponentFinalUrl] = useState(null)
  const [opponentFinalPrompt, setOpponentFinalPrompt] = useState('')

  // Drawing
  const [brushColor, setBrushColor] = useState('#1A1A2E')
  const [brushSize, setBrushSize] = useState(8)
  const [isDrawingActive, setIsDrawingActive] = useState(false)

  // Voting
  const [myVote, setMyVote] = useState(null)
  const [opponentVote, setOpponentVote] = useState(null)

  // Refs
  const peerRef = useRef(null)
  const connRef = useRef(null)
  const canvasRef = useRef(null)
  const opponentCanvasRef = useRef(null)
  const timerRef = useRef(null)
  const lastPointRef = useRef(null)
  const phaseRef = useRef(phase)
  const realtimeRef = useRef(null)
  const generateDebounceRef = useRef(null)
  const generatingRef = useRef(false)
  const pendingGenerateRef = useRef(false)
  const myPromptRef = useRef('')
  const scoredRef = useRef(false)

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { myPromptRef.current = myPromptText }, [myPromptText])

  // ---------- PEER MESSAGING ----------

  const send = useCallback((data) => {
    if (connRef.current?.open) connRef.current.send(data)
  }, [])

  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'hello':
        setOpponentName(msg.name)
        break
      case 'start':
        setTargetPrompt(msg.prompt)
        setPhase('countdown')
        break
      case 'canvas':
        loadImageToCanvas(opponentCanvasRef.current, msg.data)
        break
      case 'live':
        setOpponentLiveUrl(msg.url)
        break
      case 'final':
        setOpponentFinalUrl(msg.url)
        setOpponentFinalPrompt(msg.prompt)
        break
      case 'vote':
        setOpponentVote(msg.vote)
        break
      case 'rematch':
        resetGame()
        break
      default:
        break
    }
  }, [])

  function loadImageToCanvas(canvas, dataUrl) {
    if (!canvas) return
    const img = new Image()
    img.onload = () => {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
    img.src = dataUrl
  }

  const setupConn = useCallback((conn) => {
    connRef.current = conn
    conn.on('open', () => {
      setConnected(true)
      conn.send({ type: 'hello', name: username })
    })
    conn.on('data', handleMessage)
    conn.on('close', () => {
      setConnected(false)
      if (phaseRef.current === 'playing' || phaseRef.current === 'countdown') {
        setError('Opponent disconnected!')
        setPhase('lobby')
        cleanupPeer()
      }
    })
    conn.on('error', () => setError('Connection error. Try again.'))
  }, [username, handleMessage])

  function cleanupPeer() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (realtimeRef.current) { try { realtimeRef.current.close() } catch {} realtimeRef.current = null }
    if (generateDebounceRef.current) clearTimeout(generateDebounceRef.current)
    if (connRef.current) { connRef.current.close(); connRef.current = null }
    if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null }
    setConnected(false)
  }

  useEffect(() => () => cleanupPeer(), [])

  // ---------- ROOM CREATION / JOINING ----------

  function createRoom() {
    setError(null)
    const code = generateRoomCode()
    setRoomCode(code)
    setIsHost(true)
    setPhase('waiting')
    const peer = new Peer(`promptoff-${code}`)
    peerRef.current = peer
    peer.on('connection', (conn) => setupConn(conn))
    peer.on('error', (err) => {
      setError(err.type === 'unavailable-id' ? 'Room code taken. Try again.' : 'Connection failed. Check your network.')
      setPhase('lobby')
      cleanupPeer()
    })
  }

  function joinRoom(e) {
    e.preventDefault()
    if (!joinCode.trim()) return
    setError(null)
    setIsHost(false)
    const peer = new Peer()
    peerRef.current = peer
    peer.on('open', () => {
      const conn = peer.connect(`promptoff-${joinCode.trim().toUpperCase()}`, { reliable: true })
      setupConn(conn)
      setPhase('waiting')
      setTimeout(() => {
        if (!connRef.current?.open) {
          setError('Could not connect. Check the room code.')
          setPhase('lobby')
          cleanupPeer()
        }
      }, 10000)
    })
    peer.on('error', () => {
      setError('Could not connect. Check the room code.')
      setPhase('lobby')
      cleanupPeer()
    })
  }

  function startGame() {
    const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)]
    setTargetPrompt(prompt)
    send({ type: 'start', prompt })
    setPhase('countdown')
  }

  // ---------- COUNTDOWN ----------

  useEffect(() => {
    if (phase !== 'countdown') return
    setCountdownNum(3)
    const interval = setInterval(() => {
      setCountdownNum(prev => {
        if (prev <= 1) { clearInterval(interval); setPhase('playing'); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [phase])

  // ---------- GAME TIMER ----------

  useEffect(() => {
    if (phase !== 'playing') return
    setTimeLeft(GAME_DURATION)
    // Canvas may be inside a collapsed <details>, init when available
    const initWhenReady = () => {
      if (canvasRef.current) initCanvas(canvasRef.current)
      if (opponentCanvasRef.current) initCanvas(opponentCanvasRef.current)
    }
    initWhenReady()
    // Also observe for when canvas becomes available (details opened)
    const observer = new MutationObserver(initWhenReady)
    observer.observe(document.body, { childList: true, subtree: true })
    scoredRef.current = false

    // Try to set up real-time connection
    try {
      realtimeRef.current = connectRealtime(
        (url) => {
          setMyLiveUrl(url)
          send({ type: 'live', url })
        },
        () => { /* errors handled silently for realtime */ }
      )
    } catch {
      // Realtime not available — fallback to debounced generation
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleTimeUp()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      observer.disconnect()
      if (timerRef.current) clearInterval(timerRef.current)
      if (realtimeRef.current) { try { realtimeRef.current.close() } catch {} realtimeRef.current = null }
      if (generateDebounceRef.current) clearTimeout(generateDebounceRef.current)
    }
  }, [phase])

  function initCanvas(canvas) {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  // ---------- REAL-TIME GENERATION ----------

  function isCanvasBlank(canvas) {
    if (!canvas) return true
    const ctx = canvas.getContext('2d')
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    // Check a sample of pixels — if all white, canvas is blank
    for (let i = 0; i < data.length; i += 400) {
      if (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250) return false
    }
    return true
  }

  function triggerRealtimeGeneration() {
    if (phaseRef.current !== 'playing') return
    const canvas = canvasRef.current
    const prompt = myPromptRef.current.trim()
    if (!prompt && (!canvas || isCanvasBlank(canvas))) return

    const blank = isCanvasBlank(canvas)

    // If canvas has drawing, use image-to-image with realtime connection
    if (!blank && canvas) {
      const canvasData = canvas.toDataURL('image/jpeg', 0.5)
      if (realtimeRef.current) {
        try {
          realtimeRef.current.send({
            prompt: prompt || 'abstract shapes',
            image_url: canvasData,
            strength: 0.65,
            num_inference_steps: 4,
            guidance_scale: 1,
            seed: 42,
          })
          return
        } catch {
          // Fall through to debounced approach
        }
      }
    }

    // Debounced generation — text-to-image if canvas blank, image-to-image otherwise
    if (generateDebounceRef.current) clearTimeout(generateDebounceRef.current)
    generateDebounceRef.current = setTimeout(async () => {
      if (generatingRef.current) { pendingGenerateRef.current = true; return }
      generatingRef.current = true
      try {
        let url
        if (blank || !canvas) {
          // Pure text-to-image
          url = await generateImage(prompt || 'abstract art')
        } else {
          const canvasData = canvas.toDataURL('image/jpeg', 0.5)
          url = await generateFromSketch(prompt || 'abstract shapes', canvasData)
        }
        if (phaseRef.current === 'playing') {
          setMyLiveUrl(url)
          send({ type: 'live', url })
        }
      } catch { /* ignore preview errors */ }
      generatingRef.current = false
      if (pendingGenerateRef.current) {
        pendingGenerateRef.current = false
        triggerRealtimeGeneration()
      }
    }, 600)
  }

  // Re-trigger generation when prompt text changes — fast for real-time feel
  useEffect(() => {
    if (phase !== 'playing') return
    if (!myPromptText.trim()) return
    const timeout = setTimeout(() => triggerRealtimeGeneration(), 400)
    return () => clearTimeout(timeout)
  }, [myPromptText, phase])

  // ---------- TIME UP / SUBMIT ----------

  async function handleTimeUp() {
    if (realtimeRef.current) { try { realtimeRef.current.close() } catch {} realtimeRef.current = null }
    setPhase('generating')
    const promptText = myPromptRef.current.trim() || 'abstract art'
    setMyFinalPrompt(promptText)
    try {
      const canvas = canvasRef.current
      const canvasData = canvas ? canvas.toDataURL('image/jpeg', 0.6) : null
      let url
      if (canvasData) {
        url = await generateFromSketch(promptText, canvasData, { strength: 0.6 })
      } else {
        url = await generateImage(promptText)
      }
      setMyFinalUrl(url)
      send({ type: 'final', url, prompt: promptText })
    } catch {
      const fallback = myLiveUrl || ''
      setMyFinalUrl(fallback)
      send({ type: 'final', url: fallback, prompt: promptText })
    }
  }

  async function handleSubmitEarly() {
    if (!myPromptText.trim()) return
    if (timerRef.current) clearInterval(timerRef.current)
    if (realtimeRef.current) { try { realtimeRef.current.close() } catch {} realtimeRef.current = null }
    setPhase('generating')
    const promptText = myPromptText.trim()
    setMyFinalPrompt(promptText)
    try {
      const canvas = canvasRef.current
      const canvasData = canvas ? canvas.toDataURL('image/jpeg', 0.6) : null
      let url
      if (canvasData) {
        url = await generateFromSketch(promptText, canvasData, { strength: 0.6 })
      } else {
        url = await generateImage(promptText)
      }
      setMyFinalUrl(url)
      send({ type: 'final', url, prompt: promptText })
    } catch {
      const fallback = myLiveUrl || ''
      setMyFinalUrl(fallback)
      send({ type: 'final', url: fallback, prompt: promptText })
    }
  }

  // Move to judging when both finals are in
  useEffect(() => {
    if (myFinalUrl !== null && opponentFinalUrl !== null && (phase === 'generating' || phase === 'playing')) {
      setPhase('judging')
    }
  }, [myFinalUrl, opponentFinalUrl, phase])

  // ---------- CANVAS DRAWING ----------

  function getCanvasPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
  }

  function handleDrawStart(e) {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const pos = getCanvasPos(e, canvas)
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    lastPointRef.current = pos
    setIsDrawingActive(true)
  }

  function handleDrawMove(e) {
    e.preventDefault()
    if (!isDrawingActive) return
    const canvas = canvasRef.current
    if (!canvas) return
    const pos = getCanvasPos(e, canvas)
    const ctx = canvas.getContext('2d')
    ctx.strokeStyle = brushColor
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
    lastPointRef.current = pos
  }

  function handleDrawEnd(e) {
    if (e) e.preventDefault()
    if (!isDrawingActive) return
    setIsDrawingActive(false)
    const canvas = canvasRef.current
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.4)
      send({ type: 'canvas', data: dataUrl })
      triggerRealtimeGeneration()
    }
  }

  function clearCanvas() {
    initCanvas(canvasRef.current)
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.4)
    send({ type: 'canvas', data: dataUrl })
    triggerRealtimeGeneration()
  }

  // ---------- VOTING ----------

  function castVote(vote) {
    setMyVote(vote)
    send({ type: 'vote', vote })
  }

  function getWinner() {
    if (!myVote || !opponentVote) return null
    if (myVote === opponentVote) return myVote
    return 'tie'
  }

  function copyCode() {
    navigator.clipboard.writeText(roomCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function resetGame() {
    setPhase('waiting')
    setTargetPrompt('')
    setTimeLeft(GAME_DURATION)
    setMyPromptText('')
    setMyLiveUrl(null)
    setOpponentLiveUrl(null)
    setMyFinalUrl(null)
    setMyFinalPrompt('')
    setOpponentFinalUrl(null)
    setOpponentFinalPrompt('')
    setMyVote(null)
    setOpponentVote(null)
    scoredRef.current = false
  }

  function requestRematch() {
    send({ type: 'rematch' })
    resetGame()
  }

  const myRole = isHost ? 'host' : 'guest'
  const winner = getWinner()
  const iWon = winner === myRole
  const theyWon = winner && winner !== 'tie' && winner !== myRole

  // Score on result
  useEffect(() => {
    if (winner && phase === 'judging' && !scoredRef.current) {
      scoredRef.current = true
      const pts = iWon ? 200 : theyWon ? 50 : 100
      addScore(game.id, username, pts, { prompt: targetPrompt, result: winner })
    }
  }, [winner, phase])

  // ==================== RENDER ====================

  // LOBBY
  if (phase === 'lobby') {
    return (
      <div className="flex flex-col gap-6 max-w-lg mx-auto">
        <div className="brutalist-card p-8 text-center">
          <p className="text-5xl mb-4">🥊</p>
          <h3 className="text-2xl font-black text-navy uppercase mb-2">Prompt Off</h3>
          <p className="text-navy/50 text-sm font-medium mb-6">
            Head-to-head AI art battle! Draw and prompt in real-time to create
            the best image. Your canvas feeds the AI live — Krea-style.
          </p>

          {error && (
            <div className="p-3 bg-red-50 border-2 border-red-400 text-red-700 text-sm font-medium mb-4">{error}</div>
          )}

          <button onClick={createRoom}
            className="w-full py-4 bg-primary text-white font-black uppercase text-sm mb-4"
            style={{ border: '2px solid #1A1A2E' }}>
            Create Room
          </button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-navy/10" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-4 text-xs font-black text-navy/30 uppercase">or join</span></div>
          </div>

          <form onSubmit={joinRoom} className="flex gap-2">
            <input
              type="text" placeholder="ROOM CODE"
              value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={5}
              className="flex-1 px-4 py-3 text-center text-navy text-lg font-black uppercase tracking-widest focus:outline-none"
              style={{ border: '3px solid #1A1A2E' }}
            />
            <button type="submit" disabled={joinCode.length < 5}
              className="px-6 py-3 bg-accent text-navy font-black uppercase text-sm disabled:opacity-40"
              style={{ border: '2px solid #1A1A2E' }}>
              Join
            </button>
          </form>
        </div>
      </div>
    )
  }

  // WAITING
  if (phase === 'waiting') {
    return (
      <div className="flex flex-col gap-6 max-w-lg mx-auto">
        <div className="brutalist-card p-8 text-center">
          {isHost ? (
            <>
              <p className="text-4xl mb-4">📡</p>
              <h3 className="font-black text-navy uppercase mb-2">
                {connected ? 'Opponent Connected!' : 'Waiting for Opponent...'}
              </h3>
              <div className="flex items-center justify-center gap-2 my-6">
                <span className="text-3xl font-black text-primary tracking-[0.3em]">{roomCode}</span>
                <button onClick={copyCode} className="p-2 hover:bg-navy/5 transition-colors" title="Copy code">
                  {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-navy/40" />}
                </button>
              </div>
              <p className="text-navy/40 text-xs font-medium mb-6">Share this code with your opponent</p>
              {connected ? (
                <div className="space-y-3">
                  <p className="text-sm font-bold text-green-600">🟢 {opponentName} has joined!</p>
                  <button onClick={startGame}
                    className="w-full py-4 bg-accent text-navy font-black uppercase text-sm animate-pulse"
                    style={{ border: '2px solid #1A1A2E' }}>
                    Start Game!
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-navy/30 text-sm">
                  <div className="animate-spin rounded-full" style={{ width: 16, height: 16, border: '2px solid #1A1A2E33', borderTopColor: '#1A1A2E' }} />
                  <span className="font-medium">Listening for connections...</span>
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-4xl mb-4">{connected ? '🟢' : '🔌'}</p>
              <h3 className="font-black text-navy uppercase mb-2">{connected ? 'Connected!' : 'Connecting...'}</h3>
              <p className="text-sm text-navy/50 font-medium">
                {connected ? `Waiting for ${opponentName || 'host'} to start...` : `Connecting to room ${joinCode}...`}
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  // COUNTDOWN
  if (phase === 'countdown') {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
        <div className="text-center">
          <p className="text-8xl font-black text-primary mb-4 animate-bounce">
            {countdownNum > 0 ? countdownNum : 'GO!'}
          </p>
          <p className="text-navy/50 font-black uppercase text-sm">Get ready to draw & prompt!</p>
        </div>
      </div>
    )
  }

  // PLAYING
  if (phase === 'playing') {
    return (
      <div className="flex flex-col gap-3">
        {/* Target prompt + timer */}
        <div className="brutalist-card p-4 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-navy/40 uppercase mb-0.5">Recreate this</p>
            <p className="text-base font-black text-navy truncate">{targetPrompt}</p>
          </div>
          <div className={`flex items-center gap-1.5 text-3xl font-black ml-4 tabular-nums ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-navy'}`}>
            <Clock className="w-6 h-6" />
            {timeLeft}s
          </div>
        </div>

        {/* Two image boxes side by side, centered */}
        <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
          {/* YOUR SIDE */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-black text-accent uppercase text-center">You ({username})</p>

            {/* AI output — large square box */}
            {myLiveUrl ? (
              <div style={{ border: '3px solid #C8FF00', overflow: 'hidden' }}>
                <img src={myLiveUrl} alt="AI output" className="w-full"
                  style={{ aspectRatio: '1', objectFit: 'cover' }} />
              </div>
            ) : (
              <div className="flex items-center justify-center bg-white text-navy/20 text-sm font-bold uppercase"
                style={{ border: '3px solid #1A1A2E', aspectRatio: '1' }}>
                Type a prompt below to generate
              </div>
            )}

            {/* Prompt input — directly below the image box */}
            <div>
              <p className="text-xs font-black text-navy/40 uppercase mb-1">Your Prompt</p>
              <textarea
                value={myPromptText} onChange={(e) => setMyPromptText(e.target.value)}
                placeholder="Start typing... AI generates as you type!"
                rows={3}
                className="w-full px-4 py-3 text-navy text-base focus:outline-none font-semibold resize-none"
                style={{ border: '3px solid #1A1A2E', background: '#FFFFF0' }}
                autoFocus
              />
            </div>

            {/* Optional sketch canvas — collapsible helper */}
            <details className="group">
              <summary className="text-xs font-black text-navy/40 uppercase cursor-pointer hover:text-navy/60 select-none">
                + Sketch to guide the AI (optional)
              </summary>
              <div className="mt-2 flex flex-col gap-2">
                <div style={{ border: '3px solid #1A1A2E' }}>
                  <canvas
                    ref={canvasRef} width={512} height={512}
                    className="w-full cursor-crosshair touch-none"
                    style={{ display: 'block', background: '#fff', aspectRatio: '1' }}
                    onMouseDown={handleDrawStart} onMouseMove={handleDrawMove}
                    onMouseUp={handleDrawEnd} onMouseLeave={handleDrawEnd}
                    onTouchStart={handleDrawStart} onTouchMove={handleDrawMove}
                    onTouchEnd={handleDrawEnd}
                  />
                </div>
                {/* Tools */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {BRUSH_COLORS.map(c => (
                    <button key={c} onClick={() => setBrushColor(c)}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${brushColor === c ? 'border-primary scale-125' : 'border-navy/20'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                  <div className="w-px h-5 bg-navy/10 mx-0.5" />
                  {BRUSH_SIZES.map(s => (
                    <button key={s} onClick={() => setBrushSize(s)}
                      className={`flex items-center justify-center w-6 h-6 border-2 ${brushSize === s ? 'border-primary bg-primary/10' : 'border-navy/20'}`}>
                      <span className="rounded-full bg-navy" style={{ width: Math.min(s, 12), height: Math.min(s, 12) }} />
                    </button>
                  ))}
                  <button onClick={clearCanvas} className="ml-auto p-1 border-2 border-navy/20 hover:border-red-400 hover:bg-red-50" title="Clear">
                    <Trash2 className="w-3.5 h-3.5 text-navy/50" />
                  </button>
                </div>
              </div>
            </details>
          </div>

          {/* OPPONENT SIDE */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-black text-primary uppercase text-center">Opponent ({opponentName})</p>

            {/* Opponent AI output — large square box, matching yours */}
            {opponentLiveUrl ? (
              <div style={{ border: '3px solid #FF2D55', overflow: 'hidden' }}>
                <img src={opponentLiveUrl} alt="Opponent AI" className="w-full"
                  style={{ aspectRatio: '1', objectFit: 'cover' }} />
              </div>
            ) : (
              <div className="flex items-center justify-center bg-white text-navy/20 text-sm font-bold uppercase"
                style={{ border: '3px solid #1A1A2E', aspectRatio: '1' }}>
                Waiting for opponent...
              </div>
            )}

            {/* Opponent prompt — hidden, but matches layout */}
            <div>
              <p className="text-xs font-black text-navy/40 uppercase mb-1">Their Prompt</p>
              <div className="px-4 py-3 bg-navy/5 text-navy/30 text-base font-medium"
                style={{ border: '3px solid #1A1A2E22', minHeight: '5.5rem' }}>
                Hidden until judging...
              </div>
            </div>

            {/* Opponent sketch — smaller */}
            <details className="group">
              <summary className="text-xs font-black text-navy/40 uppercase cursor-pointer hover:text-navy/60 select-none">
                + View opponent's sketch
              </summary>
              <div className="mt-2">
                <div className="relative" style={{ border: '3px solid #1A1A2E' }}>
                  <canvas
                    ref={opponentCanvasRef} width={512} height={512}
                    className="w-full"
                    style={{ display: 'block', background: '#fff', aspectRatio: '1' }}
                  />
                  <div className="absolute inset-0" />
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Submit early */}
        <button onClick={handleSubmitEarly} disabled={!myPromptText.trim()}
          className="w-full py-3 bg-navy text-white font-black uppercase text-sm disabled:opacity-40"
          style={{ border: '2px solid #1A1A2E' }}>
          Submit Final Image Early
        </button>
      </div>
    )
  }

  // GENERATING
  if (phase === 'generating') {
    return (
      <div className="flex flex-col gap-6 max-w-lg mx-auto">
        <div className="brutalist-card p-12 text-center">
          <div className="animate-spin rounded-full mx-auto mb-4"
            style={{ width: 48, height: 48, border: '4px solid #1A1A2E', borderTopColor: 'transparent' }} />
          <h3 className="font-black text-navy uppercase mb-2">Time's Up!</h3>
          <p className="text-navy/50 text-sm font-medium">
            {myFinalUrl ? 'Your image is ready! Waiting for opponent...' : 'Generating your final image...'}
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <span className={`text-xs font-black uppercase ${myFinalUrl ? 'text-green-600' : 'text-navy/30'}`}>
              {myFinalUrl ? '✓ You' : '⏳ You'}
            </span>
            <span className={`text-xs font-black uppercase ${opponentFinalUrl ? 'text-green-600' : 'text-navy/30'}`}>
              {opponentFinalUrl ? `✓ ${opponentName}` : `⏳ ${opponentName}`}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // JUDGING
  if (phase === 'judging') {
    return (
      <div className="flex flex-col gap-4">
        <div className="brutalist-card p-4 text-center">
          <p className="text-xs font-black text-navy/40 uppercase mb-1">The prompt was</p>
          <p className="text-lg font-black text-navy">"{targetPrompt}"</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-black text-accent uppercase">You ({username})</p>
            {myFinalUrl ? (
              <div style={{ border: '3px solid #C8FF00', overflow: 'hidden' }}>
                <img src={myFinalUrl} alt="Your final" className="w-full" />
              </div>
            ) : (
              <div className="flex items-center justify-center bg-navy/5 text-navy/30 text-sm font-bold"
                style={{ border: '3px solid #1A1A2E22', minHeight: 200 }}>No image</div>
            )}
            <p className="text-xs text-navy/50 font-medium">
              Prompt: <span className="text-navy font-bold">{myFinalPrompt}</span>
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-black text-primary uppercase">{opponentName}</p>
            {opponentFinalUrl ? (
              <div style={{ border: '3px solid #FF2D55', overflow: 'hidden' }}>
                <img src={opponentFinalUrl} alt="Opponent final" className="w-full" />
              </div>
            ) : (
              <div className="flex items-center justify-center bg-navy/5 text-navy/30 text-sm font-bold"
                style={{ border: '3px solid #1A1A2E22', minHeight: 200 }}>No image</div>
            )}
            <p className="text-xs text-navy/50 font-medium">
              Prompt: <span className="text-navy font-bold">{opponentFinalPrompt}</span>
            </p>
          </div>
        </div>

        {/* Voting */}
        {!myVote ? (
          <div className="brutalist-card p-6 text-center">
            <p className="text-xs font-black text-navy/40 uppercase mb-3">Which image better matches the prompt?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => castVote(myRole)}
                className="flex-1 max-w-[200px] py-3 bg-accent text-navy font-black uppercase text-sm"
                style={{ border: '2px solid #1A1A2E' }}>
                Mine
              </button>
              <button onClick={() => castVote(isHost ? 'guest' : 'host')}
                className="flex-1 max-w-[200px] py-3 bg-primary text-white font-black uppercase text-sm"
                style={{ border: '2px solid #1A1A2E' }}>
                {opponentName}'s
              </button>
            </div>
          </div>
        ) : !winner ? (
          <div className="brutalist-card p-6 text-center">
            <p className="text-sm font-bold text-navy/50">You voted! Waiting for {opponentName}...</p>
          </div>
        ) : (
          <div className="brutalist-card p-8 text-center">
            <Trophy className={`w-12 h-12 mx-auto mb-3 ${iWon ? 'text-yellow-500' : theyWon ? 'text-navy/30' : 'text-navy/50'}`} />
            <h3 className="text-2xl font-black text-navy uppercase mb-2">
              {winner === 'tie' ? "It's a Tie!" : iWon ? 'You Win!' : `${opponentName} Wins!`}
            </h3>
            <p className="text-3xl font-black text-primary mb-1">
              +{iWon ? 200 : theyWon ? 50 : 100} pts
            </p>
            <p className="text-navy/40 text-xs font-medium mb-6">
              {winner === 'tie' ? 'Agree to disagree!' : 'Both players agreed on the winner!'}
            </p>
            {connected && (
              <button onClick={requestRematch}
                className="px-8 py-3 bg-accent text-navy font-black uppercase text-sm"
                style={{ border: '2px solid #1A1A2E' }}>
                Rematch!
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return null
}

import { useState, useEffect, useRef, useCallback } from 'react'
import Peer from 'peerjs'
import { generateFromSketch, connectRealtime, generateImage } from '../lib/fal'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { Copy, Check, Trash2, Clock, Trophy } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

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

  // Voting (audience)
  const [voteRoomCode, setVoteRoomCode] = useState('')
  const [audienceVotes, setAudienceVotes] = useState({ A: 0, B: 0 })
  const [audienceCount, setAudienceCount] = useState(0)
  const [votingClosed, setVotingClosed] = useState(false)

  // Legacy voting (kept for peer message compat)
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
  const votePeerRef = useRef(null)
  const voteConnectionsRef = useRef([])
  const audienceVotesRef = useRef({ A: 0, B: 0 })

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
      case 'vote-room':
        setVoteRoomCode(msg.code)
        break
      case 'vote-results':
        setAudienceVotes({ A: msg.votesA, B: msg.votesB })
        setVotingClosed(true)
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
      const p = phaseRef.current
      if (p === 'playing' || p === 'countdown') {
        setError('Opponent disconnected!')
        setPhase('lobby')
        cleanupPeer()
      } else if (p === 'generating') {
        setError('Opponent disconnected during image generation. Results may be incomplete.')
      } else if (p === 'voting') {
        setError('Opponent disconnected. Voting continues with audience votes.')
      }
    })
    conn.on('error', (err) => {
      console.warn('PeerJS connection error:', err)
      setError('Connection error. Try again.')
    })
  }, [username, handleMessage])

  function cleanupPeer() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (realtimeRef.current) { try { realtimeRef.current.close() } catch {} realtimeRef.current = null }
    if (generateDebounceRef.current) clearTimeout(generateDebounceRef.current)
    if (connRef.current) { connRef.current.close(); connRef.current = null }
    if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null }
    if (votePeerRef.current) { votePeerRef.current.destroy(); votePeerRef.current = null }
    voteConnectionsRef.current = []
    setConnected(false)
  }

  useEffect(() => () => cleanupPeer(), [])

  // ---------- ROOM CREATION / JOINING ----------

  const hostRetryRef = useRef(0)
  const HOST_MAX_RETRIES = 2

  function createRoom() {
    hostRetryRef.current = 0
    const code = generateRoomCode()
    setRoomCode(code)
    attemptCreateRoom(code)
  }

  function attemptCreateRoom(code) {
    setError(null)
    setIsHost(true)
    setPhase('waiting')
    // Clean up any previous peer without resetting phase
    if (connRef.current) { connRef.current.close(); connRef.current = null }
    if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null }

    const peer = new Peer(`promptoff-${code}`)
    peerRef.current = peer
    peer.on('open', () => {
      hostRetryRef.current = 0 // Reset retries on successful connection to signaling server
    })
    peer.on('connection', (conn) => setupConn(conn))
    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // Room code collision — generate a new code and retry
        const newCode = generateRoomCode()
        setRoomCode(newCode)
        attemptCreateRoom(newCode)
        return
      }
      if (hostRetryRef.current < HOST_MAX_RETRIES) {
        hostRetryRef.current++
        setError(`Connection failed. Retrying... (attempt ${hostRetryRef.current + 1})`)
        const delay = 1000 * Math.pow(2, hostRetryRef.current - 1)
        setTimeout(() => attemptCreateRoom(code), delay)
      } else {
        setError('Could not create room. Check your network and try again.')
        setPhase('lobby')
        cleanupPeer()
      }
    })
  }

  const joinRetryRef = useRef(0)
  const JOIN_MAX_RETRIES = 2

  function joinRoom(e) {
    e.preventDefault()
    if (!joinCode.trim()) return
    joinRetryRef.current = 0
    attemptJoin(joinCode.trim().toUpperCase())
  }

  function attemptJoin(code) {
    setError(null)
    setIsHost(false)
    setPhase('waiting')
    // Clean up previous peer without full state reset
    if (connRef.current) { connRef.current.close(); connRef.current = null }
    if (peerRef.current) { peerRef.current.destroy(); peerRef.current = null }

    const peer = new Peer()
    peerRef.current = peer
    peer.on('open', () => {
      const conn = peer.connect(`promptoff-${code}`, { reliable: true })
      setupConn(conn)
      setTimeout(() => {
        if (!connRef.current?.open) {
          if (joinRetryRef.current < JOIN_MAX_RETRIES) {
            joinRetryRef.current++
            setError(`Retrying connection... (attempt ${joinRetryRef.current + 1})`)
            const delay = 1000 * Math.pow(2, joinRetryRef.current - 1)
            setTimeout(() => attemptJoin(code), delay)
          } else {
            setError('Could not connect. Check the room code and try again.')
            setPhase('lobby')
            cleanupPeer()
          }
        }
      }, 8000)
    })
    peer.on('error', (err) => {
      // peer-unavailable = room doesn't exist, no point retrying
      if (err.type === 'peer-unavailable') {
        setError('Room not found. Check the code and make sure the host is waiting.')
        setPhase('lobby')
        cleanupPeer()
        return
      }
      if (joinRetryRef.current < JOIN_MAX_RETRIES) {
        joinRetryRef.current++
        setError(`Connection failed. Retrying... (attempt ${joinRetryRef.current + 1})`)
        const delay = 1000 * Math.pow(2, joinRetryRef.current - 1)
        setTimeout(() => attemptJoin(code), delay)
      } else {
        setError('Could not connect. Check the room code and try again.')
        setPhase('lobby')
        cleanupPeer()
      }
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
        (err) => {
          console.warn('Realtime generation error:', err)
          // Realtime failed — debounced generation will be used as fallback
          realtimeRef.current = null
        }
      )
    } catch {
      // Realtime not available — fallback to debounced generation
      console.warn('Realtime connection unavailable, using debounced generation')
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

  // Move to voting when both finals are in, or after timeout
  useEffect(() => {
    if (phase !== 'generating') return
    if (myFinalUrl !== null && opponentFinalUrl !== null) {
      setPhase('voting')
      return
    }
    // Timeout: after 15s, move to voting with whatever we have
    const timeout = setTimeout(() => {
      if (phaseRef.current === 'generating') {
        // Use live URLs as fallback for missing finals
        if (!myFinalUrl) {
          const fallback = myLiveUrl || ''
          setMyFinalUrl(fallback)
          setMyFinalPrompt(myPromptRef.current.trim() || 'No prompt')
          send({ type: 'final', url: fallback, prompt: myPromptRef.current.trim() || 'No prompt' })
        }
        if (!opponentFinalUrl && opponentLiveUrl) {
          setOpponentFinalUrl(opponentLiveUrl)
          setOpponentFinalPrompt('(timed out)')
        }
        setPhase('voting')
      }
    }, 15000)
    return () => clearTimeout(timeout)
  }, [myFinalUrl, opponentFinalUrl, phase, myLiveUrl, opponentLiveUrl])

  // ---------- AUDIENCE VOTING ROOM ----------

  useEffect(() => {
    if (phase !== 'voting') return
    // Only the host creates the voting room
    if (!isHost) return

    // Use a fresh code for the voting room to avoid PeerJS ID conflicts
    const code = generateRoomCode()
    setVoteRoomCode(code)
    setAudienceVotes({ A: 0, B: 0 })
    setAudienceCount(0)
    setVotingClosed(false)
    audienceVotesRef.current = { A: 0, B: 0 }
    voteConnectionsRef.current = []

    const votePeer = new Peer(`promptoff-vote-${code}`)
    votePeerRef.current = votePeer

    votePeer.on('connection', (conn) => {
      voteConnectionsRef.current.push(conn)
      setAudienceCount(prev => prev + 1)

      conn.on('open', () => {
        // Send the vote data to the new viewer
        conn.send({
          type: 'vote-data',
          prompt: targetPrompt,
          imageA: myFinalUrl || myLiveUrl || '',
          imageB: opponentFinalUrl || opponentLiveUrl || '',
          labelA: username,
          labelB: opponentName,
        })
      })

      conn.on('data', (msg) => {
        if (msg.type === 'vote' && (msg.vote === 'A' || msg.vote === 'B')) {
          audienceVotesRef.current[msg.vote]++
          setAudienceVotes({ ...audienceVotesRef.current })
        }
      })

      conn.on('close', () => {
        voteConnectionsRef.current = voteConnectionsRef.current.filter(c => c !== conn)
        setAudienceCount(prev => Math.max(0, prev - 1))
      })
    })

    votePeer.on('error', (err) => {
      console.warn('Vote peer error:', err)
      setError('Voting room failed to start. Audience voting may not work.')
    })

    // Also tell the opponent the vote room code
    send({ type: 'vote-room', code })

    return () => {
      if (votePeerRef.current) { votePeerRef.current.destroy(); votePeerRef.current = null }
      voteConnectionsRef.current = []
    }
  }, [phase])

  function broadcastResults() {
    const results = { votesA: audienceVotes.A, votesB: audienceVotes.B }
    // Send to all audience viewers
    voteConnectionsRef.current.forEach(conn => {
      if (conn.open) conn.send({ type: 'vote-results', results })
    })
    // Send to the opponent (guest) via game connection
    send({ type: 'vote-results', votesA: audienceVotes.A, votesB: audienceVotes.B })
    setVotingClosed(true)
  }

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
    setVoteRoomCode('')
    setAudienceVotes({ A: 0, B: 0 })
    setAudienceCount(0)
    setVotingClosed(false)
    audienceVotesRef.current = { A: 0, B: 0 }
    if (votePeerRef.current) { votePeerRef.current.destroy(); votePeerRef.current = null }
    voteConnectionsRef.current = []
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

  // Score on audience vote result
  // A = host's image, B = guest's image
  const myAudienceVotes = isHost ? audienceVotes.A : audienceVotes.B
  const theirAudienceVotes = isHost ? audienceVotes.B : audienceVotes.A
  const iWonAudience = votingClosed && myAudienceVotes > theirAudienceVotes
  const theyWonAudience = votingClosed && theirAudienceVotes > myAudienceVotes
  const audienceTie = votingClosed && myAudienceVotes === theirAudienceVotes
  const myPoints = iWonAudience ? 200 : theyWonAudience ? 50 : 100

  useEffect(() => {
    if (votingClosed && !scoredRef.current) {
      scoredRef.current = true
      const result = iWonAudience ? 'win' : theyWonAudience ? 'loss' : 'tie'
      addScore(game.id, username, myPoints, { prompt: targetPrompt, result, myVotes: myAudienceVotes, theirVotes: theirAudienceVotes })
    }
  }, [votingClosed])

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
            <div style={{ border: '3px solid #C8FF00', aspectRatio: '1', overflow: 'hidden', position: 'relative' }}>
              {myLiveUrl ? (
                <img src={myLiveUrl} alt="AI output" className="w-full h-full"
                  style={{ objectFit: 'cover', display: 'block' }} />
              ) : (
                <div className="flex items-center justify-center bg-white text-navy/20 text-sm font-bold uppercase w-full h-full">
                  Type a prompt below
                </div>
              )}
            </div>

            {/* Prompt input — directly below the image box */}
            <div>
              <p className="text-xs font-black text-accent uppercase mb-1">Your Prompt</p>
              <textarea
                value={myPromptText} onChange={(e) => setMyPromptText(e.target.value)}
                placeholder="Start typing... AI generates as you type!"
                rows={3}
                className="w-full px-4 py-3 text-base focus:outline-none font-semibold resize-none rounded-none"
                style={{ border: '3px solid #C8FF00', background: '#ffffff', color: '#1A1A2E' }}
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
            <div style={{ border: '3px solid #FF2D55', aspectRatio: '1', overflow: 'hidden', position: 'relative' }}>
              {opponentLiveUrl ? (
                <img src={opponentLiveUrl} alt="Opponent AI" className="w-full h-full"
                  style={{ objectFit: 'cover', display: 'block' }} />
              ) : (
                <div className="flex items-center justify-center bg-white text-navy/20 text-sm font-bold uppercase w-full h-full">
                  Waiting for opponent...
                </div>
              )}
            </div>

            {/* Opponent prompt — hidden, matches layout */}
            <div>
              <p className="text-xs font-black text-primary uppercase mb-1">Their Prompt</p>
              <div className="px-4 py-3 text-white/30 text-base font-medium italic"
                style={{ border: '3px solid #FF2D55', background: 'rgba(255,45,85,0.08)', minHeight: '5.5rem' }}>
                Hidden until voting...
              </div>
            </div>

            {/* Hidden canvas for receiving opponent sketch data */}
            <canvas ref={opponentCanvasRef} width={512} height={512} style={{ display: 'none' }} />
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

  // GENERATING — show both live outputs while finals are being created
  if (phase === 'generating') {
    return (
      <div className="flex flex-col gap-4">
        <div className="brutalist-card p-4 text-center">
          <h3 className="font-black text-navy uppercase mb-1">Time's Up!</h3>
          <p className="text-navy/50 text-sm font-medium">Generating final images...</p>
          <div className="flex justify-center gap-6 mt-3">
            <span className={`text-xs font-black uppercase ${myFinalUrl ? 'text-green-600' : 'text-navy/30 animate-pulse'}`}>
              {myFinalUrl ? '✓ You' : '⏳ You'}
            </span>
            <span className={`text-xs font-black uppercase ${opponentFinalUrl ? 'text-green-600' : 'text-navy/30 animate-pulse'}`}>
              {opponentFinalUrl ? `✓ ${opponentName}` : `⏳ ${opponentName}`}
            </span>
          </div>
        </div>

        {/* Show both live outputs side by side while waiting */}
        <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-black text-accent uppercase text-center">You ({username})</p>
            <div style={{ border: '3px solid #C8FF00', aspectRatio: '1', overflow: 'hidden' }}>
              {(myFinalUrl || myLiveUrl) ? (
                <img src={myFinalUrl || myLiveUrl} alt="Your output" className="w-full h-full"
                  style={{ objectFit: 'cover', display: 'block' }} />
              ) : (
                <div className="flex items-center justify-center bg-white text-navy/20 text-sm font-bold uppercase w-full h-full">
                  Generating...
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-black text-primary uppercase text-center">{opponentName}</p>
            <div style={{ border: '3px solid #FF2D55', aspectRatio: '1', overflow: 'hidden' }}>
              {(opponentFinalUrl || opponentLiveUrl) ? (
                <img src={opponentFinalUrl || opponentLiveUrl} alt="Opponent output" className="w-full h-full"
                  style={{ objectFit: 'cover', display: 'block' }} />
              ) : (
                <div className="flex items-center justify-center bg-white text-navy/20 text-sm font-bold uppercase w-full h-full">
                  Waiting...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // VOTING — audience votes via QR code, players see results live
  if (phase === 'voting' || phase === 'judging') {
    const totalVotes = audienceVotes.A + audienceVotes.B
    const pctA = totalVotes > 0 ? Math.round((audienceVotes.A / totalVotes) * 100) : 0
    const pctB = totalVotes > 0 ? Math.round((audienceVotes.B / totalVotes) * 100) : 0
    // A = host, B = guest — map to "my" and "their" perspective
    const hostName = isHost ? username : opponentName
    const guestName = isHost ? opponentName : username
    const voteUrl = voteRoomCode ? `${window.location.origin}/vote/${voteRoomCode}` : ''

    return (
      <div className="flex flex-col gap-4">
        {/* Header with prompt */}
        <div className="brutalist-card p-4 text-center">
          <p className="text-[10px] font-black text-navy/40 uppercase mb-0.5">The prompt was</p>
          <p className="text-lg font-black text-navy">"{targetPrompt}"</p>
        </div>

        {/* Both outputs side by side */}
        {(() => {
          // A = host, B = guest. Map to "my" and "their" for correct display
          const myVotes = isHost ? audienceVotes.A : audienceVotes.B
          const theirVotes = isHost ? audienceVotes.B : audienceVotes.A
          const myPct = totalVotes > 0 ? Math.round((myVotes / totalVotes) * 100) : 0
          const theirPct = totalVotes > 0 ? Math.round((theirVotes / totalVotes) * 100) : 0
          return (
            <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
              {/* Your image */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-black text-accent uppercase text-center">{username}</p>
                <div style={{ border: `3px solid ${votingClosed && myVotes >= theirVotes ? '#C8FF00' : '#333'}`, aspectRatio: '1', overflow: 'hidden', position: 'relative' }}>
                  {myFinalUrl ? (
                    <img src={myFinalUrl} alt="Your final" className="w-full h-full" style={{ objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div className="flex items-center justify-center bg-white text-navy/20 text-sm font-bold uppercase w-full h-full">No image</div>
                  )}
                  {votingClosed && myVotes > theirVotes && (
                    <div className="absolute top-2 left-2 px-2 py-1 text-xs font-black uppercase"
                      style={{ background: '#C8FF00', color: '#1A1A2E' }}>Winner</div>
                  )}
                </div>
                <p className="text-xs text-white/50 font-medium text-center">
                  <span className="text-white font-bold">{myFinalPrompt}</span>
                </p>
                {totalVotes > 0 && (
                  <div className="w-full h-8 relative" style={{ border: '2px solid #C8FF00', background: '#1a1a2e' }}>
                    <div className="h-full transition-all duration-700" style={{ width: `${myPct}%`, background: '#C8FF00' }} />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-black"
                      style={{ color: myPct > 50 ? '#1A1A2E' : '#C8FF00' }}>
                      {myPct}% ({myVotes})
                    </span>
                  </div>
                )}
              </div>

              {/* Opponent's image */}
              <div className="flex flex-col gap-2">
                <p className="text-sm font-black text-primary uppercase text-center">{opponentName}</p>
                <div style={{ border: `3px solid ${votingClosed && theirVotes >= myVotes ? '#FF2D55' : '#333'}`, aspectRatio: '1', overflow: 'hidden', position: 'relative' }}>
                  {opponentFinalUrl ? (
                    <img src={opponentFinalUrl} alt="Opponent final" className="w-full h-full" style={{ objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <div className="flex items-center justify-center bg-white text-navy/20 text-sm font-bold uppercase w-full h-full">No image</div>
                  )}
                  {votingClosed && theirVotes > myVotes && (
                    <div className="absolute top-2 left-2 px-2 py-1 text-xs font-black uppercase"
                      style={{ background: '#FF2D55', color: '#fff' }}>Winner</div>
                  )}
                </div>
                <p className="text-xs text-white/50 font-medium text-center">
                  <span className="text-white font-bold">{opponentFinalPrompt}</span>
                </p>
                {totalVotes > 0 && (
                  <div className="w-full h-8 relative" style={{ border: '2px solid #FF2D55', background: '#1a1a2e' }}>
                    <div className="h-full transition-all duration-700" style={{ width: `${theirPct}%`, background: '#FF2D55' }} />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-black"
                      style={{ color: theirPct > 50 ? '#fff' : '#FF2D55' }}>
                      {theirPct}% ({theirVotes})
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* QR Code + Audience voting panel */}
        {!votingClosed ? (
          <div className="brutalist-card p-6 text-center">
            <p className="text-sm font-black text-navy uppercase mb-1">Audience Vote</p>
            <p className="text-xs text-navy/40 font-medium mb-4">Scan to vote for your favorite!</p>

            {voteUrl ? (
              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-3 inline-block" style={{ borderRadius: 8 }}>
                  <QRCodeSVG value={voteUrl} size={180} level="M"
                    fgColor="#1A1A2E" bgColor="#ffffff" />
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-white/60 font-mono bg-white/10 px-3 py-1.5"
                    style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                    {voteUrl}
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(voteUrl); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                    className="p-1.5 hover:bg-white/10 transition-colors" title="Copy link">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/40" />}
                  </button>
                </div>

                <div className="flex items-center gap-3 text-white/50 text-sm font-bold mt-2">
                  <span>{audienceCount} viewer{audienceCount !== 1 ? 's' : ''} connected</span>
                  <span>|</span>
                  <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''} cast</span>
                </div>

                {isHost && totalVotes > 0 && (
                  <button onClick={broadcastResults}
                    className="mt-2 px-8 py-3 font-black uppercase text-sm transition-transform hover:scale-105"
                    style={{ border: '3px solid #C8FF00', background: 'rgba(200,255,0,0.15)', color: '#C8FF00' }}>
                    Close Voting & Reveal Results
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-white/30 text-sm">
                <div className="animate-spin rounded-full"
                  style={{ width: 16, height: 16, border: '2px solid #ffffff33', borderTopColor: '#C8FF00' }} />
                <span>Setting up vote room...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="brutalist-card p-8 text-center">
            <Trophy className={`w-14 h-14 mx-auto mb-3 ${iWonAudience ? 'text-yellow-500' : theyWonAudience ? 'text-navy/30' : 'text-navy/50'}`} />
            <h3 className="text-3xl font-black text-navy uppercase mb-2">
              {audienceTie ? "It's a Tie!" : iWonAudience ? 'You Win!' : `${opponentName} Wins!`}
            </h3>
            <p className="text-white/40 text-sm font-medium mb-1">
              {totalVotes} vote{totalVotes !== 1 ? 's' : ''} from the audience
            </p>
            <p className="text-lg font-bold text-white/60 mb-2">
              {hostName}: {audienceVotes.A} vote{audienceVotes.A !== 1 ? 's' : ''} — {guestName}: {audienceVotes.B} vote{audienceVotes.B !== 1 ? 's' : ''}
            </p>
            <p className="text-4xl font-black mb-1" style={{ color: iWonAudience ? '#C8FF00' : theyWonAudience ? '#FF2D55' : '#fff' }}>
              +{myPoints} pts
            </p>
            <p className="text-navy/40 text-xs font-medium mb-6">
              {iWonAudience ? 'The audience chose you!' : theyWonAudience ? 'Better luck next time!' : 'The audience was split!'}
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

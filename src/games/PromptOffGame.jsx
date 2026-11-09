// Prompt Off: two players race to recreate a theme with live AI images,
// then the audience votes from their phones (VotePage at /vote/:code).
// Modules live in ./promptoff/ (protocol notes in constants.js).
import { useState, useRef, useEffect, useEffectEvent, useMemo } from 'react'
import { generateFromSketch, generateImage } from '../lib/fal'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { FINAL_WAIT_MS, matchResult, newEndsAt, pickPrompt } from './promptoff/constants'
import { useDuelConnection } from './promptoff/useDuelConnection'
import { useVoteRoom } from './promptoff/useVoteRoom'
import { useLiveGeneration } from './promptoff/useLiveGeneration'
import { useLatestRef } from './promptoff/useLatestRef'
import { useMatchClock } from './promptoff/useMatchClock'
import { LobbyView, WaitingView, CountdownView } from './promptoff/RoomViews'
import PlayingView from './promptoff/PlayingView'
import { GeneratingView, VotingView } from './promptoff/ResultViews'

const NO_VOTES = { A: 0, B: 0 }

export default function PromptOffGame({ game }) {
  const { user } = useAuth()
  const username = user?.username || 'guest'

  // lobby | waiting | countdown | playing | generating | voting
  const [phase, setPhase] = useState('lobby')
  const [isHost, setIsHost] = useState(false)
  const [opponentName, setOpponentName] = useState('Opponent')

  // One match (a rematch starts a new one)
  const [matchId, setMatchId] = useState(0)
  const [targetPrompt, setTargetPrompt] = useState('')
  const [endsAt, setEndsAt] = useState(0)
  const [myPrompt, setMyPrompt] = useState('')
  const [myLiveUrl, setMyLiveUrl] = useState(null)
  const [opponentLiveUrl, setOpponentLiveUrl] = useState(null)
  const [myFinalPrompt, setMyFinalPrompt] = useState('')
  const [myFinal, setMyFinal] = useState(null) // { url, prompt } once sent
  const [opponentFinal, setOpponentFinal] = useState(null)
  const [guestVoteCode, setGuestVoteCode] = useState('') // guest: the host's vote room
  const [guestVotes, setGuestVotes] = useState(null) // guest: results from the host

  const canvasRef = useRef(null)
  const hasDrawnRef = useRef(false)
  const scoredMatchRef = useRef(-1)
  const current = useLatestRef({ matchId, myLiveUrl })

  // ---------- CONNECTION ----------

  const duel = useDuelConnection({
    username,
    accepting: phase === 'waiting',
    onMessage: handleMessage,
    onClosed() {
      if (phase === 'playing' || phase === 'countdown' || (!isHost && phase === 'waiting')) {
        duel.leave(isHost ? 'Opponent disconnected!' : 'The host left the room.')
        setPhase('lobby')
      }
    },
    onFailed: () => setPhase('lobby'),
  })

  function handleMessage(msg) {
    switch (msg.type) {
      case 'hello':
        setOpponentName(String(msg.name || 'Opponent'))
        break
      case 'start':
        beginMatch(msg.prompt, msg.endsAt || newEndsAt())
        break
      case 'live':
        setOpponentLiveUrl(msg.url)
        break
      case 'final':
        setOpponentFinal({ url: msg.url || '', prompt: msg.prompt || '' })
        break
      case 'vote-room':
        setGuestVoteCode(msg.code)
        break
      case 'vote-results':
        if (!isHost && msg.results) {
          setGuestVotes({ A: msg.results.votesA || 0, B: msg.results.votesB || 0 })
          finishMatch({ A: msg.results.votesA || 0, B: msg.results.votesB || 0 })
        }
        break
      case 'rematch':
        resetMatch()
        break
      default:
        break
    }
  }

  function createRoom() {
    setIsHost(true)
    setPhase('waiting')
    duel.create()
  }

  function joinRoom(code) {
    setIsHost(false)
    setPhase('waiting')
    duel.join(code)
  }

  function leaveRoom() {
    duel.leave()
    resetMatch()
    setPhase('lobby')
  }

  // ---------- MATCH FLOW ----------

  function resetMatch() {
    setPhase('waiting')
    setTargetPrompt('')
    setMyPrompt('')
    setMyLiveUrl(null)
    setOpponentLiveUrl(null)
    setMyFinalPrompt('')
    setMyFinal(null)
    setOpponentFinal(null)
    setGuestVoteCode('')
    setGuestVotes(null)
    hasDrawnRef.current = false
  }

  function beginMatch(prompt, matchEndsAt) {
    resetMatch()
    setMatchId((m) => m + 1)
    setTargetPrompt(prompt)
    setEndsAt(matchEndsAt)
    setPhase('countdown')
  }

  function startGame() {
    const prompt = pickPrompt()
    const matchEndsAt = newEndsAt()
    duel.send({ type: 'start', prompt, endsAt: matchEndsAt })
    beginMatch(prompt, matchEndsAt)
  }

  function requestRematch() {
    duel.send({ type: 'rematch' })
    resetMatch()
  }

  // ---------- LIVE PREVIEW ----------

  const live = useLiveGeneration({
    active: phase === 'playing',
    matchId,
    getInput: () => ({
      prompt: myPrompt.trim(),
      sketch: hasDrawnRef.current && canvasRef.current ? canvasRef.current.toDataURL('image/jpeg', 0.5) : null,
    }),
    onImage: (url) => {
      setMyLiveUrl(url)
      duel.send({ type: 'live', url })
    },
  })

  function changePrompt(text) {
    setMyPrompt(text)
    live.poke()
  }

  function handleStroke() {
    hasDrawnRef.current = true
    live.poke()
  }

  function handleClear() {
    hasDrawnRef.current = false
    live.poke()
  }

  // ---------- FINAL IMAGES ----------

  function sendFinal(url, prompt) {
    setMyFinal({ url, prompt })
    duel.send({ type: 'final', url, prompt })
  }

  function submitFinal(promptText) {
    if (phase !== 'playing') return
    const id = matchId
    const canvas = canvasRef.current
    const sketch = hasDrawnRef.current && canvas ? canvas.toDataURL('image/jpeg', 0.6) : null
    setPhase('generating')
    setMyFinalPrompt(promptText)
    // If the credit modal is open, this waits for the answer; a late image
    // still replaces the fallback below (and reaches the voters).
    const job = live.creditDeclined
      ? Promise.resolve(null)
      : (sketch ? generateFromSketch(promptText, sketch, { strength: 0.6 }) : generateImage(promptText)).catch(() => null)
    job.then((url) => {
      if (current.current.matchId !== id) return
      sendFinal(url || current.current.myLiveUrl || '', promptText)
    })
  }

  function submitEarly() {
    if (myPrompt.trim()) submitFinal(myPrompt.trim())
  }

  const clock = useMatchClock({
    phase,
    endsAt,
    onCountdownDone: () => setPhase('playing'),
    onTimeUp: () => submitFinal(myPrompt.trim() || 'abstract art'),
  })

  // Move to voting when both finals are in, or after FINAL_WAIT_MS.
  const bothFinal = myFinal !== null && opponentFinal !== null
  const onFinalWaitOver = useEffectEvent(() => {
    if (!myFinal) sendFinal(myLiveUrl || '', myFinalPrompt || myPrompt.trim() || 'No prompt')
    if (!opponentFinal && opponentLiveUrl) setOpponentFinal({ url: opponentLiveUrl, prompt: '(timed out)' })
    setPhase('voting')
  })
  useEffect(() => {
    if (phase !== 'generating') return
    const timeout = setTimeout(onFinalWaitOver, bothFinal ? 0 : FINAL_WAIT_MS)
    return () => clearTimeout(timeout)
  }, [phase, bothFinal])

  // ---------- AUDIENCE VOTING ----------

  const myImage = myFinal?.url || myLiveUrl || ''
  const opponentImage = opponentFinal?.url || opponentLiveUrl || ''
  const voteData = useMemo(
    () => ({ prompt: targetPrompt, imageA: isHost ? myImage : opponentImage, imageB: isHost ? opponentImage : myImage, labelA: isHost ? username : opponentName, labelB: isHost ? opponentName : username }),
    [targetPrompt, isHost, myImage, opponentImage, username, opponentName]
  )
  const voteRoom = useVoteRoom({
    active: phase === 'voting' && isHost,
    matchId,
    voteData,
    onReady: (code) => duel.send({ type: 'vote-room', code }),
  })

  const votes = isHost ? voteRoom.votes : guestVotes || NO_VOTES
  const votingClosed = isHost ? voteRoom.closed : guestVotes !== null
  const voteCode = isHost ? voteRoom.code : guestVoteCode

  function finishMatch(finalVotes) {
    if (scoredMatchRef.current === matchId) return // once per match
    scoredMatchRef.current = matchId
    const { result, points, mine, theirs } = matchResult(finalVotes, isHost)
    addScore(game.id, username, points, { prompt: targetPrompt, result, myVotes: mine, theirVotes: theirs })
  }

  function closeVoting() {
    const results = voteRoom.close()
    duel.send({ type: 'vote-results', results })
    finishMatch({ A: results.votesA, B: results.votesB })
  }

  // ==================== RENDER ====================

  if (phase === 'lobby') return <LobbyView error={duel.error} onCreate={createRoom} onJoin={joinRoom} />

  if (phase === 'waiting') {
    return (
      <WaitingView isHost={isHost} connected={duel.connected} roomCode={duel.roomCode} opponentName={opponentName} onStart={startGame} onLeave={leaveRoom} />
    )
  }

  if (phase === 'countdown') return <CountdownView count={clock.countdown} />

  if (phase === 'playing') {
    return (
      <PlayingView
        targetPrompt={targetPrompt}
        timeLeft={clock.timeLeft}
        username={username}
        opponentName={opponentName}
        myLiveUrl={myLiveUrl}
        opponentLiveUrl={opponentLiveUrl}
        prompt={myPrompt}
        onPromptChange={changePrompt}
        canvasRef={canvasRef}
        onStroke={handleStroke}
        onClear={handleClear}
        onSubmit={submitEarly}
        creditDeclined={live.creditDeclined}
        onRetryCredit={live.retry}
      />
    )
  }

  if (phase === 'generating') {
    return (
      <GeneratingView username={username} opponentName={opponentName} myImage={myImage} myDone={myFinal !== null} opponentImage={opponentImage} opponentDone={opponentFinal !== null} />
    )
  }

  if (phase === 'voting') {
    return (
      <VotingView
        targetPrompt={targetPrompt}
        isHost={isHost}
        username={username}
        opponentName={opponentName}
        my={{ image: myImage, prompt: myFinal?.prompt || myFinalPrompt }}
        opponent={{ image: opponentImage, prompt: opponentFinal?.prompt || '' }}
        votes={votes}
        closed={votingClosed}
        outcome={votingClosed ? matchResult(votes, isHost) : null}
        voteUrl={voteCode ? `${window.location.origin}/vote/${voteCode}` : ''}
        viewers={voteRoom.viewers}
        onCloseVoting={closeVoting}
        connected={duel.connected}
        onRematch={requestRematch}
      />
    )
  }

  return null
}

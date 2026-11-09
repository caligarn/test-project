// Prompt Off: two players race to recreate a theme with live AI images,
// then the audience votes from their phones (VotePage at /vote/:code).
// Modules live in ./promptoff/ (protocol notes in constants.js).
import { useState, useRef, useEffect, useEffectEvent, useMemo } from 'react'
import { generateFromSketch, generateImage } from '../lib/fal'
import { addScore } from '../lib/storage'
import { useAuth } from '../context/AuthContext'
import { useMachine } from '../hooks/useMachine'
import { promptOffMachine } from '../machines/promptOff'
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

  // lobby | waiting | countdown | playing | generating | voting | results
  const flow = useMachine(promptOffMachine) // see src/machines/promptOff.js
  const phase = flow.state
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
  const current = useLatestRef({ matchId, myLiveUrl })

  // ---------- CONNECTION ----------

  const duel = useDuelConnection({
    username,
    accepting: phase === 'waiting',
    onMessage: handleMessage,
    onClosed() {
      // A host in the room keeps waiting for a new opponent; otherwise the match is over.
      // After the round (generating, voting, results) both keep their screen.
      if (isHost && phase === 'waiting') return
      if (flow.send('DISCONNECTED')) duel.leave(isHost ? 'Opponent disconnected!' : 'The host left the room.')
    },
    onFailed: () => flow.send('FAILED'),
  })

  // Messages that change the step are machine events: a late or repeated one
  // is ignored, so it cannot move this device back. The rest is match data,
  // cleared when the next match begins (protocol: promptoff/constants.js).
  function handleMessage(msg) {
    switch (msg.type) {
      case 'hello':
        setOpponentName(String(msg.name || 'Opponent'))
        break
      case 'start': // host -> guest
        if (!isHost && flow.send('HOST_STARTED')) beginMatch(msg.prompt, msg.endsAt || newEndsAt())
        break
      case 'live':
        setOpponentLiveUrl(msg.url)
        break
      case 'final':
        setOpponentFinal({ url: msg.url || '', prompt: msg.prompt || '' })
        break
      case 'vote-room': // host -> guest
        setGuestVoteCode(msg.code)
        break
      case 'vote-results': // host -> guest
        if (!isHost && msg.results && flow.send('RESULTS_RECEIVED')) {
          const finalVotes = { A: msg.results.votesA || 0, B: msg.results.votesB || 0 }
          setGuestVotes(finalVotes)
          scoreMatch(finalVotes)
        }
        break
      case 'rematch':
        if (flow.send('REMATCH')) resetMatch()
        break
      default:
        break
    }
  }

  function createRoom() {
    if (!flow.send('CREATE')) return
    setIsHost(true)
    duel.create()
  }

  function joinRoom(code) {
    if (!flow.send('JOIN')) return
    setIsHost(false)
    duel.join(code)
  }

  function leaveRoom() {
    if (!flow.send('LEAVE')) return
    duel.leave()
    resetMatch()
  }

  // ---------- MATCH FLOW ----------

  // Clears the match data (the step itself is the machine's job).
  function resetMatch() {
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
  }

  function startGame() {
    if (!flow.send('START')) return
    const prompt = pickPrompt()
    const matchEndsAt = newEndsAt()
    duel.send({ type: 'start', prompt, endsAt: matchEndsAt })
    beginMatch(prompt, matchEndsAt)
  }

  function requestRematch() {
    if (!flow.send('REMATCH')) return
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

  // event: SUBMIT (early) or TIME_UP. Only the first one counts.
  function submitFinal(event, promptText) {
    if (!flow.send(event)) return
    const id = matchId
    const canvas = canvasRef.current
    const sketch = hasDrawnRef.current && canvas ? canvas.toDataURL('image/jpeg', 0.6) : null
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
    if (myPrompt.trim()) submitFinal('SUBMIT', myPrompt.trim())
  }

  const clock = useMatchClock({
    phase,
    endsAt,
    onCountdownDone: () => flow.send('COUNTDOWN_DONE'),
    onTimeUp: () => submitFinal('TIME_UP', myPrompt.trim() || 'abstract art'),
  })

  // Move to voting when both finals are in, or after FINAL_WAIT_MS.
  const bothFinal = myFinal !== null && opponentFinal !== null
  const onFinalWaitOver = useEffectEvent(() => {
    if (!flow.send('OPEN_VOTING')) return
    if (!myFinal) sendFinal(myLiveUrl || '', myFinalPrompt || myPrompt.trim() || 'No prompt')
    if (!opponentFinal && opponentLiveUrl) setOpponentFinal({ url: opponentLiveUrl, prompt: '(timed out)' })
  })
  useEffect(() => {
    if (phase !== 'generating') return
    const timeout = setTimeout(onFinalWaitOver, bothFinal ? 0 : FINAL_WAIT_MS)
    return () => clearTimeout(timeout)
  }, [phase, bothFinal])

  // ---------- AUDIENCE VOTING ----------
  // The host keeps the vote room open in results too, so late viewers see them.

  const myImage = myFinal?.url || myLiveUrl || ''
  const opponentImage = opponentFinal?.url || opponentLiveUrl || ''
  const voteData = useMemo(
    () => ({ prompt: targetPrompt, imageA: isHost ? myImage : opponentImage, imageB: isHost ? opponentImage : myImage, labelA: isHost ? username : opponentName, labelB: isHost ? opponentName : username }),
    [targetPrompt, isHost, myImage, opponentImage, username, opponentName]
  )
  const voteRoom = useVoteRoom({
    active: flow.is('voting', 'results') && isHost,
    matchId,
    voteData,
    onReady: (code) => duel.send({ type: 'vote-room', code }),
  })

  const votes = isHost ? voteRoom.votes : guestVotes || NO_VOTES
  const votingClosed = flow.is('results')
  const voteCode = isHost ? voteRoom.code : guestVoteCode

  // Runs on entering results, so once per match.
  function scoreMatch(finalVotes) {
    const { result, points, mine, theirs } = matchResult(finalVotes, isHost)
    addScore(game.id, username, points, { prompt: targetPrompt, result, myVotes: mine, theirVotes: theirs })
  }

  function closeVoting() {
    if (!isHost || !flow.send('CLOSE_VOTING')) return
    const results = voteRoom.close()
    duel.send({ type: 'vote-results', results })
    scoreMatch({ A: results.votesA, B: results.votesB })
  }

  // ==================== RENDER ====================

  let view = null
  if (phase === 'lobby') view = <LobbyView error={duel.error} onCreate={createRoom} onJoin={joinRoom} />
  else if (phase === 'waiting') {
    view = <WaitingView isHost={isHost} connected={duel.connected} roomCode={duel.roomCode} opponentName={opponentName} onStart={startGame} onLeave={leaveRoom} />
  } else if (phase === 'countdown') view = <CountdownView count={clock.countdown} />
  else if (phase === 'playing') {
    view = (
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
  } else if (phase === 'generating') {
    view = (
      <GeneratingView username={username} opponentName={opponentName} myImage={myImage} myDone={myFinal !== null} opponentImage={opponentImage} opponentDone={opponentFinal !== null} />
    )
  } else if (phase === 'voting' || phase === 'results') {
    view = (
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

  // data-machine="prompt-off" (the match) wraps data-machine="prompt-off-link" (the PeerJS link).
  return (
    <div {...flow.attrs}>
      <div {...duel.attrs}>{view}</div>
    </div>
  )
}

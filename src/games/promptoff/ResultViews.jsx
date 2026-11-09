import { QRCodeSVG } from 'qrcode.react'
import { Trophy } from 'lucide-react'
import ImageBox from './ImageBox'
import { CopyButton } from './RoomViews'
import { YOU, THEM } from './constants'

const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`

export function GeneratingView({ username, opponentName, myImage, myDone, opponentImage, opponentDone }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="brutalist-card p-4 text-center">
        <h3 className="font-black text-navy uppercase mb-1">Time&apos;s Up!</h3>
        <p className="text-navy/50 text-sm font-medium">Making the final images...</p>
        <div className="flex justify-center gap-6 mt-3">
          <span className={`text-xs font-black uppercase ${myDone ? 'text-green-600' : 'text-navy/30 animate-pulse'}`}>{myDone ? '✓' : '⏳'} You</span>
          <span className={`text-xs font-black uppercase ${opponentDone ? 'text-green-600' : 'text-navy/30 animate-pulse'}`}>{opponentDone ? '✓' : '⏳'} {opponentName}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-4xl mx-auto w-full">
        <div className="flex flex-col gap-2 min-w-0">
          <p className="text-sm font-black text-navy uppercase text-center truncate">You ({username})</p>
          <ImageBox src={myImage} alt="Your image" color={YOU} placeholder="Generating..." />
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <p className="text-sm font-black text-primary uppercase text-center truncate">{opponentName}</p>
          <ImageBox src={opponentImage} alt="Opponent image" color={THEM} placeholder="Waiting..." />
        </div>
      </div>
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

function Entry({ name, nameClass, image, prompt, votes, total, color, textOnFill, winner }) {
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <p className={`text-sm font-black uppercase text-center truncate ${nameClass}`}>{name}</p>
      <ImageBox src={image} alt={`${name}'s image`} color={winner ? color : '#1A1A2E'} placeholder="No image" badge={winner ? 'Winner' : null} badgeColor={color} badgeText={textOnFill} />
      <p className="text-xs text-navy font-bold text-center break-words">{prompt}</p>
      {total > 0 && <VoteBar votes={votes} total={total} color={color} textOnFill={textOnFill} />}
    </div>
  )
}

function AudiencePanel({ voteUrl, viewers, totalVotes, canClose, onClose }) {
  return (
    <div className="brutalist-card p-4 sm:p-6 text-center">
      <p className="text-sm font-black text-navy uppercase mb-1">Audience Vote</p>
      <p className="text-xs text-navy/50 font-medium mb-4">Scan to vote for your favorite!</p>
      {voteUrl ? (
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-3 inline-block" style={{ border: '2px solid #1A1A2E' }}>
            <QRCodeSVG value={voteUrl} size={180} level="M" fgColor="#1A1A2E" bgColor="#ffffff" />
          </div>
          <div className="flex items-center gap-1 max-w-full">
            <code className="text-xs text-navy/70 font-mono bg-navy/5 px-3 py-1.5 truncate" style={{ border: '1px solid #1A1A2E22' }}>{voteUrl}</code>
            <CopyButton text={voteUrl} title="Copy link" />
          </div>
          <div className="flex items-center gap-3 text-navy/60 text-sm font-bold">
            <span>{plural(viewers, 'viewer')} connected</span>
            <span>|</span>
            <span>{plural(totalVotes, 'vote')} cast</span>
          </div>
          {canClose && (
            <button onClick={onClose} className="btn-brutalist bg-accent text-navy text-sm">
              Close Voting & Reveal Results
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 text-navy/40 text-sm">
          <div className="animate-spin rounded-full" style={{ width: 16, height: 16, border: '2px solid #1A1A2E33', borderTopColor: '#1A1A2E' }} />
          <span>Setting up the vote room...</span>
        </div>
      )}
    </div>
  )
}

function ResultCard({ outcome, opponentName, hostName, guestName, votes, totalVotes, canRematch, onRematch }) {
  const { result, points } = outcome
  return (
    <div className="brutalist-card p-6 sm:p-8 text-center">
      <Trophy className={`w-14 h-14 mx-auto mb-3 ${result === 'win' ? 'text-yellow-500' : 'text-navy/40'}`} />
      <h3 className="text-3xl font-black text-navy uppercase mb-2">
        {result === 'tie' ? "It's a Tie!" : result === 'win' ? 'You Win!' : `${opponentName} Wins!`}
      </h3>
      <p className="text-navy/50 text-sm font-medium mb-1">{plural(totalVotes, 'vote')} from the audience</p>
      <p className="text-lg font-bold text-navy/70 mb-2">
        {hostName}: {plural(votes.A, 'vote')}, {guestName}: {plural(votes.B, 'vote')}
      </p>
      <p className={`text-4xl font-black mb-1 ${result === 'loss' ? 'text-primary' : 'text-navy'}`}>+{points} pts</p>
      <p className="text-navy/50 text-xs font-medium mb-6">
        {result === 'win' ? 'The audience chose you!' : result === 'loss' ? 'Better luck next time!' : 'The audience was split!'}
      </p>
      {canRematch && (
        <button onClick={onRematch} className="px-8 py-3 bg-accent text-navy font-black uppercase text-sm" style={{ border: '2px solid #1A1A2E' }}>
          Rematch!
        </button>
      )}
    </div>
  )
}

export function VotingView({
  targetPrompt, isHost, username, opponentName, my, opponent, votes, closed, outcome,
  voteUrl, viewers, onCloseVoting, connected, onRematch,
}) {
  const total = votes.A + votes.B
  const mine = isHost ? votes.A : votes.B
  const theirs = isHost ? votes.B : votes.A
  return (
    <div className="flex flex-col gap-4">
      <div className="brutalist-card p-4 text-center">
        <p className="text-[10px] font-black text-navy/40 uppercase mb-0.5">The prompt was</p>
        <p className="text-lg font-black text-navy">&quot;{targetPrompt}&quot;</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-4xl mx-auto w-full">
        <Entry name={username} nameClass="text-navy" image={my.image} prompt={my.prompt} votes={mine} total={total} color={YOU} textOnFill="#1A1A2E" winner={closed && mine > theirs} />
        <Entry name={opponentName} nameClass="text-primary" image={opponent.image} prompt={opponent.prompt} votes={theirs} total={total} color={THEM} textOnFill="#FFFFFF" winner={closed && theirs > mine} />
      </div>

      {closed && outcome ? (
        <ResultCard
          outcome={outcome}
          opponentName={opponentName}
          hostName={isHost ? username : opponentName}
          guestName={isHost ? opponentName : username}
          votes={votes}
          totalVotes={total}
          canRematch={connected}
          onRematch={onRematch}
        />
      ) : (
        <AudiencePanel voteUrl={voteUrl} viewers={viewers} totalVotes={total} canClose={isHost && total > 0} onClose={onCloseVoting} />
      )}
    </div>
  )
}

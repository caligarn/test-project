import { Clock } from 'lucide-react'
import ImageBox from './ImageBox'
import SketchPad from './SketchPad'
import { YOU, THEM } from './constants'

function CreditNotice({ onRetry }) {
  return (
    <div className="p-3 bg-highlight/30 border-2 border-navy text-navy text-sm font-medium flex items-center justify-between gap-3">
      <span>Live AI previews need 1 credit.</span>
      <button onClick={onRetry} className="shrink-0 px-3 py-1 bg-navy text-white text-xs font-black uppercase border-2 border-navy">
        Use 1 credit
      </button>
    </div>
  )
}

export default function PlayingView({
  targetPrompt, timeLeft, username, opponentName, myLiveUrl, opponentLiveUrl,
  prompt, onPromptChange, canvasRef, onStroke, onClear, onSubmit, creditDeclined, onRetryCredit,
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="brutalist-card p-4 flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-navy/40 uppercase mb-0.5">Recreate this</p>
          <p className="text-sm sm:text-base font-black text-navy">{targetPrompt}</p>
        </div>
        <div
          className={`flex items-center gap-1.5 text-2xl sm:text-3xl font-black tabular-nums shrink-0 ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-navy'}`}
          role="timer"
          aria-label={`${timeLeft} seconds left`}
        >
          <Clock className="w-6 h-6" />
          {timeLeft}s
        </div>
      </div>

      {creditDeclined && <CreditNotice onRetry={onRetryCredit} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-black text-navy uppercase text-center">You ({username})</p>
          <ImageBox src={myLiveUrl} alt="Your live AI image" color={YOU} placeholder="Type a prompt below" />
          <div>
            <label htmlFor="promptoff-prompt" className="block text-xs font-black text-navy uppercase mb-1">Your Prompt</label>
            <textarea
              id="promptoff-prompt"
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
              placeholder="Start typing... the AI draws as you type!"
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 text-base focus:outline-none font-semibold resize-none rounded-none"
              style={{ border: `3px solid ${YOU}`, background: '#ffffff', color: '#1A1A2E' }}
              autoFocus
            />
          </div>
          <SketchPad canvasRef={canvasRef} onStroke={onStroke} onClear={onClear} />
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-sm font-black text-primary uppercase text-center">Opponent ({opponentName})</p>
          <ImageBox src={opponentLiveUrl} alt="Opponent live AI image" color={THEM} placeholder="Waiting for opponent..." />
          <div className="hidden md:block">
            <p className="text-xs font-black text-primary uppercase mb-1">Their Prompt</p>
            <div className="px-4 py-3 text-navy/40 text-base font-medium italic" style={{ border: `3px solid ${THEM}`, background: 'rgba(255,45,85,0.08)', minHeight: '5.5rem' }}>
              Hidden until voting...
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onSubmit}
        disabled={!prompt.trim()}
        className="w-full py-3 bg-navy text-white font-black uppercase text-sm disabled:opacity-40"
        style={{ border: '2px solid #1A1A2E' }}
      >
        Submit Final Image Early
      </button>
    </div>
  )
}

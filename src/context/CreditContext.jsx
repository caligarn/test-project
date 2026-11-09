import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Coins } from 'lucide-react'
import { api } from '../lib/api'
import { registerCreditConfirm } from '../lib/play'
import { getGame } from '../lib/gameData'
import { gameLimits } from '../lib/gameLimits'
import { useMachine } from '../hooks/useMachine'
import { creditDialogMachine } from '../machines/creditDialog.js'

const CreditContext = createContext(null)
const AUTOSPEND_KEY = 'gen_arcade_autospend'

function autospend() {
  try {
    return localStorage.getItem(AUTOSPEND_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Holds the player's credit balance and asks before a game spends a credit.
 * lib/play.js calls the registered confirm handler when an AI call needs a
 * new play ticket.
 */
export function CreditProvider({ children }) {
  const [credits, setCredits] = useState(null)
  const [prompt, setPrompt] = useState(null) // { gameId, reason, resolve }: data for the open dialog
  const dialog = useMachine(creditDialogMachine) // see src/machines/creditDialog.js
  const sendDialog = dialog.send
  const [dontAsk, setDontAsk] = useState(false)
  const creditsRef = useRef(null)
  const dialogRef = useRef(null)

  // Move focus into the dialog (for screen readers and Esc), but onto the box,
  // not a button: a player typing a prompt must not press "Use 1 credit" by accident.
  useEffect(() => {
    if (prompt) dialogRef.current?.focus()
  }, [prompt])

  const refresh = useCallback(async () => {
    try {
      const c = await api('/credits')
      creditsRef.current = c
      setCredits(c)
      return c
    } catch {
      return creditsRef.current
    }
  }, [])

  useEffect(() => {
    let active = true
    api('/credits').then((c) => {
      if (!active) return
      creditsRef.current = c
      setCredits(c)
    }).catch(() => {})
    window.addEventListener('credits-changed', refresh)
    return () => {
      active = false
      window.removeEventListener('credits-changed', refresh)
    }
  }, [refresh])

  useEffect(() => {
    return registerCreditConfirm(async ({ gameId, reason }) => {
      const c = await refresh()
      if (c && c.total > 0 && autospend()) return true
      const empty = !c || c.total <= 0
      return new Promise((resolve) => {
        // Only one dialog at a time (play.js already asks once per game).
        if (!sendDialog(empty ? 'ASK_EMPTY' : 'ASK')) return resolve(false)
        setPrompt({ gameId, reason, resolve })
      })
    })
  }, [refresh, sendDialog])

  function answer(ok) {
    if (ok && dontAsk) {
      try {
        localStorage.setItem(AUTOSPEND_KEY, '1')
      } catch {
        // ignore
      }
    }
    if (!sendDialog(dialog.state === 'out-of-credits' ? 'CLOSE' : ok ? 'ACCEPT' : 'DECLINE')) return
    prompt?.resolve(dialog.state === 'asking' && ok)
    setPrompt(null)
  }

  const game = prompt ? getGame(prompt.gameId) : null

  return (
    <CreditContext.Provider value={{ credits, refresh }}>
      {children}
      {prompt && dialog.state !== 'closed' && (
        <div {...dialog.attrs} className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/60 px-4" role="dialog" aria-modal="true" aria-labelledby="credit-title">
          <div ref={dialogRef} tabIndex={-1} onKeyDown={(e) => { if (e.key === 'Escape') answer(false) }} className="brutalist-card bg-white p-6 max-w-sm w-full focus:outline-none">
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-5 h-5 text-navy" />
              <h2 id="credit-title" className="text-lg font-black text-navy uppercase">
                {dialog.state === 'out-of-credits' ? 'Out of credits' : prompt.reason === 'ticket_exhausted' ? 'Keep playing?' : 'Start game?'}
              </h2>
            </div>
            {dialog.state === 'out-of-credits' ? (
              <>
                <p className="text-sm text-navy/70 font-medium mb-4">
                  You have no credits left. Free credits refill every day. You can also redeem a code.
                </p>
                <div className="flex gap-2">
                  <Link to="/subscribe" onClick={() => answer(false)} className="btn-brutalist bg-highlight text-navy text-xs no-underline">Get credits</Link>
                  <button onClick={() => answer(false)} className="btn-brutalist bg-white text-navy text-xs">Close</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-navy/70 font-medium mb-1">
                  {prompt.reason === 'ticket_exhausted'
                    ? `You used all the AI images from your last credit in ${game?.title || 'this game'}.`
                    : `${game?.title || 'This game'} uses AI images.`}{' '}
                  1 credit gives you up to {gameLimits(prompt.gameId)?.maxUnits || 10} AI images or judge calls.
                </p>
                <p className="text-xs text-navy/50 font-bold uppercase mb-4">
                  You have {credits?.total ?? '?'} credits ({credits?.free ?? 0} free today)
                </p>
                <label className="flex items-center gap-2 text-xs text-navy/60 font-medium mb-4 cursor-pointer">
                  <input type="checkbox" checked={dontAsk} onChange={(e) => setDontAsk(e.target.checked)} className="accent-primary" />
                  Don&apos;t ask me again
                </label>
                <div className="flex gap-2">
                  <button onClick={() => answer(true)} className="btn-brutalist bg-primary text-white text-xs">Use 1 credit</button>
                  <button onClick={() => answer(false)} className="btn-brutalist bg-white text-navy text-xs">Not now</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </CreditContext.Provider>
  )
}

export function useCredits() {
  const ctx = useContext(CreditContext)
  if (!ctx) throw new Error('useCredits must be used within CreditProvider')
  return ctx
}

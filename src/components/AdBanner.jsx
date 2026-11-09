import { Link } from 'react-router-dom'
import { X, Coins } from 'lucide-react'
import { useState } from 'react'
import { useCredits } from '../context/CreditContext'

/** Small dismissible note about credits, shown on the home page. */
export default function AdBanner() {
  const [dismissed, setDismissed] = useState(false)
  const { credits } = useCredits()

  if (dismissed) return null
  const left = credits?.total

  return (
    <div className="relative brutalist-card-yellow p-4 mb-6">
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute top-2 right-2 p-1 text-navy/50 hover:text-navy transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-4 pr-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-navy flex items-center justify-center shrink-0 border-2 border-navy">
          <Coins className="w-6 h-6 sm:w-8 sm:h-8 text-highlight" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-navy mb-0.5 uppercase">
            {left === undefined ? 'Free credits every day' : `You have ${left} ${left === 1 ? 'credit' : 'credits'}`}
          </p>
          <p className="text-xs text-navy/70 mb-2 font-medium">
            1 credit pays for the AI images in one game. Free credits refill every day. Got a code from an event? Redeem it for more.
          </p>
          <Link
            to="/subscribe"
            className="btn-brutalist bg-navy text-highlight text-xs no-underline"
          >
            Credits
          </Link>
        </div>
      </div>
    </div>
  )
}

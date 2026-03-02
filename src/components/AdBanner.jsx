import { Link } from 'react-router-dom'
import { X, Crown } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AdBanner() {
  const [dismissed, setDismissed] = useState(false)
  const { subscribed } = useAuth()

  if (subscribed || dismissed) return null

  return (
    <div className="relative brutalist-card-yellow p-4 mb-6">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 text-navy/50 hover:text-navy transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-navy flex items-center justify-center shrink-0 border-2 border-navy">
          <Crown className="w-8 h-8 text-highlight" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-navy mb-0.5 uppercase">
            Go Ad-Free with AI Arcade Pro
          </p>
          <p className="text-xs text-navy/70 mb-2 font-medium">
            Unlimited games, exclusive content, and no interruptions.
          </p>
          <Link
            to="/subscribe"
            className="btn-brutalist bg-navy text-highlight text-xs no-underline"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    </div>
  )
}

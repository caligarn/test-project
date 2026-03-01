import { Link } from 'react-router-dom'
import { X, Crown } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function AdBanner() {
  const [dismissed, setDismissed] = useState(false)
  const { subscribed } = useAuth()

  if (subscribed || dismissed) return null

  return (
    <div className="relative bg-surface-light border border-white/5 rounded-xl p-4 mb-6">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-300 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-warning/20 to-warning/5 flex items-center justify-center shrink-0">
          <Crown className="w-8 h-8 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white mb-0.5">
            Go Ad-Free with AI Arcade Pro
          </p>
          <p className="text-xs text-gray-400 mb-2">
            Unlimited games, exclusive content, and no interruptions.
          </p>
          <Link
            to="/subscribe"
            className="inline-block px-3 py-1 rounded-lg bg-warning/20 text-warning text-xs font-medium hover:bg-warning/30 transition-colors no-underline"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { getHealth } from '../lib/api'

/**
 * Site-wide notice when the server runs without a real setup:
 * demo images (no fal.ai key) or no saved data (no Redis in production).
 */
export default function DemoBanner() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    let active = true
    getHealth().then((h) => {
      if (active) setHealth(h)
    })
    return () => {
      active = false
    }
  }, [])

  if (!health) return null
  const notes = []
  if (health.mock) notes.push('Demo mode: images are placeholders that show the prompt as text, and the AI judge is simulated.')
  if (health.dataWarning) notes.push('Data is not saved: add Upstash for Redis in Vercel.')
  else if (health.ok && health.accounts === false) notes.push('Logins are off: set SESSION_SECRET or add Upstash for Redis in Vercel.')
  if (notes.length === 0) return null

  return (
    <div role="status" className="bg-highlight text-navy text-xs font-bold text-center px-4 py-2 border-b-2 border-navy">
      {notes.join(' ')}
    </div>
  )
}

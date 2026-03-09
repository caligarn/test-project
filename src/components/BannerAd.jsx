import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * BannerAd — Drop-in ad placement component.
 *
 * Usage:
 *   <BannerAd slot="top" />      — leaderboard (728x90)
 *   <BannerAd slot="sidebar" />  — medium rectangle (300x250)
 *   <BannerAd slot="inline" />   — inline banner (468x60)
 *
 * To integrate with a real ad network (Google AdSense, etc.):
 * 1. Replace the placeholder content with your ad network's script/tag
 * 2. Use the `slot` prop to map to your ad unit IDs
 * 3. Keep the `subscribed` check to hide ads for paying users
 */

const AD_SIZES = {
  top: { width: '100%', minHeight: 90, label: '728 x 90 — Leaderboard' },
  sidebar: { width: 300, minHeight: 250, label: '300 x 250 — Rectangle' },
  inline: { width: '100%', minHeight: 60, label: '468 x 60 — Inline Banner' },
}

export default function BannerAd({ slot = 'inline', className = '' }) {
  const { subscribed } = useAuth()

  // Pro subscribers don't see ads
  if (subscribed) return null

  const size = AD_SIZES[slot] || AD_SIZES.inline

  return (
    <div className={`relative ${className}`}>
      {/*
        Replace this placeholder div with your ad network code.
        Example for Google AdSense:

        <ins className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
          data-ad-slot="XXXXXXXXXX"
          data-ad-format="auto"
          data-full-width-responsive="true" />
      */}
      <div
        className="flex flex-col items-center justify-center bg-navy/5 overflow-hidden"
        style={{
          width: size.width,
          minHeight: size.minHeight,
          border: '2px dashed rgba(26,26,46,0.15)',
        }}
      >
        <p className="text-[10px] text-navy/30 font-bold uppercase tracking-wider mb-1">
          Advertisement
        </p>
        <p className="text-[9px] text-navy/20 font-medium">{size.label}</p>
        <Link
          to="/subscribe"
          className="mt-2 text-[10px] text-primary font-bold no-underline hover:underline uppercase"
        >
          Go Ad-Free
        </Link>
      </div>
    </div>
  )
}

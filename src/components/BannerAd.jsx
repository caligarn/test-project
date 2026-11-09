/**
 * BannerAd: drop-in ad placement slot.
 *
 * Usage:
 *   <BannerAd slot="top" />      leaderboard (728x90)
 *   <BannerAd slot="sidebar" />  medium rectangle (300x250)
 *   <BannerAd slot="inline" />   inline banner (468x60)
 *
 * No ad network is connected yet, so the slot renders nothing. Set
 * VITE_SHOW_AD_SLOTS=1 to see the placeholder boxes while designing layouts.
 * To integrate a real ad network, replace the placeholder below with its tag
 * and map `slot` to your ad unit ids.
 */

const AD_SIZES = {
  top: { width: '100%', minHeight: 90, label: '728 x 90, leaderboard' },
  sidebar: { width: 300, minHeight: 250, label: '300 x 250, rectangle' },
  inline: { width: '100%', minHeight: 60, label: '468 x 60, inline banner' },
}

const SHOW_SLOTS = import.meta.env.VITE_SHOW_AD_SLOTS === '1'

export default function BannerAd({ slot = 'inline', className = '' }) {
  if (!SHOW_SLOTS) return null

  const size = AD_SIZES[slot] || AD_SIZES.inline

  return (
    <div className={`relative ${className}`}>
      <div
        className="flex flex-col items-center justify-center bg-navy/5 overflow-hidden max-w-full"
        style={{
          width: size.width,
          minHeight: size.minHeight,
          border: '2px dashed rgba(26,26,46,0.15)',
        }}
      >
        <p className="text-[10px] text-navy/30 font-bold uppercase tracking-wider mb-1">
          Ad slot
        </p>
        <p className="text-[9px] text-navy/20 font-medium">{size.label}</p>
      </div>
    </div>
  )
}

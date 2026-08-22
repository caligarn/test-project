import { useState } from 'react'

/**
 * Gallery-safe <img>: lazy loading plus a placeholder when the stored fal.ai
 * URL has expired, so old galleries degrade gracefully instead of showing
 * broken-image icons.
 */
export default function GameImage({ src, alt = '', className = '', style, eager = false }) {
  const [failed, setFailed] = useState(false)

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-navy/5 text-navy/30 ${className}`}
        style={style}
      >
        <span className="text-2xl" title="Image no longer available">🖼️</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={eager ? undefined : 'lazy'}
      onError={() => setFailed(true)}
    />
  )
}

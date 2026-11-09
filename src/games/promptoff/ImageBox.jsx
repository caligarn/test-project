import GameImage from '../../components/game/GameImage'

/** Square AI image with a colored frame, a placeholder and an optional badge. */
export default function ImageBox({ src, alt, color, placeholder, badge, badgeColor, badgeText = '#1A1A2E' }) {
  return (
    <div className="relative bg-white" style={{ border: `3px solid ${color}`, aspectRatio: '1', overflow: 'hidden' }}>
      {src ? (
        <GameImage key={src} src={src} alt={alt} eager className="w-full h-full" style={{ objectFit: 'cover', display: 'block' }} />
      ) : (
        <div className="flex items-center justify-center text-center px-4 text-navy/30 text-sm font-bold uppercase w-full h-full">
          {placeholder}
        </div>
      )}
      {badge && (
        <div className="absolute top-2 left-2 px-2 py-1 text-xs font-black uppercase" style={{ background: badgeColor || color, color: badgeText }}>
          {badge}
        </div>
      )}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Play, Users } from 'lucide-react'

/**
 * One game tile. `plays` is the real play count from GET /stats; the parent
 * fetches it once for all cards and passes it down. Hidden when 0.
 */
export default function GameCard({ game, plays = 0, size = 'normal' }) {
  const isLarge = size === 'large'
  const isLightBg = game.color === '#C8FF00' || game.color === '#FFD600'

  return (
    <Link
      to={`/play/${game.id}`}
      className={`game-card block overflow-hidden no-underline ${
        isLarge ? 'col-span-2 row-span-2' : ''
      }`}
    >
      <div
        className={`relative ${
          isLarge ? 'p-8 min-h-[280px]' : 'p-5 min-h-[180px]'
        } flex flex-col justify-between`}
        style={{ backgroundColor: game.color }}
      >
        <div className="relative z-10 flex items-start justify-between gap-2">
          <span className={`${isLarge ? 'text-5xl' : 'text-3xl'}`}>
            {game.icon}
          </span>
          {game.party && (
            <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase bg-white text-navy border-2 border-navy">
              <Users className="w-3 h-3" />
              Party
            </span>
          )}
        </div>

        <div className="relative z-10">
          <h3
            className={`font-black ${isLightBg ? 'text-navy' : 'text-white'} ${
              isLarge ? 'text-2xl' : 'text-lg'
            } mb-1 uppercase`}
          >
            {game.title}
          </h3>
          <p
            className={`${isLightBg ? 'text-navy/70' : 'text-white/80'} ${
              isLarge ? 'text-sm' : 'text-xs'
            } mb-2 font-medium line-clamp-2`}
          >
            {game.description}
          </p>
          <div className="flex items-center gap-3">
            {plays > 0 && (
              <span className={`flex items-center gap-1 ${isLightBg ? 'text-navy/60' : 'text-white/70'} text-xs font-bold`}>
                <Play className="w-3 h-3" />
                {plays.toLocaleString()} {plays === 1 ? 'play' : 'plays'}
              </span>
            )}
            <span
              className={`px-2 py-0.5 text-[10px] font-black uppercase border-2 ${
                game.difficulty === 'Easy'
                  ? 'bg-accent border-navy text-navy'
                  : game.difficulty === 'Medium'
                  ? 'bg-highlight border-navy text-navy'
                  : 'bg-primary border-navy text-white'
              }`}
            >
              {game.difficulty}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

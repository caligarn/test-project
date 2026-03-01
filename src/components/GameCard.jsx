import { Link } from 'react-router-dom'
import { Users, Zap } from 'lucide-react'

export default function GameCard({ game, size = 'normal' }) {
  const isLarge = size === 'large'

  return (
    <Link
      to={`/game/${game.id}`}
      className={`game-card block rounded-2xl overflow-hidden no-underline ${
        isLarge ? 'col-span-2 row-span-2' : ''
      }`}
    >
      <div
        className={`relative bg-gradient-to-br ${game.gradient} ${
          isLarge ? 'p-8 min-h-[280px]' : 'p-5 min-h-[180px]'
        } flex flex-col justify-between`}
      >
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-20 h-20 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

        {/* Badges */}
        <div className="flex items-start justify-between relative z-10">
          <span className={`${isLarge ? 'text-5xl' : 'text-3xl'}`}>
            {game.icon}
          </span>
          <div className="flex gap-1.5">
            {game.isNew && (
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider">
                New
              </span>
            )}
            {game.featured && (
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5" /> Hot
              </span>
            )}
          </div>
        </div>

        <div className="relative z-10">
          <h3
            className={`font-bold text-white ${
              isLarge ? 'text-2xl' : 'text-lg'
            } mb-1`}
          >
            {game.title}
          </h3>
          <p
            className={`text-white/70 ${
              isLarge ? 'text-sm' : 'text-xs'
            } mb-2`}
          >
            {game.tagline}
          </p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-white/60 text-xs">
              <Users className="w-3 h-3" />
              {game.players}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                game.difficulty === 'Easy'
                  ? 'bg-green-500/20 text-green-300'
                  : game.difficulty === 'Medium'
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-red-500/20 text-red-300'
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

import { useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import GameCard from '../components/GameCard'
import AdBanner from '../components/AdBanner'
import { GAMES, CATEGORIES, getGamesByCategory, getFeaturedGames } from '../lib/gameData'

export default function Home() {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')

  const featured = getFeaturedGames()
  const games = getGamesByCategory(category).filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/30 via-surface to-accent/20 p-8 md:p-12 border border-white/5">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-accent/10 blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-warning" />
            <span className="text-xs font-semibold text-warning uppercase tracking-wider">
              AI-Powered Games
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
            Welcome to <span className="gradient-text">AI Arcade</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-lg mb-6">
            Play, compete, and create with the power of AI. Six unique games
            powered by cutting-edge image generation. How high can you score?
          </p>
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              {['🤖', '👾', '🎮', '🕹️', '🎯'].map((a, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-surface-lighter border-2 border-surface flex items-center justify-center text-sm"
                >
                  {a}
                </div>
              ))}
            </div>
            <span className="text-xs text-gray-400">
              <strong className="text-white">9,908</strong> players online
            </span>
          </div>
        </div>
      </div>

      <AdBanner />

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-light border border-white/5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                category === cat.id
                  ? 'bg-primary text-white'
                  : 'bg-surface-light text-gray-400 hover:text-white hover:bg-surface-lighter'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Section */}
      {category === 'all' && !search && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-warning" />
            Featured Games
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featured.map((game, i) => (
              <GameCard
                key={game.id}
                game={game}
                size={i === 0 ? 'large' : 'normal'}
              />
            ))}
          </div>
        </section>
      )}

      {/* All Games Grid */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4">
          {category === 'all' ? 'All Games' : CATEGORIES.find((c) => c.id === category)?.label}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
        {games.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎮</p>
            <p className="text-gray-400 text-sm">
              No games found. Try a different search or category.
            </p>
          </div>
        )}
      </section>

      {/* Daily Challenge Banner */}
      <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-primary/20 to-accent/20 border border-white/5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">
              Daily Challenge
            </p>
            <p className="text-white font-bold text-lg">
              Prompt Guesser: Movie Scenes Edition
            </p>
            <p className="text-gray-400 text-sm">
              Guess the movie scene prompts — bonus XP today!
            </p>
          </div>
          <a
            href="/game/prompt-guesser"
            className="px-5 py-2.5 rounded-xl bg-accent text-white font-medium text-sm hover:bg-accent-dark transition-colors no-underline"
          >
            Play Now
          </a>
        </div>
      </div>
    </div>
  )
}

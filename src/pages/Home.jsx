import { useState } from 'react'
import { Search, Sparkles, Zap } from 'lucide-react'
import GameCard from '../components/GameCard'
import AdBanner from '../components/AdBanner'
import { ALL_GAMES, MINIGAMES, CATEGORIES, getGamesByCategory, getFeaturedGames } from '../lib/gameData'

export default function Home() {
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')

  const games = getGamesByCategory(category).filter((g) =>
    g.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="md:col-span-2 brutalist-card p-8 md:p-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="tag tag-pink">AI Games</span>
            <span className="tag tag-green">Community</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-navy mb-4 uppercase leading-none">
            Play.<br />Create.<br />Compete.
          </h1>
          <p className="text-navy/60 text-sm md:text-base max-w-lg font-medium">
            The future of AI gaming is here. {ALL_GAMES.length} unique games powered by cutting-edge image generation. How high can you score?
          </p>
        </div>
        <div className="brutalist-card-pink p-8 flex flex-col justify-between">
          <div>
            <Sparkles className="w-8 h-8 text-white mb-3" />
            <p className="text-5xl md:text-6xl font-black text-white leading-none">9,908</p>
            <p className="text-sm font-black text-white/90 uppercase tracking-wider mt-2">Players Online</p>
          </div>
          <div className="flex gap-2 mt-6">
            <div className="border-2 border-white/30 px-3 py-2 text-center flex-1">
              <p className="text-xl font-black text-white">{ALL_GAMES.length}</p>
              <p className="text-[10px] font-bold text-white/70 uppercase">Games</p>
            </div>
            <div className="border-2 border-white/30 px-3 py-2 text-center flex-1">
              <p className="text-xl font-black text-white">24/7</p>
              <p className="text-[10px] font-bold text-white/70 uppercase">Online</p>
            </div>
          </div>
        </div>
      </div>

      <AdBanner />

      {/* New Games Banner */}
      <div className="mb-6 flex items-center gap-3 p-4 bg-accent/10" style={{ border: '3px solid #C8FF00' }}>
        <Zap className="w-5 h-5 text-navy flex-none" />
        <div>
          <span className="font-black text-navy uppercase text-sm">Now Live — </span>
          <span className="text-navy/70 text-sm font-medium">
            {MINIGAMES.map(g => `${g.icon} ${g.title}`).join(' · ')}
          </span>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/40" />
          <input type="text" placeholder="Search games..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white text-sm text-navy placeholder-navy/40 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
            style={{ border: '3px solid #1A1A2E' }} />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button key={cat.id} onClick={() => setCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-black uppercase whitespace-nowrap transition-colors ${category === cat.id ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-surface-light'}`}
              style={{ border: '2px solid #1A1A2E' }}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Games Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => <GameCard key={game.id} game={game} />)}
      </div>

      {games.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎮</p>
          <p className="text-navy/50 font-medium">No games match your search.</p>
        </div>
      )}
    </div>
  )
}

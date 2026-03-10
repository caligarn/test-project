import { useState } from 'react'
import { Search, Sparkles, Users, Gamepad2, Brush } from 'lucide-react'
import GameCard from '../components/GameCard'
import AdBanner from '../components/AdBanner'
import BannerAd from '../components/BannerAd'
import { ALL_GAMES, ICEBREAKERS, NEW_GAMES, CROWD_GRAFFITI } from '../lib/gameData'

export default function Home() {
  const [search, setSearch] = useState('')

  const filterBySearch = (games) =>
    search ? games.filter((g) => g.title.toLowerCase().includes(search.toLowerCase())) : games

  const icebreakers = filterBySearch(ICEBREAKERS)
  const crowdGraffiti = filterBySearch(CROWD_GRAFFITI)
  const newGames = filterBySearch(NEW_GAMES)

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

      {/* Search */}
      <div className="flex items-center gap-3 mb-8">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/40" />
          <input type="text" placeholder="Search games..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border-3 border-navy bg-white text-sm text-navy placeholder-navy/40 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
            style={{ borderWidth: '3px' }} />
        </div>
      </div>

      {/* ICEBREAKERS Section */}
      {icebreakers.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[#FF2D55]" />
            <h2 className="text-xl font-black text-navy uppercase tracking-tight">Icebreakers</h2>
            <span className="ml-2 px-2 py-0.5 text-[10px] font-black uppercase bg-[#FF2D55] text-white">
              Multiplayer
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {icebreakers.map((game) => <GameCard key={game.id} game={game} />)}
          </div>
        </section>
      )}

      {/* CROWD GRAFFITI Section */}
      {crowdGraffiti.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Brush className="w-5 h-5 text-[#E11D48]" />
            <h2 className="text-xl font-black text-navy uppercase tracking-tight">Crowd Graffiti</h2>
            <span className="ml-2 px-2 py-0.5 text-[10px] font-black uppercase bg-[#E11D48] text-white">
              Collaborative
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {crowdGraffiti.map((game) => <GameCard key={game.id} game={game} />)}
          </div>
        </section>
      )}

      {/* NEW GAMES Section */}
      {newGames.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Gamepad2 className="w-5 h-5 text-[#C8FF00]" />
            <h2 className="text-xl font-black text-navy uppercase tracking-tight">New Games</h2>
            <span className="ml-2 px-2 py-0.5 text-[10px] font-black uppercase bg-[#C8FF00] text-navy">
              Fresh
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {newGames.map((game) => <GameCard key={game.id} game={game} />)}
          </div>
        </section>
      )}

      {icebreakers.length === 0 && crowdGraffiti.length === 0 && newGames.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎮</p>
          <p className="text-navy/50 font-medium">No games found.</p>
        </div>
      )}

      {/* Bottom banner ad */}
      <BannerAd slot="top" className="mt-8" />
    </div>
  )
}

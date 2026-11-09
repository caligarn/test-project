import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users, Gamepad2, Brush, PartyPopper, Trophy, Play, Coins } from 'lucide-react'
import GameCard from '../components/GameCard'
import AdBanner from '../components/AdBanner'
import BannerAd from '../components/BannerAd'
import { ALL_GAMES, DAILY, PARTY_GAMES, ICEBREAKERS, NEW_GAMES, CROWD_GRAFFITI } from '../lib/gameData'
import { api } from '../lib/api'
import { useCredits } from '../context/CreditContext'

const PLAYABLE = ALL_GAMES.filter((g) => g.id !== DAILY.id)

function Section({ icon, iconClass, title, badge, badgeClass, note, games, plays }) {
  const SectionIcon = icon
  if (games.length === 0) return null
  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <SectionIcon className={`w-5 h-5 ${iconClass}`} />
        <h2 className="text-xl font-black text-navy uppercase tracking-tight">{title}</h2>
        <span className={`ml-2 px-2 py-0.5 text-[10px] font-black uppercase ${badgeClass}`}>{badge}</span>
      </div>
      {note ? <p className="text-navy/50 text-sm font-medium mb-4">{note}</p> : <div className="mb-4" />}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => <GameCard key={game.id} game={game} plays={plays[game.id] || 0} />)}
      </div>
    </section>
  )
}

export default function Home() {
  const [search, setSearch] = useState('')
  const [plays, setPlays] = useState({})
  const { credits } = useCredits()

  // One request for every card's play count.
  useEffect(() => {
    let active = true
    api('/stats')
      .then((data) => { if (active) setPlays(data.plays || {}) })
      .catch(() => { /* play counts are optional: cards just hide them */ })
    return () => { active = false }
  }, [])

  const filterBySearch = (games) =>
    search ? games.filter((g) => g.title.toLowerCase().includes(search.toLowerCase())) : games

  const partyGames = filterBySearch(PARTY_GAMES)
  const icebreakers = filterBySearch(ICEBREAKERS)
  const crowdGraffiti = filterBySearch(CROWD_GRAFFITI)
  const newGames = filterBySearch(NEW_GAMES)
  const nothingFound = partyGames.length + icebreakers.length + crowdGraffiti.length + newGames.length === 0
  const totalPlays = Object.values(plays).reduce((sum, n) => sum + (Number(n) || 0), 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Daily Challenge */}
      <div className="bg-navy border-navy p-5 md:p-6 mb-6 flex flex-col md:flex-row md:items-center gap-4"
        style={{ borderWidth: '3px', borderStyle: 'solid', boxShadow: '6px 6px 0 #FFD600' }}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className="text-4xl md:text-5xl shrink-0" aria-hidden="true">{DAILY.icon}</span>
          <div className="min-w-0">
            <span className="tag tag-yellow text-[10px] mb-1 inline-block">New every day</span>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase leading-tight">{DAILY.title}</h2>
            <p className="text-white/70 text-sm font-medium">
              Five AI images, the same for everyone today. One guess each. Free to play.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link to="/play/daily" className="btn-brutalist bg-highlight text-navy no-underline">
            <Play className="w-4 h-4" />
            Play today
          </Link>
          <Link to="/leaderboard?game=daily" className="btn-brutalist bg-white text-navy no-underline">
            <Trophy className="w-4 h-4" />
            Today&apos;s ranks
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="md:col-span-2 brutalist-card p-6 md:p-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="tag tag-pink">AI Games</span>
            <span className="tag tag-green">Party</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-navy mb-4 uppercase leading-none">
            Play.<br />Create.<br />Compete.
          </h1>
          <p className="text-navy/60 text-sm md:text-base max-w-lg font-medium">
            {PLAYABLE.length} AI image games for parties, events, and solo play. Play with friends on your phones, or chase a high score on the shared leaderboards.
          </p>
        </div>
        <div className="brutalist-card-pink p-6 md:p-8 flex flex-col justify-between">
          <div>
            <Coins className="w-8 h-8 text-white mb-3" />
            <p className="text-5xl md:text-6xl font-black text-white leading-none">{credits?.freeDaily ?? 5}</p>
            <p className="text-sm font-black text-white/90 uppercase tracking-wider mt-2">Free credits every day</p>
            <p className="text-xs text-white/70 font-medium mt-1">1 credit pays for the AI images in one game.</p>
          </div>
          <div className="flex gap-2 mt-6">
            <div className="border-2 border-white/30 px-3 py-2 text-center flex-1">
              <p className="text-xl font-black text-white">{PLAYABLE.length}</p>
              <p className="text-[10px] font-bold text-white/70 uppercase">Games</p>
            </div>
            <div className="border-2 border-white/30 px-3 py-2 text-center flex-1">
              <p className="text-xl font-black text-white">{totalPlays > 0 ? totalPlays.toLocaleString() : PARTY_GAMES.length}</p>
              <p className="text-[10px] font-bold text-white/70 uppercase">{totalPlays > 0 ? 'Plays' : 'Party games'}</p>
            </div>
          </div>
        </div>
      </div>

      <AdBanner />

      {/* Search */}
      <div className="flex items-center gap-3 mb-8">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/40" />
          <input type="text" placeholder="Search games..." value={search} aria-label="Search games"
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border-3 border-navy bg-white text-sm text-navy placeholder-navy/40 focus:outline-none focus:ring-2 focus:ring-highlight font-medium"
            style={{ borderWidth: '3px' }} />
        </div>
      </div>

      <Section
        icon={PartyPopper} iconClass="text-[#8B5CF6]" title="Party games"
        badge="Groups" badgeClass="bg-[#8B5CF6] text-white"
        note="These work for groups: play with friends on your phones. One person starts a room, everyone else joins with the code."
        games={partyGames} plays={plays}
      />
      <Section
        icon={Users} iconClass="text-[#FF2D55]" title="Icebreakers"
        badge="Multiplayer" badgeClass="bg-[#FF2D55] text-white"
        games={icebreakers} plays={plays}
      />
      <Section
        icon={Brush} iconClass="text-[#E11D48]" title="Crowd Graffiti"
        badge="Collaborative" badgeClass="bg-[#E11D48] text-white"
        note="Shared creations: everyone adds to the same gallery or canvas."
        games={crowdGraffiti} plays={plays}
      />
      <Section
        icon={Gamepad2} iconClass="text-[#C8FF00]" title="New Games"
        badge="Fresh" badgeClass="bg-[#C8FF00] text-navy"
        games={newGames} plays={plays}
      />

      {nothingFound && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎮</p>
          <p className="text-navy/50 font-medium">No games found.</p>
        </div>
      )}

      <BannerAd slot="top" className="mt-8" />
    </div>
  )
}

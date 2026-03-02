import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Trophy, Medal, TrendingUp } from 'lucide-react'
import { getLeaderboard } from '../lib/storage'
import { GAMES } from '../lib/gameData'

export default function Leaderboard() {
  const [searchParams] = useSearchParams()
  const initialGame = searchParams.get('game') || 'all'
  const [selectedGame, setSelectedGame] = useState(initialGame)

  const leaderboard = getLeaderboard(
    selectedGame === 'all' ? null : selectedGame
  )

  const displayData =
    leaderboard.length > 0
      ? leaderboard
      : getDemoLeaderboard(selectedGame)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-navy flex items-center gap-2 uppercase">
          <Trophy className="w-6 h-6 text-highlight" />
          Leaderboard
        </h1>
        <p className="text-navy/50 text-sm mt-1 font-medium">
          Top players across all AI Arcade games
        </p>
      </div>

      {/* Game Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
        <button
          onClick={() => setSelectedGame('all')}
          className={`px-3 py-1.5 text-xs font-black whitespace-nowrap transition-colors uppercase border-2 border-navy ${
            selectedGame === 'all'
              ? 'bg-navy text-white'
              : 'bg-white text-navy hover:bg-surface-light'
          }`}
        >
          Overall
        </button>
        {GAMES.map((game) => (
          <button
            key={game.id}
            onClick={() => setSelectedGame(game.id)}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-black whitespace-nowrap transition-colors uppercase border-2 border-navy ${
              selectedGame === game.id
                ? 'bg-navy text-white'
                : 'bg-white text-navy hover:bg-surface-light'
            }`}
          >
            <span>{game.icon}</span>
            {game.title}
          </button>
        ))}
      </div>

      {/* Top 3 Podium */}
      {displayData.length >= 3 && (
        <div className="flex items-end justify-center gap-3 mb-8">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-surface-light flex items-center justify-center text-2xl mb-2 border-3" style={{ borderWidth: '3px', borderColor: '#A8A8A8' }}>
              {displayData[1].avatar || '👾'}
            </div>
            <p className="text-navy text-xs font-bold truncate max-w-[80px]">
              {displayData[1].username}
            </p>
            <div className="mt-2 w-20 h-20 bg-silver/20 flex flex-col items-center justify-center border-2 border-navy/20">
              <Medal className="w-5 h-5 text-silver mb-1" />
              <span className="text-silver text-sm font-black">
                {displayData[1].score}
              </span>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-highlight flex items-center justify-center text-3xl mb-2 border-3 pulse-glow" style={{ borderWidth: '3px', borderColor: '#1A1A2E' }}>
              {displayData[0].avatar || '🤖'}
            </div>
            <p className="text-navy text-sm font-black truncate max-w-[80px]">
              {displayData[0].username}
            </p>
            <div className="mt-2 w-24 h-28 bg-highlight/20 flex flex-col items-center justify-center border-2 border-navy/20">
              <Trophy className="w-6 h-6 text-gold mb-1" />
              <span className="text-gold text-lg font-black">
                {displayData[0].score}
              </span>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-surface-light flex items-center justify-center text-2xl mb-2 border-3" style={{ borderWidth: '3px', borderColor: '#CD7F32' }}>
              {displayData[2].avatar || '🎮'}
            </div>
            <p className="text-navy text-xs font-bold truncate max-w-[80px]">
              {displayData[2].username}
            </p>
            <div className="mt-2 w-20 h-16 bg-bronze/20 flex flex-col items-center justify-center border-2 border-navy/20">
              <Medal className="w-5 h-5 text-bronze mb-1" />
              <span className="text-bronze text-sm font-black">
                {displayData[2].score}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Full List */}
      <div className="brutalist-card overflow-hidden">
        {displayData.map((entry, i) => (
          <div
            key={entry.username}
            className="flex items-center gap-3 px-4 py-3 border-b-2 border-navy/10 last:border-0 hover:bg-surface-light/50 transition-colors"
          >
            <span
              className={`w-8 text-center text-sm font-black ${
                i === 0
                  ? 'text-gold'
                  : i === 1
                  ? 'text-silver'
                  : i === 2
                  ? 'text-bronze'
                  : 'text-navy/30'
              }`}
            >
              #{i + 1}
            </span>
            <span className="text-lg">{entry.avatar || '🤖'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-navy text-sm font-bold truncate">
                {entry.username}
              </p>
              {entry.gamesPlayed && (
                <p className="text-navy/40 text-xs font-medium">
                  {entry.gamesPlayed} games played
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-primary font-black text-sm">{entry.score}</p>
              {i < 3 && (
                <div className="flex items-center gap-0.5 text-success text-xs font-bold">
                  <TrendingUp className="w-3 h-3" />
                  Top {i + 1}
                </div>
              )}
            </div>
          </div>
        ))}
        {displayData.length === 0 && (
          <div className="py-12 text-center">
            <Trophy className="w-10 h-10 text-navy/20 mx-auto mb-3" />
            <p className="text-navy/50 text-sm font-medium">
              No scores yet. Start playing to claim the top spot!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function getDemoLeaderboard(gameId) {
  const names = [
    { username: 'PixelMaster', avatar: '🤖', score: 12450, gamesPlayed: 42 },
    { username: 'AIWizard', avatar: '🧠', score: 11200, gamesPlayed: 38 },
    { username: 'PromptQueen', avatar: '👾', score: 9800, gamesPlayed: 35 },
    { username: 'NeuralNinja', avatar: '⚡', score: 8650, gamesPlayed: 29 },
    { username: 'DreamWeaver', avatar: '🔮', score: 7400, gamesPlayed: 24 },
    { username: 'StyleHunter', avatar: '🎨', score: 6100, gamesPlayed: 20 },
    { username: 'CaptionKing', avatar: '🎭', score: 5350, gamesPlayed: 18 },
    { username: 'SpeedDemon', avatar: '🕹️', score: 4200, gamesPlayed: 15 },
    { username: 'RemixRider', avatar: '🔄', score: 3100, gamesPlayed: 11 },
    { username: 'ArtExplorer', avatar: '🌟', score: 1800, gamesPlayed: 7 },
  ]
  return names
}

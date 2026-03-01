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

  // Demo data if empty
  const displayData =
    leaderboard.length > 0
      ? leaderboard
      : getDemoLeaderboard(selectedGame)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-warning" />
          Leaderboard
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Top players across all AI Arcade games
        </p>
      </div>

      {/* Game Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
        <button
          onClick={() => setSelectedGame('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
            selectedGame === 'all'
              ? 'bg-primary text-white'
              : 'bg-surface-light text-gray-400 hover:text-white'
          }`}
        >
          Overall
        </button>
        {GAMES.map((game) => (
          <button
            key={game.id}
            onClick={() => setSelectedGame(game.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedGame === game.id
                ? 'bg-primary text-white'
                : 'bg-surface-light text-gray-400 hover:text-white'
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
            <div className="w-14 h-14 rounded-full bg-surface-lighter flex items-center justify-center text-2xl mb-2 border-2 border-silver">
              {displayData[1].avatar || '👾'}
            </div>
            <p className="text-white text-xs font-medium truncate max-w-[80px]">
              {displayData[1].username}
            </p>
            <div className="mt-2 w-20 h-20 rounded-t-xl bg-silver/20 flex flex-col items-center justify-center">
              <Medal className="w-5 h-5 text-silver mb-1" />
              <span className="text-silver text-sm font-bold">
                {displayData[1].score}
              </span>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-surface-lighter flex items-center justify-center text-3xl mb-2 border-2 border-gold pulse-glow">
              {displayData[0].avatar || '🤖'}
            </div>
            <p className="text-white text-sm font-bold truncate max-w-[80px]">
              {displayData[0].username}
            </p>
            <div className="mt-2 w-24 h-28 rounded-t-xl bg-gold/20 flex flex-col items-center justify-center">
              <Trophy className="w-6 h-6 text-gold mb-1" />
              <span className="text-gold text-lg font-bold">
                {displayData[0].score}
              </span>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-surface-lighter flex items-center justify-center text-2xl mb-2 border-2 border-bronze">
              {displayData[2].avatar || '🎮'}
            </div>
            <p className="text-white text-xs font-medium truncate max-w-[80px]">
              {displayData[2].username}
            </p>
            <div className="mt-2 w-20 h-16 rounded-t-xl bg-bronze/20 flex flex-col items-center justify-center">
              <Medal className="w-5 h-5 text-bronze mb-1" />
              <span className="text-bronze text-sm font-bold">
                {displayData[2].score}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Full List */}
      <div className="bg-surface-light rounded-xl border border-white/5 overflow-hidden">
        {displayData.map((entry, i) => (
          <div
            key={entry.username}
            className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-surface-lighter/50 transition-colors"
          >
            <span
              className={`w-8 text-center text-sm font-bold ${
                i === 0
                  ? 'text-gold'
                  : i === 1
                  ? 'text-silver'
                  : i === 2
                  ? 'text-bronze'
                  : 'text-gray-500'
              }`}
            >
              #{i + 1}
            </span>
            <span className="text-lg">{entry.avatar || '🤖'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {entry.username}
              </p>
              {entry.gamesPlayed && (
                <p className="text-gray-500 text-xs">
                  {entry.gamesPlayed} games played
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-primary font-bold text-sm">{entry.score}</p>
              {i < 3 && (
                <div className="flex items-center gap-0.5 text-success text-xs">
                  <TrendingUp className="w-3 h-3" />
                  Top {i + 1}
                </div>
              )}
            </div>
          </div>
        ))}
        {displayData.length === 0 && (
          <div className="py-12 text-center">
            <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
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

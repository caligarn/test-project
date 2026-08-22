/**
 * Shared game-over screen. `children` slots in any game-specific extras
 * (breakdowns, chains, galleries) between the score and the restart button.
 */
export default function GameOverCard({
  emoji = '🏆',
  title = 'Game Over!',
  score,
  subtitle,
  onRestart,
  restartLabel = 'Play Again',
  children,
}) {
  return (
    <div className="brutalist-card p-8 text-center">
      <span className="text-6xl block mb-4">{emoji}</span>
      <h2 className="text-2xl font-black text-navy uppercase mb-2">{title}</h2>
      {score != null && (
        <p className="text-5xl font-black text-primary mb-2">{score}</p>
      )}
      {subtitle && (
        <p className="text-navy/50 text-sm font-medium mb-4">{subtitle}</p>
      )}
      {children}
      <button
        onClick={onRestart}
        className="btn-brutalist bg-navy text-white mt-4"
      >
        {restartLabel}
      </button>
    </div>
  )
}

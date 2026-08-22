/**
 * The Round / middle-stat / Score header previously copy-pasted into every game.
 * stats: [{ label, value, color? }]
 */
export default function StatsBar({ stats, className = '' }) {
  return (
    <div
      className={`grid gap-3 mb-6 ${className}`}
      style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
    >
      {stats.map((s) => (
        <div key={s.label} className="brutalist-card p-4 text-center">
          <p className="text-xs font-bold uppercase text-navy/40">{s.label}</p>
          <p
            className="text-3xl font-black text-navy"
            style={s.color ? { color: s.color } : undefined}
          >
            {s.value}
          </p>
        </div>
      ))}
    </div>
  )
}

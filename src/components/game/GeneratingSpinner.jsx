/** Shared "AI is generating" spinner card. */
export default function GeneratingSpinner({ label = 'Generating...', color = '#1A1A2E' }) {
  return (
    <div className="brutalist-card p-12 text-center">
      <div
        className="animate-spin rounded-full mx-auto mb-4"
        style={{
          width: 40,
          height: 40,
          border: `4px solid ${color}22`,
          borderTopColor: color,
        }}
      />
      <p className="text-navy/50 text-sm font-bold uppercase">{label}</p>
    </div>
  )
}

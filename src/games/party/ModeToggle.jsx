/** "Solo / Party" switch shown at the top of the party-capable games. */
export default function ModeToggle({ mode, onChange, color = '#1A1A2E' }) {
  const options = [
    { id: 'solo', label: 'Solo' },
    { id: 'party', label: 'Party' },
  ]
  return (
    <div className="grid grid-cols-2 border-2 border-navy bg-white" role="tablist" aria-label="Game mode">
      {options.map((o) => {
        const active = mode === o.id
        return (
          <button key={o.id} role="tab" aria-selected={active} onClick={() => onChange(o.id)}
            className={`py-2.5 text-sm font-black uppercase transition-colors ${active ? 'text-white' : 'text-navy/50 hover:text-navy'}`}
            style={active ? { background: color } : undefined}>
            {o.id === 'party' ? '👥 ' : '👤 '}{o.label}
          </button>
        )
      })}
    </div>
  )
}

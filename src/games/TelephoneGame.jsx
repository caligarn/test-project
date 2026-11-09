import { useState } from 'react'
import TelephoneSolo from './telephone/TelephoneSolo'
import TelephoneParty from './telephone/TelephoneParty'

function initialMode() {
  try {
    return new URLSearchParams(window.location.search).get('room') ? 'party' : 'solo'
  } catch {
    return 'solo'
  }
}

export default function TelephoneGame({ game }) {
  const [mode, setMode] = useState(initialMode)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 border-[3px] border-navy" role="tablist" aria-label="Game mode">
        {[
          { id: 'solo', label: 'Solo' },
          { id: 'party', label: 'Party' },
        ].map((m) => (
          <button key={m.id} role="tab" aria-selected={mode === m.id} onClick={() => setMode(m.id)}
            className={`py-2 text-sm font-black uppercase ${mode === m.id ? 'bg-navy text-white' : 'bg-white text-navy hover:bg-navy/5'}`}>
            {m.label}
          </button>
        ))}
      </div>
      {mode === 'solo' ? <TelephoneSolo game={game} /> : <TelephoneParty game={game} />}
    </div>
  )
}

import GameImage from '../../components/game/GameImage'

/**
 * One telephone chain, step by step, side by side.
 * cards: [{ label, text, imageUrl, skipped }]
 */
export default function ChainStrip({ cards }) {
  return (
    <ol className="grid grid-cols-2 sm:grid-cols-3 gap-3 list-none p-0 m-0">
      {cards.map((c, i) => {
        const first = i === 0
        const last = i === cards.length - 1
        return (
          <li key={i}
            className={`brutalist-card p-2 flex flex-col gap-2 min-w-0 ${first ? 'border-l-8 border-l-green-500' : last ? 'border-l-8 border-l-primary' : ''}`}>
            <p className="text-[10px] font-black text-navy/50 uppercase truncate">{i + 1}. {c.label}</p>
            {c.skipped ? (
              <div className="aspect-square flex items-center justify-center bg-navy/5 text-navy/40 text-xs font-black uppercase text-center p-2">
                Skipped, the image stays the same
              </div>
            ) : (
              <>
                {c.text && (
                  <p className={`text-xs font-medium break-words ${first ? 'text-navy font-bold' : 'text-navy/80'}`}>"{c.text}"</p>
                )}
                {c.imageUrl && (
                  <div className="border-2 border-navy overflow-hidden aspect-square">
                    <GameImage src={c.imageUrl} alt={c.text || ''} className="w-full h-full object-cover" />
                  </div>
                )}
              </>
            )}
          </li>
        )
      })}
    </ol>
  )
}

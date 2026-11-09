import { useState, useRef, useCallback, useEffect } from 'react'
import { createLivePreview } from './livePreview'
import { useLatestRef } from './useLatestRef'

/**
 * Live preview while a player draws and types (see livePreview.js).
 * While `active` (for match `matchId`), call poke() whenever the input changes.
 *
 * The first AI call may show the "Use 1 credit" modal. Calls wait for it, so
 * generation simply starts once the player answers; the game timer keeps
 * running. If they decline, `creditDeclined` is true until retry().
 */
export function useLiveGeneration({ active, matchId, getInput, onImage }) {
  const [declinedMatch, setDeclinedMatch] = useState(null)
  const latest = useLatestRef({ getInput, onImage })
  const engineRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const engine = createLivePreview({
      getInput: () => latest.current.getInput(),
      onImage: (url) => latest.current.onImage(url),
      onCreditDeclined: () => setDeclinedMatch(matchId),
    })
    engineRef.current = engine
    return () => {
      engine.close()
      if (engineRef.current === engine) engineRef.current = null
    }
  }, [active, matchId, latest])

  const poke = useCallback(() => engineRef.current?.poke(), [])
  const retry = useCallback(() => {
    setDeclinedMatch(null)
    engineRef.current?.resume()
  }, [])

  return { poke, retry, creditDeclined: active && declinedMatch === matchId }
}

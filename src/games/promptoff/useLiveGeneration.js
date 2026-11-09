import { useState, useRef, useCallback, useEffect } from 'react'
import { connectRealtime, generateImage } from '../../lib/fal'
import { getHealth } from '../../lib/api'
import { useLatestRef } from './useLatestRef'

// With the realtime socket, fal throttles frames itself, so we send often.
// Without it (mock mode, or realtime failed) every preview is one /api call,
// so we pace them to stay well under the server's per-minute limit.
const REALTIME_INTERVAL_MS = 250
const FALLBACK_INTERVAL_MS = 1600
const FIRST_DELAY_MS = 300 // gather a few keystrokes before the first call
const RATE_LIMIT_PAUSE_MS = 6000

/**
 * Live preview while a player draws and types.
 * While `active`, call poke() whenever the input changes. When it is time to
 * generate, getInput() is read: { prompt, sketch } where sketch is a canvas
 * data URL or null (text only). Sketches go through connectRealtime, text
 * through generateImage. onImage(url) gets each new preview (newest wins).
 *
 * The first AI call may show the "Use 1 credit" modal. Calls wait for it, so
 * generation simply starts once the player answers. If they decline,
 * `needsCredit` is true until retry() is called.
 */
export function useLiveGeneration({ active, getInput, onImage }) {
  const [needsCredit, setNeedsCredit] = useState(false)
  const latest = useLatestRef({ getInput, onImage })
  const s = useRef(null) // per-session state, null while inactive

  const schedule = useCallback(() => {
    const st = s.current
    if (!st || st.timer || !st.dirty || st.blocked) return
    const wait = Math.max(FIRST_DELAY_MS, st.nextAt - Date.now())
    st.timer = setTimeout(() => fire(st), wait)
    // fire is hoisted below; it only runs while this session is current
  }, []) // eslint-plugin wants a stable callback; fire reads everything from st

  const fire = useCallback(
    (st) => {
      st.timer = null
      if (s.current !== st || !st.dirty || st.blocked) return
      if (st.textBusy) return // reschedules when the text call finishes
      const input = latest.current.getInput()
      st.dirty = false
      if (!input || (!input.prompt && !input.sketch)) return
      st.nextAt = Date.now() + (st.paced ? FALLBACK_INTERVAL_MS : REALTIME_INTERVAL_MS)
      if (input.sketch) {
        st.mode = 'sketch'
        st.realtime.send({
          prompt: input.prompt || 'abstract shapes',
          image_url: input.sketch,
          strength: 0.65,
          num_inference_steps: 4,
          guidance_scale: 1,
          seed: 42,
        })
        return
      }
      st.mode = 'text'
      const seq = ++st.textSeq
      st.textBusy = true
      generateImage(input.prompt)
        .then((url) => {
          if (s.current === st && st.mode === 'text' && seq === st.textSeq) latest.current.onImage(url)
        })
        .catch((err) => handleError(st, err))
        .finally(() => {
          st.textBusy = false
          schedule()
        })
    },
    // handleError and schedule are stable (empty deps)
    // eslint can verify this list: both are declared with useCallback below/above
    [latest, schedule] // eslint-disable-line no-use-before-define
  )

  return null
}

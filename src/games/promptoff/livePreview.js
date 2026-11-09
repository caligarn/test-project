// Live preview engine (no React). One instance per match.
import { connectRealtime, generateImage } from '../../lib/fal'
import { getHealth } from '../../lib/api'

// With the realtime socket, fal throttles frames itself, so we send often.
// Without it (mock mode, or realtime failed) every preview is one /api call,
// so we pace them to stay well under the server's per-minute limit.
const REALTIME_INTERVAL_MS = 250
const FALLBACK_INTERVAL_MS = 1600
const FIRST_DELAY_MS = 300 // gather a few keystrokes before a call
const RATE_LIMIT_PAUSE_MS = 6000

/**
 * poke() whenever the input changes. When it is time to generate, getInput()
 * is read: { prompt, sketch } where sketch is a canvas data URL or null.
 * Sketches go through connectRealtime, text-only through generateImage.
 * onImage(url) gets each new preview (newest wins). onCreditDeclined() runs
 * if the player said no to the credit modal; previews pause until resume().
 */
export function createLivePreview({ getInput, onImage, onCreditDeclined }) {
  let closed = false
  let paced = true // until we know realtime is available
  let timer = null
  let dirty = false
  let blocked = false
  let nextAt = 0
  let mode = null // 'sketch' | 'text': the newest request decides which results count
  let textSeq = 0
  let textBusy = false // a text call is in flight
  let sketchBusy = false // a paced sketch call is in flight

  function handleError(err) {
    if (closed) return
    if (err?.code === 'cancelled') {
      blocked = true
      onCreditDeclined?.()
    } else if (err?.code === 'rate_limited') {
      nextAt = Date.now() + RATE_LIMIT_PAUSE_MS
      dirty = true
    } else {
      // Realtime trouble: connectRealtime falls back to one call at a time.
      paced = true
    }
    schedule()
  }

  const realtime = connectRealtime(
    (url) => {
      if (closed) return
      if (mode === 'sketch') onImage(url)
      sketchBusy = false
      schedule()
    },
    (err) => {
      sketchBusy = false
      handleError(err)
    }
  )

  getHealth().then((h) => {
    if (!closed && h.realtime) paced = false
  })

  function schedule() {
    if (closed || timer || !dirty || blocked) return
    const wait = Math.max(FIRST_DELAY_MS, nextAt - Date.now())
    timer = setTimeout(fire, wait)
  }

  function fire() {
    timer = null
    if (closed || !dirty || blocked || textBusy || sketchBusy) return
    const input = getInput()
    dirty = false
    if (!input || (!input.prompt && !input.sketch)) return
    nextAt = Date.now() + (paced ? FALLBACK_INTERVAL_MS : REALTIME_INTERVAL_MS)
    if (input.sketch) {
      mode = 'sketch'
      // In paced mode connectRealtime runs one call at a time: wait for it, so
      // a declined credit is not asked again for queued input.
      sketchBusy = paced
      realtime.send({
        prompt: input.prompt || 'abstract shapes',
        image_url: input.sketch,
        strength: 0.65,
        num_inference_steps: 4,
        guidance_scale: 1,
        seed: 42,
      })
      return
    }
    mode = 'text'
    const seq = ++textSeq
    textBusy = true
    generateImage(input.prompt)
      .then((url) => {
        textBusy = false
        if (closed) return
        if (mode === 'text' && seq === textSeq) onImage(url)
        schedule()
      })
      .catch((err) => {
        textBusy = false
        handleError(err)
      })
  }

  return {
    poke() {
      dirty = true
      schedule()
    },
    resume() {
      blocked = false
      dirty = true
      schedule()
    },
    close() {
      closed = true
      if (timer) clearTimeout(timer)
      realtime.close()
    },
  }
}

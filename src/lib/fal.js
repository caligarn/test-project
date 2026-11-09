// AI image helpers for the games. Every call goes through our server
// (/api/*), which holds the fal.ai key, checks the play ticket, and applies
// rate limits. The function names match the old direct-to-fal.ai version.

import { fal } from '@fal-ai/client'
import { api, getHealth } from './api'
import { withTicket } from './play'

const post = (path, body) => withTicket((ticket) => api(path, { method: 'POST', body, ticket }))

export async function generateImage(prompt, { width = 512, height = 512, seed } = {}) {
  const { images } = await post('/generate', { prompt, width, height, seed })
  return images[0]
}

export async function generateImageVariations(prompt, count = 4) {
  const { images } = await post('/generate', { prompt, numImages: count })
  return images
}

/** Real image editing: keeps the scene and applies the instruction. */
export async function editImage(prompt, imageUrl) {
  const { image } = await post('/edit', { prompt, imageUrl })
  return image
}

export async function generateFromSketch(prompt, imageDataUrl, { strength = 0.65 } = {}) {
  const { image } = await post('/sketch', { prompt, imageUrl: imageDataUrl, strength })
  return image
}

/**
 * AI judge. Modes (fields):
 *   'match-image' { targetUrl, imageUrl }    how close is the recreation
 *   'match-text'  { imageUrl, text }         does the image show the concept
 *   'caption'     { imageUrl, text }         is the caption witty and fitting
 *   'emoji'       { imageUrl, text }         did the emoji image show the scene (text = target scene)
 *   'edit'        { beforeUrl, imageUrl, text } was the change applied well
 *   'drift'       { targetUrl, imageUrl }    how much survived a telephone chain
 * Returns { score: 0-100 | null, comment, judged }. Never throws: when the
 * judge is unavailable, score is null and the game uses its own fallback.
 */
export async function judge(mode, fields) {
  try {
    return await post('/judge', { mode, ...fields })
  } catch (err) {
    console.warn('Judge unavailable:', err.message)
    return { score: null, comment: '', judged: false, error: err.code || 'error' }
  }
}

/**
 * Live sketch-to-image. Returns { send(input), close() }.
 * With a real fal.ai key it uses fal's realtime socket with a short-lived
 * token from our server. In mock mode (or if realtime fails) it falls back to
 * one /api/sketch call at a time, always using the newest input.
 */
export function connectRealtime(onResult, onError) {
  let closed = false
  let socket = null
  let busy = false
  let latest = null
  let useFallback = false

  async function runFallback() {
    if (busy || !latest || closed) return
    busy = true
    const input = latest
    latest = null
    try {
      const url = await generateFromSketch(input.prompt, input.image_url, { strength: input.strength })
      if (!closed) onResult(url)
    } catch (err) {
      if (!closed && onError) onError(err)
    }
    busy = false
    if (latest) runFallback()
  }

  const ready = getHealth().then((health) => {
    if (closed) return
    if (!health.realtime) {
      useFallback = true
      return
    }
    socket = fal.realtime.connect(health.realtimeModel || 'fal-ai/lcm-sd15-i2i', {
      connectionKey: 'prompt-off-' + Math.random().toString(36).slice(2, 8),
      throttleInterval: 200,
      tokenExpirationSeconds: 110,
      tokenProvider: async () => (await post('/realtime-token', {})).token,
      onResult: (result) => {
        const url = result?.images?.[0]?.url
        if (url && !closed) onResult(url)
      },
      onError: (error) => {
        console.warn('Realtime generation error, using fallback:', error)
        useFallback = true
        if (onError) onError(error)
      },
    })
  })

  return {
    send(input) {
      if (closed) return
      if (socket && !useFallback) {
        socket.send(input)
        return
      }
      latest = input
      ready.then(() => {
        if (socket && !useFallback) {
          if (latest) socket.send(latest)
          latest = null
        } else runFallback()
      })
    },
    close() {
      closed = true
      if (socket) {
        try {
          socket.close()
        } catch {
          // ignore
        }
      }
    },
  }
}

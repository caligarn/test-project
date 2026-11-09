// Server-side fal.ai calls. The API key never leaves the server.
// In mock mode every call returns local fake data instead.

import { getConfig } from './config.js'
import { HttpError } from './http.js'
import { mockImage, mockPromptOf, isMockImage } from './mockImages.js'

const FAL_RUN = 'https://fal.run'
const FAL_REST = 'https://rest.alpha.fal.ai'

function requireKey() {
  const { falKey } = getConfig()
  if (!falKey) throw new HttpError(503, 'not_configured', 'Image generation is not configured on the server (FAL_KEY is missing).')
  return falKey
}

async function falRun(endpoint, input, { timeoutMs = 60000 } = {}) {
  const key = requireKey()
  let res
  try {
    res = await fetch(`${FAL_RUN}/${endpoint}`, {
      method: 'POST',
      headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    throw new HttpError(504, 'upstream_timeout', `Image service did not answer (${err.name})`)
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.warn(`fal ${endpoint} failed ${res.status}: ${detail.slice(0, 300)}`)
    if (res.status === 429) throw new HttpError(429, 'rate_limited', 'The image service is busy. Try again in a moment.')
    if (res.status === 422) throw new HttpError(422, 'rejected', 'The image service rejected this request (it may break content rules).')
    throw new HttpError(502, 'upstream_error', 'The image service failed. Try again.')
  }
  return res.json()
}

function firstImage(output) {
  const url = output?.images?.[0]?.url || output?.image?.url
  if (!url) throw new HttpError(502, 'upstream_error', 'The image service returned no image.')
  return url
}

/** Allowed image sources for inputs (edits, judging, galleries). */
export function isAllowedImageUrl(url, { allowDataImages = false } = {}) {
  if (typeof url !== 'string' || url.length > 2_000_000) return false
  if (isMockImage(url)) return getConfig().mock
  if (url.startsWith('data:')) return allowDataImages && /^data:image\/(png|jpeg|webp);base64,/.test(url)
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    const h = u.hostname
    return (
      h === 'fal.media' || h.endsWith('.fal.media') ||
      h === 'fal.run' || h.endsWith('.fal.run') ||
      h.endsWith('.fal.ai') ||
      (h === 'storage.googleapis.com' && u.pathname.startsWith('/falserverless'))
    )
  } catch {
    return false
  }
}

export async function textToImage({ prompt, width = 512, height = 512, numImages = 1, seed }) {
  const cfg = getConfig()
  if (cfg.mock) {
    return Array.from({ length: numImages }, (_, i) => mockImage(prompt, { seed: (seed ?? Math.random() * 1e9) + i, width, height }))
  }
  const input = { prompt, image_size: { width, height }, num_images: numImages, enable_safety_checker: true }
  if (Number.isInteger(seed)) input.seed = seed
  const out = await falRun(cfg.imageModel, input)
  const urls = (out.images || []).map((img) => img.url).filter(Boolean)
  if (urls.length === 0) throw new HttpError(502, 'upstream_error', 'The image service returned no image.')
  return urls
}

/** Real image editing (keeps the scene, applies the instruction). */
export async function editImage({ prompt, imageUrl }) {
  const cfg = getConfig()
  if (cfg.mock) {
    const base = mockPromptOf(imageUrl) || 'image'
    return mockImage(`${base}, edited: ${prompt}`, { baseImage: null })
  }
  const out = await falRun(cfg.editModel, { prompt, image_url: imageUrl, num_images: 1, output_format: 'jpeg' }, { timeoutMs: 90000 })
  return firstImage(out)
}

export async function sketchToImage({ prompt, imageUrl, strength = 0.65 }) {
  const cfg = getConfig()
  if (cfg.mock) return mockImage(prompt, { baseImage: imageUrl })
  const out = await falRun(cfg.sketchModel, {
    prompt,
    image_url: imageUrl,
    strength,
    num_inference_steps: 4,
    guidance_scale: 1,
    num_images: 1,
  }, { timeoutMs: 30000 })
  return firstImage(out)
}

/** Short-lived token so the browser can open the realtime socket without the key. */
export async function realtimeToken() {
  const cfg = getConfig()
  if (cfg.mock) return { token: 'mock-token', app: cfg.realtimeModel, mock: true }
  const key = requireKey()
  const alias = cfg.realtimeModel.split('/').slice(1).join('/') || cfg.realtimeModel
  const res = await fetch(`${FAL_REST}/tokens/`, {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ allowed_apps: [alias], token_expiration: 120 }),
    signal: AbortSignal.timeout(15000),
  }).catch(() => null)
  if (!res || !res.ok) throw new HttpError(502, 'upstream_error', 'Could not start live generation.')
  const token = await res.json()
  return { token: typeof token === 'string' ? token : token?.detail, app: cfg.realtimeModel, mock: false }
}

/** Ask a vision language model a question about one or more images. Returns raw text. */
export async function visionLLM({ prompt, systemPrompt, imageUrls }) {
  const cfg = getConfig()
  const input = cfg.judgeEndpoint.includes('any-llm')
    ? { model: cfg.judgeModel, prompt, system_prompt: systemPrompt, image_url: imageUrls[0] }
    : { model: cfg.judgeModel, prompt, system_prompt: systemPrompt, image_urls: imageUrls, temperature: 0.2, max_tokens: 200 }
  const out = await falRun(cfg.judgeEndpoint, input, { timeoutMs: 45000 })
  return String(out?.output ?? '')
}

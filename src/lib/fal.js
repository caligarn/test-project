import { fal } from '@fal-ai/client'

const DEFAULT_KEY = '96d135df-dcc0-4449-bf1a-c27a64f3d39a:03687b0b7f91482a8765ac9e72e809f3'
let configured = false

export function configureFal(apiKey) {
  if (apiKey) {
    fal.config({
      credentials: apiKey,
      requestMiddleware: async (request) => {
        // Remove any proxy routing — hit fal.ai directly
        return request
      },
    })
    configured = true
    localStorage.setItem('fal_api_key', apiKey)
  }
}

export function isConfigured() {
  if (!configured) {
    const saved = localStorage.getItem('fal_api_key')
    if (saved) {
      configureFal(saved)
      return true
    }
    // Use default key
    configureFal(DEFAULT_KEY)
    return true
  }
  return configured
}

async function withRetry(fn, retries = 5, baseDelay = 800) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err) {
      const isRateLimit =
        err?.status === 429 ||
        err?.statusCode === 429 ||
        String(err?.message).toLowerCase().includes('rate limit') ||
        String(err?.message).toLowerCase().includes('too many')
      if (isRateLimit && i < retries - 1) {
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 400
        console.warn(`Rate limited — retrying in ${Math.round(delay)}ms (attempt ${i + 1}/${retries})`)
        await new Promise(r => setTimeout(r, delay))
      } else {
        throw err
      }
    }
  }
}

export async function generateImage(prompt, options = {}) {
  const {
    model = 'fal-ai/flux/schnell',
    width = 512,
    height = 512,
  } = options

  return withRetry(async () => {
    const result = await fal.subscribe(model, {
      input: {
        prompt,
        image_size: { width, height },
        num_images: 1,
      },
      pollInterval: 800,
      timeout: 90000,
    })
    return result.data.images[0].url
  })
}

export async function generateImageVariations(prompt, count = 4) {
  return withRetry(async () => {
    const result = await fal.subscribe('fal-ai/flux/schnell', {
      input: {
        prompt,
        image_size: { width: 512, height: 512 },
        num_images: count,
      },
      pollInterval: 800,
      timeout: 90000,
    })
    return result.data.images.map((img) => img.url)
  })
}

// Real-time image-to-image generation (Krea-style)
export function connectRealtime(onResult, onError) {
  isConfigured()
  const connection = fal.realtime.connect('fal-ai/lcm-sd15-i2i', {
    connectionKey: 'prompt-off-' + Math.random().toString(36).slice(2, 8),
    throttleInterval: 200,
    onResult: (result) => {
      if (result?.images?.[0]?.url) {
        onResult(result.images[0].url)
      }
    },
    onError: (error) => {
      console.warn('Realtime generation error:', error)
      if (onError) onError(error)
    },
  })
  return connection
}

// Standard image-to-image fallback
export async function generateFromSketch(prompt, imageDataUrl, options = {}) {
  const { strength = 0.65 } = options
  return withRetry(async () => {
    const result = await fal.subscribe('fal-ai/lcm-sd15-i2i', {
      input: {
        prompt,
        image_url: imageDataUrl,
        strength,
        num_inference_steps: 4,
        guidance_scale: 1,
        num_images: 1,
      },
      pollInterval: 300,
      timeout: 30000,
    })
    return result.data.images[0].url
  }, 3, 500)
}

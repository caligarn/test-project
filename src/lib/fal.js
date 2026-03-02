import { fal } from '@fal-ai/client'

let configured = false

export function configureFal(apiKey) {
  if (apiKey) {
    fal.config({ credentials: apiKey })
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
  }
  return configured
}

export async function generateImage(prompt, options = {}) {
  const {
    model = 'fal-ai/flux/schnell',
    width = 512,
    height = 512,
  } = options

  const result = await fal.subscribe(model, {
    input: {
      prompt,
      image_size: { width, height },
      num_images: 1,
    },
  })

  return result.data.images[0].url
}

export async function generateImageVariations(prompt, count = 4) {
  const result = await fal.subscribe('fal-ai/flux/schnell', {
    input: {
      prompt,
      image_size: { width: 512, height: 512 },
      num_images: count,
    },
  })

  return result.data.images.map((img) => img.url)
}

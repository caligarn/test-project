import { createHash } from 'node:crypto'

// Server configuration, read from environment variables on every call so
// tests and the dev server can change them without a restart.

function int(value, fallback) {
  const n = parseInt(value, 10)
  return Number.isFinite(n) ? n : fallback
}

function parseRedeemCodes(raw) {
  const codes = {}
  for (const part of String(raw || '').split(',')) {
    const [code, amount] = part.split(':').map((s) => s && s.trim())
    if (code && int(amount, 0) > 0) codes[code.toUpperCase()] = int(amount, 0)
  }
  return codes
}

export function isProduction() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL)
}

/**
 * Secret that signs login sessions. SESSION_SECRET when set. Otherwise it is
 * derived from the Redis token, which is already a server-only secret, so the
 * only required setup is the Upstash integration. (Rotating that token logs
 * everyone out.) In local development without either, a fixed dev secret.
 */
function sessionSecret(explicit, redisToken) {
  if (explicit) return explicit
  if (redisToken) return createHash('sha256').update(`gen-arcade-session:${redisToken}`).digest('hex')
  return isProduction() ? '' : 'dev-only-insecure-session-secret'
}

export function getConfig() {
  const env = process.env
  const falKey = env.FAL_KEY || ''
  // Demo (mock) mode: fake images and a fake judge. On when FAL_MOCK=1 or
  // when no fal.ai key is set. The site shows a "Demo mode" banner, so fake
  // images are never mistaken for real ones.
  const mock = env.FAL_MOCK === '1' || !falKey
  const redisUrl = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || ''
  const redisToken = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || ''
  return {
    falKey,
    mock,
    sessionSecret: sessionSecret(env.SESSION_SECRET, redisToken),
    redisUrl,
    redisToken,
    freeDailyCredits: int(env.FREE_DAILY_CREDITS, 5),
    dailyGenerationCap: int(env.DAILY_GENERATION_CAP, 3000),
    perMinuteLimit: int(env.RATE_LIMIT_PER_MINUTE, 200),
    guestCreditsPerIp: int(env.GUEST_CREDITS_PER_IP, 150),
    redeemCodes: parseRedeemCodes(env.REDEEM_CODES),
    imageModel: env.FAL_IMAGE_MODEL || 'fal-ai/flux/schnell',
    editModel: env.FAL_EDIT_MODEL || 'fal-ai/flux-pro/kontext',
    sketchModel: env.FAL_SKETCH_MODEL || 'fal-ai/lcm-sd15-i2i',
    realtimeModel: env.FAL_REALTIME_MODEL || 'fal-ai/lcm-sd15-i2i',
    judgeEndpoint: env.FAL_JUDGE_ENDPOINT || 'openrouter/router/vision',
    judgeModel: env.FAL_JUDGE_MODEL || 'google/gemini-2.5-flash',
  }
}

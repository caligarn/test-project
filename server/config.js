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

export function getConfig() {
  const env = process.env
  const falKey = env.FAL_KEY || ''
  // Mock mode: fake images and a fake judge. On by request, or automatically
  // in local development when no key is set. Never automatic in production.
  const mock = env.FAL_MOCK === '1' || (!falKey && !isProduction())
  return {
    falKey,
    mock,
    sessionSecret: env.SESSION_SECRET || (isProduction() ? '' : 'dev-only-insecure-session-secret'),
    redisUrl: env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || '',
    redisToken: env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || '',
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

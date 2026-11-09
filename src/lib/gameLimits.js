// Per-game limits, shared by the server (enforcement) and the browser (display).
// maxUnits: AI calls (images + judge calls) one credit buys in this game.
// maxScore: highest believable total for one game (rejects tampered scores).

export const GAME_LIMITS = {
  'prompt-off': { maxUnits: 300, maxScore: 2000 },
  'prompt-guesser': { maxUnits: 20, maxScore: 1000 },
  'speed-prompt': { maxUnits: 15, maxScore: 1000 },
  'style-roulette': { maxUnits: 12, maxScore: 1500 },
  'spot-the-fake': { maxUnits: 25, maxScore: 1500 },
  'dream-caption': { maxUnits: 12, maxScore: 1500 },
  'ai-remix': { maxUnits: 15, maxScore: 1000 },
  'telephone': { maxUnits: 10, maxScore: 1000 },
  'emoji-prompt': { maxUnits: 15, maxScore: 1500 },
  'infinimap': { maxUnits: 10, maxScore: 1000 },
  'haiku-canvas': { maxUnits: 8, maxScore: 1000 },
  'community-comic': { maxUnits: 6, maxScore: 1000 },
  'before-after': { maxUnits: 10, maxScore: 1000 },
}

export const GAME_IDS = Object.keys(GAME_LIMITS)

export function gameLimits(gameId) {
  return GAME_LIMITS[gameId] || null
}

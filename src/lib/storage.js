const USERS_KEY = 'ai_arcade_users'
const CURRENT_USER_KEY = 'ai_arcade_current_user'
const SCORES_KEY = 'ai_arcade_scores'
const SUBSCRIPTION_KEY = 'ai_arcade_subscription'
const MAX_SCORES = 500

/**
 * Write JSON to localStorage without throwing. Quota is easy to hit because
 * the games persist galleries of image URLs, and an unhandled QuotaExceeded
 * error inside a game's submit handler surfaces as a bogus "check your API
 * key" message.
 */
export function safeSetItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (err) {
    console.warn(`Could not persist "${key}" — storage may be full.`, err)
    return false
  }
}

let entryCounter = 0

/**
 * Unique id for a gallery entry. Date.now() on its own collides when two
 * entries are created within the same millisecond, which duplicates React keys
 * and makes per-entry actions (voting, zooming) hit the wrong item.
 */
export function createEntryId() {
  entryCounter += 1
  return `${Date.now()}-${entryCounter}`
}

/** Read and parse JSON from localStorage, falling back on corrupt data. */
export function safeGetItem(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

// User management
export function getUsers() {
  return safeGetItem(USERS_KEY, {})
}

export function createUser(username, password, avatar) {
  const users = getUsers()
  if (users[username]) return { error: 'Username already taken' }

  users[username] = {
    username,
    password,
    avatar: avatar || getRandomAvatar(),
    createdAt: Date.now(),
    gamesPlayed: 0,
    totalScore: 0,
    streak: 0,
    achievements: [],
  }
  safeSetItem(USERS_KEY, users)
  return { success: true, user: users[username] }
}

export function loginUser(username, password) {
  const users = getUsers()
  const user = users[username]
  if (!user) return { error: 'User not found' }
  if (user.password !== password) return { error: 'Incorrect password' }

  localStorage.setItem(CURRENT_USER_KEY, username)
  return { success: true, user }
}

export function getCurrentUser() {
  const username = localStorage.getItem(CURRENT_USER_KEY)
  if (!username) return null
  const users = getUsers()
  return users[username] || null
}

export function logoutUser() {
  localStorage.removeItem(CURRENT_USER_KEY)
}

export function updateUser(username, updates) {
  const users = getUsers()
  if (!users[username]) return
  users[username] = { ...users[username], ...updates }
  safeSetItem(USERS_KEY, users)
  return users[username]
}

// Score management
export function getScores() {
  const scores = safeGetItem(SCORES_KEY, [])
  return Array.isArray(scores) ? scores : []
}

export function addScore(gameId, username, score, details = {}) {
  const scores = getScores()
  scores.push({
    gameId,
    username,
    score,
    details,
    timestamp: Date.now(),
  })
  // Bound the history — it grows on every play and is only read in aggregate.
  safeSetItem(SCORES_KEY, scores.slice(-MAX_SCORES))

  // Update stats on the scoring user, not whoever is currently signed in.
  const users = getUsers()
  const user = users[username]
  if (user) {
    updateUser(username, {
      gamesPlayed: (user.gamesPlayed || 0) + 1,
      totalScore: (user.totalScore || 0) + score,
    })
  }
}

export function getLeaderboard(gameId = null, limit = 50) {
  const scores = getScores()

  const filtered = gameId
    ? scores.filter((s) => s.gameId === gameId)
    : scores

  // Aggregate by user - best score per game
  const userBests = {}
  filtered.forEach((s) => {
    const key = s.username
    if (!userBests[key] || s.score > userBests[key].score) {
      userBests[key] = s
    }
  })

  if (!gameId) {
    // Overall: sum of best scores per game per user
    const userTotals = {}
    scores.forEach((s) => {
      if (!userTotals[s.username]) userTotals[s.username] = {}
      if (
        !userTotals[s.username][s.gameId] ||
        s.score > userTotals[s.username][s.gameId]
      ) {
        userTotals[s.username][s.gameId] = s.score
      }
    })

    return Object.entries(userTotals)
      .map(([username, games]) => ({
        username,
        score: Object.values(games).reduce((a, b) => a + b, 0),
        gamesPlayed: Object.keys(games).length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  return Object.values(userBests)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// Subscription
export function getSubscription() {
  return safeGetItem(SUBSCRIPTION_KEY, null)
}

export function setSubscription(plan) {
  safeSetItem(SUBSCRIPTION_KEY, {
    plan,
    startedAt: Date.now(),
    active: true,
  })
}

export function isSubscribed() {
  const sub = getSubscription()
  return sub && sub.active
}

// Credits
const CREDITS_KEY = 'ai_arcade_credits'
const FREE_DAILY_CREDITS = 3
const LAST_FREE_CREDITS_KEY = 'ai_arcade_last_free_credits'

export function getCredits(username) {
  const credits = safeGetItem(CREDITS_KEY, {})
  if (!credits[username]) credits[username] = 0

  // Award free daily credits
  const lastFree = safeGetItem(LAST_FREE_CREDITS_KEY, {})
  const today = new Date().toDateString()
  if (lastFree[username] !== today) {
    credits[username] += FREE_DAILY_CREDITS
    lastFree[username] = today
    safeSetItem(CREDITS_KEY, credits)
    safeSetItem(LAST_FREE_CREDITS_KEY, lastFree)
  }

  return credits[username]
}

export function useCredit(username) {
  const credits = safeGetItem(CREDITS_KEY, {})
  if (!credits[username] || credits[username] <= 0) return false
  credits[username] -= 1
  safeSetItem(CREDITS_KEY, credits)
  return true
}

export function addCredits(username, amount) {
  const credits = safeGetItem(CREDITS_KEY, {})
  credits[username] = (credits[username] || 0) + amount
  safeSetItem(CREDITS_KEY, credits)
  return credits[username]
}

// Avatars
const AVATARS = [
  '🤖', '👾', '🎮', '🕹️', '🎯', '🎨', '🧠', '⚡',
  '🔮', '🌟', '🎪', '🎭', '🦊', '🐉', '🦄', '🌈',
]

export function getRandomAvatar() {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)]
}

export function getAvatars() {
  return AVATARS
}

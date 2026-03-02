const USERS_KEY = 'ai_arcade_users'
const CURRENT_USER_KEY = 'ai_arcade_current_user'
const SCORES_KEY = 'ai_arcade_scores'
const SUBSCRIPTION_KEY = 'ai_arcade_subscription'

// User management
export function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY) || '{}')
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
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
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
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
  return users[username]
}

// Score management
export function getScores() {
  return JSON.parse(localStorage.getItem(SCORES_KEY) || '[]')
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
  localStorage.setItem(SCORES_KEY, JSON.stringify(scores))

  // Update user stats
  const user = getCurrentUser()
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
    const key = gameId ? s.username : `${s.username}`
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
  return JSON.parse(localStorage.getItem(SUBSCRIPTION_KEY) || 'null')
}

export function setSubscription(plan) {
  localStorage.setItem(
    SUBSCRIPTION_KEY,
    JSON.stringify({
      plan,
      startedAt: Date.now(),
      active: true,
    })
  )
}

export function isSubscribed() {
  const sub = getSubscription()
  return sub && sub.active
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

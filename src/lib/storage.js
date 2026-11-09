// Scores, leaderboards, and small local helpers.
// Accounts, credits, and leaderboards now live on the server (see api.js).
// The browser keeps only a local score history, so guests still see their
// own results on the Profile page.

import { api, getSessionToken } from './api'
import { getTicket } from './play'

const LOCAL_SCORES_KEY = 'gen_arcade_local_scores'
const LEGACY_USERS_KEY = 'ai_arcade_users'

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null')
    return value ?? fallback
  } catch {
    return fallback
  }
}
function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or unavailable: local history is a nice-to-have
  }
}

/** Local score history for this browser (newest first). */
export function getLocalScores() {
  const list = readJson(LOCAL_SCORES_KEY, [])
  return Array.isArray(list) ? list : []
}

/**
 * Record a finished game. Logged-in players post to the shared leaderboard
 * (the server checks the game's play ticket); everyone keeps a local copy.
 * The `username` argument is kept for old call sites and is not used: the
 * server takes the name from the session.
 * Resolves to the server reply ({ best, newBest }) or null for guests/errors.
 */
export async function addScore(gameId, _username, score, details = {}) {
  const entry = { gameId, score: Math.round(score), details, timestamp: Date.now() }
  writeJson(LOCAL_SCORES_KEY, [entry, ...getLocalScores()].slice(0, 100))
  if (!getSessionToken()) return null
  try {
    return await api('/scores', { method: 'POST', body: { gameId, score: entry.score, details }, ticket: getTicket(gameId) })
  } catch (err) {
    console.warn('Score not posted:', err.message)
    return null
  }
}

/** Shared leaderboard rows: [{ rank, username, score, avatar }]. gameId: id, 'all', or 'daily'. */
export async function getLeaderboard(gameId = 'all', limit = 50) {
  const { rows } = await api(`/leaderboard?game=${encodeURIComponent(gameId || 'all')}&limit=${limit}`)
  return rows
}

// --- avatars --------------------------------------------------------------

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

// --- one-time migration of old browser-only accounts ----------------------

/** Old local account (plain-text password) for this name, if any. */
export function getLegacyUser(username) {
  const users = readJson(LEGACY_USERS_KEY, {})
  return users && typeof users === 'object' ? users[username] || null : null
}

/** Delete the old local account once it moved to the server. */
export function removeLegacyUser(username) {
  const users = readJson(LEGACY_USERS_KEY, {})
  if (users && users[username]) {
    delete users[username]
    writeJson(LEGACY_USERS_KEY, users)
  }
}

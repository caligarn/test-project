// Play tickets: one credit buys a ticket for one game; AI calls use units
// from it. When a call needs a (new) ticket, we ask the player first through
// the handler the CreditProvider registers, then start one and retry.

import { api, ApiError } from './api'

const TICKETS_KEY = 'gen_arcade_tickets'
let activeGame = null
let confirmHandler = null
const pending = {}

function loadTickets() {
  try {
    return JSON.parse(sessionStorage.getItem(TICKETS_KEY) || '{}') || {}
  } catch {
    return {}
  }
}
const tickets = loadTickets()
function saveTickets() {
  try {
    sessionStorage.setItem(TICKETS_KEY, JSON.stringify(tickets))
  } catch {
    // ignore
  }
}

export function setActiveGame(gameId) {
  activeGame = gameId
}
export function getActiveGame() {
  return activeGame
}
export function getTicket(gameId = activeGame) {
  return gameId ? tickets[gameId] || null : null
}

/** The CreditProvider registers an async ({ gameId, reason }) => boolean. */
export function registerCreditConfirm(fn) {
  confirmHandler = fn
  return () => {
    if (confirmHandler === fn) confirmHandler = null
  }
}

export function creditsChanged() {
  window.dispatchEvent(new Event('credits-changed'))
}

export async function startTicket(gameId = activeGame) {
  const data = await api('/play/start', { method: 'POST', body: { gameId } })
  tickets[gameId] = data.ticket
  saveTickets()
  creditsChanged()
  return data.ticket
}

function needsTicket(err) {
  return err instanceof ApiError && err.status === 402 && (err.code === 'ticket_required' || err.code === 'ticket_exhausted')
}

/** Ask once (shared by parallel calls), then start a ticket. */
function ensureNewTicket(gameId, reason) {
  pending[gameId] ||= (async () => {
    try {
      const ok = confirmHandler ? await confirmHandler({ gameId, reason }) : true
      if (!ok) throw new ApiError(402, 'cancelled', 'You need a credit to use AI images in this game.')
      return await startTicket(gameId)
    } finally {
      delete pending[gameId]
    }
  })()
  return pending[gameId]
}

/**
 * Run fn(ticket). If the server says a ticket is needed or used up, ask the
 * player to spend a credit, start a ticket, and run fn once more.
 */
export async function withTicket(fn, gameId = activeGame) {
  if (!gameId) throw new ApiError(400, 'no_game', 'No game is active.')
  const used = getTicket(gameId)
  try {
    return await fn(used)
  } catch (err) {
    if (!needsTicket(err)) throw err
    // A parallel call may already have started a fresh ticket.
    const current = getTicket(gameId)
    const ticket = current && current !== used ? current : await ensureNewTicket(gameId, err.code)
    return fn(ticket)
  }
}

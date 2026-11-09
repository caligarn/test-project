// Credits, play tickets, and rate limits.
//
// A credit buys one "play ticket" for a game. Every AI call (image or judge)
// must carry a valid ticket and uses units from it, so one credit has a known,
// capped cost. Rate limits per IP and a global daily cap protect the fal.ai bill
// even if someone scripts the API.

import { randomBytes } from 'node:crypto'
import { getConfig } from './config.js'
import { getStore, pairsToObject } from './store.js'
import { HttpError, getIp, today } from './http.js'
import { sessionUser } from './auth.js'
import { gameLimits } from '../src/lib/gameLimits.js'

const DAY = 86400
const TICKET_TTL = 6 * 3600

const CLIENT_ID_RE = /^[a-zA-Z0-9-]{8,64}$/

/**
 * Who pays: a logged-in user, or a guest browser (its random client id).
 * Guests on shared Wi-Fi (events!) each get their own free credits; a
 * per-IP cap on guest credits stops someone farming new ids.
 */
export function payer(req) {
  const user = sessionUser(req)
  if (user) return `u:${user.toLowerCase()}`
  const cid = String(req.headers['x-client-id'] || '')
  return CLIENT_ID_RE.test(cid) ? `c:${cid}` : `ip:${getIp(req)}`
}

export async function getCredits(who) {
  const { freeDailyCredits } = getConfig()
  const [usedFree, paid] = await getStore().pipeline([
    ['GET', `credits:free:${who}:${today()}`],
    ['GET', `credits:paid:${who}`],
  ])
  const free = Math.max(0, freeDailyCredits - Number(usedFree || 0))
  const paidN = Math.max(0, Number(paid || 0))
  return { free, paid: paidN, total: free + paidN, freeDaily: freeDailyCredits }
}

/** Spend one credit: today's free credits first, then paid ones. */
async function spendCredit(who) {
  const store = getStore()
  const { freeDailyCredits } = getConfig()
  const freeKey = `credits:free:${who}:${today()}`
  const used = await store.cmd('INCR', freeKey)
  if (used === 1) await store.cmd('EXPIRE', freeKey, 2 * DAY)
  if (used <= freeDailyCredits) return true
  await store.cmd('DECR', freeKey)
  const paidKey = `credits:paid:${who}`
  const left = await store.cmd('DECR', paidKey)
  if (left >= 0) return true
  await store.cmd('INCR', paidKey)
  return false
}

export async function addPaidCredits(who, amount) {
  return getStore().cmd('INCRBY', `credits:paid:${who}`, amount)
}

export async function startPlay(req, gameId) {
  const limits = gameLimits(gameId)
  if (!limits) throw new HttpError(400, 'bad_game', 'Unknown game.')
  const who = payer(req)
  if (!who.startsWith('u:')) {
    const ipKey = `credits:guestip:${getIp(req)}:${today()}`
    const n = await getStore().cmd('INCR', ipKey)
    if (n === 1) await getStore().cmd('EXPIRE', ipKey, String(2 * DAY))
    if (n > getConfig().guestCreditsPerIp) {
      await getStore().cmd('DECR', ipKey)
      throw new HttpError(402, 'no_credits', 'Too many guest games from this network today. Log in to keep playing.')
    }
  }
  if (!(await spendCredit(who))) {
    throw new HttpError(402, 'no_credits', 'You are out of credits. Free credits refill every day.')
  }
  const id = randomBytes(16).toString('hex')
  const store = getStore()
  await store.pipeline([
    ['HSET', `ticket:${id}`, 'gameId', gameId, 'who', who, 'max', String(limits.maxUnits), 'createdAt', String(Date.now())],
    ['EXPIRE', `ticket:${id}`, String(TICKET_TTL)],
    ['INCR', `plays:${gameId}`],
  ])
  return { ticket: id, gameId, maxUnits: limits.maxUnits, credits: await getCredits(who) }
}

export async function readTicket(req) {
  const id = String(req.headers['x-play-ticket'] || '')
  if (!/^[a-f0-9]{32}$/.test(id)) return null
  const t = pairsToObject(await getStore().cmd('HGETALL', `ticket:${id}`))
  if (!t.gameId) return null
  return { id, gameId: t.gameId, max: Number(t.max), who: t.who }
}

async function checkRateLimits(req, units) {
  const { perMinuteLimit, dailyGenerationCap } = getConfig()
  const store = getStore()
  const minuteKey = `rl:${getIp(req)}:${Math.floor(Date.now() / 60000)}`
  const dayKey = `gen:${today()}`
  const [perMinute, perDay] = await store.pipeline([
    ['INCRBY', minuteKey, String(units)],
    ['INCRBY', dayKey, String(units)],
  ])
  if (perMinute === units) await store.cmd('EXPIRE', minuteKey, '90')
  if (perDay === units) await store.cmd('EXPIRE', dayKey, String(2 * DAY))
  if (perMinute > perMinuteLimit) throw new HttpError(429, 'rate_limited', 'Too many requests. Slow down for a minute.')
  if (perDay > dailyGenerationCap) throw new HttpError(503, 'daily_cap', 'The arcade hit its daily image limit. Come back tomorrow!')
}

/**
 * Use `units` from the request's play ticket. Throws 402 when there is no
 * ticket (client asks the player to spend a credit) or it is used up.
 */
export async function spendTicketUnits(req, units = 1) {
  const ticket = await readTicket(req)
  if (!ticket) throw new HttpError(402, 'ticket_required', 'Start a game to use AI images.')
  const used = await getStore().cmd('INCRBY', `ticket:${ticket.id}:used`, String(units))
  if (used === units) await getStore().cmd('EXPIRE', `ticket:${ticket.id}:used`, String(TICKET_TTL))
  if (used > ticket.max) throw new HttpError(402, 'ticket_exhausted', 'This credit is used up. Spend another credit to keep playing.')
  await checkRateLimits(req, units)
  return ticket
}

export async function ticketUsage(ticketId) {
  return Number((await getStore().cmd('GET', `ticket:${ticketId}:used`)) || 0)
}

/** Light per-IP limit for non-AI writes (logins, gallery posts, votes). */
export async function limitAction(req, name, perMinute) {
  const key = `rl:${name}:${getIp(req)}:${Math.floor(Date.now() / 60000)}`
  const n = await getStore().cmd('INCR', key)
  if (n === 1) await getStore().cmd('EXPIRE', key, '90')
  if (n > perMinute) throw new HttpError(429, 'rate_limited', 'Too many requests. Slow down for a minute.')
}

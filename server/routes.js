// All API routes. One router so Vercel deploys a single function
// (the Hobby plan limits the number of functions) and Vite dev reuses it.

import { getConfig, isProduction } from './config.js'
import { getStore, pairsToObject } from './store.js'
import { HttpError, sendJson, readJson, requireText, getIp, today } from './http.js'
import { textToImage, editImage, sketchToImage, realtimeToken, isAllowedImageUrl } from './fal.js'
import { runJudge } from './judge.js'
import {
  signup, login, sessionUser, requireUser, getUser, publicUser, updateAvatar, avatarsFor,
} from './auth.js'
import {
  payer, getCredits, addPaidCredits, startPlay, spendTicketUnits, readTicket, ticketUsage, limitAction,
} from './economy.js'
import { GAME_IDS, gameLimits } from '../src/lib/gameLimits.js'
import { dailyPrompts, DAILY_ROUNDS, hashString } from './dailyPrompts.js'
import { promptSimilarityDetail } from '../src/lib/similarity.js'
import { handleStripeWebhook } from './stripe.js'

const GALLERY_CAP = 300
const CLIENT_ID_RE = /^[a-zA-Z0-9-]{8,64}$/

// ---------------------------------------------------------------------------
// helpers

function requireGame(gameId) {
  if (!GAME_IDS.includes(gameId)) throw new HttpError(404, 'bad_game', 'Unknown game.')
  return gameId
}

/** Stable voter identity: the account, else the browser's random client id. */
function voterId(req) {
  const user = sessionUser(req)
  if (user) return `u:${user.toLowerCase()}`
  const cid = String(req.headers['x-client-id'] || '')
  if (!CLIENT_ID_RE.test(cid)) throw new HttpError(400, 'bad_request', 'Missing client id.')
  return `c:${cid}`
}

function requireImage(url, field = 'imageUrl', opts) {
  if (!isAllowedImageUrl(url, opts)) throw new HttpError(400, 'bad_request', `${field} must be an image from the image service`)
  return url
}

function smallMeta(meta) {
  if (meta === undefined || meta === null) return {}
  if (typeof meta !== 'object' || Array.isArray(meta)) throw new HttpError(400, 'bad_request', 'meta must be an object')
  if (JSON.stringify(meta).length > 4000) throw new HttpError(400, 'bad_request', 'meta is too large')
  return meta
}

function intIn(value, min, max, fallback) {
  const n = parseInt(value, 10)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, n))
}

async function leaderboardRows(key, limit) {
  const flat = await getStore().cmd('ZREVRANGE', key, '0', String(limit - 1), 'WITHSCORES')
  const rows = []
  for (let i = 0; i < flat.length; i += 2) rows.push({ username: flat[i], score: Number(flat[i + 1]) })
  const avatars = await avatarsFor(rows.map((r) => r.username))
  return rows.map((r, i) => ({ rank: i + 1, ...r, avatar: avatars[r.username] }))
}

// ---------------------------------------------------------------------------
// handlers: (ctx) => body.  ctx = { req, body, params, query }

const handlers = {
  // --- status -------------------------------------------------------------
  'GET /health': async () => {
    const cfg = getConfig()
    return {
      ok: true,
      mock: cfg.mock,
      store: getStore().kind,
      // In production the memory store forgets everything between requests.
      dataWarning: isProduction() && getStore().kind === 'memory',
      accounts: Boolean(cfg.sessionSecret),
      falConfigured: Boolean(cfg.falKey),
      realtime: !cfg.mock && Boolean(cfg.falKey),
      realtimeModel: cfg.realtimeModel,
    }
  },

  'GET /stats': async () => {
    const counts = await getStore().pipeline(GAME_IDS.map((id) => ['GET', `plays:${id}`]))
    return { plays: Object.fromEntries(GAME_IDS.map((id, i) => [id, Number(counts[i] || 0)])) }
  },

  // --- accounts -----------------------------------------------------------
  'POST /auth/signup': async ({ req, body }) => {
    await limitAction(req, 'signup', 5)
    return signup(body)
  },
  'POST /auth/login': async ({ req, body }) => {
    await limitAction(req, 'login', 10)
    return login(body)
  },
  'GET /auth/me': async ({ req }) => {
    const username = requireUser(req)
    const raw = await getUser(username)
    if (!raw) throw new HttpError(401, 'login_required', 'Account not found.')
    return { user: publicUser(raw) }
  },
  'PATCH /auth/me': async ({ req, body }) => {
    const username = requireUser(req)
    return { user: await updateAvatar(username, body.avatar) }
  },

  // --- credits and play tickets -------------------------------------------
  'GET /credits': async ({ req }) => getCredits(payer(req)),

  'POST /credits/redeem': async ({ req, body }) => {
    const username = requireUser(req)
    await limitAction(req, 'redeem', 5)
    const code = requireText(body.code, 'code', { max: 40 }).toUpperCase()
    const amount = getConfig().redeemCodes[code]
    if (!amount) throw new HttpError(400, 'bad_code', 'Invalid code.')
    const fresh = await getStore().cmd('SADD', `redeemed:${code}`, username.toLowerCase())
    if (!fresh) throw new HttpError(409, 'already_redeemed', 'You already used this code.')
    await addPaidCredits(`u:${username.toLowerCase()}`, amount)
    return { added: amount, credits: await getCredits(`u:${username.toLowerCase()}`) }
  },

  'POST /play/start': async ({ req, body }) => startPlay(req, body.gameId),

  // Stripe calls this after a credit pack payment (see server/stripe.js).
  'POST /stripe/webhook': async ({ body }) => handleStripeWebhook(body),

  // --- AI calls (each needs a play ticket) --------------------------------
  'POST /generate': async ({ req, body }) => {
    const prompt = requireText(body.prompt, 'prompt')
    const numImages = intIn(body.numImages, 1, 4, 1)
    const width = intIn(body.width, 256, 1024, 512)
    const height = intIn(body.height, 256, 1024, 512)
    await spendTicketUnits(req, numImages)
    const seed = Number.isInteger(body.seed) ? body.seed : undefined
    return { images: await textToImage({ prompt, numImages, width, height, seed }) }
  },
  'POST /edit': async ({ req, body }) => {
    const prompt = requireText(body.prompt, 'prompt', { max: 500 })
    const imageUrl = requireImage(body.imageUrl)
    await spendTicketUnits(req, 1)
    return { image: await editImage({ prompt, imageUrl }) }
  },
  'POST /sketch': async ({ req, body }) => {
    const prompt = requireText(body.prompt, 'prompt', { max: 500 })
    const imageUrl = requireImage(body.imageUrl, 'imageUrl', { allowDataImages: true })
    const strength = Math.max(0.1, Math.min(1, Number(body.strength) || 0.65))
    await spendTicketUnits(req, 1)
    return { image: await sketchToImage({ prompt, imageUrl, strength }) }
  },
  'POST /realtime-token': async ({ req }) => {
    await spendTicketUnits(req, 1)
    return realtimeToken()
  },
  'POST /judge': async ({ req, body }) => {
    await spendTicketUnits(req, 1)
    return runJudge(body)
  },

  // --- scores and leaderboards --------------------------------------------
  'POST /scores': async ({ req, body }) => {
    const username = requireUser(req)
    const gameId = requireGame(body.gameId)
    const score = Math.round(Number(body.score))
    if (!Number.isFinite(score) || score < 0 || score > gameLimits(gameId).maxScore) {
      throw new HttpError(400, 'bad_score', 'Score out of range.')
    }
    // A score needs a ticket for this game that was actually used.
    const ticket = await readTicket(req)
    if (!ticket || ticket.gameId !== gameId || (await ticketUsage(ticket.id)) < 1) {
      throw new HttpError(403, 'no_play', 'Play the game to post a score.')
    }
    const store = getStore()
    const submitted = await store.cmd('INCR', `ticket:${ticket.id}:scores`)
    if (submitted === 1) await store.cmd('EXPIRE', `ticket:${ticket.id}:scores`, '21600')
    if (submitted > 5) throw new HttpError(429, 'too_many_scores', 'Too many scores for one credit.')

    const old = Number((await store.cmd('ZSCORE', `lb:${gameId}`, username)) || 0)
    const entry = JSON.stringify({ gameId, score, at: Date.now(), details: smallMeta(body.details) })
    const ops = [
      ['HINCRBY', `stats:${username.toLowerCase()}`, 'gamesPlayed', '1'],
      ['HINCRBY', `stats:${username.toLowerCase()}`, 'totalScore', String(score)],
      ['LPUSH', `recent:${username.toLowerCase()}`, entry],
      ['LTRIM', `recent:${username.toLowerCase()}`, '0', '29'],
    ]
    if (score > old) {
      ops.push(['ZADD', `lb:${gameId}`, String(score), username])
      ops.push(['ZINCRBY', 'lb:all', String(score - old), username])
    }
    await store.pipeline(ops)
    return { ok: true, best: Math.max(old, score), newBest: score > old }
  },

  'GET /leaderboard': async ({ query }) => {
    const game = query.game || 'all'
    const limit = intIn(query.limit, 1, 100, 50)
    if (game === 'all') return { game, rows: await leaderboardRows('lb:all', limit) }
    if (game === 'daily') {
      const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date || '') ? query.date : today()
      return { game, date, rows: await leaderboardRows(`lb:daily:${date}`, limit) }
    }
    return { game: requireGame(game), rows: await leaderboardRows(`lb:${game}`, limit) }
  },

  'GET /profile/:username': async ({ params }) => {
    const raw = await getUser(params.username)
    if (!raw) throw new HttpError(404, 'not_found', 'No such player.')
    const name = raw.username
    const store = getStore()
    const [stats, recent, ...bests] = await store.pipeline([
      ['HGETALL', `stats:${name.toLowerCase()}`],
      ['LRANGE', `recent:${name.toLowerCase()}`, '0', '29'],
      ...GAME_IDS.map((id) => ['ZSCORE', `lb:${id}`, name]),
    ])
    const s = pairsToObject(stats)
    return {
      user: publicUser(raw),
      gamesPlayed: Number(s.gamesPlayed || 0),
      totalScore: Number(s.totalScore || 0),
      bests: Object.fromEntries(GAME_IDS.map((id, i) => [id, bests[i] === null ? null : Number(bests[i])]).filter(([, v]) => v !== null)),
      recent: recent.map((r) => { try { return JSON.parse(r) } catch { return null } }).filter(Boolean),
    }
  },

  // --- shared galleries (community content) -------------------------------
  'GET /gallery/:gameId': async ({ req, params, query }) => {
    const gameId = requireGame(params.gameId)
    const limit = intIn(query.limit, 1, 100, 50)
    const offset = intIn(query.offset, 0, GALLERY_CAP, 0)
    const store = getStore()
    const raw = await store.cmd('LRANGE', `gallery:${gameId}`, String(offset), String(offset + limit - 1))
    const items = raw.map((r) => { try { return JSON.parse(r) } catch { return null } }).filter(Boolean)
    let voter = null
    try { voter = voterId(req) } catch { /* anonymous read */ }
    const counts = await store.pipeline(items.flatMap((it) => [
      ['SCARD', `votes:${gameId}:${it.id}`],
      ['SISMEMBER', `votes:${gameId}:${it.id}`, voter || '-'],
    ]))
    return {
      items: items.map((it, i) => ({ ...it, votes: Number(counts[i * 2]), voted: voter ? counts[i * 2 + 1] === 1 : false })),
      total: await store.cmd('LLEN', `gallery:${gameId}`),
    }
  },

  'POST /gallery/:gameId': async ({ req, params, body }) => {
    const gameId = requireGame(params.gameId)
    const ticket = await readTicket(req)
    if (!ticket || ticket.gameId !== gameId) throw new HttpError(403, 'no_play', 'Play the game to post.')
    await limitAction(req, 'gallery', 20)
    const username = sessionUser(req)
    const avatar = username ? (await avatarsFor([username]))[username] : '👤'
    const item = {
      id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      gameId,
      username: username || null,
      avatar,
      imageUrl: requireImage(body.imageUrl),
      beforeUrl: body.beforeUrl ? requireImage(body.beforeUrl, 'beforeUrl') : undefined,
      text: typeof body.text === 'string' ? body.text.trim().slice(0, 500) : '',
      meta: smallMeta(body.meta),
      createdAt: Date.now(),
    }
    await getStore().pipeline([
      ['LPUSH', `gallery:${gameId}`, JSON.stringify(item)],
      ['LTRIM', `gallery:${gameId}`, '0', String(GALLERY_CAP - 1)],
    ])
    return { item: { ...item, votes: 0, voted: false } }
  },

  'POST /gallery/:gameId/:itemId/vote': async ({ req, params }) => {
    const gameId = requireGame(params.gameId)
    if (!/^[a-z0-9]{6,30}$/.test(params.itemId)) throw new HttpError(400, 'bad_request', 'Bad item id.')
    await limitAction(req, 'vote', 60)
    const voter = voterId(req)
    const key = `votes:${gameId}:${params.itemId}`
    const store = getStore()
    const has = await store.cmd('SISMEMBER', key, voter)
    if (has) await store.cmd('SREM', key, voter)
    else await store.cmd('SADD', key, voter)
    return { votes: Number(await store.cmd('SCARD', key)), voted: !has }
  },

  // --- shared tile canvas (Infini-Map) -------------------------------------
  'GET /tiles/:board': async ({ params }) => {
    if (!/^[a-z0-9-]{1,30}$/.test(params.board)) throw new HttpError(400, 'bad_request', 'Bad board name.')
    const raw = pairsToObject(await getStore().cmd('HGETALL', `tiles:${params.board}`))
    const tiles = {}
    for (const [k, v] of Object.entries(raw)) {
      try { tiles[k] = JSON.parse(v) } catch { /* skip corrupt tile */ }
    }
    return { tiles }
  },
  'POST /tiles/:board': async ({ req, params, body }) => {
    if (!/^[a-z0-9-]{1,30}$/.test(params.board)) throw new HttpError(400, 'bad_request', 'Bad board name.')
    const ticket = await readTicket(req)
    if (!ticket || ticket.gameId !== 'infinimap') throw new HttpError(403, 'no_play', 'Play the game to paint tiles.')
    await limitAction(req, 'tiles', 20)
    const x = Number(body.x)
    const y = Number(body.y)
    if (!Number.isInteger(x) || !Number.isInteger(y) || Math.abs(x) > 500 || Math.abs(y) > 500) {
      throw new HttpError(400, 'bad_request', 'Tile is off the map.')
    }
    const username = sessionUser(req)
    const tile = {
      imageUrl: requireImage(body.imageUrl),
      prompt: requireText(body.prompt, 'prompt', { max: 300 }),
      username: username || null,
      createdAt: Date.now(),
    }
    const ok = await getStore().cmd('HSETNX', `tiles:${params.board}`, `${x},${y}`, JSON.stringify(tile))
    if (!ok) throw new HttpError(409, 'taken', 'Someone already painted this tile.')
    return { tile, key: `${x},${y}` }
  },

  // --- Daily Challenge (server-authoritative) ------------------------------
  'GET /daily': async ({ req }) => {
    const date = today()
    const prompts = dailyPrompts(date)
    const store = getStore()
    const key = `daily:${date}`
    let images = pairsToObject(await store.cmd('HGETALL', key))
    const missing = prompts.map((_, i) => i).filter((i) => !images[i])
    if (missing.length) {
      // Generated once per day for everyone (fixed seed); not charged to players.
      const made = await Promise.all(missing.map((i) =>
        textToImage({ prompt: prompts[i], seed: hashString(`${date}:${i}`) % 1e9 }).then((urls) => [i, urls[0]])
      ))
      await store.pipeline([
        ...made.map(([i, url]) => ['HSETNX', key, String(i), url]),
        ['EXPIRE', key, String(3 * 86400)],
      ])
      images = pairsToObject(await store.cmd('HGETALL', key))
    }
    const played = await syncDaily(req, date)
    return {
      date,
      rounds: prompts.map((_, i) => ({ index: i, imageUrl: images[i] })),
      played,
    }
  },

  'POST /daily/guess': async ({ req, body }) => {
    const date = today()
    const index = Number(body.index)
    if (!Number.isInteger(index) || index < 0 || index >= DAILY_ROUNDS) throw new HttpError(400, 'bad_request', 'Bad round.')
    const guess = requireText(body.guess, 'guess', { max: 300 })
    await limitAction(req, 'daily', 30)
    const prompt = dailyPrompts(date)[index]
    const played = await syncDaily(req, date)
    if (played[index]) return { ...played[index], alreadyPlayed: true }
    const { score, matchedWords } = promptSimilarityDetail(guess, prompt)
    const result = { score, prompt, matchedWords, guess }
    const store = getStore()
    const keys = dailyWho(req).map((who) => `daily:${date}:${who}`)
    // HSETNX on the main key wins a race between two tabs.
    const fresh = await store.cmd('HSETNX', keys[0], String(index), JSON.stringify(result))
    if (!fresh) return { ...JSON.parse(await store.cmd('HGET', keys[0], String(index))), alreadyPlayed: true }
    await store.pipeline(keys.flatMap((k, i) => [
      ...(i > 0 ? [['HSETNX', k, String(index), JSON.stringify(result)]] : []),
      ['EXPIRE', k, String(3 * 86400)],
    ]))
    const { done, total } = await finishDaily(req, date)
    return { ...result, done, total }
  },
}

/**
 * Daily identities, main one first: the account when logged in, and the
 * browser's client id. Results are shared across both, so a guest who saw
 * the answers cannot log in and play the same day again.
 */
function dailyWho(req) {
  const ids = []
  const user = sessionUser(req)
  if (user) ids.push(`u:${user.toLowerCase()}`)
  const cid = String(req.headers['x-client-id'] || '')
  if (CLIENT_ID_RE.test(cid)) ids.push(`c:${cid}`)
  if (ids.length === 0) ids.push(`ip:${getIp(req)}`)
  return ids
}

/** Merge today's results from all identities into each of them; returns { index: result }. */
async function syncDaily(req, date) {
  const store = getStore()
  const keys = dailyWho(req).map((who) => `daily:${date}:${who}`)
  const raws = await store.pipeline(keys.map((k) => ['HGETALL', k]))
  const merged = {}
  for (const raw of [...raws].reverse()) Object.assign(merged, pairsToObject(raw))
  const missing = []
  keys.forEach((k, i) => {
    const have = pairsToObject(raws[i])
    for (const [idx, v] of Object.entries(merged)) if (!have[idx]) missing.push(['HSETNX', k, idx, v], ['EXPIRE', k, String(3 * 86400)])
  })
  if (missing.length) {
    await store.pipeline(missing)
    await finishDaily(req, date)
  }
  return Object.fromEntries(Object.entries(merged).map(([i, v]) => [i, JSON.parse(v)]))
}

/** Post the total to today's board when a logged-in player has all rounds. */
async function finishDaily(req, date) {
  const store = getStore()
  const main = `daily:${date}:${dailyWho(req)[0]}`
  const all = pairsToObject(await store.cmd('HGETALL', main))
  const done = Object.keys(all).length === DAILY_ROUNDS
  const total = Object.values(all).reduce((sum, v) => sum + JSON.parse(v).score, 0)
  const username = sessionUser(req)
  if (done && username) await store.cmd('ZADD', `lb:daily:${date}`, String(total), username)
  return { done, total }
}

// ---------------------------------------------------------------------------
// router

const routes = Object.entries(handlers).map(([key, handler]) => {
  const [method, pattern] = key.split(' ')
  const names = []
  const regex = new RegExp('^' + pattern.replace(/:[a-zA-Z]+/g, (m) => { names.push(m.slice(1)); return '([^/]+)' }) + '/?$')
  return { method, regex, names, handler }
})

export function resolvePath(req) {
  const url = new URL(req.url, 'http://localhost')
  let path = url.pathname
  // Vercel rewrite: /api/:path* -> /api/router?path=:path*
  if (path === '/api/router' || path === '/api/router.js') path = '/' + (url.searchParams.get('path') || '')
  else if (path.startsWith('/api')) path = path.slice(4)
  const query = Object.fromEntries(url.searchParams.entries())
  delete query.path
  return { path: path || '/', query }
}

export async function handleApi(req, res) {
  try {
    const { path, query } = resolvePath(req)
    const method = req.method === 'HEAD' ? 'GET' : req.method
    let match = null
    let allowed = false
    for (const r of routes) {
      const m = path.match(r.regex)
      if (!m) continue
      allowed = true
      if (r.method === method) {
        match = { route: r, params: Object.fromEntries(r.names.map((n, i) => [n, decodeURIComponent(m[i + 1])])) }
        break
      }
    }
    if (!match) throw new HttpError(allowed ? 405 : 404, allowed ? 'method_not_allowed' : 'not_found', 'Not found')
    const body = method === 'GET' ? {} : await readJson(req)
    const result = await match.route.handler({ req, body, params: match.params, query })
    sendJson(res, 200, result)
  } catch (err) {
    if (err instanceof HttpError) {
      sendJson(res, err.status, { error: err.code, message: err.message })
    } else {
      console.error('API error:', err)
      sendJson(res, 500, { error: 'server_error', message: 'Something went wrong on the server.' })
    }
  }
}

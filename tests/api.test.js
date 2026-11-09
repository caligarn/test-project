import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import http from 'node:http'
import { handleApi } from '../server/routes.js'
import { setStore, createMemoryStore } from '../server/store.js'
import { mockImage } from '../server/mockImages.js'

let server
let base

beforeAll(async () => {
  process.env.FAL_MOCK = '1'
  process.env.FREE_DAILY_CREDITS = '2'
  process.env.REDEEM_CODES = 'TEST10:10'
  process.env.RATE_LIMIT_PER_MINUTE = '1000'
  server = http.createServer((req, res) => handleApi(req, res))
  await new Promise((r) => server.listen(0, r))
  base = `http://127.0.0.1:${server.address().port}`
})
afterAll(() => server.close())
beforeEach(() => setStore(createMemoryStore()))

async function call(method, path, { body, token, ticket, ip = '1.1.1.1', clientId } = {}) {
  const headers = { 'Content-Type': 'application/json', 'x-forwarded-for': ip }
  if (token) headers.Authorization = `Bearer ${token}`
  if (ticket) headers['x-play-ticket'] = ticket
  if (clientId) headers['x-client-id'] = clientId
  const res = await fetch(base + '/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined })
  return { status: res.status, body: await res.json() }
}

describe('health and routing', () => {
  it('reports mock mode', async () => {
    const r = await call('GET', '/health')
    expect(r.status).toBe(200)
    expect(r.body.mock).toBe(true)
  })
  it('404s unknown routes and 405s wrong methods', async () => {
    expect((await call('GET', '/nope')).status).toBe(404)
    expect((await call('GET', '/generate')).status).toBe(405)
  })
  it('handles the Vercel rewrite path', async () => {
    const res = await fetch(base + '/api/router?path=health')
    expect((await res.json()).ok).toBe(true)
  })
})

describe('accounts', () => {
  it('signs up, logs in, and rejects bad passwords', async () => {
    const s = await call('POST', '/auth/signup', { body: { username: 'Alice', password: 'secret1' } })
    expect(s.status).toBe(200)
    expect(s.body.token).toBeTruthy()
    expect((await call('POST', '/auth/signup', { body: { username: 'alice', password: 'secret1' } })).status).toBe(409)
    expect((await call('POST', '/auth/login', { body: { username: 'Alice', password: 'wrong' } })).status).toBe(401)
    const l = await call('POST', '/auth/login', { body: { username: 'Alice', password: 'secret1' } })
    expect(l.status).toBe(200)
    const me = await call('GET', '/auth/me', { token: l.body.token })
    expect(me.body.user.username).toBe('Alice')
  })
  it('rejects forged tokens', async () => {
    const s = await call('POST', '/auth/signup', { body: { username: 'bob', password: 'secret1' } })
    const forged = s.body.token.slice(0, -2) + 'xx'
    expect((await call('GET', '/auth/me', { token: forged })).status).toBe(401)
  })
})

describe('credits and tickets', () => {
  it('requires a ticket for AI calls', async () => {
    const r = await call('POST', '/generate', { body: { prompt: 'a cat' } })
    expect(r.status).toBe(402)
    expect(r.body.error).toBe('ticket_required')
  })
  it('spends free credits, then refuses', async () => {
    const opts = { body: { gameId: 'speed-prompt' }, clientId: 'guest-one-1234' }
    const a = await call('POST', '/play/start', opts)
    const b = await call('POST', '/play/start', opts)
    const c = await call('POST', '/play/start', opts)
    expect(a.status).toBe(200)
    expect(b.body.credits.total).toBe(0)
    expect(c.status).toBe(402)
    expect(c.body.error).toBe('no_credits')
  })
  it('gives each guest browser on shared Wi-Fi its own credits, with a per-IP cap', async () => {
    process.env.GUEST_CREDITS_PER_IP = '3'
    const start = (cid) => call('POST', '/play/start', { body: { gameId: 'speed-prompt' }, clientId: cid, ip: '9.9.9.9' })
    expect((await start('guest-aaaa-0001')).status).toBe(200)
    expect((await start('guest-bbbb-0002')).status).toBe(200)
    expect((await start('guest-cccc-0003')).status).toBe(200)
    const capped = await start('guest-dddd-0004')
    expect(capped.status).toBe(402)
    expect(capped.body.message).toMatch(/Log in/)
    delete process.env.GUEST_CREDITS_PER_IP
  })
  it('caps units per ticket', async () => {
    const { body } = await call('POST', '/play/start', { body: { gameId: 'community-comic' } })
    for (let i = 0; i < 6; i++) {
      expect((await call('POST', '/generate', { body: { prompt: 'x' }, ticket: body.ticket })).status).toBe(200)
    }
    const r = await call('POST', '/generate', { body: { prompt: 'x' }, ticket: body.ticket })
    expect(r.status).toBe(402)
    expect(r.body.error).toBe('ticket_exhausted')
  })
  it('redeems a code once', async () => {
    const s = await call('POST', '/auth/signup', { body: { username: 'carol', password: 'secret1' } })
    const r1 = await call('POST', '/credits/redeem', { token: s.body.token, body: { code: 'test10' } })
    expect(r1.body.credits.paid).toBe(10)
    expect((await call('POST', '/credits/redeem', { token: s.body.token, body: { code: 'TEST10' } })).status).toBe(409)
    expect((await call('POST', '/credits/redeem', { token: s.body.token, body: { code: 'NOPE' } })).status).toBe(400)
  })
})

describe('generation and judge (mock)', () => {
  it('generates, edits, and judges', async () => {
    const { body: t } = await call('POST', '/play/start', { body: { gameId: 'prompt-guesser' } })
    const g = await call('POST', '/generate', { body: { prompt: 'a red fox in snow', numImages: 2 }, ticket: t.ticket })
    expect(g.body.images).toHaveLength(2)
    const e = await call('POST', '/edit', { body: { prompt: 'make it night', imageUrl: g.body.images[0] }, ticket: t.ticket })
    expect(e.body.image).toMatch(/^data:image\/svg/)
    const same = await call('POST', '/judge', { ticket: t.ticket, body: { mode: 'match-image', targetUrl: mockImage('a red fox in snow'), imageUrl: mockImage('a red fox in snow') } })
    const diff = await call('POST', '/judge', { ticket: t.ticket, body: { mode: 'match-image', targetUrl: mockImage('a red fox in snow'), imageUrl: mockImage('blue whale ocean') } })
    expect(same.body.score).toBe(100)
    expect(diff.body.score).toBe(0)
  })
  it('rejects foreign image URLs', async () => {
    const { body: t } = await call('POST', '/play/start', { body: { gameId: 'ai-remix' } })
    const r = await call('POST', '/edit', { ticket: t.ticket, body: { prompt: 'x', imageUrl: 'https://evil.example.com/a.png' } })
    expect(r.status).toBe(400)
  })
})

describe('scores and leaderboards', () => {
  it('needs a used ticket, keeps best scores, builds overall board', async () => {
    const s = await call('POST', '/auth/signup', { body: { username: 'dave', password: 'secret1' } })
    const token = s.body.token
    const { body: t } = await call('POST', '/play/start', { token, body: { gameId: 'speed-prompt' } })
    expect((await call('POST', '/scores', { token, ticket: t.ticket, body: { gameId: 'speed-prompt', score: 300 } })).status).toBe(403)
    await call('POST', '/generate', { token, ticket: t.ticket, body: { prompt: 'x' } })
    expect((await call('POST', '/scores', { token, ticket: t.ticket, body: { gameId: 'speed-prompt', score: 300 } })).body.newBest).toBe(true)
    expect((await call('POST', '/scores', { token, ticket: t.ticket, body: { gameId: 'speed-prompt', score: 200 } })).body.newBest).toBe(false)
    expect((await call('POST', '/scores', { token, ticket: t.ticket, body: { gameId: 'speed-prompt', score: 99999 } })).status).toBe(400)
    const lb = await call('GET', '/leaderboard?game=speed-prompt')
    expect(lb.body.rows[0]).toMatchObject({ username: 'dave', score: 300, rank: 1 })
    const all = await call('GET', '/leaderboard')
    expect(all.body.rows[0].score).toBe(300)
    const p = await call('GET', '/profile/dave')
    expect(p.body.gamesPlayed).toBe(2)
    expect(p.body.bests['speed-prompt']).toBe(300)
  })
})

describe('galleries, votes, tiles', () => {
  it('posts and votes', async () => {
    const { body: t } = await call('POST', '/play/start', { body: { gameId: 'haiku-canvas' } })
    const post = await call('POST', '/gallery/haiku-canvas', { ticket: t.ticket, body: { imageUrl: mockImage('poem'), text: 'old pond' } })
    expect(post.status).toBe(200)
    const id = post.body.item.id
    const v1 = await call('POST', `/gallery/haiku-canvas/${id}/vote`, { clientId: 'client-aaaa-1111' })
    expect(v1.body).toEqual({ votes: 1, voted: true })
    const list = await call('GET', '/gallery/haiku-canvas', { clientId: 'client-aaaa-1111' })
    expect(list.body.items[0]).toMatchObject({ text: 'old pond', votes: 1, voted: true })
    const v2 = await call('POST', `/gallery/haiku-canvas/${id}/vote`, { clientId: 'client-aaaa-1111' })
    expect(v2.body).toEqual({ votes: 0, voted: false })
  })
  it('refuses gallery posts without a ticket for that game', async () => {
    const { body: t } = await call('POST', '/play/start', { body: { gameId: 'speed-prompt' } })
    expect((await call('POST', '/gallery/haiku-canvas', { ticket: t.ticket, body: { imageUrl: mockImage('x') } })).status).toBe(403)
  })
  it('first painter wins a tile', async () => {
    const { body: t } = await call('POST', '/play/start', { body: { gameId: 'infinimap' } })
    const body = { x: 1, y: -2, imageUrl: mockImage('tile'), prompt: 'tile' }
    expect((await call('POST', '/tiles/main', { ticket: t.ticket, body })).status).toBe(200)
    expect((await call('POST', '/tiles/main', { ticket: t.ticket, body })).status).toBe(409)
    expect(Object.keys((await call('GET', '/tiles/main')).body.tiles)).toEqual(['1,-2'])
  })
})

describe('daily challenge', () => {
  it('serves 5 images without prompts, scores guesses once', async () => {
    const d = await call('GET', '/daily', { clientId: 'client-bbbb-2222' })
    expect(d.body.rounds).toHaveLength(5)
    expect(JSON.stringify(d.body)).not.toMatch(/"prompt"/)
    const g = await call('POST', '/daily/guess', { clientId: 'client-bbbb-2222', body: { index: 0, guess: 'a cat' } })
    expect(g.body.prompt).toBeTruthy()
    const again = await call('POST', '/daily/guess', { clientId: 'client-bbbb-2222', body: { index: 0, guess: 'totally different' } })
    expect(again.body.alreadyPlayed).toBe(true)
    expect(again.body.score).toBe(g.body.score)
  })
  it('posts the total to the daily board for logged-in players', async () => {
    const s = await call('POST', '/auth/signup', { body: { username: 'erin', password: 'secret1' } })
    let last
    for (let i = 0; i < 5; i++) last = await call('POST', '/daily/guess', { token: s.body.token, body: { index: i, guess: 'a dog in the park' } })
    expect(last.body.done).toBe(true)
    const lb = await call('GET', '/leaderboard?game=daily')
    expect(lb.body.rows[0].username).toBe('erin')
  })
})

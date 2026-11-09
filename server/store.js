// Shared data store.
//
// Production: Upstash Redis over its REST API (Vercel KV / Upstash Marketplace
// integration sets the env vars). No SDK needed: every call is one fetch.
//
// Development and tests: an in-memory store that implements the same Redis
// commands with the same reply shapes, so the route code is identical.

import { getConfig } from './config.js'

// ---------------------------------------------------------------------------
// In-memory mini Redis (only the commands this app uses)
// ---------------------------------------------------------------------------

export function createMemoryStore() {
  const data = new Map()
  const expiry = new Map()

  function alive(key) {
    const at = expiry.get(key)
    if (at !== undefined && at <= Date.now()) {
      data.delete(key)
      expiry.delete(key)
    }
    return data.has(key)
  }
  function get(key, type, create) {
    if (!alive(key)) {
      if (!create) return undefined
      const value = type === 'string' ? '' : type === 'list' ? [] : type === 'hash' ? new Map() : type === 'set' ? new Set() : new Map()
      data.set(key, { type, value })
      return data.get(key).value
    }
    const entry = data.get(key)
    if (entry.type !== type) throw new Error(`WRONGTYPE ${key}`)
    return entry.value
  }
  const num = (v) => Number(v)
  const str = (v) => String(v)
  const fmtScore = (n) => String(n)

  const commands = {
    GET: (k) => (alive(k) ? data.get(k).value : null),
    SET: (k, v, ...opts) => {
      const upper = opts.map((o) => String(o).toUpperCase())
      if (upper.includes('NX') && alive(k)) return null
      data.set(k, { type: 'string', value: str(v) })
      expiry.delete(k)
      const ex = upper.indexOf('EX')
      if (ex !== -1) expiry.set(k, Date.now() + num(opts[ex + 1]) * 1000)
      return 'OK'
    },
    DEL: (...keys) => keys.reduce((n, k) => n + (alive(k) && data.delete(k) ? 1 : 0), 0),
    EXPIRE: (k, s) => {
      if (!alive(k)) return 0
      expiry.set(k, Date.now() + num(s) * 1000)
      return 1
    },
    INCRBY: (k, by) => {
      const cur = alive(k) ? num(data.get(k).value) : 0
      const next = cur + num(by)
      const at = expiry.get(k)
      data.set(k, { type: 'string', value: str(next) })
      if (at !== undefined) expiry.set(k, at)
      return next
    },
    INCR: (k) => commands.INCRBY(k, 1),
    DECRBY: (k, by) => commands.INCRBY(k, -num(by)),
    DECR: (k) => commands.INCRBY(k, -1),
    LPUSH: (k, ...vals) => {
      const list = get(k, 'list', true)
      for (const v of vals) list.unshift(str(v))
      return list.length
    },
    RPUSH: (k, ...vals) => {
      const list = get(k, 'list', true)
      for (const v of vals) list.push(str(v))
      return list.length
    },
    LRANGE: (k, start, stop) => {
      const list = get(k, 'list') || []
      const len = list.length
      let s = num(start)
      let e = num(stop)
      if (s < 0) s = Math.max(0, len + s)
      if (e < 0) e = len + e
      return list.slice(s, e + 1)
    },
    LTRIM: (k, start, stop) => {
      const list = get(k, 'list')
      if (!list) return 'OK'
      const kept = commands.LRANGE(k, start, stop)
      list.splice(0, list.length, ...kept)
      return 'OK'
    },
    LLEN: (k) => (get(k, 'list') || []).length,
    HGET: (k, f) => {
      const h = get(k, 'hash')
      return h && h.has(str(f)) ? h.get(str(f)) : null
    },
    HSET: (k, ...pairs) => {
      const h = get(k, 'hash', true)
      let added = 0
      for (let i = 0; i < pairs.length; i += 2) {
        if (!h.has(str(pairs[i]))) added++
        h.set(str(pairs[i]), str(pairs[i + 1]))
      }
      return added
    },
    HSETNX: (k, f, v) => {
      const h = get(k, 'hash', true)
      if (h.has(str(f))) return 0
      h.set(str(f), str(v))
      return 1
    },
    HDEL: (k, ...fields) => {
      const h = get(k, 'hash')
      if (!h) return 0
      return fields.reduce((n, f) => n + (h.delete(str(f)) ? 1 : 0), 0)
    },
    HINCRBY: (k, f, by) => {
      const h = get(k, 'hash', true)
      const next = num(h.get(str(f)) || 0) + num(by)
      h.set(str(f), str(next))
      return next
    },
    HGETALL: (k) => {
      const h = get(k, 'hash')
      if (!h) return []
      return [...h.entries()].flat()
    },
    HLEN: (k) => (get(k, 'hash') || new Map()).size,
    SADD: (k, ...members) => {
      const s = get(k, 'set', true)
      return members.reduce((n, m) => (s.has(str(m)) ? n : (s.add(str(m)), n + 1)), 0)
    },
    SREM: (k, ...members) => {
      const s = get(k, 'set')
      if (!s) return 0
      return members.reduce((n, m) => n + (s.delete(str(m)) ? 1 : 0), 0)
    },
    SISMEMBER: (k, m) => ((get(k, 'set') || new Set()).has(str(m)) ? 1 : 0),
    SCARD: (k) => (get(k, 'set') || new Set()).size,
    ZADD: (k, ...args) => {
      const z = get(k, 'zset', true)
      const flags = []
      while (args.length && isNaN(Number(args[0]))) flags.push(String(args.shift()).toUpperCase())
      let changed = 0
      for (let i = 0; i < args.length; i += 2) {
        const score = num(args[i])
        const member = str(args[i + 1])
        const cur = z.get(member)
        if (flags.includes('GT') && cur !== undefined && score <= cur) continue
        if (flags.includes('NX') && cur !== undefined) continue
        if (cur !== score) changed++
        z.set(member, score)
      }
      return changed
    },
    ZINCRBY: (k, by, member) => {
      const z = get(k, 'zset', true)
      const next = (z.get(str(member)) || 0) + num(by)
      z.set(str(member), next)
      return fmtScore(next)
    },
    ZSCORE: (k, member) => {
      const z = get(k, 'zset')
      return z && z.has(str(member)) ? fmtScore(z.get(str(member))) : null
    },
    ZREVRANGE: (k, start, stop, withScores) => {
      const z = get(k, 'zset')
      if (!z) return []
      const sorted = [...z.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      const len = sorted.length
      let s = num(start)
      let e = num(stop)
      if (s < 0) s = Math.max(0, len + s)
      if (e < 0) e = len + e
      const slice = sorted.slice(s, e + 1)
      return withScores ? slice.flatMap(([m, sc]) => [m, fmtScore(sc)]) : slice.map(([m]) => m)
    },
    ZCARD: (k) => (get(k, 'zset') || new Map()).size,
  }

  async function cmd(name, ...args) {
    const fn = commands[String(name).toUpperCase()]
    if (!fn) throw new Error(`Memory store: unsupported command ${name}`)
    return fn(...args)
  }

  return {
    kind: 'memory',
    cmd,
    async pipeline(list) {
      const out = []
      for (const [name, ...args] of list) out.push(await cmd(name, ...args))
      return out
    },
  }
}

// ---------------------------------------------------------------------------
// Upstash Redis REST
// ---------------------------------------------------------------------------

export function createUpstashStore(url, token) {
  const base = url.replace(/\/$/, '')
  async function call(path, body) {
    const res = await fetch(base + path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) throw new Error(`Redis error ${res.status}: ${json?.error || 'unknown'}`)
    return json
  }
  return {
    kind: 'redis',
    async cmd(...args) {
      const json = await call('', args.map(String))
      if (json?.error) throw new Error(`Redis error: ${json.error}`)
      return json.result
    },
    async pipeline(list) {
      if (list.length === 0) return []
      const json = await call('/pipeline', list.map((c) => c.map(String)))
      return json.map((r) => {
        if (r.error) throw new Error(`Redis error: ${r.error}`)
        return r.result
      })
    },
  }
}

// ---------------------------------------------------------------------------

let singleton = null

export function getStore() {
  if (singleton) return singleton
  const { redisUrl, redisToken } = getConfig()
  singleton = redisUrl && redisToken ? createUpstashStore(redisUrl, redisToken) : createMemoryStore()
  return singleton
}

/** Test helper: swap the store (pass null to rebuild from config). */
export function setStore(store) {
  singleton = store
}

/** Redis HGETALL returns a flat [k, v, k, v] list; turn it into an object. */
export function pairsToObject(flat) {
  const obj = {}
  if (!Array.isArray(flat)) return flat && typeof flat === 'object' ? flat : obj
  for (let i = 0; i < flat.length; i += 2) obj[flat[i]] = flat[i + 1]
  return obj
}

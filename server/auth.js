// Accounts: scrypt-hashed passwords in the store, HMAC-signed session tokens.

import { scrypt as scryptCb, randomBytes, timingSafeEqual, createHmac } from 'node:crypto'
import { promisify } from 'node:util'
import { getConfig } from './config.js'
import { getStore, pairsToObject } from './store.js'
import { HttpError } from './http.js'

const scrypt = promisify(scryptCb)
const SESSION_DAYS = 30
const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/
const RESERVED = new Set(['guest', 'admin', 'system', 'anonymous', 'host'])
export const AVATARS = ['🤖', '👾', '🎮', '🕹️', '🎯', '🎨', '🧠', '⚡', '🔮', '🌟', '🎪', '🎭', '🦊', '🐉', '🦄', '🌈']

const userKey = (username) => `user:${username.toLowerCase()}`

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 32)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const [kind, saltHex, hashHex] = String(stored || '').split('$')
  if (kind !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length)
  return timingSafeEqual(actual, expected)
}

function secret() {
  const s = getConfig().sessionSecret
  if (!s) throw new HttpError(503, 'not_configured', 'Accounts are not set up on the server yet: add Upstash for Redis (or SESSION_SECRET) in Vercel.')
  return s
}

const b64url = (buf) => Buffer.from(buf).toString('base64url')

export function signSession(username) {
  const payload = b64url(JSON.stringify({ u: username, exp: Date.now() + SESSION_DAYS * 864e5 }))
  const sig = b64url(createHmac('sha256', secret()).update(payload).digest())
  return `${payload}.${sig}`
}

export function verifySession(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null
  const [payload, sig] = token.split('.')
  let expected
  try {
    expected = createHmac('sha256', secret()).update(payload).digest()
  } catch {
    return null
  }
  const given = Buffer.from(sig || '', 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!data?.u || data.exp < Date.now()) return null
    return data.u
  } catch {
    return null
  }
}

/** Username from the Authorization header, or null for guests. */
export function sessionUser(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  return token ? verifySession(token) : null
}

export function requireUser(req) {
  const username = sessionUser(req)
  if (!username) throw new HttpError(401, 'login_required', 'Log in to do this.')
  return username
}

export async function getUser(username) {
  const raw = pairsToObject(await getStore().cmd('HGETALL', userKey(username)))
  if (!raw.username) return null
  return raw
}

export function publicUser(raw) {
  return { username: raw.username, avatar: raw.avatar, createdAt: Number(raw.createdAt) || null }
}

export async function signup({ username, password, avatar }) {
  if (!USERNAME_RE.test(String(username || ''))) {
    throw new HttpError(400, 'bad_username', 'Username must be 3-20 letters, numbers, or underscores.')
  }
  if (RESERVED.has(username.toLowerCase())) throw new HttpError(400, 'bad_username', 'That username is reserved.')
  if (typeof password !== 'string' || password.length < 6 || password.length > 200) {
    throw new HttpError(400, 'bad_password', 'Password must be at least 6 characters.')
  }
  const store = getStore()
  const created = await store.cmd('HSETNX', userKey(username), 'username', username)
  if (!created) throw new HttpError(409, 'username_taken', 'Username already taken.')
  const record = {
    passwordHash: await hashPassword(password),
    avatar: AVATARS.includes(avatar) ? avatar : AVATARS[Math.floor(Math.random() * AVATARS.length)],
    createdAt: String(Date.now()),
  }
  await store.cmd('HSET', userKey(username), ...Object.entries(record).flat())
  return { token: signSession(username), user: publicUser({ username, ...record }) }
}

export async function login({ username, password }) {
  const raw = typeof username === 'string' && USERNAME_RE.test(username) ? await getUser(username) : null
  if (!raw || !(await verifyPassword(String(password || ''), raw.passwordHash))) {
    throw new HttpError(401, 'bad_login', 'Wrong username or password.')
  }
  return { token: signSession(raw.username), user: publicUser(raw) }
}

export async function updateAvatar(username, avatar) {
  if (!AVATARS.includes(avatar)) throw new HttpError(400, 'bad_request', 'Unknown avatar.')
  await getStore().cmd('HSET', userKey(username), 'avatar', avatar)
  return publicUser(await getUser(username))
}

export async function avatarsFor(usernames) {
  if (usernames.length === 0) return {}
  const results = await getStore().pipeline(usernames.map((u) => ['HGET', userKey(u), 'avatar']))
  return Object.fromEntries(usernames.map((u, i) => [u, results[i] || '🎮']))
}

// Browser client for the Gen Arcade API (/api/*).
// The fal.ai key lives on the server; the browser only holds a session token
// (when logged in), a random client id (for votes), and play tickets.

const SESSION_KEY = 'gen_arcade_session'
const CLIENT_KEY = 'gen_arcade_client_id'

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || code)
    this.status = status
    this.code = code
  }
}

function safeGet(storage, key) {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}
function safeSet(storage, key, value) {
  try {
    if (value === null) storage.removeItem(key)
    else storage.setItem(key, value)
  } catch {
    // storage unavailable (private mode): keep working in memory
  }
}

let memoryClientId = null
export function clientId() {
  let id = safeGet(localStorage, CLIENT_KEY) || memoryClientId
  if (!id) {
    id = crypto.randomUUID()
    memoryClientId = id
    safeSet(localStorage, CLIENT_KEY, id)
  }
  return id
}

export function getSessionToken() {
  return safeGet(localStorage, SESSION_KEY)
}
export function setSessionToken(token) {
  safeSet(localStorage, SESSION_KEY, token || null)
}

/**
 * Call the API. Throws ApiError with the server's error code on failure.
 * `ticket` adds the play-ticket header (required for AI calls).
 */
export async function api(path, { method = 'GET', body, ticket, signal } = {}) {
  const headers = { 'x-client-id': clientId() }
  const token = getSessionToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (ticket) headers['x-play-ticket'] = ticket
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  let res
  try {
    res = await fetch(`/api${path}`, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError(0, 'network', 'Network error. Check your connection.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(res.status, data.error || 'error', data.message || `Request failed (${res.status})`)
  return data
}

let healthPromise = null
/** Server capabilities (mock mode, realtime, store). Cached for the page life. */
export function getHealth() {
  healthPromise ||= api('/health').catch(() => ({ ok: false, mock: false, realtime: false, store: 'unknown' }))
  return healthPromise
}

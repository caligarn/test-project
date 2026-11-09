// Small HTTP helpers shared by the Vercel function and the Vite dev server.

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message || code)
    this.status = status
    this.code = code
  }
}

export function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

export function getIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (fwd) return String(fwd).split(',')[0].trim()
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown'
}

const MAX_BODY = 6 * 1024 * 1024

export async function readJson(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body
    const text = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body)
    return parseJson(text)
  }
  if (req.method === 'GET' || req.method === 'HEAD') return {}
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) throw new HttpError(413, 'body_too_large', 'Request body is too large')
    chunks.push(chunk)
  }
  return parseJson(Buffer.concat(chunks).toString('utf8'))
}

function parseJson(text) {
  if (!text) return {}
  try {
    const value = JSON.parse(text)
    return value && typeof value === 'object' ? value : {}
  } catch {
    throw new HttpError(400, 'bad_json', 'Request body must be JSON')
  }
}

/** Trimmed string with a length limit, or throw 400. */
export function requireText(value, field, { max = 1000, min = 1 } = {}) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (text.length < min) throw new HttpError(400, 'bad_request', `${field} is required`)
  if (text.length > max) throw new HttpError(400, 'bad_request', `${field} is too long (max ${max})`)
  return text
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

// Mock images for local development and tests (no fal.ai key needed).
// Each image is a small SVG data URL. The prompt is stored in <desc>, so the
// mock judge can compare images by their prompts.

function hash(text) {
  let h = 2166136261
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function escapeXml(text) {
  return String(text).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c])
}

function wrap(text, width = 28, maxLines = 6) {
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    if ((line + ' ' + w).trim().length > width) {
      lines.push(line.trim())
      line = w
    } else line += ' ' + w
  }
  if (line.trim()) lines.push(line.trim())
  return lines.slice(0, maxLines)
}

export function mockImage(prompt, { seed = 0, width = 512, height = 512, baseImage = null } = {}) {
  const h = hash(`${prompt}|${seed}`)
  const hue = h % 360
  const hue2 = (hue + 60 + (h % 120)) % 360
  const lines = wrap(prompt)
  const text = lines
    .map((l, i) => `<text x="50%" y="${42 + (i - lines.length / 2) * 7}%" text-anchor="middle" font-family="sans-serif" font-size="22" fill="white">${escapeXml(l)}</text>`)
    .join('')
  const under = baseImage ? `<image href="${escapeXml(baseImage)}" width="100%" height="100%" opacity="0.45"/>` : ''
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<desc>${escapeXml(prompt)}</desc>` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,45%)"/><stop offset="1" stop-color="hsl(${hue2},70%,30%)"/></linearGradient></defs>` +
    `<rect width="100%" height="100%" fill="url(#g)"/>${under}` +
    `<circle cx="${20 + (h % 60)}%" cy="${70 + (h % 20)}%" r="${40 + (h % 50)}" fill="white" opacity="0.15"/>` +
    text +
    `<text x="50%" y="94%" text-anchor="middle" font-family="sans-serif" font-size="14" fill="white" opacity="0.7">MOCK IMAGE</text>` +
    `</svg>`
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

/** Read the prompt back out of a mock image, or null for real images. */
export function mockPromptOf(url) {
  const prefix = 'data:image/svg+xml;base64,'
  if (typeof url !== 'string' || !url.startsWith(prefix)) return null
  const svg = Buffer.from(url.slice(prefix.length), 'base64').toString('utf8')
  const m = svg.match(/<desc>([\s\S]*?)<\/desc>/)
  if (!m) return null
  return m[1].replace(/&lt;|&gt;|&amp;|&quot;|&apos;/g, (e) => ({ '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&apos;': "'" })[e])
}

export function isMockImage(url) {
  return typeof url === 'string' && url.startsWith('data:image/svg+xml;base64,')
}

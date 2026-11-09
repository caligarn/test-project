// Shared prompt/text similarity utilities.
// Shared prompt/text similarity utilities, used by the games and the
// server (Daily Challenge scoring).

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'of', 'on', 'in', 'at', 'to', 'with', 'and', 'or',
  'is', 'are', 'it', 'its', 'for', 'by', 'over', 'under', 'from', 'into',
])

export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w))
}

/**
 * F1-style word-overlap score between two prompts, 0-100, plus the target
 * words that matched (for transparent results).
 * Each target word can only be matched once (repeating a guess word earns
 * nothing extra), and fuzzy substring credit requires 4+ characters so
 * fragments like "a" or "cat" inside "catapult" don't score.
 */
export function promptSimilarityDetail(guess, target) {
  const guessWords = tokenize(guess)
  const targetWords = tokenize(target)
  const remaining = [...targetWords]
  let matches = 0
  const matchedWords = []
  for (const w of guessWords) {
    let idx = remaining.indexOf(w)
    let credit = 1
    if (idx === -1 && w.length >= 4) {
      idx = remaining.findIndex(
        (t) => t.length >= 4 && (t.includes(w) || w.includes(t))
      )
      credit = 0.5
    }
    if (idx !== -1) {
      matches += credit
      matchedWords.push(remaining[idx])
      remaining.splice(idx, 1)
    }
  }
  let score = 0
  if (matches > 0 && guessWords.length && targetWords.length) {
    const precision = matches / guessWords.length
    const recall = matches / targetWords.length
    score = Math.min(100, Math.round(((2 * precision * recall) / (precision + recall)) * 100))
  }
  return { score, matchedWords }
}

/** Word-overlap score only, 0-100. */
export function promptSimilarity(guess, target) {
  return promptSimilarityDetail(guess, target).score
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Pick a random item, avoiding entries in `exclude` until the pool runs dry. */
export function pickRandom(arr, exclude = []) {
  const pool = arr.filter((x) => !exclude.includes(x))
  const source = pool.length > 0 ? pool : arr
  return source[Math.floor(Math.random() * source.length)]
}

/** Resolve when all URLs have loaded (or errored) so timers start against visible images. */
export function preloadImages(urls) {
  return Promise.all(
    urls.filter(Boolean).map(
      (url) =>
        new Promise((resolve) => {
          const img = new Image()
          img.onload = resolve
          img.onerror = resolve
          img.src = url
        })
    )
  )
}

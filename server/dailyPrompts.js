// Pool for the Daily Challenge. The server picks 5 per day from a date seed,
// so everyone sees the same images and the prompts never reach the browser
// until a guess is made.
export const DAILY_PROMPTS = [
  'A red fox reading a newspaper on a park bench in autumn',
  'A lighthouse on a cliff during a thunderstorm at night',
  'A bowl of ramen floating in outer space with planets',
  'A tiny astronaut planting a flower on the moon',
  'A cat wearing a crown sitting on a velvet throne',
  'A steampunk airship above a foggy Victorian city',
  'A koi pond with cherry blossom petals at sunset',
  'A robot chef flipping pancakes in a retro kitchen',
  'A snowy mountain village lit by warm lanterns',
  'A giant whale swimming through clouds above a desert',
  'A neon jellyfish in a dark ocean trench',
  'A medieval knight eating ice cream on a beach',
  'An owl wearing glasses in a library full of candles',
  'A vintage camper van parked under the northern lights',
  'A dragon made of autumn leaves flying over a forest',
  'A penguin barista making coffee in a cozy cafe',
  'A glass terrarium with a tiny waterfall and moss',
  'A pirate parrot steering a ship through a storm',
  'A sunflower field with a single blue balloon',
  'A futuristic train crossing a bridge over a canyon',
  'A treehouse village connected by rope bridges at dusk',
  'A frog playing a banjo on a lily pad',
  'A skateboarding dog in a sunny skate park',
  'An abandoned greenhouse taken over by giant flowers',
  'A wizard tower on a floating island with waterfalls',
  'A city street in the rain reflected in puddles with neon signs',
  'A hot air balloon shaped like a strawberry over farmland',
  'A polar bear sleeping on an iceberg under a pink sky',
  'A chess game between a robot and a monkey',
  'A desert oasis with palm trees and a crescent moon',
  'A submarine exploring a sunken temple',
  'A raccoon astronaut floating inside a space station',
  'A bakery window full of pastries on a snowy morning',
  'A volcano erupting rainbow lava',
  'A samurai cat standing in a bamboo forest',
  'A giant teacup used as a swimming pool',
  'A carnival at night with a glowing ferris wheel',
  'A lone tree on a hill under a starry sky',
  'A mushroom house with a smoking chimney in the woods',
  'A golden retriever wearing sunglasses driving a convertible',
]

export function hashString(text) {
  let h = 2166136261
  for (const ch of String(text)) {
    h ^= ch.codePointAt(0)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededRandom(seed) {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 1 | s) + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const DAILY_ROUNDS = 5

export function dailyPrompts(date) {
  const rand = seededRandom(hashString(`daily:${date}`))
  const pool = [...DAILY_PROMPTS]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, DAILY_ROUNDS)
}

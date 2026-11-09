// Prompt Off settings, themes and the network protocol.
//
// Player <-> player messages (PeerJS, peer id `promptoff-<CODE>`, host owns it):
//   { type: 'hello', name }                  both, when the connection opens
//   { type: 'start', prompt, endsAt }        host -> guest (endsAt = ms epoch)
//   { type: 'live', url }                    both, newest live preview
//   { type: 'final', url, prompt }           both, final image (may repeat)
//   { type: 'vote-room', code }              host -> guest
//   { type: 'vote-results', results }        host -> guest, { votesA, votesB }
//   { type: 'rematch' }                      both
//
// Audience <-> host messages (peer id `promptoff-vote-<CODE>`, see VotePage):
//   { type: 'viewer-hello' }                 viewer -> host
//   { type: 'vote-data', prompt, imageA, imageB, labelA, labelB }  host -> viewer
//   { type: 'vote', vote: 'A' | 'B' }        viewer -> host (one per viewer)
//   { type: 'vote-results', results }        host -> viewer
// A is always the host's image, B the guest's.

export const PROMPTS = [
  'A dragon sleeping on a pile of gold coins in a cave',
  'An astronaut riding a horse on the surface of Mars',
  'A cat wearing a top hat having tea in a garden',
  'A robot painting a sunset at the beach with an easel',
  'A treehouse in the clouds with a rope ladder',
  'A penguin surfing a giant wave at sunset',
  'A wizard casting colorful spells in a dusty library',
  'A steampunk train flying through a stormy sky',
  'A mermaid playing electric guitar underwater',
  'A samurai standing in a cherry blossom storm',
  'A dinosaur wearing sunglasses at a pool party',
  'A pirate ship made of candy sailing on chocolate seas',
  'An owl professor teaching math in a forest classroom',
  'A fox riding a bicycle through a medieval village',
  'A haunted lighthouse on a cliff during a thunderstorm',
  'A corgi astronaut floating in a space station',
  'A giant octopus wrapping around a skyscraper at night',
  'A cozy cabin in the woods during a heavy snowfall',
  'A knight jousting a windmill in a sunflower field',
  'A raccoon DJ playing turntables at a rooftop party',
]

export const YOU = '#C8FF00' // your side (lime)
export const THEM = '#FF2D55' // opponent side (pink)

export const BRUSH_COLORS = ['#1A1A2E', '#FF2D55', '#FF6B35', '#FFD600', '#C8FF00', '#00D4FF', '#8B5CF6', '#FFFFFF']
export const BRUSH_SIZES = [3, 8, 16]

export const GAME_DURATION = 60 // seconds of drawing and prompting
export const COUNTDOWN_SECONDS = 3
export const FINAL_WAIT_MS = 15000 // wait this long for both final images
export const JOIN_TIMEOUT_MS = 10000
export const ROOM_CODE_LENGTH = 5

// Points for one match (max 200, far below maxScore in gameLimits.js).
export const POINTS = { win: 200, tie: 100, loss: 50 }

export const gamePeerId = (code) => `promptoff-${code}`
export const votePeerId = (code) => `promptoff-vote-${code}`

export function pickPrompt() {
  return PROMPTS[Math.floor(Math.random() * PROMPTS.length)]
}

/** Result for one player. A = host, B = guest. */
export function matchResult(votes, isHost) {
  const mine = isHost ? votes.A : votes.B
  const theirs = isHost ? votes.B : votes.A
  const result = mine > theirs ? 'win' : mine < theirs ? 'loss' : 'tie'
  return { mine, theirs, result, points: POINTS[result] }
}

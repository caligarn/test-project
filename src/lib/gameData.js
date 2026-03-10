export const GAMES = [
  {
    id: 'prompt-off',
    title: 'Prompt Off',
    tagline: 'Head-to-head AI art battle',
    description: 'Two players compete in real-time to create the best AI image from a random prompt. Draw on a canvas, type prompts, and watch the AI generate live — Krea-style. Spectators vote for the winner!',
    icon: '🥊', color: '#14B8A6', bgClass: 'bg-[#14B8A6]',
    category: 'speed', difficulty: 'Medium', players: '2', pointsPerAction: 200,
    section: 'icebreakers',
  },
  {
    id: 'prompt-guesser',
    title: 'Prompt Guesser',
    tagline: 'Decode the AI\'s imagination',
    description: 'An AI-generated image is shown. Can you guess the prompt that created it? The closer your guess, the higher your score!',
    icon: '🔍', color: '#FF2D55', bgClass: 'bg-primary',
    category: 'puzzle', difficulty: 'Medium', players: '1,247', pointsPerAction: 100,
    section: 'new',
  },
  {
    id: 'pixel-duel',
    title: 'Pixel Duel',
    tagline: 'Mirror the masterpiece',
    description: 'See an AI image, then write your own prompt to recreate it as closely as possible. AI judges the similarity!',
    icon: '⚔️', color: '#C8FF00', bgClass: 'bg-accent',
    category: 'creative', difficulty: 'Hard', players: '892', pointsPerAction: 150,
    section: 'new',
  },
  {
    id: 'style-roulette',
    title: 'Style Roulette',
    tagline: 'Spot the style',
    description: 'Given a reference art style, pick which of 4 AI-generated images matches it. Quick rounds, climbing difficulty!',
    icon: '🎨', color: '#FF6B35', bgClass: 'bg-[#FF6B35]',
    category: 'trivia', difficulty: 'Easy', players: '2,103', pointsPerAction: 100,
    section: 'new',
  },
  {
    id: 'speed-prompt',
    title: 'Speed Prompt',
    tagline: 'Race against the clock',
    description: 'You have 30 seconds to write the perfect prompt for a target concept. The AI generates it — how close can you get?',
    icon: '⚡', color: '#FFD600', bgClass: 'bg-highlight',
    category: 'speed', difficulty: 'Medium', players: '1,567', pointsPerAction: 100,
    section: 'new',
  },
  {
    id: 'dream-caption',
    title: 'Dream Caption',
    tagline: 'Caption the impossible',
    description: 'AI generates surreal, dreamlike images. Write the most creative and fitting caption. Community votes decide the winner!',
    icon: '💭', color: '#8B5CF6', bgClass: 'bg-[#8B5CF6]',
    category: 'creative', difficulty: 'Easy', players: '3,421', pointsPerAction: 75,
    section: 'new',
  },
  {
    id: 'ai-remix',
    title: 'AI Remix',
    tagline: 'Transform and evolve',
    description: 'Start with a base image and iteratively modify it with prompt tweaks. Guide the AI through a creative evolution chain!',
    icon: '🔄', color: '#00D4FF', bgClass: 'bg-[#00D4FF]',
    category: 'creative', difficulty: 'Hard', players: '678', pointsPerAction: 50,
    section: 'new',
  },
  {
    id: 'spot-the-fake',
    title: 'Spot the Fake',
    tagline: 'Find the odd one out',
    description: 'Four AI images — three match the same prompt, one is the imposter. Can you spot the fake before time runs out?',
    icon: '🕵️', color: '#0D9488', bgClass: 'bg-[#0D9488]',
    category: 'puzzle', difficulty: 'Medium', players: '0', pointsPerAction: 100,
    section: 'new',
  },
  {
    id: 'telephone',
    title: 'Telephone',
    tagline: 'Watch the message drift',
    description: 'Write a prompt, AI draws it, then describe what you see — repeat 5 times and watch how far the image drifts from the original!',
    icon: '📞', color: '#D946EF', bgClass: 'bg-[#D946EF]',
    category: 'creative', difficulty: 'Easy', players: '0', pointsPerAction: 80,
    section: 'icebreakers',
  },
  {
    id: 'emoji-prompt',
    title: 'Emoji Prompt',
    tagline: 'Speak only in emoji',
    description: 'Build an AI image prompt using only emojis! Tap from a huge selection to describe your scene — no words allowed. Best emoji art wins!',
    icon: '😎', color: '#F59E0B', bgClass: 'bg-[#F59E0B]',
    category: 'creative', difficulty: 'Easy', players: '0', pointsPerAction: 100,
    section: 'icebreakers',
  },
]

export const MINIGAMES = [
  {
    id: 'infinimap',
    title: 'Infini-Map',
    tagline: 'Paint the infinite canvas',
    description: 'Click tiles on an infinite canvas to generate AI imagery. Fill the board tile by tile — each earns you points!',
    icon: '🗺️', color: '#1E1B4B', bgClass: 'bg-[#1E1B4B]',
    category: 'creative', difficulty: 'Easy', players: '0',
    pointsPerAction: 50,
    section: 'crowd-graffiti',
  },
  {
    id: 'haiku-canvas',
    title: 'Haiku Canvas',
    tagline: 'Turn poetry into art',
    description: 'Write a 5-7-5 haiku and watch AI transform your words into stunning artwork. Build a collaborative poetry gallery!',
    icon: '🌸', color: '#0F172A', bgClass: 'bg-[#0F172A]',
    category: 'creative', difficulty: 'Easy', players: '0',
    pointsPerAction: 75,
    section: 'crowd-graffiti',
  },
  {
    id: 'mosaic-maker',
    title: 'Mosaic Maker',
    tagline: 'Build the collective canvas',
    description: 'Create AI-generated pieces that join into a collaborative mosaic. Every piece you add shapes the collective artwork.',
    icon: '🧩', color: '#1F2937', bgClass: 'bg-[#1F2937]',
    category: 'creative', difficulty: 'Easy', players: '0',
    pointsPerAction: 60,
    section: 'crowd-graffiti',
  },
  {
    id: 'community-comic',
    title: 'Community Comic',
    tagline: 'Build the story together',
    description: 'Add panels to a growing collaborative comic. Write your scene, AI generates the art — each panel continues the story!',
    icon: '📖', color: '#7C2D12', bgClass: 'bg-[#7C2D12]',
    category: 'creative', difficulty: 'Easy', players: '0',
    pointsPerAction: 80,
    section: 'icebreakers',
  },
  {
    id: 'before-after',
    title: 'Before & After',
    tagline: 'Transform the scene',
    description: 'See a "before" scene and reimagine its future — underwater, overgrown, year 3000. The gallery shows every transformation side by side!',
    icon: '🔮', color: '#059669', bgClass: 'bg-[#059669]',
    category: 'creative', difficulty: 'Easy', players: '0',
    pointsPerAction: 75,
    section: 'crowd-graffiti',
  },
]

export const ALL_GAMES = [...GAMES, ...MINIGAMES]

export const ICEBREAKERS = ALL_GAMES.filter((g) => g.section === 'icebreakers')
export const NEW_GAMES = ALL_GAMES.filter((g) => g.section === 'new')
export const CROWD_GRAFFITI = ALL_GAMES.filter((g) => g.section === 'crowd-graffiti')

export const CATEGORIES = [
  { id: 'all', label: 'All Games', icon: '🎮' },
  { id: 'puzzle', label: 'Puzzle', icon: '🧩' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'trivia', label: 'Trivia', icon: '❓' },
  { id: 'speed', label: 'Speed', icon: '⚡' },
]

export function getGame(id) {
  return ALL_GAMES.find((g) => g.id === id)
}

export function getGamesByCategory(category) {
  if (category === 'all') return ALL_GAMES
  return ALL_GAMES.filter((g) => g.category === category)
}

export function getAllGames() {
  return ALL_GAMES
}

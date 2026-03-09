export const GAMES = [
  {
    id: 'prompt-guesser',
    title: 'Prompt Guesser',
    tagline: 'Decode the AI\'s imagination',
    description: 'An AI-generated image is shown. Can you guess the prompt that created it? The closer your guess, the higher your score!',
    icon: '🔍', color: '#FF2D55', bgClass: 'bg-primary',
    category: 'puzzle', difficulty: 'Medium', players: '1,247', featured: true, isNew: false, pointsPerAction: 100,
  },
  {
    id: 'pixel-duel',
    title: 'Pixel Duel',
    tagline: 'Mirror the masterpiece',
    description: 'See an AI image, then write your own prompt to recreate it as closely as possible. AI judges the similarity!',
    icon: '⚔️', color: '#C8FF00', bgClass: 'bg-accent',
    category: 'creative', difficulty: 'Hard', players: '892', featured: true, isNew: true, pointsPerAction: 150,
  },
  {
    id: 'style-roulette',
    title: 'Style Roulette',
    tagline: 'Spot the style',
    description: 'Given a reference art style, pick which of 4 AI-generated images matches it. Quick rounds, climbing difficulty!',
    icon: '🎨', color: '#FF6B35', bgClass: 'bg-[#FF6B35]',
    category: 'trivia', difficulty: 'Easy', players: '2,103', featured: false, isNew: false, pointsPerAction: 100,
  },
  {
    id: 'speed-prompt',
    title: 'Speed Prompt',
    tagline: 'Race against the clock',
    description: 'You have 30 seconds to write the perfect prompt for a target concept. The AI generates it — how close can you get?',
    icon: '⚡', color: '#FFD600', bgClass: 'bg-highlight',
    category: 'speed', difficulty: 'Medium', players: '1,567', featured: true, isNew: false, pointsPerAction: 100,
  },
  {
    id: 'dream-caption',
    title: 'Dream Caption',
    tagline: 'Caption the impossible',
    description: 'AI generates surreal, dreamlike images. Write the most creative and fitting caption. Community votes decide the winner!',
    icon: '💭', color: '#8B5CF6', bgClass: 'bg-[#8B5CF6]',
    category: 'creative', difficulty: 'Easy', players: '3,421', featured: false, isNew: false, pointsPerAction: 75,
  },
  {
    id: 'ai-remix',
    title: 'AI Remix',
    tagline: 'Transform and evolve',
    description: 'Start with a base image and iteratively modify it with prompt tweaks. Guide the AI through a creative evolution chain!',
    icon: '🔄', color: '#00D4FF', bgClass: 'bg-[#00D4FF]',
    category: 'creative', difficulty: 'Hard', players: '678', featured: false, isNew: true, pointsPerAction: 50,
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
    featured: true, isNew: true, pointsPerAction: 50,
  },
  {
    id: 'haiku-canvas',
    title: 'Haiku Canvas',
    tagline: 'Turn poetry into art',
    description: 'Write a 5-7-5 haiku and watch AI transform your words into stunning artwork. Build a collaborative poetry gallery!',
    icon: '🌸', color: '#0F172A', bgClass: 'bg-[#0F172A]',
    category: 'creative', difficulty: 'Easy', players: '0',
    featured: true, isNew: true, pointsPerAction: 75,
  },
  {
    id: 'mosaic-maker',
    title: 'Mosaic Maker',
    tagline: 'Build the collective canvas',
    description: 'Create AI-generated pieces that join into a collaborative mosaic. Every piece you add shapes the collective artwork.',
    icon: '🧩', color: '#1F2937', bgClass: 'bg-[#1F2937]',
    category: 'creative', difficulty: 'Easy', players: '0',
    featured: false, isNew: true, pointsPerAction: 60,
  },
  {
    id: 'community-comic',
    title: 'Community Comic',
    tagline: 'Build the story together',
    description: 'Add panels to a growing collaborative comic. Write your scene, AI generates the art — each panel continues the story!',
    icon: '📖', color: '#7C2D12', bgClass: 'bg-[#7C2D12]',
    category: 'creative', difficulty: 'Easy', players: '0',
    featured: true, isNew: true, pointsPerAction: 80,
  },
]

export const ALL_GAMES = [...GAMES, ...MINIGAMES]

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

export function getAllGamesByCategory(category) {
  return getGamesByCategory(category)
}

export function getFeaturedGames() {
  return ALL_GAMES.filter((g) => g.featured)
}

export function getAllGames() {
  return ALL_GAMES
}

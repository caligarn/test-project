export const GAMES = [
  {
    id: 'prompt-guesser',
    title: 'Prompt Guesser',
    tagline: 'Decode the AI\'s imagination',
    description: 'An AI-generated image is shown. Can you guess the prompt that created it? The closer your guess, the higher your score!',
    icon: '🔍',
    color: '#6C5CE7',
    gradient: 'from-purple-600 to-indigo-600',
    category: 'puzzle',
    difficulty: 'Medium',
    players: '1,247',
    featured: true,
    isNew: false,
  },
  {
    id: 'pixel-duel',
    title: 'Pixel Duel',
    tagline: 'Mirror the masterpiece',
    description: 'See an AI image, then write your own prompt to recreate it as closely as possible. AI judges the similarity!',
    icon: '⚔️',
    color: '#00CEC9',
    gradient: 'from-teal-500 to-cyan-500',
    category: 'creative',
    difficulty: 'Hard',
    players: '892',
    featured: true,
    isNew: true,
  },
  {
    id: 'style-roulette',
    title: 'Style Roulette',
    tagline: 'Spot the style',
    description: 'Given a reference art style, pick which of 4 AI-generated images matches it. Quick rounds, climbing difficulty!',
    icon: '🎨',
    color: '#E17055',
    gradient: 'from-orange-500 to-red-500',
    category: 'trivia',
    difficulty: 'Easy',
    players: '2,103',
    featured: false,
    isNew: false,
  },
  {
    id: 'speed-prompt',
    title: 'Speed Prompt',
    tagline: 'Race against the clock',
    description: 'You have 30 seconds to write the perfect prompt for a target concept. The AI generates it — how close can you get?',
    icon: '⚡',
    color: '#FDCB6E',
    gradient: 'from-yellow-500 to-amber-500',
    category: 'speed',
    difficulty: 'Medium',
    players: '1,567',
    featured: true,
    isNew: false,
  },
  {
    id: 'dream-caption',
    title: 'Dream Caption',
    tagline: 'Caption the impossible',
    description: 'AI generates surreal, dreamlike images. Write the most creative and fitting caption. Community votes decide the winner!',
    icon: '💭',
    color: '#A29BFE',
    gradient: 'from-violet-500 to-purple-500',
    category: 'creative',
    difficulty: 'Easy',
    players: '3,421',
    featured: false,
    isNew: false,
  },
  {
    id: 'ai-remix',
    title: 'AI Remix',
    tagline: 'Transform and evolve',
    description: 'Start with a base image and iteratively modify it with prompt tweaks. Guide the AI through a creative evolution chain!',
    icon: '🔄',
    color: '#00B894',
    gradient: 'from-emerald-500 to-green-500',
    category: 'creative',
    difficulty: 'Hard',
    players: '678',
    featured: false,
    isNew: true,
  },
]

export const CATEGORIES = [
  { id: 'all', label: 'All Games', icon: '🎮' },
  { id: 'puzzle', label: 'Puzzle', icon: '🧩' },
  { id: 'creative', label: 'Creative', icon: '🎨' },
  { id: 'trivia', label: 'Trivia', icon: '❓' },
  { id: 'speed', label: 'Speed', icon: '⚡' },
]

export function getGame(id) {
  return GAMES.find((g) => g.id === id)
}

export function getGamesByCategory(category) {
  if (category === 'all') return GAMES
  return GAMES.filter((g) => g.category === category)
}

export function getFeaturedGames() {
  return GAMES.filter((g) => g.featured)
}

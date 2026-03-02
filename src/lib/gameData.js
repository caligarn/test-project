export const GAMES = [
  {
    id: 'prompt-guesser',
    title: 'Prompt Guesser',
    tagline: 'Decode the AI\'s imagination',
    description: 'An AI-generated image is shown. Can you guess the prompt that created it? The closer your guess, the higher your score!',
    icon: '🔍',
    color: '#FF2D55',
    bgClass: 'bg-primary',
    category: 'puzzle',
    difficulty: 'Medium',
    players: '1,247',
    featured: true,
    isNew: false,
    playable: false,
  },
  {
    id: 'pixel-duel',
    title: 'Pixel Duel',
    tagline: 'Mirror the masterpiece',
    description: 'See an AI image, then write your own prompt to recreate it as closely as possible. AI judges the similarity!',
    icon: '⚔️',
    color: '#C8FF00',
    bgClass: 'bg-accent',
    category: 'creative',
    difficulty: 'Hard',
    players: '892',
    featured: true,
    isNew: false,
    playable: false,
  },
  {
    id: 'style-roulette',
    title: 'Style Roulette',
    tagline: 'Spot the style',
    description: 'Given a reference art style, pick which of 4 AI-generated images matches it. Quick rounds, climbing difficulty!',
    icon: '🎨',
    color: '#FF6B35',
    bgClass: 'bg-[#FF6B35]',
    category: 'trivia',
    difficulty: 'Easy',
    players: '2,103',
    featured: false,
    isNew: false,
    playable: false,
  },
  {
    id: 'speed-prompt',
    title: 'Speed Prompt',
    tagline: 'Race against the clock',
    description: 'You have 30 seconds to write the perfect prompt for a target concept. The AI generates it — how close can you get?',
    icon: '⚡',
    color: '#FFD600',
    bgClass: 'bg-highlight',
    category: 'speed',
    difficulty: 'Medium',
    players: '1,567',
    featured: true,
    isNew: false,
    playable: false,
  },
  {
    id: 'dream-caption',
    title: 'Dream Caption',
    tagline: 'Caption the impossible',
    description: 'AI generates surreal, dreamlike images. Write the most creative and fitting caption. Community votes decide the winner!',
    icon: '💭',
    color: '#8B5CF6',
    bgClass: 'bg-[#8B5CF6]',
    category: 'creative',
    difficulty: 'Easy',
    players: '3,421',
    featured: false,
    isNew: false,
    playable: false,
  },
  {
    id: 'ai-remix',
    title: 'AI Remix',
    tagline: 'Transform and evolve',
    description: 'Start with a base image and iteratively modify it with prompt tweaks. Guide the AI through a creative evolution chain!',
    icon: '🔄',
    color: '#00D4FF',
    bgClass: 'bg-[#00D4FF]',
    category: 'creative',
    difficulty: 'Hard',
    players: '678',
    featured: false,
    isNew: false,
    playable: false,
  },
]

export const MINIGAMES = [
  {
    id: 'infinimap',
    title: 'InfiniMap',
    tagline: 'Explore an infinite AI world',
    description: 'Click tiles on an infinite grid to generate AI-powered imagery. Pan across the map and discover unique landscapes, each tile blending seamlessly with its neighbors.',
    icon: '🗺️',
    color: '#10B981',
    bgClass: 'bg-[#10B981]',
    category: 'creative',
    difficulty: 'Easy',
    players: '456',
    featured: true,
    isNew: true,
    playable: true,
  },
  {
    id: 'haiku-canvas',
    title: 'Haiku Canvas',
    tagline: 'Poetry meets AI art',
    description: 'Write haikus in the traditional 5-7-5 syllable pattern and watch AI transform your poetry into beautiful artwork. Choose from watercolor, oil painting, ink wash, or digital styles.',
    icon: '🎋',
    color: '#6366F1',
    bgClass: 'bg-[#6366F1]',
    category: 'creative',
    difficulty: 'Easy',
    players: '789',
    featured: true,
    isNew: true,
    playable: true,
  },
  {
    id: 'mosaic-maker',
    title: 'Mosaic Maker',
    tagline: 'Build collaborative art',
    description: 'Create mosaic pieces with AI-generated artwork. Pick a theme, describe each tile, and watch a collaborative mosaic come together piece by piece.',
    icon: '🧩',
    color: '#F59E0B',
    bgClass: 'bg-[#F59E0B]',
    category: 'creative',
    difficulty: 'Medium',
    players: '321',
    featured: false,
    isNew: true,
    playable: true,
  },
  {
    id: 'community-comic',
    title: 'Community Comic',
    tagline: 'Create AI comic stories',
    description: 'Build comic stories panel by panel! Choose art styles like manga, superhero, cartoon, or noir. Add captions, dialogue, and AI generates the artwork for each panel.',
    icon: '📚',
    color: '#EC4899',
    bgClass: 'bg-[#EC4899]',
    category: 'creative',
    difficulty: 'Medium',
    players: '234',
    featured: false,
    isNew: true,
    playable: true,
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

export function getFeaturedGames() {
  return ALL_GAMES.filter((g) => g.featured)
}

export function getAllGames() {
  return ALL_GAMES
}

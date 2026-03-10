export const GAMES = [
  {
    id: 'prompt-off',
    title: 'Prompt Off',
    tagline: 'Head-to-head AI art battle',
    description: 'Two players compete in real-time to create the best AI image from a random prompt. Draw on a canvas, type prompts, and watch the AI generate live — Krea-style. Spectators vote for the winner!',
    icon: '🥊', color: '#14B8A6', bgClass: 'bg-[#14B8A6]',
    howToPlay: 'Two players go head-to-head in a live AI art battle. A random theme is revealed, then both players sketch on a canvas and write prompts to guide the AI. Images generate in real-time so you can iterate fast. Once time is up, spectators vote on their favorite. The player with the most votes wins the round!',
    category: 'speed', difficulty: 'Medium', players: '2', pointsPerAction: 200,
    section: 'icebreakers',
  },
  {
    id: 'prompt-guesser',
    title: 'Prompt Guesser',
    tagline: 'Decode the AI\'s imagination',
    description: 'An AI-generated image is shown. Can you guess the prompt that created it? The closer your guess, the higher your score!',
    icon: '🔍', color: '#FF2D55', bgClass: 'bg-primary',
    howToPlay: 'Each round shows you an AI-generated image. Your job is to figure out what prompt was used to create it. Type your best guess and submit — the AI scores how close your guess is to the original prompt. You get 5 rounds, and points stack up based on similarity. Think about style, subject, and details!',
    category: 'puzzle', difficulty: 'Medium', players: '1,247', pointsPerAction: 100,
    section: 'new',
  },
  {
    id: 'pixel-duel',
    title: 'Pixel Duel',
    tagline: 'Mirror the masterpiece',
    description: 'See an AI image, then write your own prompt to recreate it as closely as possible. AI judges the similarity!',
    icon: '⚔️', color: '#C8FF00', bgClass: 'bg-accent',
    howToPlay: 'You\'re shown a target AI image and your goal is to recreate it. Study the image carefully — colors, composition, subject, style — then write a prompt to generate something as close as possible. The AI compares your result to the original and scores the similarity. The closer the match, the more points you earn across 5 rounds.',
    category: 'creative', difficulty: 'Hard', players: '892', pointsPerAction: 150,
    section: 'new',
  },
  {
    id: 'style-roulette',
    title: 'Style Roulette',
    tagline: 'Spot the style',
    description: 'Given a reference art style, pick which of 4 AI-generated images matches it. Quick rounds, climbing difficulty!',
    icon: '🎨', color: '#FF6B35', bgClass: 'bg-[#FF6B35]',
    howToPlay: 'Each round presents a reference image in a specific art style — impressionist, pixel art, watercolor, and more. Below it, four AI-generated options appear. Pick the one that matches the reference style. Rounds get harder as styles become more subtle. You have a time limit, so trust your eye and click fast!',
    category: 'trivia', difficulty: 'Easy', players: '2,103', pointsPerAction: 100,
    section: 'new',
  },
  {
    id: 'speed-prompt',
    title: 'Speed Prompt',
    tagline: 'Race against the clock',
    description: 'You have 30 seconds to write the perfect prompt for a target concept. The AI generates it — how close can you get?',
    icon: '⚡', color: '#FFD600', bgClass: 'bg-highlight',
    howToPlay: 'A target concept is revealed — like "a castle in the clouds" or "cyberpunk street market." You have 30 seconds to write the best prompt you can. When time\'s up, the AI generates your image and scores how well it matches the target. Be specific about style, lighting, and composition to maximize your score across 5 rounds.',
    category: 'speed', difficulty: 'Medium', players: '1,567', pointsPerAction: 100,
    section: 'new',
  },
  {
    id: 'dream-caption',
    title: 'Dream Caption',
    tagline: 'Caption the impossible',
    description: 'AI generates surreal, dreamlike images. Write the most creative and fitting caption. Community votes decide the winner!',
    icon: '💭', color: '#8B5CF6', bgClass: 'bg-[#8B5CF6]',
    howToPlay: 'A surreal, dreamlike AI image appears on screen. Your task is to write the most creative and fitting caption for it. Think witty, poetic, or absurd — whatever fits the vibe. Submit your caption and browse what others wrote. The community votes on the best captions, and top-voted ones earn bonus points!',
    category: 'creative', difficulty: 'Easy', players: '3,421', pointsPerAction: 75,
    section: 'new',
  },
  {
    id: 'ai-remix',
    title: 'AI Remix',
    tagline: 'Transform and evolve',
    description: 'Start with a base image and iteratively modify it with prompt tweaks. Guide the AI through a creative evolution chain!',
    icon: '🔄', color: '#00D4FF', bgClass: 'bg-[#00D4FF]',
    howToPlay: 'You start with a base AI image. Each round, you write a short prompt tweak to modify it — "make it neon," "add rain," "turn it into a painting." The AI applies your change and generates a new version. Chain up to 5 modifications to guide the image through a creative evolution. Points are awarded for each step in your remix chain.',
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
    howToPlay: 'Explore an infinite grid canvas. Click any empty tile to claim it — type a prompt and the AI fills that tile with a generated image. Pan around to see what others have created and fill in gaps. Each tile you generate earns points. Try to create interesting patterns or connect your tiles with neighboring ones!',
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
    howToPlay: 'Write a haiku in the classic 5-7-5 syllable format. The editor counts syllables as you type to keep you on track. Once your haiku is complete, the AI generates artwork inspired by your poem. Your haiku and its art get added to the community gallery. Browse others\' creations and earn points for each haiku you submit!',
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
    howToPlay: 'Pick an empty spot on the shared mosaic grid and write a prompt for your tile. The AI generates your piece and places it into the mosaic. Try to complement the tiles around you — or go wild and create contrast! Each tile you contribute earns points, and together the community builds a massive collaborative artwork.',
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
    howToPlay: 'Read the comic so far to see what\'s happened in the story. Then write a description for the next panel — what happens next? The AI generates artwork for your scene and adds it to the comic strip. Each panel you add earns points. The story keeps growing as more people contribute, so get creative with your plot twists!',
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

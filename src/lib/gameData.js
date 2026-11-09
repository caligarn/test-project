export const GAMES = [
  {
    id: 'prompt-off',
    title: 'Prompt Off',
    tagline: 'Head-to-head AI art battle',
    description: "Two players race to create the best AI image for a random theme. Sketch on a canvas, type prompts, and watch the AI draw live. The audience votes for the winner from their phones!",
    icon: '🥊', color: '#14B8A6', bgClass: 'bg-[#14B8A6]',
    howToPlay: "One player creates a room and shares the code. A random theme appears, then both players sketch and write prompts while the AI draws live. When time is up, the audience scans the QR code and votes. The image with the most votes wins!",
    category: 'speed', difficulty: 'Medium', pointsPerAction: 200,
    party: true,
    section: 'icebreakers',
  },
  {
    id: 'prompt-guesser',
    title: 'Prompt Guesser',
    tagline: "Guess it, then draw it",
    description: "An AI image appears. Guess the prompt behind it. We draw your guess too, and the AI judge compares the two images. Words and looks both score!",
    icon: '🔍', color: '#FF2D55', bgClass: 'bg-primary',
    howToPlay: "Each round shows an AI image. Type the prompt you think made it. Your score has two parts: how many words of the hidden prompt you found, and how close the image drawn from your guess looks to the original (the AI judge decides). Use a hint if you are stuck, but it costs points. 5 rounds.",
    category: 'puzzle', difficulty: 'Medium', pointsPerAction: 100,
    section: 'new',
  },
  {
    id: 'style-roulette',
    title: 'Style Roulette',
    tagline: 'Spot the style',
    description: 'Given a reference art style, pick which of 4 AI-generated images matches it. Quick rounds, climbing difficulty!',
    icon: '🎨', color: '#FF6B35', bgClass: 'bg-[#FF6B35]',
    howToPlay: "Each round shows an AI image in one art style. Pick the style from four choices before the timer runs out. Fast answers and streaks earn bonus points. 5 rounds.",
    category: 'trivia', difficulty: 'Easy', pointsPerAction: 100,
    section: 'new',
  },
  {
    id: 'speed-prompt',
    title: 'Speed Prompt',
    tagline: 'Race against the clock',
    description: "A concept appears and the clock starts. Write a prompt in 30 seconds. The AI draws it and the AI judge scores how well your image shows the concept.",
    icon: '⚡', color: '#FFD600', bgClass: 'bg-highlight',
    howToPlay: "A concept appears, like \"Haunted mansion\". You have 30 seconds to write a prompt. The AI draws your image, then the AI judge scores how clearly and creatively it shows the concept. Finishing early adds a small speed bonus. 5 rounds.",
    category: 'speed', difficulty: 'Medium', pointsPerAction: 100,
    section: 'new',
  },
  {
    id: 'dream-caption',
    title: 'Dream Caption',
    tagline: 'Caption the impossible',
    description: "The AI dreams up a surreal image. Write the best caption. Play solo with the AI judge, or in party mode where friends vote for their favorite caption!",
    icon: '💭', color: '#8B5CF6', bgClass: 'bg-[#8B5CF6]',
    howToPlay: "A surreal AI image appears. Write a witty, poetic, or absurd caption. Solo: the AI judge scores your caption and it joins the shared gallery, where anyone can vote. Party mode: everyone captions the same image on their phone, then votes for the best one (not their own).",
    category: 'creative', difficulty: 'Easy', pointsPerAction: 75,
    party: true,
    section: 'new',
  },
  {
    id: 'ai-remix',
    title: 'AI Remix',
    tagline: 'Transform and evolve',
    description: "Start with an AI image and change it step by step. The AI edits your image, not just your words, and the judge scores each change.",
    icon: '🔄', color: '#00D4FF', bgClass: 'bg-[#00D4FF]',
    howToPlay: "You start with an AI image. Each step, type one change, like \"make it night\" or \"add a dragon\". The AI edits the actual image and the AI judge scores how well the change worked while the scene stays recognisable. Make 5 changes to finish your remix.",
    category: 'creative', difficulty: 'Hard', pointsPerAction: 50,
    section: 'new',
  },
  {
    id: 'spot-the-fake',
    title: 'Spot the Fake',
    tagline: 'Find the odd one out',
    description: 'Four AI images, three match the same prompt, one is the imposter. Can you spot the fake before time runs out?',
    icon: '🕵️', color: '#0D9488', bgClass: 'bg-[#0D9488]',
    howToPlay: "Four AI images appear. Three come from the same prompt and one comes from a slightly different prompt. Find the odd one out before the timer runs out. Fast answers and streaks earn bonus points. 5 rounds.",
    category: 'puzzle', difficulty: 'Medium', pointsPerAction: 100,
    section: 'new',
  },
  {
    id: 'telephone',
    title: 'Telephone',
    tagline: 'Watch the message drift',
    description: "Write a prompt, AI draws it, then someone describes the drawing and the AI draws again. Play solo or pass it around in party mode and watch the message drift!",
    icon: '📞', color: '#D946EF', bgClass: 'bg-[#D946EF]',
    howToPlay: "Solo: you get a secret starting prompt and see only the images. Describe each image, the AI redraws it, and the AI judge scores how much of the first image survived. Party mode: every player starts a chain, chains rotate each step, and at the end everyone sees how each chain drifted.",
    category: 'creative', difficulty: 'Easy', pointsPerAction: 80,
    party: true,
    section: 'icebreakers',
  },
  {
    id: 'emoji-prompt',
    title: 'Emoji Prompt',
    tagline: 'Speak only in emoji',
    description: "Describe a scene using only emojis. The AI draws your emojis and the judge scores how well the image shows the scene. Party mode: friends vote for the best emoji art!",
    icon: '😎', color: '#F59E0B', bgClass: 'bg-[#F59E0B]',
    howToPlay: "A scene appears, like \"a pirate on a desert island\". Tap emojis to describe it, with no words allowed. The AI draws an image from your emojis and the AI judge scores how well it shows the scene. Party mode: everyone gets the same scene, then votes for the best result.",
    category: 'creative', difficulty: 'Easy', pointsPerAction: 100,
    party: true,
    section: 'icebreakers',
  },
]

export const MINIGAMES = [
  {
    id: 'infinimap',
    title: 'Infini-Map',
    tagline: "Paint the shared canvas",
    description: "One giant canvas for everyone. Claim an empty tile, write a prompt, and the AI paints it. Try to match the tiles next to yours!",
    icon: '🗺️', color: '#1E1B4B', bgClass: 'bg-[#1E1B4B]',
    category: 'creative', difficulty: 'Easy',
    howToPlay: "Pan around the shared map and click an empty tile. Write a prompt and the AI paints that tile for everyone to see. Look at the neighbouring tiles and try to continue their scene, so the map grows into one big picture. Each tile earns points.",
    pointsPerAction: 50,
    section: 'crowd-graffiti',
  },
  {
    id: 'haiku-canvas',
    title: 'Haiku Canvas',
    tagline: 'Turn poetry into art',
    description: 'Write a 5-7-5 haiku and watch AI transform your words into stunning artwork. Build a collaborative poetry gallery!',
    icon: '🌸', color: '#0F172A', bgClass: 'bg-[#0F172A]',
    category: 'creative', difficulty: 'Easy',
    howToPlay: "Write a haiku in the classic 5-7-5 syllable format. The editor counts syllables as you type. When your haiku is complete, the AI paints artwork for it and adds it to the shared gallery. Vote for your favorite haiku art!",
    pointsPerAction: 75,
    section: 'crowd-graffiti',
  },
  {
    id: 'community-comic',
    title: 'Community Comic',
    tagline: 'Build the story together',
    description: 'Add panels to a growing collaborative comic. Write your scene, AI generates the art, each panel continues the story!',
    icon: '📖', color: '#7C2D12', bgClass: 'bg-[#7C2D12]',
    category: 'creative', difficulty: 'Easy',
    howToPlay: "Read the comic so far. Then write what happens in the next panel. The AI draws your panel and adds it to the shared comic strip that everyone builds together. Plot twists welcome!",
    pointsPerAction: 80,
    section: 'icebreakers',
  },
  {
    id: 'before-after',
    title: 'Before & After',
    tagline: 'Transform the scene',
    description: "See a \"before\" scene and reimagine it: underwater, overgrown, year 3000. The AI edits the real image, and the gallery shows every transformation side by side!",
    icon: '🔮', color: '#059669', bgClass: 'bg-[#059669]',
    howToPlay: "A \"before\" scene appears. Type a transformation, like \"flooded and overgrown\" or \"in the year 3000\". The AI edits that exact image, so you see a true before and after. The AI judge scores the change, and your result joins the shared gallery.",
    category: 'creative', difficulty: 'Easy',
    pointsPerAction: 75,
    section: 'crowd-graffiti',
  },
]

// The Daily Challenge: same 5 images for everyone each day, one try,
// scored on the server, with its own daily leaderboard.
export const DAILY = {
  id: 'daily',
  title: 'Daily Challenge',
  tagline: 'Same puzzle for everyone, every day',
  description: 'Five AI images, the same for every player today. Guess each prompt once. Your total goes on today\'s leaderboard. A new challenge starts every day!',
  icon: '📅', color: '#1A1A2E', bgClass: 'bg-navy',
  howToPlay: 'Five images, one guess each. Type the prompt you think made each image. The server scores how many words of the hidden prompt you found and then shows you the real prompt. Log in to get on today\'s leaderboard. Come back tomorrow for a new set!',
  category: 'puzzle', difficulty: 'Medium',
  section: 'daily',
}

export const ALL_GAMES = [...GAMES, ...MINIGAMES, DAILY]

// Old game ids that were merged into other games.
export const GAME_ALIASES = {
  'pixel-duel': 'prompt-guesser',
  'mosaic-maker': 'infinimap',
}

export const PARTY_GAMES = ALL_GAMES.filter((g) => g.party)
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
  const real = GAME_ALIASES[id] || id
  return ALL_GAMES.find((g) => g.id === real)
}

export function getGamesByCategory(category) {
  if (category === 'all') return ALL_GAMES
  return ALL_GAMES.filter((g) => g.category === category)
}

export function getAllGames() {
  return ALL_GAMES
}

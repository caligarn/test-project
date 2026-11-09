import { defineMachine } from '../lib/machine.js'

export const emojiPromptMachine = defineMachine({
  id: 'emoji-prompt',
  description: 'Emoji Prompt solo, 5 rounds: describe a scene with emojis only, the AI draws the emojis, the AI judge checks the scene.',
  initial: 'idle',
  on: { RESTART: 'idle' },
  states: {
    idle: { description: 'Before the round; the player asks for a scene', on: { START: 'building' } },
    building: { description: 'The player picks emojis for the scene', on: { SUBMIT: 'generating' } },
    generating: { description: 'The AI draws the emojis, then the judge scores the picture', on: { SCORED: 'result', FAILED: 'building' } },
    result: { description: 'Round score shown', on: { NEXT: 'idle', FINISH: 'over' } },
    over: { description: 'All rounds played; final score shown', final: true },
  },
})

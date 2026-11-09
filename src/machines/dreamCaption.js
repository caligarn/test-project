import { defineMachine } from '../lib/machine.js'

export const dreamCaptionMachine = defineMachine({
  id: 'dream-caption',
  description: 'Dream Caption solo, 3 rounds: the AI dreams up a surreal image, the player captions it, the AI judge scores the caption.',
  initial: 'idle',
  on: { RESTART: 'idle' },
  states: {
    idle: { description: 'Before the round; the player asks for a dream image', on: { GENERATE: 'generating' } },
    generating: { description: 'The AI draws the dream image', on: { DREAMED: 'captioning', DREAM_FAILED: 'idle' } },
    captioning: { description: 'The player writes a caption for the image', on: { SUBMIT: 'judging' } },
    judging: { description: 'The AI judge scores the caption', on: { JUDGED: 'result' } },
    result: { description: 'Round score shown; the caption is posted to the shared gallery', on: { NEXT: 'idle', FINISH: 'over' } },
    over: { description: 'All rounds played; final score and caption history shown', final: true },
  },
})

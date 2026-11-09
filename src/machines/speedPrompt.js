import { defineMachine } from '../lib/machine.js'

export const speedPromptMachine = defineMachine({
  id: 'speed-prompt',
  description: 'Speed Prompt, 5 rounds: write a prompt in 30 seconds, then the AI draws and the judge scores it.',
  initial: 'idle',
  on: { RESTART: 'idle' },
  states: {
    idle: { description: 'Before the round starts', on: { START: 'writing' } },
    writing: {
      description: 'The 30 second timer runs; the player types a prompt',
      on: { SUBMIT: 'generating', SUBMIT_EMPTY: 'result' },
    },
    generating: { description: 'The AI draws the prompt', on: { DRAWN: 'judging', DRAW_FAILED: 'result' } },
    judging: { description: 'The AI judge scores the image', on: { JUDGED: 'result' } },
    result: { description: 'Round score shown', on: { NEXT: 'idle', FINISH: 'over' } },
    over: { description: 'All rounds played; final score shown', final: true },
  },
})

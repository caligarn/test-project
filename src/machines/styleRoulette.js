import { defineMachine } from '../lib/machine.js'

export const styleRouletteMachine = defineMachine({
  id: 'style-roulette',
  description: 'Style Roulette, 5 rounds: name the art style of an AI image before the 15 second timer runs out.',
  initial: 'idle',
  on: { RESTART: 'idle' },
  states: {
    idle: { description: 'Before the round starts', on: { START: 'loading' } },
    loading: { description: 'The AI draws the styled image', on: { LOADED: 'playing', LOAD_FAILED: 'idle' } },
    playing: {
      description: 'The timer runs; the player picks one of four styles',
      on: { ANSWER: 'result', TIMEOUT: 'result' },
    },
    result: { description: 'Right style shown with the round score', on: { NEXT: 'idle', FINISH: 'over' } },
    over: { description: 'All rounds played; final score shown', final: true },
  },
})

import { defineMachine } from '../lib/machine.js'

export const spotTheFakeMachine = defineMachine({
  id: 'spot-the-fake',
  description: 'Spot the Fake, 5 rounds: find the one image made from a different prompt before the 20 second timer runs out.',
  initial: 'idle',
  on: { RESTART: 'idle' },
  states: {
    idle: { description: 'Before the round starts', on: { START: 'loading' } },
    loading: { description: 'The AI draws three real images and one fake', on: { LOADED: 'playing', LOAD_FAILED: 'idle' } },
    playing: {
      description: 'The timer runs; the player taps the image they think is fake',
      on: { ANSWER: 'result', TIMEOUT: 'result' },
    },
    result: { description: 'The fake and both prompts shown with the round score', on: { NEXT: 'idle', FINISH: 'over' } },
    over: { description: 'All rounds played; final score shown', final: true },
  },
})

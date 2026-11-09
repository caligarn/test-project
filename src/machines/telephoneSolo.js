import { defineMachine } from '../lib/machine.js'

export const telephoneSoloMachine = defineMachine({
  id: 'telephone-solo',
  description: 'Solo Telephone, 5 steps: the AI draws a secret prompt, the player describes each image, the judge compares the first and last image.',
  initial: 'idle',
  on: { RESTART: 'idle' },
  states: {
    idle: { description: 'Before the chain starts', on: { START: 'loading' } },
    loading: {
      description: 'The AI draws the secret prompt or the latest description',
      on: { DRAWN: 'describe', DRAWN_LAST: 'judging', START_FAILED: 'idle', DRAW_FAILED: 'describe' },
    },
    describe: { description: 'The player describes the latest image', on: { SUBMIT: 'loading' } },
    judging: { description: 'The AI judge compares the first and last image', on: { JUDGED: 'over' } },
    over: { description: 'Chain complete; score and the whole chain shown', final: true },
  },
})

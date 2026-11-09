import { defineMachine } from '../lib/machine.js'

export const promptGuesserMachine = defineMachine({
  id: 'prompt-guesser',
  description: 'Prompt Guesser, 5 rounds: guess the hidden prompt of an AI image; the guess is drawn and judged.',
  initial: 'idle',
  on: { RESTART: 'idle' },
  states: {
    idle: { description: 'Before the round starts', on: { START: 'loading-target' } },
    'loading-target': {
      description: 'The AI draws the mystery image from a hidden prompt',
      on: { LOADED: 'guessing', LOAD_FAILED: 'idle' },
    },
    guessing: { description: 'The player types a guess (a hint is optional)', on: { GUESS: 'drawing' } },
    drawing: {
      description: "The AI draws the player's guess",
      on: { DRAWN: 'judging', DRAW_FAILED: 'result' },
    },
    judging: { description: 'The AI judge compares the two images', on: { JUDGED: 'result' } },
    result: { description: 'Round score shown with the real prompt', on: { NEXT: 'idle', FINISH: 'over' } },
    over: { description: 'All rounds played; final score shown', final: true },
  },
})

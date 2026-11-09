import { defineMachine } from '../lib/machine.js'

// The shared phase of a Telephone party, moved only by the host's reducer
// (reduceParty in src/games/telephone/logic.js).
export const telephonePartyMachine = defineMachine({
  id: 'telephone-party',
  description: 'Telephone party (host side): chains rotate between players each step, then the host reveals them and everyone votes.',
  initial: 'lobby',
  on: { NEW_GAME: 'lobby' },
  states: {
    lobby: { description: 'Players join; the host starts with 2 or more', on: { START: 'play' } },
    play: {
      description: 'Each step, every player writes or describes the latest image of one chain',
      on: { ALL_PLAYED: 'reveal' },
    },
    reveal: { description: 'The host shows each chain, step by step', on: { START_VOTE: 'vote' } },
    vote: {
      description: 'Players vote for the funniest chain (not their own)',
      on: { ALL_VOTED: 'done', FINISH: 'done' },
    },
    done: { description: 'Scores shown; the host can play again', on: { START: 'play' } },
  },
})

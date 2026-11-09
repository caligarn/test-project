import { defineMachine } from '../lib/machine.js'

export const dailyMachine = defineMachine({
  id: 'daily',
  description: 'Daily Challenge: the same 5 images for everyone today, one guess each, then a summary and leaderboard. Logging in or out starts the flow over.',
  initial: 'loading',
  states: {
    loading: {
      description: "Getting today's images and this player's progress",
      on: { LOADED: 'guessing', LOADED_DONE: 'summary', LOAD_FAILED: 'loadFailed' },
    },
    loadFailed: { description: "Today's challenge could not be loaded", on: { RETRY: 'loading' } },
    guessing: {
      description: 'An unplayed image is shown; the player writes one guess',
      on: { SUBMIT: 'checking', VIEW: 'guessing', VIEW_PLAYED: 'result' },
    },
    checking: { description: 'The server scores the guess', on: { GUESSED: 'result', GUESS_FAILED: 'guessing' } },
    result: {
      description: 'The score and real prompt for one played image',
      on: { NEXT: 'guessing', SEE_SUMMARY: 'summary', VIEW: 'guessing', VIEW_PLAYED: 'result' },
    },
    summary: {
      description: "All 5 played: total, share text, and today's leaderboard",
      on: { VIEW_PLAYED: 'result' },
    },
  },
})

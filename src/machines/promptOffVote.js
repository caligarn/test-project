import { defineMachine } from '../lib/machine.js'

// An audience phone voting in a Prompt Off match (src/pages/VotePage.jsx, /vote/:code).
// Host messages become events: 'vote-data' -> VOTE_DATA, 'vote-results' -> RESULTS.
// The host re-sends vote-data when final images land: that only updates the
// pictures, it never takes back a cast vote.
export const promptOffVoteMachine = defineMachine({
  id: 'prompt-off-vote',
  description: 'Prompt Off audience vote on a phone: join the vote room, pick an image, see the results.',
  initial: 'connecting',
  states: {
    connecting: {
      description: 'Joining the host vote room; retries the link every 4 seconds, gives up after 15 seconds',
      on: { VOTE_DATA: 'voting', RESULTS: 'results', FAILED: 'error', ROOM_CLOSED: 'error' },
    },
    voting: {
      description: 'Both images shown; tap one to vote',
      on: { VOTE: 'voted', RESULTS: 'results', FAILED: 'error', ROOM_CLOSED: 'closed' },
    },
    voted: { description: 'Vote sent (one per phone); waiting for the host to reveal', on: { RESULTS: 'results', FAILED: 'error', ROOM_CLOSED: 'closed' } },
    results: { description: 'Winner and vote bars shown; kept even if the room closes', final: true },
    closed: { description: 'The room closed before the results', final: true },
    error: { description: 'Could not reach the vote room (bad code or network)', on: { RESULTS: 'results' } },
  },
})

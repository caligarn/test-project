import { defineMachine } from '../lib/machine.js'

// The shared phase of the "submit and vote" party engine (src/games/party/).
// Only the host moves it: the pure reducer in partyLogic.js calls
// transition(phase, EVENT) and ignores anything not listed here. Players see
// the host's phase through the synced room state (data-state on the party root).
export const submitVotePartyMachine = defineMachine({
  id: 'submit-vote-party',
  description:
    'Party round for Dream Caption and Emoji Prompt, run by the host: pick a challenge, everyone submits, everyone votes, results. Every device shows the same phase.',
  initial: 'lobby',
  states: {
    lobby: { description: 'Players join the room; the host starts the game', on: { START: 'pick' } },
    pick: { description: 'The host picks the challenge (a dream image or a scene)', on: { PICK: 'submit' } },
    submit: {
      description: 'Timer runs; each player makes an entry on their own device. Ends when all have submitted, the host skips, or time is up',
      on: { SUBMIT_ENTRY: 'submit', START_VOTE: 'vote', TALLY: 'results' },
    },
    vote: {
      description: 'Timer runs; each player votes for one entry that is not theirs. Ends when all have voted, the host skips, or time is up',
      on: { CAST_VOTE: 'vote', TALLY: 'results' },
    },
    results: { description: 'Round points and standings; the host moves on', on: { NEXT: 'pick', FINISH: 'final' } },
    final: { description: 'All rounds played; final standings. The host can play again', on: { START: 'pick' } },
  },
})

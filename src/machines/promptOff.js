import { defineMachine } from '../lib/machine.js'

// One Prompt Off device (src/games/PromptOffGame.jsx). Both players run their
// own copy. Local actions and PeerJS messages from the opponent become events
// (see the protocol in src/games/promptoff/constants.js):
//   'start'        -> HOST_STARTED      (guest)
//   'vote-results' -> RESULTS_RECEIVED  (guest)
//   'rematch'      -> REMATCH
// A late or repeated message is not listed in the current state, so it is
// ignored and never moves a device back (for example a second 'rematch'
// arriving after the host already started the next match).
export const promptOffMachine = defineMachine({
  id: 'prompt-off',
  description: 'Prompt Off duel: two players race 60 seconds to recreate a theme with live AI images, then the audience votes.',
  initial: 'lobby',
  // The room could not be created or joined, or the link broke for good.
  on: { FAILED: 'lobby' },
  states: {
    lobby: { description: 'Create a room or join one with a code', on: { CREATE: 'waiting', JOIN: 'waiting' } },
    waiting: {
      description: 'In the room: the host waits for an opponent and starts; the guest waits for the start',
      on: { START: 'countdown', HOST_STARTED: 'countdown', LEAVE: 'lobby', DISCONNECTED: 'lobby' },
    },
    countdown: { description: '3, 2, 1 before the round (follows the host clock)', on: { COUNTDOWN_DONE: 'playing', DISCONNECTED: 'lobby' } },
    playing: {
      description: 'The 60 second round: type and sketch, live previews on both screens',
      on: { SUBMIT: 'generating', TIME_UP: 'generating', DISCONNECTED: 'lobby' },
    },
    generating: {
      description: 'The final image is made; waiting for both finals (at most 15 seconds)',
      on: { OPEN_VOTING: 'voting', RESULTS_RECEIVED: 'results' },
    },
    voting: {
      description: 'The audience votes from their phones; the host closes voting',
      on: { CLOSE_VOTING: 'results', RESULTS_RECEIVED: 'results' },
    },
    results: { description: 'Votes revealed and the match scored; either player can ask for a rematch', on: { REMATCH: 'waiting' } },
  },
})

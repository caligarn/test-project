import { defineMachine } from '../lib/machine.js'

// The PeerJS link between the two Prompt Off players
// (src/games/promptoff/useDuelConnection.js). The match itself is promptOff.js.
export const duelLinkMachine = defineMachine({
  id: 'prompt-off-link',
  description: 'Prompt Off player link over PeerJS: the host opens a room, the guest joins it, one opponent at a time.',
  initial: 'idle',
  // create() and join() always start a fresh session; leave() or a failure ends it.
  on: { CREATE: 'hosting', JOIN: 'joining', LEAVE: 'idle', FAILED: 'idle' },
  states: {
    idle: { description: 'No session (the lobby); a failure message may be shown' },
    hosting: { description: 'Host: the room code is open, waiting for an opponent', on: { OPENED: 'connected' } },
    joining: { description: 'Guest: connecting to the room code (gives up after 10 seconds)', on: { OPENED: 'connected' } },
    connected: {
      description: 'Both players are linked and can send messages',
      on: { OPPONENT_LEFT: 'hosting', HOST_LEFT: 'closed' },
    },
    closed: { description: 'Guest: the host left; the game ends the session or keeps showing the results' },
  },
})

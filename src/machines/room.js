import { defineMachine } from '../lib/machine.js'

// Connection lifecycle of a party room (src/hooks/usePeerRoom.js), on every device.
export const roomMachine = defineMachine({
  id: 'party-room',
  description: 'Party room connection over PeerJS: create or join, play, leave.',
  initial: 'idle',
  on: { LEAVE: 'idle' },
  states: {
    idle: { description: 'Not in a room: create one or join with a code', on: { CREATE: 'connecting', JOIN: 'connecting' } },
    connecting: {
      description: 'Opening the room, or joining the host',
      on: { OPENED: 'open', FAILED: 'error', CREATE: 'connecting' },
    },
    open: { description: 'In the room (lobby or playing)', on: { HOST_LEFT: 'closed', FAILED: 'error' } },
    closed: { description: 'The host left; the player can create or join again', on: { CREATE: 'connecting', JOIN: 'connecting' } },
    error: { description: 'Could not open or join (bad code, full room, network)', on: { CREATE: 'connecting', JOIN: 'connecting' } },
  },
})

import { defineMachine } from '../lib/machine.js'

// Login session (src/context/AuthContext.jsx). Also shown as <html data-session="...">.
export const sessionMachine = defineMachine({
  id: 'session',
  description: 'Who is playing: checking a saved login, a guest, or a signed-in player.',
  initial: 'checking',
  states: {
    checking: { description: 'A saved login exists; asking the server if it is still valid', on: { SIGNED_IN: 'signed-in', SIGNED_OUT: 'guest' } },
    guest: { description: 'Playing without an account', on: { SIGNED_IN: 'signed-in' } },
    'signed-in': { description: 'Logged in; scores go to the shared leaderboards', on: { SIGNED_IN: 'signed-in', SIGNED_OUT: 'guest' } },
  },
})

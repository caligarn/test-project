import { defineMachine } from '../lib/machine.js'

// The "spend a credit?" dialog (src/context/CreditContext.jsx).
export const creditDialogMachine = defineMachine({
  id: 'credit-dialog',
  description: 'Asks the player before a game spends a credit, or says they are out of credits.',
  initial: 'closed',
  states: {
    closed: { description: 'No dialog', on: { ASK: 'asking', ASK_EMPTY: 'out-of-credits' } },
    asking: { description: '"Use 1 credit?" with Use / Not now', on: { ACCEPT: 'closed', DECLINE: 'closed' } },
    'out-of-credits': { description: 'No credits left: links to the credits page', on: { CLOSE: 'closed' } },
  },
})

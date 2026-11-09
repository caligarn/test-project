import { defineMachine } from '../lib/machine.js'

// One player's turn in a Telephone party, on their own device. Which turn is
// mine (and whether I already played) comes from the shared party state; this
// machine only covers the local steps while I write and my image is drawn.
export const telephoneTurnMachine = defineMachine({
  id: 'telephone-turn',
  description: 'My Telephone party turn on this device: write, the AI draws it, then it goes to the host.',
  initial: 'edit',
  states: {
    edit: { description: 'Writing a starting prompt or describing the image', on: { SUBMIT: 'drawing' } },
    drawing: { description: 'The AI draws my words', on: { DRAWN: 'sent', DRAW_FAILED: 'edit' } },
    sent: {
      description: 'Sent to the host; the panel closes when the shared state shows my turn',
      final: true,
    },
  },
})

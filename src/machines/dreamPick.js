import { defineMachine } from '../lib/machine.js'

// Dream Caption party, host only: make the dream image for the round.
// Choosing it ("Start captions") is the shared PICK in submitVoteParty.js.
export const dreamPickMachine = defineMachine({
  id: 'dream-pick',
  description: 'Dream Caption party, host only: make a dream image for everyone to caption, or try a new one.',
  initial: 'empty',
  states: {
    empty: { description: 'No image yet; the host asks for one', on: { GENERATE: 'generating' } },
    generating: { description: 'The AI draws the first dream image', on: { DREAMED: 'ready', FAILED: 'empty' } },
    ready: { description: 'The host sees the image: start captions with it, or ask for a new one', on: { GENERATE: 'regenerating' } },
    regenerating: { description: 'The AI draws a new image; the old one stays if this fails', on: { DREAMED: 'ready', FAILED: 'ready' } },
  },
})

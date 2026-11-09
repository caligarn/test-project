import { defineMachine } from '../lib/machine.js'

export const communityComicMachine = defineMachine({
  id: 'community-comic',
  description: 'Community Comic: read the shared comic, write the next panel, the AI draws it and it joins the story.',
  initial: 'reading',
  states: {
    reading: { description: 'Browsing the shared comic pages', on: { OPEN: 'writing' } },
    writing: {
      description: 'The add-panel form is open; the player writes what happens next',
      on: { OPEN: 'writing', CLOSE: 'reading', SUBMIT: 'drawing' },
    },
    drawing: { description: 'The AI draws the panel from the text and the last panels', on: { DRAWN: 'adding', DRAW_FAILED: 'writing' } },
    adding: { description: 'The panel is added to the shared comic', on: { ADDED: 'reading', ADD_FAILED: 'writing' } },
  },
})

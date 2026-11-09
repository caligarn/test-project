import { defineMachine } from '../lib/machine.js'

export const haikuCanvasMachine = defineMachine({
  id: 'haiku-canvas',
  description: 'Haiku Canvas: write a 5-7-5 haiku, the AI paints it, then it is shared to the gallery. Repeats with no end.',
  initial: 'writing',
  states: {
    writing: { description: 'The player writes three lines and picks an art style', on: { SUBMIT: 'painting' } },
    painting: { description: 'The AI paints the haiku', on: { PAINTED: 'sharing', PAINT_FAILED: 'writing' } },
    sharing: {
      description: 'The painted haiku is added to the shared gallery (it scores even if this fails)',
      on: { SHARED: 'writing', SHARE_FAILED: 'writing' },
    },
  },
})

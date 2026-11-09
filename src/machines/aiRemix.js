import { defineMachine } from '../lib/machine.js'

export const aiRemixMachine = defineMachine({
  id: 'ai-remix',
  description: 'AI Remix: pick a starting image, then make 5 changes; the AI edits the image and the judge scores each change.',
  initial: 'start',
  on: { RESTART: 'start' },
  states: {
    start: { description: 'The player picks or writes a starting prompt', on: { START: 'loading' } },
    loading: { description: 'The AI draws the starting image', on: { LOADED: 'remix', LOAD_FAILED: 'start' } },
    remix: { description: 'The player types the next change', on: { SUBMIT: 'editing' } },
    editing: {
      description: 'The AI edits the current image',
      on: { EDITED: 'judging', EDIT_FAILED: 'remix' },
    },
    judging: {
      description: 'The AI judge scores how well the change came through',
      on: { JUDGED: 'remix', FINISH: 'over' },
    },
    over: { description: 'All changes made; the chain and final score shown', final: true },
  },
})

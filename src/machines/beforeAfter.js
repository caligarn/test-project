import { defineMachine } from '../lib/machine.js'

export const beforeAfterMachine = defineMachine({
  id: 'before-after',
  description: 'Before & After, endless: the AI edits a scene with a chosen transformation and the judge scores it. Each round is saved and shared.',
  initial: 'idle',
  states: {
    idle: {
      description: 'Before the first scene',
      on: { NEW_SCENE: 'generating-before', REUSE_SCENE: 'pick' },
    },
    'generating-before': {
      description: 'The AI paints the "before" scene',
      on: { SCENE_READY: 'pick', SCENE_FAILED: 'idle' },
    },
    pick: {
      description: 'The player picks or types a transformation (or asks for a different scene)',
      on: { APPLY: 'generating-after', NEW_SCENE: 'generating-before', REUSE_SCENE: 'pick' },
    },
    'generating-after': {
      description: 'The AI edits the "before" image with the transformation',
      on: { EDITED: 'judging', EDIT_FAILED: 'pick' },
    },
    judging: { description: 'The AI judge scores the change', on: { JUDGED: 'result' } },
    result: {
      description: 'Before and after side by side with the score; the entry goes to the shared gallery',
      on: { SAME_SCENE: 'pick', NEW_SCENE: 'generating-before', REUSE_SCENE: 'pick' },
    },
  },
})

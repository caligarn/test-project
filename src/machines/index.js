// Every game and app flow, as data. One file per machine in this folder.
// Add new machines here: tests validate them and `npm run docs:machines`
// draws them in docs/state-machines.md.
// Machine files run in Node too (docs, tests): always import with the .js extension.

// App
import { sessionMachine } from './session.js'
import { creditDialogMachine } from './creditDialog.js'
import { roomMachine } from './room.js'

// Games
import { speedPromptMachine } from './speedPrompt.js'

export const MACHINES = [
  sessionMachine,
  creditDialogMachine,
  roomMachine,
  speedPromptMachine,
]

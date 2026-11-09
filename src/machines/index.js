// Every game and app flow, as data. One file per machine in this folder.
// Add new machines here: tests validate them and `npm run docs:machines`
// draws them in docs/state-machines.md.
// Machine files run in Node too (docs, tests): always import with the .js extension.

// App
import { sessionMachine } from './session.js'
import { creditDialogMachine } from './creditDialog.js'
import { roomMachine } from './room.js'

// Round games (solo)
import { promptGuesserMachine } from './promptGuesser.js'
import { speedPromptMachine } from './speedPrompt.js'
import { styleRouletteMachine } from './styleRoulette.js'
import { spotTheFakeMachine } from './spotTheFake.js'
import { aiRemixMachine } from './aiRemix.js'
import { beforeAfterMachine } from './beforeAfter.js'
import { dreamCaptionMachine } from './dreamCaption.js'
import { emojiPromptMachine } from './emojiPrompt.js'
import { telephoneSoloMachine } from './telephoneSolo.js'
import { dailyMachine } from './daily.js'

// Shared canvases and galleries
import { haikuCanvasMachine } from './haikuCanvas.js'
import { communityComicMachine } from './communityComic.js'
import { infinimapMachine } from './infinimap.js'

// Party modes (host-side shared phase, plus per-device steps)
import { submitVotePartyMachine } from './submitVoteParty.js'
import { partyEntryMachine } from './partyEntry.js'
import { dreamPickMachine } from './dreamPick.js'
import { telephonePartyMachine } from './telephoneParty.js'
import { telephoneTurnMachine } from './telephoneTurn.js'

// Prompt Off (two players + audience)
import { promptOffMachine } from './promptOff.js'
import { duelLinkMachine } from './duelLink.js'
import { promptOffVoteMachine } from './promptOffVote.js'

export const MACHINES = [
  sessionMachine,
  creditDialogMachine,
  roomMachine,
  promptGuesserMachine,
  speedPromptMachine,
  styleRouletteMachine,
  spotTheFakeMachine,
  aiRemixMachine,
  beforeAfterMachine,
  dreamCaptionMachine,
  emojiPromptMachine,
  telephoneSoloMachine,
  dailyMachine,
  haikuCanvasMachine,
  communityComicMachine,
  infinimapMachine,
  submitVotePartyMachine,
  partyEntryMachine,
  dreamPickMachine,
  telephonePartyMachine,
  telephoneTurnMachine,
  promptOffMachine,
  duelLinkMachine,
  promptOffVoteMachine,
]

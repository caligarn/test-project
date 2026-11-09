import { defineMachine } from '../lib/machine.js'

// One player's own entry in a party round (CaptionComposer, PartyEmojiSubmit),
// on their own device. The shared phase is submitVoteParty.js.
export const partyEntryMachine = defineMachine({
  id: 'party-entry',
  description: "A player's entry in a party round, on their own device: write it, run the AI calls, send it to the host.",
  initial: 'composing',
  states: {
    composing: { description: 'The player writes a caption or picks emojis', on: { SEND: 'sending' } },
    sending: { description: 'The AI calls run on this device (image and judge)', on: { SENT: 'sent', SEND_FAILED: 'composing' } },
    sent: { description: 'Entry sent to the host; the party screen shows Submitted', final: true },
  },
})

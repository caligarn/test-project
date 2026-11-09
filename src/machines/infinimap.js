import { defineMachine } from '../lib/machine.js'

// The player's step on the shared map. Painting itself runs in the
// background (up to 3 tiles at once, tracked as data), so the player can keep
// browsing and start another tile while earlier ones paint.
export const infinimapMachine = defineMachine({
  id: 'infinimap',
  description: 'Infini-Map: one shared map; tap an empty tile, write a prompt, the AI paints it in the background.',
  initial: 'loading',
  states: {
    loading: { description: 'First load of the shared map', on: { LOADED: 'browsing' } },
    browsing: {
      description: 'Panning the map; painted tiles can be inspected; tiles may be painting in the background',
      on: { COMPOSE: 'composing', TAKEN: 'taken' },
    },
    composing: {
      description: 'The prompt dialog for one empty tile is open',
      on: { CANCEL: 'browsing', PAINT: 'browsing' },
    },
    taken: {
      description: 'Someone took the tile while our art was painting: offer to place the art nearby',
      on: { PLACE: 'placing', DISMISS: 'browsing', COMPOSE: 'composing', TAKEN: 'taken' },
    },
    placing: {
      description: 'Placing the leftover art on the nearest free tile',
      on: { PLACED: 'browsing', NO_SPOT: 'browsing', PLACE_FAILED: 'taken' },
    },
  },
})

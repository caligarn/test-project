# Guide for coding agents (and humans)

Gen Arcade: AI image party games. React 19 + Vite, one Vercel function for the API.
Read `README.md` for setup and architecture.

## Commands
- `npm run dev`: app + API on http://localhost:5173 (demo images, in-memory data)
- `npm test`: all tests (vitest). `npm run lint`. `npm run build`.
- `npm run docs:machines`: regenerate `docs/state-machines.md` after changing a machine

## Game and app flows are state machines
- Every multi-step flow is a machine in `src/machines/` (one file each, listed in
  `src/machines/index.js`). `docs/state-machines.md` shows them as diagrams.
- Components run them with `useMachine` (`src/hooks/useMachine.js`):
  `flow.send('SUBMIT')` returns `false` when the event is not allowed now.
  Do not add `useState('phase')`, `isSubmitting` refs, or similar flags for flow:
  add a state or an event to the machine instead.
- To change a flow: edit the machine file, then the component, then run
  `npm run docs:machines` and `npm test`. Tests check every state is reachable,
  has a description, and is not a dead end (unless marked `final`).
- Machine files are imported by Node scripts: import with the `.js` extension.

## Driving the app (tests, browser agents)
- Each game root has `data-machine="<id>"` and `data-state="<state>"`.
  Wait on state, not on text: `page.waitForSelector('[data-machine="speed-prompt"][data-state="result"]')`.
- In development, `window.__GEN_ARCADE_MACHINES__[id]` shows `state`, `allowed`
  events, and the last transitions (`history`).
- The first AI call in a game opens a "Use 1 credit" dialog. Set
  `localStorage.gen_arcade_autospend = '1'` to skip it in automated runs.

## Rules
- The fal.ai key stays on the server (`server/`). Never call fal.ai from the browser.
- AI calls go through `src/lib/fal.js`; they need a play ticket (handled automatically).
- Keep UI text short and plain. No em dashes.

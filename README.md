# Gen Arcade

AI image party games for groups and live events, by Machine Cinema.
Players write prompts, sketch, caption, and guess. An image model draws, and an
AI judge scores the results. Many games have a party mode: friends join a room
from their phones with a code or a QR code.

## Games

| Game | Solo | Party | How it scores |
|---|---|---|---|
| Daily Challenge | yes | | Same 5 images for everyone each day, one guess each, scored on the server, daily leaderboard |
| Prompt Off | | 2 players + audience | Live sketch-to-image battle, the audience votes by QR code |
| Prompt Guesser | yes | | Words of the hidden prompt you found + how close the image drawn from your guess looks (AI judge) |
| Speed Prompt | yes | | AI judge: does your image show the concept, plus a small speed bonus |
| Style Roulette | yes | | Pick the art style, time and streak bonus |
| Spot the Fake | yes | | Find the image from a different prompt, time and streak bonus |
| Dream Caption | yes | yes | Solo: AI judge rates your caption. Party: players vote |
| Emoji Prompt | yes | yes | Solo: AI judge checks the emoji image shows the scene. Party: players vote |
| Telephone | yes | yes | Solo: secret start prompt, AI judge measures the drift. Party: chains rotate between players |
| AI Remix | yes | | Real image edits, AI judge rates each change |
| Before & After | yes | | Real image edit of a scene, AI judge, shared gallery |
| Haiku Canvas | yes | | 5-7-5 haiku becomes art, shared gallery with votes |
| Infini-Map | yes | | One shared canvas for everyone, tile by tile |
| Community Comic | yes | | One shared comic strip, panel by panel |

Pixel Duel was merged into Prompt Guesser, and Mosaic Maker into Infini-Map.
Their old links redirect.

## How it works

```
Browser (React + Vite)                 Server (one Vercel function: api/router.js)
---------------------------            -----------------------------------------------
src/lib/fal.js  -- /api/generate --->  server/fal.js    fal.ai calls, key stays here
                -- /api/edit
                -- /api/judge ------>  server/judge.js  vision model scores 0-100
src/lib/play.js -- /api/play/start ->  server/economy.js credits, play tickets, rate limits
src/lib/api.js  -- /api/auth, /scores, /leaderboard, /gallery, /tiles, /daily
                                       server/store.js  Upstash Redis (or memory locally)
src/hooks/usePeerRoom.js  <-- PeerJS (WebRTC) -->  other players' browsers
```

- **The fal.ai key never reaches the browser.** All AI calls go through `/api`.
- **Credits are real.** One credit buys a "play ticket" for one game. Each AI image
  or judge call uses units from the ticket (limits per game in
  `src/lib/gameLimits.js`), so a credit has a fixed, small cost. Players get free
  credits every day. The server also limits calls per IP per minute and per day for
  the whole site, to protect the bill.
- **Accounts are on the server.** Passwords are hashed with scrypt. Sessions are
  signed tokens. Old browser-only accounts move to the server on the first login.
- **Guests can play.** Each guest browser gets its own free credits (so a room of
  guests on one event Wi-Fi works), with a per-network cap. Logging in puts scores
  on the shared leaderboards.
- **Leaderboards, galleries, votes, and the Infini-Map are shared** by all players.
- **Party modes** use a host-authoritative room over PeerJS. The host's browser
  keeps the game state. Each player makes their own AI calls with their own credit.
- **Demo mode:** without `FAL_KEY`, the server returns placeholder images and a
  simulated judge, and the site shows a banner. Good for testing everything else
  without spending credit.

## Game flows (state machines)

Every multi-step flow (each game, the party room, the credit dialog, the login
session) is a small state machine in `src/machines/`, drawn in
[docs/state-machines.md](docs/state-machines.md). Components run them with
`useMachine`, and each game root carries `data-machine` and `data-state`
attributes, so tests and browser agents can wait for a state. See
[AGENTS.md](AGENTS.md) for the rules.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. With no `.env.local`, images are mocked and data is
kept in memory (it resets when the dev server restarts). Mock images show their
prompt as text, so guessing games are easy in mock mode. To use real images, copy
`.env.example` to `.env.local` and set `FAL_KEY`.

To test party modes on one machine, two browser windows (or a normal and a
private window) can join the same room.

```bash
npm test         # server, logic, and state machine tests (vitest)
npm run docs:machines   # redraw docs/state-machines.md after changing a machine
npm run lint
npm run build
```

## Deploy (Vercel)

**Minimum:** in Vercel, add **Upstash for Redis** from the Marketplace to the
project (it sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`), then redeploy. That
is enough for logins, credits, leaderboards, galleries, and party modes.

**Real AI images:** also set `FAL_KEY`. Without it the site runs in **demo mode**:
images are placeholders that show the prompt as text, the AI judge is simulated,
and a banner at the top says so.

Optional settings are in `.env.example`. `vercel.json` sends every `/api/*` path
to the single function `api/router.js` and every other path to the app.

Check `/api/health` after a deploy: it shows if the key and the store are set.

### Payments (optional)

Credit packs work with Stripe Payment Links. Set the `VITE_STRIPE_PACK_*` links,
`STRIPE_SECRET_KEY`, and `STRIPE_CREDITS_BY_LINK`, and add a Stripe webhook to
`https://<your-site>/api/stripe/webhook` for `checkout.session.completed`. The
server fetches each event from Stripe to verify it, then adds the credits once.
Monthly plans (Pro, Team) are not handled yet, so leave their links empty: the
page shows "Coming soon". Redeem codes (`REDEEM_CODES`) work without Stripe.

### Party modes and PeerJS

Party modes connect browsers directly with WebRTC. By default they use the free
PeerJS cloud server to find each other. For important events, run your own
PeerJS server and set the `VITE_PEER_*` variables.

### Security note

An older version of this repository had a fal.ai key in `src/lib/fal.js`. That key
is still in the git history. **Revoke it in the fal.ai dashboard** and use a new key
only as the `FAL_KEY` environment variable.

## Project layout

```
api/router.js            Vercel entry (all /api routes)
server/                  API: routes, fal.ai, judge, auth, credits, store, mock images
src/games/               one component per game
src/games/party/         shared "submit and vote" party engine (Dream Caption, Emoji Prompt)
src/games/telephone/     Telephone solo and party
src/games/promptoff/     Prompt Off networking, live generation, voting, views
src/hooks/               useGameRounds, useRoundTimer, usePeerRoom, useSharedGallery
src/lib/                 api client, fal.js (AI helpers), play tickets, game data
src/context/             AuthContext (accounts), CreditContext (credits + confirm dialog)
tests/                   vitest tests for the API and shared logic
```

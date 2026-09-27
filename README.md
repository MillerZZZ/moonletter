# MoonLetter × Photon — real backend for the teammate's pixel-art frontend

This backend now powers **her** actual UI (`frontend/`), not the
earlier from-scratch garden mockup (archived in `_legacy/`). It mirrors the
*real* logic already in her `app.js` — message count, water level, streak,
biosphere level, first-message oak sprout, 100-message Mother Tree — not the
more ambitious `backend_requirements.md` wishlist (no LLM calls, no 20-message
time capsules; those were intentionally left out per team discussion).

## What's real vs. simulated

- **Real**: every field on screen (`messageCount`, `waterLevel`, `streakDays`,
  `biosphereLevel`, whether the oak/mother tree have sprouted) lives in
  `src/oasis-state.ts`, fed by actual Spectrum messages.
- **Still frontend-only, untouched**: the `W1`–`W4` week tabs are fixed,
  hard-coded preview snapshots (`loadTemporalWeekSnapshot`) — they're a
  "what would week 4 look like" browsing feature, not real history, and
  don't touch the backend. Per-tree "levels" beyond the oak/mother tree
  (`cherry_01`, `willow_01`) are also cosmetic and only appear in those
  snapshots or via the demo buttons' flourish code — the backend only
  tracks the two trees that actually spawn from real activity.

## Setup

```bash
bun install
cp .env.example .env   # paste PROJECT_ID / PROJECT_SECRET (promo code HACKWITHPHOTON)
bun run dev
```

Open `http://localhost:3000` — that's her actual frontend now, served
straight out of `frontend/`.

## How her UI is wired to the backend

Every control in the "Demo Control Suite" panel now calls a real endpoint
instead of mutating a local mock `state` object:

| Button (as labeled in the UI)       | Endpoint                        |
| ------------------------------------ | -------------------------------- |
| Typing in the chat box + Send        | `POST /api/oasis/message`        |
| 💬 Send 1st iMessage                  | `POST /api/oasis/message` (x1)   |
| ⚡ Spread Moss (+10 Msgs)             | `POST /api/oasis/message` (x10)  |
| 💧 Water & Nurture Trees              | `POST /api/oasis/water`          |
| ⌛ Simulate 2 Days Inactivity          | `POST /api/oasis/demo/inactivity`|
| 💥 100-Msg Mother Tree                | `POST /api/oasis/demo/milestone` |
| 🌧️ Rain: Active (toggle)             | `POST /api/oasis/rain/toggle`    |
| 💧 Water Tree (inside tree modal)     | `POST /api/oasis/water`          |
| 🌱 Start Day 1                        | frontend-only (`loadDay1Mode`)   |

The page also polls `GET /api/oasis/state` every 2 seconds, so it picks up
real incoming Spectrum messages (or wilt/decay ticking down) even if you
never touch a button — same mechanism as before, just against the new
field names.

`src/oasis-state.ts` exports `getMilestoneTarget()`/`getMilestoneProgressPercent()`
copied verbatim from her `app.js` math, so the header badge never disagrees
with the backend.

## Photon speaking up in the real chat

Same idea as before, simplified to match the two real milestones her UI has:

- First message → "🌱 First seed planted on the moon!"
- Message 100 → "🎆 100-message milestone unlocked!"
- Water < 50% (idle too long) → one gentle "🍂 trees dropping leaves" nudge

These fire through `oasisEvents` in `src/oasis-state.ts` and get sent via
`space.send(text(...))` in `src/server.ts` — text only for now, no image;
the earlier PNG-rendering code (`_legacy/render-garden.ts`) was built around
the old generic SVG scene and doesn't match her pixel art, so it's parked
until/unless you want to export art assets to rasterize server-side.

## Switching to iMessage later

Same two-line swap as before, in `src/server.ts`:

```ts
// before
import { terminal } from "spectrum-ts/providers/terminal";
providers: [terminal.config()],

// after
import { imessage } from "spectrum-ts/providers/imessage";
providers: [imessage.config()],
```

## Files

- `src/oasis-state.ts` — the real state + the `oasisEvents` emitter.
- `src/server.ts` — Spectrum wiring, the API above, and static-serves `frontend/`.
- `frontend/` — her actual frontend (`index.html`, `style.css`,
  `app.js`), with `app.js` patched at each state-mutation point to call the
  API instead of doing local arithmetic. Every rendering/animation function
  of hers (`renderTreeElement`, `openTimeCapsuleModal`, critters, leaves,
  week snapshots, etc.) is untouched.
- `_legacy/` — the earlier from-scratch SVG garden (backend + two frontend
  variants). Kept for reference / as a fallback demo if the real integration
  ever misbehaves on stage, but no longer what `server.ts` serves.

## Known gaps / things to test on a real run

I haven't run this against Photon's real servers or in a real browser (no
network in the environment I built this in), so before you rely on it:

1. Confirm `message.content.type === "text"` / `message.content.text` /
   `message.sender.id` are actually the right fields for the terminal (and
   later iMessage) provider — that's from the docs, not a live test.
2. Confirm CORS + same-origin polling actually behaves in a real browser
   tab (it should, since everything is served from `localhost:3000`, but
   worth a two-minute sanity check).
3. `streakDays` uses UTC day boundaries — fine for a demo, but say so if a
   judge asks and it's midnight-adjacent.

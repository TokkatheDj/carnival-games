# Carnival Games — Maintenance Log

Running history of maintenance/work passes on this app. Append a new dated entry under
"Log" each time — don't rewrite history.

## Site

Deployed to Netlify site `5ee72b01-816b-465a-a3cb-118bbba48e67` (see `.netlify/state.json`).
NOTE: this app was not present in the top-level project SITE MAP as of 2026-06-23 — add it
there. Confirm the live URL via the Netlify dashboard.

## Stack — React-style Vite build (Phaser + TypeScript)

This is a **Vite + Phaser 3 + TypeScript** app, NOT plain static HTML/JS:
- `src/main.ts` is the entry; scenes live in `src/scenes/` (a `HubScene` + 7 mini-game
  scenes: WhackAMole, RingToss, Basketball, Slots, GuessNumber, SpinWheel), with
  `src/ui/`, `src/audio/`, `src/config/` (theme + gameRegistry).
- `index.html` at the project root is the Vite dev-server entry (references
  `/src/main.ts`) — it is NOT what gets deployed.
- `dist/` is the build output (`dist/index.html` + hashed `dist/assets/*.js`) and is what
  Netlify serves.
- `package.json` scripts: `npm run dev` (vite --host), `npm run build` (`tsc -b && vite
  build` — typechecks before bundling, so a build can fail on type errors), `npm run
  preview`.

Deploy: run `npm run build` first, then `netlify deploy --prod --dir=dist` — do NOT
`--dir=.` from the project root.

## Log

### 2026-06-23 — portfolio review (static, partial)
- Discovered this app is not listed in the top-level project SITE MAP and had no
  MAINTENANCE.md; created this file.
- Found the cached `.netlify/netlify.toml` recorded `publish =
  "C:\Users\Lance\Projects\carnival-games\dist"` — a path that does not exist on the
  current G:\ drive (same class of stale-base-path quirk seen elsewhere in the portfolio).
  Repointed the local cache to `G:\My Drive\Netlify Apps\carnival-games\dist`. NOTE: this
  app's toml has `publishOrigin = "ui"` / `commandOrigin = "ui"`, suggesting the real
  Netlify site may have build settings configured in the UI — this was NOT verified against
  the remote (`netlify api getSite`) because the CLI/shell was unavailable this session.
- Flagged for cleanup: `node_modules/` and a `.git/` folder are both syncing to Google
  Drive under this app — significant bloat; should be excluded from Drive sync.
- NOT verified this session (sandbox shell failed to boot): production build and `dist/`
  freshness vs `src/` via an actual build.

### 2026-06-23 — live browser check (BLOCKER found)
- Resolved the real site via the Netlify dashboard: project **carnival-games-119**, live at
  https://carnival-games-119.netlify.app, and it **"Deploys from GitHub"** (every other app
  in the portfolio deploys from the CLI). So this app's source of truth is a GitHub repo,
  NOT necessarily this G:\ folder — they have diverged (see next point).
- `carnival-games.netlify.app` (the obvious-guess URL) is a DIFFERENT, unrelated placeholder
  site ("click the button and you win $1,000,000,000,000") — not this app. Ignore it.
- BLOCKER: the live site is **stuck on its loading splash** ("🎪 Carnival Games 🎪") and
  never reaches the game hub — waited ~13s and tapped the canvas, no transition, no console
  errors (Phaser v3.90.0 inits fine: "WebGL | Web Audio"). Effectively unplayable as
  deployed.
- Drift confirmed: live bundle is `assets/index-CWSRU2Zv.js` with an HTML loading splash;
  local `dist/` is `assets/index-BDres01P.js` with NO splash (`dist/index.html` is just
  `<div id="app">`). Local `dist/` is stale and structurally different from production.
- Local `src/scenes/BootScene.ts` transitions to HubScene after a 900ms `delayedCall`, so a
  build from THIS folder's source would not get stuck the way production does — reinforcing
  that the deployed GitHub build differs from this folder. Root-cause needs a local
  build+run of the actual deployed source (blocked this session: shell down).

### 2026-06-23 — CORRECTION: not a blocker (root-caused with a real build)
- Got a working shell (Desktop Commander) and re-investigated. Prior "BLOCKER" was a
  FALSE ALARM caused by the test environment, not a real bug.
- Source of truth = the GitHub repo **TokkatheDj/carnival-games** (`origin/master`). The
  local `G:\` folder is IN SYNC with it (HEAD `9f623ee`; only untracked file is this
  MAINTENANCE.md). NOT diverged — my earlier "stale/diverged dist" was just a leftover old
  build artifact in `dist/`.
- Ran `npm run build` locally → it reproduced the EXACT production bundle
  `assets/index-CWSRU2Zv.js` (same hash as live), build exit 0. So local source == deployed.
- Rendered the live site headless via Playwright (Chromium): it reaches the **HubScene**
  correctly — all 6 game tiles (Basketball Hoops, Carnival Spin Reels, Guess the Number,
  Ring Toss, Critter Boop, Prize Wheel), mute button, carnival lights; no page errors (only
  benign WebGL perf warnings). Screenshot saved during the audit.
- The "stuck on the loading title" seen through the Chrome extension is an automation
  artifact: `BootScene` transitions to `HubScene` via `this.time.delayedCall(900, ...)`,
  which is driven by Phaser's requestAnimationFrame loop. A tab that isn't actively
  rendered (headless/extension-controlled, backgrounded) has its rAF loop throttled/paused,
  so the boot timer never elapses and the title's alpha tween stays half-faded — exactly
  what was observed. Real users on a normal foreground tab are unaffected.
- Net: no code fix required. RECOMMENDED: a quick real-device (phone/tablet) sanity check
  to be 100% sure. OPTIONAL hardening: make the Boot→Hub transition not depend solely on a
  timed delay (e.g., advance on first update tick / font-ready) so it can't stall even in
  exotic throttled conditions — not applied, since it changes working code.
- Cleanup still recommended: `node_modules/` and `.git/` are syncing to Google Drive under
  this folder (bloat) — exclude them from Drive sync.

### 2026-06-23 — Boot hardening applied & deployed
- Applied the optional hardening to `src/scenes/BootScene.ts`: the Boot→Hub transition now
  fires from both Phaser's `time.delayedCall(900)` AND a `window.setTimeout(go, 1600)`
  wall-clock fallback (guarded so it only starts once), so it advances even if the rAF game
  loop is throttled/paused.
- Local `npm run build` exit 0 (new bundle `index-CkQMOFy-.js`); served the built dist
  locally via Playwright → hub renders, no page errors.
- Committed (`62a4f04`) and pushed to `origin/master`; Netlify CD rebuilt and deployed.
  Verified live: `carnival-games-119.netlify.app` now serves `index-CkQMOFy-.js`, hub
  renders, no page errors.

# Carnival Games

[![CI](https://github.com/TokkatheDj/carnival-games/actions/workflows/ci.yml/badge.svg)](https://github.com/TokkatheDj/carnival-games/actions/workflows/ci.yml)

Seven carnival mini-games for kids, made for tablets: big touch targets, bright colours, and sound effects made in code (no audio files).

**Play:** https://play-carnival.netlify.app. On a tablet, *Add to Home Screen* installs it like an app.

## The games

- 🏀 **Basketball Hoops**: tap where you want the ball to go, with an arc to aim and moving blockers
- 🎰 **Carnival Spin Reels**: spin for a match
- 🔮 **Guess the Number**: adjustable range and number of tries, plus an optional card helper that crosses off ruled-out numbers
- 🎯 **Ring Toss**: tap a peg to toss the ring
- 🐹 **Critter Boop**: whack-a-mole with difficulty levels and up to 12 holes
- 🎡 **Prize Wheel**
- 🦆 **Duck Gallery**

Every game has the same 🏠 home and 🔊 sound buttons in the same corners, so a child never has to hunt for the way out.

## How it's built

- [Phaser 3](https://phaser.io) + TypeScript, bundled with Vite
- One scene per game (`src/scenes/games/`), all extending `BaseScene`, which adds the shared home and sound buttons
- The hub picks its own grid for the screen: it tries 2 to 5 columns, keeps whichever gives the biggest tiles, and centres a short last row
- Sound effects are synthesised with the Web Audio API (`src/audio/`)
- Installable PWA: `public/manifest.json` and a small service worker (`public/sw.js`, network-first for pages so updates arrive straight away)

## Run it

```bash
npm install
npm run dev       # dev server, also reachable from a tablet on the same Wi-Fi
npm run build     # typecheck, then build to dist/
npm run preview
```

Netlify builds and deploys every push to `master` (`netlify.toml`: `npm run build`, publish `dist`).

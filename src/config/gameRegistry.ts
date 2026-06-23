import { PALETTE } from "./theme";

export interface GameDef {
  id: string;
  title: string;
  sceneKey: string;
  emoji: string;
  color: number;
  shadowColor: number;
}

/**
 * Single source of truth for the hub's game tiles. Adding a new mini-game
 * later is: drop a scene file in scenes/games/, register it in main.ts,
 * and add one entry here — the hub layout needs no other changes.
 */
export const GAME_REGISTRY: GameDef[] = [
  {
    id: "basketball",
    title: "Basketball\nHoops",
    sceneKey: "BasketballScene",
    emoji: "🏀",
    color: PALETTE.red,
    shadowColor: PALETTE.redDark,
  },
  {
    id: "slots",
    title: "Carnival\nSpin Reels",
    sceneKey: "SlotsScene",
    emoji: "🎰",
    color: PALETTE.orange,
    shadowColor: PALETTE.orangeDark,
  },
  {
    id: "guess-number",
    title: "Guess the\nNumber",
    sceneKey: "GuessNumberScene",
    emoji: "🔮",
    color: PALETTE.pink,
    shadowColor: PALETTE.pinkDark,
  },
  {
    id: "ring-toss",
    title: "Ring\nToss",
    sceneKey: "RingTossScene",
    emoji: "🎯",
    color: PALETTE.green,
    shadowColor: PALETTE.greenDark,
  },
  {
    id: "whack-a-mole",
    title: "Critter\nBoop",
    sceneKey: "WhackAMoleScene",
    emoji: "🐹",
    color: PALETTE.blue,
    shadowColor: PALETTE.blueDark,
  },
  {
    id: "spin-wheel",
    title: "Prize\nWheel",
    sceneKey: "SpinWheelScene",
    emoji: "🎡",
    color: PALETTE.yellow,
    shadowColor: PALETTE.yellowDark,
  },
];

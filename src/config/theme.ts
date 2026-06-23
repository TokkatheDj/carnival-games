export const PALETTE = {
  skyDeep: 0x2b1b4a,
  skyDeepAlt: 0x1a0e2e,
  red: 0xff4d6d,
  redDark: 0xd6324f,
  yellow: 0xffd60a,
  yellowDark: 0xe6b800,
  blue: 0x00b4d8,
  blueDark: 0x0090ad,
  pink: 0xff6fb5,
  pinkDark: 0xe24f96,
  green: 0x57cc99,
  greenDark: 0x3aa87a,
  orange: 0xff9f1c,
  orangeDark: 0xe08400,
  white: 0xffffff,
  cream: 0xfff8e7,
  textDark: 0x2b1b4a,
} as const;

export const PALETTE_CSS = {
  skyDeep: "#2b1b4a",
  skyDeepAlt: "#1a0e2e",
  red: "#ff4d6d",
  yellow: "#ffd60a",
  blue: "#00b4d8",
  pink: "#ff6fb5",
  green: "#57cc99",
  orange: "#ff9f1c",
  white: "#ffffff",
  cream: "#fff8e7",
  textDark: "#2b1b4a",
} as const;

export const FONT_DISPLAY = '"Fredoka", "Trebuchet MS", sans-serif';
export const FONT_BODY = '"Baloo 2", "Trebuchet MS", sans-serif';

export const GAME_COLORS = [
  PALETTE.red,
  PALETTE.blue,
  PALETTE.yellow,
  PALETTE.pink,
  PALETTE.green,
  PALETTE.orange,
] as const;

export const TOUCH_TARGET_MIN = 92;

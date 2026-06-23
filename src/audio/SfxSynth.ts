/**
 * Procedurally synthesized sound effects via the Web Audio API. Used in
 * place of sampled audio files so every sound is guaranteed gentle, short,
 * and pleasant by construction — no licensing concerns, and no risk of an
 * unvetted sample sneaking in something jarring or inappropriate for kids.
 */

const NOTE = {
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
  C6: 1046.5,
  E6: 1318.51,
};

interface ToneNote {
  freq: number;
  delay: number;
  duration: number;
  gain: number;
  wave?: OscillatorType;
}

interface NoiseNote {
  delay: number;
  duration: number;
  gain: number;
  filterType: "bandpass" | "lowpass";
  filterFreq: number;
  q?: number;
}

interface Recipe {
  tones?: ToneNote[];
  noises?: NoiseNote[];
}

const RECIPES: Record<string, Recipe> = {
  "tap-soft": {
    tones: [{ freq: 700, delay: 0, duration: 0.06, gain: 0.35 }],
  },
  "win-chime": {
    tones: [
      { freq: NOTE.C5, delay: 0, duration: 0.18, gain: 0.45 },
      { freq: NOTE.E5, delay: 0.09, duration: 0.18, gain: 0.45 },
      { freq: NOTE.G5, delay: 0.18, duration: 0.28, gain: 0.5 },
    ],
  },
  "soft-reveal": {
    tones: [
      { freq: NOTE.A5, delay: 0, duration: 0.22, gain: 0.35 },
      { freq: NOTE.E5, delay: 0.12, duration: 0.26, gain: 0.35 },
    ],
  },
  "jackpot-jingle": {
    tones: [
      { freq: NOTE.C5, delay: 0, duration: 0.14, gain: 0.45 },
      { freq: NOTE.E5, delay: 0.08, duration: 0.14, gain: 0.45 },
      { freq: NOTE.G5, delay: 0.16, duration: 0.14, gain: 0.45 },
      { freq: NOTE.C6, delay: 0.24, duration: 0.32, gain: 0.55 },
    ],
  },
  "almost-chime": {
    tones: [
      { freq: NOTE.E5, delay: 0, duration: 0.14, gain: 0.4 },
      { freq: NOTE.G5, delay: 0.07, duration: 0.2, gain: 0.4 },
    ],
  },
  swish: {
    noises: [{ delay: 0, duration: 0.22, gain: 0.3, filterType: "bandpass", filterFreq: 2200, q: 1.2 }],
  },
  "soft-bounce": {
    tones: [
      { freq: 480, delay: 0, duration: 0.12, gain: 0.35, wave: "triangle" },
      { freq: 380, delay: 0.1, duration: 0.16, gain: 0.3, wave: "triangle" },
    ],
  },
  clink: {
    tones: [
      { freq: 1500, delay: 0, duration: 0.08, gain: 0.35, wave: "triangle" },
      { freq: 1850, delay: 0.05, duration: 0.12, gain: 0.3, wave: "triangle" },
    ],
  },
  "soft-roll": {
    noises: [{ delay: 0, duration: 0.3, gain: 0.22, filterType: "lowpass", filterFreq: 450 }],
  },
  "giggle-boop": {
    tones: [
      { freq: 520, delay: 0, duration: 0.06, gain: 0.4, wave: "triangle" },
      { freq: 760, delay: 0.05, duration: 0.09, gain: 0.4, wave: "triangle" },
    ],
  },
  "big-win-fanfare": {
    tones: [
      { freq: NOTE.C5, delay: 0, duration: 0.15, gain: 0.5 },
      { freq: NOTE.E5, delay: 0.1, duration: 0.15, gain: 0.5 },
      { freq: NOTE.G5, delay: 0.2, duration: 0.15, gain: 0.5 },
      { freq: NOTE.C6, delay: 0.3, duration: 0.22, gain: 0.55 },
      { freq: NOTE.E6, delay: 0.42, duration: 0.4, gain: 0.55 },
    ],
  },
  "prize-chime": {
    tones: [
      { freq: NOTE.G5, delay: 0, duration: 0.15, gain: 0.45 },
      { freq: NOTE.C6, delay: 0.08, duration: 0.26, gain: 0.5 },
    ],
  },
};

function scheduleTone(ctx: AudioContext, dest: AudioNode, note: ToneNote, now: number): void {
  const osc = ctx.createOscillator();
  osc.type = note.wave ?? "sine";
  osc.frequency.value = note.freq;

  const gainNode = ctx.createGain();
  const start = now + note.delay;
  const end = start + note.duration;
  gainNode.gain.setValueAtTime(0, start);
  gainNode.gain.linearRampToValueAtTime(note.gain, start + Math.min(0.02, note.duration * 0.3));
  gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

  osc.connect(gainNode);
  gainNode.connect(dest);
  osc.start(start);
  osc.stop(end + 0.02);
}

function scheduleNoise(ctx: AudioContext, dest: AudioNode, note: NoiseNote, now: number): void {
  const bufferSize = Math.max(1, Math.ceil(ctx.sampleRate * note.duration));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = note.filterType;
  filter.frequency.value = note.filterFreq;
  if (note.q) filter.Q.value = note.q;

  const gainNode = ctx.createGain();
  const start = now + note.delay;
  const end = start + note.duration;
  gainNode.gain.setValueAtTime(0, start);
  gainNode.gain.linearRampToValueAtTime(note.gain, start + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, end);

  src.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(dest);
  src.start(start);
  src.stop(end + 0.02);
}

/** Returns true if a recipe existed and was scheduled, false if the key is unrecognized. */
export function playSynthSfx(ctx: AudioContext, dest: AudioNode, key: string, volumeScale: number): boolean {
  const recipe = RECIPES[key];
  if (!recipe) return false;

  const now = ctx.currentTime;
  recipe.tones?.forEach((n) => scheduleTone(ctx, dest, { ...n, gain: n.gain * volumeScale }, now));
  recipe.noises?.forEach((n) => scheduleNoise(ctx, dest, { ...n, gain: n.gain * volumeScale }, now));
  return true;
}

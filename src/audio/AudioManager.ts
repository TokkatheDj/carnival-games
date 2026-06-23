import Phaser from "phaser";
import { playSynthSfx } from "./SfxSynth";

const MUTE_STORAGE_KEY = "carnival-games-muted";

/**
 * Routes all game audio through one place so volume ceilings and the
 * "no sudden/jarring sound" rule are enforced structurally rather than
 * per call site. If a real sound asset is loaded for a key, it's played
 * directly; otherwise playSfx falls back to a procedurally synthesized
 * tone (see SfxSynth) keyed by the same name, so every call site always
 * produces a gentle, kid-safe sound with no sample files required.
 */
export class AudioManager {
  static readonly MAX_SFX_VOLUME = 0.6;
  static readonly MAX_MUSIC_VOLUME = 0.3;

  private scene: Phaser.Scene;
  private muted: boolean;
  private music?: Phaser.Sound.BaseSound;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.muted = localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  }

  private hasSound(key: string): boolean {
    return this.scene.cache.audio.exists(key);
  }

  private getAudioContext(): AudioContext | null {
    const soundManager = this.scene.sound as unknown as { context?: AudioContext };
    return soundManager.context ?? null;
  }

  playSfx(key: string, volume: number = AudioManager.MAX_SFX_VOLUME): void {
    if (this.muted) return;
    const cappedVolume = Math.min(volume, AudioManager.MAX_SFX_VOLUME);

    if (this.hasSound(key)) {
      this.scene.sound.play(key, { volume: cappedVolume });
      return;
    }

    const ctx = this.getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    playSynthSfx(ctx, ctx.destination, key, cappedVolume);
  }

  playMusic(key: string, loop: boolean = true): void {
    if (!this.hasSound(key)) return;
    this.stopMusic();
    this.music = this.scene.sound.add(key, { loop, volume: 0 });
    this.music.play();
    this.scene.tweens.add({
      targets: this.music,
      volume: AudioManager.MAX_MUSIC_VOLUME,
      duration: 800,
      ease: "Sine.easeIn",
    });
    if (this.muted) this.music.pause();
  }

  stopMusic(): void {
    if (!this.music) return;
    this.music.stop();
    this.music.destroy();
    this.music = undefined;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_STORAGE_KEY, this.muted ? "1" : "0");
    if (this.music) {
      if (this.muted) this.music.pause();
      else this.music.resume();
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }
}

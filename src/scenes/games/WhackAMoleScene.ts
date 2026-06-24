import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { ScoreBadge } from "../../ui/ScoreBadge";
import { FONT_BODY, FONT_DISPLAY, PALETTE, PALETTE_CSS } from "../../config/theme";

interface Hole {
  x: number;
  y: number;
  up: boolean;
  critter?: Phaser.GameObjects.Text;
  timer?: Phaser.Time.TimerEvent;
}

const CRITTERS = ["🐹", "🐰", "🐸"];
const SPAWN_INTERVAL = 1250;
const UP_DURATION = 1500;

/**
 * Friendly critters (not a violent "whack" visual) pop up at a slow,
 * kid-friendly pace. There is no miss penalty — score only ever goes up,
 * so the whole game is just cumulative fun, never pass/fail.
 */
export class WhackAMoleScene extends BaseScene {
  private layoutObjects: Phaser.GameObjects.GameObject[] = [];
  private holes: Hole[] = [];
  private scoreBadge?: ScoreBadge;
  private spawnEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super("WhackAMoleScene");
  }

  protected onCreate(): void {
    this.layoutAll(this.scale.width, this.scale.height);
  }

  protected onResize(width: number, height: number): void {
    this.layoutAll(width, height);
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.layoutObjects.push(obj);
    return obj;
  }

  private clearLayout(): void {
    this.spawnEvent?.remove(false);
    this.holes.forEach((h) => {
      h.timer?.remove(false);
      h.critter?.destroy();
    });
    this.holes = [];
    this.layoutObjects.forEach((o) => o.destroy());
    this.layoutObjects = [];
  }

  private layoutAll(width: number, height: number): void {
    const previousScore = this.scoreBadge?.getValue() ?? 0;
    this.clearLayout();
    this.cameras.main.setBackgroundColor(PALETTE_CSS.skyDeep);

    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.skyDeep, 1);
    bg.fillRect(0, 0, width, height * 0.22);
    bg.fillStyle(PALETTE.green, 1);
    bg.fillRect(0, height * 0.22, width, height * 0.78);
    this.track(bg);

    const topAreaHeight = Math.max(110, height * 0.18);
    this.track(
      this.add
        .text(width / 2, topAreaHeight * 0.45, "🐹 Critter Boop 🐰", {
          fontFamily: FONT_DISPLAY,
          fontSize: `${Phaser.Math.Clamp(width * 0.036, 20, 32)}px`,
          color: "#ffffff",
          fontStyle: "700",
        })
        .setOrigin(0.5),
    );
    this.track(
      this.add
        .text(width / 2, topAreaHeight * 0.85, "Tap the critters when they pop up!", {
          fontFamily: FONT_BODY,
          fontSize: "18px",
          color: "#ffffff",
          align: "center",
        })
        .setOrigin(0.5),
    );

    this.scoreBadge = this.track(new ScoreBadge(this, width - 190, topAreaHeight * 0.45, previousScore));

    const isPortrait = height >= width;
    const cols = isPortrait ? 2 : 3;
    const rows = isPortrait ? 3 : 2;

    const gridTop = topAreaHeight + 30;
    const gridHeight = height - gridTop - 30;
    const gridWidth = width - 60;
    const cellW = gridWidth / cols;
    const cellH = gridHeight / rows;
    const holeRadius = Math.min(cellW, cellH) * 0.34;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = 30 + cellW * col + cellW / 2;
        const cy = gridTop + cellH * row + cellH / 2;
        const holeGfx = this.add.graphics();
        holeGfx.fillStyle(0x3a2a1a, 0.7);
        holeGfx.fillEllipse(cx, cy + holeRadius * 0.2, holeRadius * 2, holeRadius * 1.1);
        this.track(holeGfx);
        this.holes.push({ x: cx, y: cy, up: false });
      }
    }

    this.spawnEvent = this.time.addEvent({
      delay: SPAWN_INTERVAL,
      loop: true,
      callback: () => this.trySpawn(),
    });
    this.time.delayedCall(300, () => this.trySpawn());
  }

  private trySpawn(): void {
    const available = this.holes.filter((h) => !h.up);
    if (available.length === 0) return;
    const hole = Phaser.Utils.Array.GetRandom(available);
    this.popUp(hole);
  }

  private popUp(hole: Hole): void {
    hole.up = true;
    const emoji = Phaser.Utils.Array.GetRandom(CRITTERS);
    const fontSize = Phaser.Math.Clamp(this.scale.width * 0.08, 52, 78);
    const critter = this.add
      .text(hole.x, hole.y, emoji, { fontSize: `${fontSize}px` })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScale(0);
    hole.critter = critter;

    this.tweens.add({
      targets: critter,
      scale: 1,
      y: hole.y - fontSize * 0.46,
      duration: 220,
      ease: "Back.easeOut",
    });

    critter.on("pointerdown", () => this.boop(hole));

    hole.timer = this.time.delayedCall(UP_DURATION, () => {
      if (hole.up) this.duck(hole, false);
    });
  }

  private boop(hole: Hole): void {
    if (!hole.up || !hole.critter) return;
    hole.timer?.remove(false);
    this.audio.playSfx("giggle-boop");
    this.scoreBadge?.addScore(1);

    const critter = hole.critter;
    this.tweens.add({
      targets: critter,
      scaleX: 1.3,
      scaleY: 0.5,
      duration: 90,
      yoyo: true,
      onComplete: () => this.duck(hole, true),
    });
  }

  private duck(hole: Hole, wasBooped: boolean): void {
    const critter = hole.critter;
    hole.up = false;
    hole.critter = undefined;
    if (!critter) return;
    this.tweens.add({
      targets: critter,
      y: critter.y + 30,
      alpha: 0,
      duration: wasBooped ? 150 : 220,
      onComplete: () => critter.destroy(),
    });
  }
}

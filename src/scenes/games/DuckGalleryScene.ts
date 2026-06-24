import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { ScoreBadge } from "../../ui/ScoreBadge";
import { FONT_BODY, FONT_DISPLAY, PALETTE, PALETTE_CSS } from "../../config/theme";

interface TargetItem {
  container: Phaser.GameObjects.Container;
  row: number;
  speed: number;
  direction: number; // 1 = right, -1 = left
  points: number;
  active: boolean;
  baseY: number;
}

const TARGETS_CONFIG = [
  { row: 0, emoji: "⭐", points: 2, speed: 170, direction: 1 },
  { row: 1, emoji: "🦆", points: 1, speed: 110, direction: -1 },
  { row: 2, emoji: "🎈", points: 1, speed: 75, direction: 1 },
];

/**
 * Classic Carnival Duck Gallery / Shooting booth.
 * Moving targets on horizontal wooden shelves travel across the screen.
 * Tapping them triggers a pop sound, spins them down, and awards score.
 * Never penalizes misses to maintain a kid-friendly, cumulative fun experience.
 */
export class DuckGalleryScene extends BaseScene {
  private layoutObjects: Phaser.GameObjects.GameObject[] = [];
  private targets: TargetItem[] = [];
  private scoreBadge?: ScoreBadge;
  private statusText?: Phaser.GameObjects.Text;
  private scoreValue = 0;

  constructor() {
    super("DuckGalleryScene");
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
    this.targets.forEach((t) => t.container.destroy());
    this.targets = [];
    this.layoutObjects.forEach((o) => o.destroy());
    this.layoutObjects = [];
  }

  private layoutAll(width: number, height: number): void {
    const previousScore = this.scoreBadge?.getValue() ?? this.scoreValue;
    this.scoreValue = previousScore;

    this.clearLayout();
    this.cameras.main.setBackgroundColor(PALETTE_CSS.skyDeep);

    // Background sky and grass/booth base
    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.skyDeep, 1);
    bg.fillRect(0, 0, width, height * 0.76);
    bg.fillStyle(PALETTE.orange, 1);
    bg.fillRect(0, height * 0.76, width, height * 0.24);
    this.track(bg);

    const topAreaHeight = Math.max(110, height * 0.18);

    // Title text
    this.track(
      this.add
        .text(width / 2, topAreaHeight * 0.45, "🦆 Duck Gallery 🎯", {
          fontFamily: FONT_DISPLAY,
          fontSize: `${Phaser.Math.Clamp(width * 0.036, 20, 32)}px`,
          color: "#ffffff",
          fontStyle: "700",
        })
        .setOrigin(0.5),
    );

    // Instructions
    this.track(
      this.add
        .text(width / 2, topAreaHeight * 0.85, "Tap the moving targets to knock them down!", {
          fontFamily: FONT_BODY,
          fontSize: "18px",
          color: "#ffffff",
          align: "center",
        })
        .setOrigin(0.5),
    );

    // Score Badge
    this.scoreBadge = this.track(new ScoreBadge(this, width - 190, topAreaHeight * 0.45, this.scoreValue));

    // Calculate Row heights dynamically
    const galleryHeight = height - topAreaHeight - (height * 0.24);
    const rowSpacing = galleryHeight / 3;

    const rowYPositions = [
      topAreaHeight + rowSpacing * 0.4,
      topAreaHeight + rowSpacing * 1.4,
      topAreaHeight + rowSpacing * 2.4,
    ];

    // Draw the wooden shelves/racks
    const shelves = this.add.graphics();
    shelves.fillStyle(0x8b5a2b, 1); // Wooden shelf color
    rowYPositions.forEach((y) => {
      // Draw horizontal shelf bar
      shelves.fillRect(0, y + 26, width, 14);
      // Draw shadow under the shelf
      shelves.fillStyle(0x5c3a21, 0.4);
      shelves.fillRect(0, y + 40, width, 6);
      shelves.fillStyle(0x8b5a2b, 1);
    });

    // Draw shelf supports/brackets
    shelves.fillStyle(0x5c3a21, 1);
    const bracketCount = Math.max(3, Math.floor(width / 220));
    const bracketSpacing = width / (bracketCount + 1);
    for (let i = 1; i <= bracketCount; i++) {
      const bx = i * bracketSpacing;
      rowYPositions.forEach((y) => {
        shelves.fillRect(bx - 6, y + 40, 12, 18);
      });
    }
    this.track(shelves);

    // Setup targets
    const targetSize = Phaser.Math.Clamp(width * 0.08, 52, 76);
    const targetsPerRow = Math.max(2, Math.floor(width / 260));

    TARGETS_CONFIG.forEach((config) => {
      const baseY = rowYPositions[config.row];

      for (let i = 0; i < targetsPerRow; i++) {
        // Space targets evenly across the shelf initially
        const startX = (width / targetsPerRow) * (i + 0.5) + Phaser.Math.Between(-30, 30);
        const container = this.createTargetContainer(startX, baseY, targetSize, config.emoji);

        const target: TargetItem = {
          container,
          row: config.row,
          speed: config.speed + Phaser.Math.Between(-15, 15),
          direction: config.direction,
          points: config.points,
          active: true,
          baseY,
        };

        container.on("pointerdown", () => this.popTarget(target));
        this.targets.push(target);
      }
    });
  }

  private createTargetContainer(x: number, y: number, size: number, emoji: string): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setDepth(5);

    // Procedural target background plate (concentric circles)
    const plate = this.add.graphics();
    // Shadow
    plate.fillStyle(0x000000, 0.22);
    plate.fillCircle(0, 4, size * 0.5);
    // Outer white rim
    plate.fillStyle(PALETTE.cream, 1);
    plate.fillCircle(0, 0, size * 0.5);
    plate.lineStyle(4, PALETTE.yellow, 1);
    plate.strokeCircle(0, 0, size * 0.5);
    // Middle ring
    plate.lineStyle(3, PALETTE.red, 0.4);
    plate.strokeCircle(0, 0, size * 0.34);
    // Inner bullseye dot
    plate.fillStyle(PALETTE.red, 0.15);
    plate.fillCircle(0, 0, size * 0.18);
    container.add(plate);

    // Emoji text
    const textLabel = this.add
      .text(0, 0, emoji, {
        fontSize: `${size * 0.54}px`,
      })
      .setOrigin(0.5);
    container.add(textLabel);

    container.setSize(size, size);
    container.setInteractive({ useHandCursor: true });

    return container;
  }

  private popTarget(target: TargetItem): void {
    if (!target.active) return;
    target.active = false;
    if (target.container.input) target.container.input.enabled = false;

    // Play synthesized cork gun pop SFX
    this.audio.playSfx("duck-pop");

    // Award points
    this.scoreValue += target.points;
    this.scoreBadge?.addScore(target.points);

    // Spawn visual sparks
    this.celebrate(target.container.x, target.container.y);

    // Drop and spin animation
    this.tweens.add({
      targets: target.container,
      y: target.container.y + 130,
      angle: target.direction * 360,
      alpha: 0,
      scale: 0.2,
      duration: 480,
      ease: "Cubic.easeIn",
      onComplete: () => {
        // Recycle target after a delay
        this.time.delayedCall(1400, () => {
          this.resetTarget(target);
        });
      },
    });
  }

  private celebrate(x: number, y: number): void {
    const particles = ["✨", "⭐", "💥"];
    for (let i = 0; i < 6; i++) {
      const p = Phaser.Utils.Array.GetRandom(particles);
      const spark = this.add
        .text(x + Phaser.Math.Between(-24, 24), y + Phaser.Math.Between(-10, 10), p, {
          fontSize: `${Phaser.Math.Between(18, 28)}px`,
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: spark,
        x: spark.x + Phaser.Math.Between(-40, 40),
        y: spark.y - Phaser.Math.Between(40, 80),
        alpha: 0,
        scale: 0.3,
        duration: 650 + Phaser.Math.Between(-100, 100),
        ease: "Quad.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
  }

  private resetTarget(target: TargetItem): void {
    const width = this.scale.width;
    const padding = 80;

    // Reset properties
    target.container.setAlpha(1);
    target.container.setScale(1);
    target.container.setAngle(0);

    // Place on the edge opposite to direction
    const spawnX = target.direction === 1 ? -padding : width + padding;
    target.container.setPosition(spawnX, target.baseY);

    target.active = true;
    if (target.container.input) target.container.input.enabled = true;
  }

  update(_time: number, delta: number): void {
    const width = this.scale.width;
    const padding = 90;
    const dt = delta / 1000;

    this.targets.forEach((target) => {
      if (!target.active) return;

      // Move target
      target.container.x += target.speed * target.direction * dt;

      // Wrap around when exiting screen
      if (target.direction === 1 && target.container.x > width + padding) {
        target.container.x = -padding;
      } else if (target.direction === -1 && target.container.x < -padding) {
        target.container.x = width + padding;
      }
    });
  }
}

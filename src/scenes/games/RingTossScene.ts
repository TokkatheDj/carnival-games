import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { ScoreBadge } from "../../ui/ScoreBadge";
import { FONT_BODY, FONT_DISPLAY, PALETTE, PALETTE_CSS } from "../../config/theme";

const PEG_COLORS = [
  { color: PALETTE.red, shadow: PALETTE.redDark, name: "Red" },
  { color: PALETTE.blue, shadow: PALETTE.blueDark, name: "Blue" },
  { color: PALETTE.green, shadow: PALETTE.greenDark, name: "Green" },
];

/**
 * Reimagined Ring Toss.
 * Tap-to-Toss timing/targeting game:
 * - Three pegs sit on the screen. One random peg is the "Lucky Target" and lights up.
 * - Tap near or on any peg to toss a ring at it.
 * - The ring flies with a beautiful, smooth parabolic 3D arc tween and loops over the peg.
 * - Playing is 100% reliable, eliminating clunky physics drags.
 */
export class RingTossScene extends BaseScene {
  private layoutObjects: Phaser.GameObjects.GameObject[] = [];
  private scoreBadge?: ScoreBadge;
  private statusText?: Phaser.GameObjects.Text;
  private ring?: Phaser.GameObjects.Text;
  
  private pegPositions: { x: number; y: number }[] = [];
  private pegGraphics: Phaser.GameObjects.Graphics[] = [];
  private activePegIndicator?: Phaser.GameObjects.Text;
  
  private ringStart = { x: 0, y: 0 };
  private pegRowY = 0;
  private pegRadius = 30;
  private activePegIndex = 0;
  
  private inFlight = false;
  private scoreValue = 0;

  constructor() {
    super("RingTossScene");
  }

  protected onCreate(): void {
    // Tap to toss at the nearest peg
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.tossRing(pointer));
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
    this.activePegIndicator?.destroy();
    this.activePegIndicator = undefined;
    this.pegGraphics = [];
    this.layoutObjects.forEach((o) => o.destroy());
    this.layoutObjects = [];
    this.ring = undefined;
  }

  private layoutAll(width: number, height: number): void {
    this.clearLayout();
    this.inFlight = false;
    this.cameras.main.setBackgroundColor(PALETTE_CSS.skyDeep);

    // Draw background (Midway tent back & wooden table)
    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.skyDeep, 1);
    bg.fillRect(0, 0, width, height * 0.78);
    bg.fillStyle(PALETTE.orange, 1);
    bg.fillRect(0, height * 0.78, width, height * 0.22);
    this.track(bg);

    // Title
    this.track(
      this.add
        .text(width / 2, Math.max(40, height * 0.05), "🎯 Ring Toss 🎯", {
          fontFamily: FONT_DISPLAY,
          fontSize: `${Phaser.Math.Clamp(width * 0.036, 20, 32)}px`,
          color: "#ffffff",
          fontStyle: "700",
        })
        .setOrigin(0.5)
        .setPadding(12),
    );

    // Score Badge
    this.scoreBadge = this.track(new ScoreBadge(this, width - 190, Math.max(40, height * 0.05), this.scoreValue));

    // Peg positions
    this.pegRowY = Math.max(170, height * 0.32);
    this.pegRadius = Phaser.Math.Clamp(width * 0.045, 26, 40);
    const margin = width * 0.22;
    this.pegPositions = [
      { x: margin, y: this.pegRowY },
      { x: width / 2, y: this.pegRowY },
      { x: width - margin, y: this.pegRowY },
    ];

    // Draw the wooden shelf/table base under pegs
    const table = this.add.graphics();
    table.fillStyle(0x5c3a21, 1); // Dark wood
    table.fillRect(0, this.pegRowY + 14, width, 18);
    table.fillStyle(0x3e2513, 0.4);
    table.fillRect(0, this.pegRowY + 32, width, 6);
    this.track(table);

    // Draw pegs
    this.pegPositions.forEach((pos, i) => {
      const g = this.add.graphics();
      this.drawPeg(g, pos.x, pos.y, this.pegRadius, PEG_COLORS[i]);
      this.track(g);
      this.pegGraphics.push(g);
    });

    // Ring starting position at bottom center
    this.ringStart = { x: width / 2, y: height - Math.max(120, height * 0.16) };

    // Status message
    this.statusText = this.track(
      this.add
        .text(width / 2, this.ringStart.y + 90, "Tap on a peg to toss the ring!", {
          fontFamily: FONT_BODY,
          fontSize: "20px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: width * 0.8 },
        })
        .setOrigin(0.5),
    );

    // Initial target peg selection
    this.selectNewTarget();

    // Spawn the ring
    this.spawnRing();
  }

  private drawPeg(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, colorSet: { color: number; shadow: number }): void {
    g.clear();
    // shadow / depth
    g.fillStyle(colorSet.shadow, 1);
    g.fillRoundedRect(x - r * 0.24, y - r * 1.6, r * 0.48, r * 2.1, 8);
    // front face
    g.fillStyle(colorSet.color, 1);
    g.fillCircle(x, y - r * 1.6, r * 0.48);
  }

  private selectNewTarget(): void {
    // Pick a random peg
    this.activePegIndex = Phaser.Math.Between(0, this.pegPositions.length - 1);
    const targetPeg = this.pegPositions[this.activePegIndex];

    // Remove old indicator
    this.activePegIndicator?.destroy();

    // Spawn a bouncy star indicator above the target peg
    this.activePegIndicator = this.add
      .text(targetPeg.x, targetPeg.y - this.pegRadius * 2.5, "⭐", { fontSize: "36px" })
      .setPadding(10)
      .setOrigin(0.5)
      .setDepth(15);

    this.tweens.add({
      targets: this.activePegIndicator,
      y: targetPeg.y - this.pegRadius * 2.8,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private spawnRing(): void {
    const fontSize = Phaser.Math.Clamp(this.scale.width * 0.065, 46, 64);
    this.ring = this.add
      .text(this.ringStart.x, this.ringStart.y, "🛟", { fontSize: `${fontSize}px` })
      .setPadding(16)
      .setOrigin(0.5)
      .setDepth(20);
    this.track(this.ring);
  }

  private tossRing(pointer: Phaser.Input.Pointer): void {
    if (this.inFlight || !this.ring) return;
    this.inFlight = true;
    this.statusText?.setText("");

    // Find the closest peg to the tap X position
    let closestIndex = 0;
    let minDist = Infinity;
    this.pegPositions.forEach((pos, idx) => {
      const dist = Math.abs(pointer.x - pos.x);
      if (dist < minDist) {
        minDist = dist;
        closestIndex = idx;
      }
    });

    const targetPeg = this.pegPositions[closestIndex];

    // Play toss sound
    this.audio.playSfx("tap-soft");

    // Tween the ring to the target peg
    // Parabolic arc: move to target X, Y, and scale up/down
    this.tweens.add({
      targets: this.ring,
      x: targetPeg.x,
      y: targetPeg.y - 12, // Land slightly below the peg tip to look "looped"
      duration: 700,
      ease: "Quad.easeOut",
      onComplete: () => this.checkLanding(closestIndex),
    });

    // Scale tween for the 3D-like depth arc
    this.tweens.add({
      targets: this.ring,
      scaleX: { from: 1, to: 1.45 },
      scaleY: { from: 1, to: 1.45 },
      duration: 350,
      yoyo: true,
      ease: "Sine.easeOut",
      onComplete: () => {
        // Drop down onto the peg snugly
        this.tweens.add({
          targets: this.ring,
          scale: 0.85,
          duration: 150,
        });
      },
    });
  }

  private checkLanding(pegIndex: number): void {
    const isLuckyHit = pegIndex === this.activePegIndex;
    this.audio.playSfx("clink");
    
    // Calculate score
    const points = isLuckyHit ? 2 : 1;
    this.scoreValue += points;
    this.scoreBadge?.addScore(points);

    // Visual effect feedback
    const targetPeg = this.pegPositions[pegIndex];
    this.celebrate(targetPeg.x, targetPeg.y - this.pegRadius * 1.2);

    if (isLuckyHit) {
      this.statusText?.setText("Bullseye! Lucky peg +2!");
      this.selectNewTarget();
    } else {
      this.statusText?.setText("Ringer! Nice toss!");
    }

    // Short delay before resetting ring
    this.time.delayedCall(1100, () => this.resetRing());
  }

  private celebrate(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const spark = this.add
        .text(x + Phaser.Math.Between(-25, 25), y + Phaser.Math.Between(-15, 15), "✨", { fontSize: "24px" })
        .setPadding(8)
        .setOrigin(0.5)
        .setDepth(15);
      
      this.tweens.add({
        targets: spark,
        x: spark.x + Phaser.Math.Between(-30, 30),
        y: spark.y - Phaser.Math.Between(30, 60),
        alpha: 0,
        scale: 0.3,
        duration: 550 + Phaser.Math.Between(0, 150),
        onComplete: () => spark.destroy(),
      });
    }
  }

  private resetRing(): void {
    if (!this.ring) return;
    this.ring.setPosition(this.ringStart.x, this.ringStart.y);
    this.ring.setScale(1);
    this.inFlight = false;
    this.statusText?.setText("Tap on a peg to toss the ring!");
  }
}

import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { ScoreBadge } from "../../ui/ScoreBadge";
import { FONT_BODY, FONT_DISPLAY, PALETTE, PALETTE_CSS } from "../../config/theme";

type RingSprite = Phaser.GameObjects.Text & { body: Phaser.Physics.Arcade.Body };

const LAUNCH_POWER = 6.0;
const MAX_DRAG = 160;
const GRAVITY_Y = 950;
const PEG_COLORS = [
  { color: PALETTE.red, shadow: PALETTE.redDark },
  { color: PALETTE.blue, shadow: PALETTE.blueDark },
  { color: PALETTE.green, shadow: PALETTE.greenDark },
];

/** Ring toss booth — reuses Basketball's drag-and-arc physics pattern. */
export class RingTossScene extends BaseScene {
  private layoutObjects: Phaser.GameObjects.GameObject[] = [];
  private scoreBadge?: ScoreBadge;
  private statusText?: Phaser.GameObjects.Text;
  private ring?: RingSprite;
  private aimLine?: Phaser.GameObjects.Graphics;
  private ringStart = { x: 0, y: 0 };
  private pegPositions: { x: number; y: number }[] = [];
  private pegRowY = 0;
  private pegRadius = 30;
  private scored = false;
  private inFlight = false;
  private scoreValue = 0;

  constructor() {
    super("RingTossScene");
  }

  protected onCreate(): void {
    this.input.on("drag", this.onDrag, this);
    this.input.on("dragend", this.onDragEnd, this);
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
    this.layoutObjects.forEach((o) => o.destroy());
    this.layoutObjects = [];
    this.ring = undefined;
    this.aimLine = undefined;
  }

  private layoutAll(width: number, height: number): void {
    this.clearLayout();
    this.inFlight = false;
    this.scored = false;
    this.cameras.main.setBackgroundColor(PALETTE_CSS.skyDeep);

    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.skyDeep, 1);
    bg.fillRect(0, 0, width, height * 0.78);
    bg.fillStyle(PALETTE.orange, 1);
    bg.fillRect(0, height * 0.78, width, height * 0.22);
    this.track(bg);

    this.track(
      this.add
        .text(width / 2, Math.max(40, height * 0.05), "🎯 Ring Toss 🎯", {
          fontFamily: FONT_DISPLAY,
          fontSize: `${Phaser.Math.Clamp(width * 0.036, 20, 32)}px`,
          color: "#ffffff",
          fontStyle: "700",
        })
        .setOrigin(0.5),
    );

    this.scoreBadge = this.track(new ScoreBadge(this, width - 190, Math.max(40, height * 0.05), this.scoreValue));

    this.pegRowY = Math.max(160, height * 0.28);
    this.pegRadius = Phaser.Math.Clamp(width * 0.045, 26, 40);
    const margin = width * 0.22;
    this.pegPositions = [
      { x: margin, y: this.pegRowY },
      { x: width / 2, y: this.pegRowY },
      { x: width - margin, y: this.pegRowY },
    ];
    this.pegPositions.forEach((pos, i) => this.drawPeg(pos.x, pos.y, this.pegRadius, PEG_COLORS[i]));

    this.ringStart = { x: width / 2, y: height - Math.max(120, height * 0.16) };

    this.statusText = this.track(
      this.add
        .text(width / 2, this.ringStart.y + 90, "Drag the ring and let go to toss!", {
          fontFamily: FONT_BODY,
          fontSize: "20px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: width * 0.8 },
        })
        .setOrigin(0.5),
    );

    this.aimLine = this.track(this.add.graphics());

    this.spawnRing();
  }

  private drawPeg(x: number, y: number, r: number, colorSet: { color: number; shadow: number }): void {
    const g = this.add.graphics();
    g.fillStyle(colorSet.shadow, 1);
    g.fillRoundedRect(x - r * 0.22, y - r * 1.6, r * 0.44, r * 2.2, 8);
    g.fillStyle(colorSet.color, 1);
    g.fillCircle(x, y - r * 1.6, r * 0.5);
    this.track(g);
  }

  private spawnRing(): void {
    const fontSize = Phaser.Math.Clamp(this.scale.width * 0.06, 40, 58);
    const ring = this.add
      .text(this.ringStart.x, this.ringStart.y, "🛟", { fontSize: `${fontSize}px` })
      .setOrigin(0.5) as RingSprite;
    this.physics.add.existing(ring);
    ring.body.setCircle(fontSize * 0.34);
    ring.body.setAllowGravity(false);
    ring.body.setVelocity(0, 0);
    ring.setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(ring);
    this.track(ring);
    this.ring = ring;
  }

  private onDrag = (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
    if (obj !== this.ring || this.inFlight) return;
    const dx = dragX - this.ringStart.x;
    const dy = dragY - this.ringStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let nx = dragX;
    let ny = dragY;
    if (dist > MAX_DRAG) {
      const scale = MAX_DRAG / dist;
      nx = this.ringStart.x + dx * scale;
      ny = this.ringStart.y + dy * scale;
    }
    this.ring.setPosition(nx, ny);
    this.drawAimLine();
  };

  private onDragEnd = (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
    if (obj !== this.ring || this.inFlight) return;
    this.launchRing();
  };

  private drawAimLine(): void {
    if (!this.aimLine || !this.ring) return;
    this.aimLine.clear();
    const aimX = this.ringStart.x + (this.ringStart.x - this.ring.x);
    const aimY = this.ringStart.y + (this.ringStart.y - this.ring.y);
    this.aimLine.lineStyle(4, PALETTE.yellow, 0.8);
    this.aimLine.lineBetween(this.ring.x, this.ring.y, aimX, aimY);
  }

  private launchRing(): void {
    if (!this.ring) return;
    const dx = this.ringStart.x - this.ring.x;
    let dy = this.ringStart.y - this.ring.y;
    if (dy > -120) dy = -120;

    this.ring.body.setAllowGravity(true);
    this.ring.body.setGravityY(GRAVITY_Y);
    this.ring.body.setVelocity(dx * LAUNCH_POWER, dy * LAUNCH_POWER);

    this.inFlight = true;
    this.scored = false;
    this.aimLine?.clear();
    this.ring.disableInteractive();
    this.statusText?.setText("");
  }

  update(): void {
    if (!this.inFlight || !this.ring) return;
    const body = this.ring.body;

    if (!this.scored && body.velocity.y > 0) {
      for (const peg of this.pegPositions) {
        if (Math.abs(this.ring.y - peg.y) <= 18 && Math.abs(this.ring.x - peg.x) <= this.pegRadius * 0.8) {
          this.scored = true;
          this.handleScore();
          break;
        }
      }
    }

    if (this.ring.y > this.scale.height + 100 || this.ring.x < -100 || this.ring.x > this.scale.width + 100) {
      this.inFlight = false;
      if (!this.scored) this.handleMiss();
    }
  }

  private celebrate(x: number, y: number): void {
    for (let i = 0; i < 5; i++) {
      const spark = this.add
        .text(x + Phaser.Math.Between(-30, 30), y, "✨", { fontSize: "26px" })
        .setOrigin(0.5);
      this.tweens.add({
        targets: spark,
        y: spark.y - 60,
        alpha: 0,
        duration: 700,
        ease: "Sine.easeOut",
        onComplete: () => spark.destroy(),
      });
    }
  }

  private handleScore(): void {
    this.audio.playSfx("clink");
    this.scoreBadge?.addScore(1);
    this.statusText?.setText("Ringer! Great toss!");
    if (this.ring) this.celebrate(this.ring.x, this.ring.y);
    this.ring?.body.setVelocity(0, 0);
    this.ring?.body.setAllowGravity(false);
    this.time.delayedCall(900, () => this.resetRing());
  }

  private handleMiss(): void {
    this.audio.playSfx("soft-roll");
    this.statusText?.setText("Nice try! Toss again!");
    this.time.delayedCall(500, () => this.resetRing());
  }

  private resetRing(): void {
    if (!this.ring) return;
    this.ring.setPosition(this.ringStart.x, this.ringStart.y);
    this.ring.body.setVelocity(0, 0);
    this.ring.body.setAllowGravity(false);
    this.ring.setInteractive({ useHandCursor: true, draggable: true });
    this.inFlight = false;
    this.scored = false;
    this.statusText?.setText("Drag the ring and let go to toss!");
  }
}

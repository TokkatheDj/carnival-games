import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { ScoreBadge } from "../../ui/ScoreBadge";
import { FONT_BODY, FONT_DISPLAY, PALETTE, PALETTE_CSS } from "../../config/theme";

type BallSprite = Phaser.GameObjects.Text & { body: Phaser.Physics.Arcade.Body };

const LAUNCH_POWER = 6.2;
const MAX_DRAG = 160;
const GRAVITY_Y = 950;

/**
 * Carnival hoops booth. Drag-and-release aiming with generous "make"
 * detection so near-misses still feel fair to small/imprecise hands.
 * Misses bounce off softly — never a buzzer, never a punishing visual.
 */
export class BasketballScene extends BaseScene {
  private layoutObjects: Phaser.GameObjects.GameObject[] = [];
  private scoreBadge?: ScoreBadge;
  private statusText?: Phaser.GameObjects.Text;
  private ball?: BallSprite;
  private aimLine?: Phaser.GameObjects.Graphics;
  private ballStart = { x: 0, y: 0 };
  private hoopPos = { x: 0, y: 0 };
  private rimRadius = 46;
  private scored = false;
  private inFlight = false;
  private scoreValue = 0;

  constructor() {
    super("BasketballScene");
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
    this.ball = undefined;
    this.aimLine = undefined;
  }

  private layoutAll(width: number, height: number): void {
    this.clearLayout();
    this.inFlight = false;
    this.scored = false;
    this.cameras.main.setBackgroundColor(PALETTE_CSS.skyDeep);

    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.skyDeep, 1);
    bg.fillRect(0, 0, width, height * 0.75);
    bg.fillStyle(PALETTE.green, 1);
    bg.fillRect(0, height * 0.75, width, height * 0.25);
    this.track(bg);

    this.track(
      this.add
        .text(width / 2, Math.max(40, height * 0.05), "🏀 Basketball Hoops 🏀", {
          fontFamily: FONT_DISPLAY,
          fontSize: `${Phaser.Math.Clamp(width * 0.036, 20, 32)}px`,
          color: "#ffffff",
          fontStyle: "700",
        })
        .setOrigin(0.5),
    );

    this.scoreBadge = this.track(new ScoreBadge(this, width - 190, Math.max(40, height * 0.05), this.scoreValue));

    this.hoopPos = { x: width / 2, y: Math.max(150, height * 0.26) };
    this.rimRadius = Phaser.Math.Clamp(width * 0.05, 36, 54);
    this.drawHoop();

    this.ballStart = { x: width / 2, y: height - Math.max(120, height * 0.16) };

    this.statusText = this.track(
      this.add
        .text(width / 2, this.ballStart.y + 90, "Drag the ball and let go to shoot!", {
          fontFamily: FONT_BODY,
          fontSize: "20px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: width * 0.8 },
        })
        .setOrigin(0.5),
    );

    this.aimLine = this.track(this.add.graphics());

    this.spawnBall();
  }

  private drawHoop(): void {
    const { x, y } = this.hoopPos;
    const r = this.rimRadius;

    const backboard = this.add.graphics();
    backboard.fillStyle(PALETTE.white, 0.95);
    backboard.fillRoundedRect(x - r * 1.6, y - r * 1.9, r * 3.2, r * 1.1, 10);
    backboard.lineStyle(4, PALETTE.blueDark, 1);
    backboard.strokeRoundedRect(x - r * 0.9, y - r * 1.65, r * 1.8, r * 0.7, 6);
    this.track(backboard);

    const net = this.add.graphics();
    net.lineStyle(3, PALETTE.cream, 0.85);
    const netTop = y - r * 0.1;
    const netBottom = y + r * 0.85;
    for (let i = -3; i <= 3; i++) {
      net.lineBetween(x + i * (r / 4), netTop, x + i * (r / 5), netBottom);
    }
    this.track(net);

    const rim = this.add.graphics();
    rim.lineStyle(8, PALETTE.orange, 1);
    rim.strokeEllipse(x, y, r * 2, r * 0.55);
    this.track(rim);
  }

  private spawnBall(): void {
    const fontSize = Phaser.Math.Clamp(this.scale.width * 0.07, 44, 64);
    const ball = this.add.text(this.ballStart.x, this.ballStart.y, "🏀", { fontSize: `${fontSize}px` }).setOrigin(0.5) as BallSprite;
    this.physics.add.existing(ball);
    ball.body.setCircle(fontSize * 0.32);
    ball.body.setAllowGravity(false);
    ball.body.setVelocity(0, 0);
    ball.setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(ball);
    this.track(ball);
    this.ball = ball;
  }

  private onDrag = (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject, dragX: number, dragY: number) => {
    if (obj !== this.ball || this.inFlight) return;
    const dx = dragX - this.ballStart.x;
    const dy = dragY - this.ballStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let nx = dragX;
    let ny = dragY;
    if (dist > MAX_DRAG) {
      const scale = MAX_DRAG / dist;
      nx = this.ballStart.x + dx * scale;
      ny = this.ballStart.y + dy * scale;
    }
    this.ball.setPosition(nx, ny);
    this.drawAimLine();
  };

  private onDragEnd = (_pointer: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
    if (obj !== this.ball || this.inFlight) return;
    this.launchBall();
  };

  private drawAimLine(): void {
    if (!this.aimLine || !this.ball) return;
    this.aimLine.clear();
    const aimX = this.ballStart.x + (this.ballStart.x - this.ball.x);
    const aimY = this.ballStart.y + (this.ballStart.y - this.ball.y);
    this.aimLine.lineStyle(4, PALETTE.yellow, 0.8);
    this.aimLine.lineBetween(this.ball.x, this.ball.y, aimX, aimY);
  }

  private launchBall(): void {
    if (!this.ball) return;
    const dx = this.ballStart.x - this.ball.x;
    let dy = this.ballStart.y - this.ball.y;
    if (dy > -120) dy = -120;

    this.ball.body.setAllowGravity(true);
    this.ball.body.setGravityY(GRAVITY_Y);
    this.ball.body.setVelocity(dx * LAUNCH_POWER, dy * LAUNCH_POWER);

    this.inFlight = true;
    this.scored = false;
    this.aimLine?.clear();
    this.ball.disableInteractive();
    this.statusText?.setText("");
  }

  update(): void {
    if (!this.inFlight || !this.ball) return;
    const body = this.ball.body;

    if (
      !this.scored &&
      this.ball.y >= this.hoopPos.y - 16 &&
      this.ball.y <= this.hoopPos.y + 16 &&
      Math.abs(this.ball.x - this.hoopPos.x) <= this.rimRadius * 0.6 &&
      body.velocity.y > 0
    ) {
      this.scored = true;
      this.handleScore();
    }

    if (this.ball.y > this.scale.height + 100 || this.ball.x < -100 || this.ball.x > this.scale.width + 100) {
      this.inFlight = false;
      if (!this.scored) this.handleMiss();
    }
  }

  private celebrate(): void {
    if (!this.ball) return;
    for (let i = 0; i < 5; i++) {
      const spark = this.add
        .text(this.hoopPos.x + Phaser.Math.Between(-30, 30), this.hoopPos.y, "✨", { fontSize: "26px" })
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
    this.audio.playSfx("swish");
    this.scoreBadge?.addScore(1);
    this.statusText?.setText("Swish! Nice shot!");
    this.celebrate();
    this.ball?.body.setVelocity(0, 0);
    this.ball?.body.setAllowGravity(false);
    this.time.delayedCall(900, () => this.resetBall());
  }

  private handleMiss(): void {
    this.audio.playSfx("soft-bounce");
    this.statusText?.setText("So close! Try again!");
    this.time.delayedCall(500, () => this.resetBall());
  }

  private resetBall(): void {
    if (!this.ball) return;
    this.ball.setPosition(this.ballStart.x, this.ballStart.y);
    this.ball.body.setVelocity(0, 0);
    this.ball.body.setAllowGravity(false);
    this.ball.setInteractive({ useHandCursor: true, draggable: true });
    this.inFlight = false;
    this.scored = false;
    this.statusText?.setText("Drag the ball and let go to shoot!");
  }
}

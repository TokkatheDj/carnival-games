import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { ScoreBadge } from "../../ui/ScoreBadge";
import { FONT_BODY, FONT_DISPLAY, PALETTE, PALETTE_CSS } from "../../config/theme";

/**
 * Reimagined Carnival Hoops.
 * Timing-based tap-to-shoot game:
 * - A beautiful basketball hoop slides left/right at the top of the screen.
 * - Tap anywhere to shoot the ball straight up.
 * - Score a "Swish!" if you time it so the hoop is aligned with the ball's trajectory.
 * - Uses smooth, robust tweens for 100% reliable behavior on all tablets/devices.
 */
export class BasketballScene extends BaseScene {
  private layoutObjects: Phaser.GameObjects.GameObject[] = [];
  private scoreBadge?: ScoreBadge;
  private statusText?: Phaser.GameObjects.Text;
  private ball?: Phaser.GameObjects.Text;
  
  private hoopContainer?: Phaser.GameObjects.Container;
  private hoopTween?: Phaser.Tweens.Tween;
  
  private ballStart = { x: 0, y: 0 };
  private hoopPos = { x: 0, y: 0 };
  private rimRadius = 48;
  
  private inFlight = false;
  private scoreValue = 0;

  constructor() {
    super("BasketballScene");
  }

  protected onCreate(): void {
    // Tap anywhere on the scene background to shoot
    this.input.on("pointerdown", () => this.shootBall());
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
    if (this.hoopTween) {
      this.hoopTween.stop();
      this.hoopTween = undefined;
    }
    this.hoopContainer?.destroy();
    this.hoopContainer = undefined;
    this.layoutObjects.forEach((o) => o.destroy());
    this.layoutObjects = [];
    this.ball = undefined;
  }

  private layoutAll(width: number, height: number): void {
    this.clearLayout();
    this.inFlight = false;
    this.cameras.main.setBackgroundColor(PALETTE_CSS.skyDeep);

    // Draw background (Sky & Grass midway base)
    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.skyDeep, 1);
    bg.fillRect(0, 0, width, height * 0.75);
    bg.fillStyle(PALETTE.green, 1);
    bg.fillRect(0, height * 0.75, width, height * 0.25);
    this.track(bg);

    // Title
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

    // Score Badge
    this.scoreBadge = this.track(new ScoreBadge(this, width - 190, Math.max(40, height * 0.05), this.scoreValue));

    // Calculate positions
    this.hoopPos = { x: width / 2, y: Math.max(160, height * 0.26) };
    this.rimRadius = Phaser.Math.Clamp(width * 0.05, 38, 54);
    
    // Create the moving hoop container
    this.createMovingHoop(width);

    // Ball position (centered horizontally, near the bottom)
    this.ballStart = { x: width / 2, y: height - Math.max(130, height * 0.18) };

    // Status message
    this.statusText = this.track(
      this.add
        .text(width / 2, this.ballStart.y + 90, "Tap anywhere to shoot the ball!", {
          fontFamily: FONT_BODY,
          fontSize: "20px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: width * 0.8 },
        })
        .setOrigin(0.5),
    );

    // Spawn the ball at the bottom
    this.spawnBall();
  }

  private createMovingHoop(width: number): void {
    const { y } = this.hoopPos;
    const r = this.rimRadius;

    // Create a container to hold the backboard, net, and rim together
    this.hoopContainer = this.add.container(width / 2, y);
    this.hoopContainer.setDepth(10);

    // 1. Backboard
    const backboard = this.add.graphics();
    backboard.fillStyle(PALETTE.white, 0.95);
    backboard.fillRoundedRect(-r * 1.6, -r * 1.9, r * 3.2, r * 1.1, 10);
    backboard.lineStyle(4, PALETTE.blueDark, 1);
    backboard.strokeRoundedRect(-r * 0.9, -r * 1.65, r * 1.8, r * 0.7, 6);
    this.hoopContainer.add(backboard);

    // 2. Net
    const net = this.add.graphics();
    net.lineStyle(3, PALETTE.cream, 0.85);
    const netTop = -r * 0.1;
    const netBottom = r * 0.85;
    for (let i = -3; i <= 3; i++) {
      net.lineBetween(i * (r / 4), netTop, i * (r / 5), netBottom);
    }
    this.hoopContainer.add(net);

    // 3. Rim (drawn on top of net)
    const rim = this.add.graphics();
    rim.lineStyle(8, PALETTE.orange, 1);
    rim.strokeEllipse(0, -r * 0.1, r * 2, r * 0.55);
    this.hoopContainer.add(rim);

    // Tween the hoop left and right
    const padding = r * 1.8;
    const minX = padding;
    const maxX = width - padding;

    // Randomize starting side
    this.hoopContainer.x = Phaser.Math.Between(0, 1) === 0 ? minX : maxX;

    this.hoopTween = this.tweens.add({
      targets: this.hoopContainer,
      x: this.hoopContainer.x === minX ? maxX : minX,
      duration: width < 600 ? 1900 : 2500, // slower on larger screens
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private spawnBall(): void {
    const fontSize = Phaser.Math.Clamp(this.scale.width * 0.07, 48, 68);
    this.ball = this.add
      .text(this.ballStart.x, this.ballStart.y, "🏀", { fontSize: `${fontSize}px` })
      .setOrigin(0.5)
      .setDepth(20);
    this.track(this.ball);
  }

  private shootBall(): void {
    if (this.inFlight || !this.ball || !this.hoopContainer) return;
    this.inFlight = true;
    this.statusText?.setText("");

    // Target height is the net rim height
    const targetY = this.hoopPos.y;

    // Upward launch tween
    this.tweens.add({
      targets: this.ball,
      y: targetY,
      duration: 650,
      ease: "Quad.easeOut", // decelerate as it reaches peak
      onComplete: () => this.checkScore(),
    });
  }

  private checkScore(): void {
    if (!this.ball || !this.hoopContainer) return;

    const diffX = Math.abs(this.ball.x - this.hoopContainer.x);
    const hitTolerance = this.rimRadius * 0.64;

    if (diffX <= hitTolerance) {
      // Swish! It goes in!
      this.handleScore();
    } else if (diffX <= this.rimRadius * 1.3) {
      // Clunky bounce off the rim!
      this.handleRimBounce();
    } else {
      // Complete miss!
      this.handleMiss();
    }
  }

  private celebrate(): void {
    if (!this.hoopContainer) return;
    const hx = this.hoopContainer.x;
    const hy = this.hoopPos.y;

    for (let i = 0; i < 6; i++) {
      const spark = this.add
        .text(hx + Phaser.Math.Between(-30, 30), hy + Phaser.Math.Between(-10, 10), "✨", { fontSize: "26px" })
        .setOrigin(0.5)
        .setDepth(15);
      
      this.tweens.add({
        targets: spark,
        x: spark.x + Phaser.Math.Between(-30, 30),
        y: spark.y - Phaser.Math.Between(40, 80),
        alpha: 0,
        scale: 0.3,
        duration: 600 + Phaser.Math.Between(0, 200),
        onComplete: () => spark.destroy(),
      });
    }
  }

  private handleScore(): void {
    this.audio.playSfx("swish");
    this.scoreValue += 1;
    this.scoreBadge?.addScore(1);
    
    this.statusText?.setText("Swish! Perfect shot!");
    this.celebrate();

    // Tween the ball falling through the net
    if (this.ball) {
      this.tweens.add({
        targets: this.ball,
        y: this.hoopPos.y + 110,
        scale: 0.72, // visually scale down as it goes "into" net
        alpha: 0.4,
        duration: 350,
        ease: "Sine.easeIn",
        onComplete: () => {
          this.tweens.add({
            targets: this.ball,
            alpha: 0,
            y: this.hoopPos.y + 180,
            duration: 150,
            onComplete: () => this.resetBall(),
          });
        },
      });
    }
  }

  private handleRimBounce(): void {
    this.audio.playSfx("soft-bounce");
    this.statusText?.setText("Bounced off the rim!");

    if (this.ball && this.hoopContainer) {
      const bounceLeft = this.ball.x < this.hoopContainer.x;
      const bounceX = this.ball.x + (bounceLeft ? -45 : 45);
      
      // Arc bounce away
      this.tweens.add({
        targets: this.ball,
        x: bounceX,
        y: this.hoopPos.y - 35,
        angle: bounceLeft ? -180 : 180,
        duration: 250,
        ease: "Quad.easeOut",
        onComplete: () => {
          this.tweens.add({
            targets: this.ball,
            y: this.scale.height + 80,
            alpha: 0,
            duration: 450,
            ease: "Quad.easeIn",
            onComplete: () => this.resetBall(),
          });
        },
      });
    }
  }

  private handleMiss(): void {
    this.audio.playSfx("soft-roll");
    this.statusText?.setText("Airball! Try again!");

    // Just continue falling down past screen
    if (this.ball) {
      this.tweens.add({
        targets: this.ball,
        y: this.scale.height + 80,
        alpha: 0,
        duration: 550,
        ease: "Quad.easeIn",
        onComplete: () => this.resetBall(),
      });
    }
  }

  private resetBall(): void {
    if (!this.ball) return;
    this.ball.setPosition(this.ballStart.x, this.ballStart.y);
    this.ball.setAlpha(1);
    this.ball.setScale(1);
    this.ball.setAngle(0);
    this.inFlight = false;
    this.statusText?.setText("Tap anywhere to shoot the ball!");
  }
}

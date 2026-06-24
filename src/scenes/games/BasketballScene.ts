import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { ScoreBadge } from "../../ui/ScoreBadge";
import { Button } from "../../ui/Button";
import { FONT_BODY, FONT_DISPLAY, PALETTE, PALETTE_CSS } from "../../config/theme";

/**
 * Reimagined Carnival Hoops.
 * Timing-based tap-to-shoot game:
 * - Tap anywhere to shoot the ball in a parabolic arc towards that X coordinate.
 * - Moving hoop at the top.
 * - Customizable difficulty settings (Easy, Medium, Hard).
 * - Medium and Hard modes add moving blockers (✋/🛡️) that deflect the ball!
 */
export class BasketballScene extends BaseScene {
  private layoutObjects: Phaser.GameObjects.GameObject[] = [];
  private scoreBadge?: ScoreBadge;
  private statusText?: Phaser.GameObjects.Text;
  private ball?: Phaser.GameObjects.Text;
  
  private hoopContainer?: Phaser.GameObjects.Container;
  private hoopTween?: Phaser.Tweens.Tween;
  
  private obstacles: Phaser.GameObjects.Container[] = [];
  private obstacleTweens: Phaser.Tweens.Tween[] = [];
  
  private ballStart = { x: 0, y: 0 };
  private hoopPos = { x: 0, y: 0 };
  private rimRadius = 48;
  
  // Settings
  private difficulty = "medium"; // "easy", "medium", "hard"
  private inFlight = false;
  private scored = false;
  private scoreValue = 0;

  constructor() {
    super("BasketballScene");
  }

  protected onCreate(): void {
    // Tap to shoot the ball towards pointer X
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.shootBall(pointer));
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
    this.obstacleTweens.forEach((t) => t.stop());
    this.obstacleTweens = [];
    this.obstacles.forEach((o) => o.destroy());
    this.obstacles = [];
    
    this.hoopContainer?.destroy();
    this.hoopContainer = undefined;
    
    this.layoutObjects.forEach((o) => o.destroy());
    this.layoutObjects = [];
    this.ball = undefined;
  }

  private layoutAll(width: number, height: number): void {
    this.clearLayout();
    this.inFlight = false;
    this.scored = false;
    this.cameras.main.setBackgroundColor(PALETTE_CSS.skyDeep);

    // Background
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
        .setOrigin(0.5)
        .setPadding(12),
    );

    // Score Badge
    this.scoreBadge = this.track(new ScoreBadge(this, width - 190, Math.max(40, height * 0.05), this.scoreValue));

    // Settings Gear Button next to Home (x=168, y=64)
    const settingsButton = new Button(this, 168, 64, {
      label: "⚙️",
      width: 84,
      height: 84,
      fontSize: 32,
      color: PALETTE.pink,
      shadowColor: PALETTE.pinkDark,
      onClick: () => this.openSettings(),
    });
    settingsButton.setDepth(1000);
    this.track(settingsButton);

    // Hoop Pos & Radius
    this.hoopPos = { x: width / 2, y: Math.max(160, height * 0.26) };
    this.rimRadius = Phaser.Math.Clamp(width * 0.05, 38, 54);
    
    // Create the moving hoop
    this.createMovingHoop(width);

    // Ball start
    this.ballStart = { x: width / 2, y: height - Math.max(130, height * 0.18) };

    // Obstacles
    this.createObstacles(width, height);

    // Status Text
    this.statusText = this.track(
      this.add
        .text(width / 2, this.ballStart.y + 90, "Tap anywhere to shoot the ball towards that spot!", {
          fontFamily: FONT_BODY,
          fontSize: "20px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: width * 0.8 },
        })
        .setOrigin(0.5),
    );

    this.spawnBall();
  }

  private createMovingHoop(width: number): void {
    const { y } = this.hoopPos;
    const r = this.rimRadius;

    this.hoopContainer = this.add.container(width / 2, y);
    this.hoopContainer.setDepth(10);

    const backboard = this.add.graphics();
    backboard.fillStyle(PALETTE.white, 0.95);
    backboard.fillRoundedRect(-r * 1.6, -r * 1.9, r * 3.2, r * 1.1, 10);
    backboard.lineStyle(4, PALETTE.blueDark, 1);
    backboard.strokeRoundedRect(-r * 0.9, -r * 1.65, r * 1.8, r * 0.7, 6);
    this.hoopContainer.add(backboard);

    const net = this.add.graphics();
    net.lineStyle(3, PALETTE.cream, 0.85);
    const netTop = -r * 0.1;
    const netBottom = r * 0.85;
    for (let i = -3; i <= 3; i++) {
      net.lineBetween(i * (r / 4), netTop, i * (r / 5), netBottom);
    }
    this.hoopContainer.add(net);

    const rim = this.add.graphics();
    rim.lineStyle(8, PALETTE.orange, 1);
    rim.strokeEllipse(0, -r * 0.1, r * 2, r * 0.55);
    this.hoopContainer.add(rim);

    // Tween hoop speed based on difficulty
    let duration = 2500;
    if (this.difficulty === "easy") duration = 3400;
    else if (this.difficulty === "hard") duration = 1800;

    const padding = r * 1.8;
    const minX = padding;
    const maxX = width - padding;

    this.hoopContainer.x = Phaser.Math.Between(0, 1) === 0 ? minX : maxX;

    this.hoopTween = this.tweens.add({
      targets: this.hoopContainer,
      x: this.hoopContainer.x === minX ? maxX : minX,
      duration: duration,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private createObstacles(width: number, height: number): void {
    if (this.difficulty === "easy") return;

    const obstacleY = (this.hoopPos.y + this.ballStart.y) / 2;
    const r = this.rimRadius;
    const minX = r * 1.5;
    const maxX = width - r * 1.5;

    if (this.difficulty === "medium") {
      // 1 moving blocker in the middle
      this.spawnBlocker(obstacleY, 2100, minX, maxX, "🛡️");
    } else if (this.difficulty === "hard") {
      // 2 moving blockers sliding in opposite directions at different speeds
      this.spawnBlocker(obstacleY + 45, 2300, minX, maxX, "✋");
      this.spawnBlocker(obstacleY - 45, 1600, maxX, minX, "🛡️");
    }
  }

  private spawnBlocker(y: number, speed: number, startX: number, targetX: number, emoji: string): void {
    const container = this.add.container(startX, y);
    container.setDepth(12);

    // Wooden paddle stick
    const stick = this.add.graphics();
    stick.fillStyle(0x8b5a2b, 1);
    stick.fillRect(-3, 0, 6, 60);
    container.add(stick);

    // Blocker board circle
    const plate = this.add.graphics();
    plate.fillStyle(PALETTE.pink, 0.9);
    plate.fillCircle(0, 0, 24);
    plate.lineStyle(3, PALETTE.pinkDark, 1);
    plate.strokeCircle(0, 0, 24);
    container.add(plate);

    const label = this.add.text(0, 0, emoji, { fontSize: "26px" }).setOrigin(0.5);
    label.setPadding(8);
    container.add(label);

    this.obstacles.push(container);

    const t = this.tweens.add({
      targets: container,
      x: targetX,
      duration: speed,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.obstacleTweens.push(t);
  }

  private spawnBall(): void {
    const fontSize = Phaser.Math.Clamp(this.scale.width * 0.07, 48, 68);
    this.ball = this.add
      .text(this.ballStart.x, this.ballStart.y, "🏀", { fontSize: `${fontSize}px` })
      .setPadding(16)
      .setOrigin(0.5)
      .setDepth(20);
    this.track(this.ball);
  }

  private shootBall(pointer: Phaser.Input.Pointer): void {
    // If tapping close to settings or home chrome buttons, don't trigger shoot!
    if (pointer.y < 120 && (pointer.x < 240 || pointer.x > this.scale.width - 120)) return;
    
    if (this.inFlight || !this.ball || !this.hoopContainer) return;
    this.inFlight = true;
    this.scored = false;
    this.statusText?.setText("");

    const duration = 800; // Total launch-to-landing flight time
    const peakY = this.hoopPos.y - 70; // Peak arc height

    // Horizontal linear flight tween
    this.tweens.add({
      targets: this.ball,
      x: pointer.x,
      duration: duration,
      ease: "Linear",
    });

    // Vertical parabolic curve (Upward Quad.easeOut followed by Downward Quad.easeIn)
    this.tweens.add({
      targets: this.ball,
      y: peakY,
      duration: duration / 2,
      ease: "Quad.easeOut",
      onComplete: () => {
        // Downward fall phase
        if (!this.inFlight || !this.ball) return;
        this.tweens.add({
          targets: this.ball,
          y: this.scale.height + 80,
          duration: duration / 2,
          ease: "Quad.easeIn",
          onComplete: () => {
            if (this.inFlight && !this.scored) {
              this.handleMiss();
            }
          },
        });
      },
    });
  }

  private handleBlock(blocker: Phaser.GameObjects.Container): void {
    if (!this.ball) return;
    this.inFlight = false;
    this.tweens.killTweensOf(this.ball);
    this.audio.playSfx("soft-bounce");

    // Spawn a quick blocked indicator text
    const text = this.add
      .text(this.ball!.x, this.ball!.y - 20, "Blocked! ✋", {
        fontFamily: FONT_DISPLAY,
        fontSize: "24px",
        color: PALETTE_CSS.red,
        fontStyle: "700",
      })
      .setOrigin(0.5)
      .setDepth(25);
    this.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: 700,
      onComplete: () => text.destroy(),
    });

    this.statusText?.setText("Defense blocked the shot!");

    // Bounce backwards/downwards animation
    const bounceLeft = this.ball!.x < blocker.x;
    this.tweens.add({
      targets: this.ball,
      x: this.ball!.x + (bounceLeft ? -65 : 65),
      y: this.ball!.y + 80,
      angle: bounceLeft ? -270 : 270,
      duration: 350,
      ease: "Quad.easeOut",
      onComplete: () => {
        this.tweens.add({
          targets: this.ball,
          y: this.scale.height + 80,
          alpha: 0,
          duration: 350,
          ease: "Quad.easeIn",
          onComplete: () => this.resetBall(),
        });
      },
    });
  }

  private celebrate(): void {
    if (!this.hoopContainer) return;
    const hx = this.hoopContainer.x;
    const hy = this.hoopPos.y;

    for (let i = 0; i < 6; i++) {
      const spark = this.add
        .text(hx + Phaser.Math.Between(-30, 30), hy + Phaser.Math.Between(-10, 10), "✨", { fontSize: "26px" })
        .setPadding(8)
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

    if (this.ball) {
      this.tweens.add({
        targets: this.ball,
        y: this.hoopPos.y + 110,
        scale: 0.72,
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
    this.scored = false;
    this.statusText?.setText("Tap anywhere to shoot the ball towards that spot!");
  }

  update(): void {
    if (!this.inFlight || !this.ball || !this.hoopContainer) return;

    // 1. Check obstacles collision (only check active, unblocked ball)
    if (!this.scored) {
      for (const obstacle of this.obstacles) {
        const dist = Phaser.Math.Distance.Between(this.ball.x, this.ball.y, obstacle.x, obstacle.y);
        if (dist < 42) {
          this.handleBlock(obstacle);
          return;
        }
      }
    }

    // 2. Check score (only when ball is moving downwards, i.e., after the peak y)
    if (!this.scored && this.ball.y >= this.hoopPos.y - 12 && this.ball.y <= this.hoopPos.y + 22) {
      const diffX = Math.abs(this.ball.x - this.hoopContainer.x);
      const hitTolerance = this.rimRadius * 0.65;
      
      if (diffX <= hitTolerance) {
        this.scored = true;
        this.tweens.killTweensOf(this.ball);
        this.handleScore();
        return;
      } else if (diffX <= this.rimRadius * 1.3) {
        this.scored = true;
        this.tweens.killTweensOf(this.ball);
        this.handleRimBounce();
        return;
      }
    }
  }

  private createSettingButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    isActive: boolean,
    onClick: () => void
  ): void {
    const btnContainer = this.add.container(x, y);

    const g = this.add.graphics();
    const color = isActive ? PALETTE.green : PALETTE.blue;
    const shadow = isActive ? PALETTE.greenDark : PALETTE.blueDark;

    g.fillStyle(shadow, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, 14);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    btnContainer.add(g);

    const text = this.add
      .text(0, -2, label, {
        fontFamily: FONT_DISPLAY,
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "600",
      })
      .setOrigin(0.5);
    btnContainer.add(text);

    btnContainer.setSize(w, h);
    btnContainer.setInteractive({ useHandCursor: true });
    
    btnContainer.on("pointerdown", () => {
      this.tweens.add({ targets: btnContainer, scale: 0.92, duration: 80 });
    });
    btnContainer.on("pointerup", () => {
      this.tweens.add({ targets: btnContainer, scale: 1, duration: 120 });
      onClick();
    });
    btnContainer.on("pointerout", () => {
      this.tweens.add({ targets: btnContainer, scale: 1, duration: 120 });
    });

    container.add(btnContainer);
  }

  private openSettings(): void {
    let tempDiff = this.difficulty;

    let settingsContainer: Phaser.GameObjects.Container | null = null;

    const drawSettings = () => {
      if (settingsContainer) settingsContainer.destroy();
      settingsContainer = this.add.container(0, 0).setDepth(2000);

      // Blocker overlay
      const overlay = this.add
        .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.65)
        .setOrigin(0, 0)
        .setInteractive();
      settingsContainer.add(overlay);

      // Panel
      const panelW = Math.min(540, this.scale.width * 0.9);
      const panelH = Math.min(300, this.scale.height * 0.7);
      const cx = this.scale.width / 2;
      const cy = this.scale.height / 2;

      const panel = this.add.graphics();
      panel.fillStyle(PALETTE.cream, 1);
      panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 28);
      panel.lineStyle(6, PALETTE.yellow, 1);
      panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 28);
      settingsContainer.add(panel);

      // Title
      const title = this.add
        .text(cx, cy - panelH / 2 + 38, "🏀 Hoops Settings 🏀", {
          fontFamily: FONT_DISPLAY,
          fontSize: "28px",
          color: PALETTE_CSS.textDark,
          fontStyle: "700",
        })
        .setOrigin(0.5);
      settingsContainer.add(title);

      // Row 1: Difficulty Mode
      const speedY = cy - 10;
      const speedLabel = this.add
        .text(cx, speedY - 26, "Difficulty & Blocker Obstacles", {
          fontFamily: FONT_BODY,
          fontSize: "18px",
          color: PALETTE_CSS.textDark,
          fontStyle: "600",
        })
        .setOrigin(0.5);
      settingsContainer.add(speedLabel);

      const speedOptions = [
        { label: "Easy (No Blockers)", val: "easy" },
        { label: "Medium (1 Blocker)", val: "medium" },
        { label: "Hard (2 Blockers!)", val: "hard" },
      ];
      speedOptions.forEach((opt, idx) => {
        const bx = cx + (idx - 1.0) * 155;
        this.createSettingButton(
          settingsContainer!,
          bx,
          speedY,
          140,
          40,
          opt.label,
          tempDiff === opt.val,
          () => {
            this.audio.playSfx("tap-soft");
            tempDiff = opt.val;
            drawSettings();
          }
        );
      });

      // Row 2: Action Buttons
      const saveBtn = new Button(this, cx, cy + panelH / 2 - 50, {
        label: "Save & Restart",
        width: 240,
        height: 64,
        fontSize: 24,
        color: PALETTE.green,
        shadowColor: PALETTE.greenDark,
        onClick: () => {
          this.audio.playSfx("win-chime");
          this.difficulty = tempDiff;
          settingsContainer?.destroy();
          this.layoutAll(this.scale.width, this.scale.height);
        },
      });
      settingsContainer.add(saveBtn);

      const closeBtn = new Button(this, cx + panelW / 2 - 32, cy - panelH / 2 + 32, {
        label: "❌",
        width: 48,
        height: 48,
        fontSize: 18,
        color: PALETTE.red,
        shadowColor: PALETTE.redDark,
        onClick: () => {
          this.audio.playSfx("tap-soft");
          settingsContainer?.destroy();
        },
      });
      settingsContainer.add(closeBtn);
    };

    drawSettings();
  }
}

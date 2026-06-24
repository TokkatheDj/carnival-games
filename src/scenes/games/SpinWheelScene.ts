import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { Button } from "../../ui/Button";
import { ScoreBadge } from "../../ui/ScoreBadge";
import { ModalDialog } from "../../ui/ModalDialog";
import { FONT_BODY, FONT_DISPLAY, GAME_COLORS, PALETTE, PALETTE_CSS } from "../../config/theme";

interface Prize {
  emoji: string;
  label: string;
  tier: "small" | "big";
}

const PRIZES: Prize[] = [
  { emoji: "🧸", label: "Teddy Bear", tier: "small" },
  { emoji: "🎈", label: "Balloon", tier: "small" },
  { emoji: "⭐", label: "Star", tier: "small" },
  { emoji: "🍭", label: "Lollipop", tier: "small" },
  { emoji: "🎁", label: "Gift", tier: "small" },
  { emoji: "🌟", label: "Super Star", tier: "small" },
  { emoji: "🍬", label: "Candy", tier: "small" },
  { emoji: "🏆", label: "Trophy", tier: "big" },
];

/**
 * Prize wheel — there is no losing outcome, only a "small" vs "big"
 * celebration tier, so every spin reads as a win.
 */
export class SpinWheelScene extends BaseScene {
  private layoutObjects: Phaser.GameObjects.GameObject[] = [];
  private wheelContainer?: Phaser.GameObjects.Container;
  private scoreBadge?: ScoreBadge;
  private statusText?: Phaser.GameObjects.Text;
  private spinButton?: Button;
  private scoreValue = 0;
  private spinning = false;
  private lastWheelAngle = 0;

  constructor() {
    super("SpinWheelScene");
  }

  protected onCreate(): void {
    this.layoutAll(this.scale.width, this.scale.height);
  }

  protected onResize(width: number, height: number): void {
    if (this.spinning) return;
    this.layoutAll(width, height);
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.layoutObjects.push(obj);
    return obj;
  }

  private clearLayout(): void {
    this.layoutObjects.forEach((o) => o.destroy());
    this.layoutObjects = [];
    this.wheelContainer = undefined;
  }

  private layoutAll(width: number, height: number): void {
    this.clearLayout();
    this.cameras.main.setBackgroundColor(PALETTE_CSS.skyDeep);

    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.skyDeep, 1);
    bg.fillRect(0, 0, width, height);
    this.track(bg);

    const topAreaHeight = Math.max(100, height * 0.14);
    this.track(
      this.add
        .text(width / 2, topAreaHeight * 0.5, "🎡 Prize Wheel 🎡", {
          fontFamily: FONT_DISPLAY,
          fontSize: `${Phaser.Math.Clamp(width * 0.038, 22, 34)}px`,
          color: "#ffffff",
          fontStyle: "700",
        })
        .setOrigin(0.5),
    );
    this.scoreBadge = this.track(new ScoreBadge(this, width - 190, topAreaHeight * 0.5, this.scoreValue));

    const bottomReserved = Math.max(150, height * 0.22);
    const wheelAreaHeight = height - topAreaHeight - bottomReserved;
    const radius = Math.min(wheelAreaHeight, width * 0.7) / 2 - 10;
    const cx = width / 2;
    const cy = topAreaHeight + wheelAreaHeight / 2 + 10;

    this.wheelContainer = this.add.container(cx, cy);
    this.drawWheel(this.wheelContainer, radius);
    this.track(this.wheelContainer);

    const pointer = this.add.triangle(cx, cy - radius - 14, 0, 0, 24, 0, 12, 26, PALETTE.yellow);
    pointer.setStrokeStyle(3, PALETTE.yellowDark);
    this.track(pointer);

    this.statusText = this.track(
      this.add
        .text(width / 2, height - bottomReserved + 36, "Tap Spin to win a prize!", {
          fontFamily: FONT_BODY,
          fontSize: "22px",
          color: "#ffffff",
          align: "center",
          wordWrap: { width: width * 0.8 },
        })
        .setOrigin(0.5),
    );

    this.spinButton = this.track(
      new Button(this, width / 2, height - 56, {
        label: "🎡 Spin!",
        width: 220,
        height: 84,
        fontSize: 30,
        color: PALETTE.yellow,
        shadowColor: PALETTE.yellowDark,
        textColor: PALETTE_CSS.textDark,
        onClick: () => this.spin(),
      }),
    );
  }

  private drawWheel(container: Phaser.GameObjects.Container, radius: number): void {
    const wedgeAngle = 360 / PRIZES.length;
    const g = this.add.graphics();

    PRIZES.forEach((_prize, i) => {
      const startDeg = -90 + i * wedgeAngle;
      const endDeg = startDeg + wedgeAngle;
      g.fillStyle(GAME_COLORS[i % GAME_COLORS.length], 1);
      g.beginPath();
      g.moveTo(0, 0);
      g.arc(0, 0, radius, Phaser.Math.DegToRad(startDeg), Phaser.Math.DegToRad(endDeg), false);
      g.closePath();
      g.fillPath();
    });

    g.lineStyle(3, 0xffffff, 0.55);
    for (let i = 0; i < PRIZES.length; i++) {
      const deg = -90 + i * wedgeAngle;
      const rad = Phaser.Math.DegToRad(deg);
      g.lineBetween(0, 0, radius * Math.cos(rad), radius * Math.sin(rad));
    }
    g.fillStyle(PALETTE.cream, 1);
    g.fillCircle(0, 0, radius * 0.14);
    container.add(g);

    PRIZES.forEach((prize, i) => {
      const midDeg = -90 + i * wedgeAngle + wedgeAngle / 2;
      const midRad = Phaser.Math.DegToRad(midDeg);
      const ex = radius * 0.64 * Math.cos(midRad);
      const ey = radius * 0.64 * Math.sin(midRad);
      const emojiText = this.add
        .text(ex, ey, prize.emoji, { fontSize: `${Math.max(20, radius * 0.22)}px` })
        .setOrigin(0.5);
      container.add(emojiText);
    });
  }

  private spin(): void {
    if (this.spinning || !this.wheelContainer) return;
    this.spinning = true;
    
    if (this.spinButton && this.spinButton.input) {
      this.spinButton.input.enabled = false;
      this.spinButton.setAlpha(0.65);
    }
    this.statusText?.setText("Spinning...");
    this.lastWheelAngle = this.wheelContainer.angle;

    const targetIndex = Phaser.Math.Between(0, PRIZES.length - 1);
    const wedgeAngle = 360 / PRIZES.length;
    const targetAngle = Phaser.Math.Wrap(-wedgeAngle / 2 - targetIndex * wedgeAngle, 0, 360);
    const currentMod = Phaser.Math.Wrap(this.wheelContainer.angle, 0, 360);
    let delta = targetAngle - currentMod;
    if (delta <= 0) delta += 360;

    const extraSpins = 5;
    const finalAngle = this.wheelContainer.angle + extraSpins * 360 + delta;

    this.tweens.add({
      targets: this.wheelContainer,
      angle: finalAngle,
      duration: 2600,
      ease: "Cubic.easeOut",
      onComplete: () => this.onSpinComplete(targetIndex),
    });
  }

  private onSpinComplete(index: number): void {
    const prize = PRIZES[index];
    this.spinning = false;
    
    if (this.spinButton && this.spinButton.input) {
      this.spinButton.input.enabled = true;
      this.spinButton.setAlpha(1);
    }
    this.scoreValue += 1;
    this.scoreBadge?.addScore(1);

    if (prize.tier === "big") {
      this.audio.playSfx("big-win-fanfare");
      this.statusText?.setText(`AMAZING! You won the ${prize.label}!`);
      new ModalDialog(this, {
        emoji: prize.emoji,
        title: "Big Prize!",
        message: `You won the ${prize.label}! Incredible spin!`,
        buttons: [
          { label: "Spin Again", color: PALETTE.green, shadowColor: PALETTE.greenDark, onClick: () => this.spin() },
          { label: "Home", color: PALETTE.blue, shadowColor: PALETTE.blueDark, onClick: () => this.goHome() },
        ],
      });
    } else {
      this.audio.playSfx("prize-chime");
      this.statusText?.setText(`You won a ${prize.label}! ${prize.emoji}`);
    }
  }

  update(): void {
    if (this.spinning && this.wheelContainer) {
      const currentAngle = this.wheelContainer.angle;
      const wedgeAngle = 360 / PRIZES.length;
      
      const relativeAngle = -90 - currentAngle;
      const lastRelativeAngle = -90 - this.lastWheelAngle;
      
      const currentWedge = Math.floor(Phaser.Math.Wrap(relativeAngle, 0, 360) / wedgeAngle);
      const lastWedge = Math.floor(Phaser.Math.Wrap(lastRelativeAngle, 0, 360) / wedgeAngle);
      
      if (currentWedge !== lastWedge) {
        this.audio.playSfx("tap-soft");
      }
      this.lastWheelAngle = currentAngle;
    }
  }
}

import Phaser from "phaser";
import { FONT_DISPLAY, PALETTE, PALETTE_CSS } from "../config/theme";

/** Small persistent score readout shown in the corner of every mini-game. */
export class ScoreBadge extends Phaser.GameObjects.Container {
  private scoreText: Phaser.GameObjects.Text;
  private value: number;

  constructor(scene: Phaser.Scene, x: number, y: number, initial: number = 0) {
    super(scene, x, y);
    this.value = initial;

    const bg = scene.add.graphics();
    bg.fillStyle(PALETTE.white, 0.92);
    bg.fillRoundedRect(-70, -32, 140, 64, 32);
    this.add(bg);

    const star = scene.add.text(-44, 0, "⭐", { fontSize: "28px" }).setOrigin(0.5);
    this.add(star);

    this.scoreText = scene.add
      .text(18, 1, String(initial), {
        fontFamily: FONT_DISPLAY,
        fontSize: "26px",
        color: PALETTE_CSS.textDark,
        fontStyle: "700",
      })
      .setOrigin(0.5);
    this.add(this.scoreText);

    scene.add.existing(this);
  }

  addScore(amount: number = 1): void {
    this.value += amount;
    this.scoreText.setText(String(this.value));
    this.scene.tweens.add({
      targets: this,
      scale: 1.15,
      duration: 110,
      yoyo: true,
      ease: "Sine.easeOut",
    });
  }

  getValue(): number {
    return this.value;
  }

  reposition(x: number, y: number): void {
    this.setPosition(x, y);
  }
}

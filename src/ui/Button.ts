import Phaser from "phaser";
import { FONT_DISPLAY, PALETTE, TOUCH_TARGET_MIN } from "../config/theme";

export interface ButtonOptions {
  width?: number;
  height?: number;
  label: string;
  color?: number;
  shadowColor?: number;
  textColor?: string;
  fontSize?: number;
  onClick: () => void;
}

/**
 * Shared tappable button: rounded shape, drop-shadow "pop" look, bouncy
 * press animation. Every game routes its taps through this so touch
 * targets and feedback feel consistent across the whole app.
 */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  private btnWidth: number;
  private btnHeight: number;
  private color: number;
  private shadowColor: number;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOptions) {
    super(scene, x, y);

    this.btnWidth = Math.max(opts.width ?? 200, TOUCH_TARGET_MIN);
    this.btnHeight = Math.max(opts.height ?? 80, TOUCH_TARGET_MIN);
    this.color = opts.color ?? PALETTE.red;
    this.shadowColor = opts.shadowColor ?? PALETTE.redDark;

    this.bg = scene.add.graphics();
    this.drawBackground(1);
    this.add(this.bg);

    this.labelText = scene.add.text(0, -2, opts.label, {
      fontFamily: FONT_DISPLAY,
      fontSize: `${opts.fontSize ?? 30}px`,
      color: opts.textColor ?? "#ffffff",
      fontStyle: "600",
    });
    this.labelText.setPadding({ top: 8, bottom: 8, left: 8, right: 8 });
    this.labelText.setOrigin(0.5);
    this.add(this.labelText);

    this.setSize(this.btnWidth, this.btnHeight + 8);
    this.setInteractive({ useHandCursor: true });

    this.on("pointerdown", () => {
      scene.tweens.add({
        targets: this,
        scale: 0.92,
        duration: 80,
        ease: "Sine.easeOut",
      });
    });
    const release = () => {
      scene.tweens.add({
        targets: this,
        scale: 1,
        duration: 180,
        ease: "Back.easeOut",
      });
    };
    this.on("pointerup", () => {
      release();
      opts.onClick();
    });
    this.on("pointerout", release);

    scene.add.existing(this);
  }

  private drawBackground(depth: number): void {
    const w = this.btnWidth;
    const h = this.btnHeight;
    const r = h / 2;
    this.bg.clear();
    // shadow / depth layer
    this.bg.fillStyle(this.shadowColor, 1);
    this.bg.fillRoundedRect(-w / 2, -h / 2 + 6 * depth, w, h, r);
    // top face
    this.bg.fillStyle(this.color, 1);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    // soft highlight near top
    this.bg.fillStyle(0xffffff, 0.18);
    this.bg.fillRoundedRect(-w / 2 + w * 0.08, -h / 2 + h * 0.12, w * 0.84, h * 0.32, r * 0.6);
  }

  setLabel(text: string): void {
    this.labelText.setText(text);
  }
}

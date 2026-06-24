import Phaser from "phaser";
import { FONT_BODY, FONT_DISPLAY, PALETTE, PALETTE_CSS } from "../config/theme";
import { Button } from "./Button";

export interface ModalButtonConfig {
  label: string;
  color?: number;
  shadowColor?: number;
  onClick: () => void;
}

export interface ModalDialogOptions {
  title: string;
  message?: string;
  emoji?: string;
  buttons: ModalButtonConfig[];
}

/**
 * The ONE place every game reports an outcome through. Always framed
 * positively — there is no "fail" variant of this dialog, only different
 * titles/emoji/messages — so "never punishing" is enforced by having a
 * single shared component rather than relying on each game to remember.
 */
export class ModalDialog extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, opts: ModalDialogOptions) {
    super(scene, 0, 0);

    const { width, height } = scene.scale;
    const cx = width / 2;
    const cy = height / 2;

    const overlay = scene.add
      .rectangle(0, 0, width, height, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setInteractive();
    this.add(overlay);

    const panelW = Math.min(540, width * 0.86);
    const panelH = Math.min(440, height * 0.78);

    const panel = scene.add.graphics();
    panel.fillStyle(PALETTE.cream, 1);
    panel.fillRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 32);
    panel.lineStyle(8, PALETTE.yellow, 1);
    panel.strokeRoundedRect(cx - panelW / 2, cy - panelH / 2, panelW, panelH, 32);
    this.add(panel);

    let cursorY = cy - panelH / 2 + 56;

    if (opts.emoji) {
      const emojiText = scene.add
        .text(cx, cursorY, opts.emoji, { fontSize: "64px" })
        .setOrigin(0.5)
        .setPadding(16);
      this.add(emojiText);
      cursorY += 84;
    } else {
      cursorY += 20;
    }

    const titleText = scene.add
      .text(cx, cursorY, opts.title, {
        fontFamily: FONT_DISPLAY,
        fontSize: "34px",
        color: PALETTE_CSS.textDark,
        fontStyle: "700",
        align: "center",
        wordWrap: { width: panelW - 60 },
      })
      .setOrigin(0.5);
    this.add(titleText);
    cursorY += titleText.height + 24;

    if (opts.message) {
      const msgText = scene.add
        .text(cx, cursorY, opts.message, {
          fontFamily: FONT_BODY,
          fontSize: "22px",
          color: PALETTE_CSS.textDark,
          align: "center",
          wordWrap: { width: panelW - 60 },
        })
        .setOrigin(0.5);
      this.add(msgText);
    }

    const btnY = cy + panelH / 2 - 68;
    const n = opts.buttons.length;
    const spacing = Math.min(230, (panelW - 40) / n);
    opts.buttons.forEach((b, i) => {
      const bx = cx + (i - (n - 1) / 2) * spacing;
      const btn = new Button(scene, bx, btnY, {
        label: b.label,
        color: b.color ?? PALETTE.green,
        shadowColor: b.shadowColor ?? PALETTE.greenDark,
        width: Math.min(200, spacing - 16),
        height: 72,
        fontSize: 24,
        onClick: () => {
          this.close();
          b.onClick();
        },
      });
      this.add(btn);
    });

    scene.add.existing(this);
    this.setScale(0.6);
    this.setAlpha(0);
    scene.tweens.add({
      targets: this,
      scale: 1,
      alpha: 1,
      duration: 320,
      ease: "Back.easeOut",
    });
  }

  close(): void {
    this.scene.tweens.add({
      targets: this,
      scale: 0.7,
      alpha: 0,
      duration: 180,
      ease: "Sine.easeIn",
      onComplete: () => this.destroy(),
    });
  }
}

import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { Button } from "../../ui/Button";
import { ScoreBadge } from "../../ui/ScoreBadge";
import { ModalDialog } from "../../ui/ModalDialog";
import { FONT_BODY, FONT_DISPLAY, PALETTE, PALETTE_CSS } from "../../config/theme";

const SYMBOLS = ["🍒", "🍋", "🍊", "🍉", "⭐", "🎈"];
const REEL_DURATIONS = [600, 850, 1100];

/**
 * Symbol-matching spinner styled like a carnival prize booth — explicitly
 * not a gambling mechanic: no currency, no bets, no "credits run out".
 * Every outcome is framed positively; only the celebration tier differs.
 */
export class SlotsScene extends BaseScene {
  private scoreValue = 0;
  private lastSymbols: string[] = [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]];
  private layoutObjects: Phaser.GameObjects.GameObject[] = [];
  private reelTexts: Phaser.GameObjects.Text[] = [];
  private spinButton?: Button;
  private statusText?: Phaser.GameObjects.Text;
  private scoreBadge?: ScoreBadge;
  private spinning = false;

  constructor() {
    super("SlotsScene");
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
  }

  private layoutAll(width: number, height: number): void {
    this.clearLayout();
    this.cameras.main.setBackgroundColor(PALETTE_CSS.skyDeep);

    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.skyDeep, 1);
    bg.fillRect(0, 0, width, height);
    this.track(bg);

    const topAreaHeight = Math.max(110, height * 0.16);
    this.track(
      this.add
        .text(width / 2, topAreaHeight * 0.5, "🎰 Carnival Spin Reels 🎰", {
          fontFamily: FONT_DISPLAY,
          fontSize: `${Phaser.Math.Clamp(width * 0.038, 22, 36)}px`,
          color: "#ffffff",
          fontStyle: "700",
          align: "center",
        })
        .setOrigin(0.5),
    );

    this.scoreBadge = this.track(new ScoreBadge(this, width - 190, topAreaHeight * 0.5, this.scoreValue));

    const reelAreaTop = topAreaHeight + 30;
    const reelAreaHeight = Math.min(height * 0.4, 260);
    const reelSize = Math.min(reelAreaHeight, (width - 120) / 3.4);
    const gap = reelSize * 0.25;
    const totalW = reelSize * 3 + gap * 2;
    const startX = width / 2 - totalW / 2 + reelSize / 2;
    const reelY = reelAreaTop + reelAreaHeight / 2;

    const frame = this.add.graphics();
    frame.fillStyle(PALETTE.orangeDark, 1);
    frame.fillRoundedRect(width / 2 - totalW / 2 - 24, reelAreaTop - 14, totalW + 48, reelAreaHeight + 28, 32);
    frame.fillStyle(PALETTE.orange, 1);
    frame.fillRoundedRect(width / 2 - totalW / 2 - 16, reelAreaTop - 6, totalW + 32, reelAreaHeight + 12, 28);
    this.track(frame);

    this.reelTexts = [];
    for (let i = 0; i < 3; i++) {
      const cx = startX + i * (reelSize + gap);
      const slot = this.add.graphics();
      slot.fillStyle(PALETTE.cream, 1);
      slot.fillRoundedRect(cx - reelSize / 2, reelY - reelSize / 2, reelSize, reelSize, 20);
      this.track(slot);

      const symbolText = this.add
        .text(cx, reelY, this.lastSymbols[i], { fontSize: `${reelSize * 0.55}px` })
        .setOrigin(0.5);
      this.track(symbolText);
      this.reelTexts.push(symbolText);
    }

    this.statusText = this.track(
      this.add
        .text(width / 2, reelAreaTop + reelAreaHeight + 36, "Tap Spin to play!", {
          fontFamily: FONT_BODY,
          fontSize: "22px",
          color: "#ffffff",
          align: "center",
        })
        .setOrigin(0.5),
    );

    this.spinButton = this.track(
      new Button(this, width / 2, height - Math.max(90, height * 0.13), {
        label: "🎰 Spin!",
        width: 260,
        height: 92,
        fontSize: 32,
        color: PALETTE.orange,
        shadowColor: PALETTE.orangeDark,
        onClick: () => this.spin(),
      }),
    );
  }

  private spinReel(text: Phaser.GameObjects.Text, totalDuration: number, onDone: (symbol: string) => void): void {
    const interval = 60;
    let elapsed = 0;
    const ev = this.time.addEvent({
      delay: interval,
      loop: true,
      callback: () => {
        elapsed += interval;
        text.setText(Phaser.Utils.Array.GetRandom(SYMBOLS));
        if (elapsed >= totalDuration) {
          ev.remove();
          const finalSymbol = Phaser.Utils.Array.GetRandom(SYMBOLS);
          text.setText(finalSymbol);
          this.tweens.add({ targets: text, scale: 1.25, duration: 130, yoyo: true, ease: "Sine.easeOut" });
          onDone(finalSymbol);
        }
      },
    });
  }

  private spin(): void {
    if (this.spinning || !this.statusText || this.reelTexts.length === 0) return;
    this.spinning = true;
    this.spinButton?.disableInteractive();
    this.statusText.setText("Spinning...");

    const results: string[] = [];
    let doneCount = 0;
    this.reelTexts.forEach((text, i) => {
      this.spinReel(text, REEL_DURATIONS[i], (sym) => {
        results[i] = sym;
        doneCount++;
        if (doneCount === this.reelTexts.length) this.evaluateSpin(results);
      });
    });
  }

  private evaluateSpin(results: string[]): void {
    this.lastSymbols = results;
    this.spinning = false;
    this.spinButton?.setInteractive({ useHandCursor: true });

    const uniqueCount = new Set(results).size;

    if (uniqueCount === 1) {
      this.audio.playSfx("jackpot-jingle");
      this.scoreBadge?.addScore(1);
      this.statusText?.setText("JACKPOT!");
      this.reelTexts.forEach((t) =>
        this.tweens.add({ targets: t, angle: { from: -8, to: 8 }, duration: 90, yoyo: true, repeat: 3 }),
      );
      new ModalDialog(this, {
        emoji: "🎉",
        title: "JACKPOT!",
        message: "All three matched — amazing spin!",
        buttons: [
          { label: "Spin Again", color: PALETTE.green, shadowColor: PALETTE.greenDark, onClick: () => {} },
          { label: "Home", color: PALETTE.blue, shadowColor: PALETTE.blueDark, onClick: () => this.goHome() },
        ],
      });
    } else if (uniqueCount === 2) {
      this.audio.playSfx("almost-chime");
      this.statusText?.setText("Two matched — so close! Spin again!");
    } else {
      this.audio.playSfx("tap-soft");
      this.statusText?.setText("Spin again for a match!");
    }
  }
}

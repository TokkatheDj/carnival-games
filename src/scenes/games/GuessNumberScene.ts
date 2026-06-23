import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { ScoreBadge } from "../../ui/ScoreBadge";
import { ModalDialog } from "../../ui/ModalDialog";
import { FONT_BODY, FONT_DISPLAY, PALETTE, PALETTE_CSS } from "../../config/theme";

const MIN_NUMBER = 1;
const MAX_NUMBER = 20;
const MAX_ATTEMPTS = 7;

/**
 * Fortune-teller guessing booth. There is no harsh "lose" state: running
 * out of guesses just warmly reveals the number and offers another round.
 */
export class GuessNumberScene extends BaseScene {
  private secret = 0;
  private attemptsLeft = MAX_ATTEMPTS;
  private guessed: Map<number, "low" | "high"> = new Map();
  private scoreValue = 0;
  private layoutObjects: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("GuessNumberScene");
  }

  protected onCreate(): void {
    this.startRound();
  }

  protected onResize(width: number, height: number): void {
    this.layoutAll(width, height);
  }

  private startRound(): void {
    this.secret = Phaser.Math.Between(MIN_NUMBER, MAX_NUMBER);
    this.attemptsLeft = MAX_ATTEMPTS;
    this.guessed.clear();
    this.layoutAll(this.scale.width, this.scale.height);
  }

  private clearLayout(): void {
    this.layoutObjects.forEach((o) => o.destroy());
    this.layoutObjects = [];
  }

  private track<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.layoutObjects.push(obj);
    return obj;
  }

  private layoutAll(width: number, height: number): void {
    this.clearLayout();
    this.cameras.main.setBackgroundColor(PALETTE_CSS.skyDeepAlt);

    const bg = this.add.graphics();
    bg.fillGradientStyle(PALETTE.skyDeep, PALETTE.skyDeep, PALETTE.skyDeepAlt, PALETTE.skyDeepAlt, 1);
    bg.fillRect(0, 0, width, height);
    this.track(bg);

    const topAreaHeight = Math.max(170, height * 0.24);

    this.track(
      this.add
        .text(width / 2, topAreaHeight * 0.32, "🔮", { fontSize: `${Math.min(72, topAreaHeight * 0.4)}px` })
        .setOrigin(0.5),
    );

    const hintMessage = `I'm thinking of a number, ${MIN_NUMBER}-${MAX_NUMBER}!\nGuesses left: ${this.attemptsLeft}`;
    this.track(
      this.add
        .text(width / 2, topAreaHeight * 0.78, hintMessage, {
          fontFamily: FONT_BODY,
          fontSize: "22px",
          color: "#ffffff",
          align: "center",
        })
        .setOrigin(0.5),
    );

    this.track(new ScoreBadge(this, width - 190, topAreaHeight * 0.3, this.scoreValue));

    const isPortrait = height >= width;
    const cols = isPortrait ? 4 : 5;
    const rows = Math.ceil((MAX_NUMBER - MIN_NUMBER + 1) / cols);

    const gridTop = topAreaHeight + 16;
    const gridHeight = height - gridTop - 24;
    const gridWidth = width - 64;
    const cellW = gridWidth / cols;
    const cellH = gridHeight / rows;
    const tileSize = Math.min(cellW, cellH) * 0.82;

    for (let n = MIN_NUMBER; n <= MAX_NUMBER; n++) {
      const idx = n - MIN_NUMBER;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx = 32 + cellW * col + cellW / 2;
      const cy = gridTop + cellH * row + cellH / 2;
      this.track(this.createNumberTile(cx, cy, tileSize, n));
    }
  }

  private createNumberTile(x: number, y: number, size: number, n: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const state = this.guessed.get(n);
    const isGuessed = state !== undefined;

    const fillColor = isGuessed ? 0x4b3b6e : PALETTE.blue;
    const shadowColor = isGuessed ? 0x382c54 : PALETTE.blueDark;

    const g = this.add.graphics();
    g.fillStyle(shadowColor, 1);
    g.fillRoundedRect(-size / 2, -size / 2 + 6, size, size, 18);
    g.fillStyle(fillColor, isGuessed ? 0.55 : 1);
    g.fillRoundedRect(-size / 2, -size / 2, size, size, 18);
    container.add(g);

    const label = this.add
      .text(0, isGuessed ? -size * 0.12 : 0, String(n), {
        fontFamily: FONT_DISPLAY,
        fontSize: `${size * 0.42}px`,
        color: isGuessed ? "rgba(255,255,255,0.55)" : "#ffffff",
        fontStyle: "700",
      })
      .setOrigin(0.5);
    container.add(label);

    if (isGuessed) {
      const arrow = state === "low" ? "⬆️" : "⬇️";
      container.add(
        this.add.text(0, size * 0.26, arrow, { fontSize: `${size * 0.26}px` }).setOrigin(0.5),
      );
    } else {
      container.setSize(size, size);
      container.setInteractive({ useHandCursor: true });
      container.on("pointerdown", () =>
        this.tweens.add({ targets: container, scale: 0.9, duration: 70 }),
      );
      container.on("pointerout", () =>
        this.tweens.add({ targets: container, scale: 1, duration: 140 }),
      );
      container.on("pointerup", () => {
        this.tweens.add({ targets: container, scale: 1, duration: 140, ease: "Back.easeOut" });
        this.handleGuess(n);
      });
    }

    return container;
  }

  private handleGuess(n: number): void {
    if (n === this.secret) {
      this.scoreValue += 1;
      this.audio.playSfx("win-chime");
      new ModalDialog(this, {
        emoji: "🎉",
        title: "You found it!",
        message: `The number was ${n}! Great guessing!`,
        buttons: [
          { label: "Play Again", color: PALETTE.green, shadowColor: PALETTE.greenDark, onClick: () => this.startRound() },
          { label: "Home", color: PALETTE.blue, shadowColor: PALETTE.blueDark, onClick: () => this.goHome() },
        ],
      });
      return;
    }

    this.guessed.set(n, n < this.secret ? "low" : "high");
    this.attemptsLeft -= 1;

    if (this.attemptsLeft <= 0) {
      this.audio.playSfx("soft-reveal");
      new ModalDialog(this, {
        emoji: "🌟",
        title: "So close!",
        message: `It was ${this.secret}! Want to try again?`,
        buttons: [
          { label: "Try Again", color: PALETTE.green, shadowColor: PALETTE.greenDark, onClick: () => this.startRound() },
          { label: "Home", color: PALETTE.blue, shadowColor: PALETTE.blueDark, onClick: () => this.goHome() },
        ],
      });
      return;
    }

    this.audio.playSfx("tap-soft");
    this.layoutAll(this.scale.width, this.scale.height);
  }
}

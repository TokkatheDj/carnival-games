import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { ScoreBadge } from "../../ui/ScoreBadge";
import { ModalDialog } from "../../ui/ModalDialog";
import { Button } from "../../ui/Button";
import { FONT_BODY, FONT_DISPLAY, PALETTE, PALETTE_CSS } from "../../config/theme";

const MIN_NUMBER = 1;
const MAX_NUMBER = 20;
const MAX_ATTEMPTS = 7;

/**
 * Fortune-teller guessing booth. There is no harsh "lose" state: running
 * out of guesses just warmly reveals the number and offers another round.
 * Supports Settings (range, attempts, card elimination toggling).
 */
export class GuessNumberScene extends BaseScene {
  private secret = 0;
  private minNumber = MIN_NUMBER;
  private maxNumber = MAX_NUMBER;
  private maxAttempts = MAX_ATTEMPTS;
  private attemptsLeft = MAX_ATTEMPTS;
  private guessed: Map<number, "low" | "high"> = new Map();
  private eliminated: Set<number> = new Set();
  private eliminateMode = false;
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
    this.secret = Phaser.Math.Between(this.minNumber, this.maxNumber);
    this.attemptsLeft = this.maxAttempts;
    this.guessed.clear();
    this.eliminated.clear();
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

    const hintMessage = `I'm thinking of a number, ${this.minNumber}-${this.maxNumber}!\nGuesses left: ${this.attemptsLeft}`;
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

    // Settings Gear Button
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

    const isPortrait = height >= width;
    const count = this.maxNumber - this.minNumber + 1;
    let cols = 5;
    if (count <= 10) {
      cols = isPortrait ? 2 : 5;
    } else if (count <= 20) {
      cols = isPortrait ? 4 : 5;
    } else if (count <= 50) {
      cols = isPortrait ? 5 : 10;
    } else { // 100
      cols = isPortrait ? 8 : 10;
    }
    const rows = Math.ceil(count / cols);

    const gridTop = topAreaHeight + 16;
    const gridHeight = height - gridTop - 24;
    const gridWidth = width - 64;
    const cellW = gridWidth / cols;
    const cellH = gridHeight / rows;
    const tileSize = Math.min(cellW, cellH) * 0.82;

    for (let n = this.minNumber; n <= this.maxNumber; n++) {
      const idx = n - this.minNumber;
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
    const isEliminated = this.eliminated.has(n);

    // Render ghost/eliminated cards
    if (isEliminated && !isGuessed) {
      const g = this.add.graphics();
      g.fillStyle(0x382c54, 0.4);
      g.fillRoundedRect(-size / 2, -size / 2 + 4, size, size, 18);
      g.fillStyle(0x281c44, 0.3);
      g.fillRoundedRect(-size / 2, -size / 2, size, size, 18);
      container.add(g);

      const label = this.add
        .text(0, 0, String(n), {
          fontFamily: FONT_DISPLAY,
          fontSize: `${size * 0.42}px`,
          color: "rgba(255,255,255,0.08)",
          fontStyle: "700",
        })
        .setOrigin(0.5);
      container.add(label);
      container.setAlpha(0.35);
      return container;
    }

    const fillColor = isGuessed ? 0x4b3b6e : PALETTE.cream;
    const shadowColor = isGuessed ? 0x382c54 : 0xe0d6b8;

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
        color: isGuessed ? "rgba(255,255,255,0.55)" : PALETTE_CSS.textDark,
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

    // Handle deductive card elimination
    if (this.eliminateMode) {
      if (n < this.secret) {
        for (let x = this.minNumber; x <= n; x++) {
          this.eliminated.add(x);
        }
      } else {
        for (let x = n; x <= this.maxNumber; x++) {
          this.eliminated.add(x);
        }
      }
    }

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
    let tempMax = this.maxNumber;
    let tempAttempts = this.maxAttempts;
    let tempEliminate = this.eliminateMode;

    let settingsContainer: Phaser.GameObjects.Container | null = null;

    const drawSettings = () => {
      if (settingsContainer) settingsContainer.destroy();
      settingsContainer = this.add.container(0, 0).setDepth(2000);

      // Semi-transparent background blocker
      const overlay = this.add
        .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.65)
        .setOrigin(0, 0)
        .setInteractive();
      settingsContainer.add(overlay);

      // Panel Dimensions
      const panelW = Math.min(540, this.scale.width * 0.9);
      const panelH = Math.min(460, this.scale.height * 0.85);
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
        .text(cx, cy - panelH / 2 + 38, "🔮 Game Settings 🔮", {
          fontFamily: FONT_DISPLAY,
          fontSize: "28px",
          color: PALETTE_CSS.textDark,
          fontStyle: "700",
        })
        .setOrigin(0.5);
      settingsContainer.add(title);

      // Row 1: Number Range
      const rangeY = cy - 90;
      const rangeLabel = this.add
        .text(cx, rangeY - 26, "Number Range", {
          fontFamily: FONT_BODY,
          fontSize: "18px",
          color: PALETTE_CSS.textDark,
          fontStyle: "600",
        })
        .setOrigin(0.5);
      settingsContainer.add(rangeLabel);

      const rangeOptions = [10, 20, 50, 100];
      const rangeSpacing = 100;
      rangeOptions.forEach((opt, idx) => {
        const bx = cx + (idx - 1.5) * rangeSpacing;
        this.createSettingButton(
          settingsContainer!,
          bx,
          rangeY,
          85,
          40,
          `1-${opt}`,
          tempMax === opt,
          () => {
            this.audio.playSfx("tap-soft");
            tempMax = opt;
            drawSettings();
          }
        );
      });

      // Row 2: Max Attempts
      const attemptsY = cy + 10;
      const attemptsLabel = this.add
        .text(cx, attemptsY - 26, "Max Attempts", {
          fontFamily: FONT_BODY,
          fontSize: "18px",
          color: PALETTE_CSS.textDark,
          fontStyle: "600",
        })
        .setOrigin(0.5);
      settingsContainer.add(attemptsLabel);

      const attemptsOptions = [3, 5, 7, 10];
      attemptsOptions.forEach((opt, idx) => {
        const bx = cx + (idx - 1.5) * rangeSpacing;
        this.createSettingButton(
          settingsContainer!,
          bx,
          attemptsY,
          85,
          40,
          String(opt),
          tempAttempts === opt,
          () => {
            this.audio.playSfx("tap-soft");
            tempAttempts = opt;
            drawSettings();
          }
        );
      });

      // Row 3: Card Elimination Toggle
      const eliminateY = cy + 110;
      const eliminateLabel = this.add
        .text(cx, eliminateY - 26, "Card Elimination (Assistant Mode)", {
          fontFamily: FONT_BODY,
          fontSize: "18px",
          color: PALETTE_CSS.textDark,
          fontStyle: "600",
        })
        .setOrigin(0.5);
      settingsContainer.add(eliminateLabel);

      const eliminateOptions = [
        { label: "ON (Eliminate)", val: true },
        { label: "OFF (Normal)", val: false },
      ];
      eliminateOptions.forEach((opt, idx) => {
        const bx = cx + (idx - 0.5) * 150;
        this.createSettingButton(
          settingsContainer!,
          bx,
          eliminateY,
          130,
          40,
          opt.label,
          tempEliminate === opt.val,
          () => {
            this.audio.playSfx("tap-soft");
            tempEliminate = opt.val;
            drawSettings();
          }
        );
      });

      // Row 4: Save & Close Button
      const saveBtn = new Button(this, cx, cy + panelH / 2 - 50, {
        label: "Save & Restart",
        width: 240,
        height: 64,
        fontSize: 24,
        color: PALETTE.green,
        shadowColor: PALETTE.greenDark,
        onClick: () => {
          this.audio.playSfx("win-chime");
          this.maxNumber = tempMax;
          this.maxAttempts = tempAttempts;
          this.eliminateMode = tempEliminate;
          settingsContainer?.destroy();
          this.startRound();
        },
      });
      settingsContainer.add(saveBtn);

      // Close (X) button in top-right of panel
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

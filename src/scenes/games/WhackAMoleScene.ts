import Phaser from "phaser";
import { BaseScene } from "../BaseScene";
import { ScoreBadge } from "../../ui/ScoreBadge";
import { Button } from "../../ui/Button";
import { FONT_BODY, FONT_DISPLAY, PALETTE, PALETTE_CSS } from "../../config/theme";

interface Hole {
  x: number;
  y: number;
  up: boolean;
  critter?: Phaser.GameObjects.Text;
  timer?: Phaser.Time.TimerEvent;
}

const CRITTERS = ["🐹", "🐰", "🐸"];
const BASE_SPAWN_INTERVAL = 1250;
const BASE_UP_DURATION = 1500;

/**
 * Friendly critters pop up at a customizable speed and hole density.
 * Tapping them triggers a squish animation and giggles.
 * Clean, customizable, and never pass/fail.
 */
export class WhackAMoleScene extends BaseScene {
  private layoutObjects: Phaser.GameObjects.GameObject[] = [];
  private holes: Hole[] = [];
  private scoreBadge?: ScoreBadge;
  private spawnEvent?: Phaser.Time.TimerEvent;
  
  // Custom settings
  private holeCount = 6;
  private difficulty = "medium"; // "easy", "medium", "hard"
  private spawnInterval = BASE_SPAWN_INTERVAL;
  private upDuration = BASE_UP_DURATION;
  private scoreValue = 0;

  constructor() {
    super("WhackAMoleScene");
  }

  protected onCreate(): void {
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
    this.spawnEvent?.remove(false);
    this.spawnEvent = undefined;
    this.holes.forEach((h) => {
      h.timer?.remove(false);
      h.critter?.destroy();
    });
    this.holes = [];
    this.layoutObjects.forEach((o) => o.destroy());
    this.layoutObjects = [];
  }

  private layoutAll(width: number, height: number): void {
    const previousScore = this.scoreBadge?.getValue() ?? this.scoreValue;
    this.scoreValue = previousScore;
    
    this.clearLayout();
    this.cameras.main.setBackgroundColor(PALETTE_CSS.skyDeep);

    // Background base
    const bg = this.add.graphics();
    bg.fillStyle(PALETTE.skyDeep, 1);
    bg.fillRect(0, 0, width, height * 0.22);
    bg.fillStyle(PALETTE.green, 1);
    bg.fillRect(0, height * 0.22, width, height * 0.78);
    this.track(bg);

    const topAreaHeight = Math.max(110, height * 0.18);
    this.track(
      this.add
        .text(width / 2, topAreaHeight * 0.45, "🐹 Critter Boop 🐰", {
          fontFamily: FONT_DISPLAY,
          fontSize: `${Phaser.Math.Clamp(width * 0.036, 20, 32)}px`,
          color: "#ffffff",
          fontStyle: "700",
        })
        .setOrigin(0.5),
    );
    this.track(
      this.add
        .text(width / 2, topAreaHeight * 0.85, "Tap the critters when they pop up!", {
          fontFamily: FONT_BODY,
          fontSize: "18px",
          color: "#ffffff",
          align: "center",
        })
        .setOrigin(0.5),
    );

    this.scoreBadge = this.track(new ScoreBadge(this, width - 190, topAreaHeight * 0.45, previousScore));

    // Settings Button next to Home (x=168, y=64)
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

    // Setup hole density grid
    const isPortrait = height >= width;
    let cols = 3;
    let rows = 2;
    
    if (this.holeCount === 4) {
      cols = 2;
      rows = 2;
    } else if (this.holeCount === 6) {
      cols = isPortrait ? 2 : 3;
      rows = isPortrait ? 3 : 2;
    } else if (this.holeCount === 9) {
      cols = 3;
      rows = 3;
    } else if (this.holeCount === 12) {
      cols = isPortrait ? 3 : 4;
      rows = isPortrait ? 4 : 3;
    }

    const gridTop = topAreaHeight + 30;
    const gridHeight = height - gridTop - 30;
    const gridWidth = width - 60;
    const cellW = gridWidth / cols;
    const cellH = gridHeight / rows;
    const holeRadius = Math.min(cellW, cellH) * 0.32;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = 30 + cellW * col + cellW / 2;
        const cy = gridTop + cellH * row + cellH / 2;
        
        const holeGfx = this.add.graphics();
        holeGfx.fillStyle(0x3a2a1a, 0.7);
        holeGfx.fillEllipse(cx, cy + holeRadius * 0.2, holeRadius * 2.0, holeRadius * 1.15);
        this.track(holeGfx);
        
        this.holes.push({ x: cx, y: cy, up: false });
      }
    }

    // Configure speed intervals
    if (this.difficulty === "easy") {
      this.spawnInterval = 1900;
      this.upDuration = 2200;
    } else if (this.difficulty === "hard") {
      this.spawnInterval = 820;
      this.upDuration = 900;
    } else { // medium
      this.spawnInterval = BASE_SPAWN_INTERVAL;
      this.upDuration = BASE_UP_DURATION;
    }

    // Start timer loops
    this.spawnEvent = this.time.addEvent({
      delay: this.spawnInterval,
      loop: true,
      callback: () => this.trySpawn(),
    });
    this.time.delayedCall(300, () => this.trySpawn());
  }

  private trySpawn(): void {
    const available = this.holes.filter((h) => !h.up);
    if (available.length === 0) return;
    const hole = Phaser.Utils.Array.GetRandom(available);
    this.popUp(hole);
  }

  private popUp(hole: Hole): void {
    hole.up = true;
    const emoji = Phaser.Utils.Array.GetRandom(CRITTERS);
    
    // Scale critter font based on hole grid space
    const count = this.holes.length;
    let sizeFactor = 0.06;
    if (count <= 4) sizeFactor = 0.08;
    else if (count >= 12) sizeFactor = 0.05;
    
    const fontSize = Phaser.Math.Clamp(this.scale.width * sizeFactor, 42, 68);
    
    const critter = this.add
      .text(hole.x, hole.y, emoji, { fontSize: `${fontSize}px` })
      .setOrigin(0.5)
      .setPadding(16)
      .setInteractive({ useHandCursor: true })
      .setScale(0)
      .setDepth(15);
    hole.critter = critter;

    this.tweens.add({
      targets: critter,
      scale: 1,
      y: hole.y - fontSize * 0.44,
      duration: 200,
      ease: "Back.easeOut",
    });

    critter.on("pointerdown", () => this.boop(hole));

    hole.timer = this.time.delayedCall(this.upDuration, () => {
      if (hole.up) this.duck(hole, false);
    });
  }

  private boop(hole: Hole): void {
    if (!hole.up || !hole.critter) return;
    hole.timer?.remove(false);
    this.audio.playSfx("giggle-boop");
    
    this.scoreValue += 1;
    this.scoreBadge?.addScore(1);

    const critter = hole.critter;
    critter.disableInteractive();
    this.tweens.add({
      targets: critter,
      scaleX: 1.3,
      scaleY: 0.5,
      duration: 90,
      yoyo: true,
      onComplete: () => this.duck(hole, true),
    });
  }

  private duck(hole: Hole, wasBooped: boolean): void {
    const critter = hole.critter;
    hole.up = false;
    hole.critter = undefined;
    if (!critter) return;
    this.tweens.add({
      targets: critter,
      y: critter.y + 35,
      alpha: 0,
      duration: wasBooped ? 140 : 200,
      onComplete: () => critter.destroy(),
    });
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
    let tempHoles = this.holeCount;
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
      const panelH = Math.min(420, this.scale.height * 0.82);
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
        .text(cx, cy - panelH / 2 + 38, "🐹 Boop Settings 🐰", {
          fontFamily: FONT_DISPLAY,
          fontSize: "28px",
          color: PALETTE_CSS.textDark,
          fontStyle: "700",
        })
        .setOrigin(0.5);
      settingsContainer.add(title);

      // Row 1: Amount of Holes
      const holesY = cy - 70;
      const holesLabel = this.add
        .text(cx, holesY - 26, "Amount of Critter Holes", {
          fontFamily: FONT_BODY,
          fontSize: "18px",
          color: PALETTE_CSS.textDark,
          fontStyle: "600",
        })
        .setOrigin(0.5);
      settingsContainer.add(holesLabel);

      const holesOptions = [4, 6, 9, 12];
      const spacing = 100;
      holesOptions.forEach((opt, idx) => {
        const bx = cx + (idx - 1.5) * spacing;
        this.createSettingButton(
          settingsContainer!,
          bx,
          holesY,
          85,
          40,
          `${opt} Holes`,
          tempHoles === opt,
          () => {
            this.audio.playSfx("tap-soft");
            tempHoles = opt;
            drawSettings();
          }
        );
      });

      // Row 2: Difficulty / Speed
      const speedY = cy + 40;
      const speedLabel = this.add
        .text(cx, speedY - 26, "Speed & Response Time", {
          fontFamily: FONT_BODY,
          fontSize: "18px",
          color: PALETTE_CSS.textDark,
          fontStyle: "600",
        })
        .setOrigin(0.5);
      settingsContainer.add(speedLabel);

      const speedOptions = [
        { label: "Easy (Slow)", val: "easy" },
        { label: "Medium", val: "medium" },
        { label: "Hard (Fast!)", val: "hard" },
      ];
      speedOptions.forEach((opt, idx) => {
        const bx = cx + (idx - 1.0) * 150;
        this.createSettingButton(
          settingsContainer!,
          bx,
          speedY,
          130,
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

      // Row 3: Action Buttons
      const saveBtn = new Button(this, cx, cy + panelH / 2 - 50, {
        label: "Save & Restart",
        width: 240,
        height: 64,
        fontSize: 24,
        color: PALETTE.green,
        shadowColor: PALETTE.greenDark,
        onClick: () => {
          this.audio.playSfx("win-chime");
          this.holeCount = tempHoles;
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

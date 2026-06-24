import Phaser from "phaser";
import { AudioManager } from "../audio/AudioManager";
import { Button } from "../ui/Button";
import { FONT_DISPLAY, PALETTE, PALETTE_CSS } from "../config/theme";
import { GAME_REGISTRY, GameDef } from "../config/gameRegistry";

/**
 * The carnival "midway" — always rebuilt from scratch on orientation
 * change (cheap, infrequent event) rather than incrementally repositioned,
 * which keeps the grid math simple for both portrait and landscape.
 */
export class HubScene extends Phaser.Scene {
  private audio!: AudioManager;
  private tiles: Phaser.GameObjects.Container[] = [];
  private bg?: Phaser.GameObjects.Graphics;
  private titleText?: Phaser.GameObjects.Text;
  private muteButton?: Button;
  private resizeHandler = (gameSize: Phaser.Structs.Size) =>
    this.buildLayout(gameSize.width, gameSize.height);

  constructor() {
    super("HubScene");
  }

  create(): void {
    this.audio = new AudioManager(this);
    this.buildLayout(this.scale.width, this.scale.height);
    this.scale.on("resize", this.resizeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.resizeHandler);
    });
  }

  private clearLayout(): void {
    this.bg?.destroy();
    this.titleText?.destroy();
    this.muteButton?.destroy();
    this.tiles.forEach((t) => t.destroy());
    this.tiles = [];
  }

  private topBarHeight(height: number): number {
    return Math.max(90, height * 0.16);
  }

  private buildLayout(width: number, height: number): void {
    this.clearLayout();
    this.cameras.main.setBackgroundColor(PALETTE_CSS.skyDeep);

    this.bg = this.add.graphics();
    this.bg.setDepth(0);
    this.drawBackdrop(width, height);

    const topBar = this.topBarHeight(height);
    const titleFontSize = Phaser.Math.Clamp(width * 0.04, 24, 42);

    this.titleText = this.add
      .text(width / 2, topBar / 2, "🎪 Carnival Games 🎪", {
        fontFamily: FONT_DISPLAY,
        fontSize: `${titleFontSize}px`,
        color: "#ffffff",
        fontStyle: "700",
        align: "center",
      })
      .setOrigin(0.5)
      .setPadding(12)
      .setDepth(5);

    this.muteButton = new Button(this, width - 56, 56, {
      label: this.audio.isMuted() ? "🔇" : "🔊",
      width: 72,
      height: 72,
      fontSize: 28,
      color: PALETTE.pink,
      shadowColor: PALETTE.pinkDark,
      onClick: () => {
        const muted = this.audio.toggleMute();
        this.muteButton?.setLabel(muted ? "🔇" : "🔊");
      },
    });
    this.muteButton.setDepth(10);

    const isPortrait = height >= width;
    const cols = isPortrait ? 2 : 3;
    const rows = Math.ceil(GAME_REGISTRY.length / cols);

    const gridTop = topBar + 16;
    const gridHeight = height - gridTop - 24;
    const gridWidth = width - 32;
    const cellW = gridWidth / cols;
    const cellH = gridHeight / rows;
    const tileSize = Math.min(cellW, cellH) * 0.78;

    GAME_REGISTRY.forEach((game, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = 16 + cellW * col + cellW / 2;
      const cy = gridTop + cellH * row + cellH / 2;
      this.tiles.push(this.createTile(cx, cy, tileSize, game, i));
    });
  }

  private createTile(
    x: number,
    y: number,
    size: number,
    game: GameDef,
    index: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setDepth(5);

    const g = this.add.graphics();
    g.fillStyle(game.shadowColor, 1);
    g.fillRoundedRect(-size / 2, -size / 2 + 8, size, size, 28);
    g.fillStyle(game.color, 1);
    g.fillRoundedRect(-size / 2, -size / 2, size, size, 28);
    g.fillStyle(0xffffff, 0.16);
    g.fillRoundedRect(-size / 2 + size * 0.08, -size / 2 + size * 0.08, size * 0.84, size * 0.3, 20);
    container.add(g);

    const emoji = this.add
      .text(0, -size * 0.16, game.emoji, { fontSize: `${size * 0.34}px` })
      .setPadding(12)
      .setOrigin(0.5);
    container.add(emoji);

    const label = this.add
      .text(0, size * 0.3, game.title, {
        fontFamily: FONT_DISPLAY,
        fontSize: `${Math.max(14, size * 0.1)}px`,
        color: "#ffffff",
        fontStyle: "600",
        align: "center",
      })
      .setOrigin(0.5);
    container.add(label);

    container.setSize(size, size);
    container.setInteractive({ useHandCursor: true });

    container.on("pointerdown", () => {
      this.tweens.add({ targets: container, scale: 0.92, duration: 80 });
    });
    const release = () =>
      this.tweens.add({ targets: container, scale: 1, duration: 160, ease: "Back.easeOut" });
    container.on("pointerup", () => {
      release();
      this.scene.start(game.sceneKey);
    });
    container.on("pointerout", release);

    container.setScale(0.7);
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      duration: 380,
      delay: 60 * index,
      ease: "Back.easeOut",
    });

    return container;
  }

  private drawBackdrop(width: number, height: number): void {
    if (!this.bg) return;
    this.bg.clear();
    this.bg.fillStyle(PALETTE.skyDeep, 1);
    this.bg.fillRect(0, 0, width, height);
    this.bg.fillStyle(PALETTE.skyDeepAlt, 1);
    this.bg.fillRect(0, height * 0.72, width, height * 0.28);

    const topBar = this.topBarHeight(height);
    const lightCount = Math.max(6, Math.round(width / 46));
    const colors = [PALETTE.yellow, PALETTE.pink, PALETTE.blue, PALETTE.green];
    for (let i = 0; i < lightCount; i++) {
      const lx = (i + 0.5) * (width / lightCount);
      const ly = topBar - 8 + Math.sin(i * 0.9) * 6;
      this.bg.fillStyle(colors[i % colors.length], 1);
      this.bg.fillCircle(lx, ly, 6);
    }
  }
}

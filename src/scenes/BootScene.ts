import Phaser from "phaser";
import { FONT_DISPLAY, PALETTE, PALETTE_CSS } from "../config/theme";

/**
 * Splash/loading scene. No image assets to preload yet since v1 art is
 * drawn procedurally, but this is the hook point for real asset loading
 * later without touching HubScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    // future: this.load.image(...) / this.load.audio(...)
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(PALETTE_CSS.skyDeep);

    const title = this.add
      .text(width / 2, height / 2 - 30, "🎪 Carnival Games 🎪", {
        fontFamily: FONT_DISPLAY,
        fontSize: "44px",
        color: "#ffffff",
        fontStyle: "700",
        align: "center",
        wordWrap: { width: width * 0.85 },
      })
      .setOrigin(0.5)
      .setScale(0.7)
      .setAlpha(0);

    this.tweens.add({
      targets: title,
      scale: 1,
      alpha: 1,
      duration: 500,
      ease: "Back.easeOut",
    });

    const loadingDots = this.add
      .text(width / 2, height / 2 + 60, "Loading the midway...", {
        fontFamily: FONT_DISPLAY,
        fontSize: "20px",
        color: PALETTE_CSS.yellow,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({ targets: loadingDots, alpha: 1, duration: 400, delay: 200 });

    let advanced = false;
    const go = () => {
      if (advanced) return;
      advanced = true;
      this.scene.start("HubScene");
    };
    this.time.delayedCall(900, go);
    // Phaser's clock is driven by requestAnimationFrame, which pauses when the tab
    // isn't actively rendering; this wall-clock fallback guarantees we leave the
    // splash even if the game loop is throttled.
    window.setTimeout(go, 1600);
  }
}

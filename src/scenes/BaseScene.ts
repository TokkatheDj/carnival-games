import Phaser from "phaser";
import { AudioManager } from "../audio/AudioManager";
import { Button } from "../ui/Button";
import { PALETTE } from "../config/theme";

/**
 * Shared base for every mini-game scene. Guarantees the same home-button
 * position, the same mute control, and the same audio manager wiring on
 * every screen — a child should never have to hunt for a way out of a game.
 * Subclasses implement onCreate()/onResize() instead of create(), so the
 * chrome setup below always runs first.
 */
export abstract class BaseScene extends Phaser.Scene {
  protected audio!: AudioManager;
  private homeButton!: Button;
  private muteButton!: Button;

  create(): void {
    this.audio = new AudioManager(this);
    this.createChrome();
    this.onCreate();
    this.layoutChrome(this.scale.width, this.scale.height);

    const resizeHandler = (gameSize: Phaser.Structs.Size) => {
      this.layoutChrome(gameSize.width, gameSize.height);
      this.onResize(gameSize.width, gameSize.height);
    };
    this.scale.on("resize", resizeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", resizeHandler);
    });
  }

  protected abstract onCreate(): void;

  protected onResize(_width: number, _height: number): void {
    // subclasses override to reposition game-specific elements
  }

  private createChrome(): void {
    this.homeButton = new Button(this, 0, 0, {
      label: "🏠",
      width: 84,
      height: 84,
      fontSize: 32,
      color: PALETTE.blue,
      shadowColor: PALETTE.blueDark,
      onClick: () => this.goHome(),
    });
    this.homeButton.setDepth(1000);

    this.muteButton = new Button(this, 0, 0, {
      label: this.audio.isMuted() ? "🔇" : "🔊",
      width: 84,
      height: 84,
      fontSize: 32,
      color: PALETTE.pink,
      shadowColor: PALETTE.pinkDark,
      onClick: () => {
        const muted = this.audio.toggleMute();
        this.muteButton.setLabel(muted ? "🔇" : "🔊");
      },
    });
    this.muteButton.setDepth(1000);
  }

  private layoutChrome(width: number, height: number): void {
    this.homeButton.setPosition(64, 64);
    this.muteButton.setPosition(width - 64, 64);
  }

  protected goHome(): void {
    this.audio.stopMusic();
    this.scene.start("HubScene");
  }
}

import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { HubScene } from "./scenes/HubScene";
import { GuessNumberScene } from "./scenes/games/GuessNumberScene";
import { SlotsScene } from "./scenes/games/SlotsScene";
import { BasketballScene } from "./scenes/games/BasketballScene";
import { RingTossScene } from "./scenes/games/RingTossScene";
import { WhackAMoleScene } from "./scenes/games/WhackAMoleScene";
import { SpinWheelScene } from "./scenes/games/SpinWheelScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  backgroundColor: "#2b1b4a",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [
    BootScene,
    HubScene,
    GuessNumberScene,
    SlotsScene,
    BasketballScene,
    RingTossScene,
    WhackAMoleScene,
    SpinWheelScene,
  ],
};

new Phaser.Game(config);

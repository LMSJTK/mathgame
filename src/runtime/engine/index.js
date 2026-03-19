import BootScene from './BootScene.js';
import MenuScene from './MenuScene.js';
import HudScene from './HudScene.js';
import TargetSelectScene from './TargetSelectScene.js';
import RangeLandingScene from './RangeLandingScene.js';
import PlatformerScene from './PlatformerScene.js';

export function createGame(parentElement) {
  const config = {
    type: Phaser.AUTO,
    parent: parentElement,
    width: 960,
    height: 540,
    backgroundColor: '#08111f',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 800 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, MenuScene, HudScene, TargetSelectScene, RangeLandingScene, PlatformerScene],
  };

  return new Phaser.Game(config);
}

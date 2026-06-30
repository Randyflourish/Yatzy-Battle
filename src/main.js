import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MapScene } from './scenes/MapScene.js';
import { BattleScene } from './scenes/BattleScene.js';

const config = {
  type: Phaser.AUTO,
  width: 820,
  height: 900,
  parent: 'phaser-game',
  backgroundColor: '#0f172a',
  scene: [BootScene, MapScene, BattleScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);

export default game;

import Phaser from 'phaser';

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' });
  }

  create() {
    this.add.text(300, 400, 'Map Scene - Coming Soon', {
      fontSize: '24px',
      color: '#38bdf8',
      fontFamily: 'Outfit, sans-serif',
    }).setOrigin(0.5);
  }
}

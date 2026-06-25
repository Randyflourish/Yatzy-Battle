import Phaser from 'phaser';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  create() {
    this.add.text(300, 400, 'Battle Scene - Coming Soon', {
      fontSize: '24px',
      color: '#ef4444',
      fontFamily: 'Outfit, sans-serif',
    }).setOrigin(0.5);
  }
}

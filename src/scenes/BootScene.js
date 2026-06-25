import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Room icons
    this.load.image('normal_monster', 'assets/normal_monster_icon.png');
    this.load.image('elite_monster', 'assets/elite_monster_icon.png');
    this.load.image('boss_monster', 'assets/boss_monster_icon.png');
    this.load.image('treasure', 'assets/treasure_icon.png');
    this.load.image('shop', 'assets/shop_icon.png');
    this.load.image('rest', 'assets/rest_icon.png');
    this.load.image('event', 'assets/event_icon.png');
    this.load.image('partner', 'assets/partner_icon.png');
  }

  create() {
    this.scene.start('MapScene');
  }
}

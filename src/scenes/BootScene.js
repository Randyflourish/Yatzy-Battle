import Phaser from 'phaser';

const FALLBACK_COLORS = {
  normal_monster: 0xef4444,
  elite_monster: 0xf97316,
  boss_monster: 0xdc2626,
  treasure: 0xfbbf24,
  shop: 0x22c55e,
  rest: 0x06b6d4,
  event: 0x8b5cf6,
  partner: 0xec4899,
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
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
    for (const [key, color] of Object.entries(FALLBACK_COLORS)) {
      if (!this.textures.exists(key)) {
        this.generateFallbackTexture(key, color);
      }
    }
    this.scene.start('MapScene');
  }

  generateFallbackTexture(key, color) {
    const size = 32;
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(size / 2, size / 2, size / 2 - 2);
    g.generateTexture(key, size, size);
    g.destroy();
  }
}

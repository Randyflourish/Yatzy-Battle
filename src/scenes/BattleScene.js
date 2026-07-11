import Phaser from 'phaser';
import { rollDice, sum } from '../systems/DiceSystem.js';
import { getState, advanceFloor, reset as resetGame } from '../systems/GameState.js';

const W = 820;
const CX = W / 2;
const DIE_SIZE = 70;
const DIE_GAP = 25;
const TOTAL_DICE_W = 5 * DIE_SIZE + 4 * DIE_GAP;
const DICE_START_X = (W - TOTAL_DICE_W) / 2 + DIE_SIZE / 2;
const BAR_W = W - 80;
const BAR_H = 18;
const BAR_ORIGIN_X = 40;

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  create(data) {
    this.state = getState();
    this.roomType = data.roomType || 'Battle[Normal]';

    const isBoss = this.roomType === 'Boss';
    const isElite = this.roomType === 'Battle[Elite]';
    this.enemyMaxHp = isBoss ? 80 : isElite ? 65 : 50;
    this.enemyHp = this.enemyMaxHp;
    this.enemyMaxCd = isBoss ? 4 : 3;
    this.enemyCd = this.enemyMaxCd;

    this.turnPhase = 'roll';
    this.rollsLeft = 2;
    this.diceVals = [0, 0, 0, 0, 0];
    this.locked = [false, false, false, false, false];
    this.diceSprites = [];

    this.buildUI();
  }

  buildUI() {
    this.add.rectangle(CX, 75, BAR_W + 20, 110, 0x1a1a2e, 0.6).setOrigin(0.5);
    this.add.rectangle(CX, 215, BAR_W + 20, 90, 0x16213e, 0.6).setOrigin(0.5);
    this.add.rectangle(CX, 410, BAR_W + 20, 150, 0x1a1a2e, 0.4).setOrigin(0.5);

    this.add.text(50, 30, '👾 Enemy', { fontSize: '22px', fontFamily: 'Outfit, sans-serif', color: '#ef4444' });
    this.enemyCdText = this.add.text(50, 58, `CD: ${this.enemyCd}`, { fontSize: '18px', fontFamily: 'Outfit, sans-serif', color: '#fbbf24' });

    this.add.rectangle(BAR_ORIGIN_X, 100, BAR_W, BAR_H, 0x374151).setOrigin(0, 0.5);
    this.enemyHpBar = this.add.rectangle(BAR_ORIGIN_X, 100, BAR_W, BAR_H, 0xef4444).setOrigin(0, 0.5);
    this.enemyHpText = this.add.text(CX, 120, `HP: ${this.enemyHp}/${this.enemyMaxHp}`, {
      fontSize: '16px', fontFamily: 'Inter, sans-serif', color: '#94a3b8',
    }).setOrigin(0.5, 0);

    this.add.text(50, 175, '🧑 Player', { fontSize: '22px', fontFamily: 'Outfit, sans-serif', color: '#22c55e' });
    this.add.rectangle(BAR_ORIGIN_X, 230, BAR_W, BAR_H, 0x374151).setOrigin(0, 0.5);
    this.playerHpBar = this.add.rectangle(BAR_ORIGIN_X, 230, BAR_W, BAR_H, 0x22c55e).setOrigin(0, 0.5);
    this.playerHpText = this.add.text(CX, 250, `HP: ${this.state.player.hp}/${this.state.player.maxHp}`, {
      fontSize: '16px', fontFamily: 'Inter, sans-serif', color: '#94a3b8',
    }).setOrigin(0.5, 0);

    this.add.text(CX, 300, '─── Your Dice ───', {
      fontSize: '18px', fontFamily: 'Outfit, sans-serif', color: '#64748b',
    }).setOrigin(0.5);

    this.rollsLeftText = this.add.text(CX, 325, 'Rolls left: 2', {
      fontSize: '16px', fontFamily: 'Inter, sans-serif', color: '#fbbf24',
    }).setOrigin(0.5);

    for (let i = 0; i < 5; i++) {
      const x = DICE_START_X + i * (DIE_SIZE + DIE_GAP);
      const bg = this.add.rectangle(x, 380, DIE_SIZE, DIE_SIZE, 0x374151, 0.6)
        .setStrokeStyle(2, 0x6b7280, 0.5)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, 380, '?', {
        fontSize: '34px', fontFamily: 'Outfit, sans-serif', color: '#94a3b8', fontStyle: 'bold',
      }).setOrigin(0.5);
      bg.on('pointerdown', () => this.onDieClick(i));
      this.addHover(bg);
      this.diceSprites.push({ bg, label });
    }

    this.add.text(CX, 430, '🟠 Click to lock  |  🔵 Click to unlock  |  Attack uses ALL dice', {
      fontSize: '14px', fontFamily: 'Inter, sans-serif', color: '#64748b',
    }).setOrigin(0.5);

    this.statusText = this.add.text(CX, 460, 'Roll the dice!', {
      fontSize: '20px', fontFamily: 'Inter, sans-serif', color: '#94a3b8',
    }).setOrigin(0.5);

    this.rollBtn = this.add.rectangle(CX - 130, 530, 200, 48, 0x3b82f6)
      .setInteractive({ useHandCursor: true }).setStrokeStyle(2, 0x60a5fa);
    this.rollBtnLabel = this.add.text(CX - 130, 530, '🎲 Roll', {
      fontSize: '22px', fontFamily: 'Outfit, sans-serif', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.rollBtn.on('pointerdown', () => this.onRoll());
    this.addHover(this.rollBtn, () => this.rollsLeft >= 0 && !(this.locked.every(l => l) && this.diceVals.some(v => v > 0)));

    this.attackBtn = this.add.rectangle(CX + 130, 530, 200, 48, 0x374151)
      .setInteractive({ useHandCursor: true }).setStrokeStyle(2, 0x6b7280);
    this.attackBtnLabel = this.add.text(CX + 130, 530, '⚔️ Attack', {
      fontSize: '22px', fontFamily: 'Outfit, sans-serif', color: '#6b7280', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.attackBtn.on('pointerdown', () => this.onAttack());
    this.addHover(this.attackBtn, () => this.diceVals.some(v => v > 0));

    this.updateDiceDisplay();
    this.updateButtons();
  }

  onDieClick(i) {
    if (this.turnPhase !== 'roll' || this.rollsLeft < 0 || this.diceVals[i] === 0) return;
    this.locked[i] = !this.locked[i];
    this.updateDiceDisplay();
    this.updateButtons();
  }

  onRoll() {
    if (this.turnPhase !== 'roll' || this.rollsLeft < 0) return;
    if (this.locked.every(l => l) && this.diceVals.some(v => v > 0)) return;
    if (this.rollsLeft === 2) {
      this.diceVals = rollDice(5);
    } else {
      for (let i = 0; i < 5; i++) {
        if (!this.locked[i]) this.diceVals[i] = rollDice(1)[0];
      }
    }
    this.rollsLeft--;
    if (this.rollsLeft < 0) this.locked = [true, true, true, true, true];
    this.updateDiceDisplay();
    this.updateButtons();
    this.updateStatus();
  }

  onAttack() {
    if (this.turnPhase !== 'roll') return;
    if (this.diceVals.every(v => v === 0)) return;
    for (let i = 0; i < 5; i++) if (!this.locked[i]) this.locked[i] = true;
    this.turnPhase = 'enemy';
    const damage = sum(this.diceVals) + this.state.player.atk;
    this.enemyHp = Math.max(0, this.enemyHp - damage);
    this.showFloatingDamage(380, 'enemy', damage);
    this.updateEnemyBar();
    if (this.enemyHp <= 0) {
      this.turnPhase = 'victory';
      this.statusText.setText('VICTORY! 🎉');
      this.time.delayedCall(1200, () => this.onVictory());
      return;
    }
    this.statusText.setText('Enemy turn...');
    this.time.delayedCall(600, () => this.enemyTurn());
  }

  enemyTurn() {
    this.enemyCd--;
    this.enemyCdText.setText(`CD: ${this.enemyCd}`);
    if (this.enemyCd <= 0) {
      const eDice = rollDice(2);
      const eDmg = sum(eDice);
      this.state.player.hp = Math.max(0, this.state.player.hp - eDmg);
      this.showFloatingDamage(210, 'player', eDmg);
      this.updatePlayerBar();
      this.enemyCd = this.enemyMaxCd;
      if (this.state.player.hp <= 0) {
        this.turnPhase = 'defeat';
        this.statusText.setText('💀 DEFEAT');
        this.time.delayedCall(1200, () => this.onDefeat());
        return;
      }
    }
    this.time.delayedCall(500, () => this.nextTurn());
  }

  nextTurn() {
    this.turnPhase = 'roll';
    this.rollsLeft = 2;
    this.diceVals = [0, 0, 0, 0, 0];
    this.locked = [false, false, false, false, false];
    this.enemyCdText.setText(`CD: ${this.enemyCd}`);
    this.updateDiceDisplay();
    this.updateButtons();
    this.updateStatus();
  }

  onVictory() {
    this.state.player.gold += 20;
    this.state.run.roomsCompleted++;
    if (this.roomType === 'Boss') advanceFloor();
    this.scene.start('MapScene');
  }

  onDefeat() {
    resetGame();
    this.scene.start('MapScene');
  }

  showFloatingDamage(y, target, amount) {
    const x = CX + (target === 'enemy' ? -80 : 80);
    const txt = this.add.text(x, y, `-${amount}`, {
      fontSize: '34px', fontFamily: 'Outfit, sans-serif', color: '#ef4444', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);
    this.tweens.add({
      targets: txt, y: y - 50, alpha: 0, duration: 700, ease: 'Power2',
      onComplete: () => txt.destroy(),
    });
  }

  addHover(target, getEnabled) {
    target.on('pointerover', () => {
      if (getEnabled && !getEnabled()) return;
      this.tweens.add({ targets: target, scaleX: 1.1, scaleY: 1.1, duration: 100, ease: 'Back.easeOut' });
    });
    target.on('pointerout', () => {
      this.tweens.add({ targets: target, scaleX: 1, scaleY: 1, duration: 100 });
    });
  }

  updateDiceDisplay() {
    for (let i = 0; i < 5; i++) {
      const { bg, label } = this.diceSprites[i];
      if (this.diceVals[i] === 0) {
        label.setText('?');
        label.setColor('#94a3b8');
        bg.setFillStyle(0x374151, 0.5);
        bg.setStrokeStyle(2, 0x6b7280, 0.5);
      } else if (this.locked[i]) {
        label.setText(String(this.diceVals[i]));
        label.setColor('#ffffff');
        bg.setFillStyle(0x3b82f6, 0.9);
        bg.setStrokeStyle(2, 0x60a5fa);
      } else {
        label.setText(String(this.diceVals[i]));
        label.setColor('#ffffff');
        bg.setFillStyle(0xf97316, 0.8);
        bg.setStrokeStyle(2, 0xffffff, 0.3);
      }
    }
  }

  updateEnemyBar() {
    const ratio = this.enemyHp / this.enemyMaxHp;
    this.enemyHpBar.setDisplaySize(BAR_W * ratio, BAR_H);
    this.enemyHpText.setText(`HP: ${this.enemyHp}/${this.enemyMaxHp}`);
    if (ratio < 0.3) this.enemyHpBar.setFillStyle(0xef4444);
    else if (ratio < 0.6) this.enemyHpBar.setFillStyle(0xf97316);
    else this.enemyHpBar.setFillStyle(0x22c55e);
  }

  updatePlayerBar() {
    const ratio = this.state.player.hp / this.state.player.maxHp;
    this.playerHpBar.setDisplaySize(BAR_W * ratio, BAR_H);
    this.playerHpText.setText(`HP: ${this.state.player.hp}/${this.state.player.maxHp}`);
    if (ratio < 0.3) this.playerHpBar.setFillStyle(0xef4444);
    else if (ratio < 0.6) this.playerHpBar.setFillStyle(0xf97316);
    else this.playerHpBar.setFillStyle(0x22c55e);
  }

  updateButtons() {
    const allLocked = this.locked.every(l => l);
    const hasRolled = this.diceVals.some(v => v > 0);
    const canRoll = this.turnPhase === 'roll' && this.rollsLeft >= 0 && !(allLocked && hasRolled);
    const canAttack = this.turnPhase === 'roll' && hasRolled;

    if (canRoll) {
      this.rollBtn.setFillStyle(0x3b82f6).setStrokeStyle(2, 0x60a5fa);
      this.rollBtnLabel.setColor('#ffffff');
    } else {
      this.rollBtn.setFillStyle(0x374151).setStrokeStyle(2, 0x6b7280);
      this.rollBtnLabel.setColor('#6b7280');
    }
    if (canAttack) {
      this.attackBtn.setFillStyle(0x22c55e).setStrokeStyle(2, 0x4ade80);
      this.attackBtnLabel.setColor('#ffffff');
    } else {
      this.attackBtn.setFillStyle(0x374151).setStrokeStyle(2, 0x6b7280);
      this.attackBtnLabel.setColor('#6b7280');
    }
  }

  updateStatus() {
    if (this.diceVals.every(v => v === 0)) {
      this.statusText.setText('Roll the dice!');
    } else if (this.rollsLeft < 0 || (this.locked.every(l => l) && this.rollsLeft >= 0)) {
      this.statusText.setText('Attack!');
    } else {
      this.statusText.setText('Lock dice or Attack with all values.');
    }
    const displayRolls = this.rollsLeft + (this.diceVals.some(v => v > 0) ? 1 : 0);
    this.rollsLeftText.setText(`Rolls left: ${Math.max(0, displayRolls)}`);
  }
}

import Phaser from 'phaser';
import { generate as generateMap } from '../systems/MapGenerator.js';
import { getState } from '../systems/GameState.js';
import { STAGES_COUNT, GAME, ROOM_TYPES } from '../systems/config.js';

const TEXTURE_KEY = {
  [ROOM_TYPES.START]: null,
  [ROOM_TYPES.BATTLE_NORMAL]: 'normal_monster',
  [ROOM_TYPES.BATTLE_ELITE]: 'elite_monster',
  [ROOM_TYPES.TREASURE]: 'treasure',
  [ROOM_TYPES.SHOP]: 'shop',
  [ROOM_TYPES.REST]: 'rest',
  [ROOM_TYPES.EVENT]: 'event',
  [ROOM_TYPES.PARTNER]: 'partner',
  [ROOM_TYPES.BOSS]: 'boss_monster',
};

const ROOM_DESC = {
  [ROOM_TYPES.START]: 'Your journey begins here.',
  [ROOM_TYPES.BATTLE_NORMAL]: 'A normal enemy awaits!',
  [ROOM_TYPES.BATTLE_ELITE]: 'A powerful elite enemy!',
  [ROOM_TYPES.TREASURE]: 'Free loot for the taking.',
  [ROOM_TYPES.SHOP]: 'Spend gold on items.',
  [ROOM_TYPES.REST]: 'Restore some HP.',
  [ROOM_TYPES.EVENT]: 'Something unexpected happens.',
  [ROOM_TYPES.PARTNER]: 'A potential ally.',
  [ROOM_TYPES.BOSS]: 'The floor boss!',
};

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' });
  }

  create() {
    this.state = getState();
    this.roomObjects = new Map();
    this.roomTweens = new Map();
    this.prevReachableRooms = new Set();
    this.prevCurrentRoomId = null;
    this.modalGroup = [];
    this.connectionGraphics = null;
    this.headerText = null;
    this.transitionOverlay = null;

    if (!this.state.map.mapData) {
      this.state.map.mapData = generateMap(STAGES_COUNT);
    }
    this.mapData = this.state.map.mapData;
    if (!this.state.map.currentRoomId) {
      this.state.map.currentRoomId = this.mapData[0][0].id;
      this.state.map.visitedRooms.push(this.mapData[0][0].id);
    }
    this.pointMap = this.buildPointMap();

    this.totalHeight = 180 + (STAGES_COUNT - 1) * GAME.stageSpacingY + 180;
    this.cameras.main.setBounds(0, 0, GAME.width, this.totalHeight);

    this.connectionGraphics = this.add.graphics();

    this.renderHeader();
    this.renderConnections();
    this.renderRooms();
    this.initModalUI();
    this.initTransitionOverlay();

    const currentRoom = this.getCurrentRoom();
    if (currentRoom) {
      this.prevReachableRooms = new Set(currentRoom.connections);
      this.prevCurrentRoomId = currentRoom.id;
    }
    this.updateRoomVisuals();
    this.scrollToCurrent(false);
    this.renderFAB();

    this.input.on('wheel', (_pointer, _gameObjects, _dx, dy) => {
      if (this._modalOpen) return;
      const maxScroll = Math.max(0, this.totalHeight - GAME.height);
      this.cameras.main.scrollY = Phaser.Math.Clamp(
        this.cameras.main.scrollY + dy * 0.4, 0, maxScroll
      );
    });
  }

  buildPointMap() {
    const map = new Map();
    for (const stage of this.mapData) {
      const y = 180 + stage[0].stage * GAME.stageSpacingY;
      const spacing = (GAME.width - 70 * 2) / (stage.length + 1);
      for (const room of stage) {
        const x = 70 + (room.index + 1) * spacing;
        map.set(room.id, { x, y });
      }
    }
    return map;
  }

  getRoomPos(id) {
    return this.pointMap.get(id) || { x: GAME.width / 2, y: 0 };
  }

  getCurrentRoom() {
    const { currentStageIdx, currentRoomId } = this.state.map;
    const stage = this.mapData[currentStageIdx];
    if (!stage) return null;
    return stage.find(r => r.id === currentRoomId) || null;
  }

  renderHeader() {
    this.headerBg = this.add.rectangle(0, 0, GAME.width, 50, 0x0f172a, 0.95)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(99);
    this.headerText = this.add.text(14, 12, '', {
      fontSize: '30px',
      color: '#f8fafc',
      fontFamily: 'Outfit, sans-serif',
    }).setScrollFactor(0).setDepth(100);
    this.updateHeader();
  }

  updateHeader() {
    const s = this.state;
    this.headerText.setText(
      `Floor ${s.map.floor}  |  Gold: ${s.player.gold}  |  HP: ${s.player.hp}/${s.player.maxHp}`
    );
  }

  renderRooms() {
    for (const stage of this.mapData) {
      for (const room of stage) {
        const pos = this.getRoomPos(room.id);
        const circle = this.add.circle(pos.x, pos.y, GAME.roomRadius, 0xfcd34d);
        circle.setStrokeStyle(3, 0xffffff, 0.5);
        circle.setInteractive({ useHandCursor: true });

        circle.on('pointerover', () => {
          if (this._modalOpen) return;
          this.tweens.add({ targets: circle, scaleX: 1.15, scaleY: 1.15, duration: 120, ease: 'Back.easeOut' });
        });
        circle.on('pointerout', () => {
          if (this._modalOpen) return;
          this.tweens.add({ targets: circle, scaleX: 1, scaleY: 1, duration: 120 });
        });
        circle.on('pointerdown', () => this.handleRoomClick(room));

        let icon = null;
        const texKey = TEXTURE_KEY[room.type];
        if (texKey && this.textures.exists(texKey)) {
          icon = this.add.image(pos.x, pos.y, texKey);
          icon.setDisplaySize(57, 57);
        }

        this.roomObjects.set(room.id, { circle, icon, roomData: room, x: pos.x, y: pos.y });
        this.roomTweens.set(room.id, null);
      }
    }
  }

  renderConnections() {
    this.connectionGraphics.clear();

    for (let si = 0; si < this.mapData.length - 1; si++) {
      const currentStage = this.mapData[si];
      for (const room of currentStage) {
        for (const targetId of room.connections) {
          const p1 = this.getRoomPos(room.id);
          const p2 = this.getRoomPos(targetId);
          const visited = this.state.map.visitedRooms.includes(room.id)
            && this.state.map.visitedRooms.includes(targetId);
          if (visited) {
            this.connectionGraphics.lineStyle(10, 0x94a3b8, 0.6);
          } else {
            this.connectionGraphics.lineStyle(10, 0xffffff, 0.2);
          }
          this.connectionGraphics.lineBetween(p1.x, p1.y, p2.x, p2.y);
        }
      }
    }
  }

  updateRoomVisuals() {
    const { currentRoomId, visitedRooms } = this.state.map;
    const currentRoom = this.getCurrentRoom();
    const reachable = currentRoom ? new Set(currentRoom.connections) : new Set();

    const toUpdate = new Set();
    for (const id of this.roomObjects.keys()) {
      toUpdate.add(id);
    }

    for (const id of toUpdate) {
      this.applyVisualState(id, currentRoomId, reachable, visitedRooms);
    }

    this.prevReachableRooms = reachable;
    this.prevCurrentRoomId = currentRoomId;
  }

  applyVisualState(id, currentRoomId, reachable, visitedRooms) {
    const entry = this.roomObjects.get(id);
    if (!entry) return;
    const { circle } = entry;

    const existing = this.roomTweens.get(id);
    if (existing) {
      existing.destroy();
      this.roomTweens.set(id, null);
    }

    circle.setScale(1);

    if (id === currentRoomId) {
      circle.setFillStyle(0x22c55e);
      circle.setStrokeStyle(3, 0x6ee7b7, 1);
      circle.setAlpha(1);
      const t = this.tweens.add({
        targets: circle, scaleX: 1.05, scaleY: 1.05,
        yoyo: true, repeat: -1, duration: 800,
      });
      this.roomTweens.set(id, t);
    } else if (reachable.has(id)) {
      circle.setFillStyle(0x38bdf8);
      circle.setStrokeStyle(3, 0x000000, 0.8);
      circle.setAlpha(1);
      const t = this.tweens.add({
        targets: circle, alpha: 0.6,
        yoyo: true, repeat: -1, duration: 1000,
      });
      this.roomTweens.set(id, t);
    } else if (entry.roomData.stage > this.state.map.currentStageIdx) {
      circle.setFillStyle(0xfcd34d);
      circle.setStrokeStyle(3, 0xfbbf24, 0.8);
      circle.setAlpha(1);
    } else if (visitedRooms.includes(id)) {
      circle.setFillStyle(0x94a3b8);
      circle.setStrokeStyle(3, 0xffffff, 0.2);
      circle.setAlpha(1);
    } else {
      circle.setFillStyle(0x64748b);
      circle.setStrokeStyle(3, 0xffffff, 0.2);
      circle.setAlpha(1);
    }
  }

  scrollToCurrent(animate) {
    const room = this.getCurrentRoom();
    if (!room) return;
    const pos = this.getRoomPos(room.id);
    const maxScroll = Math.max(0, this.totalHeight - GAME.height);
    const targetY = Phaser.Math.Clamp(pos.y - GAME.height / 2, 0, maxScroll);
    const targetX = GAME.width / 2;

    if (animate) {
      this.tweens.add({
        targets: this.cameras.main,
        scrollY: targetY,
        duration: 300,
        ease: 'Sine.easeInOut',
      });
    } else {
      this.cameras.main.scrollY = targetY;
    }
  }

  renderFAB() {
    const bx = GAME.width - 70, by = 720;
    this.fabBtn = this.add.circle(bx, by, GAME.roomRadius, 0xf59e0b);
    this.fabBtn.setStrokeStyle(3, 0xfbbf24, 0.9);
    this.fabBtn.setScrollFactor(0);
    this.fabBtn.setInteractive({ useHandCursor: true });

    this.fabBtn.on('pointerover', () => {
      this.tweens.add({ targets: this.fabBtn, scaleX: 1.15, scaleY: 1.15, duration: 120, ease: 'Back.easeOut' });
    });
    this.fabBtn.on('pointerout', () => {
      this.tweens.add({ targets: this.fabBtn, scaleX: 1, scaleY: 1, duration: 120 });
    });
    this.fabBtn.on('pointerdown', () => this.scrollToCurrent(true));

    this.fabLabel = this.add.text(bx, by, '📍', {
      fontSize: '46px',
    }).setOrigin(0.5).setScrollFactor(0).setPadding({ top: 10, bottom: 10 });
  }

  initModalUI() {
    this._modalOpen = false;
    const cx = GAME.width / 2;
    const cy = GAME.height / 2;

    this.modalDim = this.add.rectangle(cx, cy, GAME.width, GAME.height, 0x000000, 0.7);
    this.modalDim.setScrollFactor(0).setDepth(200);
    this.modalDim.setVisible(false);
    this.modalDim.setInteractive();
    this.modalDim.on('pointerdown', () => this.hideModal());

    this.modalPanel = this.add.graphics();
    this.modalPanel.setScrollFactor(0).setDepth(200);
    this.modalPanel.setVisible(false);

    this.modalIcon = this.add.image(cx, 275, '');
    this.modalIcon.setScrollFactor(0).setDepth(200);
    this.modalIcon.setVisible(false);

    this.modalTypeText = this.add.text(cx, 335, '', {
      fontSize: '36px',
      color: '#f8fafc',
      fontFamily: 'Outfit, sans-serif',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);

    this.modalDescText = this.add.text(cx, 390, '', {
      fontSize: '24px',
      color: '#94a3b8',
      fontFamily: 'Inter, sans-serif',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);

    this.modalMoveBtn = this.add.rectangle(cx, 460, 220, 52, 0x22c55e);
    this.modalMoveBtn.setScrollFactor(0).setDepth(200);
    this.modalMoveBtn.setVisible(false);
    this.modalMoveBtn.setInteractive({ useHandCursor: true });

    this.modalMoveLabel = this.add.text(cx, 460, 'MOVE', {
      fontSize: '28px',
      color: '#0f172a',
      fontFamily: 'Outfit, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);

    this.modalBackBtn = this.add.rectangle(cx, 530, 220, 52, 0xef4444);
    this.modalBackBtn.setScrollFactor(0).setDepth(200);
    this.modalBackBtn.setVisible(false);
    this.modalBackBtn.setInteractive({ useHandCursor: true });

    this.modalBackLabel = this.add.text(cx, 530, 'BACK', {
      fontSize: '28px',
      color: '#f8fafc',
      fontFamily: 'Outfit, sans-serif',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);
  }

  showModal(room, canMove, isCurrent) {
    this._modalOpen = true;
    const texKey = TEXTURE_KEY[room.type];

    this.modalDim.setVisible(true);

    this.modalPanel.clear();
    this.modalPanel.fillStyle(0x1e293b, 0.95);
    this.modalPanel.fillRoundedRect(GAME.width / 2 - 160, 200, 320, 380, 16);
    this.modalPanel.lineStyle(1, 0x334155, 0.5);
    this.modalPanel.strokeRoundedRect(GAME.width / 2 - 160, 200, 320, 380, 16);
    this.modalPanel.setVisible(true);

    if (texKey && this.textures.exists(texKey)) {
      this.modalIcon.setTexture(texKey);
      this.modalIcon.setDisplaySize(64, 64);
    }
    this.modalIcon.setVisible(true);

    this.modalTypeText.setText(room.type).setVisible(true);
    this.modalDescText.setText(isCurrent ? 'Your current position' : (ROOM_DESC[room.type] || '')).setVisible(true);

    this.modalMoveBtn.setVisible(canMove);
    this.modalMoveLabel.setVisible(canMove);
    if (canMove) {
      this.modalMoveBtn.removeAllListeners('pointerdown');
      this.modalMoveBtn.on('pointerdown', () => this.confirmMove(room));
    }

    this.modalBackBtn.setVisible(true);
    this.modalBackLabel.setVisible(true);
    this.modalBackBtn.removeAllListeners('pointerdown');
    this.modalBackBtn.on('pointerdown', () => this.hideModal());
  }

  hideModal() {
    this._modalOpen = false;
    this.modalDim.setVisible(false);
    this.modalPanel.setVisible(false);
    this.modalIcon.setVisible(false);
    this.modalTypeText.setVisible(false);
    this.modalDescText.setVisible(false);
    this.modalMoveBtn.setVisible(false);
    this.modalMoveLabel.setVisible(false);
    this.modalBackBtn.setVisible(false);
    this.modalBackLabel.setVisible(false);
  }

  initTransitionOverlay() {
    this.transitionOverlay = this.add.rectangle(GAME.width / 2, GAME.height / 2, GAME.width, GAME.height, 0x000000);
    this.transitionOverlay.setScrollFactor(0).setDepth(300);
    this.transitionOverlay.setVisible(false);
    this.transitionOverlay.setAlpha(0);
  }

  handleRoomClick(room) {
    if (this._modalOpen) return;
    const current = this.getCurrentRoom();
    if (!current) return;
    const isCurrent = room.id === current.id;
    const canMove = !isCurrent && current.connections.includes(room.id);
    this.showModal(room, canMove, isCurrent);
  }

  confirmMove(room) {
    this.hideModal();

    this.transitionOverlay.setVisible(true);
    this.transitionOverlay.setAlpha(0);
    this.tweens.add({
      targets: this.transitionOverlay,
      alpha: 0.8,
      duration: 200,
    });

    this.time.delayedCall(800, () => {
      this.transitionOverlay.setVisible(false);
      this.transitionOverlay.setAlpha(0);

      this.state.map.currentRoomId = room.id;
      this.state.map.currentStageIdx = room.stage;
      if (!this.state.map.visitedRooms.includes(room.id)) {
        this.state.map.visitedRooms.push(room.id);
      }

      this.handleRoomEvent(room);
    });
  }

  handleRoomEvent(room) {
    const isBattle = room.type === ROOM_TYPES.BATTLE_NORMAL
      || room.type === ROOM_TYPES.BATTLE_ELITE
      || room.type === ROOM_TYPES.BOSS;

    if (isBattle) {
      this.scene.start('BattleScene', { roomType: room.type });
      return;
    }

    this.renderConnections();
    this.updateRoomVisuals();
    this.scrollToCurrent(true);
    this.updateHeader();
  }

}

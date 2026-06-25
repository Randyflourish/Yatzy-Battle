class MapManager {
    constructor() {
        this.stagesCount = 11;
        this.roomsContainer = document.getElementById('map-rooms');
        this.svgContainer = document.getElementById('map-connections');
        this.modal = document.getElementById('modal-overlay');
        this.transitionOverlay = document.getElementById('room-playing-overlay');

        this.mapData = [];
        this.currentStageIdx = 0;
        this.currentRoomId = null;
        this.currentFloor = 1;

        this.roomAssets = {
            'Start': '', // Represented by nothing as per SPEC
            'Battle[Normal]': 'assets/normal_monster_icon.png',
            'Battle[Elite]': 'assets/elite_monster_icon.png',
            'Treasure': 'assets/treasure_icon.png',
            'Shop': 'assets/shop_icon.png',
            'Rest': 'assets/rest_icon.png',
            'Partner': 'assets/partner_icon.png',
            'Event': 'assets/event_icon.png',
            'Boss': 'assets/boss_monster_icon.png'
        };

        this.setupEventListeners();
        this.init();
    }

    setupEventListeners() {
        document.getElementById('modal-cancel').onclick = () => this.hideModal();
        document.getElementById('modal-cancel-btn').onclick = () => this.hideModal();
        document.getElementById('modal-move').onclick = () => this.confirmMove();
        document.getElementById('regenerate-map').onclick = () => this.init();
        document.getElementById('scroll-to-player').onclick = () => this.scrollToCurrent();

        window.addEventListener('resize', () => this.renderConnections());
    }

    init() {
        this.currentStageIdx = 0;
        this.generateMap();
        this.currentRoomId = this.mapData[0][0].id;
        this.renderMap();
        this.updateMapView();
        setTimeout(() => this.scrollToCurrent(), 100);
    }

    generateMap() {
        this.mapData = [];
        for (let i = 0; i < this.stagesCount; i++) {
            // SPEC: Each stage 2-3 rooms. Only 1st and final are 1 room.
            const roomsCount = (i === 0 || i === this.stagesCount - 1) ? 1 : Math.floor(Math.random() * 2) + 2;
            const stageRooms = [];
            for (let j = 0; j < roomsCount; j++) {
                stageRooms.push({
                    id: `s${i}r${j}`,
                    stage: i,
                    type: this.getRandomRoomType(i),
                    connections: []
                });
            }
            this.mapData.push(stageRooms);
        }

        // Generate connections
        for (let i = 0; i < this.stagesCount - 1; i++) {
            const currentStage = this.mapData[i];
            const nextStage = this.mapData[i + 1];

            currentStage.forEach((room, idx) => {
                let connCount = 1;
                if (Math.random() < 0.75) {
                    connCount = Math.floor(Math.random() * 2) + 2;
                }

                const ratio = idx / currentStage.length;
                const centerIdx = ratio * nextStage.length;
                let startIdx = Math.floor(centerIdx - 1);
                let endIdx = Math.ceil(centerIdx + 1);

                startIdx = Math.max(0, startIdx);
                endIdx = Math.min(nextStage.length - 1, endIdx);

                const range = [];
                for (let k = startIdx; k <= endIdx; k++) range.push(k);

                for (let k = range.length - 1; k > 0; k--) {
                    const j = Math.floor(Math.random() * (k + 1));
                    [range[k], range[j]] = [range[j], range[k]];
                }

                for (let k = 0; k < Math.min(connCount, range.length); k++) {
                    room.connections.push(nextStage[range[k]].id);
                }
            });

            nextStage.forEach((nextRoom, nextIdx) => {
                const hasInput = currentStage.some(r => r.connections.includes(nextRoom.id));
                if (!hasInput) {
                    const prevIdx = Math.min(currentStage.length - 1, Math.floor((nextIdx / nextStage.length) * currentStage.length));
                    currentStage[prevIdx].connections.push(nextRoom.id);
                }
            });
        }
    }

    getRandomRoomType(stageIndex) {
        if (stageIndex === 0) return 'Start';
        if (stageIndex === this.stagesCount - 1) return 'Boss';
        const types = ['Battle[Normal]', 'Battle[Normal]', 'Battle[Elite]', 'Treasure', 'Shop', 'Rest', 'Event', 'Partner'];
        return types[Math.floor(Math.random() * types.length)];
    }

    renderMap() {
        this.roomsContainer.innerHTML = '';
        this.mapData.forEach((stage, sIdx) => {
            const stageRow = document.createElement('div');
            stageRow.className = 'stage-row';
            stageRow.id = `stage-row-${sIdx}`;

            stage.forEach(room => {
                const roomEl = document.createElement('div');
                roomEl.className = 'room';
                roomEl.id = room.id;

                const asset = this.roomAssets[room.type];
                if (asset.startsWith('assets/')) {
                    roomEl.style.backgroundImage = `url('${asset}')`;
                    roomEl.textContent = '';
                } else {
                    roomEl.style.backgroundImage = 'none';
                    roomEl.textContent = asset;
                }

                roomEl.onclick = () => this.handleRoomClick(room);
                stageRow.appendChild(roomEl);
            });
            this.roomsContainer.appendChild(stageRow);
        });

        setTimeout(() => this.renderConnections(), 50);
    }

    updateMapView() {
        document.querySelectorAll('.room').forEach(el => {
            el.classList.remove('current', 'available', 'unavailable');
            const room = this.getRoomById(el.id);

            if (el.id === this.currentRoomId) {
                el.classList.add('current');
            } else {
                const currentRoom = this.getRoomById(this.currentRoomId);
                if (currentRoom && currentRoom.connections.includes(el.id)) {
                    el.classList.add('available');
                } else {
                    el.classList.add('unavailable');
                }
            }
        });

        // Show all stages from current onwards, hide past
        this.mapData.forEach((stage, sIdx) => {
            const row = document.getElementById(`stage-row-${sIdx}`);
            if (sIdx >= this.currentStageIdx) {
                row.classList.remove('hidden');
            } else {
                row.classList.add('hidden');
            }
        });

        this.renderConnections();
    }

    handleRoomClick(room) {
        const currentRoom = this.getRoomById(this.currentRoomId);
        if (!currentRoom) return;
        const isAvailable = currentRoom.connections.includes(room.id);
        this.showModal(room, isAvailable);
    }

    showModal(room, isAvailable) {
        const iconEl = document.getElementById('modal-room-icon');
        const asset = this.roomAssets[room.type];
        if (asset.startsWith('assets/')) {
            iconEl.style.backgroundImage = `url('${asset}')`;
            iconEl.textContent = '';
        } else {
            iconEl.style.backgroundImage = 'none';
            iconEl.textContent = asset;
        }

        document.getElementById('modal-room-type').textContent = room.type;
        const moveBtn = document.getElementById('modal-move');
        if (isAvailable) {
            moveBtn.classList.remove('hidden');
            this.pendingRoom = room;
        } else {
            moveBtn.classList.add('hidden');
        }
        this.modal.classList.remove('hidden');
    }

    hideModal() {
        this.modal.classList.add('hidden');
        this.pendingRoom = null;
    }

    confirmMove() {
        const room = this.pendingRoom;
        this.hideModal();

        const playingIcon = document.getElementById('playing-room-icon');
        const asset = this.roomAssets[room.type];
        if (asset.startsWith('assets/')) {
            playingIcon.style.backgroundImage = `url('${asset}')`;
            playingIcon.textContent = '';
        } else {
            playingIcon.style.backgroundImage = 'none';
            playingIcon.textContent = asset;
        }

        document.getElementById('playing-room-type').textContent = `Exploring ${room.type}...`;
        this.transitionOverlay.classList.remove('hidden');

        setTimeout(() => {
            this.transitionOverlay.classList.add('hidden');
            this.currentRoomId = room.id;
            this.currentStageIdx = room.stage;

            // Battle Check
            if (['Battle[Normal]', 'Battle[Elite]', 'Boss'].includes(room.type)) {
                game.startBattle(room);
            } else if (room.type === 'Start') {
                this.updateMapView();
                this.scrollToCurrent();
            } else {
                // For now, other rooms just refresh the map
                this.updateMapView();
                this.scrollToCurrent();
            }
        }, 1000);
    }

    nextFloor() {
        this.currentFloor++;
        document.getElementById('floor-count').textContent = `Floor: ${this.currentFloor}`;
        this.init(); // Restart map generation for new floor
    }

    scrollToCurrent() {
        const row = document.getElementById(`stage-row-${this.currentStageIdx}`);
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    getRoomById(id) {
        for (const stage of this.mapData) {
            const room = stage.find(r => r.id === id);
            if (room) return room;
        }
        return null;
    }

    renderConnections() {
        this.svgContainer.innerHTML = '';
        const content = document.getElementById('map-content');
        if (!content) return;
        const containerRect = content.getBoundingClientRect();

        this.mapData.forEach((stage, sIdx) => {
            if (sIdx < this.currentStageIdx || sIdx >= this.stagesCount - 1) return;

            stage.forEach(room => {
                const roomEl = document.getElementById(room.id);
                if (!roomEl) return;

                const r1 = roomEl.getBoundingClientRect();
                const x1 = r1.left + r1.width / 2 - containerRect.left;
                const y1 = r1.top + r1.height / 2 - containerRect.top;

                room.connections.forEach(targetId => {
                    const targetEl = document.getElementById(targetId);
                    if (!targetEl) return;

                    const r2 = targetEl.getBoundingClientRect();
                    const x2 = r2.left + r2.width / 2 - containerRect.left;
                    const y2 = r2.top + r2.height / 2 - containerRect.top;

                    this.drawCurve(x1, y1, x2, y2);
                });
            });
        });
    }

    drawCurve(x1, y1, x2, y2) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const midY = (y1 + y2) / 2;
        const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
        path.setAttribute('d', d);
        path.setAttribute('stroke', 'rgba(255, 255, 255, 0.4)');
        path.setAttribute('stroke-width', '4');
        path.setAttribute('fill', 'none');
        this.svgContainer.appendChild(path);
    }
}

class BattleManager {
    constructor() {
        this.view = document.getElementById('battle-view');
        this.enemyArea = document.getElementById('enemy-area');
        this.unrolledList = document.getElementById('unrolled-dice-list');
        this.lockedList = document.getElementById('locked-dice-list');
        this.rollBtn = document.getElementById('roll-button');
        this.attackBtn = document.getElementById('attack-button');

        this.playerHP = 100;
        this.enemies = [];
        this.dice = []; // Array of { value: 1-6, status: 'unrolled' | 'locked' }
        this.rollsLeft = 3;

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.rollBtn.onclick = () => this.rollDice();
        this.attackBtn.onclick = () => this.attack();
    }

    startBattle(room) {
        document.getElementById('map-view').classList.add('hidden');
        this.view.classList.remove('hidden');

        // Init Enemies
        const count = room.type === 'Boss' ? 1 : Math.floor(Math.random() * 3) + 1;
        this.enemies = [];
        for (let i = 0; i < count; i++) {
            this.enemies.push({
                hp: 100,
                maxHp: 100,
                cd: room.type === 'Boss' ? 5 : Math.floor(Math.random() * 3) + 2,
                maxCd: room.type === 'Boss' ? 5 : Math.floor(Math.random() * 3) + 2,
                icon: room.type === 'Boss' ? '🐲' : '👾'
            });
        }

        // Init Dice
        this.dice = Array.from({ length: 5 }, () => ({ value: '?', status: 'unrolled' }));
        this.rollsLeft = 3;

        this.renderBattle();
    }

    renderBattle() {
        // Render Enemies
        this.enemyArea.innerHTML = '';
        this.enemies.forEach(enemy => {
            const el = document.createElement('div');
            el.className = 'enemy-unit';
            el.innerHTML = `
                ${enemy.icon}
                <div class="enemy-cd">CD ${enemy.cd}</div>
                <div class="hp-bar-container">
                    <div class="hp-bar" style="width: ${enemy.hp}%"></div>
                </div>
            `;
            this.enemyArea.appendChild(el);
        });

        // Render Dice
        this.renderDice();

        // Update Buttons
        this.rollBtn.textContent = `ROLL (${this.rollsLeft})`;

        const allLocked = this.dice.every(d => d.status === 'locked');
        this.attackBtn.classList.toggle('disabled', !allLocked);
        this.rollBtn.disabled = this.rollsLeft <= 0 || allLocked;
    }

    renderDice() {
        this.unrolledList.innerHTML = '';
        this.lockedList.innerHTML = '';

        this.dice.forEach((die, idx) => {
            const dieEl = document.createElement('div');
            dieEl.className = 'dice';
            dieEl.textContent = die.value;
            dieEl.onclick = () => this.toggleDice(idx);

            if (die.status === 'unrolled') {
                this.unrolledList.appendChild(dieEl);
            } else {
                this.lockedList.appendChild(dieEl);
            }
        });
    }

    rollDice() {
        if (this.rollsLeft <= 0) return;
        const allLocked = this.dice.every(d => d.status === 'locked');
        if (allLocked) return;
        this.rollsLeft--;

        this.dice.forEach(die => {
            if (die.status === 'unrolled') {
                die.value = Math.floor(Math.random() * 6) + 1;
            }
        });

        // Sort dice by value ascending
        this.dice.sort((a, b) => a.value - b.value);

        if (this.rollsLeft === 0) {
            this.dice.forEach(die => die.status = 'locked');
        }

        this.renderBattle();
    }

    toggleDice(idx) {
        if (this.rollsLeft === 0 && this.dice[idx].status === 'locked') return; // Cannot unlock if no rolls left
        if (this.rollsLeft === 3 && this.dice[idx].status === 'unrolled') return; // Cannot lock if not rolled yet
        this.dice[idx].status = this.dice[idx].status === 'unrolled' ? 'locked' : 'unrolled';
        this.renderBattle();
    }

    attack() {
        const allLocked = this.dice.every(d => d.status === 'locked');
        if (!allLocked) return;

        // Logic: Enemies CD - 1
        this.enemies.forEach(enemy => {
            enemy.cd--;
            if (enemy.cd <= 0) enemy.cd = enemy.maxCd;
        });

        // Stay in battle phase: Reset turn state after a short delay
        setTimeout(() => {
            this.rollsLeft = 3;
            this.dice.forEach(d => {
                d.status = 'unrolled';
                d.value = '?';
            });
            this.renderBattle();
        }, 800);

        this.renderBattle();
    }
}

class Game {
    constructor() {
        this.mapManager = new MapManager();
        this.battleManager = new BattleManager();
    }

    startBattle(room) {
        this.battleManager.startBattle(room);
    }
}

let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new Game();
});

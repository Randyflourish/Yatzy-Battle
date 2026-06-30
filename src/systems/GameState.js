const state = {
  run: {
    active: false,
    enemiesDefeated: 0,
    roomsCompleted: 0,
  },

  player: {
    hp: 50,
    maxHp: 50,
    gold: 0,
    atk: 0,
    def: 0,
    luk: 0,
  },

  map: {
    floor: 1,
    currentStageIdx: 0,
    currentRoomId: null,
    visitedRooms: [],
    mapData: null,
  },
};

export function getState() {
  return state;
}

export function reset() {
  state.run.active = false;
  state.run.enemiesDefeated = 0;
  state.run.roomsCompleted = 0;
  state.player.hp = 50;
  state.player.maxHp = 50;
  state.player.gold = 0;
  state.player.atk = 0;
  state.player.def = 0;
  state.player.luk = 0;
  state.map.floor = 1;
  state.map.currentStageIdx = 0;
  state.map.currentRoomId = null;
  state.map.visitedRooms = [];
  state.map.mapData = null;
}

export function advanceFloor() {
  state.map.floor++;
  state.map.currentStageIdx = 0;
  state.map.currentRoomId = null;
  state.map.visitedRooms = [];
  state.map.mapData = null;
}

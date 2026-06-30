import { STAGES_COUNT, ROOM_TYPES, ROOM_POOL } from './config.js';

export function generate(stagesCount = STAGES_COUNT) {
  const mapData = generateRooms(stagesCount);
  generateConnections(mapData);
  return mapData;
}

export function generateRooms(stagesCount) {
  const mapData = [];
  for (let i = 0; i < stagesCount; i++) {
    const roomsCount = (i === 0 || i === stagesCount - 1) ? 1 : Math.floor(Math.random() * 2) + 2;
    const stage = [];
    for (let j = 0; j < roomsCount; j++) {
      stage.push({
        id: `s${i}r${j}`,
        stage: i,
        index: j,
        type: getRoomType(i, stagesCount),
        connections: [],
      });
    }
    mapData.push(stage);
  }
  return mapData;
}

function getRoomType(stageIndex, stagesCount) {
  if (stageIndex === 0) return ROOM_TYPES.START;
  if (stageIndex === stagesCount - 1) return ROOM_TYPES.BOSS;
  return ROOM_POOL[Math.floor(Math.random() * ROOM_POOL.length)];
}

export function generateConnections(mapData) {
  for (let i = 0; i < mapData.length - 1; i++) {
    const current = mapData[i];
    const next = mapData[i + 1];
    const M = current.length;
    const N = next.length;

    let lastMax = -1;

    for (let idx = 0; idx < M; idx++) {
      const room = current[idx];
      const primary = Math.floor(idx * N / M);

      const poolStart = Math.max(0, primary - 1, lastMax);
      const poolEnd = Math.min(N - 1, primary + 1);

      const available = [];
      for (let k = poolStart; k <= poolEnd; k++) {
        available.push(k);
      }

      if (available.length === 0) {
        available.push(Math.min(N - 1, Math.max(0, lastMax)));
      }

      let connCount = Math.random() < 0.75
        ? Math.min(Math.floor(Math.random() * 2) + 2, available.length)
        : Math.min(1, available.length);

      shuffle(available);
      const picked = available.slice(0, connCount);
      lastMax = Math.max(...picked);
      for (const p of picked) {
        room.connections.push(next[p].id);
      }
    }

    for (let j = 0; j < N; j++) {
      const hasInput = current.some(r => r.connections.includes(next[j].id));
      if (!hasInput) {
        const sourceIdx = Math.min(M - 1, Math.floor((j + 0.5) * M / N));
        current[sourceIdx].connections.push(next[j].id);
      }
    }
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

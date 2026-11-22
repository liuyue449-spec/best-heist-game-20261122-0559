// levels.js — the three heists. One clear job: the rooms.
// Coordinates are in playfield space: x 0..960, y 0..592 (the HUD bar sits
// above it). Walls are rectangles that block movement and sight; guards walk
// their waypoint loops; cameras sweep from a wall mount; loot is picked up
// by walking over it; the exit opens only after the main loot is taken.

export const LEVELS = [
  {
    name: 'Heist 1 · The Gallery',
    parSeconds: 75,
    seed: 101,
    playerStart: { x: 60, y: 60 },
    exit: { x: 8, y: 6, w: 72, h: 18, label: 'GETAWAY DOOR' },
    walls: [
      // The big display case in the middle splits the room into a left
      // route, a right route and a narrow lane behind it.
      { x: 380, y: 180, w: 200, h: 90, kind: 'case' },
      { x: 150, y: 120, w: 60, h: 60, kind: 'pillar' },
      { x: 150, y: 400, w: 60, h: 60, kind: 'pillar' },
      { x: 750, y: 120, w: 60, h: 60, kind: 'pillar' },
      { x: 750, y: 400, w: 60, h: 60, kind: 'pillar' },
    ],
    carpet: { x: 440, y: 0, w: 80, h: 592 },
    guards: [
      {
        path: [
          { x: 300, y: 140 },
          { x: 660, y: 140 },
          { x: 660, y: 430 },
          { x: 300, y: 430 },
        ],
      },
    ],
    cameras: [
      { x: 820, y: 10, baseAngle: Math.PI / 2, sweep: 0.65, period: 5 },
    ],
    loot: [
      { x: 48, y: 300, value: 150, label: 'Portrait' },
      { x: 300, y: 530, value: 200, label: 'Jade Figurine' },
      { x: 912, y: 300, value: 150, label: 'Landscape' },
    ],
    mainLoot: { x: 856, y: 524, value: 1000, label: 'Star Sapphire' },
  },
  {
    name: 'Heist 2 · The Vault Hall',
    parSeconds: 100,
    seed: 202,
    playerStart: { x: 60, y: 60 },
    exit: { x: 8, y: 6, w: 72, h: 18, label: 'GETAWAY DOOR' },
    walls: [
      // Two long case rows leave three corridors: top, middle, bottom.
      { x: 120, y: 150, w: 300, h: 50, kind: 'case' },
      { x: 540, y: 150, w: 300, h: 50, kind: 'case' },
      { x: 120, y: 390, w: 300, h: 50, kind: 'case' },
      { x: 540, y: 390, w: 300, h: 50, kind: 'case' },
      { x: 450, y: 270, w: 60, h: 60, kind: 'pillar' },
    ],
    carpet: { x: 0, y: 266, w: 960, h: 60 },
    guards: [
      { path: [{ x: 160, y: 100 }, { x: 800, y: 100 }] },
      { path: [{ x: 800, y: 500 }, { x: 160, y: 500 }] },
    ],
    cameras: [
      { x: 480, y: 10, baseAngle: Math.PI / 2, sweep: 0.8, period: 6 },
      { x: 480, y: 582, baseAngle: -Math.PI / 2, sweep: 0.8, period: 6 },
    ],
    loot: [
      { x: 60, y: 300, value: 150, label: 'Portrait' },
      { x: 900, y: 300, value: 150, label: 'Landscape' },
      { x: 480, y: 96, value: 200, label: 'Gold Bust' },
      { x: 480, y: 500, value: 250, label: 'Ruby Tiara' },
      { x: 250, y: 300, value: 200, label: 'Silver Vase' },
    ],
    mainLoot: { x: 884, y: 540, value: 1200, label: 'Golden Mask' },
  },
  {
    name: 'Heist 3 · The Grand Vault',
    parSeconds: 130,
    seed: 303,
    playerStart: { x: 60, y: 60 },
    exit: { x: 8, y: 6, w: 72, h: 18, label: 'GETAWAY DOOR' },
    walls: [
      { x: 100, y: 120, w: 220, h: 46, kind: 'case' },
      { x: 640, y: 120, w: 220, h: 46, kind: 'case' },
      { x: 100, y: 420, w: 220, h: 46, kind: 'case' },
      { x: 640, y: 420, w: 220, h: 46, kind: 'case' },
      { x: 420, y: 246, w: 120, h: 46, kind: 'case' },
      { x: 420, y: 330, w: 120, h: 46, kind: 'case' },
    ],
    carpet: { x: 0, y: 266, w: 960, h: 60 },
    guards: [
      { path: [{ x: 120, y: 80 }, { x: 840, y: 80 }] },
      { path: [{ x: 480, y: 200 }, { x: 480, y: 400 }] },
      { path: [{ x: 840, y: 520 }, { x: 120, y: 520 }] },
    ],
    cameras: [
      { x: 240, y: 10, baseAngle: Math.PI / 2, sweep: 0.7, period: 5 },
      { x: 720, y: 10, baseAngle: Math.PI / 2, sweep: 0.7, period: 5 },
      { x: 480, y: 582, baseAngle: -Math.PI / 2, sweep: 0.7, period: 5 },
    ],
    loot: [
      { x: 60, y: 300, value: 200, label: 'Portrait' },
      { x: 900, y: 300, value: 200, label: 'Landscape' },
      { x: 480, y: 80, value: 250, label: 'Gold Bust' },
      { x: 480, y: 510, value: 250, label: 'Ruby Tiara' },
      { x: 250, y: 180, value: 150, label: 'Jade Figurine' },
      { x: 710, y: 180, value: 150, label: 'Silver Vase' },
    ],
    mainLoot: { x: 884, y: 540, value: 1500, label: 'Crown Jewels' },
  },
];

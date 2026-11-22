// config.js — tuning constants and palette for Midnight Gallery Heist.
// One clear job: every number the game balances on lives here, so levels,
// engine and render all read the same values.

export const VIEW = {
  width: 960,
  height: 640,
  hudHeight: 48, // top bar; the playfield is the rest
};

export const PLAY = {
  x: 0,
  y: VIEW.hudHeight,
  width: VIEW.width,
  height: VIEW.height - VIEW.hudHeight, // 592
};

// Player movement (pixels per second).
export const PLAYER = {
  radius: 13,
  walkSpeed: 165,
  sneakSpeed: 95,
  // Detection builds slower while sneaking and faster while running.
  sneakFactor: 0.55,
  walkFactor: 1.0,
  // Brief invulnerability after being caught, in seconds.
  caughtGrace: 2.0,
};

// Guard senses.
export const GUARD = {
  radius: 14,
  patrolSpeed: 62,
  chaseSpeed: 128,
  returnSpeed: 85,
  visionRange: 175,
  visionHalfAngle: (34 * Math.PI) / 180,
  // Detection 0..1. Rises while the thief is inside the cone with a clear
  // line of sight; falls when hidden. Full detection = chase.
  detectRateClose: 1.15, // thief nearer than 70px
  detectRateFar: 0.55, // thief at the edge of the cone
  detectDecay: 0.45,
  // After losing sight this long, a chasing guard gives up and returns.
  giveUpSeconds: 2.5,
  catchRadius: 26,
};

// Security cameras sweep a cone from a fixed wall mount.
export const CAMERA = {
  visionRange: 185,
  visionHalfAngle: (30 * Math.PI) / 180,
  detectRate: 0.8,
  // EMP shuts every camera down for this long.
  empSeconds: 8,
};

// Alarm 0..100. At 100 the heist is blown.
export const ALARM = {
  chaseRise: 13, // per second while a guard chases or a camera sees you
  suspiciousRise: 6, // per second while a guard is half-sure (detection > 0.5)
  decay: 2.5, // per second while nobody sees you
  caughtPenalty: 30, // alarm jump when a guard grabs you
  ghostLimit: 40, // stay under this all level for the Ghost bonus
};

// Tools. Each use costs score and spends one charge.
export const TOOLS = {
  smokeCost: 150,
  empCost: 150,
  smokeSeconds: 4,
  smokeRadius: 95,
  perLevel: { smoke: 2, emp: 2 },
};

// Scoring.
export const SCORE = {
  ghostBonus: 500,
  // Time bonus: up to this much, scaled by how much of par time is left.
  timeBonusMax: 400,
};

export const PALETTE = {
  floorA: '#1c2438',
  floorB: '#202a41',
  wall: '#0d1220',
  wallTrim: '#c9a227',
  carpet: '#7a1f2b',
  carpetEdge: '#a83240',
  caseGlass: '#3d6f8e',
  caseFrame: '#8f7b3f',
  pillar: '#39415e',
  pillarTop: '#4d5878',
  loot: '#ffd94a',
  lootMain: '#ff5d8f',
  exit: '#2fbf71',
  exitDark: '#1d7a48',
  player: '#e8e4d8',
  playerCoat: '#23232e',
  guard: '#3f6fb5',
  guardAlert: '#d8443c',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneAlert: 'rgba(216, 68, 60, 0.34)',
  cameraCone: 'rgba(86, 214, 255, 0.20)',
  cameraOff: 'rgba(120, 130, 150, 0.10)',
  smoke: 'rgba(200, 205, 215, 0.55)',
  hudBg: '#0b0f1c',
  hudText: '#e8e4d8',
  hudDim: '#9aa3b8',
  alarmLow: '#2fbf71',
  alarmMid: '#e8a13c',
  alarmHigh: '#d8443c',
  titleGold: '#ffd94a',
};

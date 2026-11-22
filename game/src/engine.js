// engine.js — the game itself: state machine, movement, guard AI, vision
// cones, cameras, tools, alarm and scoring. One clear job: the rules.
// Rendering lives in render.js; levels live in levels.js.

import { VIEW, PLAY, PLAYER, GUARD, CAMERA, ALARM, TOOLS, SCORE } from './config.js';
import { LEVELS } from './levels.js';
import { SoundBank } from './audio.js';
import { mulberry32 } from './rng.js';

const TAU = Math.PI * 2;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

function segIntersectsSeg(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0)) && d1 !== 0 && d2 !== 0 && d3 !== 0 && d4 !== 0;
}

// Does the segment (x1,y1)-(x2,y2) cross the rectangle?
function segHitsRect(x1, y1, x2, y2, r) {
  if (x1 > r.x && x1 < r.x + r.w && y1 > r.y && y1 < r.y + r.h) return true;
  if (x2 > r.x && x2 < r.x + r.w && y2 > r.y && y2 < r.y + r.h) return true;
  const x = r.x;
  const y = r.y;
  const w = r.w;
  const h = r.h;
  return (
    segIntersectsSeg(x1, y1, x2, y2, x, y, x + w, y) ||
    segIntersectsSeg(x1, y1, x2, y2, x + w, y, x + w, y + h) ||
    segIntersectsSeg(x1, y1, x2, y2, x + w, y + h, x, y + h) ||
    segIntersectsSeg(x1, y1, x2, y2, x, y + h, x, y)
  );
}

export class Game {
  constructor(input) {
    this.input = input;
    this.sounds = new SoundBank();
    this.state = 'title'; // title | intro | play | paused | busted | levelComplete | victory
    this.levelIndex = 0;
    this.score = 0;
    this.levelStartScore = 0;
    this.rng = mulberry32(1);
    this.time = 0; // seconds in the current level
    this.maxAlarm = 0;
    this.flash = 0; // red flash timer after being caught
    this.message = '';
    this.messageUntil = 0;
    this.loadLevel(0);
    this.state = 'title'; // loadLevel leaves the game on the intro card
  }

  loadLevel(index) {
    this.levelIndex = index;
    const def = LEVELS[index];
    this.def = def;
    this.rng = mulberry32(def.seed);
    this.player = {
      x: def.playerStart.x,
      y: def.playerStart.y,
      angle: Math.PI / 2,
      grace: 0,
    };
    this.guards = def.guards.map((g) => ({
      path: g.path,
      wp: 1,
      dir: 1,
      x: g.path[0].x,
      y: g.path[0].y,
      angle: 0,
      detection: 0,
      mode: 'patrol',
      loseTimer: 0,
      lastSeen: null,
    }));
    this.cameras = def.cameras.map((c) => ({
      ...c,
      t: this.rng() * c.period,
      angle: c.baseAngle,
      disabledUntil: 0,
      seeing: false,
    }));
    this.loot = def.loot.map((l) => ({ ...l, taken: false }));
    this.mainLoot = { ...def.mainLoot, taken: false };
    this.alarm = 0;
    this.maxAlarm = 0;
    this.time = 0;
    this.smokes = [];
    this.smokeCharges = TOOLS.perLevel.smoke;
    this.empCharges = TOOLS.perLevel.emp;
    this.lootValue = 0;
    this.levelStartScore = this.score;
    this.state = 'intro';
  }

  get level() {
    return this.def;
  }

  get lootTotal() {
    return this.def.loot.reduce((s, l) => s + l.value, 0) + this.def.mainLoot.value;
  }

  get exitOpen() {
    return this.mainLoot.taken;
  }

  showMessage(text, seconds = 2.5) {
    this.message = text;
    this.messageUntil = this.time + seconds;
  }

  // ---- geometry -------------------------------------------------------

  blocked(x, y, radius) {
    if (x - radius < 0 || x + radius > PLAY.width) return true;
    if (y - radius < 0 || y + radius > PLAY.height) return true;
    for (const w of this.def.walls) {
      if (
        x + radius > w.x &&
        x - radius < w.x + w.w &&
        y + radius > w.y &&
        y - radius < w.y + w.h
      ) {
        return true;
      }
    }
    return false;
  }

  // Move a circle, sliding along walls axis by axis.
  moveCircle(body, dx, dy, radius) {
    if (!this.blocked(body.x + dx, body.y, radius)) body.x += dx;
    if (!this.blocked(body.x, body.y + dy, radius)) body.y += dy;
  }

  hasLineOfSight(x1, y1, x2, y2) {
    for (const w of this.def.walls) {
      if (segHitsRect(x1, y1, x2, y2, w)) return false;
    }
    return true;
  }

  inSmoke(x, y) {
    for (const s of this.smokes) {
      if (Math.hypot(x - s.x, y - s.y) < TOOLS.smokeRadius) return true;
    }
    return false;
  }

  // Can an eye at (ex,ey) facing `angle` with this cone see the player?
  canSee(ex, ey, angle, range, halfAngle) {
    if (this.player.grace > 0) return false;
    if (this.inSmoke(this.player.x, this.player.y)) return false;
    if (this.inSmoke(ex, ey)) return false;
    const dx = this.player.x - ex;
    const dy = this.player.y - ey;
    const dist = Math.hypot(dx, dy);
    if (dist > range) return false;
    const toPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(toPlayer, angle)) > halfAngle) return false;
    return this.hasLineOfSight(ex, ey, this.player.x, this.player.y);
  }

  // ---- tools ----------------------------------------------------------

  useSmoke() {
    if (this.smokeCharges <= 0) {
      this.sounds.denied();
      this.showMessage('No smoke bombs left', 1.5);
      return;
    }
    if (this.score < TOOLS.smokeCost) {
      this.sounds.denied();
      this.showMessage(`Smoke bomb costs ${TOOLS.smokeCost} score`, 1.5);
      return;
    }
    this.score -= TOOLS.smokeCost;
    this.smokeCharges -= 1;
    this.smokes.push({ x: this.player.x, y: this.player.y, until: this.time + TOOLS.smokeSeconds });
    this.sounds.tool();
  }

  useEmp() {
    if (this.empCharges <= 0) {
      this.sounds.denied();
      this.showMessage('No EMP charges left', 1.5);
      return;
    }
    if (this.score < TOOLS.empCost) {
      this.sounds.denied();
      this.showMessage(`EMP costs ${TOOLS.empCost} score`, 1.5);
      return;
    }
    this.score -= TOOLS.empCost;
    this.empCharges -= 1;
    for (const c of this.cameras) c.disabledUntil = this.time + CAMERA.empSeconds;
    this.sounds.tool();
    this.showMessage('Cameras down — 8 seconds', 2);
  }

  // ---- update ---------------------------------------------------------

  update(dt) {
    if (this.state === 'play') this.updatePlay(dt);
    this.flash = Math.max(0, this.flash - dt);
  }

  updatePlay(dt) {
    this.time += dt;
    if (this.player.grace > 0) this.player.grace -= dt;
    this.smokes = this.smokes.filter((s) => s.until > this.time);

    // Tools.
    if (this.input.wasPressed('1')) this.useSmoke();
    if (this.input.wasPressed('2')) this.useEmp();
    if (this.input.wasPressed('p', 'escape')) {
      this.state = 'paused';
      return;
    }
    if (this.input.wasPressed('m')) {
      const muted = this.sounds.toggleMute();
      this.showMessage(muted ? 'Sound off' : 'Sound on', 1.2);
    }

    // Player movement.
    const mv = this.input.moveVector();
    const speed = this.input.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    if (mv.x !== 0 || mv.y !== 0) {
      this.player.angle = Math.atan2(mv.y, mv.x);
      this.moveCircle(this.player, mv.x * speed * dt, mv.y * speed * dt, PLAYER.radius);
    }

    // Guards.
    let anyChase = false;
    let anySuspicious = false;
    for (const g of this.guards) {
      this.updateGuard(g, dt);
      if (g.mode === 'chase') anyChase = true;
      else if (g.detection > 0.5) anySuspicious = true;
    }

    // Cameras.
    let anyCameraSeeing = false;
    for (const c of this.cameras) {
      c.t += dt;
      c.angle = c.baseAngle + Math.sin((c.t / c.period) * TAU) * c.sweep;
      const disabled = this.time < c.disabledUntil;
      c.seeing = !disabled && this.canSee(c.x, c.y, c.angle, CAMERA.visionRange, CAMERA.visionHalfAngle);
      if (c.seeing) anyCameraSeeing = true;
    }

    // Alarm.
    if (anyChase || anyCameraSeeing) this.alarm += ALARM.chaseRise * dt;
    else if (anySuspicious) this.alarm += ALARM.suspiciousRise * dt;
    else this.alarm -= ALARM.decay * dt;
    this.alarm = clamp(this.alarm, 0, 100);
    this.maxAlarm = Math.max(this.maxAlarm, this.alarm);
    if (this.alarm >= 100) {
      this.state = 'busted';
      this.sounds.busted();
      return;
    }

    // Loot pickup.
    for (const l of this.loot) {
      if (!l.taken && Math.hypot(this.player.x - l.x, this.player.y - l.y) < PLAYER.radius + 16) {
        l.taken = true;
        this.score += l.value;
        this.lootValue += l.value;
        this.sounds.pickup();
        this.showMessage(`${l.label} +$${l.value}`, 1.5);
      }
    }
    const m = this.mainLoot;
    if (!m.taken && Math.hypot(this.player.x - m.x, this.player.y - m.y) < PLAYER.radius + 18) {
      m.taken = true;
      this.score += m.value;
      this.lootValue += m.value;
      this.sounds.mainLoot();
      this.showMessage(`${m.label} secured! Reach the getaway door.`, 3);
    }

    // Exit.
    const e = this.def.exit;
    if (
      this.exitOpen &&
      this.player.x > e.x - 6 &&
      this.player.x < e.x + e.w + 6 &&
      this.player.y > e.y - 6 &&
      this.player.y < e.y + e.h + 6
    ) {
      this.completeLevel();
    }
  }

  updateGuard(g, dt) {
    const sees = this.canSee(g.x, g.y, g.angle, GUARD.visionRange, GUARD.visionHalfAngle);
    const dist = Math.hypot(this.player.x - g.x, this.player.y - g.y);

    if (g.mode === 'chase') {
      if (sees) {
        g.lastSeen = { x: this.player.x, y: this.player.y };
        g.loseTimer = 0;
      } else {
        g.loseTimer += dt;
        if (g.loseTimer > GUARD.giveUpSeconds) {
          g.mode = 'return';
          g.detection = 0.4;
        }
      }
      const target = g.lastSeen || { x: this.player.x, y: this.player.y };
      const dx = target.x - g.x;
      const dy = target.y - g.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        g.angle = Math.atan2(dy, dx);
        this.moveCircle(g, (dx / d) * GUARD.chaseSpeed * dt, (dy / d) * GUARD.chaseSpeed * dt, GUARD.radius);
      }
      if (dist < GUARD.catchRadius && this.player.grace <= 0) {
        this.caughtBy(g);
      }
      return;
    }

    if (sees) {
      const close = dist < 70;
      const rate = (close ? GUARD.detectRateClose : GUARD.detectRateFar) * (this.input.sneaking ? PLAYER.sneakFactor : PLAYER.walkFactor);
      g.detection = clamp(g.detection + rate * dt, 0, 1);
      if (g.detection >= 1) {
        g.mode = 'chase';
        g.lastSeen = { x: this.player.x, y: this.player.y };
        g.loseTimer = 0;
        this.sounds.alarmTick();
      }
    } else {
      g.detection = clamp(g.detection - GUARD.detectDecay * dt, 0, 1);
    }

    if (g.mode === 'return') {
      const target = g.path[g.wp];
      const dx = target.x - g.x;
      const dy = target.y - g.y;
      const d = Math.hypot(dx, dy);
      if (d < 8) {
        g.mode = 'patrol';
      } else {
        g.angle = Math.atan2(dy, dx);
        this.moveCircle(g, (dx / d) * GUARD.returnSpeed * dt, (dy / d) * GUARD.returnSpeed * dt, GUARD.radius);
      }
      return;
    }

    // Patrol: walk the waypoint loop, ping-pong.
    const target = g.path[g.wp];
    const dx = target.x - g.x;
    const dy = target.y - g.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) {
      g.wp += g.dir;
      if (g.wp >= g.path.length) {
        g.wp = g.path.length - 2;
        g.dir = -1;
      } else if (g.wp < 0) {
        g.wp = 1;
        g.dir = 1;
      }
    } else {
      g.angle = Math.atan2(dy, dx);
      this.moveCircle(g, (dx / d) * GUARD.patrolSpeed * dt, (dy / d) * GUARD.patrolSpeed * dt, GUARD.radius);
    }
  }

  caughtBy(g) {
    this.alarm = clamp(this.alarm + ALARM.caughtPenalty, 0, 100);
    this.maxAlarm = Math.max(this.maxAlarm, this.alarm);
    this.player.x = this.def.playerStart.x;
    this.player.y = this.def.playerStart.y;
    this.player.grace = PLAYER.caughtGrace;
    this.flash = 0.6;
    g.mode = 'return';
    g.detection = 0.4;
    g.loseTimer = 0;
    this.sounds.caught();
    this.showMessage('Caught! The guard drags you back to the door.', 2.5);
    if (this.alarm >= 100) {
      this.state = 'busted';
      this.sounds.busted();
    }
  }

  completeLevel() {
    const timeLeft = Math.max(0, this.def.parSeconds - this.time);
    const timeBonus = Math.round((timeLeft / this.def.parSeconds) * SCORE.timeBonusMax);
    const ghost = this.maxAlarm <= ALARM.ghostLimit;
    const ghostBonus = ghost ? SCORE.ghostBonus : 0;
    this.score += timeBonus + ghostBonus;
    this.levelResult = { timeBonus, ghostBonus, ghost, lootValue: this.lootValue };
    this.sounds.win();
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.state = 'victory';
    } else {
      this.state = 'levelComplete';
    }
  }

  // ---- menus ----------------------------------------------------------

  buttons() {
    const cx = VIEW.width / 2;
    if (this.state === 'title') {
      return [
        { id: 'start', x: cx - 130, y: 400, w: 260, h: 52, label: 'START THE HEIST' },
        { id: 'howto', x: cx - 130, y: 466, w: 260, h: 44, label: 'HOW TO PLAY' },
      ];
    }
    if (this.state === 'intro') {
      return [{ id: 'begin', x: cx - 110, y: 420, w: 220, h: 50, label: 'BEGIN' }];
    }
    if (this.state === 'paused') {
      return [
        { id: 'resume', x: cx - 110, y: 330, w: 220, h: 50, label: 'RESUME' },
        { id: 'restart', x: cx - 110, y: 394, w: 220, h: 50, label: 'RESTART HEIST' },
        { id: 'quit', x: cx - 110, y: 458, w: 220, h: 50, label: 'QUIT TO TITLE' },
      ];
    }
    if (this.state === 'busted') {
      return [
        { id: 'retry', x: cx - 110, y: 400, w: 220, h: 50, label: 'TRY AGAIN' },
        { id: 'quit', x: cx - 110, y: 464, w: 220, h: 50, label: 'QUIT TO TITLE' },
      ];
    }
    if (this.state === 'levelComplete') {
      return [{ id: 'next', x: cx - 110, y: 430, w: 220, h: 50, label: 'NEXT HEIST' }];
    }
    if (this.state === 'victory') {
      return [{ id: 'again', x: cx - 130, y: 440, w: 260, h: 50, label: 'RUN IT BACK' }];
    }
    return [];
  }

  clickButton(id) {
    if (id === 'start') {
      this.score = 0;
      this.loadLevel(0);
    } else if (id === 'howto') {
      this.showHowto = !this.showHowto;
    } else if (id === 'begin') {
      this.state = 'play';
      this.sounds.ensure();
    } else if (id === 'resume') {
      this.state = 'play';
    } else if (id === 'restart') {
      this.loadLevel(this.levelIndex);
    } else if (id === 'retry') {
      this.score = this.levelStartScore;
      this.loadLevel(this.levelIndex);
    } else if (id === 'quit') {
      this.loadLevel(0);
      this.state = 'title';
    } else if (id === 'next') {
      this.loadLevel(this.levelIndex + 1);
    } else if (id === 'again') {
      this.score = 0;
      this.loadLevel(0);
    }
  }

  handleClick(mx, my) {
    for (const b of this.buttons()) {
      if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
        this.clickButton(b.id);
        return true;
      }
    }
    return false;
  }

  handleKeys() {
    if (this.state === 'title') {
      if (this.input.wasPressed('enter', ' ')) this.clickButton('start');
      if (this.input.wasPressed('h')) this.clickButton('howto');
    } else if (this.state === 'intro') {
      if (this.input.wasPressed('enter', ' ')) this.clickButton('begin');
    } else if (this.state === 'paused') {
      if (this.input.wasPressed('p', 'escape', 'enter')) this.clickButton('resume');
    } else if (this.state === 'busted') {
      if (this.input.wasPressed('enter', ' ')) this.clickButton('retry');
    } else if (this.state === 'levelComplete') {
      if (this.input.wasPressed('enter', ' ')) this.clickButton('next');
    } else if (this.state === 'victory') {
      if (this.input.wasPressed('enter', ' ')) this.clickButton('again');
    }
    if (this.input.wasPressed('m')) {
      const muted = this.sounds.toggleMute();
      if (this.state === 'play') this.showMessage(muted ? 'Sound off' : 'Sound on', 1.2);
    }
  }
}

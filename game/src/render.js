// render.js — every pixel the game draws. One clear job: the picture.
// The engine owns the rules; this file only reads game state and paints it.

import { VIEW, PLAY, PLAYER, GUARD, CAMERA, TOOLS, PALETTE } from './config.js';

const TAU = Math.PI * 2;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  // Distance along a ray before it hits a rect, or Infinity.
  rayHit(ox, oy, dx, dy, r) {
    let tmin = 0;
    let tmax = Infinity;
    if (Math.abs(dx) < 1e-9) {
      if (ox < r.x || ox > r.x + r.w) return Infinity;
    } else {
      let t1 = (r.x - ox) / dx;
      let t2 = (r.x + r.w - ox) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return Infinity;
    }
    if (Math.abs(dy) < 1e-9) {
      if (oy < r.y || oy > r.y + r.h) return Infinity;
    } else {
      let t1 = (r.y - oy) / dy;
      let t2 = (r.y + r.h - oy) / dy;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return Infinity;
    }
    return tmin;
  }

  // A vision cone clipped by walls: cast rays across the arc and join the
  // hit points into a polygon, so the cone stops at the first wall.
  conePath(ctx, game, ox, oy, angle, range, halfAngle) {
    const steps = 26;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    for (let i = 0; i <= steps; i++) {
      const a = angle - halfAngle + (2 * halfAngle * i) / steps;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      let dist = range;
      for (const w of game.def.walls) {
        const t = this.rayHit(ox, oy, dx, dy, w);
        if (t < dist) dist = t;
      }
      // The outer boundary also stops the cone.
      if (ox + dx * dist < 0 || ox + dx * dist > PLAY.width) dist = Math.min(dist, range);
      ctx.lineTo(ox + dx * dist, oy + dy * dist);
    }
    ctx.closePath();
  }

  draw(game) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    if (game.state === 'title') {
      this.drawTitle(game);
      return;
    }
    this.drawRoom(game);
    if (game.state === 'intro') this.drawIntro(game);
    else if (game.state === 'paused') this.drawPaused(game);
    else if (game.state === 'busted') this.drawBusted(game);
    else if (game.state === 'levelComplete') this.drawLevelComplete(game);
    else if (game.state === 'victory') this.drawVictory(game);
    if (game.flash > 0) {
      ctx.fillStyle = `rgba(216, 68, 60, ${game.flash * 0.35})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
  }

  drawRoom(game) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(0, PLAY.y);

    // Floor: two-tone checker.
    const tile = 48;
    for (let y = 0; y < PLAY.height; y += tile) {
      for (let x = 0; x < PLAY.width; x += tile) {
        ctx.fillStyle = ((x / tile + y / tile) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB);
        ctx.fillRect(x, y, tile, tile);
      }
    }

    // Carpet runner.
    const c = game.def.carpet;
    ctx.fillStyle = PALETTE.carpet;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = PALETTE.carpetEdge;
    if (c.w > c.h) {
      ctx.fillRect(c.x, c.y, c.w, 4);
      ctx.fillRect(c.x, c.y + c.h - 4, c.w, 4);
    } else {
      ctx.fillRect(c.x, c.y, 4, c.h);
      ctx.fillRect(c.x + c.w - 4, c.y, 4, c.h);
    }

    // Exit door (green, labelled; locked look until the main loot is taken).
    const e = game.def.exit;
    ctx.fillStyle = game.exitOpen ? PALETTE.exit : PALETTE.exitDark;
    roundRect(ctx, e.x, e.y, e.w, e.h, 4);
    ctx.fill();
    ctx.fillStyle = '#eafff1';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(game.exitOpen ? 'EXIT ✓' : 'EXIT 🔒', e.x + e.w / 2, e.y + e.h / 2 + 0.5);

    // Loot: gold diamonds, main loot bigger and pink with a pulsing ring.
    const t = game.time;
    for (const l of game.loot) {
      if (l.taken) continue;
      this.drawLoot(ctx, l.x, l.y, 10, PALETTE.loot, t, l.label);
    }
    if (!game.mainLoot.taken) {
      const m = game.mainLoot;
      ctx.strokeStyle = `rgba(255, 93, 143, ${0.5 + 0.3 * Math.sin(t * 4)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 22 + 3 * Math.sin(t * 4), 0, TAU);
      ctx.stroke();
      this.drawLoot(ctx, m.x, m.y, 15, PALETTE.lootMain, t, m.label);
    }

    // Vision cones (clipped by walls), then cameras, then walls on top.
    for (const cam of game.cameras) {
      const disabled = game.time < cam.disabledUntil;
      this.conePath(ctx, game, cam.x, cam.y, cam.angle, CAMERA.visionRange, CAMERA.visionHalfAngle);
      ctx.fillStyle = disabled ? PALETTE.cameraOff : cam.seeing ? PALETTE.coneAlert : PALETTE.cameraCone;
      ctx.fill();
    }
    for (const g of game.guards) {
      this.conePath(ctx, game, g.x, g.y, g.angle, GUARD.visionRange, GUARD.visionHalfAngle);
      ctx.fillStyle = g.mode === 'chase' ? PALETTE.coneAlert : PALETTE.coneCalm;
      ctx.fill();
    }

    // Walls: display cases (glass blue with gold frame) and pillars.
    for (const w of game.def.walls) {
      if (w.kind === 'case') {
        ctx.fillStyle = PALETTE.caseFrame;
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.fillStyle = PALETTE.caseGlass;
        ctx.fillRect(w.x + 4, w.y + 4, w.w - 8, w.h - 8);
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(w.x + 4, w.y + 4, w.w - 8, 8);
      } else {
        ctx.fillStyle = PALETTE.pillar;
        ctx.fillRect(w.x, w.y, w.w, w.h);
        ctx.fillStyle = PALETTE.pillarTop;
        ctx.fillRect(w.x + 5, w.y + 5, w.w - 10, w.h - 10);
      }
    }

    // Outer boundary walls.
    ctx.strokeStyle = PALETTE.wallTrim;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, PLAY.width - 4, PLAY.height - 4);

    // Smoke clouds hide everyone inside them.
    for (const s of game.smokes) {
      ctx.fillStyle = PALETTE.smoke;
      ctx.beginPath();
      ctx.arc(s.x, s.y, TOOLS.smokeRadius, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(220,225,235,0.35)';
      ctx.beginPath();
      ctx.arc(s.x - 20, s.y + 10, 34, 0, TAU);
      ctx.arc(s.x + 24, s.y - 14, 30, 0, TAU);
      ctx.fill();
    }

    // Cameras: wall mounts with a lens dot (grey while EMP'd, red when seeing).
    for (const cam of game.cameras) {
      const disabled = game.time < cam.disabledUntil;
      ctx.fillStyle = '#222a3d';
      ctx.beginPath();
      ctx.arc(cam.x, cam.y, 9, 0, TAU);
      ctx.fill();
      ctx.fillStyle = disabled ? '#8a93a8' : cam.seeing ? '#ff3b30' : '#56d6ff';
      ctx.beginPath();
      ctx.arc(cam.x + Math.cos(cam.angle) * 4, cam.y + Math.sin(cam.angle) * 4, 3.5, 0, TAU);
      ctx.fill();
    }

    // Guards: navy circles, facing tick, detection ring, "!" while chasing.
    for (const g of game.guards) {
      ctx.fillStyle = g.mode === 'chase' ? PALETTE.guardAlert : PALETTE.guard;
      ctx.beginPath();
      ctx.arc(g.x, g.y, GUARD.radius, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#dfe6f5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + Math.cos(g.angle) * (GUARD.radius + 5), g.y + Math.sin(g.angle) * (GUARD.radius + 5));
      ctx.stroke();
      if (g.detection > 0.05 && g.mode !== 'chase') {
        ctx.strokeStyle = g.detection > 0.5 ? '#ff9d2e' : '#ffd65a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(g.x, g.y, GUARD.radius + 6, -Math.PI / 2, -Math.PI / 2 + TAU * g.detection);
        ctx.stroke();
      }
      if (g.mode === 'chase') {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', g.x, g.y - GUARD.radius - 8);
      }
    }

    // The thief: dark coat, pale face, mask band, facing tick.
    const p = game.player;
    if (!(game.state === 'play' && p.grace > 0 && Math.floor(game.time * 10) % 2 === 0)) {
      ctx.fillStyle = PALETTE.playerCoat;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER.radius, 0, TAU);
      ctx.fill();
      ctx.fillStyle = PALETTE.player;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER.radius - 5, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#23232e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x - 5, p.y);
      ctx.lineTo(p.x + 5, p.y);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.player;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.angle) * (PLAYER.radius + 4), p.y + Math.sin(p.angle) * (PLAYER.radius + 4));
      ctx.stroke();
    }

    // Objective line at the bottom of the room.
    ctx.fillStyle = 'rgba(11,15,28,0.75)';
    ctx.fillRect(0, PLAY.height - 24, PLAY.width, 24);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const objective = game.exitOpen
      ? '★ Main loot secured — reach the green EXIT door!'
      : `Objective: steal the ${game.mainLoot.label} ($${game.mainLoot.value}), then reach the EXIT.`;
    ctx.fillText(objective, 10, PLAY.height - 12);
    ctx.textAlign = 'right';
    ctx.fillText('WASD move · Shift sneak · 1 smoke · 2 EMP · P pause', PLAY.width - 10, PLAY.height - 12);

    ctx.restore();

    this.drawHud(game);

    // Toast message.
    if (game.message && game.time < game.messageUntil && game.state === 'play') {
      ctx.fillStyle = 'rgba(11,15,28,0.85)';
      const w = ctx.measureText(game.message).width + 28;
      roundRect(ctx, (VIEW.width - w) / 2, PLAY.y + 12, w, 30, 8);
      ctx.fill();
      ctx.fillStyle = PALETTE.hudText;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(game.message, VIEW.width / 2, PLAY.y + 27);
    }
  }

  drawLoot(ctx, x, y, r, color, t, label) {
    const bob = Math.sin(t * 3 + x) * 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - r + bob);
    ctx.lineTo(x + r * 0.7, y + bob);
    ctx.lineTo(x, y + r + bob);
    ctx.lineTo(x - r * 0.7, y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.moveTo(x, y - r + bob);
    ctx.lineTo(x + r * 0.3, y - r * 0.2 + bob);
    ctx.lineTo(x, y + bob);
    ctx.lineTo(x - r * 0.3, y - r * 0.2 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + r + 13);
  }

  drawHud(game) {
    const ctx = this.ctx;
    ctx.fillStyle = PALETTE.hudBg;
    ctx.fillRect(0, 0, VIEW.width, PLAY.y);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(game.def.name, 12, PLAY.y / 2);
    ctx.fillStyle = PALETTE.titleGold;
    ctx.fillText(`SCORE $${game.score}`, 250, PLAY.y / 2);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '13px sans-serif';
    ctx.fillText(`LOOT $${game.lootValue} / $${game.lootTotal}`, 420, PLAY.y / 2);

    // Alarm meter.
    const ax = 600;
    const aw = 200;
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('ALARM', ax, PLAY.y / 2);
    ctx.fillStyle = '#1a2138';
    roundRect(ctx, ax + 52, PLAY.y / 2 - 8, aw, 16, 4);
    ctx.fill();
    const frac = game.alarm / 100;
    ctx.fillStyle = frac < 0.5 ? PALETTE.alarmLow : frac < 0.8 ? PALETTE.alarmMid : PALETTE.alarmHigh;
    if (frac > 0) {
      roundRect(ctx, ax + 52, PLAY.y / 2 - 8, aw * frac, 16, 4);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(game.alarm)}`, ax + 52 + aw / 2, PLAY.y / 2 + 0.5);

    // Tools.
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '12px sans-serif';
    ctx.fillText(`💨×${game.smokeCharges}  ⚡×${game.empCharges}`, 872, PLAY.y / 2);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.fillRect(0, PLAY.y - 1, VIEW.width, 1);
  }

  drawButton(ctx, b, hover) {
    ctx.fillStyle = hover ? '#3a2f10' : '#241f0d';
    roundRect(ctx, b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.titleGold;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = PALETTE.titleGold;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  }

  drawPanel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(11,15,28,0.92)';
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = PALETTE.wallTrim;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  drawTitle(game) {
    const ctx = this.ctx;
    // Night-sky backdrop with a museum silhouette.
    ctx.fillStyle = '#0b0f1c';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = '#141b30';
    for (let i = 0; i < 12; i++) {
      const bx = 40 + i * 78;
      ctx.fillRect(bx, 470 - (i % 3) * 26, 54, 170);
    }
    ctx.fillStyle = PALETTE.titleGold;
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MIDNIGHT GALLERY', VIEW.width / 2, 150);
    ctx.fillText('HEIST', VIEW.width / 2, 215);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '17px sans-serif';
    ctx.fillText('Three rooms. Three crews of guards. One clean getaway.', VIEW.width / 2, 262);
    ctx.fillStyle = PALETTE.loot;
    ctx.font = '15px sans-serif';
    ctx.fillText('Steal the loot, dodge the cones, keep the alarm down.', VIEW.width / 2, 292);

    // A little diorama: thief, guard cone, camera, loot.
    ctx.save();
    ctx.translate(VIEW.width / 2 - 170, 320);
    ctx.fillStyle = PALETTE.floorB;
    ctx.fillRect(0, 0, 340, 60);
    ctx.fillStyle = PALETTE.coneCalm;
    ctx.beginPath();
    ctx.moveTo(250, 30);
    ctx.lineTo(120, -6);
    ctx.lineTo(120, 66);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(250, 30, 13, 0, TAU);
    ctx.fill();
    this.drawLoot(ctx, 60, 30, 10, PALETTE.lootMain, 0.5, '');
    ctx.fillStyle = PALETTE.playerCoat;
    ctx.beginPath();
    ctx.arc(150, 30, 12, 0, TAU);
    ctx.fill();
    ctx.restore();

    for (const b of game.buttons()) {
      this.drawButton(ctx, b, false);
    }
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '12px sans-serif';
    ctx.fillText('WASD / arrows to move · Shift to sneak · 1 smoke bomb · 2 EMP · M mute', VIEW.width / 2, 540);
    ctx.fillText('A top-down stealth heist · an original game · no assets downloaded', VIEW.width / 2, 562);

    if (game.showHowto) {
      this.drawPanel(ctx, VIEW.width / 2 - 260, 120, 520, 380);
      ctx.fillStyle = PALETTE.titleGold;
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('HOW TO PLAY', VIEW.width / 2, 152);
      ctx.fillStyle = PALETTE.hudText;
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      const lines = [
        '• Move with WASD or arrow keys. Hold Shift to sneak —',
        '  slower, but guards spot you much more slowly.',
        '• Guards patrol with vision cones. Stay out of the yellow,',
        '  and never let the ring above a guard fill up.',
        '• Cameras sweep blue cones. EMP (key 2) shuts them down',
        '  for 8 seconds. Smoke (key 1) hides you for 4 seconds.',
        '• Tools cost 150 score each. Spend them wisely.',
        '• Grab the pink main loot to unlock the green EXIT door,',
        '  then get out. Grab the gold loot on the way for score.',
        '• The alarm rises while you are seen. At 100 the heist',
        '  is blown and the room restarts.',
        '• Finish fast and keep the alarm under 40 for a',
        '  GHOST bonus of $500 per room.',
        '',
        'Click HOW TO PLAY again to close.',
      ];
      lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2 - 240, 186 + i * 24));
    }
  }

  drawIntro(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(5,8,16,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    this.drawPanel(ctx, VIEW.width / 2 - 280, 130, 560, 330);
    ctx.fillStyle = PALETTE.titleGold;
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.def.name, VIEW.width / 2, 178);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'left';
    const lines = [
      `Target: the ${game.mainLoot.label} — $${game.mainLoot.value}.`,
      `Guards on patrol: ${game.guards.length} · Cameras: ${game.cameras.length} · Side loot: $${game.def.loot.reduce((s, l) => s + l.value, 0)}.`,
      `Par time ${game.def.parSeconds}s — beat it for a time bonus.`,
      `Keep the alarm under 40 for the $500 GHOST bonus.`,
      '',
      'WASD move · Shift sneak · 1 smoke · 2 EMP · P pause',
    ];
    lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2 - 250, 226 + i * 28));
    for (const b of game.buttons()) this.drawButton(ctx, b, false);
  }

  drawPaused(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(5,8,16,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = PALETTE.titleGold;
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW.width / 2, 270);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '14px sans-serif';
    ctx.fillText('The guards wait. The alarm does not fall while paused.', VIEW.width / 2, 300);
    for (const b of game.buttons()) this.drawButton(ctx, b, false);
  }

  drawBusted(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(40,6,8,0.78)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = '#ff6b61';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUSTED!', VIEW.width / 2, 250);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '16px sans-serif';
    ctx.fillText('The alarm hit 100. The gallery locks down and the crew', VIEW.width / 2, 300);
    ctx.fillText('scatters. The room resets — your score goes back to', VIEW.width / 2, 326);
    ctx.fillText('where this heist started.', VIEW.width / 2, 352);
    for (const b of game.buttons()) this.drawButton(ctx, b, false);
  }

  drawLevelComplete(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(5,8,16,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    this.drawPanel(ctx, VIEW.width / 2 - 260, 130, 520, 330);
    const r = game.levelResult;
    ctx.fillStyle = PALETTE.titleGold;
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLEAN GETAWAY!', VIEW.width / 2, 182);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'left';
    const lines = [
      `Loot in this room: $${r.lootValue}`,
      `Time bonus: $${r.timeBonus}  (finished in ${Math.round(game.time)}s, par ${game.def.parSeconds}s)`,
      r.ghost ? `GHOST bonus: $${r.ghostBonus}  (alarm never passed 40)` : 'GHOST bonus: $0  (the alarm went over 40)',
      '',
      `Total score: $${game.score}`,
    ];
    lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2 - 230, 232 + i * 30));
    for (const b of game.buttons()) this.drawButton(ctx, b, false);
  }

  drawVictory(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(5,8,16,0.8)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = PALETTE.titleGold;
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE CREW RETIRES RICH', VIEW.width / 2, 220);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '17px sans-serif';
    ctx.fillText('Three rooms, three clean getaways. The gallery never saw you coming.', VIEW.width / 2, 268);
    ctx.fillStyle = PALETTE.loot;
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`FINAL SCORE: $${game.score}`, VIEW.width / 2, 330);
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '14px sans-serif';
    ctx.fillText('Midnight Gallery Heist — an original game', VIEW.width / 2, 380);
    for (const b of game.buttons()) this.drawButton(ctx, b, false);
  }
}

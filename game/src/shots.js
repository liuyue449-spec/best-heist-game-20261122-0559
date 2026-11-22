// shots.js — deterministic screenshot presets, driven by ?shot=.
// The starter kit uses the same trick (shots.json maps a name to a query).
// Each preset puts the game into a real, playable state and lets the loop
// run a few frames, so the screenshots are renders of the game's own code.

export function applyShot(game, shot) {
  if (!shot) return;
  if (shot === 'start') {
    game.state = 'title';
    return;
  }
  if (shot === 'play') {
    // Mid-heist in room 1: the thief crouched behind the big case, a guard
    // sweeping past with a half-filled detection ring, the camera cone
    // crossing the vault, the Star Sapphire glowing, alarm at 35.
    game.loadLevel(0);
    game.state = 'play';
    game.player.x = 330;
    game.player.y = 300;
    game.player.angle = Math.PI / 4;
    game.guards[0].x = 420;
    game.guards[0].y = 140;
    game.guards[0].angle = Math.PI / 2;
    game.guards[0].detection = 0.55;
    game.cameras[0].t = 1.2;
    game.alarm = 35;
    game.maxAlarm = 35;
    game.score = 350;
    game.lootValue = 350;
    game.loot[0].taken = true;
    game.loot[1].taken = true;
    game.time = 24;
    return;
  }
  if (shot === 'caught') {
    // Alarm at 82, a guard in full chase closing in, camera spotting.
    game.loadLevel(1);
    game.state = 'play';
    game.player.x = 470;
    game.player.y = 360;
    game.player.angle = -Math.PI / 2;
    game.guards[0].x = 470;
    game.guards[0].y = 200;
    game.guards[0].angle = Math.PI / 2;
    game.guards[0].mode = 'chase';
    game.guards[0].lastSeen = { x: 470, y: 300 };
    game.guards[0].detection = 1;
    game.guards[1].x = 700;
    game.guards[1].y = 500;
    game.guards[1].angle = Math.PI;
    game.cameras[0].t = 2.4;
    game.alarm = 82;
    game.maxAlarm = 82;
    game.score = 900;
    game.lootValue = 900;
    game.loot[0].taken = true;
    game.loot[2].taken = true;
    game.mainLoot.taken = true;
    game.time = 51;
    return;
  }
  if (shot === 'win') {
    // Room 1 cleared: the getaway screen with the score breakdown.
    game.loadLevel(0);
    game.state = 'play';
    game.score = 1500;
    game.lootValue = 1500;
    game.time = 58;
    game.maxAlarm = 22;
    for (const l of game.loot) l.taken = true;
    game.mainLoot.taken = true;
    game.completeLevel();
  }
}

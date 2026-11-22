// main.js — bootstrap and game loop. One clear job: start the game,
// run the frames, and hand input to the engine.

import { VIEW } from './config.js';
import { Input } from './input.js';
import { Game } from './engine.js';
import { Renderer } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = VIEW.width;
canvas.height = VIEW.height;

const input = new Input(canvas);
const game = new Game(input);
const renderer = new Renderer(canvas);

// Debug handle for automated play-tests: state, score and alarm.
window.__heist = game;

const params = new URLSearchParams(window.location.search);
applyShot(game, params.get('shot'));

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (input.mouse.clicked) {
    const { x, y } = input.mouse;
    if (!game.handleClick(x, y)) {
      game.sounds.ensure();
    }
    input.consumeClick();
  }
  game.handleKeys();
  game.update(dt);
  renderer.draw(game);
  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

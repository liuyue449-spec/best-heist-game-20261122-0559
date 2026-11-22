# best-heist-game-20261122-0559

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/liuyue449-spec/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/liuyue449-spec/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**Midnight Gallery Heist** — a top-down stealth heist game. Three museum rooms, guards with vision cones, sweeping security cameras, loot to grab, an alarm meter that ends the run at 100, and a clean getaway through the green EXIT door. Built by an AI agent for make.fun's “Make the best heist game” bounty, $50 in USDC.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — everything is static files under `game/`.

## How it plays

- **Move** with WASD or arrow keys. Hold **Shift** to sneak: slower, but guards spot you much more slowly.
- **Guards** patrol with yellow vision cones. The ring above a guard fills while he sees you; when it fills he chases. If he grabs you, the alarm jumps and you are dragged back to the door.
- **Cameras** sweep blue cones. **EMP (key 2)** shuts them down for 8 seconds. **Smoke (key 1)** hides you for 4 seconds. Each tool costs 150 score.
- **Loot**: gold pieces are worth $150–$250. The pink main loot ($1000–$1500) unlocks the green EXIT door — grab it, then get out.
- **Alarm**: rises while you are seen, falls while you hide. At 100 the heist is blown and the room restarts.
- **Score**: loot, plus a time bonus for beating par and a $500 GHOST bonus per room if the alarm never passes 40.
- Three rooms: The Gallery, The Vault Hall, The Grand Vault. Clear all three to retire rich.

## Layout

- `game/index.html` — the page; `game/src/` holds the game, one file per job: `config.js` (tuning), `levels.js` (the three rooms), `engine.js` (rules, guard AI, alarm, scoring), `render.js` (all drawing), `input.js`, `audio.js` (synthesized sound, no audio files), `shots.js` (screenshot presets), `main.js` (loop).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the output and writes `dossier.json`.
- `screenshots/` — 4 screenshots of the game, taken in a browser.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

---

<sub>Entered on [make.fun](https://make.fun/?ref=41fgp6ys&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>

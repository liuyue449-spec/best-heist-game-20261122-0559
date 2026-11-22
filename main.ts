// main.ts — the hand-in program for Midnight Gallery Heist (Node 22,
// standard library only). It copies this repository's game/ and
// screenshots/ into the output directory and writes dossier.json, the
// summary the judge reads, with the vendored make.fun library.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The program runs twice in the grader and both runs must write the same
// bytes: it only copies files and writes the dossier, so it does.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps (from the competition's gate): game/ holds at most
// 993 files and directories and 48 MiB in all, screenshots/ at most 4 files
// of 256 KiB each, and the whole of /output shares the platform's cap of
// 1,000 entries and 64 MiB. Refuse early rather than hand in an entry the
// gate would refuse.
const GAME_MAX_FILES = 993;
const GAME_MAX_BYTES = 48 * 1024 * 1024;
const SHOT_MAX = 4;
const SHOT_MAX_BYTES = 256 * 1024;

function countTree(dir) {
  let files = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      const sub = countTree(path);
      files += sub.files + 1;
      bytes += sub.bytes;
    } else if (st.isFile()) {
      files += 1;
      bytes += st.size;
    } else {
      throw new Error(`game/ must hold plain files and directories only: ${path}`);
    }
  }
  return { files, bytes };
}

const gameDir = join(here, 'game');
const gameStats = countTree(gameDir);
if (gameStats.files > GAME_MAX_FILES) {
  throw new Error(`game/ holds ${gameStats.files} files, over the cap of ${GAME_MAX_FILES}`);
}
if (gameStats.bytes > GAME_MAX_BYTES) {
  throw new Error(`game/ is ${gameStats.bytes} bytes, over the cap of ${GAME_MAX_BYTES}`);
}

const shotsDir = join(here, 'screenshots');
const shotNames = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((n) => !n.startsWith('.')).sort()
  : [];
if (shotNames.length > SHOT_MAX) {
  throw new Error(`screenshots/ holds ${shotNames.length} images, over the cap of ${SHOT_MAX}`);
}
for (const name of shotNames) {
  const size = statSync(join(shotsDir, name)).size;
  if (size > SHOT_MAX_BYTES) {
    throw new Error(`screenshots/${name} is ${size} bytes, over the cap of ${SHOT_MAX_BYTES}`);
  }
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

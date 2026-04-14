/**
 * sync-version.mjs
 * 将 root package.json 的版本号同步到 workspace package.json 与 parity/manifest.json。
 * 在 npm version 或 npm run version:sync 时调用。
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkgPath = resolve(root, 'package.json');
const targets = [
  resolve(root, 'apps', 'web', 'package.json'),
  resolve(root, 'packages', 'game-core', 'package.json'),
  resolve(root, 'packages', 'shared-types', 'package.json'),
  resolve(root, 'parity', 'manifest.json'),
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8').replace(/^\uFEFF/, ''));
}

const pkg = readJson(pkgPath);
const next = pkg.version;
let changed = 0;

for (const targetPath of targets) {
  const target = readJson(targetPath);
  const prev = target.version;
  if (prev === next) {
    console.log(`[sync-version] ${targetPath.replace(root + '\\\\', '')} 已是最新 (${next})`);
    continue;
  }

  target.version = next;
  writeFileSync(targetPath, JSON.stringify(target, null, 2) + '\n', 'utf-8');
  console.log(`[sync-version] ${targetPath.replace(root + '\\\\', '')}: ${prev} → ${next}`);
  changed += 1;
}

if (changed === 0) {
  console.log('[sync-version] 所有版本号均已同步，无需更新。');
}

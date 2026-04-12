/**
 * sync-version.mjs
 * 将 root package.json 的版本号同步到 parity/manifest.json。
 * 在 npm version 或 npm run version:sync 时调用。
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkgPath = resolve(root, 'package.json');
const manifestPath = resolve(root, 'parity', 'manifest.json');

const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

const prev = manifest.version;
const next = pkg.version;

if (prev === next) {
  console.log(`[sync-version] parity/manifest.json 已是最新 (${next})，无需更新。`);
} else {
  manifest.version = next;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  console.log(`[sync-version] parity/manifest.json: ${prev} → ${next}`);
}

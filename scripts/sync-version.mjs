/**
 * sync-version.mjs
 * 将 root package.json 的版本号同步到 workspace package.json
 * 与 package-lock.json 的 workspace 元数据。
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkgPath = resolve(root, 'package.json');
const lockPath = resolve(root, 'package-lock.json');
const workspaces = [
  {
    packageJsonPath: resolve(root, 'apps', 'web', 'package.json'),
    lockKey: 'apps/web',
  },
  {
    packageJsonPath: resolve(root, 'packages', 'game-core', 'package.json'),
    lockKey: 'packages/game-core',
  },
  {
    packageJsonPath: resolve(root, 'packages', 'shared-types', 'package.json'),
    lockKey: 'packages/shared-types',
  },
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8').replace(/^\uFEFF/, ''));
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf-8');
}

function rel(path) {
  return relative(root, path).replaceAll('\\', '/');
}

function syncVersion(target, next) {
  if (!target || typeof target !== 'object') {
    return false;
  }

  if (target.version === next) {
    return false;
  }

  target.version = next;
  return true;
}

const pkg = readJson(pkgPath);
const next = pkg.version;
let changed = 0;

for (const workspace of workspaces) {
  const targetPath = workspace.packageJsonPath;
  const target = readJson(targetPath);
  const prev = target.version;
  if (prev === next) {
    console.log(`[sync-version] ${rel(targetPath)} 已是最新 (${next})`);
    continue;
  }

  target.version = next;
  writeJson(targetPath, target);
  console.log(`[sync-version] ${rel(targetPath)}: ${prev} → ${next}`);
  changed += 1;
}

let lockChanged = 0;

if (existsSync(lockPath)) {
  const lock = readJson(lockPath);

  if (lock.version !== next) {
    const prev = lock.version;
    syncVersion(lock, next);
    console.log(`[sync-version] ${rel(lockPath)} <root>: ${prev} → ${next}`);
    lockChanged += 1;
  }

  if (lock.packages) {
    const rootPkg = lock.packages[''];
    if (rootPkg && rootPkg.version !== next) {
      const prev = rootPkg.version;
      rootPkg.version = next;
      console.log(`[sync-version] ${rel(lockPath)} packages[""]: ${prev} → ${next}`);
      lockChanged += 1;
    }

    for (const workspace of workspaces) {
      const entry = lock.packages[workspace.lockKey];
      if (!entry) {
        continue;
      }

      const prev = entry.version;
      if (prev === next) {
        continue;
      }

      entry.version = next;
      console.log(`[sync-version] ${rel(lockPath)} packages["${workspace.lockKey}"]: ${prev} → ${next}`);
      lockChanged += 1;
    }
  }

  if (lockChanged > 0) {
    writeJson(lockPath, lock);
  } else {
    console.log(`[sync-version] ${rel(lockPath)} 已是最新 (${next})`);
  }
} else {
  console.log('[sync-version] 未找到 package-lock.json，跳过锁文件同步。');
}

if (changed === 0 && lockChanged === 0) {
  console.log('[sync-version] 所有版本号均已同步，无需更新。');
}

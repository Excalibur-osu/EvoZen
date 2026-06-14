/**
 * sync-version.mjs
 * 将版本号同步到 root package.json、workspace package.json、
 * package-lock.json 的 workspace 元数据，以及 SAVE_VERSION。
 *
 * 用法：
 *   npm run version            # 使用 root package.json 当前版本同步
 *   npm run version -- 0.9.4   # 先把 root package.json 改为 0.9.4，再同步
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const pkgPath = resolve(root, 'package.json');
const lockPath = resolve(root, 'package-lock.json');
const saveVersionPath = resolve(root, 'packages', 'game-core', 'src', 'version.ts');
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

function validateVersion(next) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(next)) {
    throw new Error(`无效版本号：${next}`);
  }
}

const pkg = readJson(pkgPath);
const requested = process.argv[2]?.trim();
const next = requested || pkg.version;
validateVersion(next);

let changed = 0;

if (pkg.version === next) {
  console.log(`[sync-version] ${rel(pkgPath)} 已是最新 (${next})`);
} else {
  const prev = pkg.version;
  pkg.version = next;
  writeJson(pkgPath, pkg);
  console.log(`[sync-version] ${rel(pkgPath)}: ${prev} → ${next}`);
  changed += 1;
}

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

if (existsSync(saveVersionPath)) {
  const source = readFileSync(saveVersionPath, 'utf-8');
  const pattern = /export const SAVE_VERSION = ['"]([^'"]+)['"];?/;
  const match = source.match(pattern);

  if (!match) {
    console.log(`[sync-version] ${rel(saveVersionPath)} 未找到 SAVE_VERSION，跳过。`);
  } else if (match[1] === next) {
    console.log(`[sync-version] ${rel(saveVersionPath)} SAVE_VERSION 已是最新 (${next})`);
  } else {
    const updated = source.replace(pattern, `export const SAVE_VERSION = '${next}';`);
    writeFileSync(saveVersionPath, updated, 'utf-8');
    console.log(`[sync-version] ${rel(saveVersionPath)} SAVE_VERSION: ${match[1]} → ${next}`);
    changed += 1;
  }
} else {
  console.log(`[sync-version] 未找到 ${rel(saveVersionPath)}，跳过 SAVE_VERSION 同步。`);
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

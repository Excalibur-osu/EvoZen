#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const MANIFEST_PATH = resolve(ROOT, 'parity/manifest.json');

const VALID_STATUSES = new Set(['exact', 'partial', 'intentional_diff', 'not_started']);

function fail(message) {
  console.error(`✘ ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`✔ ${message}`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function validateRefs(entry, label) {
  for (const ref of entry.refs ?? []) {
    if (!ref.path || typeof ref.path !== 'string') {
      fail(`${label} has an invalid ref.path`);
      continue;
    }

    const fullPath = resolve(ROOT, ref.path);
    if (!existsSync(fullPath)) {
      fail(`${label} references a missing path: ${ref.path}`);
    }
  }
}

console.log('Parity Manifest Audit');
console.log('=====================');

const manifest = readJson(MANIFEST_PATH);

if (!manifest.version) {
  fail('manifest.version is required');
}

if (!Array.isArray(manifest.systems) || manifest.systems.length === 0) {
  fail('manifest.systems must be a non-empty array');
} else {
  const seenSystemIds = new Set();
  for (const system of manifest.systems) {
    if (!system.id || typeof system.id !== 'string') {
      fail('system entry is missing a valid id');
      continue;
    }

    if (seenSystemIds.has(system.id)) {
      fail(`duplicate system id: ${system.id}`);
    }
    seenSystemIds.add(system.id);

    if (!VALID_STATUSES.has(system.status)) {
      fail(`system ${system.id} has invalid status: ${system.status}`);
    }

    validateRefs(system, `system ${system.id}`);
  }

  ok(`validated ${manifest.systems.length} system entries`);
}

if (!Array.isArray(manifest.intentionalDiffs)) {
  fail('manifest.intentionalDiffs must be an array');
} else {
  const seenDiffIds = new Set();
  for (const diff of manifest.intentionalDiffs) {
    if (!diff.id || typeof diff.id !== 'string') {
      fail('intentionalDiff entry is missing a valid id');
      continue;
    }

    if (seenDiffIds.has(diff.id)) {
      fail(`duplicate intentionalDiff id: ${diff.id}`);
    }
    seenDiffIds.add(diff.id);

    if (diff.status !== 'intentional_diff') {
      fail(`intentionalDiff ${diff.id} must use status "intentional_diff"`);
    }

    validateRefs(diff, `intentionalDiff ${diff.id}`);
  }

  ok(`validated ${manifest.intentionalDiffs.length} intentional differences`);
}

const statusCounts = new Map();
for (const system of manifest.systems ?? []) {
  statusCounts.set(system.status, (statusCounts.get(system.status) ?? 0) + 1);
}

console.log('\nSystem Status Summary');
for (const status of VALID_STATUSES) {
  console.log(`- ${status}: ${statusCounts.get(status) ?? 0}`);
}

if (process.exitCode && process.exitCode !== 0) {
  console.error('\nmanifest audit failed');
  process.exit(process.exitCode);
}

console.log('\nmanifest audit passed');

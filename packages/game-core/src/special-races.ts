/**
 * 特殊种族机制 — 对标 legacy/src/races.js junker / sludge / nephilim / ultra_sludge / hellspawn
 *
 * 这些种族在选择后会应用特殊 trait 集合。
 */

import type { GameState } from '@evozen/shared-types';
import { RACES } from './races';

// ============================================================
// 特殊种族应用器
// ============================================================

/** 应用 Sludge 种族的随机 trait 集合（每次转生重新随机） */
export function applySludgeTraits(state: GameState): void {
  const sludgeDef = RACES['sludge'];
  if (!sludgeDef) return;

  // 全部负 trait 等级 = 0.25（已在 races.ts 定义中固定）
  // 但需要随机选 5-10 个最坏的 trait 真正激活，其余清零
  const candidateTraits = Object.keys(sludgeDef.traits);
  const numActive = 5 + Math.floor(Math.random() * 6);  // 随机激活 5-10 个
  const shuffled = [...candidateTraits].sort(() => Math.random() - 0.5);
  const active = new Set(shuffled.slice(0, numActive));

  for (const trait of candidateTraits) {
    if (active.has(trait)) {
      state.race[trait] = 0.25;
    } else {
      delete state.race[trait];
    }
  }
  state.race['ooze'] = 0.25; // ooze 永远激活
}

/** 应用 Junker 的固定负 trait 集合 */
export function applyJunkerTraits(state: GameState): void {
  const junkerDef = RACES['junker'];
  if (!junkerDef) return;
  for (const [trait, level] of Object.entries(junkerDef.traits)) {
    state.race[trait] = level;
  }
}

/** 应用 Nephilim 的 empowered 多倍 trait（demonic + angelic 全部叠加） */
export function applyNephilimTraits(state: GameState): void {
  const nephilimDef = RACES['nephilim'];
  if (!nephilimDef) return;

  // empowered 让 demonic + angelic 两个 genus 的全部 trait 都激活
  state.race['empowered'] = 2;
  state.race['blasphemous'] = 1;

  // 所有 demonic + angelic trait 全部应用 rank=1
  const demonicTraits = ['immoral', 'evil', 'soul_eater', 'blissful', 'pompous', 'holy', 'fiery', 'terrifying', 'slaver', 'compact', 'conniving', 'pathetic', 'spiritual', 'truthful', 'unified', 'rainbow', 'gloomy', 'magnificent', 'noble'];
  for (const t of demonicTraits) {
    state.race[t] = 1;
  }
}

/** 应用 Hellspawn（4× immoral） */
export function applyHellspawnTraits(state: GameState): void {
  state.race['immoral'] = 4;
}

/** 应用 Ultra Sludge（更多 trait 选项 + 0.1 等级） */
export function applyUltraSludgeTraits(state: GameState): void {
  const sludgeDef = RACES['ultra_sludge'];
  if (!sludgeDef) return;
  const allTraits = Object.keys(sludgeDef.traits);
  const numActive = 10 + Math.floor(Math.random() * 11);  // 10-20
  const shuffled = [...allTraits].sort(() => Math.random() - 0.5);
  const active = new Set(shuffled.slice(0, numActive));

  for (const trait of allTraits) {
    if (active.has(trait)) {
      state.race[trait] = sludgeDef.traits[trait] ?? 0.1;
    } else {
      delete state.race[trait];
    }
  }
  state.race['ooze'] = 0.1;
}

/** 统一入口：在选择种族 / 转生后调用 */
export function applySpecialRaceTraits(state: GameState, speciesId: string): void {
  switch (speciesId) {
    case 'sludge':
      applySludgeTraits(state);
      break;
    case 'junker':
      applyJunkerTraits(state);
      break;
    case 'nephilim':
      applyNephilimTraits(state);
      break;
    case 'hellspawn':
      applyHellspawnTraits(state);
      break;
    case 'ultra_sludge':
      applyUltraSludgeTraits(state);
      break;
  }
}

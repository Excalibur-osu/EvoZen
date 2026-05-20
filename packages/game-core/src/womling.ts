/**
 * Womling 外星矮人系统 — 对标 legacy/src/truepath.js womling_*
 *
 * 在 Eris 上发现的外星种族，可以雇佣他们做工。
 * 包含：village（村庄）、farm（农场）、mine（矿场）、lab（实验室）等。
 */

import type { GameState } from '@evozen/shared-types';

// ============================================================
// Womling 状态
// ============================================================

export interface WomlingState {
  /** 已发现 */
  discovered: boolean;
  /** 总人口 */
  population: number;
  /** 各岗位分配 */
  jobs: {
    farmer: number;
    miner: number;
    lab: number;
    soldier: number;
  };
  /** 士气（影响产出） */
  morale: number;
}

export function defaultWomlingState(): WomlingState {
  return {
    discovered: false,
    population: 0,
    jobs: { farmer: 0, miner: 0, lab: 0, soldier: 0 },
    morale: 100,
  };
}

/** 初始化 Womling 状态（在 state.space 下挂） */
export function initWomling(state: GameState): WomlingState {
  const space = state.space as Record<string, unknown>;
  if (!space['_womling']) {
    space['_womling'] = defaultWomlingState();
  }
  return space['_womling'] as WomlingState;
}

/** 发现 Womling（首次接触触发） */
export function discoverWomling(state: GameState): void {
  const w = initWomling(state);
  w.discovered = true;
}

// ============================================================
// 建筑容量（每个建筑提供的最大人口）
// ============================================================

/** 计算当前 Womling 人口上限（取决于 village 数量） */
export function getWomlingPopCap(state: GameState): number {
  const space = state.space as Record<string, { count?: number; on?: number }>;
  const village = space['womling_village']?.on ?? 0;
  return village * 5;
}

// ============================================================
// 分配工作
// ============================================================

/** 分配 N 个 womling 到指定工作 */
export function assignWomling(state: GameState, job: keyof WomlingState['jobs'], delta: number): boolean {
  const w = initWomling(state);
  const newVal = w.jobs[job] + delta;
  if (newVal < 0) return false;

  const totalAssigned = Object.values(w.jobs).reduce((s, n) => s + n, 0);
  if (delta > 0 && totalAssigned + delta > w.population) return false;

  w.jobs[job] = newVal;
  return true;
}

// ============================================================
// Womling tick — 产出资源
// ============================================================

export function womlingTick(state: GameState, timeMul: number, deltas: Record<string, number>): void {
  const w = (state.space as Record<string, unknown>)['_womling'] as WomlingState | undefined;
  if (!w?.discovered) return;
  const space = state.space as Record<string, { count?: number; on?: number }>;

  // 人口增长（每秒 0.05 直到上限）
  const cap = getWomlingPopCap(state);
  if (w.population < cap) {
    w.population = Math.min(cap, w.population + 0.05 * timeMul);
  }

  // 士气影响（食物充足时 +1，缺粮时 -1）
  // farmer 提供食物
  const farmerOutput = w.jobs.farmer * 2 * (w.morale / 100);
  // miner 提供资源（Iron / Adamantite 比例）
  const minerOn = space['womling_mine']?.on ?? 0;
  const minerEff = Math.min(w.jobs.miner, minerOn * 5);
  if (minerEff > 0) {
    deltas['Iron'] = (deltas['Iron'] ?? 0) + minerEff * 50 * (w.morale / 100) * timeMul;
    deltas['Adamantite'] = (deltas['Adamantite'] ?? 0) + minerEff * 5 * (w.morale / 100) * timeMul;
  }
  // lab 提供 Knowledge
  const labOn = space['womling_lab']?.on ?? 0;
  const labEff = Math.min(w.jobs.lab, labOn * 5);
  if (labEff > 0) {
    deltas['Knowledge'] = (deltas['Knowledge'] ?? 0) + labEff * 30 * (w.morale / 100) * timeMul;
  }

  // farmer 出粮可以增加 womling 士气
  if (farmerOutput > w.population) {
    w.morale = Math.min(150, w.morale + 0.1 * timeMul);
  } else if (farmerOutput < w.population) {
    w.morale = Math.max(50, w.morale - 0.1 * timeMul);
  }

  // soldier：提供地区防御加成（在 syndicate.ts 接入）
}

// ============================================================
// 雇佣条件
// ============================================================

export function canUseWomling(state: GameState): boolean {
  const w = (state.space as Record<string, unknown>)['_womling'] as WomlingState | undefined;
  return Boolean(w?.discovered);
}

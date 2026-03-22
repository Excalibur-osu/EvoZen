/**
 * 仓储系统 — 板条箱 (Crates) 与集装箱 (Containers)
 *
 * 对标 legacy/src/resources.js 的 buildCrate/buildContainer + assign/unassign 逻辑。
 *
 * 核心机制：
 * - 板条箱 (Crate): 用 10 胶合板建造，每个分配给某资源后增加该资源上限 350
 * - 集装箱 (Container): 用 125 钢建造，每个分配给某资源后增加该资源上限 800
 * - 装运站 (storage_yard) 建筑增加板条箱最大可拥有数
 * - 集装箱港口 (warehouse) 建筑增加集装箱最大可拥有数
 */

import type { GameState } from '@evozen/shared-types';

// ============================================================
// 常量
// ============================================================

/** 每个板条箱增加的资源上限 — 原版 resources.js crateValue() 基础值 */
export const CRATE_VALUE = 350;

/** 每个集装箱增加的资源上限 — 原版 resources.js containerValue() 基础值 */
export const CONTAINER_VALUE = 800;

/** 建造一个板条箱所需的胶合板 — 原版 resources.js buildCrate() */
export const CRATE_COST_PLYWOOD = 10;

/** 建造一个集装箱所需的钢 — 原版 resources.js buildContainer() */
export const CONTAINER_COST_STEEL = 125;

/** 可以分配板条箱/集装箱的资源列表 — 对标原版 actions.js shed.res() */
export const STORABLE_RESOURCES = [
  'Lumber', 'Stone', 'Furs', 'Copper', 'Iron',
  'Aluminium', 'Cement', 'Coal', 'Steel',
] as const;

export type StorableResourceId = typeof STORABLE_RESOURCES[number];

// ============================================================
// 板条箱操作
// ============================================================

/**
 * 建造板条箱
 * 消耗 10 胶合板 → 增加 1 个板条箱库存
 * @returns 更新后的状态，或 null（资源不足/已满）
 */
export function buildCrate(state: GameState, qty: number = 1): GameState | null {
  const crates = state.resource['Crates'];
  const plywood = state.resource['Plywood'];
  if (!crates || !plywood) return null;

  // 检查上限
  const space = crates.max - crates.amount;
  if (space <= 0) return null;

  const actualQty = Math.min(qty, space);
  const totalCost = CRATE_COST_PLYWOOD * actualQty;
  if (plywood.amount < totalCost) return null;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.resource['Plywood'].amount -= totalCost;
  newState.resource['Crates'].amount += actualQty;
  return newState;
}

/**
 * 建造集装箱
 * 消耗 125 钢 → 增加 1 个集装箱库存
 */
export function buildContainer(state: GameState, qty: number = 1): GameState | null {
  const containers = state.resource['Containers'];
  const steel = state.resource['Steel'];
  if (!containers || !steel) return null;

  const space = containers.max - containers.amount;
  if (space <= 0) return null;

  const actualQty = Math.min(qty, space);
  const totalCost = CONTAINER_COST_STEEL * actualQty;
  if (steel.amount < totalCost) return null;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.resource['Steel'].amount -= totalCost;
  newState.resource['Containers'].amount += actualQty;
  return newState;
}

/**
 * 给某资源分配一个板条箱
 * 从未分配的板条箱池中取出，分配给目标资源
 */
export function assignCrate(state: GameState, resourceId: string, qty: number = 1): GameState | null {
  if (!STORABLE_RESOURCES.includes(resourceId as StorableResourceId)) return null;
  const crates = state.resource['Crates'];
  const target = state.resource[resourceId];
  if (!crates || !target) return null;

  // 未分配的 = 拥有总数 - 所有已分配的
  const totalAssigned = getTotalAssignedCrates(state);
  const available = crates.amount - totalAssigned;
  if (available <= 0) return null;

  const actualQty = Math.min(qty, available);

  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.resource[resourceId].crates = (newState.resource[resourceId].crates ?? 0) + actualQty;
  return newState;
}

/**
 * 从某资源取消分配一个板条箱
 */
export function unassignCrate(state: GameState, resourceId: string, qty: number = 1): GameState | null {
  const target = state.resource[resourceId];
  if (!target || (target.crates ?? 0) <= 0) return null;

  const actualQty = Math.min(qty, target.crates ?? 0);

  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.resource[resourceId].crates = Math.max(0, (newState.resource[resourceId].crates ?? 0) - actualQty);
  return newState;
}

/**
 * 给某资源分配一个集装箱
 */
export function assignContainer(state: GameState, resourceId: string, qty: number = 1): GameState | null {
  if (!STORABLE_RESOURCES.includes(resourceId as StorableResourceId)) return null;
  const containers = state.resource['Containers'];
  const target = state.resource[resourceId];
  if (!containers || !target) return null;

  const totalAssigned = getTotalAssignedContainers(state);
  const available = containers.amount - totalAssigned;
  if (available <= 0) return null;

  const actualQty = Math.min(qty, available);

  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.resource[resourceId].containers = (newState.resource[resourceId].containers ?? 0) + actualQty;
  return newState;
}

/**
 * 从某资源取消分配一个集装箱
 */
export function unassignContainer(state: GameState, resourceId: string, qty: number = 1): GameState | null {
  const target = state.resource[resourceId];
  if (!target || (target.containers ?? 0) <= 0) return null;

  const actualQty = Math.min(qty, target.containers ?? 0);

  const newState: GameState = JSON.parse(JSON.stringify(state));
  newState.resource[resourceId].containers = Math.max(0, (newState.resource[resourceId].containers ?? 0) - actualQty);
  return newState;
}

// ============================================================
// 辅助函数
// ============================================================

/** 获取已分配给各资源的板条箱总数 */
export function getTotalAssignedCrates(state: GameState): number {
  let total = 0;
  for (const res of Object.values(state.resource)) {
    total += res.crates ?? 0;
  }
  return total;
}

/** 获取已分配给各资源的集装箱总数 */
export function getTotalAssignedContainers(state: GameState): number {
  let total = 0;
  for (const res of Object.values(state.resource)) {
    total += res.containers ?? 0;
  }
  return total;
}

/**
 * 计算板条箱/集装箱对资源上限的加成
 * 在 applyBuildingEffects 中调用
 */
export function getStorageBonus(state: GameState, resourceId: string): number {
  const res = state.resource[resourceId];
  if (!res) return 0;
  const crateBonus = (res.crates ?? 0) * CRATE_VALUE;
  const containerBonus = (res.containers ?? 0) * CONTAINER_VALUE;
  return crateBonus + containerBonus;
}

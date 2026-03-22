/**
 * 工匠合成系统 (Crafting System)
 *
 * 本模块实现原版 Evolve 的铸造厂/工匠合成机制：
 * - 工匠被分配到不同的合成产线（胶合板、砖块、锻铁）
 * - 每个 tick 自动消耗原材料，产出合成品
 * - 合成速率 = 分配工匠数 × 基础速率 / 140（与原版一致）
 *
 * 纯函数模块，零 UI 依赖。
 */

import type { GameState } from '@evozen/shared-types';
import { CRAFT_COSTS } from './resources';

// ============================================================
// 合成产线 ID
// ============================================================

/** 第一阶段支持的合成品 ID */
export type CraftableId = 'Plywood' | 'Brick' | 'Wrought_Iron' | 'Sheet_Metal';

/** 所有可合成的产品 ID 列表 */
export const CRAFTABLE_IDS: CraftableId[] = ['Plywood', 'Brick', 'Wrought_Iron', 'Sheet_Metal'];

// ============================================================
// 合成产线数据结构（存储在 city.foundry 中）
// ============================================================

/**
 * 铸造厂状态：记录每个产线分配了多少工匠
 * 例如 { Plywood: 2, Brick: 1, Wrought_Iron: 0 }
 */
export interface FoundryState {
  /** 铸造厂建筑数量（已在 structures.ts 中定义, 这里仅做类型标注） */
  count: number;
  on: number;
  /** 各产线分配的工匠数 */
  [craftId: string]: number;
}

/**
 * 计算自动锻造的产出倍率
 *
 * 对标 legacy/src/resources.js craftingRatio():
 * - foundry:2 之后，每座铸造厂提供 +3% 自动锻造加成
 * - foundry:3 之后，同一产线每个额外工匠再 +3%
 * - foundry:4 之后，每座锯木厂为胶合板额外 +2%
 * - 矮人 artisan 特质使自动锻造总产量额外 ×1.5
 */
function getAutoCraftRatio(
  state: GameState,
  craftId: CraftableId,
  assignedWorkers: number
): number {
  let ratio = 1;
  const foundryLevel = state.tech['foundry'] ?? 0;
  const foundryCount = (state.city['foundry'] as FoundryState | undefined)?.count ?? 0;

  if (foundryLevel >= 2) {
    ratio += foundryCount * 0.03;
  }

  if (foundryLevel >= 3 && assignedWorkers > 1) {
    ratio += (assignedWorkers - 1) * 0.03;
  }

  if (foundryLevel >= 4 && craftId === 'Plywood') {
    const sawmills = (state.city['sawmill'] as { count?: number } | undefined)?.count ?? 0;
    ratio += sawmills * 0.02;
  }

  if (state.race['artisan']) {
    ratio *= 1.5;
  }

  return ratio;
}

// ============================================================
// 手动合成（一键制作）
// ============================================================

/**
 * 执行一次手动合成
 * @param state   当前游戏状态
 * @param craftId 要合成的物品 ID
 * @param qty     合成数量（默认 1）
 * @returns 合成成功后的新状态，或 null（材料不足）
 */
export function manualCraft(
  state: GameState,
  craftId: CraftableId,
  qty: number = 1
): GameState | null {
  const recipe = CRAFT_COSTS[craftId];
  if (!recipe) return null;

  // 检查材料是否充足
  for (const { resource, amount } of recipe) {
    const have = state.resource[resource]?.amount ?? 0;
    if (have < amount * qty) return null;
  }

  // 扣除材料
  const newState: GameState = JSON.parse(JSON.stringify(state));
  for (const { resource, amount } of recipe) {
    newState.resource[resource].amount -= amount * qty;
  }

  // 增加产出
  if (!newState.resource[craftId]) {
    // 安全措施：如果资源条目不存在则跳过
    return null;
  }
  newState.resource[craftId].amount += qty;

  return newState;
}

// ============================================================
// 自动合成 Tick（工匠产线）
// ============================================================

/**
 * 工匠自动合成 tick
 * 在主 tick 循环中调用，根据铸造厂分配的工匠自动消耗原料并产出合成品。
 *
 * 原版公式简化版：
 *   volume = min(工匠数, 可供原料承载的工匠数)
 *   消耗 = volume × recipe.amount × speed / 140
 *   产出 = volume × speed / 140
 *
 * @returns 各资源的 delta 变化量
 */
export function craftingTick(state: GameState): Record<string, number> {
  const deltas: Record<string, number> = {};

  // 铸造科技未解锁则跳过
  if ((state.tech['foundry'] ?? 0) < 1) return deltas;

  const foundry = state.city['foundry'] as FoundryState | undefined;
  if (!foundry) return deltas;

  const speed = 1;
  const baseTickRate = speed / 140; // 每个工匠每 tick 的基础产出

  for (const craftId of CRAFTABLE_IDS) {
    const assignedWorkers = foundry[craftId] ?? 0;
    if (assignedWorkers <= 0) continue;

    const recipe = CRAFT_COSTS[craftId];
    if (!recipe) continue;

    // 根据原料库存计算最多能支撑多少"有效工匠"
    let maxByMaterials = Infinity;
    for (const { resource, amount } of recipe) {
      const have = state.resource[resource]?.amount ?? 0;
      // 每个工匠每 tick 消耗 = amount * speed / 140
      const costPerWorkerPerTick = amount * baseTickRate;
      if (costPerWorkerPerTick > 0) {
        maxByMaterials = Math.min(maxByMaterials, Math.floor(have / costPerWorkerPerTick));
      }
    }

    const effectiveWorkers = Math.min(assignedWorkers, maxByMaterials);
    if (effectiveWorkers <= 0) continue;

    // 消耗原料
    for (const { resource, amount } of recipe) {
      const consumption = effectiveWorkers * amount * baseTickRate;
      deltas[resource] = (deltas[resource] ?? 0) - consumption;
    }

    // 产出合成品
    const output = effectiveWorkers * baseTickRate * getAutoCraftRatio(state, craftId, assignedWorkers);
    deltas[craftId] = (deltas[craftId] ?? 0) + output;
  }

  return deltas;
}

// ============================================================
// 工匠分配辅助函数
// ============================================================

/**
 * 将一个工匠分配到指定合成产线
 */
export function assignCraftsman(
  state: GameState,
  craftId: CraftableId
): GameState | null {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const foundry = newState.city['foundry'] as FoundryState | undefined;
  if (!foundry) return null;

  // 检查工匠总数是否已达上限
  const craftsman = newState.civic['craftsman'] as { workers: number; max: number } | undefined;
  if (!craftsman) return null;

  // 计算当前已分配的总工匠
  let totalAssigned = 0;
  for (const id of CRAFTABLE_IDS) {
    totalAssigned += foundry[id] ?? 0;
  }

  if (totalAssigned >= craftsman.workers) return null;

  // 分配
  foundry[craftId] = (foundry[craftId] ?? 0) + 1;
  return newState;
}

/**
 * 从指定合成产线移除一个工匠
 */
export function removeCraftsman(
  state: GameState,
  craftId: CraftableId
): GameState | null {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const foundry = newState.city['foundry'] as FoundryState | undefined;
  if (!foundry) return null;

  if ((foundry[craftId] ?? 0) <= 0) return null;

  foundry[craftId] = (foundry[craftId] ?? 0) - 1;
  return newState;
}

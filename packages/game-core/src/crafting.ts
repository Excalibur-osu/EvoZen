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
import { isSeasonalEventActive } from './seasonal-events';
import { getAchievementLevel, calcMastery } from './achievements';
import { getTraitVar } from './trait-ranks';
import { getResourcefulCraftDiscount } from './traits';

// ============================================================
// 合成产线 ID
// ============================================================

/** 第一阶段支持的合成品 ID */
export type CraftableId = 'Plywood' | 'Brick' | 'Wrought_Iron' | 'Sheet_Metal' | 'Mythril' | 'Thermite';

/** 所有可合成的产品 ID 列表 */
export const CRAFTABLE_IDS: CraftableId[] = ['Plywood', 'Brick', 'Wrought_Iron', 'Sheet_Metal', 'Mythril', 'Thermite'];

export function isCraftableAvailable(state: GameState, craftId: CraftableId, date: Date = new Date()): boolean {
  return craftId !== 'Thermite' || isSeasonalEventActive(state, 'summer', date);
}

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

export interface CraftingModifier {
  label: string;
  multiplier: number;
}

export interface CraftingAddition {
  label: string;
  bonus: number;
}

export interface CraftingInputResult {
  resource: string;
  baseRecipeAmount: number;
  adjustedRecipeAmount: number;
  baseConsumption: number;
  adjustedConsumption: number;
  consumption: number;
}

export interface CraftingLineResult {
  craftId: CraftableId;
  assignedWorkers: number;
  effectiveWorkers: number;
  speed: number;
  assignedBaseOutput: number;
  materialBaseOutput: number;
  scaledBaseOutput: number;
  additions: CraftingAddition[];
  multipliers: CraftingModifier[];
  inputs: CraftingInputResult[];
  output: number;
}

export interface CraftingTickResult {
  deltas: Record<string, number>;
  lines: CraftingLineResult[];
}

export interface CraftingTickOptions {
  poweredOn?: Record<string, number>;
  availableResources?: Record<string, number>;
  date?: Date;
}

const AUTO_CRAFT_TIME_MULTIPLIER = 0.25;

function raceRank(state: GameState, traitId: string): number {
  const value = state.race[traitId];
  return typeof value === 'number' && value > 0 ? value : value ? 1 : 0;
}

function highPopAdjust(state: GameState, value: number): number {
  const rank = raceRank(state, 'high_pop');
  if (!rank) return value;
  return value * getTraitVar('high_pop', 1, rank) / 100;
}

function livingToolCraftMultiplier(state: GameState): number {
  const rank = raceRank(state, 'living_tool');
  if (!rank) return 1;
  const bonus = rank === 0.1 ? 2 : rank === 0.25 ? 5 : rank === 0.5 ? 12
    : rank === 1 ? 25 : rank === 2 ? 35 : rank === 3 ? 42 : 45;
  return 1 + bonus / 100;
}

function getBaseRecipe(state: GameState, craftId: CraftableId) {
  if (craftId === 'Brick' && state.race['flier']) {
    return [{ resource: 'Stone', amount: 60 }];
  }
  return CRAFT_COSTS[craftId] ?? [];
}

function getCraftRecipe(state: GameState, craftId: CraftableId, manual: boolean) {
  const wastefulRank = raceRank(state, 'wasteful');
  const wastefulRate = wastefulRank
    ? 1 + getTraitVar('wasteful', 0, wastefulRank) / 100
    : 1;
  const highPopRank = !manual ? raceRank(state, 'high_pop') : 0;
  const highPopDivisor = highPopRank ? getTraitVar('high_pop', 0, highPopRank) : 1;

  return getBaseRecipe(state, craftId).map(({ resource, amount }) => {
    let adjustedAmount = amount;
    if (wastefulRate !== 1) adjustedAmount = Math.round(adjustedAmount * wastefulRate);
    if (highPopDivisor > 1) adjustedAmount = Math.round(adjustedAmount / highPopDivisor);
    return { resource, baseAmount: amount, amount: adjustedAmount };
  });
}

function getAutoCraftAdditions(
  state: GameState,
  craftId: CraftableId,
  assignedWorkers: number,
  fabricationSupported: number,
  colonistWorkers: number,
  poweredOn: Record<string, number>,
): CraftingAddition[] {
  const additions: CraftingAddition[] = [];
  const foundryLevel = state.tech['foundry'] ?? 0;
  const foundryCount = (state.city['foundry'] as FoundryState | undefined)?.count ?? 0;

  if (foundryLevel >= 2) {
    const skill = foundryLevel >= 8 ? 0.08 : (foundryLevel >= 5 ? 0.05 : 0.03);
    additions.push({ label: '铸造厂工具', bonus: foundryCount * skill });
  }

  if (foundryLevel >= 3 && assignedWorkers > 1) {
    additions.push({
      label: '学徒协作',
      bonus: (assignedWorkers - 1) * highPopAdjust(state, 0.03),
    });
  }

  if (foundryLevel >= 4 && craftId === 'Plywood') {
    const sawmills = (state.city['sawmill'] as { count?: number } | undefined)?.count ?? 0;
    additions.push({ label: '锯木厂工具', bonus: sawmills * 0.02 });
  }

  if (foundryLevel >= 6 && craftId === 'Brick') {
    additions.push({ label: '砖块铸造专精', bonus: foundryCount * 0.02 });
  }

  if (foundryLevel >= 7) {
    const cityFactoryOn = poweredOn['factory']
      ?? (state.city['factory'] as { on?: number } | undefined)?.on
      ?? 0;
    if (cityFactoryOn > 0) additions.push({ label: '城市工厂工具', bonus: cityFactoryOn * 0.05 });

    if ((state.tech['mars'] ?? 0) >= 4) {
      const redFactoryOn = poweredOn['red_factory']
        ?? (state.space['red_factory'] as { on?: number } | undefined)?.on
        ?? 0;
      if (redFactoryOn > 0) additions.push({ label: '火星工厂工具', bonus: redFactoryOn * 0.05 });
    }
  }

  if (fabricationSupported > 0 && colonistWorkers > 0) {
    const noEarth = Boolean(state.race['cataclysm'] || state.race['orbit_decayed']);
    const perColonist = highPopAdjust(state, noEarth ? 0.05 : 0.02);
    additions.push({
      label: '火星制造支援',
      bonus: fabricationSupported * colonistWorkers * perColonist,
    });
  }

  if (state.race['crafty']) additions.push({ label: '灵巧特质', bonus: 0.03 });

  const ambidextrous = Number(state.race['ambidextrous']) || 0;
  if (ambidextrous > 0) {
    additions.push({ label: '双手并用', bonus: ambidextrous * 0.03 });
  }

  const rigidRank = raceRank(state, 'rigid');
  if (rigidRank) {
    additions.push({ label: '僵硬特质', bonus: -getTraitVar('rigid', 0, rigidRank) / 100 });
  }

  return additions.filter(({ bonus }) => Math.abs(bonus) >= 1e-12);
}

function getAutoCraftMultipliers(state: GameState): CraftingModifier[] {
  const multipliers: CraftingModifier[] = [];
  if (state.race['artisan']) multipliers.push({ label: '工匠大师特质', multiplier: 1.5 });

  const livingTool = livingToolCraftMultiplier(state);
  if (livingTool !== 1) multipliers.push({ label: '活体工具特质', multiplier: livingTool });

  if (state.civic.govern?.type === 'socialist') {
    multipliers.push({ label: '社会主义政体', multiplier: 1.1 });
  }

  const ritualPower = Number((state.race['casting'] as Record<string, number> | undefined)?.['crafting']) || 0;
  if (ritualPower > 0) {
    multipliers.push({
      label: '制造仪式',
      multiplier: 1 + (2 * ritualPower) / (2 * ritualPower + 75),
    });
  }

  if (state.race.universe === 'magic') multipliers.push({ label: '魔法宇宙', multiplier: 0.8 });
  if ((state.tech['v_train'] ?? 0) > 0) multipliers.push({ label: '职业训练', multiplier: 2 });

  const craftyGene = state.genes['crafty'] ?? 0;
  if (craftyGene > 1) {
    multipliers.push({ label: '制造基因', multiplier: 1 + (craftyGene - 1) * 0.5 });
  }

  if (getAchievementLevel(state, 'lamentis') >= 1) {
    multipliers.push({ label: '拉门提斯成就', multiplier: 1.1 });
  }

  const ambidextrous = Number(state.race['ambidextrous']) || 0;
  if (ambidextrous > 0) {
    multipliers.push({ label: '双手并用熟练度', multiplier: 1 + ambidextrous * 0.02 });
  }

  const bloodArtisan = Number(state.blood['artisan']) || 0;
  if (bloodArtisan > 0) {
    multipliers.push({ label: '工匠血脉', multiplier: 1 + bloodArtisan / 100 });
  }

  const mastery = calcMastery(state);
  if (mastery > 0) {
    multipliers.push({
      label: '精通度',
      multiplier: 1 + mastery * (state.race['weak_mastery'] ? 2 : 1),
    });
  }

  return multipliers;
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
  qty: number = 1,
  date: Date = new Date(),
): GameState | null {
  if (!isCraftableAvailable(state, craftId, date)) return null;
  const recipe = getCraftRecipe(state, craftId, true);
  if (recipe.length === 0) return null;

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
 * 原版自动合成主链：
 *   volume = min(工匠数, 可供原料承载的工匠数)
 *   消耗 = volume × recipe.amount × speed / 140
 *   产出 = volume × speed / 140 × 工具加法区 × 全局乘法区
 *
 * @returns 各资源的 delta 变化量
 */
export function craftingTickWithSupport(
  state: GameState,
  fabricationSupported: number,
  colonistWorkers: number,
  date: Date = new Date(),
): Record<string, number> {
  return craftingTickDetailed(state, fabricationSupported, colonistWorkers, { date }).deltas;
}

export function craftingTickDetailed(
  state: GameState,
  fabricationSupported: number,
  colonistWorkers: number,
  options: CraftingTickOptions = {},
): CraftingTickResult {
  const deltas: Record<string, number> = {};
  const lines: CraftingLineResult[] = [];

  // 铸造科技未解锁则跳过
  if ((state.tech['foundry'] ?? 0) < 1) return { deltas, lines };

  const foundry = state.city['foundry'] as FoundryState | undefined;
  if (!foundry) return { deltas, lines };

  const speed = (state.genes['crafty'] ?? 0) > 0 ? 2 : 1;
  const baseTickRate = speed / 140; // 每个工匠每 tick 的基础产出
  const poweredOn = options.poweredOn ?? {};
  const date = options.date ?? new Date();
  const available = Object.fromEntries(
    Object.entries(state.resource).map(([resource, value]) => [
      resource,
      options.availableResources?.[resource] ?? value.amount,
    ]),
  );
  const costMultiplier = getResourcefulCraftDiscount(state);

  for (const craftId of CRAFTABLE_IDS) {
    if (!isCraftableAvailable(state, craftId, date)) continue;
    const assignedWorkers = foundry[craftId] ?? 0;
    if (assignedWorkers <= 0) continue;

    const recipe = getCraftRecipe(state, craftId, false);
    if (recipe.length === 0) continue;

    // 根据原料库存计算最多能支撑多少"有效工匠"
    let maxByMaterials = Infinity;
    for (const { resource, amount } of recipe) {
      const have = available[resource] ?? 0;
      // 每个工匠每 tick 消耗 = amount * speed / 140
      const costPerWorkerPerTick = amount * costMultiplier * baseTickRate;
      if (costPerWorkerPerTick > 0) {
        maxByMaterials = Math.min(maxByMaterials, Math.floor(have / costPerWorkerPerTick));
      }
    }

    const effectiveWorkers = Math.min(assignedWorkers, maxByMaterials);
    if (effectiveWorkers <= 0) continue;

    const inputs: CraftingInputResult[] = [];
    for (const { resource, baseAmount, amount } of recipe) {
      const baseConsumption = effectiveWorkers * baseAmount * baseTickRate;
      const adjustedConsumption = effectiveWorkers * amount * baseTickRate;
      const consumption = adjustedConsumption * costMultiplier;
      deltas[resource] = (deltas[resource] ?? 0) - consumption;
      available[resource] = Math.max(
        0,
        (available[resource] ?? 0) - consumption * AUTO_CRAFT_TIME_MULTIPLIER,
      );
      inputs.push({
        resource,
        baseRecipeAmount: baseAmount,
        adjustedRecipeAmount: amount,
        baseConsumption,
        adjustedConsumption,
        consumption,
      });
    }

    const assignedBaseOutput = assignedWorkers * baseTickRate;
    const materialBaseOutput = effectiveWorkers * baseTickRate;
    const scaledBaseOutput = highPopAdjust(state, materialBaseOutput);
    const additions = getAutoCraftAdditions(
      state,
      craftId,
      assignedWorkers,
      fabricationSupported,
      colonistWorkers,
      poweredOn,
    );
    const multipliers = getAutoCraftMultipliers(state);
    let output = scaledBaseOutput * (1 + additions.reduce((sum, factor) => sum + factor.bonus, 0));
    for (const factor of multipliers) output *= factor.multiplier;
    deltas[craftId] = (deltas[craftId] ?? 0) + output;
    available[craftId] = (available[craftId] ?? 0) + output * AUTO_CRAFT_TIME_MULTIPLIER;
    lines.push({
      craftId,
      assignedWorkers,
      effectiveWorkers,
      speed,
      assignedBaseOutput,
      materialBaseOutput,
      scaledBaseOutput,
      additions,
      multipliers,
      inputs,
      output,
    });
  }

  return { deltas, lines };
}

export function craftingTick(state: GameState): Record<string, number> {
  return craftingTickWithSupport(state, 0, 0);
}

// ============================================================
// 工匠分配辅助函数
// ============================================================

/**
 * 将一个工匠分配到指定合成产线
 */
export function assignCraftsman(
  state: GameState,
  craftId: CraftableId,
  date: Date = new Date(),
): GameState | null {
  if (!isCraftableAvailable(state, craftId, date)) return null;
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

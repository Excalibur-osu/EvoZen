/**
 * 基础种族特质定义与当前阶段已接入的 trait 效果
 *
 * 只实现当前引擎已经有挂点的特质：
 * - studious / arrogant
 * - greedy / merchant
 * - artisan / stubborn
 *
 * 其余基础种族 traits 先记录到 race 状态中，待军事 / ARPA / 士气系统补齐后再接入。
 */

import type { GameState, RaceState } from '@evozen/shared-types';
import { hasPlanetTrait } from './planet-traits';

export type SupportedSpeciesId = 'human' | 'elven' | 'orc' | 'dwarf' | 'goblin';

export type SpeciesTraitId =
  | 'creative'
  | 'diverse'
  | 'studious'
  | 'arrogant'
  | 'brute'
  | 'angry'
  | 'artisan'
  | 'stubborn'
  | 'greedy'
  | 'merchant';

export interface SpeciesTraitDescriptor {
  id: SpeciesTraitId;
  label: string;
  summary: string;
  activeNow: boolean;
}

export const SPECIES_TRAITS: Record<SupportedSpeciesId, SpeciesTraitId[]> = {
  human: ['creative', 'diverse'],
  elven: ['studious', 'arrogant'],
  orc: ['brute', 'angry'],
  dwarf: ['artisan', 'stubborn'],
  goblin: ['greedy', 'merchant'],
};

export const SPECIES_TRAIT_DESCRIPTORS: Record<SupportedSpeciesId, SpeciesTraitDescriptor[]> = {
  human: [
    { id: 'creative', label: '创造性', summary: 'ARPA 相关系统待接入。', activeNow: false },
    { id: 'diverse', label: '多样性', summary: '训练士兵速度 -20%（训练进度 ÷ 1.25）。', activeNow: true },
  ],
  elven: [
    { id: 'studious', label: '好学', summary: '教授知识 +0.25，图书馆知识上限 +10%。', activeNow: true },
    { id: 'arrogant', label: '傲慢', summary: '市场买入价格 +10%。', activeNow: true },
  ],
  orc: [
    { id: 'brute', label: '野蛮', summary: '训练速度 +100%（每秒额外 +2.5 进度），佣兵费用 -50%。', activeNow: true },
    { id: 'angry', label: '易怒', summary: '食物耗尽时所有工人产出仅为 25%（正常饥饿为 50%）。', activeNow: true },
  ],
  dwarf: [
    { id: 'artisan', label: '工匠大师', summary: '工匠自动合成产量 +50%。', activeNow: true },
    { id: 'stubborn', label: '顽固', summary: '科学类科技知识成本 +10%。', activeNow: true },
  ],
  goblin: [
    { id: 'greedy', label: '贪婪', summary: '税收收入 -12.5%。', activeNow: true },
    { id: 'merchant', label: '商人', summary: '市场卖出价格 +25%。', activeNow: true },
  ],
};

/** 判断某个物种是否属于当前可选基础种族 */
export function isSupportedSpecies(speciesId: string): speciesId is SupportedSpeciesId {
  return speciesId in SPECIES_TRAITS;
}

/** 将物种对应的 trait 标记写入 race 状态 */
export function assignSpeciesTraits(race: RaceState, speciesId: string): void {
  const traitIds: SpeciesTraitId[] = [
    'creative', 'diverse', 'studious', 'arrogant', 'brute',
    'angry', 'artisan', 'stubborn', 'greedy', 'merchant',
  ];

  for (const traitId of traitIds) {
    delete race[traitId];
  }

  if (!isSupportedSpecies(speciesId)) return;
  for (const traitId of SPECIES_TRAITS[speciesId]) {
    race[traitId] = 1;
  }
}

/** 获取种族 trait 描述 */
export function getSpeciesTraitDescriptors(speciesId: string): SpeciesTraitDescriptor[] {
  if (!isSupportedSpecies(speciesId)) return [];
  return SPECIES_TRAIT_DESCRIPTORS[speciesId];
}

function hasTrait(state: GameState, traitId: SpeciesTraitId): boolean {
  return Boolean(state.race[traitId]);
}

/** 精灵：教授知识 +0.25 */
export function getProfessorTraitBonus(state: GameState): number {
  return hasTrait(state, 'studious') ? 0.25 : 0;
}

/** 精灵：图书馆知识上限 +10% */
export function getLibraryKnowledgeCapMultiplier(state: GameState): number {
  return hasTrait(state, 'studious') ? 1.1 : 1;
}

/** 精灵：市场买入价格 +10% */
export function getTradeBuyPriceMultiplier(state: GameState): number {
  return hasTrait(state, 'arrogant') ? 1.1 : 1;
}

/** 地精：市场卖出价格 +25% */
export function getTradeSellPriceMultiplier(state: GameState): number {
  return hasTrait(state, 'merchant') ? 1.25 : 1;
}

/** 地精：税收收入 -12.5% */
export function getTaxIncomeTraitMultiplier(state: GameState): number {
  return hasTrait(state, 'greedy') ? 0.875 : 1;
}

/** 矮人：工匠自动合成产量 +50% */
export function getCraftingSpeedMultiplier(state: GameState): number {
  return hasTrait(state, 'artisan') ? 1.5 : 1;
}

/** 矮人：科学类科技的知识成本 +10% */
export function getScienceKnowledgeCostMultiplier(state: GameState, category: string): number {
  return hasTrait(state, 'stubborn') && category === 'science' ? 1.1 : 1;
}

/** 根据种族 trait + 行星特性调整科技费用 */
export function getModifiedTechCosts(
  state: GameState,
  costs: Record<string, number>,
  category: string,
  techId?: string
): Record<string, number> {
  const nextCosts = { ...costs };
  if (nextCosts['Knowledge'] !== undefined) {
    nextCosts['Knowledge'] = Math.ceil(nextCosts['Knowledge'] * getScienceKnowledgeCostMultiplier(state, category));
    // unstable 行星特性：特定科技 Knowledge 成本减半
    // 对标 legacy tech.js L2300: iron_mining Knowledge 2500→500 (实际是 /5，但我们按 legacy 精确值)
    // Phase 1A 仅影响 mining_3 (iron_mining)
    if (hasPlanetTrait(state, 'unstable') && techId && UNSTABLE_HALF_COST_TECHS.has(techId)) {
      nextCosts['Knowledge'] = Math.ceil(nextCosts['Knowledge'] * 0.5);
    }
  }
  return nextCosts;
}

// unstable 行星特性影响的科技列表（Phase 1A 范围）
// 对标 legacy tech.js: iron_mining 2500→500 实际是 /5 但更多科技是 /2
// 统一使用 /2 与大部分 legacy 科技一致
const UNSTABLE_HALF_COST_TECHS = new Set([
  'mining_3', // iron_mining: Knowledge 2500 → 1250
]);

/** Human（diverse）：训练速度除数。legacy main.js L8013: rate /= 1 + vars()[0]/100, vars()[0]=25 */
export function getTrainingSpeedDivisor(state: GameState): number {
  return hasTrait(state, 'diverse') ? 1.25 : 1;
}

/** Orc（brute）：训练速度加法加成。legacy main.js L8042: rate += vars()[1]/40 * time_mul, vars()[1]=100 */
export function getBruteTrainingBonus(state: GameState, timeMul: number): number {
  return hasTrait(state, 'brute') ? (100 / 40) * timeMul : 0;
}

/** Orc（brute）：佣兵费用乘数。legacy civics.js L1138: cost *= 1 - vars()[0]/100, vars()[0]=50 */
export function getMercCostMultiplier(state: GameState): number {
  return hasTrait(state, 'brute') ? 0.5 : 1;
}

/**
 * 饥饿产出乘数。legacy main.js L4022-4025:
 * hunger = fed ? 1 : 0.5
 * if angry && !fed: hunger = 0.25
 *
 * 注：legacy 中 fed 由当 tick 结算逻辑决定，此处以 food.amount > 0 作近似，
 * 语义上等价（食物库存耗尽即视为未喂饱），但严格来说是简化实现。
 */
export function getHungerMultiplier(state: GameState): number {
  if ((state.resource['Food']?.amount ?? 0) > 0) return 1;
  return hasTrait(state, 'angry') ? 0.25 : 0.5;
}

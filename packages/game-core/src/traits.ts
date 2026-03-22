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
    { id: 'diverse', label: '多样性', summary: '军事训练相关系统待接入。', activeNow: false },
  ],
  elven: [
    { id: 'studious', label: '好学', summary: '教授知识 +0.25，图书馆知识上限 +10%。', activeNow: true },
    { id: 'arrogant', label: '傲慢', summary: '市场买入价格 +10%。', activeNow: true },
  ],
  orc: [
    { id: 'brute', label: '野蛮', summary: '招募与训练加成待军事系统接入。', activeNow: false },
    { id: 'angry', label: '易怒', summary: '饥饿/士气联动待接入。', activeNow: false },
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

/** 根据种族 trait 调整科技费用 */
export function getModifiedTechCosts(
  state: GameState,
  costs: Record<string, number>,
  category: string
): Record<string, number> {
  const nextCosts = { ...costs };
  if (nextCosts['Knowledge'] !== undefined) {
    nextCosts['Knowledge'] = Math.ceil(nextCosts['Knowledge'] * getScienceKnowledgeCostMultiplier(state, category));
  }
  return nextCosts;
}

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
    { id: 'creative', label: '创造性', summary: 'ARPA 项目费用递增系数 -0.01。', activeNow: true },
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

// ============================================================
// 扩展 trait 效果挂载（接入 trait-ranks 数据）
// ============================================================

import { getTraitVar } from './trait-ranks';

function rankVal(state: GameState, trait: string, idx: number = 0): number {
  if (!state.race[trait]) return 0;
  const rank = (state.race[trait] as number) || 1;
  return getTraitVar(trait, idx, rank);
}

/** 强壮 (strong)：手动收集产出乘数（每手动 +N）*/
export function getStrongManualBonus(state: GameState): number {
  return rankVal(state, 'strong', 0) || 1;
}

/** 弱小 (weak)：lumberjack/miner/quarry_worker 产出 -X% */
export function getWeakWorkerMultiplier(state: GameState): number {
  const pct = rankVal(state, 'weak', 0);
  return pct ? 1 - pct / 100 : 1;
}

/** 强韧 (tough)：采矿产出 +X% */
export function getToughMiningMultiplier(state: GameState): number {
  const pct = rankVal(state, 'tough', 0);
  return pct ? 1 + pct / 100 : 1;
}

/** 聪明 (smart) / 愚钝 (dumb)：知识成本乘数 */
export function getKnowledgeCostTraitMultiplier(state: GameState): number {
  let mul = 1;
  const smart = rankVal(state, 'smart', 0);
  if (smart) mul *= 1 - smart / 100;
  const dumb = rankVal(state, 'dumb', 0);
  if (dumb) mul *= 1 + dumb / 100;
  return mul;
}

/** 缓慢 (slow)：tick 速度 -X% （游戏整体节奏变慢 X%）*/
export function getSlowSpeedMultiplier(state: GameState): number {
  const pct = rankVal(state, 'slow', 0);
  return pct ? 1 - pct / 100 : 1;
}

/** 亢奋 (hyper)：tick 速度 +X% */
export function getHyperSpeedMultiplier(state: GameState): number {
  const pct = rankVal(state, 'hyper', 0);
  return pct ? 1 + pct / 100 : 1;
}

/** Intelligent 智慧：教授/科学家全球产出加成 */
export function getIntelligentGlobalBonus(state: GameState): number {
  // vars[0]: professor pct, vars[1]: scientist pct
  const prof = rankVal(state, 'intelligent', 0);
  const sci = rankVal(state, 'intelligent', 1);
  if (!prof && !sci) return 1;
  const profCount = (state.civic['professor'] as { workers?: number } | undefined)?.workers ?? 0;
  const sciCount = (state.civic['scientist'] as { workers?: number } | undefined)?.workers ?? 0;
  return 1 + profCount * prof + sciCount * sci;
}

/** 吸盘抓握 (suction_grip)：全球生产加成 */
export function getSuctionGripBonus(state: GameState): number {
  const pct = rankVal(state, 'suction_grip', 0);
  return pct ? 1 + pct / 100 : 1;
}

/** Pack rat 囤积癖：储存空间 +X% */
export function getPackRatStorageBonus(state: GameState): number {
  const pct = rankVal(state, 'pack_rat', 0);
  return pct ? 1 + pct / 100 : 1;
}

/** Hoarder 囤积者：银行容量 +X% */
export function getHoarderBankBonus(state: GameState): number {
  const pct = rankVal(state, 'hoarder', 0);
  return pct ? 1 + pct / 100 : 1;
}

/** Paranoid 偏执：银行容量 -X% */
export function getParanoidBankPenalty(state: GameState): number {
  const pct = rankVal(state, 'paranoid', 0);
  return pct ? 1 - pct / 100 : 1;
}

/** Spiritual 虔诚：神殿效率 +X% */
export function getSpiritualTempleBonus(state: GameState): number {
  const pct = rankVal(state, 'spiritual', 0);
  return pct ? 1 + pct / 100 : 1;
}

/** Truthful 诚实：银行家效率 -X% */
export function getTruthfulBankerPenalty(state: GameState): number {
  const pct = rankVal(state, 'truthful', 0);
  return pct ? 1 - pct / 100 : 1;
}

/** Pompous 自大：教授效率 -X% */
export function getPompousProfessorPenalty(state: GameState): number {
  const pct = rankVal(state, 'pompous', 0);
  return pct ? 1 - pct / 100 : 1;
}

/** Toxic 剧毒：工厂工人产出 +X% */
export function getToxicFactoryBonus(state: GameState): number {
  const pct = rankVal(state, 'toxic', 0);
  return pct ? 1 + pct / 100 : 1;
}

/** Musical 音乐家：艺人效率 +X倍 */
export function getMusicalEntertainerBonus(state: GameState): number {
  const mul = rankVal(state, 'musical', 0);
  return mul ? 1 + mul : 1;
}

/** Logical 逻辑：每市民产生 X 知识/秒 */
export function getLogicalKnowledgePerCitizen(state: GameState): number {
  // vars[1]: knowledge per citizen
  return rankVal(state, 'logical', 1);
}

/** Curious 好奇：大学上限随人口增加（每市民 +X%） */
export function getCuriousUniversityBonus(state: GameState): number {
  const pct = rankVal(state, 'curious', 0);
  if (!pct) return 0;
  const pop = state.resource[state.race.species]?.amount ?? 0;
  return pop * pct;
}

/** Tracker 追踪者：狩猎收益 +X% */
export function getTrackerHuntBonus(state: GameState): number {
  const pct = rankVal(state, 'tracker', 0);
  return pct ? 1 + pct / 100 : 1;
}

/** Gluttony 暴食：食物消耗 +X% */
export function getGluttonyFoodMultiplier(state: GameState): number {
  const pct = rankVal(state, 'gluttony', 0);
  return pct ? 1 + pct / 100 : 1;
}

/** Ravenous 饕餮：食物消耗 +X% */
export function getRavenousFoodMultiplier(state: GameState): number {
  const pct = rankVal(state, 'ravenous', 0);
  return pct ? 1 + pct / 100 : 1;
}

/** High metabolism 高代谢：食物需求 +X% */
export function getHighMetabolismFoodMultiplier(state: GameState): number {
  const pct = rankVal(state, 'high_metabolism', 0);
  return pct ? 1 + pct / 100 : 1;
}

/** Forge 锻造：熔炉无需燃料；地热能加成（boolean） */
export function isForgeActive(state: GameState): boolean {
  return Boolean(state.race['forge']);
}

/** Iron allergy 铁过敏：铁矿产出 -X% */
export function getIronAllergyPenalty(state: GameState): number {
  const pct = rankVal(state, 'iron_allergy', 0);
  return pct ? 1 - pct / 100 : 1;
}

/** Pyrophobia 惧火：熔炉产出 -X% */
export function getPyrophobiaSmelterPenalty(state: GameState): number {
  const pct = rankVal(state, 'pyrophobia', 0);
  return pct ? 1 - pct / 100 : 1;
}

/** Hivemind 蜂群：岗位 N 人时产出乘数（≥阈值正增益，<阈值负增益）*/
export function getHivemindMultiplier(state: GameState, workersInJob: number): number {
  const threshold = rankVal(state, 'hivemind', 0); // 默认 10
  if (!threshold) return 1;
  return workersInJob >= threshold ? 1 + (workersInJob - threshold) * 0.05 : workersInJob / threshold;
}

/** Calm 平静：所有产出 +X% */
export function getCalmGlobalBonus(state: GameState): number {
  const pct = rankVal(state, 'calm', 0);
  return pct ? 1 + pct / 100 : 1;
}

/** Slaver 奴隶主：奴隶劳动加成（提供产出加成的小数比例） */
export function getSlaverBonus(state: GameState): number {
  // vars[0]: 0.28 = 每个奴隶 +28% 工人贡献
  const mul = rankVal(state, 'slaver', 0);
  if (!mul) return 1;
  const slaves = (state.city['slave_pen'] as { slaves?: number } | undefined)?.slaves ?? 0;
  return 1 + slaves * mul * 0.01;
}

/** Blissful 极乐：低士气惩罚减半 */
export function getBlissfulMoraleMultiplier(state: GameState): number {
  return hasTrait(state, 'blissful' as SpeciesTraitId) ? 2 : 1;
}

/** Resourceful 机智：工匠成本减少 X% */
export function getResourcefulCraftDiscount(state: GameState): number {
  const pct = rankVal(state, 'resourceful', 0);
  return pct ? 1 - pct / 100 : 1;
}

/** Slow digestion 缓慢消化：饿肚子时产出减少更小 */
export function getSlowDigestionStarvationMul(state: GameState): number {
  const bonus = rankVal(state, 'slow_digestion', 0);
  return bonus ? 1 + bonus : 1;
}

/** Tunneler 挖掘者：矿场/煤矿成本 -X */
export function getTunnelerMineCostDiscount(state: GameState): number {
  const pct = rankVal(state, 'tunneler', 0);
  return pct ? 1 - pct : 1;
}

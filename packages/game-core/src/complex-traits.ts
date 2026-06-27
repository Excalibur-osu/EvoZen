/**
 * 复杂 trait 效果挂载
 *
 * 对标 legacy/src/main.js 中分散于多处的特殊 trait 效果
 * 包括：wish/shapeshifter/elemental/imitation/blubber/tusk/revive/unstable/selenophobia
 *      /environmentalist/ocular_power/deconstructor/linked/anthropophagite/cannibalize 等
 */

import type { GameState } from '@evozen/shared-types';
import { getTraitVar } from './trait-ranks';
import { GENUS_DEFS, getRaceFullTraits, RACES } from './races';
import { TRAITS } from './trait-data';
import { loadCustomRace } from './custom-race';

function rankVal(state: GameState, trait: string, idx: number = 0): number {
  if (!state.race[trait]) return 0;
  const rank = (state.race[trait] as number) || 1;
  return getTraitVar(trait, idx, rank);
}

// ============================================================
// Selenophobia (arraak) — 月相影响产出
// 满月时 -X%，新月时 +X%
// ============================================================
export function getSelenophobiaMultiplier(state: GameState): number {
  if (!state.race['selenophobia']) return 1;
  const moon = state.city.calendar?.moon ?? 0;
  const vars0 = rankVal(state, 'selenophobia', 0);  // 4 默认
  // moon 0=新月（+），14=满月（−），其它正弦曲线
  const sinPhase = Math.sin((moon / 28) * Math.PI * 2);
  return 1 + sinPhase * vars0 * 0.01;
}

// ============================================================
// Environmentalist (dryad) — 强制可再生能源
// ============================================================
export function isEnvironmentalist(state: GameState): boolean {
  return Boolean(state.race['environmentalist']);
}

/** environmentalist：风电/太阳能产出加成 */
export function getEnvironmentalistRenewableBonus(state: GameState): number {
  if (!state.race['environmentalist']) return 1;
  // vars[1]: renewable multiplier
  return rankVal(state, 'environmentalist', 1);
}

// ============================================================
// Elemental (wyvern) — 基于 biome 提供元素加成
// ============================================================
export type ElementalType = 'fire' | 'acid' | 'electric' | 'frost';

export function getElementalType(state: GameState): ElementalType | null {
  if (!state.race['elemental']) return null;
  const biome = (state.city as { biome?: string }).biome ?? 'grassland';
  switch (biome) {
    case 'savanna': case 'forest': case 'swamp': return 'acid';
    case 'grassland': case 'desert': case 'eden': return 'electric';
    case 'oceanic': case 'tundra': case 'taiga': return 'frost';
    case 'volcanic': case 'ashland': case 'hellscape': return 'fire';
    default: return 'electric';
  }
}

/** elemental: 提供能量/工业/熔炼/生科/战斗加成 */
export function getElementalBonus(state: GameState, kind: 'power' | 'industry' | 'smelting' | 'bioscience' | 'combat'): number {
  if (!state.race['elemental']) return kind === 'combat' ? 0 : 1;
  const rank = (state.race['elemental'] as number) || 1;
  // vars: [type, power, industry, smelting, bioscience, combat]
  const v = rank === 0.1 ? [0.08, 0.01, 0.02, 0.005, 1]
          : rank === 0.25 ? [0.12, 0.02, 0.03, 0.01, 2]
          : rank === 0.5 ? [0.16, 0.04, 0.06, 0.02, 4]
          : rank === 1 ? [0.2, 0.06, 0.09, 0.03, 6]
          : rank === 2 ? [0.23, 0.08, 0.12, 0.04, 8]
          : rank === 3 ? [0.26, 0.10, 0.15, 0.05, 10]
          : [0.28, 0.12, 0.18, 0.06, 12];
  switch (kind) {
    case 'power': return 1 + v[0];
    case 'industry': return 1 + v[1];
    case 'smelting': return 1 + v[2];
    case 'bioscience': return 1 + v[3];
    case 'combat': return v[4];
  }
}

// ============================================================
// Imitation (synth) — 合成种族模仿其它种族 trait
// ============================================================
export function getImitatedSpecies(state: GameState): string | null {
  return (state.race['srace'] as string | undefined) ?? null;
}

/** Synth 模仿：从 srace 借用属类与种族 trait。正面使用 imitation vars[0]，负面使用 vars[1]。 */
export function applyImitationTraits(state: GameState): void {
  if (!state.race['imitation']) return;
  const srace = state.race['srace'] as string | undefined;
  if (!srace) return;
  const traits = getImitationTraitIds(state, srace);
  if (traits.length === 0) return;

  const positiveRank = rankVal(state, 'imitation', 0) || 0.5;
  const negativeRank = rankVal(state, 'imitation', 1) || positiveRank;

  for (const t of traits) {
    if (t === 'evil' || t === 'imitation') continue;
    const targetRank = (TRAITS[t]?.val ?? 0) < 0 ? negativeRank : positiveRank;
    const existingLvl = (state.race[t] as number) ?? 0;
    // 取最大值（不会因模仿降低已有 trait）
    state.race[t] = Math.max(existingLvl, targetRank);
  }
}

function getImitationTraitIds(state: GameState, srace: string): string[] {
  if (srace === 'custom' || srace === 'hybrid') {
    const config = loadCustomRace(state, srace === 'hybrid');
    if (!config) return [];
    const traitIds = new Set<string>();
    for (const trait of Object.keys(GENUS_DEFS[config.genus]?.traits ?? {})) {
      traitIds.add(trait);
    }
    for (const parentGenus of config.hybrid ?? []) {
      for (const trait of Object.keys(GENUS_DEFS[parentGenus]?.traits ?? {})) {
        traitIds.add(trait);
      }
    }
    for (const trait of config.traits) {
      traitIds.add(trait);
    }
    if (config.fanaticism) traitIds.add(config.fanaticism);
    return [...traitIds];
  }

  const srcRace = RACES[srace as keyof typeof RACES];
  return srcRace ? Object.keys(getRaceFullTraits(srcRace.id)) : [];
}

// ============================================================
// Blubber (narwhal) — 死亡市民被精炼为石油
// ============================================================
export function processBlubber(state: GameState, deathCount: number): void {
  if (!state.race['blubber'] || deathCount <= 0) return;
  const vars0 = rankVal(state, 'blubber', 0);  // 1 默认 = 每死亡转 1 Oil
  const oil = state.resource['Oil'];
  if (oil) {
    oil.amount = Math.min(oil.max, oil.amount + deathCount * vars0);
  }
}

// ============================================================
// Tusk (narwhal) — 基于湿度提供采矿加成
// ============================================================
export function getTuskMiningBonus(state: GameState): number {
  if (!state.race['tusk']) return 1;
  const biome = (state.city as { biome?: string }).biome ?? 'grassland';
  const moistureMap: Record<string, number> = {
    oceanic: 30, swamp: 30,
    eden: 20, forest: 20, grassland: 20, savanna: 20,
    tundra: 10, taiga: 10,
    desert: 0, volcanic: 0, ashland: 0, hellscape: 0,
  };
  let moisture = moistureMap[biome] ?? 0;
  if ((state.city.calendar?.weather ?? 2) === 0 && (state.city.calendar?.temp ?? 1) > 0) {
    moisture += 10;
  }
  const vars0 = rankVal(state, 'tusk', 0);  // 160 默认（采矿乘数）
  return 1 + (vars0 / 100) * (moisture / 30);
}

// ============================================================
// Revive (phoenix) — 阵亡士兵复活
// ============================================================
export function tryRevive(state: GameState, deathCount: number): number {
  if (!state.race['revive'] || deathCount <= 0) return 0;
  // vars 索引 0: 复活几率（%）
  const chance = rankVal(state, 'revive', 0);  // 5 默认
  let revived = 0;
  for (let i = 0; i < deathCount; i++) {
    if (Math.random() * 100 < chance) revived++;
  }
  return revived;
}

// ============================================================
// Unstable (lichen) — 随机死亡
// ============================================================
export function processUnstableDeath(state: GameState, timeMul: number): number {
  if (!state.race['unstable']) return 0;
  const vars0 = rankVal(state, 'unstable', 0);  // 4 默认（每秒 % 几率死亡）
  const pop = state.resource[state.race.species]?.amount ?? 0;
  if (pop <= 1) return 0;
  const expected = (pop * vars0 / 100 / 60) * timeMul;
  if (Math.random() < expected) {
    const deaths = Math.max(1, Math.floor(expected + 0.5));
    state.resource[state.race.species].amount = Math.max(0, pop - deaths);
    return deaths;
  }
  return 0;
}

// ============================================================
// Anthropophagite / Cannibalize — 食人加成
// ============================================================
export function getCannibalismBonus(state: GameState): number {
  if (!state.race['cannibalize']) return 1;
  const vars0 = rankVal(state, 'cannibalize', 0);  // 15
  return 1 + vars0 / 100;
}

// ============================================================
// Deconstructor (nano) — 建筑成本增加
// ============================================================
export function getDeconstructorCostMul(state: GameState): number {
  if (!state.race['deconstructor']) return 1;
  const pct = rankVal(state, 'deconstructor', 0);  // 100 = 翻倍
  return 1 + pct / 100;
}

// ============================================================
// Linked (nano) — 每市民量子加成
// ============================================================
export function getLinkedQuantiumBonus(state: GameState): number {
  if (!state.race['linked']) return 1;
  const pct = rankVal(state, 'linked', 0);  // 0.1 per citizen
  const pop = state.resource[state.race.species]?.amount ?? 0;
  const cap = rankVal(state, 'linked', 1) || 80;
  return 1 + Math.min(pop * pct, cap / 100);
}

// ============================================================
// Shapeshifter (nano) — 正面/负面 trait 等级修改
// ============================================================
export function getShapeshifterPositiveRank(state: GameState): number {
  if (!state.race['shapeshifter']) return 1;
  return rankVal(state, 'shapeshifter', 0);  // 0.5 (positive ranks halved)
}
export function getShapeshifterNegativeRank(state: GameState): number {
  if (!state.race['shapeshifter']) return 1;
  return rankVal(state, 'shapeshifter', 1);
}

// ============================================================
// Wish (djinn) — 许愿冷却机制 + 12 种随机奖励
// ============================================================
export function isWishReady(state: GameState): boolean {
  if (!state.race['wish']) return false;
  const lastWish = (state.race['wish_cooldown'] as number) ?? 0;
  return Date.now() > lastWish;
}

export type WishReward =
  | { type: 'money'; amount: number }
  | { type: 'resource'; res: string; amount: number }
  | { type: 'plasmid'; amount: number }
  | { type: 'phage'; amount: number }
  | { type: 'soul_gem'; amount: number }
  | { type: 'inspired'; ticks: number }
  | { type: 'motivated'; ticks: number }
  | { type: 'zodiac'; ticks: number }    // 黄道宫效果 ×2
  | { type: 'pop_growth'; ticks: number }
  | { type: 'tech_speed'; ticks: number }
  | { type: 'lucky'; ticks: number }
  | { type: 'fortune'; amount: number };

export function makeWish(state: GameState): WishReward | null {
  if (!isWishReady(state)) return null;

  const cooldownMinutes = rankVal(state, 'wish', 0); // 1440 默认 = 24h
  state.race['wish_cooldown'] = Date.now() + cooldownMinutes * 60 * 1000;

  // 从 12 种奖励中随机选一种
  const pick = Math.floor(Math.random() * 12);
  let reward: WishReward;

  const knowTotal = (state.stats?.['know'] as number) ?? 1;
  const scale = Math.max(1, knowTotal / 100);

  switch (pick) {
    case 0: {
      const amount = Math.round(50_000 * scale);
      if (state.resource['Money']) {
        state.resource['Money'].amount = Math.min(state.resource['Money'].max, state.resource['Money'].amount + amount);
      }
      reward = { type: 'money', amount };
      break;
    }
    case 1: {
      const candidates = ['Iron', 'Steel', 'Adamantite', 'Bolognium', 'Vitreloy'];
      const res = candidates[Math.floor(Math.random() * candidates.length)];
      const amount = Math.round(1000 * scale);
      if (state.resource[res]) {
        state.resource[res].amount = state.resource[res].max < 0
          ? state.resource[res].amount + amount
          : Math.min(state.resource[res].max, state.resource[res].amount + amount);
      }
      reward = { type: 'resource', res, amount };
      break;
    }
    case 2: {
      const amount = Math.max(1, Math.floor(scale / 10));
      const prestige = state.prestige as Record<string, { count: number }>;
      if (prestige['Plasmid']) prestige['Plasmid'].count += amount;
      reward = { type: 'plasmid', amount };
      break;
    }
    case 3: {
      const amount = Math.max(1, Math.floor(scale / 20));
      const prestige = state.prestige as Record<string, { count: number }>;
      if (prestige['Phage']) prestige['Phage'].count = (prestige['Phage'].count ?? 0) + amount;
      reward = { type: 'phage', amount };
      break;
    }
    case 4: {
      const amount = Math.max(1, Math.floor(scale / 30));
      if (state.resource['Soul_Gem']) {
        state.resource['Soul_Gem'].amount = state.resource['Soul_Gem'].max < 0
          ? state.resource['Soul_Gem'].amount + amount
          : Math.min(state.resource['Soul_Gem'].max, state.resource['Soul_Gem'].amount + amount);
      }
      reward = { type: 'soul_gem', amount };
      break;
    }
    case 5: {
      const ticks = 1200;
      state.race['inspired'] = ticks;
      reward = { type: 'inspired', ticks };
      break;
    }
    case 6: {
      const ticks = 1200;
      state.race['motivated'] = ticks;
      reward = { type: 'motivated', ticks };
      break;
    }
    case 7: {
      const ticks = 2400;
      state.race['wishStats'] = state.race['wishStats'] ?? {};
      (state.race['wishStats'] as Record<string, unknown>)['astro'] = true;
      reward = { type: 'zodiac', ticks };
      break;
    }
    case 8: {
      const ticks = 1800;
      state.race['popgrowth_boost'] = ticks;
      reward = { type: 'pop_growth', ticks };
      break;
    }
    case 9: {
      const ticks = 1800;
      state.race['tech_speed'] = ticks;
      reward = { type: 'tech_speed', ticks };
      break;
    }
    case 10: {
      const ticks = 1200;
      state.race['lucky'] = ticks;
      reward = { type: 'lucky', ticks };
      break;
    }
    case 11:
    default: {
      const amount = Math.round(200_000 * scale);
      if (state.resource['Money']) {
        state.resource['Money'].amount = Math.min(state.resource['Money'].max, state.resource['Money'].amount + amount);
      }
      reward = { type: 'fortune', amount };
      break;
    }
  }
  return reward;
}

// ============================================================
// Ocular Power (beholder) — 激活能量眼
// ============================================================
export function getOcularPowers(state: GameState): { active: number; scaling: number } {
  if (!state.race['ocular_power']) return { active: 0, scaling: 0 };
  const active = rankVal(state, 'ocular_power', 0);  // 2 默认
  const scaling = rankVal(state, 'ocular_power', 1); // 75 默认
  return { active, scaling };
}

// ============================================================
// Forge (salamander) — 熔炉无需燃料
// ============================================================
export function isForgeSmelting(state: GameState): boolean {
  return Boolean(state.race['forge']);
}

// ============================================================
// Cataclysm bonus —— 在 protected building / 转生中应用
// ============================================================
export function isCataclysmRace(state: GameState): boolean {
  return Boolean(state.race['cataclysm']);
}

// ============================================================
// 总入口：每 tick 处理需要主动作用的复杂 trait
// ============================================================
export function complexTraitTick(state: GameState, timeMul: number): void {
  if (state.race.species === 'protoplasm') return;
  applyImitationTraits(state);
  // unstable 死亡
  processUnstableDeath(state, timeMul);
}

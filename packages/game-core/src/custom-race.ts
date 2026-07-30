/**
 * 自定义种族系统
 * 对标 legacy/src/races.js customRace() / hybrid
 */

import type { GameState } from '@evozen/shared-types';
import { TRAITS } from './trait-data';
import { getAchievementLevel } from './achievements';
import { applyPathfinderGenusTraitRanks, downgradeTraitRank, GENUS_DEFS, RACES, type GenusId, type RaceId } from './races';

export interface CustomRaceConfig {
  /** 种族名（玩家定义） */
  name: string;
  /** 描述 */
  desc: string;
  /** 起源世界 */
  home: string;
  /** 单位名（"市民"/"机器人"等） */
  entity: string;
  /** 所属 genus */
  genus: GenusId;
  /** 混血时的父 genus 列表 */
  hybrid?: GenusId[];
  /** 选中的 trait IDs */
  traits: string[];
  /** 狂热信仰 trait（必须在 traits 列表中） */
  fanaticism: string;
  /** 各 trait 的等级（rank） */
  ranks?: Record<string, number>;
  /** 各星球的解锁名称（red/hell/gas 等） */
  red?: string;
  hell?: string;
  gas?: string;
  gas_moon?: string;
  dwarf?: string;
}

// ============================================================
// 自定义种族存储
// ============================================================

/** 保存自定义种族配置到 state.custom.race0（普通）或 race1（混血） */
export function saveCustomRace(state: GameState, config: CustomRaceConfig, hybrid: boolean = false): boolean {
  if (!(state as Record<string, unknown>)['custom']) (state as Record<string, unknown>)['custom'] = {};
  const slot = hybrid ? 'race1' : 'race0';
  const normalizedConfig: CustomRaceConfig = { ...config };
  if (hybrid) {
    const parents = normalizeHybridParents(normalizedConfig);
    normalizedConfig.hybrid = parents;
    normalizedConfig.genus = 'hybrid';
  } else if (!hybrid && normalizedConfig.genus === 'hybrid') {
    normalizedConfig.genus = 'humanoid';
    delete normalizedConfig.hybrid;
  }
  normalizedConfig.ranks = normalizeCustomRanks(normalizedConfig);
  if (!validateCustomRace(normalizedConfig, state).valid) return false;
  ((state as Record<string, Record<string, CustomRaceConfig>>)['custom'])[slot] = normalizedConfig;
  return true;
}

/** 加载自定义种族配置 */
export function loadCustomRace(state: GameState, hybrid: boolean = false): CustomRaceConfig | null {
  const custom = (state as Record<string, unknown>)['custom'] as Record<string, CustomRaceConfig> | undefined;
  if (!custom) return null;
  const slot = hybrid ? 'race1' : 'race0';
  return custom[slot] ?? null;
}

/** 删除自定义种族 */
export function clearCustomRace(state: GameState, hybrid: boolean = false): void {
  const custom = (state as Record<string, unknown>)['custom'] as Record<string, CustomRaceConfig> | undefined;
  if (!custom) return;
  const slot = hybrid ? 'race1' : 'race0';
  delete custom[slot];
}

// ============================================================
// 平衡分计算（对标 legacy customRace val 总和）
// 自定义种族应保持 val 总和接近 0（平衡）
// ============================================================

export function calcCustomRaceBalance(traits: string[]): number {
  let total = 0;
  for (const t of traits) {
    const def = TRAITS[t];
    if (def) total += def.val;
  }
  return total;
}

const ACHIEVEMENT_AFFIXES = ['l', 'e', 'a', 'h', 'm', 'mg'] as const;

/** 原版自定义种族可用基因点：各宇宙飞升等级总和，加技术恐惧症每级 4 点。 */
export function getCustomRaceGeneBudget(state: GameState): number {
  const achievements = state.stats.achieve as Record<string, Record<string, number>>;
  const ascended = achievements?.['ascended'];
  const ascendedGenes = ascended
    ? ACHIEVEMENT_AFFIXES.reduce((sum, affix) => sum + Math.max(0, ascended[affix] ?? 0), 0)
    : 0;
  return ascendedGenes + getAchievementLevel(state, 'technophobe') * 4;
}

function getOriginGenuses(origin: string): GenusId[] {
  const race = RACES[origin as RaceId];
  if (!race) return [];
  return race.type === 'hybrid' ? (race.hybrid ?? []) : [race.type];
}

function applyRankToGeneCost(cost: number, rank: number): number {
  if (cost >= 0) {
    switch (rank) {
      case 0.1: cost -= 3; break;
      case 0.25: cost -= 2; break;
      case 0.5: cost--; break;
      case 2: cost = Math.max(Math.round(cost * 1.5), cost + 1); break;
      case 3: cost = Math.max(Math.round(cost * 2), cost + 2); break;
      case 4: cost = Math.max(Math.round(cost * 2.5), cost + 3); break;
    }
    return Math.max(1, cost);
  }

  switch (rank) {
    case 0.1: return cost - 3;
    case 0.25: return cost - 2;
    case 0.5: return cost - 1;
    case 2: return cost + 1;
    case 3: return cost + 2;
    case 4: return cost + 3;
    default: return cost;
  }
}

/** 对标 legacy calcGenomeScore，返回配置完成后剩余的基因点。 */
export function calcCustomRaceGenes(state: GameState, config: CustomRaceConfig): number {
  let genes = getCustomRaceGeneBudget(state);
  const activeGenuses = config.genus === 'hybrid' ? (config.hybrid ?? []) : [config.genus];
  const opposedGenuses = activeGenuses.flatMap((genus) => GENUS_DEFS[genus]?.oppose ?? []);

  for (const genus of activeGenuses) {
    for (const traitId of Object.keys(GENUS_DEFS[genus]?.traits ?? {})) {
      genes -= TRAITS[traitId]?.val ?? 0;
    }
  }

  const positiveComplexity: Record<string, number> = {};
  const negativeComplexity: Record<string, number> = {};
  for (const traitId of config.traits) {
    const trait = TRAITS[traitId];
    if (!trait) continue;
    const taxonomy = trait.taxonomy;
    let geneCost = trait.val;

    if (trait.val >= 0) {
      const complexity = positiveComplexity[taxonomy] ?? 0;
      if (complexity > 1) geneCost += complexity - 1;
      positiveComplexity[taxonomy] = complexity + 1;
    } else {
      const complexity = negativeComplexity[taxonomy] ?? 0;
      if (complexity >= 1) geneCost += complexity;
      negativeComplexity[taxonomy] = complexity + 1;
    }

    const rank = config.ranks?.[traitId];
    if (rank !== undefined) geneCost = applyRankToGeneCost(geneCost, rank);
    const originGenuses = getOriginGenuses(trait.origin);
    const activeMatches = activeGenuses.filter((genus) => originGenuses.includes(genus)).length;
    if (activeMatches > 0) geneCost -= activeMatches === 1 ? 1 : 2;
    const opposedMatches = opposedGenuses.filter((genus) => originGenuses.includes(genus)).length;
    if (opposedMatches > 0) geneCost += opposedMatches === 1 ? 1 : 2;
    genes -= geneCost;
  }

  return genes;
}

/** 验证自定义种族是否合法 */
export function validateCustomRace(config: CustomRaceConfig, state: GameState): { valid: boolean; reason?: string } {
  if (!config.name || config.name.length < 2) return { valid: false, reason: '名字太短' };
  if (!config.traits || config.traits.length === 0) return { valid: false, reason: '至少需要一个 trait' };
  if (new Set(config.traits).size !== config.traits.length) return { valid: false, reason: '特质不能重复' };
  for (const traitId of config.traits) {
    if (!TRAITS[traitId] || TRAITS[traitId].type !== 'major') {
      return { valid: false, reason: '包含无效的主要特质' };
    }
  }
  if (!config.fanaticism || !config.traits.includes(config.fanaticism)) return { valid: false, reason: '狂热信仰必须在 traits 中' };
  if (!GENUS_DEFS[config.genus]) return { valid: false, reason: '无效的属类' };
  for (const [traitId, rank] of Object.entries(config.ranks ?? {})) {
    if (!config.traits.includes(traitId)) return { valid: false, reason: 'rank 只能设置给已选择 trait' };
    if (!VALID_CUSTOM_RANKS.has(rank)) return { valid: false, reason: 'trait rank 无效' };
  }
  if (config.genus === 'hybrid') {
    const parents = config.hybrid ?? [];
    if (parents.length !== 2) return { valid: false, reason: '混血种族需要选择两个父属类' };
    if (parents[0] === parents[1]) return { valid: false, reason: '混血父属类不能相同' };
    for (const parent of parents) {
      if (!GENUS_DEFS[parent] || parent === 'hybrid' || parent === 'organism') {
        return { valid: false, reason: '混血父属类无效' };
      }
    }
  }

  const genes = calcCustomRaceGenes(state, config);
  if (genes < 0) return { valid: false, reason: `基因点不足（还差 ${Math.abs(genes)} 点）` };

  return { valid: true };
}

const VALID_CUSTOM_RANKS = new Set([0.1, 0.25, 0.5, 1, 2, 3, 4]);

function normalizeCustomRanks(config: CustomRaceConfig): Record<string, number> | undefined {
  const ranks: Record<string, number> = {};
  for (const traitId of config.traits) {
    const rank = config.ranks?.[traitId] ?? 1;
    if (VALID_CUSTOM_RANKS.has(rank) && rank !== 1) ranks[traitId] = rank;
  }
  return Object.keys(ranks).length > 0 ? ranks : undefined;
}

function normalizeHybridParents(config: CustomRaceConfig): GenusId[] {
  const explicit = (config.hybrid ?? []).filter((genus) => GENUS_DEFS[genus] && genus !== 'hybrid' && genus !== 'organism');
  if (explicit.length >= 2 && explicit[0] !== explicit[1]) {
    return [explicit[0], explicit[1]];
  }
  const primary = config.genus !== 'hybrid' && config.genus !== 'organism' ? config.genus : 'humanoid';
  return [primary, primary === 'humanoid' ? 'small' : 'humanoid'];
}

/**
 * 将自定义种族应用为 RACES['custom']
 * 在选择种族 / 转生时调用
 */
export function applyCustomRace(state: GameState, hybrid: boolean = false, mainType?: GenusId): boolean {
  const config = loadCustomRace(state, hybrid);
  if (!config) return false;

  const speciesId = hybrid ? 'hybrid' : 'custom';
  for (const traitId of Object.keys(TRAITS)) {
    delete state.race[traitId];
  }
  delete state.race['fanaticism'];
  delete state.race['maintype'];
  state.race.species = speciesId;
  state.race['fanaticism'] = config.fanaticism || 'none';
  state.race['maintype'] = mainType ?? (hybrid ? (config.hybrid?.[0] ?? 'hybrid') : config.genus);

  // 应用 genus 默认 trait
  const genus = GENUS_DEFS[config.genus];
  if (genus) {
    for (const [t, lvl] of Object.entries(genus.traits)) {
      state.race[t] = lvl;
    }
  }
  if (hybrid && config.hybrid) {
    for (const parentGenus of config.hybrid) {
      for (const [t, lvl] of Object.entries(GENUS_DEFS[parentGenus]?.traits ?? {})) {
        state.race[t] = parentGenus === state.race['maintype'] ? lvl : downgradeTraitRank(lvl);
      }
    }
  }

  // 应用自定义 trait
  for (const t of config.traits) {
    state.race[t] = config.ranks?.[t] ?? 1;
  }
  applyPathfinderGenusTraitRanks(state, state.race['maintype'] as GenusId | undefined);
  return true;
}

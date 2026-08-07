/**
 * CRISPR / 基因强化系统
 * 对标 legacy/src/arpa.js Genetics 标签页
 *
 * 用 Plasmid + Phage 永久强化各 minor trait 等级（跨转生保留）。
 */

import type { GameState } from '@evozen/shared-types';
import { unlockFeat } from './achievements';
import { getRaceMainType, RACES, type RaceId } from './races';
import { TRAITS, type TraitType } from './trait-data';

// ============================================================
// CRISPR 强化条目（Genetics）
// 每个 minor trait 可强化 0-5 级，每级提供等比加成
// ============================================================

export interface CrisprUpgrade {
  id: string;
  /** 强化的 minor trait ID */
  traitId: string;
  name: string;
  desc: string;
  /** 成本生成函数（基于当前等级） */
  plasmidCost: (level: number) => number;
  phageCost?: (level: number) => number;
  maxLevel?: number;
  /** 非 trait 型基因使用独立存储 key；默认等于 id。 */
  geneId?: string;
  /** 购买后是否同步写入 race trait。 */
  appliesRaceTrait?: boolean;
  condition?: (state: GameState, level: number) => boolean;
}

const CHALLENGE_GENE_COSTS = [5, 50, 400, 2500, 4000];
const MUTATION_GENE_COSTS = [1250, 1500, 1750];

export const CRISPR_UPGRADES: CrisprUpgrade[] = [
  {
    id: 'challenge',
    traitId: 'challenge',
    name: '挑战基因',
    desc: '解锁并强化挑战开局选项，对标 hardened genes → mastered 的 challenge 等级链。',
    plasmidCost: (lvl) => CHALLENGE_GENE_COSTS[lvl] ?? CHALLENGE_GENE_COSTS[CHALLENGE_GENE_COSTS.length - 1],
    maxLevel: CHALLENGE_GENE_COSTS.length,
    appliesRaceTrait: false,
    condition: (state, lvl) => lvl < 2 || lvl >= 4 || (state.race.universe ?? 'standard') !== 'standard',
  },
  {
    id: 'mutation',
    traitId: 'mutation',
    name: '形态突变',
    desc: '依次解锁主要特质移除、属类特质移除和可用主要特质添加。',
    plasmidCost: (lvl) => MUTATION_GENE_COSTS[lvl] ?? MUTATION_GENE_COSTS[MUTATION_GENE_COSTS.length - 1],
    maxLevel: MUTATION_GENE_COSTS.length,
    appliesRaceTrait: false,
  },
  {
    id: 'minor_creative',
    traitId: 'creative',
    name: '基因强化：创造力',
    desc: '永久增强创造力 trait 等级（rank +0.5/级，最高 4 级）。',
    plasmidCost: (lvl) => Math.round(50 * Math.pow(1.5, lvl)),
  },
  {
    id: 'minor_tactical',
    traitId: 'tactical',
    name: '基因强化：战术',
    desc: '战争加成 +5%/级。',
    plasmidCost: (lvl) => Math.round(35 * Math.pow(1.5, lvl)),
  },
  {
    id: 'minor_analytical',
    traitId: 'analytical',
    name: '基因强化：分析',
    desc: '科学加成 +5%/级。',
    plasmidCost: (lvl) => Math.round(35 * Math.pow(1.5, lvl)),
  },
  {
    id: 'minor_promiscuous',
    traitId: 'promiscuous',
    name: '基因强化：繁殖',
    desc: '人口增长 +5%/级。',
    plasmidCost: (lvl) => Math.round(35 * Math.pow(1.5, lvl)),
  },
  {
    id: 'minor_resilient',
    traitId: 'resilient',
    name: '基因强化：坚韧',
    desc: '采煤加成 +5%/级。',
    plasmidCost: (lvl) => Math.round(35 * Math.pow(1.5, lvl)),
  },
  {
    id: 'minor_cunning',
    traitId: 'cunning',
    name: '基因强化：狡黠',
    desc: '狩猎加成 +5%/级。',
    plasmidCost: (lvl) => Math.round(35 * Math.pow(1.5, lvl)),
  },
  {
    id: 'minor_hardy',
    traitId: 'hardy',
    name: '基因强化：耐劳',
    desc: '工厂加成 +5%/级。',
    plasmidCost: (lvl) => Math.round(35 * Math.pow(1.5, lvl)),
  },
  {
    id: 'minor_ambidextrous',
    traitId: 'ambidextrous',
    name: '基因强化：双手并用',
    desc: '工匠加成 +5%/级。',
    plasmidCost: (lvl) => Math.round(35 * Math.pow(1.5, lvl)),
  },
  {
    id: 'minor_industrious',
    traitId: 'industrious',
    name: '基因强化：勤勉',
    desc: '矿工加成 +5%/级。',
    plasmidCost: (lvl) => Math.round(35 * Math.pow(1.5, lvl)),
  },
  {
    id: 'minor_content',
    traitId: 'content',
    name: '基因强化：满足',
    desc: '士气 +1/级。',
    plasmidCost: (lvl) => Math.round(40 * Math.pow(1.5, lvl)),
  },
  {
    id: 'minor_fibroblast',
    traitId: 'fibroblast',
    name: '基因强化：愈合',
    desc: '士兵恢复 +5%/级。',
    plasmidCost: (lvl) => Math.round(35 * Math.pow(1.5, lvl)),
  },
  {
    id: 'minor_metallurgist',
    traitId: 'metallurgist',
    name: '基因强化：冶金',
    desc: '合金产出 +5%/级。',
    plasmidCost: (lvl) => Math.round(35 * Math.pow(1.5, lvl)),
  },
  {
    id: 'minor_gambler',
    traitId: 'gambler',
    name: '基因强化：赌徒',
    desc: '赌场加成 +5%/级。',
    plasmidCost: (lvl) => Math.round(35 * Math.pow(1.5, lvl)),
  },
  {
    id: 'minor_persuasive',
    traitId: 'persuasive',
    name: '基因强化：说服',
    desc: '贸易卖价 +5%/级。',
    plasmidCost: (lvl) => Math.round(35 * Math.pow(1.5, lvl)),
  },

  // 特殊强化（消耗 Phage）
  {
    id: 'genus_extra',
    traitId: 'untapped',
    name: '潜能解锁',
    desc: '解锁额外的特质槽位（与种族无关）。',
    plasmidCost: (lvl) => Math.round(100 * Math.pow(2, lvl)),
    phageCost: (lvl) => Math.round(50 * Math.pow(2, lvl)),
  },
];

// ============================================================
// 状态管理
// ============================================================

/** 获取某 CRISPR 升级当前已购买的等级 */
export function getCrisprLevel(state: GameState, upgradeId: string): number {
  const upg = CRISPR_UPGRADES.find((u) => u.id === upgradeId);
  const genes = state.genes as Record<string, number>;
  return genes[upg?.geneId ?? upgradeId] ?? 0;
}

/** 原版所有 CRISPR 质粒成本在反物质宇宙都会改用 AntiPlasmid。 */
export function getCrisprPrestigeResource(state: GameState): 'Plasmid' | 'AntiPlasmid' {
  return state.race.universe === 'antimatter' ? 'AntiPlasmid' : 'Plasmid';
}

/** 检查是否能购买（资源 + 等级 < 5）*/
export function canPurchaseCrispr(state: GameState, upgradeId: string): boolean {
  const upg = CRISPR_UPGRADES.find((u) => u.id === upgradeId);
  if (!upg) return false;
  const lvl = getCrisprLevel(state, upgradeId);
  if (lvl >= (upg.maxLevel ?? 5)) return false;
  if (upg.condition && !upg.condition(state, lvl)) return false;
  const plasmidCost = upg.plasmidCost(lvl);
  const phageCost = upg.phageCost?.(lvl) ?? 0;

  const prestige = state.prestige as Record<string, { count?: number }> | undefined;
  const plasmid = prestige?.[getCrisprPrestigeResource(state)]?.count ?? 0;
  const phage = prestige?.['Phage']?.count ?? 0;

  return plasmid >= plasmidCost && phage >= phageCost;
}

/** 购买一级 CRISPR 升级 */
export function purchaseCrispr(state: GameState, upgradeId: string): boolean {
  if (!canPurchaseCrispr(state, upgradeId)) return false;
  const upg = CRISPR_UPGRADES.find((u) => u.id === upgradeId)!;
  const lvl = getCrisprLevel(state, upgradeId);
  const plasmidCost = upg.plasmidCost(lvl);
  const phageCost = upg.phageCost?.(lvl) ?? 0;

  const prestige = state.prestige as Record<string, { count: number }>;
  const prestigeResource = getCrisprPrestigeResource(state);
  if (prestige[prestigeResource]) prestige[prestigeResource].count -= plasmidCost;
  if (phageCost > 0 && prestige['Phage']) prestige['Phage'].count -= phageCost;

  const genes = state.genes as Record<string, number>;
  const geneKey = upg.geneId ?? upgradeId;
  genes[geneKey] = lvl + 1;

  // 同步设置 race trait 等级（minor trait 立即生效）
  const newLevel = (genes[geneKey] ?? 0) * 0.25;  // 5 级对应 rank=1.25 即接近 rank=1 上限
  if (upg.traitId !== 'untapped' && upg.appliesRaceTrait !== false) {
    state.race[upg.traitId] = Math.min(1, newLevel);  // minor trait 跨转生保留
  }
  return true;
}

/** 是否解锁 CRISPR 编辑面板（legacy: 研究 CRISPR 后 genetics=4）。 */
export function isCrisprUnlocked(state: GameState): boolean {
  return (state.tech['genetics'] ?? 0) >= 4;
}

/** 获取所有可用升级（已解锁的） */
export function getAvailableCrispr(state: GameState): CrisprUpgrade[] {
  if (!isCrisprUnlocked(state)) return [];
  return CRISPR_UPGRADES;
}

// ============================================================
// 本轮种族特质编辑（legacy genetics mutation / transformation）
// ============================================================

export interface RaceTraitModification {
  id: string;
  name: string;
  desc: string;
  type: TraitType;
  rank: number;
  cost: number;
  resource: 'Plasmid' | 'AntiPlasmid';
}

interface RaceModificationCounters {
  t: number;
  nr: number;
  na: number;
  pr: number;
  pa: number;
}

const MODIFIED_RACES = new Set(['custom', 'hybrid', 'sludge', 'ultra_sludge']);
const SLUDGE_RACES = new Set(['sludge', 'ultra_sludge']);
const ADD_EXCLUDED_RACES = new Set(['junker', 'sludge', 'ultra_sludge', 'custom']);
const ADD_EXCLUDED_TRAITS = new Set(['soul_eater', 'catnip', 'anise']);

function modificationResource(state: GameState): 'Plasmid' | 'AntiPlasmid' {
  return getCrisprPrestigeResource(state);
}

function modificationCounters(state: GameState): RaceModificationCounters | undefined {
  const value = state.race['modified'];
  if (!value || typeof value !== 'object') return undefined;
  const counters = value as Partial<RaceModificationCounters>;
  return {
    t: Number(counters.t ?? 0),
    nr: Number(counters.nr ?? 0),
    na: Number(counters.na ?? 0),
    pr: Number(counters.pr ?? 0),
    pa: Number(counters.pa ?? 0),
  };
}

function ensureModificationCounters(state: GameState): RaceModificationCounters {
  const counters = modificationCounters(state) ?? { t: 0, nr: 0, na: 0, pr: 0, pa: 0 };
  state.race['modified'] = counters;
  return counters;
}

function prestigeCount(state: GameState, resource: 'Plasmid' | 'AntiPlasmid'): number {
  return Number((state.prestige[resource] as { count?: number } | undefined)?.count ?? 0);
}

function traitBaseCost(state: GameState, traitId: string): number {
  const trait = TRAITS[traitId];
  if (!trait) return Number.POSITIVE_INFINITY;
  const multiplier = MODIFIED_RACES.has(state.race.species) ? 10 : 1;
  return Math.abs(trait.val * 5 * multiplier);
}

/** 原版当前世代移除一个主要/属类特质的质粒费用。 */
export function getRaceTraitRemovalCost(state: GameState, traitId: string): number {
  const trait = TRAITS[traitId];
  if (!trait) return Number.POSITIVE_INFINITY;
  let cost = traitBaseCost(state, traitId);
  const rank = Number(state.race[traitId] ?? 0);
  if (trait.val < 0) {
    if (rank === 0.1) cost *= 4;
    else if (rank === 0.25) cost *= 3;
    else if (rank === 0.5) cost *= 2;
  }
  const modified = modificationCounters(state);
  if (modified) {
    cost += modified.t * 10;
    if (trait.val < 0) cost += modified.nr * 10;
  }
  return cost;
}

/** 原版当前世代添加一个主要特质的质粒费用。 */
export function getRaceTraitAdditionCost(state: GameState, traitId: string): number {
  const trait = TRAITS[traitId];
  if (!trait) return Number.POSITIVE_INFINITY;
  let cost = traitBaseCost(state, traitId);
  const modified = modificationCounters(state);
  if (modified) {
    cost += modified.t * 10;
    if (trait.val >= 0) cost += modified.pa * 10;
  }
  return cost;
}

function mimicTraits(state: GameState): Set<string> {
  const copied = Array.isArray(state.race['ss_traits']) ? state.race['ss_traits'] as string[] : [];
  const imitated = state.race['iTraits'] && typeof state.race['iTraits'] === 'object'
    ? Object.keys(state.race['iTraits'] as Record<string, unknown>)
    : [];
  return new Set([...copied, ...imitated]);
}

function isProtectedTrait(state: GameState, traitId: string): boolean {
  const copied = mimicTraits(state);
  if (copied.has(traitId)) return true;
  if (traitId === 'forager' && (copied.has('herbivore') || copied.has('carnivore'))) return true;

  const absorbed = Array.isArray(state.race['absorbed']) ? state.race['absorbed'] as string[] : [];
  if (absorbed.some((raceId) => RACES[raceId as RaceId]?.fanaticism === traitId)) return true;
  return Boolean(state.race['warlord']) && ['iron_wood', 'unified', 'apex_predator'].includes(traitId);
}

function canRemoveRaceTraitWithoutCost(state: GameState, traitId: string): boolean {
  const trait = TRAITS[traitId];
  const mutation = Number(state.genes['mutation'] ?? 0);
  if (!trait || !state.race[traitId]) return false;
  if (trait.type !== 'major' && trait.type !== 'genus') return false;
  if (['evil', 'soul_eater', 'artifical'].includes(traitId)) return false;
  if (trait.type === 'major' && mutation < 1) return false;
  if (trait.type === 'genus' && mutation < 2) return false;
  if (SLUDGE_RACES.has(state.race.species) && (traitId === 'ooze' || Boolean(state.race['modified']))) return false;
  return !isProtectedTrait(state, traitId);
}

export function getRemovableRaceTraits(state: GameState): RaceTraitModification[] {
  const resource = modificationResource(state);
  return Object.keys(state.race)
    .filter((traitId) => canRemoveRaceTraitWithoutCost(state, traitId))
    .map((traitId) => ({
      id: traitId,
      name: TRAITS[traitId].name,
      desc: TRAITS[traitId].desc,
      type: TRAITS[traitId].type,
      rank: Number(state.race[traitId]),
      cost: getRaceTraitRemovalCost(state, traitId),
      resource,
    }));
}

export function canRemoveRaceTrait(state: GameState, traitId: string): boolean {
  if (!canRemoveRaceTraitWithoutCost(state, traitId)) return false;
  const resource = modificationResource(state);
  return prestigeCount(state, resource) >= getRaceTraitRemovalCost(state, traitId);
}

function countBlankSlateTraits(state: GameState): number {
  return Object.keys(state.race).filter((traitId) => {
    const trait = TRAITS[traitId];
    return traitId !== 'evil' && (trait?.type === 'major' || trait?.type === 'genus');
  }).length;
}

export function removeRaceTrait(state: GameState, traitId: string): boolean {
  if (!canRemoveRaceTrait(state, traitId)) return false;
  const trait = TRAITS[traitId];
  const resource = modificationResource(state);
  const cost = getRaceTraitRemovalCost(state, traitId);
  const prestige = state.prestige[resource] as { count: number };
  prestige.count -= cost;
  delete state.race[traitId];

  const modified = ensureModificationCounters(state);
  modified.t++;
  if (trait.val >= 0) modified.pr++;
  else modified.nr++;

  if (traitId === 'forager' && state.race['inactiveTraits'] && typeof state.race['inactiveTraits'] === 'object') {
    const inactive = state.race['inactiveTraits'] as Record<string, unknown>;
    delete inactive['herbivore'];
    delete inactive['carnivore'];
  }
  if (countBlankSlateTraits(state) === 0) unlockFeat(state, 'blank_slate');
  return true;
}

function raceGenuses(state: GameState): string[] {
  const race = RACES[state.race.species as RaceId];
  if (!race) return [];
  return race.type === 'hybrid' ? race.hybrid ?? [] : [race.type];
}

function availableAdditionRanks(state: GameState): Map<string, number> {
  const ranks = new Map<string, number>();
  if (Number(state.genes['mutation'] ?? 0) < 3 || state.race.species === 'hellspawn') return ranks;
  if (SLUDGE_RACES.has(state.race.species) && state.race['modified']) return ranks;

  const species = state.race.species;
  const genuses = raceGenuses(state);
  const mainType = getRaceMainType(state);
  for (const race of Object.values(RACES)) {
    if (ADD_EXCLUDED_RACES.has(race.id)) continue;
    const eligible = genuses.includes(race.type) || (race.type === 'hybrid' && race.id === species);
    if (!eligible) continue;
    for (const traitId of Object.keys(race.traits)) {
      if (state.race[traitId] || ADD_EXCLUDED_TRAITS.has(traitId)) continue;
      if (traitId === 'dumb' && state.race['smart']) continue;
      if (traitId === 'smart' && state.race['dumb']) continue;
      const rank = race.type !== mainType && race.id !== species ? 0.5 : 1;
      const current = ranks.get(traitId);
      if (current === undefined || rank > current) ranks.set(traitId, rank);
    }
  }
  return ranks;
}

export function getAddableRaceTraits(state: GameState): RaceTraitModification[] {
  const resource = modificationResource(state);
  return [...availableAdditionRanks(state)].map(([traitId, rank]) => ({
    id: traitId,
    name: TRAITS[traitId]?.name ?? traitId,
    desc: TRAITS[traitId]?.desc ?? '',
    type: TRAITS[traitId]?.type ?? 'major',
    rank,
    cost: getRaceTraitAdditionCost(state, traitId),
    resource,
  }));
}

export function canAddRaceTrait(state: GameState, traitId: string): boolean {
  if (!availableAdditionRanks(state).has(traitId)) return false;
  const resource = modificationResource(state);
  return prestigeCount(state, resource) >= getRaceTraitAdditionCost(state, traitId);
}

export function addRaceTrait(state: GameState, traitId: string): boolean {
  const rank = availableAdditionRanks(state).get(traitId);
  if (rank === undefined || !canAddRaceTrait(state, traitId)) return false;
  const trait = TRAITS[traitId];
  if (!trait) return false;
  const resource = modificationResource(state);
  const cost = getRaceTraitAdditionCost(state, traitId);
  const prestige = state.prestige[resource] as { count: number };
  prestige.count -= cost;
  state.race[traitId] = rank;

  const modified = ensureModificationCounters(state);
  modified.t++;
  if (trait.val >= 0) modified.pa++;
  else modified.na++;
  return true;
}

// ============================================================
// CRISPR 抽取 minor trait（gene_drift 机制）
// 对标 legacy: 玩家可消耗 Plasmid + Phage 从已发现种族中抽取一个 minor trait
// 抽到的 trait 添加到 state.genes.discovered，可在自定义种族中选用
// ============================================================

/** 已发现/抽取的 minor trait 列表 */
export function getDiscoveredMinorTraits(state: GameState): string[] {
  const genes = state.genes as Record<string, unknown>;
  return (genes['discovered_minor'] as string[]) ?? [];
}

/** 尝试抽取 minor trait（每次随机抽 1 个 minor trait 加入基因池）*/
export function rollMinorTrait(state: GameState): string | null {
  const prestige = state.prestige as Record<string, { count?: number }>;
  const prestigeResource = getCrisprPrestigeResource(state);
  const plasmid = prestige?.[prestigeResource]?.count ?? 0;
  const phage = prestige?.['Phage']?.count ?? 0;
  const PLASMID_COST = 25;
  const PHAGE_COST = 1;
  if (plasmid < PLASMID_COST || phage < PHAGE_COST) return null;

  const discovered = getDiscoveredMinorTraits(state);
  // 所有可能的 minor trait（来自 trait-data）
  const ALL_MINOR_TRAITS = ['tactical', 'analytical', 'promiscuous', 'resilient', 'cunning', 'hardy', 'ambidextrous', 'industrious', 'content', 'fibroblast', 'metallurgist', 'gambler', 'persuasive'];
  const available = ALL_MINOR_TRAITS.filter((t) => !discovered.includes(t));
  if (available.length === 0) return null;

  // 扣费
  if (prestige[prestigeResource]) prestige[prestigeResource].count = plasmid - PLASMID_COST;
  if (prestige['Phage']) prestige['Phage'].count = phage - PHAGE_COST;

  const pick = available[Math.floor(Math.random() * available.length)];
  const genes = state.genes as Record<string, unknown>;
  genes['discovered_minor'] = [...discovered, pick];

  // 自动 +1 等级（首次发现给基础等级）
  state.race[pick] = Math.max((state.race[pick] as number) ?? 0, 0.25);

  return pick;
}

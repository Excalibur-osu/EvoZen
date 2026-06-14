/**
 * CRISPR / 基因强化系统
 * 对标 legacy/src/arpa.js Genetics 标签页
 *
 * 用 Plasmid + Phage 永久强化各 minor trait 等级（跨转生保留）。
 */

import type { GameState } from '@evozen/shared-types';

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

export const CRISPR_UPGRADES: CrisprUpgrade[] = [
  {
    id: 'challenge',
    traitId: 'challenge',
    name: '挑战基因',
    desc: '解锁并强化挑战开局选项，对标 hardened genes → mastered 的 challenge 等级链。',
    plasmidCost: (lvl) => CHALLENGE_GENE_COSTS[lvl] ?? CHALLENGE_GENE_COSTS[CHALLENGE_GENE_COSTS.length - 1],
    maxLevel: CHALLENGE_GENE_COSTS.length,
    appliesRaceTrait: false,
    condition: (state, lvl) => lvl < 2 || (state.race.universe ?? 'standard') !== 'standard',
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
  const plasmid = prestige?.['Plasmid']?.count ?? 0;
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
  if (prestige['Plasmid']) prestige['Plasmid'].count -= plasmidCost;
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

/** 是否解锁 CRISPR（需 dna_repair 或 genetics 科技 + 拥有 Plasmid） */
export function isCrisprUnlocked(state: GameState): boolean {
  const plasmid = (state.prestige as Record<string, { count?: number }>)?.['Plasmid']?.count ?? 0;
  return plasmid > 0 && (state.tech['genetics'] ?? 0) >= 1;
}

/** 获取所有可用升级（已解锁的） */
export function getAvailableCrispr(state: GameState): CrisprUpgrade[] {
  if (!isCrisprUnlocked(state)) return [];
  return CRISPR_UPGRADES;
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
  const plasmid = prestige?.['Plasmid']?.count ?? 0;
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
  if (prestige['Plasmid']) prestige['Plasmid'].count = plasmid - PLASMID_COST;
  if (prestige['Phage']) prestige['Phage'].count = phage - PHAGE_COST;

  const pick = available[Math.floor(Math.random() * available.length)];
  const genes = state.genes as Record<string, unknown>;
  genes['discovered_minor'] = [...discovered, pick];

  // 自动 +1 等级（首次发现给基础等级）
  state.race[pick] = Math.max((state.race[pick] as number) ?? 0, 0.25);

  return pick;
}

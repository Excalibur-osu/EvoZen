/**
 * ARPA 长线研究系统
 *
 * 对标：legacy/src/arpa.js
 *
 * 核心机制：
 *   每次 tick 调用 arpaTick() → 若项目正在进行，按比例扣除资源并累计进度
 *   进度满 100% → 授予 tech grant，项目 rank+1（允许重复建造同类型项目）
 *
 * costMultiplier(project, rank, base, mult) = Math.round(mult^rank * base)
 *   legacy L1733-1742
 *
 * 分段付款：每次 tick 付 cost/100（即把总费用分 100 份）
 *   legacy L1688: global['resource'][res].amount -= costs[res]() / 100
 *
 * Phase 1A 范围（不依赖太空/魔法的项目）：
 *   monument        reqs: {monument:1}  → grant monuments，士气上限 +2/座
 *   stock_exchange  reqs: {banking:9}   → grant stock_exchange，银行+10%
 */

import type { GameState } from '@evozen/shared-types';

// ============================================================
// 类型
// ============================================================

export interface ArpaProjectState {
  /** 当前完成次数（rank），影响下一次费用 */
  rank: number;
  /** 当前建造进度 0-100 */
  progress: number;
  /** 是否正在施工（玩家手动启动） */
  active: boolean;
}

export interface ArpaState {
  /** 纪念碑类型（Obelisk/Statue/Sculpture/Monolith/Pillar） */
  m_type: MonumentType;
  /** 各项目状态 */
  monument: ArpaProjectState;
  stock_exchange: ArpaProjectState;
  [key: string]: ArpaProjectState | MonumentType;
}

export type MonumentType =
  | 'Obelisk'
  | 'Statue'
  | 'Sculpture'
  | 'Monolith'
  | 'Pillar';

// ============================================================
// 项目定义
// ============================================================

export interface ArpaProjectDef {
  id: string;
  name: string;
  desc: string;
  /** 解锁所需 tech 等级 */
  reqs: Record<string, number>;
  /** 完成后在 tech 中设置的字段 */
  grantKey: string;
  /** 效果描述（静态） */
  effectText: string;
  /** 单次总费用（rank=0 时）*/
  baseCost: (mType?: MonumentType) => Record<string, number>;
  /** 费用递增系数 */
  mult: number;
}

export const MONUMENT_NAMES: Record<MonumentType, string> = {
  Obelisk: '方尖碑',
  Statue: '雕像',
  Sculpture: '雕刻',
  Monolith: '独石',
  Pillar: '柱廊',
};

/** 纪念碑各类型的基础费用（legacy arpa.js L1652-1664） */
function monumentBaseCost(mType: MonumentType): Record<string, number> {
  switch (mType) {
    case 'Obelisk':  return { Stone: 1_000_000 };
    case 'Statue':   return { Aluminium: 350_000 };
    case 'Sculpture':return { Steel: 300_000 };
    case 'Monolith': return { Cement: 300_000 };
    case 'Pillar':   return { Lumber: 1_000_000 };
  }
}

export const ARPA_PROJECTS: ArpaProjectDef[] = [
  {
    id: 'monument',
    name: '纪念碑',
    desc: '建造宏大的纪念性建筑，提振民众士气。',
    reqs: { monument: 1 },
    grantKey: 'monuments',
    effectText: '士气上限 +2（每座纪念碑）。',
    baseCost: (mType = 'Obelisk') => monumentBaseCost(mType),
    mult: 1.1,
  },
  {
    id: 'stock_exchange',
    name: '证券交易所',
    desc: '建立现代金融市场，大幅提升银行盈利能力。',
    reqs: { banking: 9 },
    grantKey: 'stock_exchange',
    effectText: '银行收益 +10%，解锁更多金融科技。',
    baseCost: () => ({
      Money: 3_000_000,
      Plywood: 25_000,
      Brick: 20_000,
      Wrought_Iron: 10_000,
    }),
    mult: 1.06,
  },
];

// ============================================================
// 辅助函数
// ============================================================

/** 读取 tech 等级 */
function techLevel(state: GameState, id: string): number {
  return (state.tech[id] as number | undefined) ?? 0;
}

/** 读取 ARPA 状态（兼容旧存档）*/
function getArpaState(state: GameState): ArpaState {
  if (!state.arpa) {
    state.arpa = {
      m_type: 'Obelisk',
      monument: { rank: 0, progress: 0, active: false },
      stock_exchange: { rank: 0, progress: 0, active: false },
    };
  }
  return state.arpa as ArpaState;
}

/**
 * 计算项目当前费用（总额，百分之一为每步付款）
 * costMultiplier = Math.round(mult^rank * base)
 * legacy arpa.js L1733-1742
 *
 * Human creative 特性将 mult 减少 0.01（legacy L1735-1737）
 */
export function arpaCost(
  state: GameState,
  projectId: string
): Record<string, number> {
  const def = ARPA_PROJECTS.find((p) => p.id === projectId);
  if (!def) return {};

  const arpa = getArpaState(state);
  const proj = arpa[projectId] as ArpaProjectState;
  const rank = proj?.rank ?? 0;

  // creative 特性减少 mult（legacy traits.creative.vars()[0] = 0.01）
  let mult = def.mult;
  if (state.race['creative']) {
    mult = Math.max(1.0, mult - 0.01);
  }

  const mType = arpa.m_type;
  const base = def.baseCost(mType);
  const result: Record<string, number> = {};
  for (const [res, baseVal] of Object.entries(base)) {
    result[res] = Math.round(Math.pow(mult, rank) * baseVal);
  }
  return result;
}

// ============================================================
// 项目可用性检查
// ============================================================

export function isArpaAvailable(state: GameState, projectId: string): boolean {
  const def = ARPA_PROJECTS.find((p) => p.id === projectId);
  if (!def) return false;
  for (const [tech, lvl] of Object.entries(def.reqs)) {
    if (techLevel(state, tech) < lvl) return false;
  }
  return true;
}

// ============================================================
// 启动 / 停止项目
// ============================================================

export function startArpaProject(state: GameState, projectId: string): GameState | null {
  if (!isArpaAvailable(state, projectId)) return null;
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const arpa = getArpaState(newState);
  const proj = arpa[projectId] as ArpaProjectState;
  if (proj.active) return null; // 已在进行中
  proj.active = true;
  return newState;
}

export function stopArpaProject(state: GameState, projectId: string): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  const arpa = getArpaState(newState);
  const proj = arpa[projectId] as ArpaProjectState;
  proj.active = false;
  return newState;
}

export function setMonumentType(state: GameState, mType: MonumentType): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));
  getArpaState(newState).m_type = mType;
  return newState;
}

// ============================================================
// ARPA Tick
// 对标 legacy arpa.js L1684-1692 + main.js 的 arpa tick
// ============================================================

/**
 * 每个游戏 tick 调用一次
 * 对每个 active 项目：扣除 cost/100 资源，进度 +1
 * 进度满 100 → 授予 grant，rank+1，progress 重置
 *
 * @returns 本 tick 完成的项目 ID 列表（供 UI 显示消息）
 */
export function arpaTick(state: GameState, _timeMul: number): string[] {
  if (state.race.species === 'protoplasm') return [];

  const arpa = getArpaState(state);
  const completed: string[] = [];

  for (const def of ARPA_PROJECTS) {
    if (!isArpaAvailable(state, def.id)) continue;
    const proj = arpa[def.id] as ArpaProjectState;
    if (!proj?.active) continue;

    const totalCost = arpaCost(state, def.id);
    let canAfford = true;

    // 检查能否支付 cost/100
    for (const [res, total] of Object.entries(totalCost)) {
      const step = total / 100;
      const resState = state.resource[res];
      if (!resState || resState.amount < step) {
        canAfford = false;
        break;
      }
    }

    if (!canAfford) {
      // 资源不足时暂停（legacy 会显示提示，这里暂停即可）
      continue;
    }

    // 扣除 cost/100
    for (const [res, total] of Object.entries(totalCost)) {
      state.resource[res].amount -= total / 100;
    }

    proj.progress += 1;

    // 完成
    if (proj.progress >= 100) {
      proj.progress = 0;
      proj.rank += 1;
      proj.active = false;

      // 授予 tech grant
      const currentGrant = techLevel(state, def.grantKey);
      state.tech[def.grantKey] = currentGrant + 1;

      completed.push(def.id);
    }
  }

  return completed;
}

// ============================================================
// 查询接口（供 store 和 UI 使用）
// ============================================================

export function getArpaProjectState(
  state: GameState,
  projectId: string
): ArpaProjectState {
  const arpa = getArpaState(state);
  return (arpa[projectId] as ArpaProjectState) ?? { rank: 0, progress: 0, active: false };
}

export function getMonumentType(state: GameState): MonumentType {
  return getArpaState(state).m_type;
}

export function getAvailableArpaProjects(state: GameState): ArpaProjectDef[] {
  return ARPA_PROJECTS.filter((p) => isArpaAvailable(state, p.id));
}

/**
 * 士气上限加成（由 monument 授予）
 * legacy：每座纪念碑 +2，上限减 gaslighter 政体加成（暂不实现）
 */
export function getMonumentMoraleBonus(state: GameState): number {
  return techLevel(state, 'monuments') * 2;
}

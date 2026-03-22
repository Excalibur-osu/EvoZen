/**
 * 政府与政体系统
 *
 * 严格对标 legacy/src/civics.js govEffect 函数（L186-284）
 * 每种政体对产出的加成或惩罚，仅保留第一阶段（文明时代）有意义的效果。
 *
 * 政体解锁：
 *   - govern:1 (government 科技)    → 无政府/独裁/民主/寡头 可选
 *   - govern:2 (republic 科技)      → 共和国 可选（后期，暂不实装）
 *
 * 第一阶段只实装前 4 种政体 + 「变更政体」的冷却计数器。
 */

import type { GameState } from '@evozen/shared-types';

// ============================================================
// 政体 ID 联合类型
// ============================================================

/** 目前可选的政体（第一阶段） */
export type GovernmentType = 'anarchy' | 'autocracy' | 'democracy' | 'oligarchy';

// ============================================================
// 政体定义（名称 + 描述 + 效果摘要）
// ============================================================

export interface GovernmentDef {
  id: GovernmentType;
  name: string;
  description: string;
  /** 需要的 govern 科技等级 */
  reqGovern: number;
  /** 效果描述（给玩家看的文字） */
  effects: string[];
}

/** 政体定义表 — 对标 legacy/src/civics.js govDescription + govEffect */
export const GOVERNMENT_DEFS: GovernmentDef[] = [
  {
    id: 'anarchy',
    name: '无政府',
    description: '无集中统治，各行其是。',
    reqGovern: 0,
    effects: ['无特殊加成，也无任何惩罚。'],
  },
  {
    id: 'autocracy',
    name: '独裁',
    description: '集权于一人，强调服从。',
    reqGovern: 1,
    // legacy civics.js L187-191: govEffect.autocracy()
    // [0] stress 容忍度 × (1 + 25/100)（市民在高压下不闹事）
    // [1] military attack boost = 35%
    // 注：独裁对税收无任何加成（main.js L7628 中独裁无任何 income multiplier）
    effects: ['压力容忍度 +25%（居民更难闹事）', '军事战斗力 +35%'],
  },
  {
    id: 'democracy',
    name: '民主',
    description: '公民参与政治，解放创造力。',
    reqGovern: 1,
    // legacy civics.js L193-197: govEffect.democracy()
    // [0] entertainer 加成 = 20%
    // [1] work_malus = 5%（影响士气系统，纯属数据备注；士气系统实装后才会展现）
    effects: ['娱乐业效率 +20%', '居民工作压力 -5%（待士气系统实装后生效）'],
  },
  {
    id: 'oligarchy',
    name: '寡头',
    description: '精英阶层掌控经济命脉。',
    reqGovern: 1,
    // legacy civics.js L200: tax penalty 5%, tax cap 20%
    effects: ['税率上限 +20%（最高可调至40%）', '基础税收效率 -5%'],
  },
];

// ============================================================
// 政体效果计算
// ============================================================

/**
 * 获取当前政体对税收的乘数
 * 对标 legacy/src/main.js L7586-7626 中政体影响 tax_income 部分
 *
 * @param state - 当前游戏状态
 * @returns 税收乘数（1.0 = 无加成）
 */
export function getTaxMultiplier(state: GameState): number {
  const govType = state.civic.govern?.type ?? 'anarchy';
  switch (govType) {
    case 'oligarchy':
      // 寡头：税收效率 -5%（但可设更高上限）
      // 对标 legacy/src/main.js L7628-7629:
      // income_base *= 1 - (govEffect.oligarchy()[0] / 100) → oligarchy()[0] = 5
      return 1 - (5 / 100);  // 0.95
    default:
      // 独裁/民主/无政府：对税收无特殊加减
      // 原版 main.js L7586-7636 中，autocracy 没有任何税收乘数
      return 1.0;
  }
}

/**
 * 获取当前政体对生产力的乘数
 * 对标 legacy/src/civics.js govEffect.democracy / govEffect.autocracy
 *
 * @param state - 当前游戏状态
 * @returns 生产力乘数（1.0 = 无加成）
 */
export function getProductionMultiplier(state: GameState): number {
  // 原版 govEffect.democracy()[1] = work_malus = 5（%）
  // 该值在原版 main.js 中属于 morale/stress 系统（全局士气影响生产力），
  // 并非直接乘资源产出。EvoZen 目前尚未实装士气系统，
  // 因此此函数暂时统一返回 1.0，待士气系统实装后补充。
  //
  // 注：独裁在原版 main.js L3120-3121 中作用于 stress（提高压力容忍度），
  // 不直接影响资源产出乘数。
  //
  // 对标 legacy/src/main.js L3274-3288 (morale → global_multiplier)
  return 1.0;
}

/**
 * 获取当前政体允许的最高税率
 * 对标 legacy/src/civics.js govEffect.oligarchy: tax_cap=20
 * 原版基础上限为 20，寡头额外 +20 = 40（govEffect.oligarchy()[1] = 20）
 *
 * @param state - 当前游戏状态
 * @returns 允许的最高税率，整数百分比（e.g. 20 或 40）
 */
export function getMaxTaxRate(state: GameState): number {
  const govType = state.civic.govern?.type ?? 'anarchy';
  switch (govType) {
    case 'oligarchy':
      // 寡头：基础 20 + 额外 20（govEffect.oligarchy()[1]） = 40
      return 40;
    default:
      // 其余政体税率上限 = 20（原版默认）
      return 20;
  }
}

// ============================================================
// 政体切换
// ============================================================

/**
 * 切换政体
 * 完成后重置冷却计数器（rev = 250 ticks ≈ 62.5 秒）
 *
 * 对标 legacy/src/civics.js setGov()：原版基础冷却 time = 1000（单位：ms 等价的 long loop 次数）
 * EvoZen 简化为 250 ticks（约 62.5 秒），已在 .dev_notes.md 记录为已知简化。
 *
 * @param state - 当前游戏状态
 * @param newType - 目标政体 ID
 * @returns 新的游戏状态，或 null（切换失败）
 */
export function changeGovernment(state: GameState, newType: GovernmentType): GameState | null {
  const govern = state.civic.govern;
  if (!govern) return null;

  // 检查冷却未结束
  if ((govern.rev ?? 0) > 0) return null;

  // 检查政体是否已解锁
  const def = GOVERNMENT_DEFS.find(d => d.id === newType);
  if (!def) return null;
  if ((state.tech['govern'] ?? 0) < def.reqGovern) return null;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  const newGovern = newState.civic.govern;
  newGovern.type = newType;

  // 设置冷却：250 ticks（约 62.5 秒）
  // 对标 legacy/src/civics.js L461: global.civic.govern.rev = time
  newGovern.rev = 250;

  return newState;
}

/**
 * 推进政体切换冷却（每 tick 调用）
 * 当 rev > 0 时递减，直到 0。
 *
 * @param state - 当前游戏状态（会被直接修改引用）
 */
export function tickGovernmentCooldown(state: GameState): void {
  const govern = state.civic.govern;
  if (govern && (govern.rev ?? 0) > 0) {
    govern.rev = Math.max(0, (govern.rev ?? 0) - 1);
  }
}

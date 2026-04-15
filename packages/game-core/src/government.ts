/**
 * 政府与政体系统
 *
 * 严格对标 legacy/src/civics.js govEffect 函数（L186-284）
 * 每种政体对产出的加成或惩罚，仅保留第一阶段（文明时代）有意义的效果。
 *
 * 政体解锁：
 *   - govern:1 (government 科技)    → 无政府/独裁/民主/寡头 可选
 *   - gov_theo:1 (theocracy 科技)   → 神权政体 可选（需 govern:1 + theology:2）
 *   - govern:2 (republic 科技)      → 共和国 可选
 *   - gov_soc:1 (socialist 科技)    → 社会主义政体 可选
 *   - gov_corp:1 (corpocracy 科技)  → 企业政体 可选
 *
 * 当前实装 8 种政体 + 「变更政体」的冷却计数器。
 */

import type { GameState } from '@evozen/shared-types';

function techLevel(state: GameState, techId: string): number {
  return state.tech[techId] ?? 0;
}

function getAutocracyStressTolerancePercent(state: GameState): number {
  const highTech = techLevel(state, 'high_tech');
  if (highTech >= 12) return 10;
  if (highTech >= 2) return 18;
  return 25;
}

function getDemocracyEntertainmentPercent(state: GameState): number {
  const highTech = techLevel(state, 'high_tech');
  if (highTech >= 12) return 30;
  if (highTech >= 2) return 25;
  return 20;
}

// ============================================================
// 政体 ID 联合类型
// ============================================================

/** 当前可选的政体 */
export type GovernmentType =
  | 'anarchy'
  | 'autocracy'
  | 'democracy'
  | 'oligarchy'
  | 'theocracy'
  | 'republic'
  | 'socialist'
  | 'corpocracy';

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
    effects: ['压力容忍度提升（高科技后会进一步减轻压力惩罚）', '军事战斗力 +35%'],
  },
  {
    id: 'democracy',
    name: '民主',
    description: '公民参与政治，解放创造力。',
    reqGovern: 1,
    // legacy civics.js L193-197: govEffect.democracy()
    // [0] entertainer 加成 = 20%
    // [1] work_malus = 5%（影响士气系统，纯属数据备注；士气系统实装后才会展现）
    effects: ['娱乐业效率提升（高科技后加成更高）', '居民工作压力 -5%（待士气系统实装后生效）'],
  },
  {
    id: 'oligarchy',
    name: '寡头',
    description: '精英阶层掌控经济命脉。',
    reqGovern: 1,
    // legacy civics.js L200: tax penalty 5%, tax cap 20%
    effects: ['税率上限 +20%（最高可调至40%）', '基础税收效率下降（高科技后惩罚减轻）'],
  },
  {
    id: 'theocracy',
    name: '神权',
    description: '以宗教信仰指导国家治理。',
    reqGovern: 1,
    // legacy civics.js L205-210: govEffect.theocracy()
    // [0] temple bonus = 12%
    // [1] prof_malus = 25% (教授效率降低)
    // [2] sci_malus = 50% (科学家效率降低)
    effects: ['神庙效果 +12%', '教授效率 -25%', '科学家效率 -50%'],
  },
  {
    id: 'republic',
    name: '共和国',
    description: '以法治与代议制度维系秩序。',
    reqGovern: 2,
    effects: ['银行家收益 +25%', '基础士气 +20'],
  },
  {
    id: 'socialist',
    name: '社会主义',
    description: '强调公共控制与工业协调。',
    reqGovern: 1,
    effects: ['工厂产线效率 +10%', '所有金钱类收入 -20%', '压力惩罚 +10%'],
  },
  {
    id: 'corpocracy',
    name: '企业政体',
    description: '由资本驱动国家机器扩张利润。',
    reqGovern: 2,
    effects: ['赌场收入 +200%', '旅游收入 +100%', '工厂产线效率 +30%', '基础士气 -10', '税收效率 -50%'],
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
      // 寡头税收惩罚会在 high_tech:2 后下降到 -2%
      // 对标 legacy/src/civics.js L199-203 + main.js L7628-7629
      if (techLevel(state, 'high_tech') >= 12) return 1.0;
      if (techLevel(state, 'high_tech') >= 2) return 0.98;
      return 1 - (5 / 100);
    case 'corpocracy':
      // 企业政体：税收效率减半
      // 对标 legacy/src/main.js L7631-7633
      return 0.5;
    case 'socialist':
      // 社会主义：金钱类收入 -20%
      // 对标 legacy/src/main.js L7634-7635
      return 1 - (20 / 100); // 0.8
    default:
      // 独裁/民主/无政府：对税收无特殊加减
      // 原版 main.js L7586-7636 中，autocracy 没有任何税收乘数
      return 1.0;
  }
}

/**
 * 获取当前政体对银行家收益的乘数
 * 对标 legacy/src/main.js L7609-7610
 */
export function getBankerImpactMultiplier(state: GameState): number {
  return state.civic.govern?.type === 'republic' ? 1.25 : 1.0;
}

/**
 * 获取当前政体对赌场收入的乘数
 * 对标 legacy/src/actions.js L5625-5629
 */
export function getCasinoIncomeMultiplier(state: GameState): number {
  switch (state.civic.govern?.type ?? 'anarchy') {
    case 'corpocracy':
      return 3.0;
    case 'socialist':
      return 0.8;
    default:
      return 1.0;
  }
}

/**
 * 获取当前政体对旅游收入的乘数
 * 对标 legacy/src/main.js L7716-7720
 */
export function getTourismIncomeMultiplier(state: GameState): number {
  switch (state.civic.govern?.type ?? 'anarchy') {
    case 'corpocracy':
      return 2.0;
    case 'socialist':
      return 0.8;
    default:
      return 1.0;
  }
}

/**
 * 获取当前政体对工厂产线产出的乘数
 * 对标 legacy/src/main.js L4774-4778
 */
export function getFactoryOutputMultiplier(state: GameState): number {
  switch (state.civic.govern?.type ?? 'anarchy') {
    case 'corpocracy':
      return techLevel(state, 'high_tech') >= 16 ? 1.4 : 1.3;
    case 'socialist':
      return 1.1;
    default:
      return 1.0;
  }
}

/**
 * 获取当前政体对压力项的乘数
 * 对标 legacy/src/civics.js L186-197 + main.js L3117-3124
 */
export function getAutocracyStressMultiplier(state: GameState): number {
  return 1 - (getAutocracyStressTolerancePercent(state) / 100);
}

/**
 * 获取当前政体对娱乐业的乘数
 * 对标 legacy/src/civics.js L193-197 + main.js L3036-3038
 */
export function getDemocracyEntertainmentMultiplier(state: GameState): number {
  return 1 + (getDemocracyEntertainmentPercent(state) / 100);
}

/**
 * 获取当前政体提供的直接士气修正
 * 对标 legacy/src/civics.js L212-244 + main.js L1378-1382
 */
export function getGovernmentMoraleOffset(state: GameState): number {
  const highTech = techLevel(state, 'high_tech');
  switch (state.civic.govern?.type ?? 'anarchy') {
    case 'corpocracy':
      return highTech >= 12 ? -5 : -10;
    case 'republic':
      if (highTech >= 16) return 40;
      if (highTech >= 12) return 30;
      return 20;
    default:
      return 0;
  }
}

/**
 * 获取当前政体对生产力的乘数
 * 对标 legacy/src/civics.js govEffect.democracy / govEffect.autocracy
 *
 * @param state - 当前游戏状态
 * @returns 生产力乘数（1.0 = 无加成）
 */
export function getProductionMultiplier(_state: GameState): number {
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

/**
 * 获取切换政体后的革命冷却
 * 对标 legacy/src/civics.js L429-461
 */
export function getGovernmentChangeCooldown(state: GameState): number {
  let time = 1000;

  if (techLevel(state, 'high_tech') >= 1) {
    time += 250;
    if (techLevel(state, 'high_tech') >= 3) {
      time += 250;
    }
    if (techLevel(state, 'high_tech') >= 6) {
      time += 250;
    }
  }

  if (techLevel(state, 'space_explore') >= 3) {
    time += 250;
  }

  return time + (state.civic.govern?.fr ?? 0);
}

// ============================================================
// 政体切换
// ============================================================

/**
 * 切换政体
 * 完成后重置冷却计数器（rev）
 *
 * 对标 legacy/src/civics.js setGov()：基础 1000，并受 high_tech / space_explore / fr 修正。
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

  // 专属政体额外需要对应科技
  // 对标 legacy/src/civics.js L397-L407
  if (newType === 'theocracy' && (state.tech['gov_theo'] ?? 0) < 1) return null;
  if (newType === 'socialist' && (state.tech['gov_soc'] ?? 0) < 1) return null;
  if (newType === 'corpocracy' && (state.tech['gov_corp'] ?? 0) < 1) return null;

  const newState: GameState = JSON.parse(JSON.stringify(state));
  const newGovern = newState.civic.govern;
  newGovern.type = newType;

  // 对标 legacy/src/civics.js L461: global.civic.govern.rev = time + fr
  newGovern.rev = getGovernmentChangeCooldown(newState);

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

/**
 * 获取当前政体对神庙效果的乘数
 * 神权政体下神庙效果 +12%
 * 对标 legacy/src/resources.js L3143-3144:
 * temple_bonus *= 1 + (govEffect.theocracy()[0] / 100)  → theocracy()[0] = 12
 *
 * @param state - 当前游戏状态
 * @returns 神庙效果乘数
 */
export function getTempleMultiplier(state: GameState): number {
  const govType = state.civic.govern?.type ?? 'anarchy';
  if (govType === 'theocracy') {
    return 1.12; // 1 + 12/100
  }
  return 1.0;
}

/**
 * 获取当前政体对知识产出岗位的效率乘数
 * 神权政体下教授 -25%，科学家 -50%
 * 对标 legacy/src/main.js L4183-4184 (professor):
 *   professors_base *= 1 - (govEffect.theocracy()[1] / 100)  → [1]=25 → ×0.75
 * 对标 legacy/src/main.js L4200-4201 (scientist):
 *   scientist_base *= 1 - (govEffect.theocracy()[2] / 100)   → [2]=50 → ×0.50
 *
 * @param state - 当前游戏状态
 * @param role - 'professor' 或 'scientist'
 * @returns 效率乘数
 */
export function getKnowledgeMultiplier(state: GameState, role: 'professor' | 'scientist'): number {
  const govType = state.civic.govern?.type ?? 'anarchy';
  if (govType === 'theocracy') {
    if (role === 'professor') {
      return 0.75;
    }
    if (techLevel(state, 'high_tech') >= 16) {
      return 0.75;
    }
    if (techLevel(state, 'high_tech') >= 12) {
      return 0.60;
    }
    return 0.50;
  }
  return 1.0;
}

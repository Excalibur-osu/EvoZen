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
 * 当前范围：
 *   launch_facility  reqs: {high_tech:7} → grant launch_facility，并建立 space:1
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
  lhc: ArpaProjectState;
  stock_exchange: ArpaProjectState;
  tp_depot: ArpaProjectState;
  launch_facility: ArpaProjectState;
  monument: ArpaProjectState;
  railway: ArpaProjectState;
  roid_eject: ArpaProjectState;
  nexus: ArpaProjectState;
  [key: string]: ArpaProjectState | MonumentType;
}

export type MonumentType =
  | 'Obelisk'
  | 'Statue'
  | 'Sculpture'
  | 'Monolith'
  | 'Pillar'
  | 'Megalith';  // magic 宇宙专属（legacy arpa.js L1662）

// ============================================================
// 项目定义
// ============================================================

export interface ArpaProjectDef {
  id: string;
  name: string;
  desc: string;
  /** 解锁所需 tech 等级 */
  reqs: Record<string, number>;
  /** 额外可用性判断 */
  condition?: (state: GameState) => boolean;
  /** 完成后在 tech 中设置的字段 */
  grantKey: string;
  /** 效果描述（静态） */
  effectText: string;
  /** 单次总费用（rank=0 时）*/
  baseCost: (mType?: MonumentType) => Record<string, number>;
  /** 费用递增系数 */
  mult: number;
  /** 完成次数上限；未设置表示可重复 */
  maxRank?: number;
}

export const MONUMENT_NAMES: Record<MonumentType, string> = {
  Obelisk: '方尖碑',
  Statue: '雕像',
  Sculpture: '雕刻',
  Monolith: '独石',
  Pillar: '柱廊',
  Megalith: '巨石阵',  // magic 宇宙专属
};

/** 纪念碑各类型的基础费用（legacy arpa.js L1652-1664） */
function monumentBaseCost(mType: MonumentType): Record<string, number> {
  switch (mType) {
    case 'Obelisk':  return { Stone: 1_000_000 };
    case 'Statue':   return { Aluminium: 350_000 };
    case 'Sculpture':return { Steel: 300_000 };
    case 'Monolith': return { Cement: 300_000 };
    case 'Pillar':   return { Lumber: 1_000_000 };
    case 'Megalith': return { Crystal: 55_000 }; // magic 宇宙（legacy arpa.js L1662）
  }
}

export const ARPA_PROJECTS: ArpaProjectDef[] = [
  // ===== lhc（大型强子对撞机 / 超导粒子对撞机） =====
  // 对标 legacy/src/arpa.js L38-77
  // grant: supercollider；每次完成提升 particles tech，可多次建造
  {
    id: 'lhc',
    name: '大型强子对撞机',
    desc: '建造超大型粒子加速器，推进高能物理研究，解锁粒子科技与存储扩展。',
    reqs: { high_tech: 6 },
    grantKey: 'supercollider',
    effectText:
      '每次完成：粒子科技 +1（supercollider rank 提升）；存储 Lv.6+ 时同步提升卫星/Wardenclyffe 知识加成。',
    baseCost: () => ({
      Money:     2_500_000,
      Knowledge:   500_000,
      Copper:      125_000,
      Cement:      250_000,
      Aluminium:   350_000,
      Titanium:     50_000,
      Polymer:      12_000,
    }),
    mult: 1.05,
  },

  // ===== stock_exchange（证券交易所） =====
  // 对标 legacy/src/arpa.js L78-109
  {
    id: 'stock_exchange',
    name: '证券交易所',
    desc: '建立现代金融市场，大幅提升银行盈利能力。',
    reqs: { banking: 9 },
    grantKey: 'stock_exchange',
    effectText: '银行收益 +10%；banking Lv.10+ 时银行家 +2 收益；gambling Lv.4+ 时赌场额外 +5%/+1 点。',
    baseCost: () => ({
      Money:       3_000_000,
      Plywood:        25_000,
      Brick:          20_000,
      Wrought_Iron:   10_000,
    }),
    mult: 1.06,
  },

  // ===== tp_depot（真实路径补给站） =====
  // 对标 legacy/src/arpa.js L110-125，path: ['truepath']
  {
    id: 'tp_depot',
    name: '星际补给站',
    desc: '仅限真实路径宇宙；建造跨星系物资中转站，扩大贸易路线容量。',
    reqs: { high_tech: 6, storage: 4 },
    condition: (state) => Boolean(state.race['truepath']),
    grantKey: 'tp_depot',
    effectText: '每次完成：贸易路线上限 +5，贸易利润 +50%。',
    baseCost: () => ({
      Money:   1_800_000,
      Stone:     750_000,
      Iron:      250_000,
      Alloy:      30_000,
    }),
    mult: 1.08,
  },

  // ===== launch_facility（航天发射设施） =====
  // 对标 legacy/src/arpa.js L126-148，rank: 1（只建一次）
  {
    id: 'launch_facility',
    name: '发射设施',
    desc: '建造大型航天发射设施，为后续轨道发射与月面任务建立正式入口。',
    reqs: { high_tech: 7 },
    condition: (state) => !state.race['cataclysm'] && !state.race['lone_survivor'] && !state.race['warlord'],
    grantKey: 'launch_facility',
    effectText: '完成后建立 space:1，为试验发射与后续太空任务解锁正式入口。',
    baseCost: () => ({
      Money:     2_000_000,
      Knowledge:   500_000,
      Cement:      150_000,
      Oil:          20_000,
      Sheet_Metal:  15_000,
      Alloy:        25_000,
    }),
    mult: 1.1,
    maxRank: 1,
  },
  // ===== monument（纪念碑） =====
  // 对标 legacy/src/arpa.js L149-185
  {
    id: 'monument',
    name: '纪念碑',
    desc: '建造宏大的纪念性建筑，提振民众士气。',
    reqs: { monument: 1 },
    grantKey: 'monuments',
    effectText: '每座士气上限 +2。',
    baseCost: (mType = 'Obelisk') => monumentBaseCost(mType),
    mult: 1.1,
  },

  // ===== railway（铁路网络） =====
  // 对标 legacy/src/arpa.js L186-221
  // grant: railway；每次完成增加贸易路线上限（与 storage_yard count 相关）
  {
    id: 'railway',
    name: '铁路网络',
    desc: '铺设大规模铁路系统，扩大贸易路线容量与贸易利润。',
    reqs: { high_tech: 6, trade: 3 },
    grantKey: 'railway',
    effectText:
      '每次完成：贸易路线上限 +2（每 6 座仓库额外 +1）；贸易利润 +3/tick。cataclysm 路线：GPS 每 3 座贡献 +1 路线。',
    baseCost: () => ({
      Money:   2_500_000,
      Lumber:    750_000,
      Iron:      300_000,
      Steel:     450_000,
    }),
    mult: 1.08,
  },

  // ===== roid_eject（小行星弹射器） =====
  // 对标 legacy/src/arpa.js L222-241
  // grant: roid_eject；可多次建造，质量递增，最终可弹射星球级天体
  {
    id: 'roid_eject',
    name: '小行星弹射器',
    desc: '建造巨型电磁弹射系统，向黑洞喂入小行星（乃至星球）以榨取暗能量。',
    reqs: { blackhole: 6, gateway: 3 },
    grantKey: 'roid_eject',
    effectText:
      '每次完成：rank 累计质量 ≈ 0.225×rank×(1+rank/12)；质量越大，暗能量产出越高。',
    baseCost: () => ({
      Money:      18_750_000,
      Deuterium:     375_000,
      Bolognium:      15_000,
    }),
    mult: 1.075,
  },

  // ===== nexus（魔法枢纽） =====
  // 对标 legacy/src/arpa.js L242-258
  // grant: nexus；magic Lv.5+ 解锁；每次完成 +5 Mana 上限
  {
    id: 'nexus',
    name: '魔法枢纽',
    desc: '在城市中建造魔力聚合核心，大幅扩展魔法能量上限。',
    reqs: { magic: 5 },
    grantKey: 'nexus',
    effectText:
      '每次完成：+5 Mana 上限（spatialReasoning 加成后）；roguemagic Lv.7+ 时额外 +4 女巫加成。',
    baseCost: () => ({
      Money:   5_000_000,
      Crystal:    60_000,
      Iridium:    35_000,
    }),
    mult: 1.12,
  },

  // ===== syphon（魔法虹吸） =====
  // 对标 legacy/src/arpa.js L259-300
  // 解锁条件：veil:2（魔法宇宙特殊科技）
  // 每次完成 +1 syphon 等级，从 magic universe 中虹吸魔法能量
  // syphon 阈值：20/40/60/80 对应不同效果（详见 effectText）
  // 注意：syphon ≥ 80 时触发真空坍塌（vacuumCollapse），是魔法宇宙特有的转生路径
  {
    id: 'syphon',
    name: '魔法虹吸',
    desc: '在魔法宇宙中虹吸纱幕中的魔力，但虹吸过度会导致维度崩溃。',
    reqs: { veil: 2 },
    condition: (state) => state.race.universe === 'magic',
    grantKey: 'syphon',
    effectText:
      '每次完成 +1 syphon 等级。阈值效果：' +
      '≥20: 解锁初级转化；' +
      '≥40: 中级转化（mana 上限大幅增加）；' +
      '≥60: 显示真空坍塌倒计时；' +
      '≥80: 触发真空坍塌转生（vacuumCollapse），获得 Plasmid + Phage + Dark。',
    baseCost: () => ({
      Money: 7_500_000,
      Mana: 5_000,
      Crystal: 100_000,
      Infernite: 10_000,
    }),
    mult: 1.025,
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
    state.arpa = { m_type: 'Obelisk' };
  }
  const arpa = state.arpa as ArpaState;
  // 动态补全所有项目默认状态，兼容旧存档和新增项目
  for (const def of ARPA_PROJECTS) {
    if (!arpa[def.id]) {
      (arpa as Record<string, ArpaProjectState | MonumentType>)[def.id] = {
        rank: 0,
        progress: 0,
        active: false,
      };
    }
  }
  return arpa;
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
  if (def.condition && !def.condition(state)) return false;
  if (def.maxRank !== undefined) {
    const proj = getArpaState(state)[projectId] as ArpaProjectState | undefined;
    if ((proj?.rank ?? 0) >= def.maxRank) return false;
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

      if (def.id === 'launch_facility') {
        state.tech['space'] = Math.max(state.tech['space'] ?? 0, 1);
        state.settings.showSpace = true;
      }

      // syphon: 每次完成增加 syphon 等级（覆盖默认 grant +1 逻辑，使其按 rank 步进 20）
      // 对标 legacy: tech.syphon 取值范围 0-80+，每次 +1
      if (def.id === 'syphon') {
        // 已通过 currentGrant + 1 提升 state.tech.syphon
        // 当 syphon >= 80 时，触发真空坍塌警告（实际转生由 canReset('vacuum') 触发）
        if ((state.tech['syphon'] ?? 0) >= 80) {
          state.race['vacuum_collapse'] = true;
        }
      }

      // nexus 完成：+5 Mana 上限
      if (def.id === 'nexus' && state.resource['Mana']) {
        state.resource['Mana'].max += 5;
        state.resource['Mana'].display = true;
      }

      // lhc 完成：+ Knowledge 上限（每次 +25k 基础）
      if (def.id === 'lhc' && state.resource['Knowledge']) {
        state.resource['Knowledge'].max += 25_000;
      }

      // monument 完成：建造完毕，士气加成在 derived-state 中持续提供
      // 此处不需特殊处理（rank 自身已 +1）

      // stock_exchange 完成：增加银行容量（在 derived-state 中按 rank 持续应用）

      // tp_depot 完成：+5 贸易路线（在 derived-state 中按 rank 应用）

      // railway 完成：+2 贸易路线 + 利润加成（在 derived-state 中应用）

      // roid_eject 完成：累积质量（rank 数即累积）

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

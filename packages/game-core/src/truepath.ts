/**
 * Truepath（真相之路）模式 — 对标 legacy/src/truepath.js (6431 行)
 *
 * Truepath 是一个挑战模式，关闭传送门/bigbang/ascension 等转生路径，
 * 改为通过外太阳系探索（土星 → 海王星 → 柯伊伯带 → 厄里斯）
 * 最终触发 retirement 转生（点燃气态巨星 + AI 核心）。
 *
 * 包含 5 个新区域：
 *   - spc_titan       土星（土星系基地，AI 殖民）
 *   - spc_enceladus   土卫二（冰封卫星，氢氦采集）
 *   - spc_triton      海卫一（前哨基地，远程探索）
 *   - spc_kuiper      柯伊伯带（稀有矿采集）
 *   - spc_eris        厄里斯（终局，发现古代外星种族 + 触发 retirement）
 */

import type { GameState } from '@evozen/shared-types';

// ============================================================
// Truepath 区域定义
// ============================================================

export type TruepathRegionId = 'titan' | 'enceladus' | 'triton' | 'kuiper' | 'eris';

export interface TruepathRegionDef {
  id: TruepathRegionId;
  name: string;
  desc: string;
  /** 轨道距离（AU） */
  dist: number;
  /** 公转周期（天） */
  orbit: number;
  /** 解锁科技要求 */
  reqs: Record<string, number>;
}

export const TRUEPATH_REGIONS: Record<TruepathRegionId, TruepathRegionDef> = {
  titan: {
    id: 'titan', name: '土卫六', desc: '土星最大卫星，建立 AI 殖民地的理想之地。',
    dist: 9.536, orbit: 10751, reqs: { outer: 1 },
  },
  enceladus: {
    id: 'enceladus', name: '土卫二', desc: '冰封卫星，富含氢和水冰。',
    dist: 9.542, orbit: 10751, reqs: { outer: 2, titan: 3 },
  },
  triton: {
    id: 'triton', name: '海卫一', desc: '海王星最大卫星，孤悬太阳系外侧的边境前哨。',
    dist: 30.1, orbit: 60152, reqs: { outer: 3 },
  },
  kuiper: {
    id: 'kuiper', name: '柯伊伯带', desc: '太阳系外缘的小行星带，富含稀有矿物。',
    dist: 30.0, orbit: 60500, reqs: { outer: 4 },
  },
  eris: {
    id: 'eris', name: '厄里斯', desc: '矮行星，发现古代外星文明遗迹。',
    dist: 67.0, orbit: 203000, reqs: { outer: 5 },
  },
};

// ============================================================
// Truepath 建筑定义
// ============================================================

export interface TruepathBuildingDef {
  id: string;
  region: TruepathRegionId;
  name: string;
  desc: string;
  reqs: Record<string, number>;
  baseCost: Record<string, number>;
  costMult: number;
  /** MW，正值消耗，负值发电 */
  power: number;
  effectDesc: string;
}

export const TRUEPATH_BUILDINGS: TruepathBuildingDef[] = [
  // ----- Titan (土卫六) -----
  { id: 'titan_mission',    region: 'titan', name: '土卫六任务',   desc: '发射飞船登陆土卫六。',                       reqs: { outer: 1 },                       baseCost: { Helium_3: 250000, Elerium: 100 }, costMult: 1.0, power: 0, effectDesc: '解锁土卫六探索。' },
  { id: 'titan_spaceport',  region: 'titan', name: '土卫六港口',   desc: '土卫六上的物资中转站。',                     reqs: { titan: 1 },                       baseCost: { Money: 2500000, Lumber: 750000, Cement: 350000, Mythril: 10000 }, costMult: 1.32, power: 10, effectDesc: '为其他卫星基地提供支持配额。' },
  { id: 'electrolysis',     region: 'titan', name: '水电解装置',   desc: '从水中提取氢和氧。',                         reqs: { titan: 2 },                       baseCost: { Money: 1750000, Iron: 250000, Steel: 175000 }, costMult: 1.32, power: 4, effectDesc: '生产氢与氧。' },
  { id: 'hydrogen_plant',   region: 'titan', name: '氢气厂',       desc: '将氢气压缩为可使用燃料。',                   reqs: { titan: 2 },                       baseCost: { Money: 1250000, Adamantite: 75000, Nano_Tube: 35000 }, costMult: 1.32, power: -22, effectDesc: '消耗氢发电 22 MW。' },
  { id: 'titan_quarters',   region: 'titan', name: '居住舱',       desc: '土卫六上的居住空间。',                       reqs: { titan: 3 },                       baseCost: { Money: 2750000, Cement: 350000, Furs: 75000, Stanene: 25000 }, costMult: 1.32, power: 2, effectDesc: '+1 殖民者岗位。' },
  { id: 'titan_mine',       region: 'titan', name: '土卫六矿场',   desc: '在土卫六开采资源。',                         reqs: { titan: 3 },                       baseCost: { Money: 850000, Polymer: 22500, Aluminium: 175000 }, costMult: 1.32, power: 4, effectDesc: '+1 矿工岗位。' },
  { id: 'storehouse',       region: 'titan', name: '土卫六仓库',   desc: '资源储存设施。',                             reqs: { titan: 4 },                       baseCost: { Money: 1250000, Lumber: 175000, Stone: 125000, Iron: 175000 }, costMult: 1.32, power: 1, effectDesc: '增加多种资源容量。' },
  { id: 'titan_bank',       region: 'titan', name: '土卫六银行',   desc: '为殖民地服务的金融机构。',                   reqs: { titan: 4 },                       baseCost: { Money: 5000000, Cement: 200000, Plywood: 150000, Furs: 95000 }, costMult: 1.32, power: 0, effectDesc: '+1.25M 金币容量。' },
  { id: 'g_factory',        region: 'titan', name: '零重力工厂',   desc: '低重力环境下生产高质量物品。',               reqs: { titan: 5 },                       baseCost: { Money: 8000000, Polymer: 125000, Adamantite: 100000, Stanene: 50000 }, costMult: 1.32, power: 5, effectDesc: '+1 工厂岗位。' },
  { id: 'sam',              region: 'titan', name: 'SAM 导弹站',   desc: '防御土卫六基地的导弹系统。',                 reqs: { titan: 6 },                       baseCost: { Money: 22000000, Aluminium: 1750000, Mythril: 65000 }, costMult: 1.32, power: 4, effectDesc: '+1 反辛迪加海盗。' },
  { id: 'decoder',          region: 'titan', name: '解码器',       desc: '解析外星信号的设备。',                       reqs: { titan: 7 },                       baseCost: { Money: 25000000, Stanene: 75000, Vitreloy: 17500, Quantium: 100 }, costMult: 1.32, power: 4, effectDesc: '解码外星信号，推进 AI 科技。' },
  { id: 'ai_core',          region: 'titan', name: 'AI 核心',     desc: '强大的人工智能计算核心。',                   reqs: { titan: 8 },                       baseCost: { Money: 50000000, Bolognium: 125000, Vitreloy: 90000, Quantium: 1500 }, costMult: 1.0, power: 0, effectDesc: '触发 AI 末日转生路径。' },
  { id: 'ai_colonist',      region: 'titan', name: 'AI 殖民者',   desc: 'AI 控制的机器人殖民者。',                    reqs: { titan: 9 },                       baseCost: { Money: 17500000, Adamantite: 250000, Stanene: 175000, Quantium: 75 }, costMult: 1.32, power: 1, effectDesc: '+1 AI 殖民者（更高产出）。' },
  { id: 'wonder_gardens',   region: 'titan', name: '奇景花园',     desc: '土卫六上的奇景。',                           reqs: { titan: 10 },                      baseCost: { Money: 25000000000, Crystal: 1000000 }, costMult: 1.0, power: 0, effectDesc: '士气 +25。' },

  // ----- Enceladus (土卫二) -----
  { id: 'enceladus_mission', region: 'enceladus', name: '土卫二任务',  desc: '探索土卫二冰下海洋。',                       reqs: { enceladus: 1 },                  baseCost: { Helium_3: 350000 }, costMult: 1.0, power: 0, effectDesc: '解锁土卫二建筑。' },
  { id: 'water_freighter',   region: 'enceladus', name: '水货船',     desc: '将土卫二的水运输到土卫六。',                 reqs: { enceladus: 2 },                  baseCost: { Money: 3750000, Polymer: 500000, Mythril: 35000, Aerogel: 17500 }, costMult: 1.32, power: 1, effectDesc: '生产水。' },
  { id: 'zero_g_lab',        region: 'enceladus', name: '零重力实验室', desc: '冰封海洋下的科学站。',                       reqs: { enceladus: 3 },                  baseCost: { Money: 5500000, Steel: 350000, Adamantite: 150000, Vitreloy: 10000 }, costMult: 1.32, power: 4, effectDesc: '+1 科学家岗位（高产出）。' },
  { id: 'operating_base',    region: 'enceladus', name: '作战基地',   desc: '驻扎部队的前线基地。',                       reqs: { enceladus: 4 },                  baseCost: { Money: 18000000, Furs: 750000, Iridium: 175000, Soul_Gem: 25 }, costMult: 1.32, power: 4, effectDesc: '+5 驻军容量。' },
  { id: 'munitions_depot',   region: 'enceladus', name: '弹药库',     desc: '储存外星弹药。',                             reqs: { enceladus: 5 },                  baseCost: { Money: 7500000, Adamantite: 200000, Stanene: 75000 }, costMult: 1.32, power: 1, effectDesc: '增加 SAM 弹药容量。' },

  // ----- Triton (海卫一) -----
  { id: 'triton_mission', region: 'triton', name: '海卫一任务', desc: '探索海卫一。',                               reqs: { triton: 1 },                       baseCost: { Helium_3: 500000, Elerium: 250 }, costMult: 1.0, power: 0, effectDesc: '解锁海卫一建筑。' },
  { id: 'fob',            region: 'triton', name: '前进基地',   desc: '海卫一的前线作战基地。',                     reqs: { triton: 2 },                       baseCost: { Money: 50000000, Adamantite: 750000, Aerogel: 250000, Soul_Gem: 100 }, costMult: 1.32, power: 16, effectDesc: '增加部队作战能力。' },
  { id: 'lander',         region: 'triton', name: '登陆器',     desc: '行星表面的登陆设备。',                       reqs: { triton: 3 },                       baseCost: { Money: 12000000, Iron: 750000, Aluminium: 500000, Stanene: 100000, Helium_3: 175000 }, costMult: 1.32, power: 3, effectDesc: '探索表面资源。' },
  { id: 'crashed_ship',   region: 'triton', name: '坠毁飞船',   desc: '海卫一上发现的外星残骸。',                   reqs: { triton: 4 },                       baseCost: { Money: 250000000, Quantium: 10000 }, costMult: 1.0, power: 0, effectDesc: '获取外星科技样本。' },

  // ----- Kuiper Belt (柯伊伯带) -----
  { id: 'kuiper_mission',   region: 'kuiper', name: '柯伊伯带任务',   desc: '探索柯伊伯带。',                             reqs: { kuiper: 1 },                       baseCost: { Helium_3: 750000, Elerium: 500 }, costMult: 1.0, power: 0, effectDesc: '解锁柯伊伯带采矿。' },
  { id: 'orichalcum_mine',  region: 'kuiper', name: '黄金矿',         desc: '采集黄金矿。',                   reqs: { kuiper: 2 },                       baseCost: { Money: 32500000, Adamantite: 1500000, Aerogel: 350000, Vitreloy: 12500 }, costMult: 1.28, power: 7, effectDesc: '+ 黄金矿产出。' },
  { id: 'elerium_mine',     region: 'kuiper', name: '超铀矿',         desc: '采集超铀矿。',                          reqs: { kuiper: 2 },                       baseCost: { Money: 32500000, Adamantite: 1500000, Aerogel: 350000, Vitreloy: 12500 }, costMult: 1.28, power: 8, effectDesc: '+ 超铀产出。' },
  { id: 'uranium_mine',     region: 'kuiper', name: '铀矿',           desc: '从柯伊伯带采集铀。',                         reqs: { kuiper: 2 },                       baseCost: { Money: 17500000, Polymer: 500000, Stanene: 250000, Aerogel: 100000 }, costMult: 1.28, power: 6, effectDesc: '+ 铀产出。' },
  { id: 'neutronium_mine',  region: 'kuiper', name: '中子素矿',       desc: '柯伊伯带中的超致密矿物。',                   reqs: { kuiper: 2 },                       baseCost: { Money: 28000000, Bolognium: 175000, Vitreloy: 45000 }, costMult: 1.28, power: 8, effectDesc: '+ 中子素产出。' },

  // ----- Eris (厄里斯) — 部分关键建筑 -----
  { id: 'eris_mission',      region: 'eris', name: '厄里斯任务',     desc: '航行至太阳系最外侧的矮行星。',               reqs: { eris: 1 },                          baseCost: { Helium_3: 1500000, Elerium: 1000 }, costMult: 1.0, power: 0, effectDesc: '解锁厄里斯建筑。' },
  { id: 'digsite',           region: 'eris', name: '考古发掘',       desc: '挖掘厄里斯上的古老外星遗迹。',               reqs: { eris: 2 },                          baseCost: { Money: 75000000, Lumber: 1750000, Furs: 750000, Adamantite: 250000 }, costMult: 1.0, power: 0, effectDesc: '产生考古进度，最终触发外星接触。' },
  { id: 'contact',           region: 'eris', name: '接触外星',       desc: '尝试与古代外星文明接触。',                   reqs: { eris: 3 },                          baseCost: { Money: 1500000000, Quantium: 250000 }, costMult: 1.0, power: 0, effectDesc: '触发外星接触剧情。' },
  { id: 'tank',              region: 'eris', name: '坦克',           desc: '坦克部队，进攻外星基地。',                   reqs: { eris: 4 },                          baseCost: { Money: 18000000, Adamantite: 350000, Aerogel: 100000 }, costMult: 1.32, power: 4, effectDesc: '+5 战斗评分。' },
  { id: 'shock_trooper',     region: 'eris', name: '突击兵',         desc: '与外星人作战的精锐部队。',                   reqs: { eris: 4 },                          baseCost: { Money: 18000000, Adamantite: 250000, Vitreloy: 80000 }, costMult: 1.32, power: 0, effectDesc: '+10 战斗评分。' },
  { id: 'ignite_gas_giant',  region: 'eris', name: '点燃气态巨星',   desc: '将木星点燃为微型恒星 — Truepath 终极目标。', reqs: { eris: 6 },                          baseCost: { Money: 50000000000, Quantium: 1000000, Soul_Gem: 1000 }, costMult: 1.0, power: 0, effectDesc: '点燃木星，触发 Retirement 转生。' },
  { id: 'matrioshka_brain',  region: 'eris', name: '戴森球',         desc: '完整包裹太阳的能源结构 — Truepath AI 终极。',  reqs: { eris: 7 },                          baseCost: { Money: 100000000000, Adamantite: 50000000, Quantium: 5000000 }, costMult: 1.0, power: 0, effectDesc: 'AI 末日终极胜利。' },
];

// ============================================================
// Truepath 模式工具
// ============================================================

/** 判断是否启用 Truepath 模式 */
export function isTruepath(state: GameState): boolean {
  return !!state.race['truepath'];
}

/** 判断某区域是否解锁 */
export function isTruepathRegionUnlocked(state: GameState, region: TruepathRegionId): boolean {
  const def = TRUEPATH_REGIONS[region];
  for (const [tech, lvl] of Object.entries(def.reqs)) {
    if ((state.tech[tech] ?? 0) < lvl) return false;
  }
  return true;
}

/** 计算 Truepath 中海盗辛迪加压力（对标 syndicate L28-34） */
export function getSyndicatePressure(state: GameState, region: TruepathRegionId): number {
  if (!isTruepath(state)) return 0;
  const samBonus = ((state.space as Record<string, { on?: number }>)['sam']?.on ?? 0) * 100;
  const munitions = ((state.space as Record<string, { on?: number }>)['munitions_depot']?.on ?? 0) * 50;

  const basePressure: Record<TruepathRegionId, number> = {
    titan: 100, enceladus: 200, triton: 600, kuiper: 800, eris: 1500,
  };
  return Math.max(0, basePressure[region] - samBonus - munitions);
}

/**
 * 计算某区域的辛迪加产出衰减乘数（压力越高，衰减越大；最高衰减 80%）
 */
function syndicateProductionMul(state: GameState, region: TruepathRegionId): number {
  if (!state.race['truepath']) return 1;
  const space = state.space as Record<string, { on?: number }>;
  const sam = (space['sam']?.on ?? 0) * 100;
  const munitions = (space['munitions_depot']?.on ?? 0) * 50;
  const patrolShip = (space['patrol_ship']?.on ?? 0) * 75;
  const fob = (space['fob']?.on ?? 0) * 200;
  const basePressure: Record<TruepathRegionId, number> = {
    titan: 100, enceladus: 200, triton: 600, kuiper: 800, eris: 1500,
  };
  const pressure = Math.max(0, basePressure[region] - sam - munitions - patrolShip - fob);
  // 压力 / 2000 = 衰减比例（titan 压力 100 → 5% 衰减；eris 1500 → 75% 衰减）
  const decay = Math.min(0.8, pressure / 2000);
  return 1 - decay;
}

/**
 * Truepath 建筑产出 tick
 */
export function truepathProductionTick(state: GameState, timeMul: number, deltas: Record<string, number>): void {
  if (!isTruepath(state)) return;
  const space = state.space as Record<string, Record<string, number>>;

  const titanMul = syndicateProductionMul(state, 'titan');
  const enceladusMul = syndicateProductionMul(state, 'enceladus');
  const tritonMul = syndicateProductionMul(state, 'triton');
  const kuiperMul = syndicateProductionMul(state, 'kuiper');
  const erisMul = syndicateProductionMul(state, 'eris');

  // Titan / electrolysis 产出 Hydrogen + Oxygen
  const electroOn = space['electrolysis']?.['on'] ?? 0;
  if (electroOn > 0) {
    deltas['Hydrogen'] = (deltas['Hydrogen'] ?? 0) + electroOn * 2 * timeMul * titanMul;
    deltas['Oxygen'] = (deltas['Oxygen'] ?? 0) + electroOn * 1 * timeMul * titanMul;
  }
  // 标记下面所有产出受 syndicate 影响
  void enceladusMul; void tritonMul; void kuiperMul; void erisMul;

  // Titan / titan_mine 矿产
  const tmineOn = space['titan_mine']?.['on'] ?? 0;
  if (tmineOn > 0) {
    deltas['Adamantite'] = (deltas['Adamantite'] ?? 0) + tmineOn * 0.5 * timeMul * titanMul;
  }

  // Titan / g_factory 高质量工厂（合金加成）
  const gfactOn = space['g_factory']?.['on'] ?? 0;
  if (gfactOn > 0) {
    deltas['Alloy'] = (deltas['Alloy'] ?? 0) + gfactOn * 0.3 * timeMul * titanMul;
  }

  // Enceladus / water_freighter 产出 Water
  const waterOn = space['water_freighter']?.['on'] ?? 0;
  if (waterOn > 0) {
    deltas['Water'] = (deltas['Water'] ?? 0) + waterOn * 5 * timeMul * enceladusMul;
  }

  // Kuiper / orichalcum_mine / elerium_mine / uranium_mine / neutronium_mine
  const oricOn = space['orichalcum_mine']?.['on'] ?? 0;
  if (oricOn > 0) deltas['Orichalcum'] = (deltas['Orichalcum'] ?? 0) + oricOn * 0.2 * timeMul * kuiperMul;
  const eleOn = space['elerium_mine']?.['on'] ?? 0;
  if (eleOn > 0) deltas['Elerium'] = (deltas['Elerium'] ?? 0) + eleOn * 0.04 * timeMul * kuiperMul;
  const uraOn = space['uranium_mine']?.['on'] ?? 0;
  if (uraOn > 0) deltas['Uranium'] = (deltas['Uranium'] ?? 0) + uraOn * 0.3 * timeMul * kuiperMul;
  const neuOn = space['neutronium_mine']?.['on'] ?? 0;
  if (neuOn > 0) deltas['Neutronium'] = (deltas['Neutronium'] ?? 0) + neuOn * 0.15 * timeMul * kuiperMul;
}

/** 完整 retirement 触发条件（对标 truepath.js L3924）*/
export function canRetire(state: GameState): boolean {
  return Boolean(state.tech['m_brain']) &&
    Boolean(state.tech['m_ignite'] && (state.tech['m_ignite'] as number) >= 2);
}

/** 工具：按区域获取所有建筑 */
export function getTruepathBuildingsByRegion(region: TruepathRegionId): TruepathBuildingDef[] {
  return TRUEPATH_BUILDINGS.filter((b) => b.region === region);
}

/** 工具：计算 Truepath 建筑成本 */
export function getTruepathBuildCost(state: GameState, buildingId: string): Record<string, number> | null {
  const building = TRUEPATH_BUILDINGS.find((b) => b.id === buildingId);
  if (!building) return null;
  const space = state.space as Record<string, Record<string, number>>;
  const count = space[buildingId]?.['count'] ?? 0;
  const mult = Math.pow(building.costMult, count);
  const cost: Record<string, number> = {};
  for (const [res, base] of Object.entries(building.baseCost)) {
    cost[res] = Math.round(base * mult);
  }
  return cost;
}

/** 判断 Truepath 建筑是否可建造 */
export function canBuildTruepath(state: GameState, buildingId: string): boolean {
  if (!isTruepath(state)) return false;
  const building = TRUEPATH_BUILDINGS.find((b) => b.id === buildingId);
  if (!building) return false;
  for (const [tech, lvl] of Object.entries(building.reqs)) {
    if ((state.tech[tech] ?? 0) < lvl) return false;
  }
  const cost = getTruepathBuildCost(state, buildingId);
  if (!cost) return false;
  for (const [res, amt] of Object.entries(cost)) {
    if ((state.resource[res]?.amount ?? 0) < amt) return false;
  }
  return true;
}

/** 建造 Truepath 建筑 */
export function buildTruepathStructure(state: GameState, buildingId: string): boolean {
  if (!canBuildTruepath(state, buildingId)) return false;
  const cost = getTruepathBuildCost(state, buildingId)!;
  for (const [res, amt] of Object.entries(cost)) {
    if (state.resource[res]) state.resource[res].amount -= amt;
  }
  const space = state.space as Record<string, Record<string, number>>;
  if (!space[buildingId]) space[buildingId] = { count: 0, on: 0 };
  space[buildingId].count++;
  return true;
}

/**
 * Edenic（伊甸园）模式 — 对标 legacy/src/edenic.js (2483 行)
 *
 * Edenic 是终极游戏内容，发生在升天进入伊甸园之后。
 * 包含 4 个区域：
 *   - eden_asphodel  阿斯福德尔（无忧之野，初始区域）
 *   - eden_elysium   极乐世界（神圣战场）
 *   - eden_isle      天空岛（精灵据点）
 *   - eden_palace    天界宫殿（终极目标）
 *
 * 终局触发 Apotheosis（神化）转生，永久解锁 Supercoiled 声望。
 */

import type { GameState } from '@evozen/shared-types';

// ============================================================
// 区域定义
// ============================================================

export type EdenicRegionId = 'asphodel' | 'elysium' | 'isle' | 'palace';

export interface EdenicRegionDef {
  id: EdenicRegionId;
  name: string;
  desc: string;
  reqs: Record<string, number>;
}

export const EDENIC_REGIONS: Record<EdenicRegionId, EdenicRegionDef> = {
  asphodel: {
    id: 'asphodel', name: '无忧之野',
    desc: '伊甸园入口，灵魂在此漂泊。一开始平静，后期变得敌对。',
    reqs: { edenic: 3 },
  },
  elysium: {
    id: 'elysium', name: '极乐世界',
    desc: '神圣战场，护卫天界要塞。',
    reqs: { edenic: 8 },
  },
  isle: {
    id: 'isle', name: '天空岛',
    desc: '漂浮在云端的精灵据点。',
    reqs: { elysium: 8 },
  },
  palace: {
    id: 'palace', name: '天界宫殿',
    desc: '神王居所，最终战场。',
    reqs: { eden: 1 },
  },
};

// ============================================================
// 建筑定义
// ============================================================

export interface EdenicBuildingDef {
  id: string;
  region: EdenicRegionId;
  name: string;
  desc: string;
  reqs: Record<string, number>;
  baseCost: Record<string, number>;
  costMult: number;
  power: number;
  effectDesc: string;
}

export const EDENIC_BUILDINGS: EdenicBuildingDef[] = [
  // ----- Asphodel (阿斯福德尔) -----
  { id: 'survey_meadows',     region: 'asphodel', name: '勘探草甸',     desc: '探索阿斯福德尔之野。',                       reqs: { edenic: 3 },                          baseCost: { Oil: 10000000 }, costMult: 1.0, power: 0, effectDesc: '解锁阿斯福德尔建筑。' },
  { id: 'encampment',         region: 'asphodel', name: '营地',         desc: '伊甸园中的临时营地。',                       reqs: { edenic: 4 },                          baseCost: { Money: 1590000000, Lumber: 860000000, Iron: 190000000, Coal: 23500000 }, costMult: 1.235, power: 10, effectDesc: '+1 探险队支持。' },
  { id: 'soul_engine',        region: 'asphodel', name: '灵魂引擎',     desc: '用灵魂驱动的发电装置。',                     reqs: { edenic: 5 },                          baseCost: { Money: 1200000000, Soul_Gem: 250 }, costMult: 1.25, power: -25, effectDesc: '发电 25 MW。' },
  { id: 'mech_station',       region: 'asphodel', name: '机甲站',       desc: '机甲部队基地。',                             reqs: { edenic: 5 },                          baseCost: { Money: 800000000, Adamantite: 100000000, Quantium: 250000 }, costMult: 1.235, power: 5, effectDesc: '+1 机甲容量。' },
  { id: 'asphodel_harvester', region: 'asphodel', name: '阿斯福德尔采集机', desc: '收集阿斯福德尔粉末。',                     reqs: { edenic: 5 },                          baseCost: { Money: 950000000, Polymer: 320000000 }, costMult: 1.235, power: 4, effectDesc: '+ Asphodel_Powder 产出。' },
  { id: 'ectoplasm_processor', region: 'asphodel', name: '幽质处理器',  desc: '处理幽质能量。',                             reqs: { edenic: 6 },                          baseCost: { Money: 1.25e9, Bolognium: 50000000 }, costMult: 1.235, power: 7, effectDesc: '+ Ectoplasm 产出。' },
  { id: 'research_station',   region: 'asphodel', name: '研究站',       desc: '在伊甸园深处研究神圣科学。',                 reqs: { edenic: 6 },                          baseCost: { Money: 1.4e9, Vitreloy: 25000000 }, costMult: 1.235, power: 6, effectDesc: '+1 科学家岗位。' },
  { id: 'warehouse',          region: 'asphodel', name: '伊甸仓库',     desc: '存储伊甸园资源。',                           reqs: { edenic: 6 },                          baseCost: { Money: 950000000, Adamantite: 25000000 }, costMult: 1.235, power: 1, effectDesc: '+ 多资源容量。' },
  { id: 'stabilizer',         region: 'asphodel', name: '稳定器',       desc: '稳定伊甸园的能量波动。',                     reqs: { edenic: 7 },                          baseCost: { Money: 1.6e9, Mythril: 7500000 }, costMult: 1.235, power: 8, effectDesc: '减缓阿斯福德尔走向敌对的速度。' },
  { id: 'rune_gate',          region: 'asphodel', name: '符文门',       desc: '通往极乐世界的传送门。',                     reqs: { edenic: 7 },                          baseCost: { Money: 5e9, Quantium: 1000000 }, costMult: 1.0, power: 0, effectDesc: '建造极乐世界传送门。' },
  { id: 'rune_gate_open',     region: 'asphodel', name: '激活符文门',   desc: '激活已建好的符文门。',                       reqs: { rune_gate: 1 },                       baseCost: { Soul_Gem: 1000 }, costMult: 1.0, power: 0, effectDesc: '激活传送门进入极乐世界。' },
  { id: 'bunker',             region: 'asphodel', name: '掩体',         desc: '抵御敌意阶段的攻击。',                       reqs: { edenic: 8 },                          baseCost: { Money: 1.85e9, Adamantite: 800000000 }, costMult: 1.235, power: 4, effectDesc: '+ 部队防御力。' },
  { id: 'bliss_den',          region: 'asphodel', name: '欢愉之穴',     desc: '提供士气的神圣场所。',                       reqs: { edenic: 8 },                          baseCost: { Money: 2.5e9, Vitreloy: 75000000 }, costMult: 1.235, power: 3, effectDesc: '士气 +5%。' },
  { id: 'rectory',            region: 'asphodel', name: '院长室',       desc: '管理伊甸事务的宗教中心。',                   reqs: { edenic: 9 },                          baseCost: { Money: 3.5e9, Stanene: 250000000 }, costMult: 1.235, power: 2, effectDesc: '+1 神职人员。' },
  { id: 'corruptor',          region: 'asphodel', name: '腐蚀者',       desc: '腐化伊甸园的设备，warlord 专用。',           reqs: { edenic: 8, warlord: 1 },              baseCost: { Demonic_Essence: 500 }, costMult: 1.235, power: 5, effectDesc: '腐化进度推进。' },

  // ----- Elysium (极乐世界) -----
  { id: 'survey_fields',     region: 'elysium', name: '勘探战场',       desc: '侦察极乐世界。',                             reqs: { elysium: 1 },                           baseCost: { Money: 1e10 }, costMult: 1.0, power: 0, effectDesc: '解锁极乐世界建筑。' },
  { id: 'fortress',          region: 'elysium', name: '极乐要塞',       desc: '伊甸园中的中央防御基地。',                   reqs: { elysium: 2 },                           baseCost: { Money: 5e9, Adamantite: 1e9 }, costMult: 1.25, power: 15, effectDesc: '+ 部队规模。' },
  { id: 'siege_fortress',    region: 'elysium', name: '围攻要塞',       desc: '攻击敌方要塞。',                             reqs: { elysium: 3 },                           baseCost: { Money: 1.2e10, Quantium: 5000000 }, costMult: 1.25, power: 10, effectDesc: '推进围城进度。' },
  { id: 'raid_supplies',     region: 'elysium', name: '袭击补给',       desc: '从敌方夺取物资。',                           reqs: { elysium: 4 },                           baseCost: { Money: 8e9, Asphodel_Powder: 50000 }, costMult: 1.0, power: 0, effectDesc: '+ Money/Resources。' },
  { id: 'ambush_patrol',     region: 'elysium', name: '伏击巡逻队',     desc: '伏击敌方巡逻队。',                           reqs: { elysium: 4 },                           baseCost: { Money: 1.5e10, Soul_Gem: 50 }, costMult: 1.0, power: 0, effectDesc: '+ 经验/灵魂宝石。' },
  { id: 'ruined_fortress',   region: 'elysium', name: '废墟要塞',       desc: '已被攻陷的敌方要塞遗迹。',                   reqs: { elysium: 5 },                           baseCost: { Money: 0 }, costMult: 1.0, power: 0, effectDesc: '搜刮废墟资源。' },
  { id: 'scout_elysium',     region: 'elysium', name: '侦察极乐',       desc: '深入侦察。',                                 reqs: { elysium: 6 },                           baseCost: { Quantium: 250000 }, costMult: 1.0, power: 0, effectDesc: '解锁更深入区域。' },
  { id: 'fire_support_base', region: 'elysium', name: '火力支援基地',   desc: '远程炮击敌方据点。',                         reqs: { elysium: 5 },                           baseCost: { Money: 2.5e10, Bolognium: 1.5e9 }, costMult: 1.235, power: 20, effectDesc: '+ 攻击力。' },
  { id: 'elysanite_mine',    region: 'elysium', name: '极乐矿',         desc: '开采 Elysanite。',                           reqs: { elysium: 7 },                           baseCost: { Money: 3.5e10, Stanene: 1e9 }, costMult: 1.235, power: 12, effectDesc: '+ Elysanite 产出。' },
  { id: 'sacred_smelter',    region: 'elysium', name: '神圣熔炉',       desc: '冶炼神圣金属。',                             reqs: { elysium: 7 },                           baseCost: { Money: 4e10, Adamantite: 2.5e9 }, costMult: 1.235, power: 10, effectDesc: '+ 神圣金属产出。' },
  { id: 'elerium_containment', region: 'elysium', name: '超铀控制室',   desc: '控制超铀爆炸反应。',                         reqs: { elysium: 8 },                           baseCost: { Money: 5e10, Elerium: 500000 }, costMult: 1.235, power: 8, effectDesc: '+ 超铀容量。' },
  { id: 'pillbox',           region: 'elysium', name: '碉堡',           desc: '防御性碉堡。',                               reqs: { elysium: 6 },                           baseCost: { Money: 2e10, Aerogel: 500000 }, costMult: 1.235, power: 5, effectDesc: '+ 防御评分。' },
  { id: 'restaurant',        region: 'elysium', name: '永恒餐厅',       desc: '为天使提供食物。',                           reqs: { elysium: 5 },                           baseCost: { Money: 1.5e10, Vitreloy: 1e8 }, costMult: 1.235, power: 3, effectDesc: '士气 +。' },
  { id: 'eternal_bank',      region: 'elysium', name: '永恒银行',       desc: '永久储存财富。',                             reqs: { elysium: 6 },                           baseCost: { Money: 3e10 }, costMult: 1.235, power: 2, effectDesc: '+ 巨量 Money 容量。' },
  { id: 'archive',           region: 'elysium', name: '永恒档案',       desc: '储存所有知识。',                             reqs: { elysium: 7 },                           baseCost: { Money: 4.5e10, Quantium: 5e7 }, costMult: 1.235, power: 4, effectDesc: '+ 巨量 Knowledge 容量。' },
  { id: 'north_pier',        region: 'elysium', name: '北码头',         desc: '通往天空岛的码头。',                         reqs: { elysium: 8 },                           baseCost: { Money: 5e10, Steel: 5e8 }, costMult: 1.0, power: 0, effectDesc: '解锁天空岛远征。' },
  { id: 'rushmore',          region: 'elysium', name: '拉什莫尔',       desc: '雕刻在山上的纪念碑。',                       reqs: { elysium: 9 },                           baseCost: { Money: 1e11, Soul_Gem: 5000 }, costMult: 1.0, power: 0, effectDesc: '士气 +25。' },
  { id: 'reincarnation',     region: 'elysium', name: '转世',           desc: '让阵亡士兵重生。',                           reqs: { elysium: 10 },                          baseCost: { Money: 2e11, Soul_Gem: 10000 }, costMult: 1.235, power: 0, effectDesc: '阵亡士兵有几率复活。' },
  { id: 'eden_cement',       region: 'elysium', name: '伊甸水泥厂',     desc: '伊甸园专用水泥生产。',                       reqs: { elysium: 6 },                           baseCost: { Money: 8e9, Cement: 5e8 }, costMult: 1.235, power: 5, effectDesc: '+ Cement 产出。' },

  // ----- Isle (天空岛) -----
  { id: 'south_pier',     region: 'isle', name: '南码头',     desc: '天空岛上的码头。',                           reqs: { eden_isle: 1 },                       baseCost: { Money: 5e10 }, costMult: 1.0, power: 0, effectDesc: '稳定空岛通道。' },
  { id: 'west_tower',     region: 'isle', name: '西塔',       desc: '天空岛防御塔。',                             reqs: { eden_isle: 2 },                       baseCost: { Money: 8e10, Adamantite: 5e8 }, costMult: 1.235, power: 8, effectDesc: '+ 防御评分。' },
  { id: 'east_tower',     region: 'isle', name: '东塔',       desc: '天空岛防御塔。',                             reqs: { eden_isle: 2 },                       baseCost: { Money: 8e10, Adamantite: 5e8 }, costMult: 1.235, power: 8, effectDesc: '+ 防御评分。' },
  { id: 'isle_garrison',  region: 'isle', name: '空岛驻军',   desc: '驻扎在天空岛的士兵。',                       reqs: { eden_isle: 3 },                       baseCost: { Money: 1e11, Stanene: 3e8 }, costMult: 1.235, power: 5, effectDesc: '+ 士兵容量。' },
  { id: 'spirit_vacuum',  region: 'isle', name: '灵魂真空',   desc: '抽取空岛中的灵魂。',                         reqs: { eden_isle: 4 },                       baseCost: { Money: 1.5e11, Asphodel_Powder: 500000 }, costMult: 1.235, power: 15, effectDesc: '+ Soul_Gem 产出。' },
  { id: 'spirit_battery', region: 'isle', name: '灵魂电池',   desc: '储存抽取的灵魂能量。',                       reqs: { eden_isle: 5 },                       baseCost: { Money: 2e11, Soul_Gem: 1000 }, costMult: 1.235, power: -30, effectDesc: '发电 30 MW。' },
  { id: 'soul_compactor', region: 'isle', name: '灵魂压缩器', desc: '压缩多个灵魂成宝石。',                       reqs: { eden_isle: 6 },                       baseCost: { Money: 3e11, Quantium: 1e8 }, costMult: 1.235, power: 12, effectDesc: '加速 Soul_Gem 生产。' },

  // ----- Palace (天界宫殿) -----
  { id: 'scout_palace', region: 'palace', name: '侦察宫殿', desc: '侦察天界宫殿。',                             reqs: { eden: 1 },                            baseCost: { Money: 1e12 }, costMult: 1.0, power: 0, effectDesc: '解锁宫殿。' },
  { id: 'throne',       region: 'palace', name: '王座',     desc: '神王的宝座。',                               reqs: { eden: 2 },                            baseCost: { Money: 5e11, Soul_Gem: 100000 }, costMult: 1.0, power: 0, effectDesc: '挑战神王。' },
  { id: 'infuser',      region: 'palace', name: '灌注器',   desc: '将力量灌注到飞升者。',                       reqs: { eden: 3 },                            baseCost: { Money: 1e12, Quantium: 5e8 }, costMult: 1.0, power: 0, effectDesc: '+ 飞升力量。' },
  { id: 'apotheosis',   region: 'palace', name: '神化',     desc: '触发神化转生 — 终极胜利。',                  reqs: { eden: 5 },                            baseCost: { Money: 1e13, Soul_Gem: 1000000 }, costMult: 1.0, power: 0, effectDesc: '触发 Apotheosis 转生。' },
  { id: 'conduit',      region: 'palace', name: '导管',     desc: '神圣能量导管。',                             reqs: { eden: 3 },                            baseCost: { Money: 5e11, Vitreloy: 1e9 }, costMult: 1.235, power: 25, effectDesc: '+ 神圣能量。' },
  { id: 'tomb',         region: 'palace', name: '陵墓',     desc: '神王的最终安息之地。',                       reqs: { eden: 6 },                            baseCost: { Money: 1e13, Demonic_Essence: 1000 }, costMult: 1.0, power: 0, effectDesc: '收割古老灵魂。' },
];

// ============================================================
// 工具函数
// ============================================================

/** 判断 Edenic 模式是否解锁 */
export function isEdenicUnlocked(state: GameState): boolean {
  return (state.tech['edenic'] ?? 0) >= 1;
}

/** 判断某区域是否解锁 */
export function isEdenicRegionUnlocked(state: GameState, region: EdenicRegionId): boolean {
  const def = EDENIC_REGIONS[region];
  for (const [tech, lvl] of Object.entries(def.reqs)) {
    if ((state.tech[tech] ?? 0) < lvl) return false;
  }
  return true;
}

/** 阿斯福德尔是否处于敌对阶段（影响事件和怪物刷新） */
export function isAsphodelHostile(state: GameState): boolean {
  return (state.tech['asphodel'] ?? 0) >= 5;
}

/** 获取某区域所有建筑 */
export function getEdenicBuildingsByRegion(region: EdenicRegionId): EdenicBuildingDef[] {
  return EDENIC_BUILDINGS.filter((b) => b.region === region);
}

/** 计算 Edenic 建筑成本 */
export function getEdenicBuildCost(state: GameState, buildingId: string): Record<string, number> | null {
  const building = EDENIC_BUILDINGS.find((b) => b.id === buildingId);
  if (!building) return null;
  const eden = state.eden as Record<string, Record<string, number>>;
  const count = eden[buildingId]?.['count'] ?? 0;
  const mult = Math.pow(building.costMult, count);
  const cost: Record<string, number> = {};
  for (const [res, base] of Object.entries(building.baseCost)) {
    cost[res] = Math.round(base * mult);
  }
  return cost;
}

/** 判断 Edenic 建筑是否可建造 */
export function canBuildEdenic(state: GameState, buildingId: string): boolean {
  if (!isEdenicUnlocked(state)) return false;
  const building = EDENIC_BUILDINGS.find((b) => b.id === buildingId);
  if (!building) return false;
  for (const [tech, lvl] of Object.entries(building.reqs)) {
    if ((state.tech[tech] ?? 0) < lvl) return false;
  }
  const cost = getEdenicBuildCost(state, buildingId);
  if (!cost) return false;
  for (const [res, amt] of Object.entries(cost)) {
    if ((state.resource[res]?.amount ?? 0) < amt) return false;
  }
  return true;
}

/** 建造 Edenic 建筑 */
export function buildEdenicStructure(state: GameState, buildingId: string): boolean {
  if (!canBuildEdenic(state, buildingId)) return false;
  const cost = getEdenicBuildCost(state, buildingId)!;
  for (const [res, amt] of Object.entries(cost)) {
    if (state.resource[res]) state.resource[res].amount -= amt;
  }
  const eden = state.eden as Record<string, Record<string, number>>;
  if (!eden[buildingId]) eden[buildingId] = { count: 0, on: 0 };
  eden[buildingId].count++;
  return true;
}

/** Edenic 建筑产出 tick */
export function edenicProductionTick(state: GameState, timeMul: number, deltas: Record<string, number>): void {
  if (!isEdenicUnlocked(state)) return;
  const eden = state.eden as Record<string, Record<string, number>>;

  // Asphodel / asphodel_harvester 产出 Asphodel Powder
  const harvOn = eden['asphodel_harvester']?.['on'] ?? 0;
  if (harvOn > 0) {
    deltas['Asphodel_Powder'] = (deltas['Asphodel_Powder'] ?? 0) + harvOn * 3 * timeMul;
  }

  // Asphodel / ectoplasm_processor 产出 Ectoplasm
  const ectoOn = eden['ectoplasm_processor']?.['on'] ?? 0;
  if (ectoOn > 0) {
    deltas['Ectoplasm'] = (deltas['Ectoplasm'] ?? 0) + ectoOn * 1 * timeMul;
  }

  // Elysium / elysanite_mine 产出 Elysanite
  const elysOn = eden['elysanite_mine']?.['on'] ?? 0;
  if (elysOn > 0) {
    deltas['Elysanite'] = (deltas['Elysanite'] ?? 0) + elysOn * 0.5 * timeMul;
  }

  // Elysium / sacred_smelter 产出 Mythril 加成
  const sacOn = eden['sacred_smelter']?.['on'] ?? 0;
  if (sacOn > 0) {
    deltas['Mythril'] = (deltas['Mythril'] ?? 0) + sacOn * 0.3 * timeMul;
  }

  // Isle / spirit_vacuum 产出 Soul Gem
  const vacOn = eden['spirit_vacuum']?.['on'] ?? 0;
  if (vacOn > 0) {
    deltas['Soul_Gem'] = (deltas['Soul_Gem'] ?? 0) + vacOn * 0.05 * timeMul;
  }

  // Isle / soul_compactor 加速 Soul Gem
  const compOn = eden['soul_compactor']?.['on'] ?? 0;
  if (compOn > 0) {
    deltas['Soul_Gem'] = (deltas['Soul_Gem'] ?? 0) + compOn * 0.1 * timeMul;
  }
}

/** Edenic tick — 推进神圣腐化进度 */
export function edenicTick(state: GameState, timeMul: number = 1): void {
  if (!isEdenicUnlocked(state)) return;

  // 在阿斯福德尔，stabilizer 减缓向敌对阶段的过渡
  const eden = state.eden as Record<string, Record<string, number>>;
  const stabilizer = eden['stabilizer']?.['on'] ?? 0;
  const asphodelLvl = state.tech['asphodel'] ?? 0;
  if (asphodelLvl < 5) {
    const progressRate = (1 - stabilizer * 0.05) * timeMul;
    const progress = (eden['asphodel_progress']?.['count'] ?? 0) + progressRate;
    if (!eden['asphodel_progress']) eden['asphodel_progress'] = { count: 0 };
    eden['asphodel_progress'].count = progress;
    // 当进度达到 10000 时，阿斯福德尔进入敌对阶段
    if (progress >= 10000) state.tech['asphodel'] = 5;
  }
}

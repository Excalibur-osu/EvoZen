/**
 * 太空建筑（Phase 1C）
 *
 * 对标 legacy/src/space.js。
 * 当前 sprint 覆盖：
 *   - spc_home: satellite / propellant_depot / gps / nav_beacon
 *   - spc_moon: moon_base / iridium_mine / helium_mine
 *
 * 所有成本与加成系数逐行对标 legacy；EvoZen 当前不执行 fuel_adjust / spatialReasoning
 * （truepath / world_control / 种族修饰尚未进入当前 scope）。
 */

import type { GameState } from '@evozen/shared-types';

export type SpaceCostFunction = (state: GameState, count: number) => number;

/** 支援池标识。单独抽象方便未来新增 red/belt/alpha 等。 */
export type SupportPool = 'moon';

export interface SpaceStructureDefinition {
  /** 建筑 ID，与 state.space[id] 对应 */
  id: string;
  /** 所属区域（spc_home / spc_moon / spc_red / ...） */
  region: string;
  /** 中文名 */
  name: string;
  /** 描述 */
  description: string;
  /** 前置科技等级要求（tech[key] >= value） */
  reqs: Record<string, number>;
  /**
   * 前置太空建筑数量要求（state.space[key].count >= value）。
   * 对标 legacy 中 `reqs: { satellite: 1 }` 这类"需要已建造 N 座"的门槛。
   */
  spaceReqs?: Record<string, number>;
  /** 被以下种族特性阻止建造（对标 legacy not_trait） */
  notTrait?: string[];
  /** 成本函数，按当前已建数量返回该资源本次建造需要的数量 */
  costs: Record<string, SpaceCostFunction>;
  /** 简要效果（UI 文案） */
  effect: string;
  /**
   * 供电需求（MW/座）。建造此建筑后 `state.space[id].on` 会参与电力分配。
   * 对标 legacy action.powered() 返回的基础值（不含 powerCostMod 修饰）。
   */
  powerCost?: number;
  /**
   * 本建筑对某支援池的 净支援贡献。正数 = 提供者（如 moon_base 每座 +2 support），
   * 负数 = 消耗者（如 iridium_mine 每座 -1 support）。
   * 与 legacy action.support() 的符号约定完全一致。
   */
  support?: { pool: SupportPool; amount: number };
  /**
   * 作为"区域供给者"每 tick 需要消耗的燃料（支援燃料）。
   * 对标 legacy action.support_fuel()。
   * 例：moon_base 每座 on 后每 tick 消耗 2 Oil。
   */
  supportFuel?: { resource: string; amountPerTick: number };
}

/**
 * 对标 legacy/src/functions.js `spaceCostMultiplier(id, offset, base, mult)`：
 *   cost = round(base * mult^count)
 *
 * 当前不处理 offset（队列预扣尚未接入太空），与 city 建筑的 scaleCost 实现保持一致。
 */
function spaceCost(base: number, mult: number): SpaceCostFunction {
  return (_state, count) => Math.round(base * Math.pow(mult, count));
}

export const SPACE_STRUCTURES: SpaceStructureDefinition[] = [
  // ==================== spc_home: 母星轨道区 ====================
  {
    id: 'satellite',
    region: 'spc_home',
    name: '人造卫星',
    description: '在近地轨道部署科研卫星，扩大知识容量并提升科研效率。',
    // 对标 legacy/src/space.js L62: reqs: { space: 2 }
    reqs: { space: 2 },
    // 对标 legacy/src/space.js L63-68
    costs: {
      Money: spaceCost(72000, 1.22),
      Knowledge: spaceCost(28000, 1.22),
      Oil: spaceCost(3200, 1.22),
      Alloy: spaceCost(8000, 1.22),
    },
    effect: '知识上限 +750；沃登克里夫知识上限 +4%/座；科学家效率 +1%/座。',
  },
  {
    id: 'propellant_depot',
    region: 'spc_home',
    name: '推进剂储备站',
    description: '在轨道储存液体燃料，扩大石油与氦-3 存储容量。',
    // 对标 legacy/src/space.js L142
    reqs: { space_explore: 1 },
    // 对标 legacy/src/space.js L143-147
    costs: {
      Money: spaceCost(55000, 1.35),
      Aluminium: spaceCost(22000, 1.35),
      Oil: spaceCost(5500, 1.35),
    },
    effect: '石油上限 +1250；当氦-3 已解锁时，氦-3 上限 +1000。',
  },
  {
    id: 'gps',
    region: 'spc_home',
    name: 'GPS 卫星网',
    description: '部署导航卫星群；达到 4 座后开始提供贸易路线容量加成。',
    // 对标 legacy/src/space.js L106-107
    reqs: {},
    spaceReqs: { satellite: 1 },
    notTrait: ['terrifying'],
    // 对标 legacy/src/space.js L108-113
    costs: {
      Money: spaceCost(75000, 1.18),
      Knowledge: spaceCost(50000, 1.18),
      Copper: spaceCost(6500, 1.18),
      Oil: spaceCost(3500, 1.18),
      Titanium: spaceCost(8000, 1.18),
    },
    effect: '当 GPS 达到 4 座后，每座额外提供 +2 条贸易路线。',
  },
  {
    id: 'nav_beacon',
    region: 'spc_home',
    name: '导航信标',
    description: '在近地轨道部署导航信标，为月球支援点提供额外容量。',
    // 对标 legacy/src/space.js L178: reqs: { luna: 2 }
    reqs: { luna: 2 },
    // 对标 legacy/src/space.js L179-185
    costs: {
      Money: spaceCost(75000, 1.32),
      Copper: spaceCost(38000, 1.32),
      Aluminium: spaceCost(44000, 1.32),
      Oil: spaceCost(12500, 1.32),
      Iridium: spaceCost(1200, 1.32),
    },
    effect: '每座需要 2MW 电力；每座 on 后月球支援容量 +1。',
    // 对标 legacy/src/space.js L186: powered(){ return powerCostMod(2); }
    powerCost: 2,
    // 对标 legacy/src/main.js L2306: 如果 luna>=2，p_on['nav_beacon'] 每座向 spc_moon.s_max +1
    // （EvoZen 将其建模为：nav_beacon 每座 on 对 moon 池 +1 支援）
    support: { pool: 'moon', amount: 1 },
  },

  // ==================== spc_moon: 月球 ====================
  {
    id: 'moon_base',
    region: 'spc_moon',
    name: '月面基地',
    description: '在月表建立可持续前哨，为月面采矿与观测提供支援能力。',
    // 对标 legacy/src/space.js L254: reqs: { space: 3 }
    reqs: { space: 3 },
    // 对标 legacy/src/space.js L255-260
    costs: {
      Money: spaceCost(22000, 1.32),
      Cement: spaceCost(18000, 1.32),
      Alloy: spaceCost(7800, 1.32),
      Polymer: spaceCost(12500, 1.32),
    },
    effect: '每座需要 4MW 电力与 2 石油/tick；铱上限 +500；每座 on 提供 2 月球支援。',
    // 对标 legacy/src/space.js L268: powered(){ return powerCostMod(4); }
    powerCost: 4,
    // 对标 legacy/src/space.js L266: support(){ return 2; }
    support: { pool: 'moon', amount: 2 },
    // 对标 legacy/src/space.js L267: support_fuel(){ return { r: 'Oil', a: 2 }; }
    supportFuel: { resource: 'Oil', amountPerTick: 2 },
  },
  {
    id: 'iridium_mine',
    region: 'spc_moon',
    name: '月面铱矿',
    description: '在月表开采稀有金属铱，向月球殖民地输送资源。',
    // 对标 legacy/src/space.js L317
    reqs: { space: 3, luna: 1 },
    // 对标 legacy/src/space.js L318-322
    costs: {
      Money: spaceCost(42000, 1.35),
      Lumber: spaceCost(9000, 1.35),
      Titanium: spaceCost(17500, 1.35),
    },
    effect: '每座消耗 1 月球支援，产出 0.035 铱/tick。',
    // 对标 legacy/src/space.js L340: support(){ return -1; }
    support: { pool: 'moon', amount: -1 },
  },
  {
    id: 'helium_mine',
    region: 'spc_moon',
    name: '氦-3 采集站',
    description: '从月壤中采集氦-3，为未来的聚变燃料储备奠基。',
    // 对标 legacy/src/space.js L366
    reqs: { space: 3, luna: 1 },
    // 对标 legacy/src/space.js L367-371
    costs: {
      Money: spaceCost(38000, 1.35),
      Aluminium: spaceCost(9000, 1.35),
      Steel: spaceCost(17500, 1.35),
    },
    effect: '每座消耗 1 月球支援，产出 0.18 氦-3/tick；氦-3 上限 +100。',
    // 对标 legacy/src/space.js L388: support(){ return -1; }
    support: { pool: 'moon', amount: -1 },
  },
];

// ============================================================
// 查询与计算
// ============================================================

function getSpaceCount(state: GameState, id: string): number {
  return (state.space[id] as { count?: number } | undefined)?.count ?? 0;
}

function getSpaceOn(state: GameState, id: string): number {
  const struct = state.space[id] as { count?: number; on?: number } | undefined;
  if (!struct) return 0;
  // 若 on 未定义但 count 存在，默认视为全部开启（与 city 的 on ?? count 惯例一致）
  return struct.on ?? struct.count ?? 0;
}

/** 按支援池过滤的供给者/消耗者列表（用于支援解算）。 */
export function getSpaceSupplyDefs(pool: SupportPool): SpaceStructureDefinition[] {
  return SPACE_STRUCTURES.filter((d) => d.support?.pool === pool && d.support.amount > 0);
}
export function getSpaceConsumerDefs(pool: SupportPool): SpaceStructureDefinition[] {
  return SPACE_STRUCTURES.filter((d) => d.support?.pool === pool && d.support.amount < 0);
}

export function getSpaceBuildCost(state: GameState, id: string): Record<string, number> {
  const def = SPACE_STRUCTURES.find((s) => s.id === id);
  if (!def) return {};
  const count = getSpaceCount(state, id);
  const costs: Record<string, number> = {};
  for (const [resId, fn] of Object.entries(def.costs)) {
    costs[resId] = fn(state, count);
  }
  return costs;
}

export function canBuildSpaceStructure(state: GameState, id: string): boolean {
  const def = SPACE_STRUCTURES.find((s) => s.id === id);
  if (!def) return false;

  for (const [reqKey, reqLvl] of Object.entries(def.reqs)) {
    if ((state.tech[reqKey] ?? 0) < reqLvl) return false;
  }

  if (def.spaceReqs) {
    for (const [spaceId, minCount] of Object.entries(def.spaceReqs)) {
      if (getSpaceCount(state, spaceId) < minCount) return false;
    }
  }

  if (def.notTrait) {
    for (const trait of def.notTrait) {
      if ((state.race as Record<string, unknown>)[trait] !== undefined) return false;
    }
  }

  const costs = getSpaceBuildCost(state, id);
  for (const [resId, cost] of Object.entries(costs)) {
    if (cost <= 0) continue;
    if ((state.resource[resId]?.amount ?? 0) < cost) return false;
  }

  return true;
}

// ============================================================
// derived-state / tick 使用的加成查询
// ============================================================

export function getSatelliteCount(state: GameState): number {
  return getSpaceCount(state, 'satellite');
}

/**
 * 卫星对沃登克里夫知识上限的乘数（对标 legacy main.js L9329-9331）：
 *   gain *= 1 + (satellite.count * 0.04)
 */
export function getSatelliteWardenclyffeMultiplier(state: GameState): number {
  return 1 + getSatelliteCount(state) * 0.04;
}

/**
 * 卫星对科学家 impact 的乘数（对标 legacy main.js L4197-4199）：
 *   scientist_base *= 1 + (satellite.count * 0.01)
 */
export function getSatelliteScientistImpactMultiplier(state: GameState): number {
  return 1 + getSatelliteCount(state) * 0.01;
}

/**
 * 卫星直接贡献的知识上限（对标 legacy main.js L9363-9370）：
 *   gain = satellite.count * 750（非 cataclysm/orbit_decayed 情形）
 */
export function getSatelliteKnowledgeCapBonus(state: GameState): number {
  return getSatelliteCount(state) * 750;
}

/**
 * 推进剂储备站数量。
 */
export function getPropellantDepotCount(state: GameState): number {
  return getSpaceCount(state, 'propellant_depot');
}

/**
 * 推进剂储备站对石油上限的加成（对标 legacy space.js L159）：
 *   Oil.max += 1250 * count
 */
export function getPropellantDepotOilCapBonus(state: GameState): number {
  return getPropellantDepotCount(state) * 1250;
}

/**
 * 推进剂储备站对氦-3 上限的加成（对标 legacy space.js L160-162）：
 *   仅当 Helium_3 已 display 时生效：Helium_3.max += 1000 * count
 */
export function getPropellantDepotHeliumCapBonus(state: GameState): number {
  if (!state.resource['Helium_3']?.display) return 0;
  return getPropellantDepotCount(state) * 1000;
}

/**
 * GPS 卫星网数量。
 */
export function getGpsCount(state: GameState): number {
  return getSpaceCount(state, 'gps');
}

/**
 * GPS 对贸易路线上限的加成（对标 legacy main.js L9885-9889）：
 *   仅当 gps.count >= 4 时生效：mtrade += gps.count * 2
 */
export function getGpsTradeRouteBonus(state: GameState): number {
  const count = getGpsCount(state);
  if (count < 4) return 0;
  return count * 2;
}

// --- spc_moon ---

export function getMoonBaseCount(state: GameState): number {
  return getSpaceCount(state, 'moon_base');
}

/**
 * moon_base 对铱上限的贡献（对标 legacy space.js L262 + main.js 集成）：
 *   Iridium.max += moon_base.count * 500（baseline 0，无 spatialReasoning）
 */
export function getMoonBaseIridiumCapBonus(state: GameState): number {
  return getMoonBaseCount(state) * 500;
}

/**
 * helium_mine 对氦-3 上限的贡献（对标 legacy space.js L373 + main.js 集成）：
 *   Helium_3.max += helium_mine.count * 100
 */
export function getHeliumMineHeliumCapBonus(state: GameState): number {
  return getSpaceCount(state, 'helium_mine') * 100;
}

// --- 供支援 / 燃料 / tick 查询的公共访问器 ---

export { getSpaceCount as getSpaceStructCount, getSpaceOn as getSpaceStructOn };

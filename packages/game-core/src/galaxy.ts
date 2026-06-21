import type { GameState } from '@evozen/shared-types';
import { applySpaceScaling } from './space';

export type GalaxySupportPool = 'gateway' | 'gorddon' | 'alien1' | 'alien2' | 'chthonian';

export interface GalaxyStructureDefinition {
  id: string;
  region: string;
  name: string;
  description: string;
  reqs: Record<string, number>;
  notTrait?: string[];
  costs: Record<string, (state: GameState, count: number) => number>;
  effect: string;
  powerCost?: number;
  support?: { pool: GalaxySupportPool; amount: number };
  supportFuel?: { resource: string; amountPerTick: number };
  condition?: (state: GameState) => boolean;
}

function galaxyCost(base: number, mult: number) {
  return (state: GameState, count: number) => {
    const scaledAmt = applySpaceScaling(state, count);
    return Math.ceil(base * Math.pow(mult, scaledAmt));
  };
}

// Galaxy 区域定义
export const GALAXY_REGIONS = [
  'gxy_stargate',
  'gxy_gateway',
  'gxy_gorddon',
  'gxy_alien1',
  'gxy_alien2',
  'gxy_chthonian',
] as const;

export type GalaxyRegion = (typeof GALAXY_REGIONS)[number];

export const GALAXY_STRUCTURES: GalaxyStructureDefinition[] = [
  // ===== gxy_stargate — 星门区域 =====
  {
    id: 'gateway_station',
    region: 'gxy_stargate',
    name: '网关站',
    description: '在星门附近建立网关站，作为银河系探索的前哨基地。',
    reqs: { stargate: 1 },
    costs: {
      Money: galaxyCost(2500000, 1.2),
      Adamantite: galaxyCost(480000, 1.2),
      Stanene: galaxyCost(350000, 1.2),
    },
    effect: '每座需要 25MW 电力；提供网关支援。',
    powerCost: 25,
    support: { pool: 'gateway', amount: 2 },
  },
  {
    id: 'telemetry_beacon',
    region: 'gxy_stargate',
    name: '遥测信标',
    description: '部署遥测信标，提升银河系探索效率。',
    reqs: { stargate: 2 },
    costs: {
      Money: galaxyCost(1800000, 1.15),
      Iridium: galaxyCost(125000, 1.15),
      Elerium: galaxyCost(1250, 1.15),
    },
    effect: '提升银河系探索效率。',
  },
  {
    id: 'defense_platform',
    region: 'gxy_stargate',
    name: '防御平台',
    description: '建造防御平台保护星门。',
    reqs: { stargate: 6 },
    costs: {
      Money: galaxyCost(3500000, 1.18),
      Orichalcum: galaxyCost(75000, 1.18),
      Vitreloy: galaxyCost(50000, 1.18),
    },
    effect: '每座提供防御力；消耗 5MW 电力。',
    powerCost: 5,
  },

  // ===== gxy_gateway — 网关区域 =====
  {
    id: 'starbase',
    region: 'gxy_gateway',
    name: '星港',
    description: '在网关区域建造星港，提供舰船维修和补给。',
    reqs: { gateway: 3 },
    costs: {
      Money: galaxyCost(4000000, 1.22),
      Stanene: galaxyCost(500000, 1.22),
      Mythril: galaxyCost(25000, 1.22),
    },
    effect: '每座需要 30MW 电力；提供网关支援。',
    powerCost: 30,
    support: { pool: 'gateway', amount: 3 },
  },
  {
    id: 'scout_ship',
    region: 'gxy_gateway',
    name: '侦察舰',
    description: '建造侦察舰用于银河系探索。',
    reqs: { andromeda: 1 },
    costs: {
      Money: galaxyCost(2600000, 1.15),
      Stanene: galaxyCost(200000, 1.15),
      Graphene: galaxyCost(100000, 1.15),
    },
    effect: '侦察舰用于探索和情报收集。',
  },
  {
    id: 'corvette_ship',
    region: 'gxy_gateway',
    name: '护卫舰',
    description: '建造护卫舰用于战斗和护航。',
    reqs: { andromeda: 2 },
    costs: {
      Money: galaxyCost(3200000, 1.15),
      Orichalcum: galaxyCost(45000, 1.15),
      Vitreloy: galaxyCost(35000, 1.15),
    },
    effect: '护卫舰提供基础战斗力。',
  },
  {
    id: 'frigate_ship',
    region: 'gxy_gateway',
    name: '驱逐舰',
    description: '建造驱逐舰用于主力战斗。',
    reqs: { andromeda: 3 },
    costs: {
      Money: galaxyCost(4000000, 1.15),
      Orichalcum: galaxyCost(75000, 1.15),
      Vitreloy: galaxyCost(50000, 1.15),
    },
    effect: '驱逐舰提供强大战斗力。',
  },
  {
    id: 'cruiser_ship',
    region: 'gxy_gateway',
    name: '巡洋舰',
    description: '建造巡洋舰用于重型战斗。',
    reqs: { andromeda: 4 },
    costs: {
      Money: galaxyCost(5500000, 1.15),
      Orichalcum: galaxyCost(120000, 1.15),
      Vitreloy: galaxyCost(80000, 1.15),
    },
    effect: '巡洋舰提供强大火力支援。',
  },
  {
    id: 'dreadnought',
    region: 'gxy_gateway',
    name: '无畏舰',
    description: '建造无畏舰，银河系最强战舰。',
    reqs: { andromeda: 5 },
    costs: {
      Money: galaxyCost(7500000, 1.15),
      Orichalcum: galaxyCost(200000, 1.15),
      Vitreloy: galaxyCost(150000, 1.15),
    },
    effect: '无畏舰提供顶级战斗力。',
  },
  {
    id: 'ship_dock',
    region: 'gxy_gateway',
    name: '船坞',
    description: '建造船坞用于舰船维修和升级。',
    reqs: { gateway: 4 },
    costs: {
      Money: galaxyCost(3900000, 1.2),
      Stanene: galaxyCost(350000, 1.2),
      Graphene: galaxyCost(200000, 1.2),
    },
    effect: '提供舰船维修和升级功能。',
  },

  // ===== gxy_gorddon — 戈登区域 =====
  {
    id: 'embassy',
    region: 'gxy_gorddon',
    name: '大使馆',
    description: '在戈登建立大使馆，与外星文明建立外交关系。',
    reqs: { xeno: 4 },
    costs: {
      Money: galaxyCost(4500000, 1.18),
      Bolognium: galaxyCost(250000, 1.18),
      Vitreloy: galaxyCost(100000, 1.18),
    },
    effect: '建立外交关系，解锁贸易和文化交流。',
  },
  {
    id: 'freighter',
    region: 'gxy_gorddon',
    name: '货船',
    description: '建造货船用于星际贸易。',
    reqs: { xeno: 5 },
    costs: {
      Money: galaxyCost(3000000, 1.15),
      Stanene: galaxyCost(250000, 1.15),
      Graphene: galaxyCost(150000, 1.15),
    },
    effect: '货船用于星际贸易运输。',
  },
  {
    id: 'dormitory',
    region: 'gxy_gorddon',
    name: '宿舍',
    description: '建造宿舍容纳外交人员和贸易商。',
    reqs: { xeno: 6 },
    costs: {
      Money: galaxyCost(3500000, 1.18),
      Bolognium: galaxyCost(200000, 1.18),
      Orichalcum: galaxyCost(50000, 1.18),
    },
    effect: '提供人口容量和外交加成。',
  },
  {
    id: 'symposium',
    region: 'gxy_gorddon',
    name: '研讨会',
    description: '建造研讨会促进科学和文化交流。',
    reqs: { xeno: 6 },
    costs: {
      Money: galaxyCost(5000000, 1.18),
      Bolognium: galaxyCost(300000, 1.18),
      Vitreloy: galaxyCost(150000, 1.18),
    },
    effect: '提供知识加成和文化影响力。',
  },

  // ===== gxy_alien1 — 外星区域1 =====
  {
    id: 'consulate',
    region: 'gxy_alien1',
    name: '领事馆',
    description: '在外星区域建立领事馆。',
    reqs: { xeno: 8 },
    costs: {
      Money: galaxyCost(6000000, 1.18),
      Bolognium: galaxyCost(400000, 1.18),
      Orichalcum: galaxyCost(100000, 1.18),
    },
    effect: '建立外交存在，解锁更多外交选项。',
  },
  {
    id: 'resort',
    region: 'gxy_alien1',
    name: '度假村',
    description: '建造度假村促进旅游业。',
    reqs: { xeno: 9 },
    costs: {
      Money: galaxyCost(8000000, 1.18),
      Vitreloy: galaxyCost(200000, 1.18),
      Orichalcum: galaxyCost(150000, 1.18),
    },
    effect: '提供旅游收入和士气加成。',
  },
  {
    id: 'super_freighter',
    region: 'gxy_alien1',
    name: '超级货船',
    description: '建造超级货船用于大规模贸易。',
    reqs: { xeno: 10 },
    costs: {
      Money: galaxyCost(7000000, 1.15),
      Stanene: galaxyCost(500000, 1.15),
      Graphene: galaxyCost(300000, 1.15),
    },
    effect: '大幅提升贸易运输能力。',
  },
  {
    id: 'vitreloy_plant',
    region: 'gxy_alien1',
    name: '玻璃合金工厂',
    description: '建造玻璃合金工厂。',
    reqs: { xeno: 10 },
    costs: {
      Money: galaxyCost(7250000, 1.18),
      Bolognium: galaxyCost(350000, 1.18),
      Orichalcum: galaxyCost(100000, 1.18),
    },
    effect: '生产玻璃合金材料。',
  },

  // ===== gxy_alien2 — 外星区域2 =====
  {
    id: 'foothold',
    region: 'gxy_alien2',
    name: '据点',
    description: '在外星区域2建立军事据点。',
    reqs: { andromeda: 4 },
    costs: {
      Money: galaxyCost(5500000, 1.2),
      Orichalcum: galaxyCost(100000, 1.2),
      Vitreloy: galaxyCost(75000, 1.2),
    },
    effect: '每座需要 20MW 电力；提供军事支援。',
    powerCost: 20,
    support: { pool: 'alien2', amount: 3 },
  },
  {
    id: 'armed_miner',
    region: 'gxy_alien2',
    name: '武装矿工',
    description: '部署武装矿工进行采矿和防御。',
    reqs: { xeno: 8 },
    costs: {
      Money: galaxyCost(4000000, 1.15),
      Stanene: galaxyCost(300000, 1.15),
      Graphene: galaxyCost(200000, 1.15),
    },
    effect: '每座消耗 1 外星区域2支援；提供采矿和防御能力。',
    support: { pool: 'alien2', amount: -1 },
  },

  // ===== gxy_chthonian — 地底世界区域 =====
  {
    id: 'mining_ship',
    region: 'gxy_chthonian',
    name: '采矿船',
    description: '建造采矿船开采地底世界资源。',
    reqs: { chthonian: 1 },
    costs: {
      Money: galaxyCost(6000000, 1.18),
      Stanene: galaxyCost(400000, 1.18),
      Graphene: galaxyCost(250000, 1.18),
    },
    effect: '每座消耗 2 地底世界支援；提供稀有资源开采。',
    support: { pool: 'chthonian', amount: -2 },
  },
  {
    id: 'minelayer',
    region: 'gxy_chthonian',
    name: '布雷舰',
    description: '建造布雷舰进行防御和攻击。',
    reqs: { chthonian: 2 },
    costs: {
      Money: galaxyCost(5000000, 1.15),
      Orichalcum: galaxyCost(120000, 1.15),
      Vitreloy: galaxyCost(80000, 1.15),
    },
    effect: '提供防御和攻击能力。',
  },
  {
    id: 'raider',
    region: 'gxy_chthonian',
    name: '掠夺者',
    description: '建造掠夺者战舰进行突袭。',
    reqs: { chthonian: 3 },
    costs: {
      Money: galaxyCost(8000000, 1.15),
      Orichalcum: galaxyCost(200000, 1.15),
      Vitreloy: galaxyCost(150000, 1.15),
    },
    effect: '提供强大突袭能力。',
  },

  // ===== 更多 Galaxy 建筑 =====

  // gxy_stargate 补充
  {
    id: 'gateway_depot',
    region: 'gxy_stargate',
    name: '网关仓库',
    description: '建造网关仓库存储资源。',
    reqs: { gateway: 5 },
    costs: {
      Money: galaxyCost(4000000, 1.25),
      Neutronium: galaxyCost(80000, 1.25),
      Stanene: galaxyCost(500000, 1.25),
      Vitreloy: galaxyCost(2500, 1.25),
    },
    effect: '提供大量存储容量。',
  },

  // gxy_gateway 补充
  {
    id: 'bolognium_ship',
    region: 'gxy_gateway',
    name: '博洛尼乌姆船',
    description: '建造博洛尼乌姆运输船。',
    reqs: { gateway: 4 },
    costs: {
      Money: galaxyCost(3500000, 1.18),
      Stanene: galaxyCost(300000, 1.18),
      Graphene: galaxyCost(200000, 1.18),
    },
    effect: '用于博洛尼乌姆资源运输。',
  },

  // gxy_alien2 补充
  {
    id: 'scavenger',
    region: 'gxy_alien2',
    name: '拾荒者',
    description: '部署拾荒者收集资源。',
    reqs: { xeno: 9 },
    costs: {
      Money: galaxyCost(4500000, 1.15),
      Stanene: galaxyCost(350000, 1.15),
      Graphene: galaxyCost(200000, 1.15),
    },
    effect: '每座消耗 1 外星区域2支援；提供资源收集能力。',
    support: { pool: 'alien2', amount: -1 },
  },

  // gxy_chthonian 补充
  {
    id: 'chthonian_mine',
    region: 'gxy_chthonian',
    name: '地底矿场',
    description: '建造地底矿场开采稀有资源。',
    reqs: { chthonian: 2 },
    costs: {
      Money: galaxyCost(6500000, 1.18),
      Stanene: galaxyCost(450000, 1.18),
      Graphene: galaxyCost(300000, 1.18),
    },
    effect: '每座消耗 2 地底世界支援；提供稀有资源开采。',
    support: { pool: 'chthonian', amount: -2 },
  },
];

// Galaxy 区域解锁条件
export const GALAXY_REGION_REQS: Record<GalaxyRegion, Record<string, number>> = {
  gxy_stargate: { stargate: 1 },
  gxy_gateway: { gateway: 3 },
  gxy_gorddon: { xeno: 4 },
  gxy_alien1: { xeno: 8 },
  gxy_alien2: { andromeda: 4 },
  gxy_chthonian: { chthonian: 1 },
};

export function isGalaxyRegionUnlocked(state: GameState, region: GalaxyRegion): boolean {
  const reqs = GALAXY_REGION_REQS[region];
  if (!reqs) return false;

  for (const [key, level] of Object.entries(reqs)) {
    if ((state.tech[key] ?? 0) < level) return false;
  }

  return true;
}

export function getGalaxyStructuresForRegion(region: string): GalaxyStructureDefinition[] {
  return GALAXY_STRUCTURES.filter((s) => s.region === region);
}

function getGalaxyCount(state: GameState, id: string): number {
  const galaxy = (state as unknown as { galaxy?: Record<string, { count?: number }> }).galaxy ?? {};
  return galaxy[id]?.count ?? 0;
}

export function getGalaxyBuildCost(state: GameState, id: string): Record<string, number> {
  const def = GALAXY_STRUCTURES.find((s) => s.id === id);
  if (!def) return {};
  const count = getGalaxyCount(state, id);
  const costs: Record<string, number> = {};
  for (const [resId, fn] of Object.entries(def.costs)) {
    costs[resId] = fn(state, count);
  }
  return costs;
}

export function canBuildGalaxyStructure(state: GameState, id: string): boolean {
  const def = GALAXY_STRUCTURES.find((s) => s.id === id);
  if (!def) return false;

  for (const [reqKey, reqLvl] of Object.entries(def.reqs)) {
    if ((state.tech[reqKey] ?? 0) < reqLvl) return false;
  }

  if (def.notTrait) {
    for (const trait of def.notTrait) {
      if ((state.race as Record<string, unknown>)[trait] !== undefined) return false;
    }
  }

  if (def.condition && !def.condition(state)) return false;

  const costs = getGalaxyBuildCost(state, id);
  for (const [resId, cost] of Object.entries(costs)) {
    if (cost <= 0) continue;
    if ((state.resource[resId]?.amount ?? 0) < cost) return false;
  }

  return true;
}

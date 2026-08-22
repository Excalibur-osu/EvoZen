import type { FactoryState, GameState, JobState } from '@evozen/shared-types';
import { applySpaceScaling } from './space';
import { getTauExplorerForDismantle, dismantleTauExplorer } from './truepath-ships';
import { getTraitVar } from './trait-ranks';
import { getPsychicProductionMultiplier } from './production-modifiers';
import { getHivemindMultiplier, getToughMiningMultiplier, getWeakWorkerMultiplier } from './traits';
import { getShrineBonus } from './magic';
import { getMinerPlanetMultiplier } from './planet-traits';
import { checkTaucetiJumpGateCompletion, TAUCETI_JUMP_GATE_SEGMENTS } from './tauceti-progression';
import {
  getTaucetiRepositoryContainerCapacityBonus,
  getTaucetiRepositoryResources,
  getTaucetiRepositoryStorageBonus,
} from './truepath-storage';

export type TaucetiSupportPool = 'home' | 'red' | 'star';
export type WomlingRelation = 'friend' | 'god' | 'lord';

export interface TaucetiMissionDefinition {
  id: 'home_mission' | 'dismantle' | 'excavate' | 'red_mission';
  name: string;
  description: string;
  reqs: Record<string, number>;
  costs: Record<string, number>;
}

export interface WomlingRelationDefinition {
  id: WomlingRelation;
  name: string;
  description: string;
  costs: Record<string, number>;
}

export interface TaucetiStructureDefinition {
  id: string;
  region: string;
  name: string;
  description: string;
  reqs: Record<string, number>;
  notTrait?: string[];
  costs: Record<string, (state: GameState, count: number) => number>;
  effect: string;
  implemented?: boolean;
  /** 遗迹等不可重复建造的设施仍可显示并参与运行控制。 */
  buildable?: boolean;
  /** 分段巨构的总段数。 */
  segmentCap?: number;
  /** false 表示纯进度结构，不参与启停控制。 */
  tracksOn?: boolean;
  path?: 'truepath';
  powerCost?: number;
  support?: { pool: TaucetiSupportPool; amount: number };
  supportFuel?: { resource: string; amountPerTick: number } | ((state: GameState) => { resource: string; amountPerTick: number });
  generatorFuel?: { resource: string; amountPerTick: number } | ((state: GameState) => { resource: string; amountPerTick: number } | undefined);
  condition?: (state: GameState) => boolean;
}

function taucetiCost(base: number, mult: number) {
  return (state: GameState, count: number) => {
    const scaledAmt = applySpaceScaling(state, count);
    return Math.round(base * Math.pow(mult, scaledAmt));
  };
}

function conditionalTaucetiCost(
  condition: (state: GameState) => boolean,
  base: number,
  mult: number,
) {
  const cost = taucetiCost(base, mult);
  return (state: GameState, count: number) => condition(state) ? cost(state, count) : 0;
}

export function getWomlingRecycledCost(state: GameState, value: number): number {
  const level = Math.max(0, state.tech['womling_tech'] ?? 0);
  if (level <= 0 || (state.tech['womling_recycling'] ?? 0) < 1) return value;
  return value * Math.pow(state.tech['isolation'] ? 0.97 : 0.98, level);
}

function recycledTaucetiCost(base: number, mult: number) {
  return (state: GameState, count: number) => {
    const scaledAmt = applySpaceScaling(state, count);
    return Math.round(getWomlingRecycledCost(state, base) * Math.pow(mult, scaledAmt));
  };
}

// Tauceti 区域定义
export const TAUCETI_REGIONS = ['tau_home', 'tau_red', 'tau_roid', 'tau_gas', 'tau_star'] as const;

export type TaucetiRegion = (typeof TAUCETI_REGIONS)[number];

export const TAUCETI_MISSIONS: TaucetiMissionDefinition[] = [
  {
    id: 'home_mission',
    name: 'Tau 家园任务',
    description: '派遣任务队勘察 Tau Ceti 主行星并确定殖民地位置。',
    reqs: { tauceti: 2 },
    costs: { Money: 1_000_000_000 },
  },
  {
    id: 'dismantle',
    name: '拆解探索舰',
    description: '拆解一艘已抵达 Tau 的探索舰，建立第一批家园设施。',
    reqs: { tau_home: 1 },
    costs: { Money: 100_000_000 },
  },
  {
    id: 'excavate',
    name: '发掘前哨',
    description: '发掘 Tau 家园地下的外星前哨，准备研究它的功能。',
    reqs: { tau_home: 2 },
    costs: { Money: 1_650_000_000, Materials: 750_000 },
  },
  {
    id: 'red_mission',
    name: '红星任务',
    description: '派遣任务队调查 Tau Ceti 的红色行星。',
    reqs: { tauceti: 2 },
    costs: { Money: 1_000_000_000 },
  },
];

export const WOMLING_RELATIONS: WomlingRelationDefinition[] = [
  {
    id: 'friend',
    name: '建立友好关系',
    description: '以物资援助换取 Womling 的合作。',
    costs: { Money: 600_000_000, Food: 2_500_000 },
  },
  {
    id: 'god',
    name: '公开现身',
    description: '以先进知识让 Womling 将你视作神明。',
    costs: { Knowledge: 7_000_000 },
  },
  {
    id: 'lord',
    name: '武力征服',
    description: '以强权迫使 Womling 臣服。',
    costs: { Money: 2_850_000_000 },
  },
];

export const TAUCETI_STRUCTURES: TaucetiStructureDefinition[] = [
  // ===== tau_home — 主家园区域 =====
  {
    id: 'orbital_station',
    region: 'tau_home',
    name: '轨道站',
    description: '维持 Tau 家园的轨道补给与支援网络。',
    reqs: { tau_home: 2 },
    path: 'truepath',
    implemented: true,
    costs: {
      Money: taucetiCost(80_000_000, 1.3),
      Materials: conditionalTaucetiCost((state) => (state.tech['tauceti'] ?? 0) < 4, 500_000, 1.3),
      Helium_3: conditionalTaucetiCost((state) => (state.tech['tauceti'] ?? 0) >= 4, 250_000, 1.3),
      Copper: conditionalTaucetiCost((state) => (state.tech['tauceti'] ?? 0) >= 4, 1_250_000, 1.3),
      Adamantite: conditionalTaucetiCost((state) => (state.tech['tauceti'] ?? 0) >= 4, 900_000, 1.3),
    },
    effect: '每座通电轨道站提供 3 点 Tau 家园支援。',
    powerCost: 30,
    support: { pool: 'home', amount: 3 },
    supportFuel: (state) => ({
      resource: 'Helium_3',
      amountPerTick: state.tech['isolation'] ? (state.race['lone_survivor'] ? 5 : 25) : 400,
    }),
  },
  {
    id: 'colony',
    region: 'tau_home',
    name: '殖民地',
    description: '为 Tau 家园提供人口、仓储与区域生产增益。',
    reqs: { tau_home: 2 },
    path: 'truepath',
    implemented: true,
    costs: {
      Money: taucetiCost(15_750_000, 1.225),
      Materials: conditionalTaucetiCost((state) => (state.tech['tauceti'] ?? 0) < 4, 650_000, 1.225),
      Furs: conditionalTaucetiCost((state) => (state.tech['tauceti'] ?? 0) >= 4, 720_000, 1.225),
      Graphene: conditionalTaucetiCost((state) => (state.tech['tauceti'] ?? 0) >= 4, 485_000, 1.225),
      Brick: conditionalTaucetiCost((state) => (state.tech['tauceti'] ?? 0) >= 4, 880_000, 1.225),
    },
    effect: '消耗 2 点家园支援；每座有效殖民地使 Tau 产出 +50%，并提供人口与仓储容量。',
    support: { pool: 'home', amount: -2 },
    supportFuel: (state) => ({
      resource: 'Food',
      amountPerTick: state.tech['isolation'] ? (state.race['lone_survivor'] ? -2 : 75) : 1_000,
    }),
  },
  {
    id: 'mining_pit',
    region: 'tau_home',
    name: '矿坑',
    description: '为坑道矿工提供岗位，并开采 Tau 家园资源。',
    reqs: { tau_home: 2 },
    path: 'truepath',
    implemented: true,
    costs: {
      Money: taucetiCost(4_250_000, 1.225),
      Materials: conditionalTaucetiCost((state) => (state.tech['tauceti'] ?? 0) < 4, 350_000, 1.225),
      Lumber: conditionalTaucetiCost((state) => (state.tech['tauceti'] ?? 0) >= 4, 2_350_000, 1.225),
      Iron: conditionalTaucetiCost((state) => (state.tech['tauceti'] ?? 0) >= 4, 835_000, 1.225),
    },
    effect: '消耗 1 点家园支援；每座有效矿坑提供坑道矿工岗位，普通路线另提供 1M 材料容量。',
    support: { pool: 'home', amount: -1 },
  },
  {
    id: 'alien_outpost',
    region: 'tau_home',
    name: '外星前哨',
    description: '一座已发掘的外星研究设施；它不能建造，但可以接入或断开电网。',
    reqs: { tau_home: 4 },
    path: 'truepath',
    implemented: true,
    buildable: false,
    costs: {},
    effect: '通电时使知识上限 +20%；隔离路线另提供知识与密文上限，并产出密文。',
    powerCost: 100,
  },
  {
    id: 'jump_gate',
    region: 'tau_home',
    name: '空间跃迁之门',
    description: '在 Tau Ceti 建造与母星跃迁门配对的 100 段巨构。',
    reqs: { tauceti: 3 },
    condition: (state) => !state.tech['isolation'],
    path: 'truepath',
    implemented: true,
    segmentCap: TAUCETI_JUMP_GATE_SEGMENTS,
    tracksOn: false,
    costs: {
      Money: (_state, count) => count < TAUCETI_JUMP_GATE_SEGMENTS ? 1_000_000 : 0,
      Materials: (_state, count) => count < TAUCETI_JUMP_GATE_SEGMENTS ? 12_500 : 0,
    },
    effect: '共需建造 100 段；只有母星侧的配对跃迁门也完工后，才会建立资源通道。',
  },
  {
    id: 'repository',
    region: 'tau_home',
    name: '储存库',
    description: '在 Tau 家园建造大型仓储设施，为已发现资源扩展容量。',
    reqs: { tau_home: 5 },
    path: 'truepath',
    implemented: true,
    tracksOn: false,
    costs: {
      Money: taucetiCost(10_280_000, 1.28),
      Iron: taucetiCost(1_800_000, 1.28),
      Cement: taucetiCost(1_500_000, 1.28),
      Neutronium: taucetiCost(215_000, 1.28),
    },
    effect: '按资源种类增加仓储上限；囤积癖、黑洞成就、世界统一、隔离补给站与石柱会提高容量。',
  },
  {
    id: 'fusion_generator',
    region: 'tau_home',
    name: '聚变发电机',
    description: '使用氦-3 驱动 Tau 家园电网。',
    reqs: { tau_home: 6 },
    path: 'truepath',
    implemented: true,
    costs: {
      Money: taucetiCost(188_000_000, 1.25),
      Iridium: taucetiCost(5_550_000, 1.25),
      Stanene: taucetiCost(7_003_500, 1.25),
      Sheet_Metal: taucetiCost(95_000, 1.25),
    },
    effect: '每座发电 32 MW；通常消耗氦-3。',
    powerCost: -32,
    generatorFuel: (state) => {
      if (state.tech['isolation'] && state.race['lone_survivor']) return undefined;
      return {
        resource: 'Helium_3',
        amountPerTick: state.tech['isolation'] ? 75 : 500,
      };
    },
  },
  {
    id: 'tau_farm',
    region: 'tau_home',
    name: 'Tau 家园农场',
    description: '利用 Tau 家园环境生产食物、木材与水，并扩展家园支援网络。',
    reqs: { tau_home: 7 },
    path: 'truepath',
    implemented: true,
    costs: {
      Money: taucetiCost(135_000_000, 1.25),
      Stone: taucetiCost(9_210_000, 1.25),
      Steel: taucetiCost(6_295_000, 1.25),
      Water: taucetiCost(10_000, 1.25),
    },
    effect: '通电后提供 1 点 Tau 家园支援，并生产食物与木材；隔离路线还会生产水。',
    powerCost: 4,
    support: { pool: 'home', amount: 1 },
  },
  {
    id: 'tau_factory',
    region: 'tau_home',
    name: 'Tau 家园工厂',
    description: '将 Tau 家园的供电与支援转化为城市工业产线和自动合成能力。',
    reqs: { tau_home: 8 },
    path: 'truepath',
    implemented: true,
    costs: {
      Money: taucetiCost(269_000_000, 1.25),
      Titanium: taucetiCost(3_000_000, 1.25),
      Elerium: taucetiCost(850, 1.25),
      Bolognium: taucetiCost(250_000, 1.25),
      Quantium: recycledTaucetiCost(425_000, 1.25),
    },
    effect: '消耗 1 点 Tau 家园支援；有效时提供工业产线并强化自动工匠合成。',
    powerCost: 5,
    support: { pool: 'home', amount: -1 },
  },
  {
    id: 'tau_home_base',
    region: 'tau_home',
    name: '前哨基地',
    description: '在 Tauceti 系统建立前哨基地。',
    reqs: { tau_home: 1 },
    costs: {
      Money: taucetiCost(5000000, 1.2),
      Adamantite: taucetiCost(500000, 1.2),
      Stanene: taucetiCost(300000, 1.2),
    },
    effect: '每座需要 30MW 电力；提供 Tauceti 家园支援。',
    powerCost: 30,
    support: { pool: 'home', amount: 3 },
  },
  {
    id: 'tau_housing',
    region: 'tau_home',
    name: '殖民住房',
    description: '建造殖民住房容纳移民。',
    reqs: { tau_home: 2 },
    costs: {
      Money: taucetiCost(3000000, 1.18),
      Bolognium: taucetiCost(200000, 1.18),
      Orichalcum: taucetiCost(100000, 1.18),
    },
    effect: '提供人口容量。',
  },
  {
    id: 'tau_laboratory',
    region: 'tau_home',
    name: '研究实验室',
    description: '建造研究实验室推进科学。',
    reqs: { tau_home: 3 },
    costs: {
      Money: taucetiCost(6000000, 1.18),
      Vitreloy: taucetiCost(200000, 1.18),
      Orichalcum: taucetiCost(150000, 1.18),
    },
    effect: '提供知识加成。',
  },
  {
    id: 'infectious_disease_lab',
    region: 'tau_home',
    name: '传染病实验室',
    description: '建造传染病实验室研究疾病。',
    reqs: { disease: 1 },
    path: 'truepath',
    implemented: true,
    costs: {
      Money: taucetiCost(1_000_000_000, 1.25),
      Alloy: taucetiCost(32_500_000, 1.25),
      Polymer: taucetiCost(50_000_000, 1.25),
      Bolognium: taucetiCost(2_500_000, 1.25),
      Unobtainium: taucetiCost(64_000, 1.25),
    },
    effect: '每座获得支援且通电的实验室提供 5 点基因测序速率，并限制 Quantium 产能。',
    powerCost: 35,
    support: { pool: 'home', amount: -1 },
  },
  {
    id: 'tau_pylon',
    region: 'tau_home',
    name: '尖塔',
    description: '建造魔法尖塔（仅魔法宇宙）。',
    reqs: { tau_home: 5 },
    condition: (state) => state.race.universe === 'magic',
    costs: {
      Mana: taucetiCost(5000, 1.15),
      Knowledge: taucetiCost(5000000, 1.15),
      Crystal: taucetiCost(100000, 1.15),
    },
    effect: '提供魔法加成。',
  },

  // ===== tau_red — 红色行星区域 =====
  {
    id: 'orbital_platform',
    region: 'tau_red',
    name: '红星轨道平台',
    description: '维持红色行星的轨道补给与 Womling 支援网络。',
    reqs: { tau_red: 1, tauceti: 4 },
    path: 'truepath',
    implemented: true,
    costs: {
      Money: taucetiCost(50_000_000, 1.3),
      Oil: taucetiCost(275_000, 1.3),
      Aluminium: taucetiCost(1_780_000, 1.3),
      Bolognium: taucetiCost(450_000, 1.3),
    },
    effect: '每座有效平台提供至少 2 点红星支援。',
    powerCost: 18,
    support: { pool: 'red', amount: 2 },
    supportFuel: (state) => ({
      resource: state.race['lone_survivor'] ? 'Helium_3' : 'Oil',
      amountPerTick: state.tech['isolation'] ? (state.race['lone_survivor'] ? 8 : 32) : 125,
    }),
  },
  {
    id: 'overseer',
    region: 'tau_red',
    name: 'Womling 监督者',
    description: '提高 Womling 的忠诚、士气与整体劳动效率。',
    reqs: { tau_red: 5 },
    path: 'truepath',
    implemented: true,
    costs: {
      Money: taucetiCost(6_000_000, 1.28),
      Cement: taucetiCost(2_450_000, 1.28),
      Alloy: conditionalTaucetiCost((state) => Boolean(state.race['womling_friend']), 1_850_000, 1.28),
      Neutronium: conditionalTaucetiCost((state) => Boolean(state.race['womling_lord']), 165_000, 1.28),
      Titanium: conditionalTaucetiCost((state) => Boolean(state.race['womling_god']), 2_250_000, 1.28),
    },
    effect: '每座消耗 1 点红星支援并提高 Womling 生产率。',
    support: { pool: 'red', amount: -1 },
  },
  {
    id: 'womling_village',
    region: 'tau_red',
    name: 'Womling 村庄',
    description: '为 Womling 提供住所和人口容量。',
    reqs: { tau_red: 5 },
    path: 'truepath',
    implemented: true,
    costs: {
      Money: taucetiCost(10_000_000, 1.28),
      Stone: taucetiCost(2_250_000, 1.28),
      Plywood: taucetiCost(1_250_000, 1.28),
      Wrought_Iron: taucetiCost(400_000, 1.28),
    },
    effect: '每座有效村庄容纳 5 名 Womling。',
    support: { pool: 'red', amount: -1 },
  },
  {
    id: 'womling_farm',
    region: 'tau_red',
    name: 'Womling 农场',
    description: '为村庄提供粮食并自动安排农夫。',
    reqs: { tau_red: 5 },
    path: 'truepath',
    implemented: true,
    costs: {
      Money: taucetiCost(24_000_000, 1.28),
      Iron: taucetiCost(9_500_000, 1.28),
      Water: taucetiCost(5_000, 1.28),
    },
    effect: '每座有效农场安排最多 2 名农夫并供养 Womling。',
    support: { pool: 'red', amount: -1 },
  },
  {
    id: 'womling_mine',
    region: 'tau_red',
    name: 'Womling 矿场',
    description: '自动安排可用 Womling 开采不可得矿。',
    reqs: { tau_red: 5 },
    path: 'truepath',
    implemented: true,
    costs: {
      Money: taucetiCost(12_500_000, 1.28),
      Lumber: taucetiCost(12_800_000, 1.28),
      Steel: taucetiCost(4_500_000, 1.28),
    },
    effect: '每座有效矿场安排最多 6 名矿工并生产不可得矿。',
    support: { pool: 'red', amount: -1 },
  },

  // ===== tau_roid — 小行星带区域 =====
  {
    id: 'tau_roid_miner',
    region: 'tau_roid',
    name: '小行星矿工',
    description: '部署小行星矿工。',
    reqs: { tau_roid: 1 },
    costs: {
      Money: taucetiCost(3000000, 1.18),
      Stanene: taucetiCost(200000, 1.18),
      Graphene: taucetiCost(100000, 1.18),
    },
    effect: '提供小行星采矿能力。',
  },
  {
    id: 'tau_roid_station',
    region: 'tau_roid',
    name: '小行星站',
    description: '建造小行星站。',
    reqs: { tau_roid: 2 },
    costs: {
      Money: taucetiCost(5000000, 1.2),
      Adamantite: taucetiCost(300000, 1.2),
      Stanene: taucetiCost(200000, 1.2),
    },
    effect: '提供小行星带支援。',
  },

  // ===== tau_gas — 气态巨行星区域 =====
  {
    id: 'tau_gas_mining',
    region: 'tau_gas',
    name: '气体采集站',
    description: '建造气体采集站。',
    reqs: { tau_gas: 1 },
    costs: {
      Money: taucetiCost(4000000, 1.18),
      Stanene: taucetiCost(250000, 1.18),
      Graphene: taucetiCost(150000, 1.18),
    },
    effect: '提供气体采集能力。',
  },
  {
    id: 'tau_gas_storage',
    region: 'tau_gas',
    name: '气体储存站',
    description: '建造气体储存站。',
    reqs: { tau_gas: 2 },
    costs: {
      Money: taucetiCost(3000000, 1.18),
      Stanene: taucetiCost(200000, 1.18),
      Graphene: taucetiCost(100000, 1.18),
    },
    effect: '提供气体存储能力。',
  },

  // ===== tau_star — 恒星区域 =====
  {
    id: 'tau_star_collector',
    region: 'tau_star',
    name: '恒星收集器',
    description: '建造恒星收集器。',
    reqs: { tau_star: 1 },
    costs: {
      Money: taucetiCost(8000000, 1.2),
      Orichalcum: taucetiCost(200000, 1.2),
      Vitreloy: taucetiCost(150000, 1.2),
    },
    effect: '每座需要 50MW 电力；提供恒星能量。',
    powerCost: 50,
  },
  {
    id: 'tau_goe_facility',
    region: 'tau_star',
    name: '伊甸园设施',
    description: '建造伊甸园设施。',
    reqs: { eden: 2 },
    costs: {
      Money: taucetiCost(10000000, 1.2),
      Omniscience: taucetiCost(20000, 1.2),
      Elysanite: taucetiCost(50000000, 1.2),
    },
    effect: '解锁伊甸园系统。',
  },
];

// Tauceti 区域解锁条件
export const TAUCETI_REGION_REQS: Record<TaucetiRegion, Record<string, number>> = {
  tau_home: { tau_home: 1 },
  tau_red: { tau_red: 1 },
  tau_roid: { tau_roid: 1 },
  tau_gas: { tau_gas: 1 },
  tau_star: { tau_star: 1 },
};

export function isTaucetiRegionUnlocked(state: GameState, region: TaucetiRegion): boolean {
  const reqs = TAUCETI_REGION_REQS[region];
  if (!reqs) return false;

  for (const [key, level] of Object.entries(reqs)) {
    if ((state.tech[key] ?? 0) < level) return false;
  }

  return true;
}

export function getTaucetiStructuresForRegion(region: string): TaucetiStructureDefinition[] {
  return TAUCETI_STRUCTURES.filter((s) => s.region === region);
}

export function getImplementedTaucetiStructuresForRegion(region: string): TaucetiStructureDefinition[] {
  return TAUCETI_STRUCTURES.filter((structure) => structure.region === region && structure.implemented);
}

function canAfford(state: GameState, costs: Record<string, number>): boolean {
  return Object.entries(costs).every(
    ([resource, amount]) => (state.resource[resource]?.amount ?? 0) >= amount,
  );
}

function payCosts(state: GameState, costs: Record<string, number>): void {
  for (const [resource, amount] of Object.entries(costs)) {
    state.resource[resource].amount -= amount;
  }
}

export function isTaucetiMissionAvailable(state: GameState, missionId: TaucetiMissionDefinition['id']): boolean {
  const mission = TAUCETI_MISSIONS.find((candidate) => candidate.id === missionId);
  if (!mission || !state.race['truepath']) return false;
  if (missionId === 'home_mission' && (state.tech['tau_home'] ?? 0) >= 1) return false;
  if (missionId === 'dismantle' && (state.tech['tau_home'] ?? 0) >= 2) return false;
  if (missionId === 'excavate' && (state.tech['tau_home'] ?? 0) >= 3) return false;
  if (missionId === 'red_mission' && (state.tech['tau_red'] ?? 0) >= 1) return false;
  return Object.entries(mission.reqs).every(([tech, level]) => (state.tech[tech] ?? 0) >= level);
}

export function canRunTaucetiMission(state: GameState, missionId: TaucetiMissionDefinition['id']): boolean {
  const mission = TAUCETI_MISSIONS.find((candidate) => candidate.id === missionId);
  if (!mission || !isTaucetiMissionAvailable(state, missionId) || !canAfford(state, mission.costs)) return false;
  return missionId !== 'dismantle' || Boolean(getTauExplorerForDismantle(state));
}

export function runTaucetiMission(state: GameState, missionId: TaucetiMissionDefinition['id']): boolean {
  const mission = TAUCETI_MISSIONS.find((candidate) => candidate.id === missionId);
  if (!mission || !canRunTaucetiMission(state, missionId)) return false;
  payCosts(state, mission.costs);
  if (missionId === 'home_mission') {
    state.tech['tau_home'] = 1;
    state.tauceti['colony'] ??= { count: 0, on: 0 };
    state.tauceti['mining_pit'] ??= { count: 0, on: 0 };
  } else if (missionId === 'dismantle') {
    if (!dismantleTauExplorer(state)) return false;
    state.tech['tau_home'] = 2;

    const orbital = state.tauceti['orbital_station'] ??= { count: 0, on: 0, support: 0, s_max: 0 };
    const colony = state.tauceti['colony'] ??= { count: 0, on: 0 };
    const miningPit = state.tauceti['mining_pit'] ??= { count: 0, on: 0 };
    orbital.count += 1;
    colony.count += 1;
    miningPit.count += 1;

    const orbitalPower = getTaucetiPowerCost(state, 'orbital_station');
    const availablePower = state.city.power?.surplus ?? 0;
    if (availablePower >= orbitalPower) {
      orbital.on = (orbital.on ?? 0) + 1;
      colony.on = (colony.on ?? 0) + 1;
      miningPit.on = (miningPit.on ?? 0) + 1;
      const activeConsumers = { ...(state.city.power?.activeConsumers ?? {}) };
      activeConsumers['orbital_station'] = (activeConsumers['orbital_station'] ?? 0) + 1;
      hireAvailablePitMiners(state, getPitMinerCapacity(state, activeConsumers));
    }
    (state.civic['pit_miner'] as JobState).display = true;
    state.resource['Materials'].display = true;
  } else if (missionId === 'excavate') {
    state.tech['tau_home'] = 3;
  } else if (missionId === 'red_mission') {
    state.tech['tau_red'] = 1;
    state.tauceti['settlement'] ??= { count: 0, on: 0 };
  }
  return true;
}

export function getWomlingRelation(state: GameState): WomlingRelation | undefined {
  if (state.race['womling_friend']) return 'friend';
  if (state.race['womling_god']) return 'god';
  if (state.race['womling_lord']) return 'lord';
  return undefined;
}

export function isWomlingRelationAvailable(state: GameState): boolean {
  return Boolean(state.race['truepath'])
    && (state.tech['tau_red'] ?? 0) === 4
    && getWomlingRelation(state) === undefined;
}

export function getWomlingRelationCost(
  state: GameState,
  relation: WomlingRelation,
): Record<string, number> | null {
  const definition = WOMLING_RELATIONS.find((candidate) => candidate.id === relation);
  if (!definition || !isWomlingRelationAvailable(state)) return null;
  if (relation === 'friend' && state.race['lone_survivor'] && state.race['artifical']) {
    return { ...definition.costs, Food: 62_000 };
  }
  return { ...definition.costs };
}

export function canChooseWomlingRelation(state: GameState, relation: WomlingRelation): boolean {
  const costs = getWomlingRelationCost(state, relation);
  return Boolean(costs && canAfford(state, costs));
}

export function chooseWomlingRelation(state: GameState, relation: WomlingRelation): boolean {
  const costs = getWomlingRelationCost(state, relation);
  if (!costs || !canAfford(state, costs)) return false;
  payCosts(state, costs);

  delete state.race['womling_friend'];
  delete state.race['womling_god'];
  delete state.race['womling_lord'];
  state.race[`womling_${relation}`] = 1;
  state.tech['tau_red'] = 5;

  state.tauceti['overseer'] ??= {
    count: 0,
    on: 0,
    pop: 0,
    working: 0,
    injured: 0,
    morale: 0,
    loyal: 0,
    prod: 0,
  };
  state.tauceti['womling_village'] ??= { count: 1, on: 1 };
  state.tauceti['womling_farm'] ??= { count: 1, on: 1, farmers: 0 };
  state.tauceti['womling_mine'] ??= { count: 0, on: 0, miners: 0 };
  if (state.race['lone_survivor']) {
    state.tauceti['womling_village'].count = Math.max(2, state.tauceti['womling_village'].count);
    state.tauceti['womling_village'].on = Math.max(2, state.tauceti['womling_village'].on ?? 0);
    state.tauceti['womling_mine'].count = Math.max(1, state.tauceti['womling_mine'].count);
    state.tauceti['womling_mine'].on = Math.max(1, state.tauceti['womling_mine'].on ?? 0);
    state.resource['Unobtainium'].display = true;
  }
  return true;
}

export function isTaucetiStructureVisible(state: GameState, structure: TaucetiStructureDefinition): boolean {
  if (!structure.implemented) return false;
  if (structure.path === 'truepath' && !state.race['truepath']) return false;
  if (structure.condition && !structure.condition(state)) return false;
  if (structure.notTrait?.some((trait) => state.race[trait])) return false;
  return Object.entries(structure.reqs).every(([tech, level]) => (state.tech[tech] ?? 0) >= level);
}

export function getTaucetiPowerCost(state: GameState, structureId: string): number {
  if (structureId === 'orbital_station') {
    return state.tech['isolation'] ? (state.race['lone_survivor'] ? 4 : 6) : 30;
  }
  if (structureId === 'infectious_disease_lab') {
    return state.tech['isolation'] ? (state.race['lone_survivor'] ? 2 : 8) : 35;
  }
  if (structureId === 'orbital_platform') {
    return state.tech['isolation'] ? (state.race['lone_survivor'] ? 2 : 3) : 18;
  }
  if (structureId === 'alien_outpost') {
    return state.tech['isolation'] ? (state.race['lone_survivor'] ? 8 : 25) : 100;
  }
  if (structureId === 'tau_farm') {
    return state.tech['isolation'] ? 1 : 4;
  }
  if (structureId === 'tau_factory') {
    return state.tech['isolation'] ? 2 : 5;
  }
  return TAUCETI_STRUCTURES.find((structure) => structure.id === structureId)?.powerCost ?? 0;
}

export function getTaucetiSupportFuel(
  state: GameState,
  structure: TaucetiStructureDefinition,
): { resource: string; amountPerTick: number } | undefined {
  return typeof structure.supportFuel === 'function' ? structure.supportFuel(state) : structure.supportFuel;
}

export function getTaucetiGeneratorFuel(
  state: GameState,
  structure: TaucetiStructureDefinition,
): { resource: string; amountPerTick: number } | undefined {
  return typeof structure.generatorFuel === 'function' ? structure.generatorFuel(state) : structure.generatorFuel;
}

export function getTaucetiBuildCost(state: GameState, structureId: string): Record<string, number> | null {
  const structure = TAUCETI_STRUCTURES.find((candidate) => candidate.id === structureId);
  if (!structure || structure.buildable === false || !isTaucetiStructureVisible(state, structure)) return null;
  const count = state.tauceti[structureId]?.count ?? 0;
  if (structure.segmentCap !== undefined && count >= structure.segmentCap) return null;
  return Object.fromEntries(
    Object.entries(structure.costs)
      .map(([resource, calculate]) => [resource, calculate(state, count)] as const)
      .filter(([, amount]) => amount > 0),
  );
}

export function canBuildTaucetiStructure(state: GameState, structureId: string): boolean {
  const cost = getTaucetiBuildCost(state, structureId);
  return Boolean(cost) && Object.entries(cost!).every(
    ([resource, amount]) => (state.resource[resource]?.amount ?? 0) >= amount,
  );
}

export function buildTaucetiStructure(state: GameState, structureId: string): boolean {
  if (!canBuildTaucetiStructure(state, structureId)) return false;
  const cost = getTaucetiBuildCost(state, structureId)!;
  for (const [resource, amount] of Object.entries(cost)) {
    state.resource[resource].amount -= amount;
  }

  const previousRepositoryContainerCapacity = structureId === 'repository'
    ? getTaucetiRepositoryContainerCapacityBonus(state)
    : 0;
  const structure = state.tauceti[structureId] ??= { count: 0, on: 0 };
  structure.count += 1;
  if (TAUCETI_STRUCTURES.find((candidate) => candidate.id === structureId)?.tracksOn !== false) {
    structure.on = (structure.on ?? 0) + 1;
  } else {
    delete structure.on;
  }
  if (structureId === 'orbital_station') {
    structure.support ??= 0;
    structure.s_max ??= 0;
  }
  if (structureId === 'infectious_disease_lab') {
    (structure as typeof structure & { cure?: number }).cure ??= 0;
    if (state.tech['disease'] === 1) state.tech['disease'] = 2;
  }
  if (structureId === 'orbital_platform' && state.tech['tau_red'] === 1) {
    state.tech['tau_red'] = 2;
  }
  if (structureId === 'overseer') {
    Object.assign(structure, {
      pop: Number(structure.pop ?? 0),
      working: Number(structure.working ?? 0),
      injured: Number(structure.injured ?? 0),
      morale: Number(structure.morale ?? 0),
      loyal: Number(structure.loyal ?? 0),
      prod: Number(structure.prod ?? 0),
    });
  }
  if (structureId === 'womling_farm') structure.farmers ??= 0;
  if (structureId === 'womling_mine') {
    structure.miners ??= 0;
    state.resource['Unobtainium'].display = true;
  }
  if (structureId === 'mining_pit') {
    hireAvailablePitMiners(state, getPitMinerCapacity(state, state.city.power?.activeConsumers ?? {}));
  }
  if (structureId === 'colony') {
    state.resource['Crates'].display = true;
    state.resource['Containers'].display = true;
    state.settings.showStorage = true;
  }
  if (structureId === 'repository') {
    for (const resourceId of getTaucetiRepositoryResources(state)) {
      const added = getTaucetiRepositoryStorageBonus(state, resourceId, 1);
      if (added > 0) state.resource[resourceId].max = Math.max(0, state.resource[resourceId].max) + added;
    }
    const addedContainerCapacity = getTaucetiRepositoryContainerCapacityBonus(state)
      - previousRepositoryContainerCapacity;
    if (addedContainerCapacity > 0) {
      state.resource['Crates'].max += addedContainerCapacity;
      state.resource['Containers'].max += addedContainerCapacity;
    }
    state.resource['Containers'].display = true;
    state.settings.showStorage = true;
  }
  if (structureId === 'tau_factory') {
    const factory = state.city.factory as FactoryState;
    factory.Alloy += getTaucetiFactoryLinesPerBuilding(state);
    (state.civic.craftsman as JobState).display = true;
    state.settings.showIndustry = true;
  }
  if (structureId === 'jump_gate') checkTaucetiJumpGateCompletion(state);
  return true;
}

export interface TaucetiSupportResult {
  supportOn: Record<string, number>;
  fuelDrain: Record<string, number>;
  supplierEffectiveOn: Record<string, number>;
  capacity: number;
  used: number;
  homeCapacity: number;
  homeUsed: number;
  redCapacity: number;
  redUsed: number;
}

function configuredOn(state: GameState, structureId: string): number {
  const structure = state.tauceti[structureId];
  return Math.max(0, structure?.on ?? structure?.count ?? 0);
}

function raceRank(state: GameState, traitId: string): number {
  const value = state.race[traitId];
  return typeof value === 'number' && value > 0 ? value : value ? 1 : 0;
}

function jobScaleValue(state: GameState, value: number): number {
  const rank = raceRank(state, 'high_pop');
  return rank ? value * getTraitVar('high_pop', 0, rank) : value;
}

export function getTaucetiColonyCitizens(state: GameState): number {
  if (state.race['lone_survivor']) return 0;
  return jobScaleValue(state, state.tech['isolation'] ? 8 : 5);
}

export function getPitMinerCapacity(
  state: GameState,
  activeConsumers: Record<string, number> = state.city.power?.activeConsumers ?? {},
): number {
  const supported = resolveTaucetiSupport(state, activeConsumers).supportOn['mining_pit'] ?? 0;
  return jobScaleValue(state, supported * (state.tech['isolation'] ? 6 : 8));
}

export function getTaucetiFactoryLinesPerBuilding(state: GameState): number {
  return state.tech['isolation'] ? 5 : 3;
}

export function getTaucetiFactoryConfiguredLines(state: GameState): number {
  return configuredOn(state, 'tau_factory') * getTaucetiFactoryLinesPerBuilding(state);
}

export function getTaucetiFactorySupportedLines(
  state: GameState,
  supportOn: Record<string, number> = resolveTaucetiSupport(
    state,
    state.city.power?.activeConsumers ?? {},
  ).supportOn,
): number {
  return Math.max(0, supportOn['tau_factory'] ?? 0) * getTaucetiFactoryLinesPerBuilding(state);
}

export function getTaucetiFactoryCraftsmanCapacity(
  state: GameState,
  supportOn?: Record<string, number>,
): number {
  if (!state.tech['isolation']) return 0;
  const supported = supportOn?.['tau_factory']
    ?? resolveTaucetiSupport(state, state.city.power?.activeConsumers ?? {}).supportOn['tau_factory']
    ?? 0;
  return jobScaleValue(state, Math.max(0, supported) * 5);
}

export function getTaucetiFactoryCementWorkerCapacity(
  state: GameState,
  supportOn?: Record<string, number>,
): number {
  if (!state.tech['isolation']) return 0;
  const supported = supportOn?.['tau_factory']
    ?? resolveTaucetiSupport(state, state.city.power?.activeConsumers ?? {}).supportOn['tau_factory']
    ?? 0;
  return jobScaleValue(state, Math.max(0, supported) * 2);
}

function hireAvailablePitMiners(state: GameState, capacity: number): void {
  const job = state.civic['pit_miner'] as JobState | undefined;
  const unemployed = state.civic[state.civic.d_job] as JobState | undefined;
  if (!job || !unemployed) return;
  job.max = capacity;
  const open = Math.max(0, capacity - job.workers);
  const hired = Math.min(open, Math.max(0, unemployed.workers));
  unemployed.workers -= hired;
  job.workers += hired;
}

/** 对标 legacy main.js 的 tau_home 支援池，消费者按原版声明顺序分配。 */
export function resolveTaucetiSupport(
  state: GameState,
  activeConsumers: Record<string, number> = {},
): TaucetiSupportResult {
  const result: TaucetiSupportResult = {
    supportOn: {},
    fuelDrain: {},
    supplierEffectiveOn: {},
    capacity: 0,
    used: 0,
    homeCapacity: 0,
    homeUsed: 0,
    redCapacity: 0,
    redUsed: 0,
  };
  const remainingFuel = Object.fromEntries(
    Object.entries(state.resource).map(([resource, value]) => [resource, Math.max(0, value.amount)]),
  );
  const resolveSupplier = (structureId: 'orbital_station' | 'orbital_platform'): number => {
    const definition = TAUCETI_STRUCTURES.find((structure) => structure.id === structureId)!;
    const powered = Math.max(0, activeConsumers[structureId] ?? 0);
    const fuel = getTaucetiSupportFuel(state, definition);
    let effective = powered;
    if (fuel && powered > 0) {
      const perStructure = fuel.amountPerTick * 0.25;
      const available = remainingFuel[fuel.resource] ?? 0;
      effective = perStructure > 0 ? Math.min(powered, Math.floor(available / perStructure)) : powered;
      if (effective > 0) {
        result.fuelDrain[fuel.resource] = (result.fuelDrain[fuel.resource] ?? 0)
          + effective * fuel.amountPerTick;
        remainingFuel[fuel.resource] = available - effective * perStructure;
      }
    }
    result.supplierEffectiveOn[structureId] = effective;
    return effective;
  };

  const effectiveStations = resolveSupplier('orbital_station');
  const effectiveFarms = Math.max(0, activeConsumers['tau_farm'] ?? 0);
  result.homeCapacity = effectiveStations * 3 + effectiveFarms;
  result.capacity = result.homeCapacity;

  let remaining = result.homeCapacity;
  const consumers = [
    { id: 'colony', supportCost: 2, powered: false },
    { id: 'mining_pit', supportCost: 1, powered: false },
    { id: 'tau_factory', supportCost: 1, powered: true },
    { id: 'infectious_disease_lab', supportCost: 1, powered: true },
  ];
  for (const consumer of consumers) {
    const requested = consumer.powered
      ? Math.max(0, activeConsumers[consumer.id] ?? 0)
      : configuredOn(state, consumer.id);
    let supported = Math.min(requested, Math.floor(remaining / consumer.supportCost));
    if (consumer.id === 'colony' && supported > 0) {
      const definition = TAUCETI_STRUCTURES.find((structure) => structure.id === 'colony')!;
      const fuel = getTaucetiSupportFuel(state, definition);
      if (fuel) {
        const perStructure = fuel.amountPerTick * 0.25;
        if (perStructure > 0) {
          const available = remainingFuel[fuel.resource] ?? 0;
          supported = Math.min(supported, Math.floor(available / perStructure));
          remainingFuel[fuel.resource] = available - supported * perStructure;
        }
        if (supported > 0) {
          result.fuelDrain[fuel.resource] = (result.fuelDrain[fuel.resource] ?? 0)
            + supported * fuel.amountPerTick;
        }
      }
    }
    result.supportOn[consumer.id] = supported;
    remaining -= supported * consumer.supportCost;
    result.homeUsed += supported * consumer.supportCost;
  }
  result.used = result.homeUsed;

  const orbital = state.tauceti['orbital_station'];
  if (orbital) {
    orbital.s_max = result.homeCapacity;
    orbital.support = result.homeUsed;
  }

  const effectivePlatforms = resolveSupplier('orbital_platform');
  let supportPerPlatform = state.tech['womling_logistics'] ? 2.5 : 2;
  if (state.race['lone_survivor']) supportPerPlatform *= 2;
  result.redCapacity = effectivePlatforms * supportPerPlatform;
  let redRemaining = result.redCapacity;
  for (const id of ['overseer', 'womling_village', 'womling_farm', 'womling_mine']) {
    const requested = configuredOn(state, id);
    const supported = Math.min(requested, Math.floor(redRemaining));
    result.supportOn[id] = supported;
    redRemaining -= supported;
    result.redUsed += supported;
  }

  const platform = state.tauceti['orbital_platform'];
  if (platform) {
    platform.s_max = result.redCapacity;
    platform.support = result.redUsed;
  }
  return result;
}

export interface TaucetiHomeProductionModifier {
  label: string;
  multiplier: number;
}

export interface TaucetiHomeProductionLine {
  resource: string;
  miners: number;
  ratePerMiner: number;
  baseOutput: number;
  modifiers: TaucetiHomeProductionModifier[];
  output: number;
}

export interface TaucetiHomeTickOptions {
  supportedOn?: Record<string, number>;
  productionModifiers?: TaucetiHomeProductionModifier[];
  hungerMultiplier?: number;
}

export interface TaucetiAlienOutpostProductionLine {
  resource: 'Cipher';
  baseOutput: number;
  modifiers: TaucetiHomeProductionModifier[];
  output: number;
}

export interface TaucetiFarmProductionLine {
  resource: 'Food' | 'Lumber' | 'Water';
  active: number;
  ratePerFarm: number;
  baseOutput: number;
  modifiers: TaucetiHomeProductionModifier[];
  output: number;
}

export function taucetiFarmTick(
  state: GameState,
  timeMul: number,
  deltas: Record<string, number>,
  productionModifiers: TaucetiHomeProductionModifier[] = [],
  supportedOn: Record<string, number> = {},
  activeConsumers: Record<string, number> = state.city.power?.activeConsumers ?? {},
): TaucetiFarmProductionLine[] {
  const active = Math.max(0, activeConsumers['tau_farm'] ?? 0);
  if (active <= 0) return [];
  const rates: Partial<Record<TaucetiFarmProductionLine['resource'], number>> = {
    Food: state.tech['isolation'] ? 15 : 9,
  };
  if (!state.race['kindling_kindred'] && !state.race['smoldering']) {
    rates.Lumber = state.tech['isolation'] ? 12 : 5.5;
  }
  if (state.tech['isolation']) rates.Water = 0.35;
  const colonyMultiplier = 1 + Math.max(0, supportedOn['colony'] ?? 0) * 0.5;
  const lines: TaucetiFarmProductionLine[] = [];
  for (const [resource, ratePerFarm] of Object.entries(rates) as [TaucetiFarmProductionLine['resource'], number][]) {
    const baseOutput = active * ratePerFarm * timeMul;
    const modifiers: TaucetiHomeProductionModifier[] = [
      { label: '灵能生产增益', multiplier: getPsychicProductionMultiplier(state, resource) },
      ...productionModifiers,
      { label: 'Tau 殖民地', multiplier: colonyMultiplier },
    ];
    let output = baseOutput;
    for (const modifier of modifiers) output *= modifier.multiplier;
    deltas[resource] = (deltas[resource] ?? 0) + output;
    lines.push({ resource, active, ratePerFarm, baseOutput, modifiers, output });
  }
  return lines;
}

export function getTaucetiAlienOutpostKnowledgeBonus(
  state: GameState,
  currentKnowledgeMax: number,
  activeConsumers: Record<string, number> = state.city.power?.activeConsumers ?? {},
): number {
  if ((activeConsumers['alien_outpost'] ?? 0) <= 0) return 0;
  const isolationBonus = state.tech['isolation']
    ? (state.race['lone_survivor'] ? 3_500_000 : 6_500_000)
    : 0;
  return isolationBonus + Math.round((currentKnowledgeMax + isolationBonus) * 0.2);
}

export function getTaucetiAlienOutpostProfessorCapacity(state: GameState): number {
  if (!state.race['lone_survivor']) return 0;
  return jobScaleValue(state, state.tauceti['alien_outpost']?.count ?? 0);
}

export function taucetiAlienOutpostTick(
  state: GameState,
  timeMul: number,
  deltas: Record<string, number>,
  productionModifiers: TaucetiHomeProductionModifier[] = [],
  supportedOn: Record<string, number> = {},
): TaucetiAlienOutpostProductionLine | null {
  const active = state.city.power?.activeConsumers?.['alien_outpost'] ?? 0;
  if (!state.tech['isolation'] || active <= 0) return null;

  const baseOutput = 0.01 * timeMul;
  const modifiers = [
    ...productionModifiers,
    { label: 'Tau 殖民地', multiplier: 1 + Math.max(0, supportedOn['colony'] ?? 0) * 0.5 },
  ];
  let output = baseOutput;
  for (const modifier of modifiers) output *= modifier.multiplier;
  deltas['Cipher'] = (deltas['Cipher'] ?? 0) + output;
  return { resource: 'Cipher', baseOutput, modifiers, output };
}

function shrineMetalMultiplier(state: GameState): number {
  if (!state.race['magnificent']) return 1;
  const shrine = state.city['shrine'] as { count?: number; metal?: number; cycle?: number } | undefined;
  if (!shrine?.count) return 1;
  let metal = getShrineBonus(state, 'metal');
  const moon = state.city.calendar?.moon ?? 0;
  if ((moon >= 7 && moon <= 14) && shrine.cycle) metal += shrine.cycle;
  return 1 + metal / 100 * getTraitVar('magnificent', 3, raceRank(state, 'magnificent'));
}

function pitMinerRacialMultiplier(state: GameState, workers: number): number {
  let multiplier = 1;
  if (state.race['rejuvenated']) multiplier *= 1.1;
  if (state.race['powered']) {
    multiplier *= 1 + getTraitVar('powered', 1, raceRank(state, 'powered')) / 100;
  }
  if (!state.race['lone_survivor']) multiplier *= getHivemindMultiplier(state, workers);
  multiplier *= getMinerPlanetMultiplier(state);
  multiplier *= getWeakWorkerMultiplier(state);
  return multiplier;
}

export function taucetiHomeTick(
  state: GameState,
  timeMul: number,
  deltas: Record<string, number>,
  options: TaucetiHomeTickOptions = {},
): TaucetiHomeProductionLine[] {
  const capacity = jobScaleValue(
    state,
    Math.max(0, options.supportedOn?.['mining_pit'] ?? 0) * (state.tech['isolation'] ? 6 : 8),
  );
  const pitMiner = state.civic['pit_miner'] as JobState | undefined;
  const assigned = Math.min(capacity, Math.max(0, pitMiner?.workers ?? 0));
  const miners = assigned * (state.race['lone_survivor'] ? 45 : 1);
  if (miners <= 0) return [];

  const tauEnabled = (state.tech['tauceti'] ?? 0) >= 4;
  const rates: Record<string, number> = tauEnabled
    ? {
        Bolognium: state.tech['isolation'] ? 0.0288 : 0.0216,
        Stone: state.tech['isolation'] ? 0.8 : 0.6,
        Adamantite: state.tech['isolation'] ? 0.448 : 0.336,
      }
    : { Materials: state.tech['isolation'] ? 0.12 : 0.09 };
  if (tauEnabled && state.race['smoldering']) rates.Chrysotile = 1.44;
  if (tauEnabled && state.tech['isolation']) {
    rates.Copper = 0.58;
    rates.Coal = 0.13;
    if (state.race['lone_survivor']) {
      rates.Iron = 0.74;
      rates.Aluminium = 0.88;
    }
  }

  const colonyMultiplier = 1 + Math.max(0, options.supportedOn?.['colony'] ?? 0) * 0.5;
  const metalMultiplier = shrineMetalMultiplier(state);
  const metalResources = new Set(['Adamantite', 'Copper', 'Iron', 'Aluminium']);
  const lines: TaucetiHomeProductionLine[] = [];
  for (const [resource, ratePerMiner] of Object.entries(rates)) {
    const baseOutput = miners * ratePerMiner * timeMul;
    const modifiers: TaucetiHomeProductionModifier[] = [
      { label: '强韧特质', multiplier: getToughMiningMultiplier(state) },
      { label: '矿工种族特质', multiplier: pitMinerRacialMultiplier(state, assigned) },
      { label: '坑道采矿科技', multiplier: state.tech['tau_pit_mining'] ? 1.18 : 1 },
      { label: '灵能生产增益', multiplier: getPsychicProductionMultiplier(state, resource) },
      ...(options.productionModifiers ?? []),
      { label: 'Tau 殖民地', multiplier: colonyMultiplier },
    ];
    if (metalResources.has(resource)) modifiers.push({ label: '神龛金属增益', multiplier: metalMultiplier });
    if (resource === 'Chrysotile' || resource === 'Iron') {
      modifiers.push({ label: '饥饿修正', multiplier: options.hungerMultiplier ?? 1 });
    }
    let output = baseOutput;
    for (const modifier of modifiers) output *= modifier.multiplier;
    deltas[resource] = (deltas[resource] ?? 0) + output;
    lines.push({ resource, miners: assigned, ratePerMiner, baseOutput, modifiers, output });
  }
  return lines;
}

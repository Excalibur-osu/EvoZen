import type { GameState } from '@evozen/shared-types';
import { applySpaceScaling } from './space';

export type TaucetiSupportPool = 'home' | 'red' | 'star';

export interface TaucetiStructureDefinition {
  id: string;
  region: string;
  name: string;
  description: string;
  reqs: Record<string, number>;
  notTrait?: string[];
  costs: Record<string, (state: GameState, count: number) => number>;
  effect: string;
  powerCost?: number;
  support?: { pool: TaucetiSupportPool; amount: number };
  supportFuel?: { resource: string; amountPerTick: number };
  condition?: (state: GameState) => boolean;
}

function taucetiCost(base: number, mult: number) {
  return (state: GameState, count: number) => {
    const scaledAmt = applySpaceScaling(state, count);
    return Math.ceil(base * Math.pow(mult, scaledAmt));
  };
}

// Tauceti 区域定义
export const TAUCETI_REGIONS = ['tau_home', 'tau_red', 'tau_roid', 'tau_gas', 'tau_star'] as const;

export type TaucetiRegion = (typeof TAUCETI_REGIONS)[number];

export const TAUCETI_STRUCTURES: TaucetiStructureDefinition[] = [
  // ===== tau_home — 主家园区域 =====
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
    id: 'tau_infectious_disease_lab',
    region: 'tau_home',
    name: '传染病实验室',
    description: '建造传染病实验室研究疾病。',
    reqs: { tau_home: 4 },
    costs: {
      Money: taucetiCost(8000000, 1.18),
      Vitreloy: taucetiCost(300000, 1.18),
      Orichalcum: taucetiCost(200000, 1.18),
    },
    effect: '提供疾病研究能力。',
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
    id: 'tau_red_base',
    region: 'tau_red',
    name: '红色基地',
    description: '在红色行星建立基地。',
    reqs: { tau_red: 1 },
    costs: {
      Money: taucetiCost(4000000, 1.2),
      Adamantite: taucetiCost(400000, 1.2),
      Stanene: taucetiCost(250000, 1.2),
    },
    effect: '每座需要 25MW 电力；提供红色行星支援。',
    powerCost: 25,
    support: { pool: 'red', amount: 2 },
  },
  {
    id: 'tau_red_mine',
    region: 'tau_red',
    name: '红色矿场',
    description: '在红色行星建造矿场。',
    reqs: { tau_red: 2 },
    costs: {
      Money: taucetiCost(3500000, 1.18),
      Stanene: taucetiCost(200000, 1.18),
      Graphene: taucetiCost(150000, 1.18),
    },
    effect: '每座消耗 1 红色行星支援；提供矿产资源。',
    support: { pool: 'red', amount: -1 },
  },
  {
    id: 'tau_red_housing',
    region: 'tau_red',
    name: '红色住房',
    description: '在红色行星建造住房。',
    reqs: { tau_red: 3 },
    costs: {
      Money: taucetiCost(3000000, 1.18),
      Bolognium: taucetiCost(150000, 1.18),
      Orichalcum: taucetiCost(80000, 1.18),
    },
    effect: '提供人口容量。',
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

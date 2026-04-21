import type { GameState } from '@evozen/shared-types';
import { applySpaceScaling } from './space';

export type InterstellarSupportPool = 'alpha';

export interface InterstellarStructureDefinition {
  id: string;
  region: string;
  name: string;
  description: string;
  reqs: Record<string, number>;
  spaceReqs?: Record<string, number>;
  notTrait?: string[];
  costs: Record<string, (state: GameState, count: number) => number>;
  effect: string;
  powerCost?: number;
  support?: { pool: InterstellarSupportPool; amount: number };
  supportFuel?: { resource: string; amountPerTick: number };
}

function interstellarCost(base: number, mult: number) {
  return (state: GameState, count: number) => {
    const scaledAmt = applySpaceScaling(state, count);
    return Math.ceil(base * Math.pow(mult, scaledAmt));
  };
}

export const INTERSTELLAR_STRUCTURES: InterstellarStructureDefinition[] = [
  {
    id: 'starport',
    region: 'int_alpha',
    name: '星港',
    description: '在半人马座 Alpha 建立前线星港，作为 interstellar 阶段的首个支援枢纽。',
    reqs: { alpha: 1 },
    costs: {
      Money: interstellarCost(1000000, 1.3),
      Aluminium: interstellarCost(400000, 1.3),
      Neutronium: interstellarCost(1000, 1.3),
      Elerium: interstellarCost(100, 1.3),
    },
    effect: '每座需要 10MW 电力、5 氦-3/tick 与 100 食物/tick；每座 on 提供 5 Alpha 支援。',
    powerCost: 10,
    support: { pool: 'alpha', amount: 5 },
    supportFuel: { resource: 'Helium_3', amountPerTick: 5 },
  },
  {
    id: 'mining_droid',
    region: 'int_alpha',
    name: '采矿无人机',
    description: '部署于 Alpha 前线的自动采矿平台，默认优先采集精金。',
    reqs: { alpha: 2 },
    costs: {
      Money: interstellarCost(650000, 1.28),
      Steel: interstellarCost(120000, 1.28),
      Nano_Tube: interstellarCost(75000, 1.28),
      Elerium: interstellarCost(50, 1.28),
    },
    effect: '每座消耗 1 Alpha 支援；当前默认产出精金，用于后续 Habitat 建造。',
    support: { pool: 'alpha', amount: -1 },
  },
  {
    id: 'habitat',
    region: 'int_alpha',
    name: '定居点',
    description: '在半人马座 Alpha 四号行星建立永久定居点，扩展星际人口承载与区域支援。',
    reqs: { alpha: 3 },
    costs: {
      Money: interstellarCost(800000, 1.25),
      Furs: interstellarCost(38000, 1.25),
      Adamantite: (state, count) => {
        if (state.race['fasting'] && count < 5) return 0;
        return Math.round(3200 * Math.pow(1.25, count));
      },
      Plywood: interstellarCost(10000, 1.25),
    },
    effect: '每座需要 2MW 电力；每座 on 额外提供 1 Alpha 支援，并使人口上限 +1。',
    powerCost: 2,
    support: { pool: 'alpha', amount: 1 },
  },
  {
    id: 'processing',
    region: 'int_alpha',
    name: '精金加工设施',
    description: '在半人马座 Alpha 建立先进的材料处理与精炼设施，提升采矿无人机的精金产出效率。',
    reqs: { droids: 1 },
    costs: {
      Money: interstellarCost(350000, 1.28),
      Iron: interstellarCost(180000, 1.28),
      Aluminium: interstellarCost(60000, 1.28),
      Iridium: interstellarCost(5000, 1.28),
    },
    effect: '每座消耗 1 Alpha 支援；提升采矿无人机的精金产出（基础 +12%）。',
    support: { pool: 'alpha', amount: -1 },
  },
  {
    id: 'fusion',
    region: 'int_alpha',
    name: '聚变反应堆',
    description: '在星际前线部署大型聚变反应堆以满足极高的能源需求。',
    reqs: { fusion: 1 },
    costs: {
      Money: interstellarCost(990000, 1.28),
      Iridium: interstellarCost(44000, 1.28),
      Infernite: interstellarCost(350, 1.28),
      Brick: interstellarCost(18000, 1.28),
    },
    effect: '每座消耗 1 Alpha 支援与 1.25 氘/tick；产出 22MW 电力。',
    powerCost: -22,
    support: { pool: 'alpha', amount: -1 },
    supportFuel: { resource: 'Deuterium', amountPerTick: 1.25 },
  },
  {
    id: 'exchange',
    region: 'int_alpha',
    name: '星际交易所',
    description: '跨越星系的庞大金融交易网络节点，极大扩展资金储备。',
    reqs: { banking: 12 },
    costs: {
      Money: interstellarCost(680000, 1.28),
      Stone: interstellarCost(115000, 1.28),
      Adamantite: interstellarCost(55000, 1.28),
      Graphene: interstellarCost(78000, 1.28),
    },
    effect: '每座消耗 1 Alpha 支援；大幅提升资金上限。',
    support: { pool: 'alpha', amount: -1 },
  },
  {
    id: 'laboratory',
    region: 'int_alpha',
    name: '深空实验室',
    description: '在半人马座 Alpha 建立最高端的研究中心，进一步突破知识极限。',
    reqs: { science: 12 },
    costs: {
      Money: interstellarCost(750000, 1.28),
      Titanium: interstellarCost(120000, 1.28),
      Alloy: interstellarCost(95000, 1.28),
      Mythril: interstellarCost(8500, 1.28),
    },
    effect: '每座消耗 1 Alpha 支援；大幅提升知识容量上限（基础 +10000）。',
    support: { pool: 'alpha', amount: -1 },
  },
];

function getInterstellarCount(state: GameState, id: string): number {
  return (state.interstellar[id] as { count?: number } | undefined)?.count ?? 0;
}

export function getInterstellarBuildCost(state: GameState, id: string): Record<string, number> {
  const def = INTERSTELLAR_STRUCTURES.find((structure) => structure.id === id);
  if (!def) return {};

  const count = getInterstellarCount(state, id);
  const costs: Record<string, number> = {};
  for (const [resId, fn] of Object.entries(def.costs)) {
    costs[resId] = fn(state, count);
  }
  return costs;
}

export function canBuildInterstellarStructure(state: GameState, id: string): boolean {
  const def = INTERSTELLAR_STRUCTURES.find((structure) => structure.id === id);
  if (!def) return false;

  for (const [reqKey, reqLevel] of Object.entries(def.reqs)) {
    if ((state.tech[reqKey] ?? 0) < reqLevel) return false;
  }

  const costs = getInterstellarBuildCost(state, id);
  for (const [resId, cost] of Object.entries(costs)) {
    if (cost <= 0) continue;
    if ((state.resource[resId]?.amount ?? 0) < cost) return false;
  }

  return true;
}

export function listInterstellarPowerConsumers(): InterstellarStructureDefinition[] {
  return INTERSTELLAR_STRUCTURES.filter((structure) => (structure.powerCost ?? 0) > 0);
}

export interface InterstellarSupportResult {
  supportOn: Record<string, number>;
  fuelDrain: Record<string, number>;
  supplierEffectiveOn: Record<string, number>;
}

export function resolveInterstellarSupport(
  state: GameState,
  powerOn: Record<string, number> = {},
): InterstellarSupportResult {
  const result: InterstellarSupportResult = {
    supportOn: {},
    fuelDrain: {},
    supplierEffectiveOn: {},
  };

  const starport = state.interstellar['starport'] as
    | { count?: number; on?: number; support?: number; s_max?: number }
    | undefined;
  const habitat = state.interstellar['habitat'] as
    | { count?: number; on?: number }
    | undefined;
  const miningDroid = state.interstellar['mining_droid'] as
    | { count?: number; on?: number }
    | undefined;

  const requestedOn = powerOn['starport'] ?? 0;
  
  // TODO(sprint): 提取并补全 int_fuel_adjust 机制
  const isDecayed = state.race['cataclysm'] || state.race['orbit_decayed'];
  const fuelPerUnit = isDecayed ? 5 * 0.25 : 5;
  const foodPerUnit = 100;
  let availableFuel = state.resource['Helium_3']?.amount ?? 0;
  let activeStarports = 0;

  for (let i = 0; i < requestedOn; i++) {
    if (availableFuel >= fuelPerUnit) {
      availableFuel -= fuelPerUnit;
      activeStarports++;
    } else {
      break;
    }
  }

  const activeHabitats = powerOn['habitat'] ?? 0;
  result.supplierEffectiveOn['starport'] = activeStarports;
  result.supplierEffectiveOn['habitat'] = activeHabitats;

  if (activeStarports > 0) {
    result.fuelDrain['Helium_3'] = activeStarports * fuelPerUnit;
    result.fuelDrain['Food'] = activeStarports * foodPerUnit;
  }

  const totalSupport = activeStarports * 5 + activeHabitats;
  let usedSupport = 0;

  // 按照定义顺序（通常与原版优先级相关）分配支援
  const consumers = INTERSTELLAR_STRUCTURES.filter(s => s.support?.pool === 'alpha' && s.support.amount < 0);
  for (const consumer of consumers) {
    const id = consumer.id;
    const struct = state.interstellar[id] as { count?: number; on?: number } | undefined;
    const count = struct?.count ?? 0;
    if (count <= 0) {
      result.supportOn[id] = 0;
      continue;
    }
    
    // 如果建筑有开关，按开关；否则按 count
    const requested = struct?.on ?? count;
    const costPerUnit = Math.abs(consumer.support!.amount);
    
    // 能支持的最大数量（受剩余支援、请求数量限制）
    const supportable = Math.min(requested, Math.floor((totalSupport - usedSupport) / costPerUnit));
    
    result.supportOn[id] = supportable;
    usedSupport += supportable * costPerUnit;
  }

  if (starport) {
    starport.s_max = activeStarports * 5 + activeHabitats;
    starport.support = usedSupport;
  }
  if (habitat && (habitat.count ?? 0) > 0 && result.supplierEffectiveOn['habitat'] === undefined) {
    result.supplierEffectiveOn['habitat'] = 0;
  }

  return result;
}

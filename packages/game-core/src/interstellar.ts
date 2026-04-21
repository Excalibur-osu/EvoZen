import type { GameState } from '@evozen/shared-types';

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
  return (_state: GameState, count: number) => Math.round(base * Math.pow(mult, count));
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
  const fuelPerUnit = 5 * 0.25;
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
    result.fuelDrain['Helium_3'] = activeStarports * 5;
    result.fuelDrain['Food'] = activeStarports * 100;
  }

  const totalSupport = activeStarports * 5 + activeHabitats;
  let usedSupport = 0;
  if (miningDroid && (miningDroid.count ?? 0) > 0 && totalSupport > 0) {
    const requestedMiningDroids = miningDroid.on ?? miningDroid.count ?? 0;
    const operatingMiningDroids = Math.min(requestedMiningDroids, totalSupport);
    result.supportOn['mining_droid'] = operatingMiningDroids;
    usedSupport += operatingMiningDroids;
  } else {
    result.supportOn['mining_droid'] = 0;
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

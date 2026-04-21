/**
 * 电力网格系统
 * 对标 legacy/src/main.js L1857-2165
 *
 * 每 tick 执行一次：
 * 1. 计算发电量（city + space 发电设施），扣除燃料
 * 2. 按优先级分配电力给消费建筑
 */

import type { GameState } from '@evozen/shared-types';
import { BASIC_STRUCTURES } from './structures';
import { SPACE_STRUCTURES } from './space';
import { INTERSTELLAR_STRUCTURES } from './interstellar';

const TIME_MULTIPLIER = 0.25;

interface FuelDef {
  resource: string;
  amountPerTick: number;
}

export interface PowerGeneratorDef {
  id: string;
  name: string;
  power: number;
  location: 'city' | 'space' | 'interstellar';
  fuel?: FuelDef;
}

export interface PowerConsumerDef {
  id: string;
  name: string;
  powerCost: number;
  location: 'city' | 'space' | 'interstellar';
}

const CITY_GENERATORS: PowerGeneratorDef[] = [
  {
    id: 'coal_power',
    name: '燃煤发电站',
    location: 'city',
    power: 5,
    fuel: { resource: 'Coal', amountPerTick: 0.35 },
  },
  {
    id: 'oil_power',
    name: '石油发电站',
    location: 'city',
    power: 6,
    fuel: { resource: 'Oil', amountPerTick: 0.65 },
  },
  {
    id: 'fission_power',
    name: '核电站',
    location: 'city',
    power: 14,
    fuel: { resource: 'Uranium', amountPerTick: 0.1 },
  },
];

const CITY_CONSUMER_PRIORITY = [
  'sawmill',
  'rock_quarry',
  'mine',
  'coal_mine',
  'cement_plant',
  'wardenclyffe',
  'metal_refinery',
  'biolab',
  'factory',
  'casino',
] as const;

const CITY_CONSUMERS: PowerConsumerDef[] = CITY_CONSUMER_PRIORITY.map((id) => {
  const def = BASIC_STRUCTURES.find((structure) => structure.id === id);
  if (!def || (def.powerCost ?? 0) <= 0) {
    throw new Error(`Missing city power consumer definition for ${id}`);
  }
  return {
    id,
    name: def.name,
    location: 'city',
    powerCost: def.powerCost!,
  };
});

const SPACE_GENERATORS: PowerGeneratorDef[] = SPACE_STRUCTURES
  .filter((def) => (def.powerCost ?? 0) < 0)
  .map((def) => ({
    id: def.id,
    name: def.name,
    location: 'space',
    power: Math.abs(def.powerCost ?? 0),
    fuel: def.supportFuel
      ? {
        resource: def.supportFuel.resource,
        amountPerTick: def.supportFuel.amountPerTick,
      }
      : undefined,
  }));

const INTERSTELLAR_GENERATORS: PowerGeneratorDef[] = INTERSTELLAR_STRUCTURES
  .filter((def) => (def.powerCost ?? 0) < 0)
  .map((def) => ({
    id: def.id,
    name: def.name,
    location: 'interstellar',
    power: Math.abs(def.powerCost ?? 0),
    fuel: def.supportFuel
      ? {
        resource: def.supportFuel.resource,
        amountPerTick: def.supportFuel.amountPerTick,
      }
      : undefined,
  }));

const SPACE_CONSUMERS: PowerConsumerDef[] = SPACE_STRUCTURES
  .filter((def) => (def.powerCost ?? 0) > 0)
  .map((def) => ({
    id: def.id,
    name: def.name,
    location: 'space',
    powerCost: def.powerCost ?? 0,
  }));

const INTERSTELLAR_CONSUMERS: PowerConsumerDef[] = INTERSTELLAR_STRUCTURES
  .filter((def) => (def.powerCost ?? 0) > 0)
  .map((def) => ({
    id: def.id,
    name: def.name,
    location: 'interstellar',
    powerCost: def.powerCost ?? 0,
  }));

export function listPowerGenerators(): PowerGeneratorDef[] {
  return [...CITY_GENERATORS, ...SPACE_GENERATORS, ...INTERSTELLAR_GENERATORS];
}

export function listPowerConsumers(): PowerConsumerDef[] {
  return [...CITY_CONSUMERS, ...SPACE_CONSUMERS, ...INTERSTELLAR_CONSUMERS];
}

function getStructBucket(
  state: GameState,
  location: 'city' | 'space' | 'interstellar',
): Record<string, unknown> {
  if (location === 'space') return state.space;
  if (location === 'interstellar') return state.interstellar;
  return state.city;
}

function getRequestedOn(
  state: GameState,
  id: string,
  location: 'city' | 'space' | 'interstellar',
): number {
  const bucket = getStructBucket(state, location);
  const struct = bucket[id] as { count?: number; on?: number } | undefined;
  if (!struct || (struct.count ?? 0) <= 0) return 0;
  return struct.on ?? struct.count ?? 0;
}

function getFuelLimitedOn(
  requestedOn: number,
  state: GameState,
  fuel: FuelDef | undefined,
): number {
  if (!fuel || requestedOn <= 0) return requestedOn;

  const fuelRes = state.resource[fuel.resource];
  if (!fuelRes || fuelRes.amount <= 0) return 0;

  const fuelPerUnit = fuel.amountPerTick * TIME_MULTIPLIER;
  let actualOn = 0;
  let availableFuel = fuelRes.amount;

  for (let i = 0; i < requestedOn; i++) {
    if (availableFuel >= fuelPerUnit) {
      availableFuel -= fuelPerUnit;
      actualOn++;
    } else {
      break;
    }
  }

  return actualOn;
}

function applyFuelDelta(
  fuelDeltas: Record<string, number>,
  actualOn: number,
  fuel: FuelDef | undefined,
): void {
  if (!fuel || actualOn <= 0) return;
  fuelDeltas[fuel.resource] = (fuelDeltas[fuel.resource] ?? 0) - actualOn * fuel.amountPerTick;
}

export interface PowerTickResult {
  /** 各资源的燃料消耗 delta（负值） */
  fuelDeltas: Record<string, number>;
  /** 发电建筑的实际开启数 */
  activeGenerators: Record<string, number>;
  /** 用电建筑的实际开启数 */
  activeConsumers: Record<string, number>;
  /** 总发电量 MW */
  totalGenerated: number;
  /** 总耗电量 MW */
  totalConsumed: number;
}

/**
 * 计算本 tick 的电力网格状态
 */
export function powerTick(state: GameState): PowerTickResult {
  const fuelDeltas: Record<string, number> = {};
  const activeGenerators: Record<string, number> = {};
  const activeConsumers: Record<string, number> = {};
  let totalGenerated = 0;

  // ============================================================
  // 1. 发电阶段 — 逐座检查燃料是否充足
  // ============================================================
  for (const generator of listPowerGenerators()) {
    const requestedOn = getRequestedOn(state, generator.id, generator.location);
    const actualOn = getFuelLimitedOn(requestedOn, state, generator.fuel);

    activeGenerators[generator.id] = actualOn;
    totalGenerated += actualOn * generator.power;
    applyFuelDelta(fuelDeltas, actualOn, generator.fuel);
  }

  // ============================================================
  // 2. 用电阶段 — 按优先级分配电力
  // ============================================================
  // 对标 legacy main.js L2108-2164
  let remainingPower = totalGenerated;
  let totalConsumed = 0;

  for (const consumer of listPowerConsumers()) {
    const maxOn = getRequestedOn(state, consumer.id, consumer.location);
    if (maxOn <= 0) {
      activeConsumers[consumer.id] = 0;
      continue;
    }

    let powered = 0;
    for (let i = 0; i < maxOn; i++) {
      if (remainingPower >= consumer.powerCost) {
        remainingPower -= consumer.powerCost;
        powered++;
      } else {
        break;
      }
    }

    activeConsumers[consumer.id] = powered;
    totalConsumed += powered * consumer.powerCost;
  }

  return {
    fuelDeltas,
    activeGenerators,
    activeConsumers,
    totalGenerated,
    totalConsumed,
  };
}

/**
 * 检查某个建筑是否需要电力
 */
export function isPoweredBuilding(id: string): boolean {
  return listPowerConsumers().some((consumer) => consumer.id === id);
}

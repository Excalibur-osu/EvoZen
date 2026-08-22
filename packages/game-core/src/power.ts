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
import { getDysonPowerState, INTERSTELLAR_STRUCTURES } from './interstellar';
import { GALAXY_STRUCTURES } from './galaxy';
import { EDENIC_BUILDINGS } from './edenic';
import { getChallengePowerCost } from './challenges';
import { getAchievementLevel, getThermalCollectorPowerReduction } from './achievements';
import {
  getTaucetiGeneratorFuel,
  getTaucetiPowerCost,
  TAUCETI_STRUCTURES,
} from './tauceti';

const TIME_MULTIPLIER = 0.25;

interface FuelDef {
  resource: string;
  amountPerTick: number;
}

export interface PowerGeneratorDef {
  id: string;
  name: string;
  power: number;
  location: 'city' | 'space' | 'interstellar' | 'galaxy' | 'portal' | 'tauceti' | 'eden';
  fuel?: FuelDef;
  /** 整个分段巨构作为一台不可手动开关的发电机。 */
  aggregate?: boolean;
}

export interface PowerConsumerDef {
  id: string;
  name: string;
  powerCost: number;
  location: 'city' | 'space' | 'interstellar' | 'galaxy' | 'portal' | 'tauceti' | 'eden';
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
  'mass_driver',
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

const PORTAL_GENERATORS: PowerGeneratorDef[] = [
  { id: 'incinerator', name: '焚化炉', location: 'portal', power: 25 },
];

const TAUCETI_GENERATORS: PowerGeneratorDef[] = TAUCETI_STRUCTURES
  .filter((structure) => structure.implemented && (structure.powerCost ?? 0) < 0)
  .map((structure) => ({
    id: structure.id,
    name: structure.name,
    location: 'tauceti',
    power: Math.abs(structure.powerCost ?? 0),
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

const SPACE_CONSUMERS: PowerConsumerDef[] = [
  ...SPACE_STRUCTURES
    .filter((def) => (def.powerCost ?? 0) > 0)
    .map<PowerConsumerDef>((def) => ({
      id: def.id,
      name: def.name,
      location: 'space',
      powerCost: def.powerCost ?? 0,
    })),
  {
    id: 'electrolysis',
    name: '水电解装置',
    location: 'space',
    powerCost: 8,
  },
  {
    id: 'titan_spaceport',
    name: '土卫六港口',
    location: 'space',
    powerCost: 10,
  },
  {
    id: 'zero_g_lab',
    name: '零重力实验室',
    location: 'space',
    powerCost: 12,
  },
  {
    id: 'fob',
    name: '前进基地',
    location: 'space',
    powerCost: 50,
  },
];

const PORTAL_CONSUMERS: PowerConsumerDef[] = [
  { id: 'guard_post', name: '守卫站', location: 'portal', powerCost: 3 },
  { id: 'arcology', name: '巨型生态屋', location: 'portal', powerCost: 25 },
  { id: 'hell_forge', name: '地狱铸造厂', location: 'portal', powerCost: 12 },
  { id: 'twisted_lab', name: '扭曲实验室', location: 'portal', powerCost: 4 },
];

const TAUCETI_CONSUMERS: PowerConsumerDef[] = TAUCETI_STRUCTURES
  .filter((structure) => structure.implemented && (structure.powerCost ?? 0) > 0)
  .map((structure) => ({
    id: structure.id,
    name: structure.name,
    location: 'tauceti',
    powerCost: structure.powerCost ?? 0,
  }));

const INTERSTELLAR_CONSUMERS: PowerConsumerDef[] = INTERSTELLAR_STRUCTURES
  .filter((def) => (def.powerCost ?? 0) > 0)
  .map((def) => ({
    id: def.id,
    name: def.name,
    location: 'interstellar',
    powerCost: def.powerCost ?? 0,
  }));

const GALAXY_CONSUMERS: PowerConsumerDef[] = GALAXY_STRUCTURES
  .filter((def) => (def.powerCost ?? 0) > 0)
  .map<PowerConsumerDef>((def) => ({
    id: def.id,
    name: def.name,
    location: 'galaxy',
    powerCost: def.powerCost ?? 0,
  }));

const EDEN_GENERATORS: PowerGeneratorDef[] = EDENIC_BUILDINGS
  .filter((def) => def.power < 0)
  .map((def) => ({
    id: def.id,
    name: def.name,
    location: 'eden',
    power: Math.abs(def.power),
  }));

const EDEN_CONSUMERS: PowerConsumerDef[] = EDENIC_BUILDINGS
  .filter((def) => def.power > 0)
  .map<PowerConsumerDef>((def) => ({
    id: def.id,
    name: def.name,
    location: 'eden',
    powerCost: def.power,
  }))
  .sort((a, b) => {
    if (a.id === 'spirit_battery') return -1;
    if (b.id === 'spirit_battery') return 1;
    if (a.id === 'spirit_vacuum') return 1;
    if (b.id === 'spirit_vacuum') return -1;
    return 0;
  });

export function listPowerGenerators(state?: GameState): PowerGeneratorDef[] {
  const generators: PowerGeneratorDef[] = [
    ...CITY_GENERATORS,
    ...SPACE_GENERATORS,
    ...INTERSTELLAR_GENERATORS,
    ...PORTAL_GENERATORS,
    ...TAUCETI_GENERATORS,
    ...EDEN_GENERATORS,
  ];
  if (state) {
    const dyson = getDysonPowerState(state);
    if (dyson) {
      generators.push({
        id: dyson.id,
        name: dyson.name,
        location: 'interstellar',
        power: dyson.power,
        aggregate: true,
      });
    }
  }
  if (!state) return generators;

  const dissipated = getAchievementLevel(state, 'dissipated');
  return generators.map((generator) => {
    let power = generator.power;
    let fuel = generator.fuel;
    if (generator.id === 'coal_power' && dissipated >= 1) power += 1;
    if (generator.id === 'oil_power' && dissipated >= 3) power += dissipated >= 5 ? 2 : 1;
    if (generator.id === 'geothermal' && getAchievementLevel(state, 'failed_history') >= 5) power += 2;
    if (generator.location === 'tauceti') {
      const structure = TAUCETI_STRUCTURES.find((candidate) => candidate.id === generator.id);
      if (structure) fuel = getTaucetiGeneratorFuel(state, structure);
    }
    return { ...generator, power, fuel };
  });
}

export function listPowerConsumers(state?: GameState): PowerConsumerDef[] {
  const consumers = [
    ...CITY_CONSUMERS,
    ...SPACE_CONSUMERS,
    ...INTERSTELLAR_CONSUMERS,
    ...GALAXY_CONSUMERS,
    ...PORTAL_CONSUMERS,
    ...TAUCETI_CONSUMERS,
    ...EDEN_CONSUMERS,
  ];
  if (!state) return consumers;

  const dissipated = getAchievementLevel(state, 'dissipated');
  return consumers.map((consumer) => {
    let powerCost = consumer.powerCost;
    if ((consumer.id === 'casino' || consumer.id === 'spc_casino') && dissipated >= 2) {
      powerCost = 2;
    }
    if (consumer.id === 'mass_driver') {
      if (dissipated >= 4) powerCost--;
      if ((state.tech['mass'] ?? 0) >= 2) powerCost--;
    }
    if (consumer.location === 'tauceti') {
      powerCost = getTaucetiPowerCost(state, consumer.id);
    }
    powerCost = getChallengePowerCost(state, Math.max(0, powerCost));
    if (consumer.id === 'ascension_trigger') {
      const collectors = (state.interstellar['thermal_collector'] as { count?: number } | undefined)?.count ?? 0;
      powerCost = Math.max(0, powerCost - collectors * getThermalCollectorPowerReduction(state));
    }
    if (consumer.id === 'spirit_vacuum') {
      const battery = state.eden['spirit_battery'] as { count?: number; on?: number } | undefined;
      const batteries = battery?.on ?? battery?.count ?? 0;
      powerCost = Math.round(18000 * Math.pow(0.9, batteries));
      powerCost = getChallengePowerCost(state, powerCost);
    }
    return {
      ...consumer,
      powerCost,
    };
  });
}

function getStructBucket(
  state: GameState,
  location: 'city' | 'space' | 'interstellar' | 'galaxy' | 'portal' | 'tauceti' | 'eden',
): Record<string, unknown> {
  if (location === 'space') return state.space;
  if (location === 'interstellar') return state.interstellar;
  if (location === 'galaxy') return state.galaxy;
  if (location === 'portal') return state.portal;
  if (location === 'tauceti') return state.tauceti;
  if (location === 'eden') return state.eden;
  return state.city;
}

function getRequestedOn(
  state: GameState,
  id: string,
  location: 'city' | 'space' | 'interstellar' | 'galaxy' | 'portal' | 'tauceti' | 'eden',
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
  for (const generator of listPowerGenerators(state)) {
    const requestedOn = generator.aggregate ? 1 : getRequestedOn(state, generator.id, generator.location);
    const actualOn = getFuelLimitedOn(requestedOn, state, generator.fuel);

    activeGenerators[generator.id] = actualOn;
    totalGenerated += actualOn * generator.power;
    applyFuelDelta(fuelDeltas, actualOn, generator.fuel);
  }

  // swarm_satellite 特殊处理 — 对标 legacy main.js L1978-1997
  // 需要支援才能工作，每座产出 0.35 电力（tech.swarm >= 4 时递增）
  const swarmControl = state.space['swarm_control'] as { count?: number; s_max?: number } | undefined;
  const swarmSatellite = state.space['swarm_satellite'] as { count?: number } | undefined;
  if (swarmControl && swarmSatellite && (swarmControl.count ?? 0) > 0 && (swarmSatellite.count ?? 0) > 0) {
    let active = swarmSatellite.count ?? 0;
    if (active > (swarmControl.s_max ?? 0)) {
      active = swarmControl.s_max ?? 0;
    }
    let solar = 0.35;
    const swarmTech = state.tech['swarm'] ?? 0;
    if (swarmTech >= 4) {
      solar += 0.15 * (swarmTech - 3);
    }
    if (getAchievementLevel(state, 'iron_will') >= 1) solar += 0.15;
    solar = +solar.toFixed(2);
    const output = active * solar;
    activeGenerators['swarm_satellite'] = active;
    totalGenerated += output;
  }

  // ============================================================
  // 2. 用电阶段 — 按优先级分配电力
  // ============================================================
  // 对标 legacy main.js L2108-2164
  let remainingPower = totalGenerated;
  let totalConsumed = 0;

  for (const consumer of listPowerConsumers(state)) {
    const maxOn = getRequestedOn(state, consumer.id, consumer.location);
    if (maxOn <= 0) {
      activeConsumers[consumer.id] = 0;
      continue;
    }

    const powerCost = consumer.powerCost;
    let powered = 0;
    for (let i = 0; i < maxOn; i++) {
      if (remainingPower >= powerCost) {
        remainingPower -= powerCost;
        powered++;
      } else {
        break;
      }
    }

    activeConsumers[consumer.id] = powered;
    totalConsumed += powered * powerCost;
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

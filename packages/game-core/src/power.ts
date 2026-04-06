/**
 * 电力网格系统
 * 对标 legacy/src/main.js L1857-2165
 *
 * 每 tick 执行一次：
 * 1. 计算发电量（coal_power / oil_power），扣除燃料
 * 2. 按优先级分配电力给消费建筑
 */

import type { GameState } from '@evozen/shared-types';

const TIME_MULTIPLIER = 0.25;

/**
 * 发电站定义
 * 简化版：不包含 environmentalist / magic universe 变体
 */
interface GeneratorDef {
  id: string;
  /** 每座产出的 MW（正值）*/
  power: number;
  /** 燃料资源 ID */
  fuelResource: string;
  /** 每座每 tick 消耗的燃料量（应用 TIME_MULTIPLIER 前） */
  fuelPerTick: number;
}

const GENERATORS: GeneratorDef[] = [
  { id: 'coal_power', power: 5, fuelResource: 'Coal', fuelPerTick: 0.35 },
  { id: 'oil_power', power: 6, fuelResource: 'Oil', fuelPerTick: 0.65 },
  { id: 'fission_power', power: 14, fuelResource: 'Uranium', fuelPerTick: 0.1 },
];

/**
 * 用电建筑定义
 * powered / powerCost 已在 structures.ts 的 StructureDefinition 中定义
 * 这里用优先级顺序列出（越靠前越优先获得电力）
 */
interface ConsumerDef {
  id: string;
  /** 每座耗电 (MW) */
  powerCost: number;
}

const CONSUMERS: ConsumerDef[] = [
  { id: 'mine', powerCost: 1 },
  { id: 'coal_mine', powerCost: 1 },
  { id: 'wardenclyffe', powerCost: 2 },
  { id: 'metal_refinery', powerCost: 2 },
  { id: 'biolab', powerCost: 2 },
  { id: 'factory', powerCost: 3 },
  { id: 'casino', powerCost: 3 },
];

export interface PowerTickResult {
  /** 各资源的燃料消耗 delta（负值）*/
  fuelDeltas: Record<string, number>;
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
  const activeConsumers: Record<string, number> = {};
  let totalGenerated = 0;

  // ============================================================
  // 1. 发电阶段 — 逐座检查燃料是否充足
  // ============================================================
  for (const gen of GENERATORS) {
    const struct = state.city[gen.id] as { count: number; on?: number } | undefined;
    if (!struct || struct.count === 0) continue;

    const maxOn = struct.on ?? struct.count;
    if (maxOn <= 0) continue;

    const fuelRes = state.resource[gen.fuelResource];
    if (!fuelRes) continue;

    // 逐座检查，确保燃料充足
    // 对标 legacy main.js L1884-1890
    const fuelPerUnit = gen.fuelPerTick * TIME_MULTIPLIER;
    let actualOn = 0;
    let availableFuel = fuelRes.amount;

    for (let i = 0; i < maxOn; i++) {
      if (availableFuel >= fuelPerUnit) {
        availableFuel -= fuelPerUnit;
        actualOn++;
      } else {
        break;
      }
    }

    totalGenerated += actualOn * gen.power;
    fuelDeltas[gen.fuelResource] = (fuelDeltas[gen.fuelResource] ?? 0) - actualOn * gen.fuelPerTick;
  }

  // ============================================================
  // 2. 用电阶段 — 按优先级分配电力
  // ============================================================
  // 对标 legacy main.js L2108-2164
  let remainingPower = totalGenerated;
  let totalConsumed = 0;

  for (const consumer of CONSUMERS) {
    const struct = state.city[consumer.id] as { count: number; on?: number } | undefined;
    if (!struct || struct.count === 0) {
      activeConsumers[consumer.id] = 0;
      continue;
    }

    const maxOn = struct.on ?? struct.count;
    if (maxOn <= 0) {
      activeConsumers[consumer.id] = 0;
      continue;
    }

    // 尝试分配尽可能多的电力
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
    activeConsumers,
    totalGenerated,
    totalConsumed,
  };
}

/**
 * 检查某个建筑是否需要电力
 */
export function isPoweredBuilding(id: string): boolean {
  return CONSUMERS.some(c => c.id === id);
}

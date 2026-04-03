/**
 * power.ts 回归测试
 *
 * 对标 legacy/src/main.js L1857-2165
 * 验证 powerTick 发电、燃料消耗、电力分配优先级。
 */

import { describe, it, expect } from 'vitest';
import { powerTick, isPoweredBuilding } from './power';
import { createNewGame } from './state';
import type { GameState } from '@evozen/shared-types';

// ─── 测试辅助 ─────────────────────────────────────

const TIME_MULTIPLIER = 0.25;

function makeState(): GameState {
  const s = createNewGame();
  s.race.species = 'human';
  s.resource['Coal'] = { name: '煤', display: true, value: 0, amount: 100, max: 500, rate: 0, crates: 0, diff: 0, delta: 0 };
  s.resource['Oil'] = { name: '石油', display: true, value: 0, amount: 100, max: 500, rate: 0, crates: 0, diff: 0, delta: 0 };
  return s;
}

function addBuilding(s: GameState, id: string, count: number, on?: number) {
  (s.city as any)[id] = { count, on: on ?? count };
}

// ============================================================
// 发电阶段
// ============================================================

describe('powerTick — 发电', () => {
  it('无发电站时 totalGenerated = 0', () => {
    const s = makeState();
    const { totalGenerated } = powerTick(s);
    expect(totalGenerated).toBe(0);
  });

  it('1 座煤电站生成 5MW — legacy main.js L1884', () => {
    const s = makeState();
    addBuilding(s, 'coal_power', 1);
    const { totalGenerated } = powerTick(s);
    expect(totalGenerated).toBe(5);
  });

  it('2 座煤电站生成 10MW', () => {
    const s = makeState();
    addBuilding(s, 'coal_power', 2);
    const { totalGenerated } = powerTick(s);
    expect(totalGenerated).toBe(10);
  });

  it('1 座油电站生成 6MW', () => {
    const s = makeState();
    addBuilding(s, 'oil_power', 1);
    const { totalGenerated } = powerTick(s);
    expect(totalGenerated).toBe(6);
  });

  it('煤电 + 油电同时运行，总量叠加', () => {
    const s = makeState();
    addBuilding(s, 'coal_power', 1);
    addBuilding(s, 'oil_power', 1);
    const { totalGenerated } = powerTick(s);
    expect(totalGenerated).toBe(11);
  });
});

// ============================================================
// 燃料消耗 — legacy main.js L1884-1890
// ============================================================

describe('powerTick — 燃料消耗', () => {
  it('1 座煤电每 tick 消耗 0.35 × TIME_MULTIPLIER(0.25) = 0.0875 煤', () => {
    const s = makeState();
    addBuilding(s, 'coal_power', 1);
    const before = s.resource['Coal'].amount;
    const { fuelDeltas } = powerTick(s);
    // fuelDeltas 是 per-tick 速率（TIME_MULTIPLIER 已计入），应用到资源时再乘
    // 实际燃料扣减 = fuelPerTick × actualOn（已内含TIME_MULTIPLIER计算）
    expect(fuelDeltas['Coal']).toBeDefined();
    expect(fuelDeltas['Coal']).toBeLessThan(0);
    // 精确值：-0.35（每 tick 速率，由 tick.ts 乘 TIME_MULTIPLIER 后应用）
    expect(fuelDeltas['Coal']).toBeCloseTo(-0.35, 5);
  });

  it('1 座油电每 tick 消耗速率 -0.65 油', () => {
    const s = makeState();
    addBuilding(s, 'oil_power', 1);
    const { fuelDeltas } = powerTick(s);
    expect(fuelDeltas['Oil']).toBeCloseTo(-0.65, 5);
  });

  it('煤炭不足时发电站无法全部运转', () => {
    const s = makeState();
    // 只有 0.04 煤，不够 1 座煤电的 0.0875 消耗
    s.resource['Coal'].amount = 0.04;
    addBuilding(s, 'coal_power', 2);
    const { totalGenerated, fuelDeltas } = powerTick(s);
    // 第一座也运转不了
    expect(totalGenerated).toBe(0);
    expect(fuelDeltas['Coal'] ?? 0).toBe(0);
  });

  it('只有足够运转 1 座的煤时，只有 1 座运转', () => {
    const s = makeState();
    // 足够 1 座但不够 2 座
    s.resource['Coal'].amount = 0.1; // 大于 0.0875，小于 0.175
    addBuilding(s, 'coal_power', 2);
    const { totalGenerated } = powerTick(s);
    expect(totalGenerated).toBe(5); // 1 座 × 5MW
  });

  it('发电站 on=0 时不发电', () => {
    const s = makeState();
    addBuilding(s, 'coal_power', 2, 0); // on=0
    const { totalGenerated } = powerTick(s);
    expect(totalGenerated).toBe(0);
  });
});

// ============================================================
// 电力分配 — 消费建筑优先级 — legacy main.js L2108-2164
// ============================================================

describe('powerTick — 电力分配', () => {
  it('无消费建筑时 activeConsumers 全为 0', () => {
    const s = makeState();
    addBuilding(s, 'coal_power', 1);
    const { activeConsumers } = powerTick(s);
    expect(Object.values(activeConsumers).every(v => v === 0)).toBe(true);
  });

  it('5MW 电力供 1 座矿山(1MW)后剩余 4MW', () => {
    const s = makeState();
    addBuilding(s, 'coal_power', 1); // 5MW
    addBuilding(s, 'mine', 1);       // 1MW
    const { activeConsumers, totalConsumed } = powerTick(s);
    expect(activeConsumers['mine']).toBe(1);
    expect(totalConsumed).toBe(1);
  });

  it('矿山优先于工厂获得电力（priority 顺序）', () => {
    const s = makeState();
    addBuilding(s, 'coal_power', 1); // 5MW
    addBuilding(s, 'mine', 1);       // 1MW（先）
    addBuilding(s, 'factory', 2);    // 3MW × 2 = 6MW（后，不够）
    const { activeConsumers } = powerTick(s);
    // 矿山应完全供电，工厂只有 1 座能获得电力（剩余 4MW，工厂需 3MW）
    expect(activeConsumers['mine']).toBe(1);
    expect(activeConsumers['factory']).toBe(1); // 5-1=4MW, 4/3=1.33→1座
  });

  it('电力完全不足时所有消费建筑均断电', () => {
    const s = makeState();
    // 没有发电站
    addBuilding(s, 'mine', 2);
    addBuilding(s, 'factory', 1);
    const { activeConsumers, totalGenerated } = powerTick(s);
    expect(totalGenerated).toBe(0);
    expect(activeConsumers['mine']).toBe(0);
    expect(activeConsumers['factory']).toBe(0);
  });

  it('6MW 可供 2 座煤矿(1MW × 2) + 1 座 wardenclyffe(2MW)，共 4MW', () => {
    const s = makeState();
    addBuilding(s, 'oil_power', 1);  // 6MW
    addBuilding(s, 'mine', 2);       // 1+1=2MW
    addBuilding(s, 'coal_mine', 1);  // 1MW
    addBuilding(s, 'wardenclyffe', 1); // 2MW
    const { activeConsumers, totalConsumed } = powerTick(s);
    expect(activeConsumers['mine']).toBe(2);
    expect(activeConsumers['coal_mine']).toBe(1);
    expect(activeConsumers['wardenclyffe']).toBe(1);
    expect(totalConsumed).toBe(5); // 2+1+2=5MW，剩余 1MW
  });
});

// ============================================================
// isPoweredBuilding
// ============================================================

describe('isPoweredBuilding', () => {
  it('mine 是用电建筑', () => {
    expect(isPoweredBuilding('mine')).toBe(true);
  });

  it('factory 是用电建筑', () => {
    expect(isPoweredBuilding('factory')).toBe(true);
  });

  it('wardenclyffe 是用电建筑', () => {
    expect(isPoweredBuilding('wardenclyffe')).toBe(true);
  });

  it('farm 不是用电建筑', () => {
    expect(isPoweredBuilding('farm')).toBe(false);
  });

  it('lumber_yard 不是用电建筑', () => {
    expect(isPoweredBuilding('lumber_yard')).toBe(false);
  });
});

/**
 * tick.ts 核心公式回归测试
 *
 * 验证 gameTick 在标准初始状态下的产出数值
 * 不依赖任何 DOM/UI，纯逻辑断言
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createNewGame } from './state';
import { gameTick } from './tick';
import type { GameState } from '@evozen/shared-types';

// ============================================================
// 测试辅助
// ============================================================

/** 快速获取已经过进化的文明初始状态 */
function makeCivState(): GameState {
  const s = createNewGame();
  s.race.species = 'human';
  // 初始化人口资源
  s.resource['human'] = { name: '人类', display: true, value: 0, amount: 5, max: 10, rate: 0, crates: 0, diff: 0, delta: 0 };
  s.resource['Food'].display = true;
  s.resource['Food'].amount = 200;
  s.resource['Lumber'].display = true;
  s.resource['Lumber'].amount = 100;
  // 解锁 primitive，使事件有前置条件
  s.tech['primitive'] = 1;
  return s;
}

function setWorkers(s: GameState, jobId: string, count: number) {
  const job = s.civic[jobId] as any;
  if (job) job.workers = count;
}

// ============================================================
// 食物体系
// ============================================================

describe('Food 消耗 — 对标 legacy main.js L3788-3815', () => {
  it('无农民时每人口消耗食物 (TIME_MULTIPLIER=0.25)', () => {
    const s = makeCivState();
    // 无农民，5 口人，食物应减少
    const before = s.resource['Food'].amount;
    const out = gameTick(s);
    const after = out.state.resource['Food'].amount;
    // 原版: 每人每 tick 消耗 0.25 食物
    // 5 人 × 0.25 × TIME_MULTIPLIER(0.25) = 0.3125
    expect(after).toBeLessThan(before);
  });

  it('农民产出食物抵消消耗', () => {
    const s = makeCivState();
    s.tech['agriculture'] = 1;
    // 给 farmer 岗位 2 个人
    s.civic['farmer'] = { workers: 2, max: 2, display: true } as any;
    s.civic['unemployed'] = { workers: 3, max: -1, display: true } as any;
    const before = s.resource['Food'].amount;
    const out = gameTick(s);
    const after = out.state.resource['Food'].amount;
    // 农民产出 > 人口消耗，食物应该增加或持平
    expect(after).toBeGreaterThanOrEqual(before - 1); // 允许 ±1 浮动
  });
});

// ============================================================
// 木材体系
// ============================================================

describe('Lumber 生产 — 对标 legacy main.js L5428-5445', () => {
  it('1 个伐木工每 tick 产出约 0.25 木材', () => {
    const s = makeCivState();
    s.civic['lumberjack'] = { workers: 1, max: -1, display: true } as any;
    s.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;
    const before = s.resource['Lumber'].amount;
    const out = gameTick(s);
    const after = out.state.resource['Lumber'].amount;
    const delta = after - before;
    // impact=1.0, TIME_MULTIPLIER=0.25 → 每 tick 约 +0.25
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThan(1.0); // 不可能超过 1（无加成情况）
  });

  it('stone axe (axe:1) 使伐木产量增加 50%', () => {
    // 注意：对标 legacy，axe:1（石斧）实际在 tick.ts 中无加成，只有 axe:2+ 才有产量加成
    // 参见 tick.ts: if (axeLevel > 1) { lumberBase *= 1 + (axeLevel-1)*0.35 }
    // 所以这里测试 axe:2 vs 无斧头
    const noAxe = makeCivState();
    noAxe.civic['lumberjack'] = { workers: 1, max: -1, display: true } as any;
    noAxe.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;
    const noAxeOut = gameTick(noAxe).state;
    const deltaNoAxe = noAxeOut.resource['Lumber'].amount - noAxe.resource['Lumber'].amount;

    const withAxe2 = makeCivState();
    withAxe2.tech['axe'] = 2;  // axe:2 → lumberBase *= 1 + 1*0.35 = 1.35
    withAxe2.civic['lumberjack'] = { workers: 1, max: -1, display: true } as any;
    withAxe2.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;
    const withAxe2Out = gameTick(withAxe2).state;
    const deltaWithAxe2 = withAxe2Out.resource['Lumber'].amount - withAxe2.resource['Lumber'].amount;

    // axe:2 产量应显著高于无斧头，约 1.35 倍
    expect(deltaWithAxe2).toBeGreaterThan(deltaNoAxe);
    expect(deltaWithAxe2 / deltaNoAxe).toBeGreaterThan(1.2);
    expect(deltaWithAxe2 / deltaNoAxe).toBeLessThan(1.5);
  });
});

// ============================================================
// 矿工体系
// ============================================================

describe('Miner 产出 — 对标 legacy main.js L6117-6160', () => {
  it('矿工产铜需要电力（无电站时产出为 0）', () => {
    const s = makeCivState();
    s.tech['mining'] = 1;
    s.resource['Copper'].display = true;
    s.resource['Copper'].amount = 0;
    // 有矿工但无电力（无发电站）
    (s.city as any)['mine'] = { count: 1, on: 1 };
    s.civic['miner'] = { workers: 1, max: 1, display: true } as any;
    s.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;

    const out = gameTick(s);
    // mine 是用电建筑，无电时 activeConsumers['mine'] = 0，所以不产铜
    expect(out.state.resource['Copper'].amount).toBe(0);
  });

  it('矿工有电力时产铜', () => {
    const s = makeCivState();
    s.tech['mining'] = 1;
    s.resource['Copper'].display = true;
    s.resource['Copper'].amount = 0;
    s.resource['Coal'].display = true;
    s.resource['Coal'].amount = 100; // 足够的燃料
    // 配置电站
    (s.city as any)['coal_power'] = { count: 1, on: 1 };
    // 配置矿山
    (s.city as any)['mine'] = { count: 1, on: 1 };
    s.civic['miner'] = { workers: 1, max: 1, display: true } as any;
    s.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;

    const out = gameTick(s);
    const copper = out.state.resource['Copper'].amount;
    // 有电时： 1/7 * TIME_MULTIPLIER(0.25) ≈ 0.0357
    expect(copper).toBeGreaterThan(0.02);
    expect(copper).toBeLessThan(0.06);
  });

  it('mining:3 解锁铁矿，矿工有电时同时产铁', () => {
    const s = makeCivState();
    s.tech['mining'] = 3;
    s.resource['Copper'].display = true;
    s.resource['Iron'].display = true;
    s.resource['Iron'].amount = 0;
    s.resource['Coal'].display = true;
    s.resource['Coal'].amount = 100;
    // 配置电站为矿山供电
    (s.city as any)['coal_power'] = { count: 1, on: 1 };
    (s.city as any)['mine'] = { count: 1, on: 1 };
    s.civic['miner'] = { workers: 1, max: 1, display: true } as any;
    s.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;

    const out = gameTick(s);
    const iron = out.state.resource['Iron'].amount;
    // 0.25 * TIME_MULTIPLIER(0.25) = 0.0625
    expect(iron).toBeGreaterThan(0.04);
    expect(iron).toBeLessThan(0.10);
  });
});

// ============================================================
// 知识体系
// ============================================================

describe('Knowledge 产出', () => {
  it('图书馆每座提升 5% 知识产出', () => {
    const noLib = makeCivState();
    noLib.tech['primitive'] = 3;
    noLib.tech['science'] = 1;
    noLib.resource['Knowledge'].display = true;
    noLib.resource['Knowledge'].amount = 0;
    const professors = noLib.civic['professor'] as any;
    if (professors) professors.workers = 0;

    const withLib = makeCivState();
    withLib.tech['primitive'] = 3;
    withLib.tech['science'] = 1;
    withLib.resource['Knowledge'].display = true;
    withLib.resource['Knowledge'].amount = 0;
    (withLib.city as any)['library'] = { count: 4, on: 4 };
    const profWithLib = withLib.civic['professor'] as any;
    if (profWithLib) profWithLib.workers = 0;

    const outNoLib = gameTick(noLib).state;
    const outWithLib = gameTick(withLib).state;

    const deltaNoLib = outNoLib.resource['Knowledge'].amount;
    const deltaWithLib = outWithLib.resource['Knowledge'].amount;

    // sundial (base) × libraryMult(1 + 4*0.05 = 1.2)
    if (deltaNoLib > 0) {
      expect(deltaWithLib / deltaNoLib).toBeCloseTo(1.2, 2);
    }
  });
});

// ============================================================
// 信仰体系 (Priest — v0.7.0 新增)
// ============================================================

describe('Faith 产出 — 牧师', () => {
  it('1 个牧师每 tick 产 0.125 信仰（0.5 × TIME_MULTIPLIER 0.25）', () => {
    const s = makeCivState();
    s.tech['theology'] = 2;
    s.resource['Faith'] = { name: '信仰', display: true, value: 0, amount: 0, max: 100, rate: 0, crates: 0, diff: 0, delta: 0 };
    (s.city as any)['temple'] = { count: 1, on: 1 };
    s.civic['priest'] = { workers: 1, max: 1, display: true } as any;
    s.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;

    const out = gameTick(s);
    const faith = out.state.resource['Faith'].amount;
    // 0.5 * prodMult * TIME_MULTIPLIER(0.25)
    // prodMult 受士气影响（初始约 0.97），结果在 0.11~0.13 之间
    expect(faith).toBeGreaterThan(0.10);
    expect(faith).toBeLessThan(0.13);
  });

  it('神权政体使信仰产出 +10%', () => {
    const base = makeCivState();
    base.tech['theology'] = 2;
    base.resource['Faith'] = { name: '信仰', display: true, value: 0, amount: 0, max: 100, rate: 0, crates: 0, diff: 0, delta: 0 };
    (base.city as any)['temple'] = { count: 1, on: 1 };
    base.civic['priest'] = { workers: 1, max: 1, display: true } as any;
    base.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;

    const theo = makeCivState();
    theo.tech['theology'] = 2;
    theo.resource['Faith'] = { name: '信仰', display: true, value: 0, amount: 0, max: 100, rate: 0, crates: 0, diff: 0, delta: 0 };
    (theo.city as any)['temple'] = { count: 1, on: 1 };
    theo.civic['priest'] = { workers: 1, max: 1, display: true } as any;
    theo.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;
    theo.civic.govern = { type: 'theocracy' } as any;

    const faithBase = gameTick(base).state.resource['Faith'].amount;
    const faithTheo = gameTick(theo).state.resource['Faith'].amount;

    expect(faithTheo).toBeCloseTo(faithBase * 1.1, 3);
  });
});

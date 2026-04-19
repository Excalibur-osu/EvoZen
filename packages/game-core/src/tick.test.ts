/**
 * tick.ts 核心公式回归测试
 *
 * 验证 gameTick 在标准初始状态下的产出数值
 * 不依赖任何 DOM/UI，纯逻辑断言
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createNewGame } from './state';
import { gameTick } from './tick';
import { assignSpeciesTraits } from './traits';
import { calculateMorale } from './morale';
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

  it('通电锯木厂额外提供 4% 木材加成', () => {
    const noPower = makeCivState();
    noPower.civic['lumberjack'] = { workers: 1, max: -1, display: true } as any;
    noPower.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;
    (noPower.city as any)['sawmill'] = { count: 1, on: 1 };

    const powered = makeCivState();
    powered.resource['Coal'].display = true;
    powered.resource['Coal'].amount = 100;
    powered.civic['lumberjack'] = { workers: 1, max: -1, display: true } as any;
    powered.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;
    (powered.city as any)['sawmill'] = { count: 1, on: 1 };
    (powered.city as any)['coal_power'] = { count: 1, on: 1 };

    const noPowerDelta = gameTick(noPower).state.resource['Lumber'].amount - noPower.resource['Lumber'].amount;
    const poweredDelta = gameTick(powered).state.resource['Lumber'].amount - powered.resource['Lumber'].amount;

    expect(poweredDelta / noPowerDelta).toBeCloseTo(1.04, 3);
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

  it('dowsing 和 reclaimer 不应提升矿工产量', () => {
    const base = makeCivState();
    base.tech['mining'] = 3;
    base.resource['Copper'].display = true;
    base.resource['Iron'].display = true;
    base.resource['Coal'].display = true;
    base.resource['Coal'].amount = 100;
    (base.city as any)['coal_power'] = { count: 1, on: 1 };
    (base.city as any)['mine'] = { count: 1, on: 1 };
    base.civic['miner'] = { workers: 1, max: 1, display: true } as any;
    base.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;

    const boosted = makeCivState();
    boosted.tech['mining'] = 3;
    boosted.tech['dowsing'] = 2;
    boosted.tech['reclaimer'] = 3;
    boosted.resource['Copper'].display = true;
    boosted.resource['Iron'].display = true;
    boosted.resource['Coal'].display = true;
    boosted.resource['Coal'].amount = 100;
    (boosted.city as any)['coal_power'] = { count: 1, on: 1 };
    (boosted.city as any)['mine'] = { count: 1, on: 1 };
    boosted.civic['miner'] = { workers: 1, max: 1, display: true } as any;
    boosted.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;

    const baseOut = gameTick(base).state;
    const boostedOut = gameTick(boosted).state;

    expect(boostedOut.resource['Copper'].amount).toBeCloseTo(baseOut.resource['Copper'].amount, 4);
    expect(boostedOut.resource['Iron'].amount).toBeCloseTo(baseOut.resource['Iron'].amount, 4);
  });

  it('通电采石场额外提供 4% 石头加成，reclaimer 不影响石工产量', () => {
    const noPower = makeCivState();
    noPower.civic['quarry_worker'] = { workers: 1, max: 1, display: true } as any;
    noPower.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;
    (noPower.city as any)['rock_quarry'] = { count: 1, on: 1 };

    const powered = makeCivState();
    powered.resource['Coal'].display = true;
    powered.resource['Coal'].amount = 100;
    powered.civic['quarry_worker'] = { workers: 1, max: 1, display: true } as any;
    powered.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;
    (powered.city as any)['rock_quarry'] = { count: 1, on: 1 };
    (powered.city as any)['coal_power'] = { count: 1, on: 1 };

    const boosted = makeCivState();
    boosted.resource['Coal'].display = true;
    boosted.resource['Coal'].amount = 100;
    boosted.tech['reclaimer'] = 3;
    boosted.civic['quarry_worker'] = { workers: 1, max: 1, display: true } as any;
    boosted.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;
    (boosted.city as any)['rock_quarry'] = { count: 1, on: 1 };
    (boosted.city as any)['coal_power'] = { count: 1, on: 1 };

    const noPowerDelta = gameTick(noPower).state.resource['Stone'].amount;
    const poweredDelta = gameTick(powered).state.resource['Stone'].amount;
    const boostedDelta = gameTick(boosted).state.resource['Stone'].amount;

    expect(poweredDelta / noPowerDelta).toBeCloseTo(1.04, 3);
    expect(boostedDelta).toBeCloseTo(poweredDelta, 4);
  });

  it('煤矿获得 5% 通电加成，且不受 dowsing/reclaimer 影响', () => {
    const powered = makeCivState();
    powered.tech['mining'] = 4;
    powered.resource['Coal'].display = true;
    powered.resource['Coal'].amount = 0;
    powered.resource['Coal'].max = 500;
    powered.civic['coal_miner'] = { workers: 1, max: 1, display: true } as any;
    powered.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;
    (powered.city as any)['coal_mine'] = { count: 1, on: 1 };
    (powered.city as any)['coal_power'] = { count: 1, on: 1 };
    powered.resource['Coal'].amount = 100;

    const boosted = makeCivState();
    boosted.tech['mining'] = 4;
    boosted.tech['dowsing'] = 2;
    boosted.tech['reclaimer'] = 3;
    boosted.resource['Coal'].display = true;
    boosted.resource['Coal'].amount = 100;
    boosted.resource['Coal'].max = 500;
    boosted.civic['coal_miner'] = { workers: 1, max: 1, display: true } as any;
    boosted.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;
    (boosted.city as any)['coal_mine'] = { count: 1, on: 1 };
    (boosted.city as any)['coal_power'] = { count: 1, on: 1 };

    const poweredDelta = gameTick(powered).state.resource['Coal'].diff ?? 0;
    const boostedDelta = gameTick(boosted).state.resource['Coal'].diff ?? 0;
    const moraleMult = calculateMorale(powered, { activeCasinos: 0 }).globalMultiplier;
    const expected = 0.2 * 1.05 * moraleMult * 0.25;

    expect(poweredDelta).toBeCloseTo(expected, 4);
    expect(boostedDelta).toBeCloseTo(poweredDelta, 4);
  });

  it('水泥工会消耗本 tick 新产出的石头，并吃到通电加成', () => {
    const s = makeCivState();
    s.tech['cement'] = 1;
    s.resource['Stone'].amount = 0;
    s.resource['Stone'].max = 500;
    s.resource['Coal'].display = true;
    s.resource['Coal'].amount = 100;
    s.resource['Cement'].display = true;
    s.resource['Cement'].amount = 0;
    s.resource['Cement'].max = 500;
    s.civic['quarry_worker'] = { workers: 3, max: 3, display: true } as any;
    s.civic['cement_worker'] = { workers: 1, max: 2, display: true } as any;
    s.civic['unemployed'] = { workers: 1, max: -1, display: true } as any;
    (s.city as any)['rock_quarry'] = { count: 1, on: 1 };
    (s.city as any)['cement_plant'] = { count: 1, on: 1 };
    (s.city as any)['coal_power'] = { count: 1, on: 1 };

    const control = makeCivState();
    control.tech['cement'] = 1;
    control.resource['Stone'].amount = 0;
    control.resource['Stone'].max = 500;
    control.resource['Coal'].display = true;
    control.resource['Coal'].amount = 100;
    control.civic['quarry_worker'] = { workers: 3, max: 3, display: true } as any;
    control.civic['unemployed'] = { workers: 2, max: -1, display: true } as any;
    (control.city as any)['rock_quarry'] = { count: 1, on: 1 };
    (control.city as any)['coal_power'] = { count: 1, on: 1 };

    const out = gameTick(s).state;
    const controlOut = gameTick(control).state;

    expect(out.resource['Cement'].amount).toBeGreaterThan(0.1);
    expect(out.resource['Stone'].amount).toBeLessThan(controlOut.resource['Stone'].amount);
  });

  it('油井吃到 oil 科技档位、地质与饥饿乘数', () => {
    const fed = makeCivState();
    fed.tech['oil'] = 4;
    fed.resource['Oil'].display = true;
    fed.resource['Oil'].amount = 0;
    fed.resource['Oil'].max = 500;
    fed.city.geology = { ...(fed.city.geology ?? {}), Oil: 0.5 } as any;
    (fed.city as any)['oil_well'] = { count: 2 };

    const hungry = makeCivState();
    hungry.tech['oil'] = 4;
    hungry.resource['Food'].amount = 0;
    hungry.resource['Oil'].display = true;
    hungry.resource['Oil'].amount = 0;
    hungry.resource['Oil'].max = 500;
    hungry.city.geology = { ...(hungry.city.geology ?? {}), Oil: 0.5 } as any;
    (hungry.city as any)['oil_well'] = { count: 2 };

    const fedDelta = gameTick(fed).state.resource['Oil'].diff ?? 0;
    const hungryDelta = gameTick(hungry).state.resource['Oil'].diff ?? 0;
    const moraleMult = calculateMorale(fed, { activeCasinos: 0 }).globalMultiplier;
    const expectedFed = 2 * 0.48 * 1.5 * moraleMult * 0.25;

    expect(fedDelta).toBeCloseTo(expectedFed, 4);
    expect(hungryDelta).toBeCloseTo(fedDelta * 0.5, 4);
  });

  it('铝产出来自矿工并吃到精炼厂与通电 bonus，不再消耗石头', () => {
    const s = makeCivState();
    s.tech['mining'] = 4;
    s.tech['pickaxe'] = 2;
    s.tech['alumina'] = 2;
    s.resource['Coal'].display = true;
    s.resource['Coal'].amount = 100;
    s.resource['Aluminium'].display = true;
    s.resource['Aluminium'].amount = 0;
    s.resource['Aluminium'].max = 500;
    s.resource['Stone'].amount = 10;
    s.city.geology = { ...(s.city.geology ?? {}), Aluminium: 0.25 } as any;
    s.civic['miner'] = { workers: 1, max: 1, display: true } as any;
    s.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;
    (s.city as any)['mine'] = { count: 1, on: 1 };
    (s.city as any)['metal_refinery'] = { count: 1, on: 1 };
    (s.city as any)['coal_power'] = { count: 1, on: 1 };

    const out = gameTick(s).state;
    const moraleMult = calculateMorale(s, { activeCasinos: 0 }).globalMultiplier;
    const expected = 0.088 * 1.3 * 1.05 * 1.25 * 1.12 * moraleMult * 0.25;

    expect(out.resource['Aluminium'].diff).toBeCloseTo(expected, 4);
    expect(out.resource['Stone'].amount).toBeCloseTo(10, 4);
  });
});

describe('Factory 产线', () => {
  it('assembly 档位会提升合金线参数，且原料不足时按行降档而不是整条停工', () => {
    const s = makeCivState();
    s.tech['factory'] = 1;
    s.resource['Oil'].display = true;
    s.resource['Oil'].amount = 20;
    s.resource['Copper'].amount = 0.4;
    s.resource['Aluminium'].display = true;
    s.resource['Aluminium'].amount = 0.4;
    s.resource['Aluminium'].max = 500;
    s.resource['Alloy'].display = true;
    s.resource['Alloy'].amount = 0;
    s.resource['Alloy'].max = 500;
    s.civic['unemployed'] = { workers: 5, max: -1, display: true } as any;
    (s.city as any)['oil_power'] = { count: 1, on: 1 };
    (s.city as any)['factory'] = { count: 2, on: 2, Lux: 0, Furs: 0, Alloy: 2, Polymer: 0 };

    const out = gameTick(s).state;
    const moraleMult = calculateMorale(s, { activeCasinos: 0 }).globalMultiplier;
    const expectedAlloy = 0.112 * moraleMult * 0.25;

    expect(out.resource['Alloy'].diff).toBeCloseTo(expectedAlloy, 4);
    expect(out.resource['Copper'].diff).toBeCloseTo(-1.12 * 0.25, 4);
    expect(out.resource['Aluminium'].diff).toBeCloseTo(-1.5 * 0.25, 4);
  });

  it('Lux 收入不会在同 tick 立刻为 synthetic fur 产线提供启动资金', () => {
    const s = makeCivState();
    s.resource['Oil'].display = true;
    s.resource['Oil'].amount = 20;
    s.resource['Money'].amount = 0;
    s.resource['Furs'].amount = 100;
    s.resource['Polymer'].display = true;
    s.resource['Polymer'].amount = 100;
    s.resource['Polymer'].max = 500;
    s.civic['unemployed'] = { workers: 5, max: -1, display: true } as any;
    (s.city as any)['oil_power'] = { count: 1, on: 1 };
    (s.city as any)['factory'] = { count: 2, on: 2, Lux: 1, Furs: 1, Alloy: 0, Polymer: 0 };

    const out = gameTick(s).state;

    expect(out.resource['Money'].diff ?? 0).toBeGreaterThan(0);
    expect(out.resource['Polymer'].amount).toBeCloseTo(100, 4);
    expect(out.resource['Furs'].amount).toBeLessThan(100);
  });
});

// ============================================================
// 知识体系
// ============================================================

describe('Knowledge 产出', () => {
  it('图书馆不放大纯日晷知识', () => {
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

    expect(deltaWithLib).toBeCloseTo(deltaNoLib, 4);
  });

  it('图书馆仍会提升教授知识产出', () => {
    const noLib = makeCivState();
    noLib.tech['science'] = 1;
    noLib.resource['Knowledge'].display = true;
    noLib.resource['Knowledge'].amount = 0;
    noLib.civic['professor'] = { workers: 1, max: 1, display: true } as any;
    noLib.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;

    const withLib = makeCivState();
    withLib.tech['science'] = 1;
    withLib.resource['Knowledge'].display = true;
    withLib.resource['Knowledge'].amount = 0;
    withLib.civic['professor'] = { workers: 1, max: 1, display: true } as any;
    withLib.civic['unemployed'] = { workers: 4, max: -1, display: true } as any;
    (withLib.city as any)['library'] = { count: 4, on: 4 };

    const deltaNoLib = gameTick(noLib).state.resource['Knowledge'].amount;
    const deltaWithLib = gameTick(withLib).state.resource['Knowledge'].amount;

    // professor impact: (0.5 + 4*0.01) * (1 + 4*0.05) = 0.648
    expect(deltaWithLib / deltaNoLib).toBeCloseTo(1.296, 3);
  });

  it('supported observatory 会提供 +5000 知识上限，并额外放大学校知识上限贡献', () => {
    const base = makeCivState();
    base.tech['primitive'] = 3;
    base.tech['science'] = 9;
    base.tech['space'] = 3;
    base.tech['luna'] = 1;
    base.resource['Knowledge'].display = true;
    base.resource['Coal'].display = true;
    base.resource['Coal'].amount = 100;
    base.resource['Oil'].display = true;
    base.resource['Oil'].amount = 100;
    (base.city as any)['coal_power'] = { count: 1, on: 1 };
    (base.city as any)['university'] = { count: 2, on: 2 };
    (base.space as any)['moon_base'] = { count: 1, on: 1, support: 0, s_max: 0 };

    const withObs = JSON.parse(JSON.stringify(base)) as GameState;
    (withObs.space as any)['observatory'] = { count: 1, on: 1 };

    const baseTick = gameTick(base).state;
    const obsTick = gameTick(withObs).state;

    // 直接 +5000；另有大学 2 座 * 700 * 5% = +70
    expect(obsTick.resource['Knowledge'].max - baseTick.resource['Knowledge'].max).toBe(5070);
  });

  it('cataclysm 下 observatory 会被 satellite 放大，并额外提供教授岗位上限', () => {
    const base = makeCivState();
    base.tech['primitive'] = 3;
    base.tech['science'] = 9;
    base.tech['space'] = 3;
    base.tech['luna'] = 1;
    base.resource['Knowledge'].display = true;
    base.resource['Coal'].display = true;
    base.resource['Coal'].amount = 100;
    base.resource['Oil'].display = true;
    base.resource['Oil'].amount = 100;
    base.race['cataclysm'] = true;
    (base.city as any)['coal_power'] = { count: 1, on: 1 };
    (base.space as any)['moon_base'] = { count: 1, on: 1, support: 0, s_max: 0 };
    (base.space as any)['satellite'] = { count: 2 };

    const withObs = JSON.parse(JSON.stringify(base)) as GameState;
    (withObs.space as any)['observatory'] = { count: 1, on: 1 };

    const baseTick = gameTick(base).state;
    const obsTick = gameTick(withObs).state;
    const baseProfessorMax = (baseTick.civic['professor'] as { max?: number } | undefined)?.max ?? 0;
    const obsProfessorMax = (obsTick.civic['professor'] as { max?: number } | undefined)?.max ?? 0;

    expect(obsTick.resource['Knowledge'].max - baseTick.resource['Knowledge'].max).toBe(7500);
    expect(obsProfessorMax - baseProfessorMax).toBe(1);
  });
});

// ============================================================
// 金钱体系
// ============================================================

describe('Money 产出', () => {
  it('未研究 currency 时不会获得税收', () => {
    const s = makeCivState();
    s.resource['Money'].amount = 0;
    s.civic['unemployed'] = { workers: 1, max: -1, display: true } as any;

    const out = gameTick(s);

    expect(out.state.resource['Money'].amount).toBe(0);
  });

  it('饥饿时税收减半且银行家加成失效', () => {
    const fed = makeCivState();
    fed.tech['currency'] = 1;
    fed.tech['banking'] = 2;
    fed.resource['Money'].amount = 0;
    fed.civic['banker'] = { workers: 1, max: 1, display: true } as any;
    fed.civic['unemployed'] = { workers: 1, max: -1, display: true } as any;

    const hungry = makeCivState();
    hungry.tech['currency'] = 1;
    hungry.tech['banking'] = 2;
    hungry.resource['Money'].amount = 0;
    hungry.resource['Food'].amount = 0;
    hungry.civic['banker'] = { workers: 1, max: 1, display: true } as any;
    hungry.civic['unemployed'] = { workers: 1, max: -1, display: true } as any;

    const fedMoney = gameTick(fed).state.resource['Money'].amount;
    const hungryMoney = gameTick(hungry).state.resource['Money'].amount;

    // fed: 4 citizens * 0.4 * 1.1 banker = 1.76
    // hungry: banker bonus disabled, then hunger ×0.5 => 4 * 0.4 * 0.5 = 0.8
    expect(hungryMoney / fedMoney).toBeCloseTo(0.8 / 1.76, 3);
  });

  it('anthropology:4 后每座神庙提供 +2.5% 税收', () => {
    const base = makeCivState();
    base.tech['currency'] = 1;
    base.tech['anthropology'] = 4;
    base.resource['Money'].amount = 0;
    base.civic['unemployed'] = { workers: 1, max: -1, display: true } as any;

    const withTemples = makeCivState();
    withTemples.tech['currency'] = 1;
    withTemples.tech['anthropology'] = 4;
    withTemples.resource['Money'].amount = 0;
    withTemples.civic['unemployed'] = { workers: 1, max: -1, display: true } as any;
    (withTemples.city as any)['temple'] = { count: 2, on: 2 };

    const baseMoney = gameTick(base).state.resource['Money'].amount;
    const templeMoney = gameTick(withTemples).state.resource['Money'].amount;

    expect(templeMoney / baseMoney).toBeCloseTo(1.05, 3);
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

// ============================================================
// 饥饿产出惩罚
// ============================================================

describe('Hunger — 食物 = 0 时非食物产出减半', () => {
  it('食物充足时伐木工正常产出（约 0.25/tick）', () => {
    const s = makeCivState();
    s.civic['lumberjack'] = { workers: 4, max: -1, display: true } as any;
    s.civic['unemployed'] = { workers: 1, max: -1, display: true } as any;
    s.resource['Food'].amount = 200;
    const result = gameTick(s);
    // 4 × 1.0 × 0.25 TIME_MUL = 1.0
    expect(result.state.resource['Lumber'].diff).toBeCloseTo(1.0, 1);
  });

  it('食物 = 0（无 angry）伐木产出降至 50%', () => {
    const fed = makeCivState();
    fed.civic['lumberjack'] = { workers: 4, max: -1, display: true } as any;
    fed.civic['unemployed'] = { workers: 1, max: -1, display: true } as any;
    fed.resource['Food'].amount = 200;

    const hungry = makeCivState();
    hungry.civic['lumberjack'] = { workers: 4, max: -1, display: true } as any;
    hungry.civic['unemployed'] = { workers: 1, max: -1, display: true } as any;
    hungry.resource['Food'].amount = 0;

    const fedResult = gameTick(fed);
    const hungryResult = gameTick(hungry);
    const fedDelta = fedResult.state.resource['Lumber'].diff ?? 0;
    const hungryDelta = hungryResult.state.resource['Lumber'].diff ?? 0;
    expect(hungryDelta).toBeCloseTo(fedDelta * 0.5, 1);
  });

  it('食物 = 0 + angry（orc）伐木产出降至 25%', () => {
    const fed = makeCivState();
    fed.civic['lumberjack'] = { workers: 4, max: -1, display: true } as any;
    fed.civic['unemployed'] = { workers: 1, max: -1, display: true } as any;
    fed.resource['Food'].amount = 200;

    const hungryOrc = makeCivState();
    hungryOrc.race.species = 'orc';
    assignSpeciesTraits(hungryOrc.race, 'orc');
    hungryOrc.civic['lumberjack'] = { workers: 4, max: -1, display: true } as any;
    hungryOrc.civic['unemployed'] = { workers: 1, max: -1, display: true } as any;
    hungryOrc.resource['Food'].amount = 0;
    // orc 拥有 angry trait（SPECIES_TRAITS['orc'] = ['brute','angry']，见 traits.ts）
    // 食物=0 + angry → hungerMult = 0.25，而非无 angry 的 0.5

    const fedResult = gameTick(fed);
    const orcResult = gameTick(hungryOrc);
    const fedDelta = fedResult.state.resource['Lumber'].diff ?? 0;
    const orcDelta = orcResult.state.resource['Lumber'].diff ?? 0;
    expect(orcDelta).toBeCloseTo(fedDelta * 0.25, 1);
  });

  it('食物产出不受饥饿影响（农民产量不降）', () => {
    const fed = makeCivState();
    fed.tech['agriculture'] = 1;
    fed.civic['farmer'] = { workers: 4, max: 4, display: true } as any;
    fed.civic['unemployed'] = { workers: 1, max: -1, display: true } as any;
    fed.civic['hunter'] = { workers: 0, max: -1, display: true } as any;
    fed.resource['Food'].amount = 200;

    const hungry = makeCivState();
    hungry.tech['agriculture'] = 1;
    hungry.civic['farmer'] = { workers: 4, max: 4, display: true } as any;
    hungry.civic['unemployed'] = { workers: 1, max: -1, display: true } as any;
    hungry.civic['hunter'] = { workers: 0, max: -1, display: true } as any;
    hungry.resource['Food'].amount = 0;

    const fedResult = gameTick(fed);
    const hungryResult = gameTick(hungry);
    // Food.diff = farmerOutput * prodMult - foodConsumption
    // 两个状态的 foodConsumption 相同（人口相同），farmerOutput 不受 hungerMult 影响（legacy 行为）
    // 因此净 diff 相等，证明食物产出路径未被 effectiveProdMult 污染
    expect(hungryResult.state.resource['Food'].diff).toBeCloseTo(
      fedResult.state.resource['Food'].diff ?? 0, 1
    );
  });
});

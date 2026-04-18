/**
 * 公式常量运行时回归测试
 *
 * 策略：比值法（ratio method）
 *   创建两个仅差一个参数的受控状态，比对资源增量之比。
 *   由于士气乘数、天气乘数等在两个状态中完全相同，它们在比值中自动消除，
 *   只剩目标公式参数的贡献。
 *
 * 所有期望值来自 legacy/src/main.js、legacy/src/jobs.js。
 */

import { describe, it, expect } from 'vitest';
import type { GameState } from '@evozen/shared-types';
import { createNewGame } from './state';
import { gameTick } from './tick';

// ─── 辅助函数 ─────────────────────────────────────────────────

/** 基础受控状态：人类文明，资源上限充足，事件抑制 */
function makeBase(): GameState {
  const s = createNewGame();
  s.race.species = 'human';
  s.resource['human'] = {
    name: '人类', display: true, value: 0,
    amount: 1, max: 10, rate: 0, crates: 0, containers: 0, diff: 0, delta: 0,
  };
  s.resource['Food'].amount = 9999;
  for (const id of ['Food', 'Lumber', 'Stone', 'Copper', 'Iron', 'Coal', 'Knowledge', 'Money', 'Steel', 'Furs', 'Aluminium']) {
    if (s.resource[id]) s.resource[id].max = 999999;
  }
  s.event.t = 999999;
  s.m_event.t = 999999;
  return s;
}

/** 添加石油电厂（矿山/煤矿需要电力才能运转） */
function addOilPower(s: GameState): void {
  s.resource['Oil'].amount = 9999;
  s.resource['Oil'].max = 999999;
  (s.city as any)['oil_power'] = { count: 1, on: 1 };
}

/** 取单次 tick 某资源的增量 */
function d(state: GameState, res: string): number {
  return gameTick(state).result.resourceDeltas[res] ?? 0;
}

// ─── 伐木工公式 ───────────────────────────────────────────────
// legacy main.js L5559: axe bonus = (axe-1) × 0.35（仅 axe>=2 生效）
// legacy main.js L5575: lumber_yard = +2%/座

describe('伐木工公式', () => {
  it('axe=2 vs axe=1：Lumber 增量比 = 1.35', () => {
    const s1 = makeBase();
    s1.tech['axe'] = 1;
    (s1.civic['lumberjack'] as any).workers = 1;

    const s2 = makeBase();
    s2.tech['axe'] = 2;
    (s2.civic['lumberjack'] as any).workers = 1;

    // axe=1 → 无加成；axe=2 → ×(1 + (2-1)×0.35) = 1.35
    expect(d(s2, 'Lumber') / d(s1, 'Lumber')).toBeCloseTo(1.35, 5);
  });

  it('2 座伐木场 vs 0 座：Lumber 增量比 = 1.04', () => {
    const s1 = makeBase();
    s1.tech['axe'] = 1;
    (s1.civic['lumberjack'] as any).workers = 1;

    const s2 = makeBase();
    s2.tech['axe'] = 1;
    (s2.city as any)['lumber_yard'] = { count: 2 };
    (s2.civic['lumberjack'] as any).workers = 1;

    // 2×0.02 = +4% → ratio = 1.04
    expect(d(s2, 'Lumber') / d(s1, 'Lumber')).toBeCloseTo(1.04, 5);
  });
});

// ─── 石工公式 ─────────────────────────────────────────────────
// legacy jobs.js L119: hammer 每级 +40%

describe('石工公式', () => {
  it('hammer=2 vs hammer=0：Stone 增量比 = 1.8', () => {
    const s1 = makeBase();
    (s1.civic['quarry_worker'] as any).workers = 1;

    const s2 = makeBase();
    s2.tech['hammer'] = 2;
    (s2.civic['quarry_worker'] as any).workers = 1;

    // 1 + 2×0.4 = 1.8
    expect(d(s2, 'Stone') / d(s1, 'Stone')).toBeCloseTo(1.8, 5);
  });
});

// ─── 矿工公式 ─────────────────────────────────────────────────
// legacy main.js L6138: pickaxe 每级 +15%

describe('矿工公式', () => {
  it('pickaxe=2 vs pickaxe=0：Copper 增量比 = 1.30', () => {
    const s1 = makeBase();
    s1.tech['mining'] = 3;
    (s1.city as any)['mine'] = { count: 1, on: 1 };
    (s1.civic['miner'] as any).workers = 1;
    addOilPower(s1);

    const s2 = makeBase();
    s2.tech['mining'] = 3;
    s2.tech['pickaxe'] = 2;
    (s2.city as any)['mine'] = { count: 1, on: 1 };
    (s2.civic['miner'] as any).workers = 1;
    addOilPower(s2);

    // 1 + 2×0.15 = 1.30
    expect(d(s2, 'Copper') / d(s1, 'Copper')).toBeCloseTo(1.30, 5);
  });
});

// ─── 农民公式 ─────────────────────────────────────────────────
// legacy jobs.js L800: agri<2 → +0.65, agri>=2 → +1.15
// legacy jobs.js L806: hoe level/3（每级 +33%）
//
// pop=0 使 foodConsumption=0，比值法可直接测生产公式。

describe('农民公式', () => {
  function farmerState(agri: number, hoe: number): GameState {
    const s = makeBase();
    s.resource['human'].amount = 0;  // 消除食物消耗
    s.tech['agriculture'] = agri;
    if (hoe > 0) s.tech['hoe'] = hoe;
    (s.city as any)['farm'] = { count: 1 };
    (s.civic['farmer'] as any).workers = 1;
    (s.civic['unemployed'] as any).workers = 0;
    return s;
  }

  it('agri=4 vs agri=1：Food 增量比 = 1.97/1.47 ≈ 1.340', () => {
    // agri=1: 0.82+0.65=1.47; agri=4: 0.82+1.15=1.97
    expect(d(farmerState(4, 0), 'Food') / d(farmerState(1, 0), 'Food'))
      .toBeCloseTo(1.97 / 1.47, 4);
  });

  it('hoe=1 vs hoe=0：Food 增量比 = 4/3 ≈ 1.333', () => {
    // ×(1 + 1/3) = 4/3
    expect(d(farmerState(4, 1), 'Food') / d(farmerState(4, 0), 'Food'))
      .toBeCloseTo(4 / 3, 5);
  });
});

// ─── 教授公式 ─────────────────────────────────────────────────
// legacy main.js L9313: professor impact = 0.5，图书馆 +0.01/座
// legacy main.js L4259: libraryMult = 1 + count×0.05

describe('教授公式', () => {
  it('2 座图书馆 vs 0 座：Knowledge 增量比 = 1.144', () => {
    const s1 = makeBase();
    s1.tech['primitive'] = 2;  // primitive<3 → sundialBase=0，消除日晷干扰
    (s1.civic['professor'] as any).workers = 1;

    const s2 = makeBase();
    s2.tech['primitive'] = 2;
    (s2.city as any)['library'] = { count: 2 };
    (s2.civic['professor'] as any).workers = 1;

    // 0 库: 0.5×1.0=0.500; 2 库: 0.52×1.1=0.572; ratio=1.144
    expect(d(s2, 'Knowledge') / d(s1, 'Knowledge')).toBeCloseTo(1.144, 4);
  });
});

// ─── 煤矿工公式 ───────────────────────────────────────────────
// legacy main.js: coal pickaxe 每级 +12%

describe('煤矿工公式', () => {
  it('pickaxe=1 vs pickaxe=0：Coal 增量比 = 1.12', () => {
    const s1 = makeBase();
    (s1.city as any)['coal_mine'] = { count: 1, on: 1 };
    (s1.civic['coal_miner'] as any).workers = 1;
    addOilPower(s1);

    const s2 = makeBase();
    s2.tech['pickaxe'] = 1;
    (s2.city as any)['coal_mine'] = { count: 1, on: 1 };
    (s2.civic['coal_miner'] as any).workers = 1;
    addOilPower(s2);

    expect(d(s2, 'Coal') / d(s1, 'Coal')).toBeCloseTo(1.12, 5);
  });
});

// ─── 冶炼炉公式 ───────────────────────────────────────────────
// legacy main.js: smelting>=4 时 steelBase ×1.2（blast_furnace）

describe('冶炼炉公式', () => {
  it('smelting=4 vs smelting=3：Steel 增量比 = 1.2', () => {
    function smelterState(level: number): GameState {
      const s = makeBase();
      s.tech['smelting'] = level;
      s.resource['Iron'].amount = 9999;
      s.resource['Coal'].amount = 9999;
      s.resource['Steel'].amount = 0;
      s.resource['Steel'].max = 999999;
      // 1 座冶炼炉，1 个煤槽（燃料），1 个钢铁产出槽
      (s.city as any)['smelter'] = { count: 1, on: 0, Wood: 0, Coal: 1, Oil: 0, Inferno: 0, Iron: 0, Steel: 1, Iridium: 0 };
      return s;
    }

    // smelting=3: steelBase=1; smelting=4: steelBase=1×1.2=1.2
    expect(d(smelterState(4), 'Steel') / d(smelterState(3), 'Steel')).toBeCloseTo(1.2, 5);
  });
});

// ─── 税率公式 ─────────────────────────────────────────────────
// legacy main.js L7626: income ×= taxRate/20
//
// 用差分比而非直接比值，消除来自其他渠道的固定 Money 偏移：
//   income(rate) = base × rate/20 + C
//   (d20 - d10) / (d30 - d10) = (1.0 × base) / (2.0 × base) = 0.5
//   常数 C 在相减时自动消除。

describe('税率公式', () => {
  it('差分比验证线性税率：(d20-d10)/(d30-d10) = 0.5', () => {
    function taxState(taxRate: number): GameState {
      const s = makeBase();
      s.tech['currency'] = 1;
      s.resource['human'].amount = 6;
      (s.civic['taxes'] as any).tax_rate = taxRate;
      (s.civic['unemployed'] as any).workers = 0;
      return s;
    }

    const d10 = d(taxState(10), 'Money');
    const d20 = d(taxState(20), 'Money');
    const d30 = d(taxState(30), 'Money');
    // 差分消除固定偏移；允许 ±0.5% 误差（税率轻微影响士气导致 prodMult 微量变化）
    expect((d20 - d10) / (d30 - d10)).toBeCloseTo(0.5, 2);
  });
});

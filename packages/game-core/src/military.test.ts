/**
 * military.ts 单元测试
 */
import { describe, it, expect } from 'vitest';
import { createNewGame } from './state';
import { assignSpeciesTraits } from './traits';
import { tickTraining, mercCost } from './military';
import type { GameState } from '@evozen/shared-types';

function makeGarrisonState(species: string): GameState {
  const s = createNewGame();
  s.race.species = species;
  assignSpeciesTraits(s.race, species);
  s.resource[species] = {
    name: species, display: true, value: 0,
    amount: 10, max: 10, rate: 0, crates: 0, diff: 0, delta: 0,
  };
  s.civic.garrison = {
    workers: 0, max: 5, wounded: 0, raid: 0,
    mercs: false, m_use: 0, rate: 0, progress: 0,
  } as any;
  (s.civic.unemployed as any).workers = 5;
  return s;
}

describe('tickTraining — diverse (human)', () => {
  it('human 训练速度 = 2.0（baseline 2.5 / 1.25）', () => {
    const s = makeGarrisonState('human');
    tickTraining(s, 1);
    expect(s.civic.garrison.rate).toBeCloseTo(2.0);
  });

  it('human 比 elven 训练更慢', () => {
    const human = makeGarrisonState('human');
    const elven = makeGarrisonState('elven');
    tickTraining(human, 1);
    tickTraining(elven, 1);
    expect(human.civic.garrison.rate).toBeLessThan(elven.civic.garrison.rate!);
  });
});

describe('tickTraining — brute (orc)', () => {
  it('elven（无 trait）baseline rate = 2.5', () => {
    const s = makeGarrisonState('elven');
    tickTraining(s, 1);
    expect(s.civic.garrison.rate).toBeCloseTo(2.5);
  });

  it('orc 训练速度 = 5.0（2.5 基础 + 2.5 brute 加成）', () => {
    const s = makeGarrisonState('orc');
    tickTraining(s, 1);
    expect(s.civic.garrison.rate).toBeCloseTo(5.0);
  });

  it('orc 比 elven 训练更快', () => {
    const orc = makeGarrisonState('orc');
    const elven = makeGarrisonState('elven');
    tickTraining(orc, 1);
    tickTraining(elven, 1);
    expect(orc.civic.garrison.rate).toBeGreaterThan(elven.civic.garrison.rate!);
  });

  it('orc 训练速度随 timeMul 缩放', () => {
    const s = makeGarrisonState('orc');
    tickTraining(s, 0.25);
    // (2.5 / 1) * 0.25 + (100/40) * 0.25 = 0.625 + 0.625 = 1.25
    expect(s.civic.garrison.rate).toBeCloseTo(1.25);
  });
});

describe('mercCost — brute (orc)', () => {
  it('garrison=0 时 orc 费用约为 human 的一半', () => {
    const orc = makeGarrisonState('orc');
    const human = makeGarrisonState('human');
    // base cost = round(1.24^0 * 75) - 50 = 25; orc: round(25 * 0.5) = 13
    const orcCost = mercCost(orc);
    const humanCost = mercCost(human);
    // 允许 ±1 的整数舍入误差
    expect(orcCost).toBeGreaterThanOrEqual(Math.floor(humanCost * 0.5) - 1);
    expect(orcCost).toBeLessThanOrEqual(Math.ceil(humanCost * 0.5) + 1);
  });

  it('garrison=5 时 orc 费用约为 human 的一半', () => {
    const orc = makeGarrisonState('orc');
    const human = makeGarrisonState('human');
    orc.civic.garrison.workers = 5;
    human.civic.garrison.workers = 5;
    const orcCost = mercCost(orc);
    const humanCost = mercCost(human);
    // 允许 ±1 的整数舍入误差
    expect(orcCost).toBeGreaterThanOrEqual(Math.floor(humanCost * 0.5) - 1);
    expect(orcCost).toBeLessThanOrEqual(Math.ceil(humanCost * 0.5) + 1);
  });

  it('m_use escalation 之后再应用 brute 折扣', () => {
    const orc = makeGarrisonState('orc');
    orc.civic.garrison.workers = 0;
    orc.civic.garrison.m_use = 3;
    const human = makeGarrisonState('human');
    human.civic.garrison.workers = 0;
    human.civic.garrison.m_use = 3;
    // 两者都有相同 m_use escalation，orc 是 human 的一半（允许 ±1 舍入误差）
    const orcCost = mercCost(orc);
    const humanCost = mercCost(human);
    expect(orcCost).toBeGreaterThanOrEqual(Math.floor(humanCost * 0.5) - 1);
    expect(orcCost).toBeLessThanOrEqual(Math.ceil(humanCost * 0.5) + 1);
  });
});

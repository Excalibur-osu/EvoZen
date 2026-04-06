/**
 * traits.ts — 新种族特质 helper 单元测试
 */
import { describe, it, expect } from 'vitest';
import { createNewGame } from './state';
import {
  assignSpeciesTraits,
  getTrainingSpeedDivisor,
  getBruteTrainingBonus,
  getMercCostMultiplier,
  getHungerMultiplier,
} from './traits';
import type { GameState } from '@evozen/shared-types';

function makeState(species: string, foodAmount = 100): GameState {
  const s = createNewGame();
  s.race.species = species;
  assignSpeciesTraits(s.race, species);
  const food = s.resource['Food'];
  if (!food) throw new Error('createNewGame() 未初始化 Food 资源');
  food.amount = foodAmount;
  return s;
}

describe('getTrainingSpeedDivisor', () => {
  it('human (diverse) 返回 1.25', () => {
    expect(getTrainingSpeedDivisor(makeState('human'))).toBe(1.25);
  });
  it('orc (无 diverse) 返回 1', () => {
    expect(getTrainingSpeedDivisor(makeState('orc'))).toBe(1);
  });
  it('elven 返回 1', () => {
    expect(getTrainingSpeedDivisor(makeState('elven'))).toBe(1);
  });
});

describe('getBruteTrainingBonus', () => {
  it('orc (brute) timeMul=1 → 2.5', () => {
    expect(getBruteTrainingBonus(makeState('orc'), 1)).toBe(2.5);
  });
  it('orc (brute) timeMul=0.25 → 0.625', () => {
    expect(getBruteTrainingBonus(makeState('orc'), 0.25)).toBe(0.625);
  });
  it('human (无 brute) → 0', () => {
    expect(getBruteTrainingBonus(makeState('human'), 1)).toBe(0);
  });
});

describe('getMercCostMultiplier', () => {
  it('orc (brute) → 0.5', () => {
    expect(getMercCostMultiplier(makeState('orc'))).toBe(0.5);
  });
  it('human (无 brute) → 1', () => {
    expect(getMercCostMultiplier(makeState('human'))).toBe(1);
  });
});

describe('getHungerMultiplier', () => {
  it('食物 > 0 → 1（无饥饿）', () => {
    expect(getHungerMultiplier(makeState('orc', 100))).toBe(1);
  });
  it('食物 = 0，无 angry → 0.5', () => {
    expect(getHungerMultiplier(makeState('human', 0))).toBe(0.5);
  });
  it('食物 = 0，orc (angry) → 0.25', () => {
    expect(getHungerMultiplier(makeState('orc', 0))).toBe(0.25);
  });
  it('食物 = 0，elven (无 angry) → 0.5', () => {
    expect(getHungerMultiplier(makeState('elven', 0))).toBe(0.5);
  });
});

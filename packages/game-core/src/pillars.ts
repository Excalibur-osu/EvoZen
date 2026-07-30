import type { GameState } from '@evozen/shared-types';
import { RACES, type RaceId } from './races';

/** 原版 calcPillar 的 active 值：其他物种 +1，当前物种合计 +4。 */
export function getPillarStrength(state: GameState): number {
  let strength = 0;
  for (const species of Object.keys(state.pillars)) {
    if (!RACES[species as RaceId]) continue;
    strength += species === state.race.species ? 4 : 1;
  }
  return strength;
}

export function getPillarProductionMultiplier(state: GameState): number {
  return 1 + getPillarStrength(state) / 100;
}

export function getPillarStorageMultiplier(state: GameState): number {
  return 1 + getPillarStrength(state) * 0.02;
}

/** 对标 spatialReasoning() 的石柱仓储乘区及整数舍入。 */
export function applyPillarStorageBonus(state: GameState, value: number): number {
  return Math.round(value * getPillarStorageMultiplier(state));
}

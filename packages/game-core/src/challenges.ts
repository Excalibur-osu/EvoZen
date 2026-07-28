import type { GameState } from '@evozen/shared-types';
import { TRADE_RATIOS } from './resources';

function hasRaceFlag(state: GameState, flag: string): boolean {
  return Object.prototype.hasOwnProperty.call(state.race, flag);
}

export interface EmfieldTickState {
  active: boolean;
  emfield: number;
  discharge: number;
}

/**
 * E.M. 磁场挑战的稳定/放电周期。
 * emfield 记录连续稳定 tick，触发后用相同 tick 数进行放电。
 */
export function advanceEmfieldChallenge(
  state: GameState,
  random: () => number = Math.random,
): EmfieldTickState | null {
  if (!hasRaceFlag(state, 'emfield')) return null;

  let emfield = Math.max(1, Number(state.race['emfield']) || 1);
  let discharge = Math.max(0, Number(state.race['discharge']) || 0);

  if (discharge > 0) {
    discharge--;
  } else {
    emfield++;
    if (Math.floor(random() * 501) === 0) {
      discharge = emfield;
      emfield = 1;
    }
  }

  return {
    active: discharge > 0,
    emfield,
    discharge,
  };
}

/** 放电时只把受电带来的额外增益减半，不影响建筑的非电力部分。 */
export function getDischargePoweredBonus(
  activeBuildings: number,
  bonusPerBuilding: number,
  dischargeActive: boolean,
): number {
  const bonus = activeBuildings * bonusPerBuilding;
  return dischargeActive ? bonus * 0.5 : bonus;
}

/** 无趣挑战禁止娱乐科技；无钢挑战隐藏被自动跳过的炼钢科技。 */
export function isChallengeTechBlocked(state: GameState, techId: string): boolean {
  if (hasRaceFlag(state, 'joyless') && techId === 'theatre') return true;
  if (!hasRaceFlag(state, 'steelen')) return false;
  return ['steel', 'bessemer_process', 'oxygen_converter', 'electric_arc_furnace'].includes(techId);
}

/** 通货膨胀点数按指定除数换算为倍率；未启用挑战时固定为 1。 */
export function getInflationMultiplier(state: GameState, divisor: number): number {
  if (!hasRaceFlag(state, 'inflation') || divisor <= 0) return 1;
  const points = Math.max(0, Number(state.race['inflation']) || 0);
  return 1 + points / divisor;
}

/** 通货膨胀挑战：每点使建筑的资金成本增加 1/75。 */
export function applyInflationToCosts(
  state: GameState,
  costs: Record<string, number>,
): Record<string, number> {
  if (!hasRaceFlag(state, 'inflation') || costs.Money === undefined) return costs;

  return {
    ...costs,
    Money: Math.round(costs.Money * getInflationMultiplier(state, 75)),
  };
}

/** 建筑完成增加 1 点，ARPA 项目完成增加 10 点。 */
export function addInflationPoints(state: GameState, points: number): void {
  if (!hasRaceFlag(state, 'inflation') || (state.tech['primitive'] ?? 0) <= 0) return;
  state.race['inflation'] = Math.max(0, Number(state.race['inflation']) || 0) + points;
}

/** 衰变挑战：可贸易资源在库存超过 50 时按贸易比率持续衰变。 */
export function getDecayChallengeDeltas(state: GameState): Record<string, number> {
  if (!hasRaceFlag(state, 'decay')) return {};

  const deltas: Record<string, number> = {};
  for (const [resourceId, ratio] of Object.entries(TRADE_RATIOS)) {
    const amount = state.resource[resourceId]?.amount ?? 0;
    if (amount <= 50) continue;

    const decay = Number(((amount - 50) * 0.001 * ratio).toFixed(3));
    if (decay > 0) deltas[resourceId] = -decay;
  }
  return deltas;
}

/** E.M. 磁场挑战使所有正向用电成本增加 50%。 */
export function getChallengePowerCost(state: GameState, baseCost: number): number {
  return hasRaceFlag(state, 'emfield')
    ? Number((baseCost * 1.5).toFixed(2))
    : baseCost;
}

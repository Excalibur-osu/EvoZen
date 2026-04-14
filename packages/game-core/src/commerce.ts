import type { GameState } from '@evozen/shared-types';

function techLevel(state: GameState, id: string): number {
  return (state.tech[id] as number | undefined) ?? 0;
}

function structCount(state: GameState, id: string): number {
  return (state.city[id] as { count?: number } | undefined)?.count ?? 0;
}

function population(state: GameState): number {
  return state.resource[state.race.species]?.amount ?? 0;
}

/**
 * 单座银行提供的资金库上限。
 * 对标 legacy actions.js bank_vault()，当前仅保留已进入 EvoZen 范围的倍率。
 */
export function getBankVault(state: GameState): number {
  const banking = techLevel(state, 'banking');
  const bankers = (state.civic['banker'] as { workers?: number } | undefined)?.workers ?? 0;

  let vault = 1800;
  if (banking >= 5) {
    vault = 9000;
  } else if (banking >= 3) {
    vault = 4000;
  }

  if (banking >= 7) {
    vault *= 1 + bankers * 0.05;
  }

  if (banking >= 8) {
    vault += 25 * population(state);
  }

  if (techLevel(state, 'stock_exchange') >= 1) {
    vault *= 1 + techLevel(state, 'stock_exchange') * 0.1;
  }

  return vault;
}

/**
 * 赌场资金库上限。
 * 对标 legacy actions.js casino_vault()，当前仅保留已进入 EvoZen 范围的倍率。
 */
export function getCasinoVault(state: GameState): number {
  let vault = techLevel(state, 'gambling') >= 3 ? 60000 : 40000;

  if (techLevel(state, 'gambling') >= 5) {
    vault += techLevel(state, 'gambling') >= 6 ? 240000 : 60000;
  }

  if (techLevel(state, 'stock_exchange') >= 1 && techLevel(state, 'gambling') >= 4) {
    vault *= 1 + techLevel(state, 'stock_exchange') * 0.05;
  }

  return vault;
}

/**
 * 单座已通电赌场的金币收入。
 * 对标 legacy actions.js casinoEarn()，当前仅保留已进入 EvoZen 范围的倍率。
 */
export function getCasinoIncomePerActive(state: GameState): number {
  let cash = Math.log2(1 + population(state)) * 2.5;

  if (techLevel(state, 'gambling') >= 2) {
    cash *= techLevel(state, 'gambling') >= 5 ? 2 : 1.5;
  }

  if (techLevel(state, 'stock_exchange') >= 1 && techLevel(state, 'gambling') >= 4) {
    cash *= 1 + techLevel(state, 'stock_exchange') * 0.01;
  }

  return cash;
}

/**
 * 旅游中心的基础旅游收入。
 * 对标 legacy main.js L7687-7728，当前只保留已在 EvoZen 实装的贡献项：
 * - 露天剧场
 * - 赌场
 * - 纪念碑
 */
export function getTourismIncome(state: GameState, activeTouristCenters: number): number {
  if (activeTouristCenters <= 0) return 0;

  let tourism = 0;
  tourism += activeTouristCenters * structCount(state, 'amphitheatre');
  tourism += activeTouristCenters * structCount(state, 'casino') * 5;
  tourism += activeTouristCenters * techLevel(state, 'monuments') * 2;

  return tourism;
}

/**
 * 旅游中心额外吸引游客带来的食物消耗。
 * 对标 legacy main.js L3734-3736。
 */
export function getTourismFoodDemand(activeTouristCenters: number): number {
  return Math.max(0, activeTouristCenters) * 50;
}

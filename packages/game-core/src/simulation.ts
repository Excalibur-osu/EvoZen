import type { GameMessage, GameState, GameTickResult } from '@evozen/shared-types';
import { applyDerivedState, applyDerivedStateInPlace } from './derived-state';
import { gameTick } from './tick';

export interface SimulationTickOptions {
  random?: () => number;
}

export interface SimulationRunResult {
  state: GameState;
  result: GameTickResult;
}

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function withPatchedMathRandom<T>(random: () => number, fn: () => T): T {
  const original = Math.random;
  Math.random = random;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

export function createDeterministicRandom(seed: number): () => number {
  let current = Math.floor(seed) % 233280;
  if (current < 0) current += 233280;

  return () => {
    current = (current * 9301 + 49297) % 233280;
    return current / 233280;
  };
}

export function applySimulationDerivedState(state: GameState): GameState {
  return applyDerivedState(state);
}

export function applySimulationDerivedStateInPlace(state: GameState): void {
  applyDerivedStateInPlace(state);
}

export function handlePopulationGrowth(state: GameState, random?: () => number): GameMessage[] {
  const messages: GameMessage[] = [];
  if (state.race.species === 'protoplasm') return messages;

  const s = state;
  const species = s.race.species;
  const pop = s.resource[species];
  if (!pop) return messages;

  const food = s.resource['Food'];
  if (!food || food.amount <= 0) return messages;

  const tracker = s as GameState & { _popGrowthTick?: number };
  tracker._popGrowthTick = (tracker._popGrowthTick ?? 0) + 1;
  if (tracker._popGrowthTick < 20) return messages;
  tracker._popGrowthTick = 0;

  if (pop.amount >= pop.max) return messages;
  if (food.amount <= 0) return messages;

  let lowerBound = s.tech['reproduction'] ?? 0;
  if ((s.tech['reproduction'] ?? 0) >= 2) {
    lowerBound += (s.city['hospital'] as { count?: number } | undefined)?.count ?? 0;
  }

  let upperBound = Math.floor(pop.amount * (3 - Math.pow(2, 0.25)));
  if (upperBound < 2) upperBound = 2;

  const nextRandom = random ?? Math.random;
  if (nextRandom() < (lowerBound + 1) / upperBound) {
    pop.amount = Math.floor(pop.amount) + 1;
    const newPop = Math.floor(pop.amount);
    messages.push({
      text: `一位新市民加入了你的部落！人口: ${newPop}`,
      type: 'success',
      category: 'progress',
    });

    const unemployed = s.civic['unemployed'] as { workers?: number } | undefined;
    if (unemployed) {
      unemployed.workers = (unemployed.workers ?? 0) + 1;
    }
  }

  return messages;
}

export function runSimulationTick(state: GameState, options: SimulationTickOptions = {}): SimulationRunResult {
  const prepared = applySimulationDerivedState(state);
  const random = options.random;
  const tickOutput = random
    ? withPatchedMathRandom(random, () => gameTick(prepared))
    : gameTick(prepared);

  const populationMessages = handlePopulationGrowth(tickOutput.state, random);

  return {
    state: tickOutput.state,
    result: {
      resourceDeltas: tickOutput.result.resourceDeltas,
      messages: [...tickOutput.result.messages, ...populationMessages],
    },
  };
}

export function simulateTicks(
  state: GameState,
  ticks: number,
  options: SimulationTickOptions = {},
): SimulationRunResult {
  let current = cloneState(state);
  let lastResult: GameTickResult = { resourceDeltas: {}, messages: [] };
  const allMessages: GameMessage[] = [];

  for (let i = 0; i < ticks; i++) {
    const output = runSimulationTick(current, options);
    current = output.state;
    lastResult = output.result;
    allMessages.push(...output.result.messages);
  }

  return {
    state: current,
    result: {
      resourceDeltas: lastResult.resourceDeltas,
      messages: allMessages,
    },
  };
}

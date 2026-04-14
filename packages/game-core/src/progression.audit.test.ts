import { describe, expect, it } from 'vitest';
import type { GameState, ResourceState } from '@evozen/shared-types';
import { createNewGame } from './state';
import {
  buildStructure,
  assignWorker,
  enqueueStructure,
  researchTech,
} from './actions';
import { createDeterministicRandom, simulateTicks } from './simulation';

function makePopulationResource(name: string, amount: number, max: number): ResourceState {
  return {
    name,
    display: true,
    value: 0,
    amount,
    max,
    rate: 0,
    crates: 0,
    containers: 0,
    diff: 0,
    delta: 0,
  };
}

function bootstrapCivilization(state: GameState, species: string, amount: number, max: number): void {
  state.race.species = species;
  state.resource[species] = makePopulationResource(species, amount, max);
  (state.civic['unemployed'] as { workers: number }).workers = amount;
  state.event.t = 999999;
  state.m_event.t = 999999;
}

function must<T>(value: T | null | undefined): T {
  expect(value).toBeTruthy();
  return value as T;
}

function round(value: number | undefined): number {
  return Number((value ?? 0).toFixed(4));
}

describe('progression audit scenarios', () => {
  it('research to workforce loop remains stable', () => {
    let state = createNewGame();
    bootstrapCivilization(state, 'human', 6, 6);

    state.resource['Food'].amount = 300;
    state.resource['Lumber'].amount = 1200;
    state.resource['Stone'].amount = 1200;
    state.resource['Knowledge'].amount = 1000;
    state.resource['Money'].amount = 2000;

    state.tech['primitive'] = 3;

    state = must(researchTech(state, 'housing'));
    state = must(researchTech(state, 'agriculture'));
    state = must(researchTech(state, 'science'));

    for (let i = 0; i < 6; i++) {
      state = must(buildStructure(state, 'basic_housing'));
    }
    state = must(buildStructure(state, 'farm'));
    state = must(buildStructure(state, 'university'));

    state = must(assignWorker(state, 'farmer'));
    state = must(assignWorker(state, 'professor'));

    const result = simulateTicks(state, 30, { random: createDeterministicRandom(101) });

    expect({
      housingCount: (result.state.city['basic_housing'] as { count?: number } | undefined)?.count ?? 0,
      farmCount: (result.state.city['farm'] as { count?: number } | undefined)?.count ?? 0,
      universityCount: (result.state.city['university'] as { count?: number } | undefined)?.count ?? 0,
      unemployed: (result.state.civic['unemployed'] as { workers?: number } | undefined)?.workers ?? 0,
      farmer: (result.state.civic['farmer'] as { workers?: number } | undefined)?.workers ?? 0,
      professor: (result.state.civic['professor'] as { workers?: number } | undefined)?.workers ?? 0,
      popAmount: round(result.state.resource['human']?.amount),
      popMax: result.state.resource['human']?.max ?? 0,
      food: round(result.state.resource['Food']?.amount),
      knowledge: round(result.state.resource['Knowledge']?.amount),
      money: round(result.state.resource['Money']?.amount),
      morale: round(result.state.city.morale?.current),
      days: result.state.stats.days,
    }).toEqual({
      housingCount: 6,
      farmCount: 1,
      universityCount: 1,
      unemployed: 4,
      farmer: 1,
      professor: 1,
      popAmount: 6,
      popMax: 6,
      food: 280.3535,
      knowledge: 600,
      money: 1000,
      morale: 95.6,
      days: 1,
    });
  });

  it('queued midgame buildings keep derived effects consistent', () => {
    let state = createNewGame();
    bootstrapCivilization(state, 'human', 8, 10);

    state.resource['Food'].amount = 250;
    state.resource['Money'].amount = 2000;
    state.resource['Lumber'].amount = 600;
    state.resource['Stone'].amount = 800;
    state.resource['Furs'].amount = 100;
    state.resource['Brick'].amount = 50;
    state.resource['Wrought_Iron'].amount = 50;
    state.resource['Knowledge'].amount = 1000;

    state.tech['primitive'] = 3;
    state.tech['currency'] = 2;
    state.tech['storage'] = 1;
    state.tech['banking'] = 1;
    state.tech['military'] = 1;
    state.tech['trade'] = 3;
    state.tech['container'] = 1;
    state.tech['theatre'] = 1;
    state.tech['queue'] = 4;

    state = must(buildStructure(state, 'bank'));
    state = must(buildStructure(state, 'shed'));
    state = must(buildStructure(state, 'shed'));

    state = must(assignWorker(state, 'quarry_worker'));
    state = must(assignWorker(state, 'quarry_worker'));
    state = must(assignWorker(state, 'quarry_worker'));
    state = must(assignWorker(state, 'lumberjack'));

    state = must(enqueueStructure(state, 'garrison'));
    state = must(enqueueStructure(state, 'amphitheatre'));
    state = must(enqueueStructure(state, 'trade_post'));
    state = must(enqueueStructure(state, 'storage_yard'));

    const result = simulateTicks(state, 120, { random: createDeterministicRandom(202) });

    expect({
      queueLength: result.state.queue.queue.length,
      garrisonCount: (result.state.city['garrison'] as { count?: number } | undefined)?.count ?? 0,
      amphitheatreCount: (result.state.city['amphitheatre'] as { count?: number } | undefined)?.count ?? 0,
      tradePostCount: (result.state.city['trade_post'] as { count?: number } | undefined)?.count ?? 0,
      storageYardCount: (result.state.city['storage_yard'] as { count?: number } | undefined)?.count ?? 0,
      garrisonMax: result.state.civic.garrison.max,
      showMil: result.state.settings.showMil,
      entertainerMax: (result.state.civic['entertainer'] as { max?: number } | undefined)?.max ?? 0,
      cratesMax: result.state.resource['Crates']?.max ?? 0,
      containersMax: result.state.resource['Containers']?.max ?? 0,
      tradeRoutes: ((result.state.city as { trade_routes?: unknown[] }).trade_routes ?? []).length,
      money: round(result.state.resource['Money']?.amount),
      lumber: round(result.state.resource['Lumber']?.amount),
      stone: round(result.state.resource['Stone']?.amount),
    }).toEqual({
      queueLength: 0,
      garrisonCount: 1,
      amphitheatreCount: 1,
      tradePostCount: 1,
      storageYardCount: 1,
      garrisonMax: 2,
      showMil: true,
      entertainerMax: 1,
      cratesMax: 10,
      containersMax: 0,
      tradeRoutes: 5,
      money: 381,
      lumber: 250.105,
      stone: 170.315,
    });
  });

  it('queue completions keep on-counts in sync with finished buildings', () => {
    let state = createNewGame();
    bootstrapCivilization(state, 'human', 4, 4);

    state.resource['Food'].amount = 100;
    state.resource['Lumber'].amount = 100;
    state.resource['Knowledge'].amount = 100;
    state.tech['housing'] = 1;
    state.tech['queue'] = 1;

    state = must(enqueueStructure(state, 'basic_housing'));

    const result = simulateTicks(state, 2, { random: createDeterministicRandom(3030) });

    expect({
      queueLength: result.state.queue.queue.length,
      housing: result.state.city['basic_housing'],
    }).toEqual({
      queueLength: 0,
      housing: {
        count: 1,
        on: 1,
      },
    });
  });
});

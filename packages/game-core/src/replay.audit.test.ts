import { describe, expect, it } from 'vitest';
import type { GameState, ResourceState } from '@evozen/shared-types';
import { createNewGame } from './state';
import { createDeterministicRandom, simulateTicks } from './simulation';

const SNAPSHOT_RESOURCES = [
  'Food',
  'Lumber',
  'Stone',
  'Copper',
  'Iron',
  'Coal',
  'Knowledge',
  'Faith',
  'Money',
  'Oil',
  'Aluminium',
  'Steel',
  'Alloy',
  'Polymer',
] as const;

const SNAPSHOT_JOBS = [
  'unemployed',
  'hunter',
  'farmer',
  'lumberjack',
  'quarry_worker',
  'miner',
  'coal_miner',
  'professor',
  'priest',
] as const;

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
  state.event.t = 999999;
  state.m_event.t = 999999;
}

function round(value: number | undefined): number {
  return Number((value ?? 0).toFixed(4));
}

function snapshotState(state: GameState, species: string) {
  const selectedResources = Object.fromEntries(
    [species, ...SNAPSHOT_RESOURCES].map((id) => [id, round(state.resource[id]?.amount)]),
  );

  const selectedJobs = Object.fromEntries(
    SNAPSHOT_JOBS.map((id) => [id, (state.civic[id] as { workers?: number } | undefined)?.workers ?? 0]),
  );

  return {
    calendar: {
      day: state.city.calendar.day,
      year: state.city.calendar.year,
      season: state.city.calendar.season,
      weather: state.city.calendar.weather,
      temp: state.city.calendar.temp,
      wind: state.city.calendar.wind,
    },
    morale: {
      current: round(state.city.morale?.current),
      cap: round(state.city.morale?.cap),
      stress: round(state.city.morale?.stress),
      entertain: round(state.city.morale?.entertain),
      weather: round(state.city.morale?.weather),
    },
    power: {
      generated: round(state.city.power?.generated),
      consumed: round(state.city.power?.consumed),
      surplus: round(state.city.power?.surplus),
    },
    resources: selectedResources,
    jobs: selectedJobs,
    stats: {
      days: state.stats.days,
      died: state.stats.died,
    },
  };
}

function expectPopulationConsistency(state: GameState, species: string): void {
  const assigned = SNAPSHOT_JOBS.reduce((sum, jobId) => {
    return sum + ((state.civic[jobId] as { workers?: number } | undefined)?.workers ?? 0);
  }, 0);

  expect(assigned).toBeLessThanOrEqual(round(state.resource[species]?.amount));
}

describe('deterministic replay audit', () => {
  it('economy slice remains stable across 40 ticks', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 10, 12);

    state.resource['Food'].amount = 200;
    state.resource['Lumber'].amount = 150;
    state.resource['Stone'].amount = 120;
    state.resource['Copper'].amount = 30;
    state.resource['Iron'].amount = 20;
    state.resource['Coal'].amount = 25;
    state.resource['Knowledge'].amount = 50;
    state.resource['Money'].amount = 200;

    state.tech['primitive'] = 3;
    state.tech['agriculture'] = 4;
    state.tech['hoe'] = 1;
    state.tech['axe'] = 2;
    state.tech['mining'] = 3;
    state.tech['science'] = 2;
    state.tech['theology'] = 1;
    state.tech['military'] = 1;
    state.tech['currency'] = 1;

    state.city['basic_housing'] = { count: 6 };
    state.city['cottage'] = { count: 2 };
    state.city['farm'] = { count: 2 };
    state.city['mill'] = { count: 1 };
    state.city['lumber_yard'] = { count: 1 };
    state.city['rock_quarry'] = { count: 1 };
    state.city['mine'] = { count: 1, on: 1 };
    state.city['library'] = { count: 1 };
    state.city['university'] = { count: 1 };
    state.city['temple'] = { count: 1 };
    state.city['coal_power'] = { count: 1, on: 1 };

    (state.civic['unemployed'] as { workers: number }).workers = 1;
    (state.civic['hunter'] as { workers: number }).workers = 1;
    (state.civic['farmer'] as { workers: number }).workers = 2;
    (state.civic['lumberjack'] as { workers: number }).workers = 2;
    (state.civic['quarry_worker'] as { workers: number }).workers = 1;
    (state.civic['miner'] as { workers: number }).workers = 1;
    (state.civic['professor'] as { workers: number }).workers = 1;
    (state.civic['priest'] as { workers: number }).workers = 1;

    const result = simulateTicks(state, 40, { random: createDeterministicRandom(42) });
    expectPopulationConsistency(result.state, 'human');
    expect(snapshotState(result.state, 'human')).toEqual({
      calendar: { day: 2, year: 0, season: 0, weather: 2, temp: 1, wind: 0 },
      morale: { current: 97.4, cap: 125, stress: -1.6, entertain: 0, weather: 0 },
      power: { generated: 5, consumed: 1, surplus: 4 },
      resources: {
        human: 10,
        Food: 169.1356,
        Lumber: 177.0939,
        Stone: 130.0348,
        Copper: 31.4054,
        Iron: 22.4595,
        Coal: 25,
        Knowledge: 65.5981,
        Faith: 4.919,
        Money: 236,
        Oil: 0,
        Aluminium: 0,
        Steel: 0,
        Alloy: 0,
        Polymer: 0,
      },
      jobs: {
        unemployed: 1,
        hunter: 1,
        farmer: 2,
        lumberjack: 2,
        quarry_worker: 1,
        miner: 1,
        coal_miner: 0,
        professor: 1,
        priest: 1,
      },
      stats: { days: 2, died: 0 },
    });
  });

  it('industrial slice remains stable across 60 ticks', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 12, 16);

    state.resource['Food'].amount = 320;
    state.resource['Lumber'].amount = 420;
    state.resource['Stone'].amount = 300;
    state.resource['Copper'].amount = 260;
    state.resource['Iron'].amount = 180;
    state.resource['Coal'].amount = 220;
    state.resource['Knowledge'].amount = 150;
    state.resource['Money'].amount = 500;
    state.resource['Oil'].amount = 80;
    state.resource['Aluminium'].amount = 90;
    state.resource['Steel'].amount = 45;
    state.resource['Alloy'].amount = 0;
    state.resource['Polymer'].amount = 0;

    state.tech['primitive'] = 3;
    state.tech['agriculture'] = 4;
    state.tech['mining'] = 4;
    state.tech['pickaxe'] = 2;
    state.tech['dowsing'] = 2;
    state.tech['explosives'] = 2;
    state.tech['science'] = 2;
    state.tech['currency'] = 1;
    state.tech['oil'] = 1;
    state.tech['high_tech'] = 3;
    state.tech['smelting'] = 5;
    state.tech['alumina'] = 1;

    state.city['basic_housing'] = { count: 8 };
    state.city['cottage'] = { count: 2 };
    state.city['farm'] = { count: 2 };
    state.city['coal_power'] = { count: 1, on: 1 };
    state.city['oil_power'] = { count: 1, on: 1 };
    state.city['mine'] = { count: 1, on: 1 };
    state.city['coal_mine'] = { count: 1, on: 1 };
    state.city['metal_refinery'] = { count: 1, on: 1 };
    state.city['oil_well'] = { count: 2 };
    state.city['smelter'] = { count: 1 };
    state.city['library'] = { count: 1 };
    state.city['factory'] = { count: 2, on: 2, Alloy: 1, Polymer: 1, Lux: 0, Furs: 0 };

    (state.civic['unemployed'] as { workers: number }).workers = 4;
    (state.civic['hunter'] as { workers: number }).workers = 1;
    (state.civic['farmer'] as { workers: number }).workers = 2;
    (state.civic['lumberjack'] as { workers: number }).workers = 1;
    (state.civic['quarry_worker'] as { workers: number }).workers = 1;
    (state.civic['miner'] as { workers: number }).workers = 1;
    (state.civic['coal_miner'] as { workers: number }).workers = 1;
    (state.civic['professor'] as { workers: number }).workers = 1;

    const result = simulateTicks(state, 60, { random: createDeterministicRandom(84) });
    expectPopulationConsistency(result.state, 'human');
    expect(snapshotState(result.state, 'human')).toEqual({
      calendar: { day: 3, year: 0, season: 0, weather: 2, temp: 1, wind: 1 },
      morale: { current: 94.5, cap: 125, stress: -1.5, entertain: 0, weather: 0 },
      power: { generated: 11, consumed: 10, surplus: 1 },
      resources: {
        human: 12,
        Food: 240.901,
        Lumber: 0.2882,
        Stone: 147.3073,
        Copper: 92.2696,
        Iron: 76.6592,
        Coal: 25.2,
        Knowledge: 172.6401,
        Faith: 0,
        Money: 548,
        Oil: 79.685,
        Aluminium: 49.75,
        Steel: 50,
        Alloy: 1.125,
        Polymer: 1.7813,
      },
      jobs: {
        unemployed: 4,
        hunter: 1,
        farmer: 2,
        lumberjack: 1,
        quarry_worker: 1,
        miner: 1,
        coal_miner: 1,
        professor: 1,
        priest: 0,
      },
      stats: { days: 3, died: 0 },
    });
  });

  it('starvation path is deterministic and never wipes population below one', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 5, 5);

    state.city['basic_housing'] = { count: 5 };
    state.resource['Food'].amount = 0;
    (state.civic['unemployed'] as { workers: number }).workers = 5;

    const result = simulateTicks(state, 800, { random: createDeterministicRandom(7) });
    expectPopulationConsistency(result.state, 'human');
    expect(snapshotState(result.state, 'human')).toEqual({
      calendar: { day: 40, year: 0, season: 0, weather: 1, temp: 0, wind: 0 },
      morale: { current: 94, cap: 125, stress: 0, entertain: 0, weather: -5 },
      power: { generated: 0, consumed: 0, surplus: 0 },
      resources: {
        human: 1,
        Food: 0,
        Lumber: 0,
        Stone: 0,
        Copper: 0,
        Iron: 0,
        Coal: 0,
        Knowledge: 0,
        Faith: 0,
        Money: 0,
        Oil: 0,
        Aluminium: 0,
        Steel: 0,
        Alloy: 0,
        Polymer: 0,
      },
      jobs: {
        unemployed: 1,
        hunter: 0,
        farmer: 0,
        lumberjack: 0,
        quarry_worker: 0,
        miner: 0,
        coal_miner: 0,
        professor: 0,
        priest: 0,
      },
      stats: { days: 40, died: 0 },
    });
  });
});

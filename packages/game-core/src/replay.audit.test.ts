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
  it('civilized storage and power slice remains stable across a day rollover', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 8, 12);

    state.resource['Food'].amount = 260;
    state.resource['Lumber'].amount = 280;
    state.resource['Stone'].amount = 180;
    state.resource['Copper'].amount = 40;
    state.resource['Iron'].amount = 20;
    state.resource['Money'].amount = 180;
    state.resource['Oil'].amount = 60;
    state.resource['Crates'].amount = 5;
    state.resource['Containers'].amount = 4;
    state.resource['Lumber'].crates = 1;
    state.resource['Iron'].containers = 1;

    state.tech['primitive'] = 3;
    state.tech['agriculture'] = 4;
    state.tech['hoe'] = 1;
    state.tech['axe'] = 2;
    state.tech['saw'] = 2;
    state.tech['mining'] = 3;
    state.tech['pickaxe'] = 2;
    state.tech['currency'] = 1;
    state.tech['storage'] = 3;
    state.tech['container'] = 3;
    state.tech['steel_container'] = 2;
    state.tech['theatre'] = 2;

    state.city['basic_housing'] = { count: 6 };
    state.city['cottage'] = { count: 1 };
    state.city['farm'] = { count: 2 };
    state.city['mill'] = { count: 1 };
    state.city['lumber_yard'] = { count: 1 };
    state.city['sawmill'] = { count: 1, on: 1 };
    state.city['mine'] = { count: 1, on: 1 };
    state.city['oil_power'] = { count: 1, on: 1 };
    state.city['shed'] = { count: 2 };
    state.city['storage_yard'] = { count: 1 };
    state.city['warehouse'] = { count: 1 };
    state.city['wharf'] = { count: 1 };
    state.city['amphitheatre'] = { count: 1 };

    state.city.calendar.weather = 2;
    state.city.calendar.temp = 1;
    state.city.calendar.wind = 0;
    state.city.calendar.season = 0;
    state.city.calendar.year = 1;
    state.city.calendar.dayTick = 0;

    (state.civic['unemployed'] as { workers: number }).workers = 1;
    (state.civic['hunter'] as { workers: number }).workers = 1;
    (state.civic['farmer'] as { workers: number }).workers = 2;
    (state.civic['lumberjack'] as { workers: number }).workers = 2;
    (state.civic['miner'] as { workers: number }).workers = 1;
    (state.civic['entertainer'] as { workers: number }).workers = 1;

    const result = simulateTicks(state, 24, { random: createDeterministicRandom(1) });
    expectPopulationConsistency(result.state, 'human');

    expect({
      calendar: {
        day: result.state.city.calendar.day,
        year: result.state.city.calendar.year,
        season: result.state.city.calendar.season,
        weather: result.state.city.calendar.weather,
        temp: result.state.city.calendar.temp,
        wind: result.state.city.calendar.wind,
        dayTick: result.state.city.calendar.dayTick,
      },
      morale: {
        current: round(result.state.city.morale?.current),
        cap: round(result.state.city.morale?.cap),
        stress: round(result.state.city.morale?.stress),
        entertain: round(result.state.city.morale?.entertain),
        season: round(result.state.city.morale?.season),
        weather: round(result.state.city.morale?.weather),
        unemployed: round(result.state.city.morale?.unemployed),
      },
      power: {
        generated: round(result.state.city.power?.generated),
        consumed: round(result.state.city.power?.consumed),
        surplus: round(result.state.city.power?.surplus),
      },
      resources: {
        human: round(result.state.resource['human']?.amount),
        Food: round(result.state.resource['Food']?.amount),
        Lumber: round(result.state.resource['Lumber']?.amount),
        Stone: round(result.state.resource['Stone']?.amount),
        Copper: round(result.state.resource['Copper']?.amount),
        Iron: round(result.state.resource['Iron']?.amount),
        Money: round(result.state.resource['Money']?.amount),
        Oil: round(result.state.resource['Oil']?.amount),
        Crates: round(result.state.resource['Crates']?.amount),
        Containers: round(result.state.resource['Containers']?.amount),
      },
      caps: {
        Lumber: result.state.resource['Lumber']?.max,
        Iron: result.state.resource['Iron']?.max,
        Crates: result.state.resource['Crates']?.max,
        Containers: result.state.resource['Containers']?.max,
      },
      jobs: {
        unemployed: (result.state.civic['unemployed'] as { workers?: number } | undefined)?.workers ?? 0,
        hunter: (result.state.civic['hunter'] as { workers?: number } | undefined)?.workers ?? 0,
        farmer: (result.state.civic['farmer'] as { workers?: number } | undefined)?.workers ?? 0,
        lumberjack: (result.state.civic['lumberjack'] as { workers?: number } | undefined)?.workers ?? 0,
        miner: (result.state.civic['miner'] as { workers?: number } | undefined)?.workers ?? 0,
        entertainer: (result.state.civic['entertainer'] as { workers?: number } | undefined)?.workers ?? 0,
      },
      stats: {
        days: result.state.stats.days,
        died: result.state.stats.died,
      },
    }).toEqual({
      calendar: { day: 1, year: 1, season: 0, weather: 0, temp: 1, wind: 1, dayTick: 4 },
      morale: { current: 99.7, cap: 101, stress: -1.4, entertain: 2, season: 5, weather: -5, unemployed: -1 },
      power: { generated: 6, consumed: 2, surplus: 4 },
      resources: {
        human: 8,
        Food: 256.3117,
        Lumber: 298.6263,
        Stone: 180,
        Copper: 41.1742,
        Iron: 22.0548,
        Money: 196.8602,
        Oil: 56.1,
        Crates: 5,
        Containers: 4,
      },
      caps: { Lumber: 4150, Iron: 2213, Crates: 29, Containers: 29 },
      jobs: { unemployed: 1, hunter: 1, farmer: 2, lumberjack: 2, miner: 1, entertainer: 1 },
      stats: { days: 1, died: 0 },
    });
  });

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
      morale: { current: 97.4, cap: 100, stress: -1.6, entertain: 0, weather: 0 },
      power: { generated: 5, consumed: 2, surplus: 3 },
      resources: {
        human: 10,
        Food: 174.4588,
        Lumber: 177.0939,
        Stone: 130.4362,
        Copper: 31.4757,
        Iron: 22.5825,
        Coal: 25,
        Knowledge: 65.1062,
        Faith: 4.919,
        Money: 235.4168,
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
    state.city['smelter'] = { count: 1, on: 1, Wood: 0, Coal: 1, Oil: 0, Inferno: 0, Iron: 0, Steel: 1, Iridium: 0 };
    state.city['library'] = { count: 1 };
    state.city['university'] = { count: 1 };
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
      morale: { current: 94.5, cap: 100, stress: -1.5, entertain: 0, weather: 0 },
      power: { generated: 11, consumed: 10, surplus: 1 },
      resources: {
        human: 12,
        Food: 244.6649,
        Lumber: 0.2882,
        Stone: 200,
        Copper: 92.1718,
        Iron: 76.4882,
        Coal: 36.1319,
        Knowledge: 171.9262,
        Faith: 0,
        Money: 545.6944,
        Oil: 79.1086,
        Aluminium: 37.2343,
        Steel: 50,
        Alloy: 1.071,
        Polymer: 1.6963,
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
      morale: { current: 94, cap: 100, stress: 0, entertain: 0, weather: -5 },
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

import { describe, expect, it } from 'vitest';
import { createNewGame } from './state';
import {
  assignWorker,
  buildStructure,
  dequeueStructure,
  isTechAvailable,
  researchTech,
  setTaxRate,
  enqueueStructure,
} from './actions';
import { changeGovernment, getMaxTaxRate, getTaxMultiplier, tickGovernmentCooldown } from './government';
import { warCampaign, mercCost } from './military';
import { assignSpeciesTraits } from './traits';
import { powerTick } from './power';
import { EVENTS, tickEvents } from './events';
import {
  assignContainer,
  assignCrate,
  buildContainer,
  buildCrate,
  unassignContainer,
  unassignCrate,
} from './storage';
import {
  getManualTradeLimit,
  setTradeRoute,
  getTradeRouteQtyLimit,
} from './trade';
import {
  applySimulationDerivedStateInPlace,
  createDeterministicRandom,
  runSimulationTick,
  simulateTicks,
} from './simulation';

function makePopulationResource(name: string, amount: number, max: number) {
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

function bootstrapCivilization(state: ReturnType<typeof createNewGame>, species: string, amount: number, max: number): void {
  state.race.species = species;
  state.resource[species] = makePopulationResource(species, amount, max);
  (state.civic.unemployed as { workers: number }).workers = amount;
  state.event.t = 999999;
  state.m_event.t = 999999;
}

function must<T>(value: T | null | undefined, label: string): T {
  expect(value, label).toBeTruthy();
  return value as T;
}

function round(value: number | undefined): number {
  return Number((value ?? 0).toFixed(4));
}

function withRandom<T>(random: () => number, fn: () => T): T {
  const original = Math.random;
  Math.random = random;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function jobWorkers(state: ReturnType<typeof createNewGame>, jobId: string): number {
  return (state.civic[jobId] as { workers?: number } | undefined)?.workers ?? 0;
}

function buildingCount(state: ReturnType<typeof createNewGame>, buildingId: string): number {
  return (state.city[buildingId] as { count?: number } | undefined)?.count ?? 0;
}

function setJobWorkers(state: ReturnType<typeof createNewGame>, jobId: string, workers: number): void {
  (state.civic[jobId] as { workers?: number }).workers = workers;
}

describe('system audit scenarios', () => {
  it('government unlock chain remains playable and deterministic', () => {
    let state = createNewGame();
    bootstrapCivilization(state, 'human', 8, 8);

    state.resource.Food.amount = 400;
    state.resource.Lumber.amount = 3000;
    state.resource.Stone.amount = 3000;
    state.resource.Iron.amount = 2000;
    state.resource.Cement.amount = 2000;
    state.resource.Furs.amount = 500;
    state.resource.Knowledge.amount = 20000;
    state.resource.Money.amount = 20000;

    state.tech.primitive = 3;

    const availability: Array<[string, boolean]> = [];
    availability.push(['science_before_housing', isTechAvailable(state, 'science')]);
    availability.push(['government_before_currency', isTechAvailable(state, 'government')]);
    availability.push(['theocracy_before_chain', isTechAvailable(state, 'theocracy')]);

    for (const techId of [
      'housing',
      'science',
      'currency',
      'mining',
      'storage',
      'cement',
      'banking_tech',
      'government',
      'faith',
      'theology_tech',
      'theocracy',
    ]) {
      availability.push([`${techId}_available`, isTechAvailable(state, techId)]);
      state = must(researchTech(state, techId), `research_${techId}`);
    }

    availability.push(['theocracy_after_chain', isTechAvailable(state, 'theocracy')]);

    for (let i = 0; i < 8; i++) {
      state = must(buildStructure(state, 'basic_housing'), `basic_housing_${i}`);
    }
    state = must(buildStructure(state, 'university'), 'university');
    state = must(buildStructure(state, 'temple'), 'temple');
    state = must(buildStructure(state, 'bank'), 'bank');
    state = must(assignWorker(state, 'professor'), 'professor');
    state = must(assignWorker(state, 'priest'), 'priest');
    state = must(changeGovernment(state, 'theocracy'), 'change_government');

    const result = simulateTicks(state, 20, { random: createDeterministicRandom(303) });

    expect({
      availability,
      govern: {
        type: result.state.civic.govern.type,
        rev: result.state.civic.govern.rev,
      },
      resources: {
        human: round(result.state.resource.human?.amount),
        humanMax: round(result.state.resource.human?.max),
        knowledge: round(result.state.resource.Knowledge?.amount),
        knowledgeMax: round(result.state.resource.Knowledge?.max),
        faith: round(result.state.resource.Faith?.amount),
        money: round(result.state.resource.Money?.amount),
      },
      jobs: {
        unemployed: jobWorkers(result.state, 'unemployed'),
        professor: jobWorkers(result.state, 'professor'),
        priest: jobWorkers(result.state, 'priest'),
      },
      buildings: {
        housing: buildingCount(result.state, 'basic_housing'),
        university: buildingCount(result.state, 'university'),
        temple: buildingCount(result.state, 'temple'),
        bank: buildingCount(result.state, 'bank'),
      },
      display: {
        faith: result.state.resource.Faith?.display,
        civic: result.state.settings.showCivic,
      },
      days: result.state.stats.days,
    }).toEqual({
      availability: [
        ['science_before_housing', false],
        ['government_before_currency', false],
        ['theocracy_before_chain', false],
        ['housing_available', true],
        ['science_available', true],
        ['currency_available', true],
        ['mining_available', true],
        ['storage_available', true],
        ['cement_available', true],
        ['banking_tech_available', true],
        ['government_available', true],
        ['faith_available', true],
        ['theology_tech_available', true],
        ['theocracy_available', true],
        ['theocracy_after_chain', false],
      ],
      govern: {
        type: 'theocracy',
        rev: 230,
      },
      resources: {
        human: 8,
        humanMax: 8,
        knowledge: 600,
        knowledgeMax: 600,
        faith: 2.6262,
        money: 2800,
      },
      jobs: {
        unemployed: 6,
        professor: 1,
        priest: 1,
      },
      buildings: {
        housing: 8,
        university: 1,
        temple: 1,
        bank: 1,
      },
      display: {
        faith: true,
        civic: true,
      },
      days: 1,
    });
  });

  it('siege campaign and occupation remain deterministic', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 35, 35);

    state.resource.Money.amount = 10000;
    state.resource.Food.amount = 500;
    state.resource.Lumber.amount = 500;
    state.resource.Stone.amount = 500;
    state.city.garrison = { count: 15 };
    state.city.bank = { count: 3 };
    state.tech.military = 5;
    state.tech.armor = 2;

    applySimulationDerivedStateInPlace(state);
    state.civic.garrison.workers = 30;
    state.civic.garrison.raid = 25;
    state.civic.garrison.tactic = 4;
    state.civic.foreign.gov0.mil = 10;
    state.civic.foreign.gov0.eco = 80;
    state.civic.foreign.gov0.hstl = 20;

    const result = withRandom(createDeterministicRandom(404), () => warCampaign(state, 0));

    expect({
      war: {
        victory: result.victory,
        deaths: result.deaths,
        wounded: result.wounded,
        loot: result.loot,
        messages: result.messages.map((message) => ({
          type: message.type,
          text: message.text,
        })),
      },
      state: {
        garrisonWorkers: state.civic.garrison.workers,
        garrisonMax: state.civic.garrison.max,
        garrisonWounded: state.civic.garrison.wounded,
        fatigue: state.civic.garrison.fatigue,
        protest: state.civic.garrison.protest,
        gov0: {
          occ: state.civic.foreign.gov0.occ,
          hstl: state.civic.foreign.gov0.hstl,
        },
        resources: {
          money: round(state.resource.Money.amount),
          food: round(state.resource.Food.amount),
          stone: round(state.resource.Stone.amount),
          lumber: round(state.resource.Lumber.amount),
          coal: round(state.resource.Coal.amount),
          iron: round(state.resource.Iron.amount),
          aluminium: round(state.resource.Aluminium.amount),
        },
        stats: {
          attacks: state.stats.attacks,
          died: state.stats.died,
        },
      },
    }).toEqual({
      war: {
        victory: true,
        deaths: 1,
        wounded: 11,
        loot: {
          Money: 3456,
          Stone: 205,
          Iron: 98,
        },
        messages: [
          {
            type: 'success',
            text: '围攻战役胜利！阵亡 1 人，负伤 11 人。掠夺: Money: +3456, Stone: +205, Iron: +98',
          },
          {
            type: 'special',
            text: '敌方政府已被占领！',
          },
        ],
      },
      state: {
        garrisonWorkers: 9,
        garrisonMax: 25,
        garrisonWounded: 11,
        fatigue: 1,
        protest: 1,
        gov0: {
          occ: true,
          hstl: 31,
        },
        resources: {
          money: 6400,
          food: 500,
          stone: 200,
          lumber: 500,
          coal: 0,
          iron: 98,
          aluminium: 0,
        },
        stats: {
          attacks: 1,
          died: 1,
        },
      },
    });
  });

  it('tax revolt event remains deterministic under low morale and high taxes', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 6, 6);

    state.tech.primitive = 1;
    state.city.morale = {
      current: 80,
      cap: 125,
      stress: 0,
      entertain: 0,
      season: 0,
      weather: 0,
      unemployed: 0,
    };
    state.civic.taxes.tax_rate = 45;
    state.civic.govern.type = 'democracy';

    state.resource.Food.display = true;
    state.resource.Food.amount = 300;
    state.resource.Stone.display = true;
    state.resource.Stone.amount = 200;
    state.resource.Money.display = true;
    state.resource.Money.amount = 100;
    state.resource.Lumber.display = false;
    state.resource.Lumber.amount = 0;

    state.event.t = 1;
    state.event.l = 'motivation';
    state.m_event.t = 999999;

    const messages = withRandom(createDeterministicRandom(1401), () => tickEvents(state));

    expect({
      messages: messages.map((message) => ({
        type: message.type,
        category: message.category,
        text: message.text,
      })),
      resources: {
        food: round(state.resource.Food.amount),
        stone: round(state.resource.Stone.amount),
        money: round(state.resource.Money.amount),
      },
      event: {
        timer: state.event.t,
        last: state.event.l,
      },
    }).toEqual({
      messages: [
        {
          type: 'warning',
          category: 'event',
          text: '🗡️ 税收起义！过高的税率激起了民众抗议，资源遭受损失！',
        },
      ],
      resources: {
        food: 63,
        stone: 118,
        money: 93,
      },
      event: {
        timer: 113,
        last: 'tax_revolt',
      },
    });
  });

  it('mine collapse keeps population and workforce totals deterministic', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 5, 10);

    state.tech.mining = 1;
    (state.civic.unemployed as { workers: number }).workers = 3;
    state.civic.miner = { workers: 2, max: 2, display: true } as never;

    const collapse = must(EVENTS.find((event) => event.id === 'mine_collapse'), 'mine_collapse');
    const message = collapse.effect(state);

    expect({
      message,
      population: round(state.resource.human.amount),
      miners: jobWorkers(state, 'miner'),
      unemployed: jobWorkers(state, 'unemployed'),
      died: state.stats.died,
    }).toEqual({
      message: '⛏️ 矿井坍塌！一名矿工在事故中遇难。',
      population: 4,
      miners: 1,
      unemployed: 3,
      died: 1,
    });
  });

  it('raid event failure keeps actual money loss and casualties deterministic', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 12, 12);

    state.tech.military = 1;
    state.civic.foreign.gov0.hstl = 90;
    state.civic.garrison.workers = 6;
    state.civic.garrison.wounded = 2;

    const raid = must(EVENTS.find((event) => event.id === 'raid'), 'raid');
    const message = withRandom(createDeterministicRandom(1501), () => raid.effect(state));

    expect({
      message,
      population: round(state.resource.human.amount),
      money: round(state.resource.Money.amount),
      garrison: {
        workers: state.civic.garrison.workers,
        wounded: state.civic.garrison.wounded,
        protest: state.civic.garrison.protest,
      },
      died: state.stats.died,
    }).toEqual({
      message: '⚔️ 外敌来袭！守军寡不敌众，阵亡 1 人，受伤 2 人。',
      population: 11,
      money: 0,
      garrison: {
        workers: 5,
        wounded: 4,
        protest: 5,
      },
      died: 1,
    });
  });

  it('failed war campaign keeps population and casualty state in sync', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 18, 18);

    state.city.garrison = { count: 4 };
    state.tech.military = 1;
    state.tech.armor = 0;

    applySimulationDerivedStateInPlace(state);
    state.civic.garrison.workers = 8;
    state.civic.garrison.raid = 8;
    state.civic.garrison.tactic = 3;
    state.civic.foreign.gov1.mil = 180;
    state.civic.foreign.gov1.eco = 80;
    state.civic.foreign.gov1.hstl = 30;

    const result = withRandom(createDeterministicRandom(401), () => warCampaign(state, 1));

    expect({
      war: {
        victory: result.victory,
        deaths: result.deaths,
        wounded: result.wounded,
        loot: result.loot,
        messages: result.messages.map((message) => ({
          type: message.type,
          text: message.text,
        })),
      },
      state: {
        population: round(state.resource.human.amount),
        garrisonWorkers: state.civic.garrison.workers,
        garrisonWounded: state.civic.garrison.wounded,
        protest: state.civic.garrison.protest,
        fatigue: state.civic.garrison.fatigue,
        died: state.stats.died,
        gov1Hstl: state.civic.foreign.gov1.hstl,
      },
    }).toEqual({
      war: {
        victory: false,
        deaths: 2,
        wounded: 0,
        loot: {},
        messages: [
          {
            type: 'danger',
            text: '强攻战役失败！阵亡 2 人，负伤 0 人。',
          },
        ],
      },
      state: {
        population: 16,
        garrisonWorkers: 6,
        garrisonWounded: 0,
        protest: 2,
        fatigue: 1,
        died: 2,
        gov1Hstl: 37,
      },
    });
  });

  it('occupation release re-syncs garrison cap deterministically', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 30, 30);

    state.city.garrison = { count: 10 };
    state.tech.military = 5;
    applySimulationDerivedStateInPlace(state);

    state.civic.garrison.workers = 12;
    state.civic.garrison.max = 10;
    state.civic.foreign.gov0.occ = true;

    const result = warCampaign(state, 0);

    expect({
      war: {
        victory: result.victory,
        messages: result.messages.map((message) => ({
          type: message.type,
          text: message.text,
        })),
      },
      state: {
        workers: state.civic.garrison.workers,
        max: state.civic.garrison.max,
        raid: state.civic.garrison.raid,
        occupied: state.civic.foreign.gov0.occ,
      },
    }).toEqual({
      war: {
        victory: false,
        messages: [
          {
            type: 'info',
            text: '驻军已撤回。',
          },
        ],
      },
      state: {
        workers: 14,
        max: 30,
        raid: 0,
        occupied: false,
      },
    });
  });

  it('event scheduler remains deterministic when only one major and one minor event qualify', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 1, 1);

    state.resource.Lumber.display = true;
    state.resource.Lumber.amount = 120;
    state.resource.Money.display = true;
    state.resource.Money.amount = 90;
    state.resource.Food.amount = 10;
    state.event.t = 1;
    state.m_event.t = 1;

    const result = runSimulationTick(state, { random: createDeterministicRandom(505) });

    expect({
      messages: result.result.messages.map((message) => ({
        type: message.type,
        category: message.category,
        text: message.text,
      })),
      resources: {
        food: round(result.state.resource.Food.amount),
        lumber: round(result.state.resource.Lumber.amount),
        money: round(result.state.resource.Money.amount),
      },
      timers: {
        major: result.state.event.t,
        majorLast: result.state.event.l,
        minor: result.state.m_event.t,
        minorLast: result.state.m_event.l,
      },
    }).toEqual({
      messages: [
        {
          type: 'warning',
          category: 'event',
          text: '🔥 火灾！木材仓库起火，损失了 9 木材！',
        },
        {
          type: 'info',
          category: 'event',
          text: '🦹 有小偷！钱包里少了 1 金币。',
        },
      ],
      resources: {
        food: 9.875,
        lumber: 111,
        money: 89,
      },
      timers: {
        major: 169,
        majorLast: 'fire',
        minor: 297,
        minorLast: 'pickpocket',
      },
    });
  });

  it('auto trade routes remain deterministic across a short market cycle', () => {
    let state = createNewGame();
    bootstrapCivilization(state, 'human', 6, 6);

    state.resource.Food.amount = 180;
    state.resource.Lumber.amount = 40;
    state.resource.Stone.amount = 120;
    state.resource.Money.amount = 500;
    state.resource.Knowledge.amount = 1000;

    state.tech.primitive = 3;
    state.tech.currency = 4;
    state.tech.trade = 3;
    state.city.trade_post = { count: 1 };
    state.city.storage_yard = { count: 1 };

    applySimulationDerivedStateInPlace(state);
    state = setTradeRoute(state, 0, { resource: 'Food', action: 'buy', qty: 8 });
    state = setTradeRoute(state, 1, { resource: 'Stone', action: 'sell', qty: 4 });
    state = setTradeRoute(state, 2, { resource: 'Lumber', action: 'buy', qty: 12 });
    state = setTradeRoute(state, 3, { resource: 'Food', action: 'none', qty: 1 });
    state = setTradeRoute(state, 4, { resource: 'Food', action: 'none', qty: 1 });
    state.event.t = 999999;
    state.m_event.t = 999999;

    const result = simulateTicks(state, 20, { random: createDeterministicRandom(606) });

    expect({
      routes: ((result.state.city as { trade_routes?: Array<{ resource: string; action: string; qty: number }> }).trade_routes ?? [])
        .map((route) => ({
          resource: route.resource,
          action: route.action,
          qty: route.qty,
        })),
      resources: {
        food: round(result.state.resource.Food.amount),
        lumber: round(result.state.resource.Lumber.amount),
        stone: round(result.state.resource.Stone.amount),
        money: round(result.state.resource.Money.amount),
      },
      tradeLimits: {
        manual: getManualTradeLimit(result.state),
        route: getTradeRouteQtyLimit(result.state),
      },
      days: result.state.stats.days,
    }).toEqual({
      routes: [
        { resource: 'Food', action: 'buy', qty: 8 },
        { resource: 'Stone', action: 'sell', qty: 4 },
        { resource: 'Lumber', action: 'buy', qty: 12 },
        { resource: 'Food', action: 'none', qty: 1 },
        { resource: 'Food', action: 'none', qty: 1 },
      ],
      resources: {
        food: 191,
        lumber: 61,
        stone: 100,
        money: 80,
      },
      tradeLimits: {
        manual: 5000,
        route: 100,
      },
      days: 1,
    });
  });

  it('power priority remains deterministic when generation stops before biolab and factory tiers', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 12, 12);

    state.tech.primitive = 3;
    state.tech.science = 6;
    state.resource.Food.amount = 200;
    state.resource.Knowledge.amount = 100;
    state.resource.Oil.amount = 0.2;

    state.city.oil_power = { count: 1, on: 1 };
    state.city.mine = { count: 2, on: 2 };
    state.city.coal_mine = { count: 1, on: 1 };
    state.city.wardenclyffe = { count: 1, on: 1 };
    state.city.metal_refinery = { count: 1, on: 1 };
    state.city.biolab = { count: 1, on: 1 };
    state.city.factory = { count: 2, on: 2, Alloy: 1, Polymer: 1, Lux: 0, Furs: 0 };
    state.city.casino = { count: 1, on: 1 };

    const directPower = powerTick(state);
    const result = runSimulationTick(state, { random: createDeterministicRandom(707) });

    expect({
      directPower,
      power: result.state.city.power,
      knowledgeMax: result.state.resource.Knowledge.max,
      oil: round(result.state.resource.Oil.amount),
      messages: result.result.messages,
    }).toEqual({
      directPower: {
        fuelDeltas: {
          Oil: -0.65,
        },
        activeConsumers: {
          mine: 2,
          coal_mine: 1,
          wardenclyffe: 1,
          metal_refinery: 0,
          biolab: 0,
          factory: 0,
          casino: 0,
        },
        totalGenerated: 6,
        totalConsumed: 5,
      },
      power: {
        generated: 6,
        consumed: 5,
        surplus: 1,
      },
      knowledgeMax: 1100,
      oil: 0.0375,
      messages: [],
    });
  });

  it('refinery and factory lines remain deterministic across a short industrial cycle', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 12, 16);

    state.resource.Food.amount = 320;
    state.resource.Lumber.amount = 420;
    state.resource.Stone.amount = 300;
    state.resource.Copper.amount = 260;
    state.resource.Iron.amount = 180;
    state.resource.Coal.amount = 220;
    state.resource.Knowledge.amount = 150;
    state.resource.Money.amount = 500;
    state.resource.Oil.amount = 80;
    state.resource.Aluminium.amount = 90;
    state.resource.Steel.amount = 45;
    state.resource.Alloy.amount = 0;
    state.resource.Polymer.amount = 0;

    state.tech.primitive = 3;
    state.tech.agriculture = 4;
    state.tech.mining = 4;
    state.tech.pickaxe = 2;
    state.tech.dowsing = 2;
    state.tech.explosives = 2;
    state.tech.science = 2;
    state.tech.currency = 1;
    state.tech.oil = 1;
    state.tech.high_tech = 3;
    state.tech.smelting = 5;
    state.tech.alumina = 1;

    state.city.basic_housing = { count: 8 };
    state.city.cottage = { count: 2 };
    state.city.farm = { count: 2 };
    state.city.coal_power = { count: 1, on: 1 };
    state.city.oil_power = { count: 1, on: 1 };
    state.city.mine = { count: 1, on: 1 };
    state.city.coal_mine = { count: 1, on: 1 };
    state.city.metal_refinery = { count: 1, on: 1 };
    state.city.oil_well = { count: 2 };
    state.city.smelter = { count: 1 };
    state.city.library = { count: 1 };
    state.city.factory = { count: 2, on: 2, Alloy: 1, Polymer: 1, Lux: 0, Furs: 0 };

    setJobWorkers(state, 'unemployed', 4);
    setJobWorkers(state, 'hunter', 1);
    setJobWorkers(state, 'farmer', 2);
    setJobWorkers(state, 'lumberjack', 1);
    setJobWorkers(state, 'quarry_worker', 1);
    setJobWorkers(state, 'miner', 1);
    setJobWorkers(state, 'coal_miner', 1);
    setJobWorkers(state, 'professor', 1);
    state.event.t = 999999;
    state.m_event.t = 999999;

    const result = simulateTicks(state, 20, { random: createDeterministicRandom(808) });

    expect({
      power: result.state.city.power,
      resources: {
        lumber: round(result.state.resource.Lumber.amount),
        stone: round(result.state.resource.Stone.amount),
        copper: round(result.state.resource.Copper.amount),
        iron: round(result.state.resource.Iron.amount),
        coal: round(result.state.resource.Coal.amount),
        oil: round(result.state.resource.Oil.amount),
        aluminium: round(result.state.resource.Aluminium.amount),
        steel: round(result.state.resource.Steel.amount),
        alloy: round(result.state.resource.Alloy.amount),
        polymer: round(result.state.resource.Polymer.amount),
        knowledge: round(result.state.resource.Knowledge.amount),
        money: round(result.state.resource.Money.amount),
      },
      days: result.state.stats.days,
    }).toEqual({
      power: {
        generated: 11,
        consumed: 10,
        surplus: 1,
      },
      resources: {
        lumber: 129.5852,
        stone: 183.1278,
        copper: 97.3996,
        iron: 92.5117,
        coal: 42.0351,
        oil: 79.85,
        aluminium: 49.75,
        steel: 49.32,
        alloy: 0.375,
        polymer: 0.625,
        knowledge: 157.6524,
        money: 516,
      },
      days: 1,
    });
  });

  it('government cooldown and tax boundaries remain deterministic', () => {
    let state = createNewGame();
    bootstrapCivilization(state, 'human', 6, 6);

    state.tech.govern = 1;
    state.civic.taxes.tax_rate = 20;

    state = must(changeGovernment(state, 'oligarchy'), 'change_oligarchy');
    const blockedDuringCooldown = changeGovernment(state, 'democracy');
    state = setTaxRate(state, 99);

    for (let i = 0; i < 250; i++) {
      tickGovernmentCooldown(state);
    }

    const cooledState = state;
    state = must(changeGovernment(state, 'democracy'), 'change_democracy');
    state = setTaxRate(state, 99);

    expect({
      afterOligarchy: {
        type: cooledState.civic.govern.type,
        rev: cooledState.civic.govern.rev,
        taxRate: cooledState.civic.taxes.tax_rate,
        maxTaxRate: getMaxTaxRate(cooledState),
        taxMultiplier: getTaxMultiplier(cooledState),
      },
      blockedDuringCooldown: blockedDuringCooldown === null,
      afterDemocracy: {
        type: state.civic.govern.type,
        rev: state.civic.govern.rev,
        taxRate: state.civic.taxes.tax_rate,
        maxTaxRate: getMaxTaxRate(state),
        taxMultiplier: getTaxMultiplier(state),
      },
    }).toEqual({
      afterOligarchy: {
        type: 'oligarchy',
        rev: 0,
        taxRate: 40,
        maxTaxRate: 40,
        taxMultiplier: 0.95,
      },
      blockedDuringCooldown: true,
      afterDemocracy: {
        type: 'democracy',
        rev: 250,
        taxRate: 20,
        maxTaxRate: 20,
        taxMultiplier: 1,
      },
    });
  });

  it('storage crate and container allocation chain remains deterministic', () => {
    let state = createNewGame();
    bootstrapCivilization(state, 'human', 6, 6);

    state.tech.container = 2;
    state.tech.steel_container = 1;
    state.city.storage_yard = { count: 1 };
    state.city.warehouse = { count: 1 };
    state.resource.Plywood.amount = 40;
    state.resource.Steel.amount = 300;

    applySimulationDerivedStateInPlace(state);
    state = must(buildCrate(state, 3), 'build_crates');
    state = must(buildContainer(state, 2), 'build_containers');
    state = must(assignCrate(state, 'Lumber', 2), 'assign_crate_lumber');
    state = must(assignCrate(state, 'Stone', 1), 'assign_crate_stone');
    state = must(assignContainer(state, 'Lumber', 1), 'assign_container_lumber');
    state = must(assignContainer(state, 'Coal', 1), 'assign_container_coal');
    applySimulationDerivedStateInPlace(state);

    const allocatedSnapshot = {
      crates: {
        amount: state.resource.Crates.amount,
        max: state.resource.Crates.max,
      },
      containers: {
        amount: state.resource.Containers.amount,
        max: state.resource.Containers.max,
      },
      assignments: {
        lumberCrates: state.resource.Lumber.crates,
        stoneCrates: state.resource.Stone.crates,
        lumberContainers: state.resource.Lumber.containers,
        coalContainers: state.resource.Coal.containers,
      },
      caps: {
        lumber: state.resource.Lumber.max,
        stone: state.resource.Stone.max,
        coal: state.resource.Coal.max,
      },
    };

    state = must(unassignCrate(state, 'Lumber', 1), 'unassign_crate_lumber');
    state = must(unassignContainer(state, 'Coal', 1), 'unassign_container_coal');
    applySimulationDerivedStateInPlace(state);

    expect({
      allocated: allocatedSnapshot,
      afterUnassign: {
        assignments: {
          lumberCrates: state.resource.Lumber.crates,
          stoneCrates: state.resource.Stone.crates,
          lumberContainers: state.resource.Lumber.containers,
          coalContainers: state.resource.Coal.containers,
        },
        caps: {
          lumber: state.resource.Lumber.max,
          stone: state.resource.Stone.max,
          coal: state.resource.Coal.max,
        },
      },
    }).toEqual({
      allocated: {
        crates: {
          amount: 3,
          max: 10,
        },
        containers: {
          amount: 2,
          max: 10,
        },
        assignments: {
          lumberCrates: 2,
          stoneCrates: 1,
          lumberContainers: 1,
          coalContainers: 1,
        },
        caps: {
          lumber: 2000,
          stone: 700,
          coal: 850,
        },
      },
      afterUnassign: {
        assignments: {
          lumberCrates: 1,
          stoneCrates: 1,
          lumberContainers: 1,
          coalContainers: 0,
        },
        caps: {
          lumber: 1500,
          stone: 700,
          coal: 50,
        },
      },
    });
  });

  it('queue cancellation refunds partial build progress deterministically', () => {
    let state = createNewGame();
    bootstrapCivilization(state, 'human', 1, 1);

    state.tech.housing = 1;
    state.tech.military = 1;
    state.tech.queue = 1;
    state.resource.Money.amount = 100;
    state.resource.Stone.amount = 100;
    state.resource.Food.amount = 20;

    state = must(enqueueStructure(state, 'garrison'), 'enqueue_garrison');
    const ticked = runSimulationTick(state, { random: createDeterministicRandom(1001) });
    const cancelled = must(dequeueStructure(ticked.state, 0), 'dequeue_garrison');

    expect({
      afterTick: {
        queueLength: ticked.state.queue.queue.length,
        progress: ticked.state.queue.queue[0]?.progress ?? {},
        money: round(ticked.state.resource.Money.amount),
        stone: round(ticked.state.resource.Stone.amount),
      },
      afterCancel: {
        queueLength: cancelled.queue.queue.length,
        money: round(cancelled.resource.Money.amount),
        stone: round(cancelled.resource.Stone.amount),
      },
    }).toEqual({
      afterTick: {
        queueLength: 1,
        progress: {
          Money: 100,
          Stone: 100,
        },
        money: 0,
        stone: 0,
      },
      afterCancel: {
        queueLength: 0,
        money: 100,
        stone: 100,
      },
    });
  });

  it('staggered queue progression remains deterministic across serial completions', () => {
    let state = createNewGame();
    bootstrapCivilization(state, 'human', 1, 1);

    state.tech.housing = 1;
    state.tech.military = 1;
    state.tech.queue = 2;
    state.resource.Lumber.amount = 10;
    state.resource.Money.amount = 200;
    state.resource.Stone.amount = 100;
    state.resource.Food.amount = 20;

    state = must(enqueueStructure(state, 'basic_housing'), 'enqueue_basic_housing');
    state = must(enqueueStructure(state, 'garrison'), 'enqueue_garrison');

    const afterHousingFunding = runSimulationTick(state, { random: createDeterministicRandom(1201) }).state;
    const afterHousingComplete = runSimulationTick(afterHousingFunding, { random: createDeterministicRandom(1202) }).state;
    const afterPartialGarrison = runSimulationTick(afterHousingComplete, { random: createDeterministicRandom(1203) }).state;
    const partialSnapshot = {
      queueLength: afterPartialGarrison.queue.queue.length,
      progress: { ...(afterPartialGarrison.queue.queue[0]?.progress ?? {}) },
      garrisonCount: buildingCount(afterPartialGarrison, 'garrison'),
      garrisonMax: afterPartialGarrison.civic.garrison.max,
      money: round(afterPartialGarrison.resource.Money.amount),
      stone: round(afterPartialGarrison.resource.Stone.amount),
    };

    afterPartialGarrison.resource.Money.amount += 40;
    afterPartialGarrison.resource.Stone.amount += 160;

    const afterGarrisonFunding = runSimulationTick(afterPartialGarrison, { random: createDeterministicRandom(1204) }).state;
    const completed = runSimulationTick(afterGarrisonFunding, { random: createDeterministicRandom(1205) }).state;

    expect({
      afterHousingFunding: {
        queueLength: afterHousingFunding.queue.queue.length,
        nextId: afterHousingFunding.queue.queue[0]?.id ?? null,
        progress: afterHousingFunding.queue.queue[0]?.progress ?? {},
        housingCount: buildingCount(afterHousingFunding, 'basic_housing'),
        lumber: round(afterHousingFunding.resource.Lumber.amount),
      },
      afterHousingComplete: {
        queueLength: afterHousingComplete.queue.queue.length,
        nextId: afterHousingComplete.queue.queue[0]?.id ?? null,
        housingCount: buildingCount(afterHousingComplete, 'basic_housing'),
        garrisonCount: buildingCount(afterHousingComplete, 'garrison'),
        popMax: round(afterHousingComplete.resource.human.max),
        money: round(afterHousingComplete.resource.Money.amount),
        stone: round(afterHousingComplete.resource.Stone.amount),
      },
      afterPartialGarrison: {
        ...partialSnapshot,
      },
      afterGarrisonFunding: {
        queueLength: afterGarrisonFunding.queue.queue.length,
        progress: afterGarrisonFunding.queue.queue[0]?.progress ?? {},
        garrisonCount: buildingCount(afterGarrisonFunding, 'garrison'),
        money: round(afterGarrisonFunding.resource.Money.amount),
        stone: round(afterGarrisonFunding.resource.Stone.amount),
      },
      completed: {
        queueLength: completed.queue.queue.length,
        housingCount: buildingCount(completed, 'basic_housing'),
        garrisonCount: buildingCount(completed, 'garrison'),
        garrisonMax: completed.civic.garrison.max,
        popMax: round(completed.resource.human.max),
        money: round(completed.resource.Money.amount),
        stone: round(completed.resource.Stone.amount),
      },
    }).toEqual({
      afterHousingFunding: {
        queueLength: 2,
        nextId: 'basic_housing',
        progress: {
          Lumber: 10,
        },
        housingCount: 0,
        lumber: 0,
      },
      afterHousingComplete: {
        queueLength: 1,
        nextId: 'garrison',
        housingCount: 1,
        garrisonCount: 0,
        popMax: 1,
        money: 200,
        stone: 100,
      },
      afterPartialGarrison: {
        queueLength: 1,
        progress: {
          Money: 200,
          Stone: 100,
        },
        garrisonCount: 0,
        garrisonMax: 0,
        money: 0,
        stone: 0,
      },
      afterGarrisonFunding: {
        queueLength: 1,
        progress: {
          Money: 240,
          Stone: 260,
        },
        garrisonCount: 0,
        money: 0,
        stone: 0,
      },
      completed: {
        queueLength: 0,
        housingCount: 1,
        garrisonCount: 1,
        garrisonMax: 2,
        popMax: 1,
        money: 0,
        stone: 0,
      },
    });
  });

  it('hospital-assisted population growth remains deterministic', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 5, 6);

    state.city.basic_housing = { count: 6 };
    state.city.hospital = { count: 2 };
    state.tech.reproduction = 2;
    state.tech.medic = 1;
    state.resource.Food.amount = 200;
    state.resource.Money.amount = 200;

    const result = simulateTicks(state, 20, { random: createDeterministicRandom(1104) });

    expect({
      messages: result.result.messages.map((message) => ({
        type: message.type,
        category: message.category,
        text: message.text,
      })),
      population: round(result.state.resource.human.amount),
      popMax: round(result.state.resource.human.max),
      unemployed: jobWorkers(result.state, 'unemployed'),
      food: round(result.state.resource.Food.amount),
      days: result.state.stats.days,
    }).toEqual({
      messages: [
        {
          type: 'success',
          category: 'progress',
          text: '一位新市民加入了你的部落！人口: 6',
        },
      ],
      population: 6,
      popMax: 6,
      unemployed: 6,
      food: 187.5,
      days: 1,
    });
  });

  it('hospital recovery reduces battle wounds deterministically over time', () => {
    const makeState = (hospitalCount: number) => {
      const state = createNewGame();
      bootstrapCivilization(state, 'human', 20, 20);

      state.city.garrison = { count: 5 };
      if (hospitalCount > 0) {
        state.city.hospital = { count: hospitalCount };
      }

      state.city.silo = { count: 2 };
      state.tech.military = 5;
      state.tech.medic = 2;
      state.resource.Food.amount = 1000;
      state.resource.Money.amount = 400;

      applySimulationDerivedStateInPlace(state);
      state.civic.garrison.workers = 10;
      state.civic.garrison.wounded = 6;
      state.civic.garrison.protest = 8;
      state.civic.garrison.fatigue = 4;

      return state;
    };

    const noHospital = simulateTicks(makeState(0), 200, { random: createDeterministicRandom(1304) });
    const withHospital = simulateTicks(makeState(3), 200, { random: createDeterministicRandom(1304) });

    expect({
      noHospital: {
        wounded: noHospital.state.civic.garrison.wounded,
        healProgress: round(noHospital.state.civic.garrison.heal_progress),
        workers: noHospital.state.civic.garrison.workers,
        fatigue: round(noHospital.state.civic.garrison.fatigue),
        protest: round(noHospital.state.civic.garrison.protest),
      },
      withHospital: {
        wounded: withHospital.state.civic.garrison.wounded,
        healProgress: round(withHospital.state.civic.garrison.heal_progress),
        workers: withHospital.state.civic.garrison.workers,
        fatigue: round(withHospital.state.civic.garrison.fatigue),
        protest: round(withHospital.state.civic.garrison.protest),
      },
      messages: withHospital.result.messages.filter((message) => message.category === 'progress').map((message) => ({
        type: message.type,
        text: message.text,
      })),
    }).toEqual({
      noHospital: {
        wounded: 6,
        healProgress: 0,
        workers: 11,
        fatigue: 0,
        protest: 0,
      },
      withHospital: {
        wounded: 0,
        healProgress: 0.075,
        workers: 11,
        fatigue: 0,
        protest: 0,
      },
      messages: [],
    });
  });

  it('garrison training consumes unemployed citizens deterministically', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 10, 10);

    state.city.garrison = { count: 2 };
    state.city.boot_camp = { count: 1 };
    state.tech.military = 5;
    state.tech.boot_camp = 2;
    state.resource.Food.amount = 500;

    applySimulationDerivedStateInPlace(state);

    const result = simulateTicks(state, 200, { random: createDeterministicRandom(1601) });

    expect({
      population: round(result.state.resource.human.amount),
      unemployed: jobWorkers(result.state, 'unemployed'),
      soldiers: result.state.civic.garrison.workers,
      garrisonMax: result.state.civic.garrison.max,
      progress: round(result.state.civic.garrison.progress),
      days: result.state.stats.days,
    }).toEqual({
      population: 10,
      unemployed: 9,
      soldiers: 1,
      garrisonMax: 6,
      progress: 35,
      days: 10,
    });
  });

  it('starvation deaths keep garrison and population totals in sync', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 6, 6);

    (state.civic.unemployed as { workers: number }).workers = 0;
    (state.civic.farmer as { workers: number }).workers = 2;
    (state.civic.lumberjack as { workers: number }).workers = 1;
    state.city.garrison = { count: 2 };
    state.tech.military = 5;
    applySimulationDerivedStateInPlace(state);
    state.civic.garrison.workers = 3;
    state.civic.garrison.raid = 3;
    state.resource.Food.amount = 0;

    const result = simulateTicks(state, 5000, { random: createDeterministicRandom(1702) });
    const workforceTotal =
      jobWorkers(result.state, 'unemployed')
      + jobWorkers(result.state, 'farmer')
      + jobWorkers(result.state, 'lumberjack')
      + result.state.civic.garrison.workers;

    expect({
      population: round(result.state.resource.human.amount),
      unemployed: jobWorkers(result.state, 'unemployed'),
      farmer: jobWorkers(result.state, 'farmer'),
      lumberjack: jobWorkers(result.state, 'lumberjack'),
      soldiers: result.state.civic.garrison.workers,
      raid: result.state.civic.garrison.raid,
      workforceTotal,
    }).toEqual({
      population: 1,
      unemployed: 0,
      farmer: 0,
      lumberjack: 0,
      soldiers: 1,
      raid: 1,
      workforceTotal: 1,
    });
  });

  it('garrison cap shrink clamps workers and raid deterministically', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 20, 20);

    state.city.garrison = { count: 3 };
    state.tech.military = 5;
    applySimulationDerivedStateInPlace(state);

    state.civic.garrison.workers = 9;
    state.civic.garrison.wounded = 4;
    state.civic.garrison.raid = 8;

    (state.city.garrison as { count: number }).count = 1;
    applySimulationDerivedStateInPlace(state);

    expect({
      workers: state.civic.garrison.workers,
      max: state.civic.garrison.max,
      wounded: state.civic.garrison.wounded,
      raid: state.civic.garrison.raid,
    }).toEqual({
      workers: 3,
      max: 3,
      wounded: 3,
      raid: 3,
    });
  });
});

// ============================================================
// 种族特质行为审计
// ============================================================

describe('[audit] diverse — human 训练速度比 elven 慢', () => {
  it('40 tick 内 human 训练出的士兵 ≤ elven', () => {
    function trainTicks(species: string, ticks: number): number {
      const s = createNewGame();
      bootstrapCivilization(s, species, 10, 20);
      assignSpeciesTraits(s.race, species);
      s.civic.garrison = {
        workers: 0, max: 10, wounded: 0, raid: 0,
        mercs: false, m_use: 0, rate: 0, progress: 0,
      } as any;
      (s.civic.unemployed as any).workers = 10;
      let state = s;
      for (let i = 0; i < ticks; i++) {
        state = runSimulationTick(state, { random: createDeterministicRandom(i) }).state;
      }
      return state.civic.garrison.workers;
    }
    const humanSoldiers = trainTicks('human', 40);
    const elvenSoldiers = trainTicks('elven', 40);
    expect(humanSoldiers).toBeLessThanOrEqual(elvenSoldiers);
  });
});

describe('[audit] brute — orc 训练速度比 elven 快，佣兵费用更低', () => {
  it('20 tick 内 orc 训练出的士兵 ≥ elven', () => {
    function trainTicks(species: string, ticks: number): number {
      const s = createNewGame();
      bootstrapCivilization(s, species, 10, 20);
      assignSpeciesTraits(s.race, species);
      s.civic.garrison = {
        workers: 0, max: 10, wounded: 0, raid: 0,
        mercs: false, m_use: 0, rate: 0, progress: 0,
      } as any;
      (s.civic.unemployed as any).workers = 10;
      let state = s;
      for (let i = 0; i < ticks; i++) {
        state = runSimulationTick(state, { random: createDeterministicRandom(i) }).state;
      }
      return state.civic.garrison.workers;
    }
    const orcSoldiers = trainTicks('orc', 20);
    const elvenSoldiers = trainTicks('elven', 20);
    expect(orcSoldiers).toBeGreaterThanOrEqual(elvenSoldiers);
  });

  it('orc 佣兵费用是 human 的一半（garrison=3）', () => {
    const orc = createNewGame();
    bootstrapCivilization(orc, 'orc', 5, 20);
    assignSpeciesTraits(orc.race, 'orc');
    orc.civic.garrison = {
      workers: 3, max: 10, wounded: 0, raid: 0,
      mercs: false, m_use: 0, rate: 0, progress: 0,
    } as any;

    const human = createNewGame();
    bootstrapCivilization(human, 'human', 5, 20);
    assignSpeciesTraits(human.race, 'human');
    human.civic.garrison = {
      workers: 3, max: 10, wounded: 0, raid: 0,
      mercs: false, m_use: 0, rate: 0, progress: 0,
    } as any;

    expect(mercCost(orc)).toBeCloseTo(mercCost(human) * 0.5, -1);
  });
});

describe('[audit] angry — orc 食物耗尽时产出降至 25%', () => {
  it('elven 饥饿时产出 50%；orc 饥饿时产出 25%', () => {
    function lumberAfter1Tick(species: string, foodAmount: number): number {
      const s = createNewGame();
      bootstrapCivilization(s, species, 5, 20);
      assignSpeciesTraits(s.race, species);
      s.resource['Food'].amount = foodAmount;
      s.resource['Lumber'] = {
        name: 'Lumber', display: true, value: 0,
        amount: 0, max: 9999, rate: 0, crates: 0, diff: 0, delta: 0,
      };
      s.civic['lumberjack'] = { workers: 4, max: -1, display: true } as any;
      (s.civic.unemployed as any).workers = 1;
      const result = runSimulationTick(s, { random: createDeterministicRandom(0) });
      return result.state.resource['Lumber'].diff ?? 0;
    }

    const fedElven = lumberAfter1Tick('elven', 200);
    const hungryElven = lumberAfter1Tick('elven', 0);
    const hungryOrc = lumberAfter1Tick('orc', 0);

    expect(hungryElven).toBeCloseTo(fedElven * 0.5, 1);
    expect(hungryOrc).toBeCloseTo(fedElven * 0.25, 1);
  });
});

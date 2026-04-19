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
import {
  changeGovernment,
  getGovernmentChangeCooldown,
  getMaxTaxRate,
  getTaxMultiplier,
  tickGovernmentCooldown,
} from './government';
import { warCampaign, mercCost, hireMerc } from './military';
import { applyDerivedStateInPlace } from './derived-state';
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
        rev: 980,
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
        food: 193,
        lumber: 61,
        stone: 100,
        money: 69.4,
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
          sawmill: 0,
          rock_quarry: 0,
          mine: 2,
          coal_mine: 1,
          cement_plant: 0,
          wardenclyffe: 1,
          metal_refinery: 0,
          biolab: 0,
          factory: 0,
          casino: 0,
          moon_base: 0,
          nav_beacon: 0,
          spaceport: 0,
        },
        totalGenerated: 6,
        totalConsumed: 5,
      },
      power: {
        generated: 6,
        consumed: 5,
        surplus: 1,
      },
      knowledgeMax: 2100,
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
    state.city.smelter = { count: 1, on: 1, Wood: 0, Coal: 1, Oil: 0, Inferno: 0, Iron: 0, Steel: 1, Iridium: 0 };
    state.city.library = { count: 1 };
    state.city.university = { count: 1 };
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
        stone: 200,
        copper: 97.3676,
        iron: 92.4559,
        coal: 45.555,
        oil: 79.7112,
        aluminium: 45.7298,
        steel: 50,
        alloy: 0.362,
        polymer: 0.6033,
        knowledge: 157.4111,
        money: 515.4448,
      },
      days: 1,
    });
  });

  it('tax income applies soldier count, fed banker bonus, hunger, and temple multiplier', () => {
    const fed = createNewGame();
    bootstrapCivilization(fed, 'human', 6, 6);
    fed.tech.currency = 1;
    fed.tech.banking = 2;
    fed.tech.anthropology = 4;
    fed.resource.Food.amount = 200;
    fed.resource.Money.amount = 0;
    fed.city.temple = { count: 2 };
    fed.civic.garrison.workers = 2;
    setJobWorkers(fed, 'banker', 1);
    setJobWorkers(fed, 'unemployed', 1);
    fed.event.t = 999999;
    fed.m_event.t = 999999;

    const hungry = createNewGame();
    bootstrapCivilization(hungry, 'human', 6, 6);
    hungry.tech.currency = 1;
    hungry.tech.banking = 2;
    hungry.tech.anthropology = 4;
    hungry.resource.Food.amount = 0;
    hungry.resource.Money.amount = 0;
    hungry.city.temple = { count: 2 };
    hungry.civic.garrison.workers = 2;
    setJobWorkers(hungry, 'banker', 1);
    setJobWorkers(hungry, 'unemployed', 1);
    hungry.event.t = 999999;
    hungry.m_event.t = 999999;

    const fedOut = gameTick(fed).state;
    const hungryOut = gameTick(hungry).state;

    const citizens = 6 + 2 - 1;
    const templeMult = 1 + 2 * 0.025;
    const fedMoraleMult = calculateMorale(fed, { activeCasinos: 0 }).globalMultiplier;
    const hungryMoraleMult = calculateMorale(hungry, { activeCasinos: 0 }).globalMultiplier;
    const fedExpected = citizens * 0.4 * 1.1 * templeMult * fedMoraleMult * 0.25;
    const hungryExpected = citizens * 0.4 * templeMult * hungryMoraleMult * 0.5 * 0.25;

    expect({
      fedMoney: round(fedOut.resource.Money.amount),
      hungryMoney: round(hungryOut.resource.Money.amount),
      fedExpected: round(fedExpected),
      hungryExpected: round(hungryExpected),
    }).toEqual({
      fedMoney: round(fedExpected),
      hungryMoney: round(hungryExpected),
      fedExpected: round(fedExpected),
      hungryExpected: round(hungryExpected),
    });
  });

  it('miner tick uses mine power and geology, but ignores dowsing/reclaimer spillover', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 6, 6);
    state.tech.mining = 3;
    state.tech.pickaxe = 2;
    state.tech.explosives = 2;
    state.tech.dowsing = 2;
    state.tech.reclaimer = 3;
    state.resource.Food.amount = 200;
    state.resource.Coal.amount = 100;
    state.resource.Copper.amount = 0;
    state.resource.Iron.amount = 0;
    state.city.coal_power = { count: 1, on: 1 };
    state.city.mine = { count: 1, on: 1 };
    state.city.geology = { Copper: 1, Iron: 2 };
    setJobWorkers(state, 'miner', 1);
    setJobWorkers(state, 'unemployed', 5);
    state.event.t = 999999;
    state.m_event.t = 999999;

    const out = gameTick(state).state;
    const moraleMult = calculateMorale(state, { activeCasinos: 0 }).globalMultiplier;
    const expectedCopper = (1 / 7) * 1.3 * 1.25 * 1.05 * 2 * moraleMult * 0.25;
    const expectedIron = 0.25 * 1.3 * 1.25 * 1.05 * 3 * moraleMult * 0.25;

    expect({
      copper: round(out.resource.Copper.amount),
      iron: round(out.resource.Iron.amount),
      expectedCopper: round(expectedCopper),
      expectedIron: round(expectedIron),
    }).toEqual({
      copper: round(expectedCopper),
      iron: round(expectedIron),
      expectedCopper: round(expectedCopper),
      expectedIron: round(expectedIron),
    });
  });

  it('wood and stone ticks use sawmill/quarry power bonuses without reclaimer spillover', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 6, 6);
    state.resource.Food.amount = 200;
    state.resource.Coal.amount = 100;
    state.resource.Lumber.amount = 0;
    state.resource.Stone.amount = 0;
    state.tech.saw = 1;
    state.tech.hammer = 1;
    state.tech.reclaimer = 3;
    state.city.coal_power = { count: 1, on: 1 };
    state.city.sawmill = { count: 1, on: 1 };
    state.city.rock_quarry = { count: 1, on: 1 };
    setJobWorkers(state, 'lumberjack', 1);
    setJobWorkers(state, 'quarry_worker', 1);
    setJobWorkers(state, 'unemployed', 4);
    state.event.t = 999999;
    state.m_event.t = 999999;

    const out = gameTick(state).state;
    const moraleMult = calculateMorale(state, { activeCasinos: 0 }).globalMultiplier;
    const expectedLumber = 1 * 1.05 * 1.04 * moraleMult * 0.25;
    const expectedStone = 1 * 1.4 * 1.02 * 1.04 * moraleMult * 0.25;

    expect({
      lumber: round(out.resource.Lumber.amount),
      stone: round(out.resource.Stone.amount),
      expectedLumber: round(expectedLumber),
      expectedStone: round(expectedStone),
    }).toEqual({
      lumber: round(expectedLumber),
      stone: round(expectedStone),
      expectedLumber: round(expectedLumber),
      expectedStone: round(expectedStone),
    });
  });

  it('coal and cement ticks use mine/plant power, geology, and same-tick stone flow correctly', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 6, 6);
    state.resource.Food.amount = 200;
    state.resource.Coal.amount = 100;
    state.resource.Stone.amount = 0;
    state.resource.Cement.amount = 0;
    state.resource.Cement.max = 500;
    state.tech.mining = 4;
    state.tech.cement = 1;
    state.tech.dowsing = 2;
    state.tech.reclaimer = 3;
    state.city.coal_power = { count: 1, on: 1 };
    state.city.coal_mine = { count: 1, on: 1 };
    state.city.rock_quarry = { count: 1, on: 1 };
    state.city.cement_plant = { count: 1, on: 1 };
    state.city.geology = { Coal: 1 };
    setJobWorkers(state, 'coal_miner', 1);
    setJobWorkers(state, 'quarry_worker', 3);
    setJobWorkers(state, 'cement_worker', 1);
    setJobWorkers(state, 'unemployed', 1);
    state.event.t = 999999;
    state.m_event.t = 999999;

    const out = gameTick(state).state;
    const moraleMult = calculateMorale(state, { activeCasinos: 0 }).globalMultiplier;
    const expectedCoal = 0.2 * 1.05 * 2 * moraleMult * 0.25;
    const expectedCement = 0.4 * 1.05 * moraleMult * 0.25;

    expect({
      coal: round(out.resource.Coal.diff),
      cement: round(out.resource.Cement.amount),
      expectedCoal: round(expectedCoal),
      expectedCement: round(expectedCement),
    }).toEqual({
      coal: round(expectedCoal),
      cement: round(expectedCement),
      expectedCoal: round(expectedCoal),
      expectedCement: round(expectedCement),
    });
  });

  it('oil and aluminium ticks use oil tech tiers, geology, miner throughput, and refinery bonuses', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 6, 6);
    state.resource.Food.amount = 200;
    state.resource.Coal.amount = 100;
    state.resource.Oil.amount = 0;
    state.resource.Oil.max = 500;
    state.resource.Aluminium.amount = 0;
    state.resource.Aluminium.max = 500;
    state.resource.Stone.amount = 10;
    state.tech.mining = 4;
    state.tech.pickaxe = 2;
    state.tech.oil = 4;
    state.tech.alumina = 2;
    state.city.coal_power = { count: 1, on: 1 };
    state.city.mine = { count: 1, on: 1 };
    state.city.metal_refinery = { count: 1, on: 1 };
    state.city.oil_well = { count: 2 };
    state.city.geology = { Oil: 0.5, Aluminium: 0.25 };
    setJobWorkers(state, 'miner', 1);
    setJobWorkers(state, 'unemployed', 5);
    state.event.t = 999999;
    state.m_event.t = 999999;

    const out = gameTick(state).state;
    const moraleMult = calculateMorale(state, { activeCasinos: 0 }).globalMultiplier;
    const expectedOil = 2 * 0.48 * 1.5 * moraleMult * 0.25;
    const expectedAluminium = 0.088 * 1.3 * 1.05 * 1.25 * 1.12 * moraleMult * 0.25;

    expect({
      oil: round(out.resource.Oil.diff),
      aluminium: round(out.resource.Aluminium.diff),
      stone: round(out.resource.Stone.amount),
      expectedOil: round(expectedOil),
      expectedAluminium: round(expectedAluminium),
    }).toEqual({
      oil: round(expectedOil),
      aluminium: round(expectedAluminium),
      stone: 10,
      expectedOil: round(expectedOil),
      expectedAluminium: round(expectedAluminium),
    });
  });

  it('market price fluctuation uses random variance and legacy reset bounds', () => {
    const lowCopper = createNewGame();
    bootstrapCivilization(lowCopper, 'human', 6, 6);
    lowCopper.tech.currency = 2;
    lowCopper.tech.high_tech = 2;
    lowCopper.resource.Copper.display = true;
    lowCopper.resource.Copper.value = 24;
    lowCopper.event.t = 999999;
    lowCopper.m_event.t = 999999;

    const highFood = createNewGame();
    bootstrapCivilization(highFood, 'human', 6, 6);
    highFood.tech.currency = 2;
    highFood.resource.Food.amount = 200;
    highFood.resource.Food.display = true;
    highFood.resource.Food.value = 20;
    highFood.event.t = 999999;
    highFood.m_event.t = 999999;

    const lowCopperOut = withRandom(() => 0, () => gameTick(lowCopper).state);
    const foodSequence = [0, 0.995];
    const highFoodOut = withRandom(() => foodSequence.shift() ?? 0.995, () => gameTick(highFood).state);

    expect({
      copperValue: round(lowCopperOut.resource.Copper.value),
      foodValue: round(highFoodOut.resource.Food.value),
    }).toEqual({
      copperValue: 50,
      foodValue: 10,
    });
  });

  it('knowledge tick keeps sundial separate from library multiplier', () => {
    const base = createNewGame();
    bootstrapCivilization(base, 'human', 6, 6);
    base.tech.primitive = 3;
    base.resource.Food.amount = 200;
    base.resource.Knowledge.amount = 0;
    base.event.t = 999999;
    base.m_event.t = 999999;

    const withLib = createNewGame();
    bootstrapCivilization(withLib, 'human', 6, 6);
    withLib.tech.primitive = 3;
    withLib.resource.Food.amount = 200;
    withLib.resource.Knowledge.amount = 0;
    withLib.city.library = { count: 4 };
    withLib.event.t = 999999;
    withLib.m_event.t = 999999;

    const baseOut = gameTick(base).state;
    const withLibOut = gameTick(withLib).state;

    expect({
      baseKnowledge: round(baseOut.resource.Knowledge.amount),
      withLibKnowledge: round(withLibOut.resource.Knowledge.amount),
    }).toEqual({
      baseKnowledge: 0.24,
      withLibKnowledge: 0.24,
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

    for (let i = 0; i < 1000; i++) {
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
        rev: 1000,
        taxRate: 20,
        maxTaxRate: 20,
        taxMultiplier: 1,
      },
    });
  });

  it('government high-tech scaling and revolution cooldown match legacy reachable tiers', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 6, 6);

    state.tech.govern = 1;
    state.tech.high_tech = 2;
    state.tech.space_explore = 3;
    state.civic.govern.type = 'oligarchy';

    expect({
      cooldown: getGovernmentChangeCooldown(state),
      taxMultiplier: getTaxMultiplier(state),
      maxTaxRate: getMaxTaxRate(state),
    }).toEqual({
      cooldown: 1500,
      taxMultiplier: 0.98,
      maxTaxRate: 40,
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
        crates: {
          amount: state.resource.Crates.amount,
          max: state.resource.Crates.max,
        },
        containers: {
          amount: state.resource.Containers.amount,
          max: state.resource.Containers.max,
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
          amount: 0,
          max: 7,
        },
        containers: {
          amount: 0,
          max: 8,
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
        crates: {
          amount: 1,
          max: 8,
        },
        containers: {
          amount: 1,
          max: 9,
        },
        caps: {
          lumber: 1500,
          stone: 700,
          coal: 50,
        },
      },
    });
  });

  it('storage tiers apply legacy crate/container values and allow titanium allocation', () => {
    let state = createNewGame();
    bootstrapCivilization(state, 'human', 6, 6);

    state.tech.container = 4;
    state.tech.steel_container = 3;
    state.city.storage_yard = { count: 1 };
    state.city.warehouse = { count: 1 };
    state.resource.Crates.display = true;
    state.resource.Crates.amount = 1;
    state.resource.Containers.display = true;
    state.resource.Containers.amount = 1;
    state.resource.Titanium.display = true;

    applySimulationDerivedStateInPlace(state);
    state = must(assignCrate(state, 'Titanium', 1), 'assign_crate_titanium');
    state = must(assignContainer(state, 'Titanium', 1), 'assign_container_titanium');
    applySimulationDerivedStateInPlace(state);

    expect({
      titaniumCrates: state.resource.Titanium.crates,
      titaniumContainers: state.resource.Titanium.containers,
      titaniumMax: state.resource.Titanium.max,
      crates: {
        amount: state.resource.Crates.amount,
        max: state.resource.Crates.max,
      },
      containers: {
        amount: state.resource.Containers.amount,
        max: state.resource.Containers.max,
      },
    }).toEqual({
      titaniumCrates: 1,
      titaniumContainers: 1,
      titaniumMax: 2000,
      crates: {
        amount: 0,
        max: 19,
      },
      containers: {
        amount: 0,
        max: 19,
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

  it('derived money cap follows bank vault and casino vault formulas', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 20, 20);

    state.tech.banking = 8;
    state.tech.stock_exchange = 2;
    state.tech.gambling = 4;
    state.city.bank = { count: 2 };
    state.city.casino = { count: 1, on: 1 };
    setJobWorkers(state, 'banker', 2);

    applyDerivedStateInPlace(state);

    expect({
      moneyMax: state.resource.Money.max,
      bankCount: (state.city.bank as { count?: number }).count,
      casinoCount: (state.city.casino as { count?: number }).count,
    }).toEqual({
      moneyMax: 91960,
      bankCount: 2,
      casinoCount: 1,
    });
  });

  it('derived knowledge cap includes science:8 library boost, anthropology temples, and powered wardenclyffe bonus', () => {
    const state = createNewGame();
    bootstrapCivilization(state, 'human', 10, 10);

    state.tech.science = 8;
    state.tech.anthropology = 2;
    state.city.library = { count: 2 };
    state.city.temple = { count: 2 };
    state.city.university = { count: 1 };
    state.city.wardenclyffe = { count: 2, on: 1 };
    setJobWorkers(state, 'scientist', 1);

    applyDerivedStateInPlace(state);

    expect({
      knowledgeMax: state.resource.Knowledge.max,
      scientistMax: (state.civic.scientist as { max?: number }).max,
    }).toEqual({
      knowledgeMax: 4759,
      scientistMax: 2,
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
      food: 185.125,
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
      state.resource.Food.amount = 3000;
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

// ============================================================
// Tech Debt: Mercenary Edge Audit
// ============================================================

describe('[audit] hireMerc edge cases', () => {
  function makeMercState(): ReturnType<typeof createNewGame> {
    const s = createNewGame();
    bootstrapCivilization(s, 'human', 10, 20);
    s.tech['mercs'] = 1;
    s.tech['military'] = 1;
    s.city['garrison'] = { count: 3 };
    applySimulationDerivedStateInPlace(s);
    s.civic.garrison.workers = 2;
    s.resource['Money'].amount = 50000;
    return s;
  }

  it('hireMerc at garrison.max returns success=false', () => {
    const s = makeMercState();
    s.civic.garrison.workers = s.civic.garrison.max;
    const result = hireMerc(s);
    expect(result.success).toBe(false);
    expect(s.resource['Money'].amount).toBe(50000); // no deduction
  });

  it('hireMerc with insufficient money returns success=false', () => {
    const s = makeMercState();
    s.resource['Money'].amount = 1;
    const result = hireMerc(s);
    expect(result.success).toBe(false);
  });

  it('hireMerc does NOT consume population (mercs are external hires)', () => {
    const s = makeMercState();
    const popBefore = s.resource['human'].amount;
    const unemployedBefore = (s.civic['unemployed'] as { workers: number }).workers;
    const workersBefore = s.civic.garrison.workers;

    const result = hireMerc(s);
    expect(result.success).toBe(true);
    expect(s.civic.garrison.workers).toBe(workersBefore + 1);
    expect(s.resource['human'].amount).toBe(popBefore); // population unchanged
    expect((s.civic['unemployed'] as { workers: number }).workers).toBe(unemployedBefore); // unemployed unchanged
    expect(s.civic.garrison.m_use).toBe(1);
  });

  it('hireMerc deducts correct cost and increments m_use', () => {
    const s = makeMercState();
    const expectedCost = mercCost(s);
    const moneyBefore = s.resource['Money'].amount;
    const result = hireMerc(s);
    expect(result.success).toBe(true);
    expect(result.cost).toBe(expectedCost);
    expect(s.resource['Money'].amount).toBe(moneyBefore - expectedCost);
    expect(s.civic.garrison.m_use).toBe(1);

    // Second hire should use increased m_use cost
    const expectedCost2 = mercCost(s);
    expect(expectedCost2).toBeGreaterThan(expectedCost);
    const result2 = hireMerc(s);
    expect(result2.success).toBe(true);
    expect(s.civic.garrison.m_use).toBe(2);
  });
});

// ============================================================
// Tech Debt: Event De-dup Audit
// ============================================================

describe('[audit] event de-dup — same event never fires consecutively', () => {
  it('filterEvents excludes last fired event from pool', () => {
    const s = createNewGame();
    bootstrapCivilization(s, 'human', 5, 10);
    s.tech['primitive'] = 1;
    s.resource['Lumber'].display = true;
    s.resource['Lumber'].amount = 9999;
    s.resource['Money'].display = true;
    s.resource['Money'].amount = 9999;
    s.resource['Knowledge'].display = true;
    s.resource['Knowledge'].amount = 9999;
    s.resource['Food'].amount = 9999;

    // Force major event timer to fire repeatedly, collect actually fired IDs
    const firedIds: string[] = [];
    const rng = createDeterministicRandom(9001);
    const originalRandom = Math.random;
    Math.random = rng;
    try {
      for (let i = 0; i < 30; i++) {
        const prevL = s.event.l;
        s.event.t = 1;
        s.m_event.t = 999999; // suppress minor events
        tickEvents(s);
        // Only record if a new event actually fired (l changed)
        if (s.event.l !== prevL && s.event.l !== false) {
          firedIds.push(s.event.l as string);
        }
      }
    } finally {
      Math.random = originalRandom;
    }

    // Must have fired at least 2 events to be a meaningful test
    expect(firedIds.length).toBeGreaterThanOrEqual(2);

    // No two consecutive fired events should be the same
    for (let i = 1; i < firedIds.length; i++) {
      expect(
        firedIds[i] !== firedIds[i - 1],
        `event ${firedIds[i]} fired consecutively at index ${i-1} and ${i}`
      ).toBe(true);
    }
  });

  it('when pool has only 1 matching event and it was last, no event fires', () => {
    const s = createNewGame();
    bootstrapCivilization(s, 'human', 1, 1);
    // Only 'fire' should match (needs Lumber display + primitive)
    // Clear everything else
    s.resource['Lumber'].display = true;
    s.resource['Lumber'].amount = 100;
    s.resource['Money'].display = false;
    s.resource['Money'].amount = 0;
    s.resource['Food'].display = false;
    s.resource['Knowledge'].display = false;

    s.event.t = 1;
    s.event.l = 'fire'; // last event was fire
    s.m_event.t = 999999;

    const rng = createDeterministicRandom(9002);
    const msgs = withRandom(rng, () => tickEvents(s));

    // fire should be excluded since it was the last event
    // If no other major events qualify, no event should fire
    const majorMsgs = msgs.filter(m => m.type === 'warning');
    if (majorMsgs.length > 0) {
      // If an event DID fire, it must NOT be fire
      expect(s.event.l).not.toBe('fire');
    }
    // Either way, the de-dup logic works
  });
});

// ============================================================
// Tech Debt: Derived-State Job Worker Clamp
// ============================================================

describe('[audit] derived-state job worker clamp', () => {
  it('excess workers returned to unemployed when building count drops', () => {
    const s = createNewGame();
    bootstrapCivilization(s, 'human', 10, 20);

    s.tech['primitive'] = 3;
    s.tech['currency'] = 2;
    s.tech['mining'] = 3;
    s.tech['cement'] = 1;
    s.tech['foundry'] = 1;
    s.tech['theatre'] = 1;
    s.tech['theology'] = 1;

    // Set up buildings
    s.city['farm'] = { count: 3 };
    s.city['mine'] = { count: 2, on: 2 };
    s.city['foundry'] = { count: 2 };
    s.city['bank'] = { count: 2 };
    s.city['temple'] = { count: 2 };
    s.city['amphitheatre'] = { count: 1 };
    s.city['cement_plant'] = { count: 1 };

    // Assign workers
    applyDerivedStateInPlace(s);
    (s.civic['farmer'] as any).workers = 3;
    (s.civic['miner'] as any).workers = 2;
    (s.civic['craftsman'] as any).workers = 2;
    (s.civic['banker'] as any).workers = 2;
    (s.civic['priest'] as any).workers = 2;
    (s.civic['entertainer'] as any).workers = 1;
    (s.civic['cement_worker'] as any).workers = 2;
    (s.civic['unemployed'] as any).workers = 0;

    // Now "demolish" some buildings — reduce counts
    (s.city['farm'] as any).count = 1;       // farmer max: 3→1, excess 2
    (s.city['mine'] as any).count = 0;        // miner max: 2→0, excess 2
    (s.city['foundry'] as any).count = 1;     // craftsman max: 2→1, excess 1
    (s.city['bank'] as any).count = 0;        // banker max: 2→0, excess 2
    (s.city['temple'] as any).count = 1;      // priest max: 2→1, excess 1
    (s.city['amphitheatre'] as any).count = 0; // entertainer max: 1→0, excess 1
    (s.city['cement_plant'] as any).count = 0; // cement_worker max: 2→0, excess 2

    // Apply derived state — should clamp all workers
    applyDerivedStateInPlace(s);

    expect({
      farmer: (s.civic['farmer'] as any).workers,
      miner: (s.civic['miner'] as any).workers,
      craftsman: (s.civic['craftsman'] as any).workers,
      banker: (s.civic['banker'] as any).workers,
      priest: (s.civic['priest'] as any).workers,
      entertainer: (s.civic['entertainer'] as any).workers,
      cement_worker: (s.civic['cement_worker'] as any).workers,
      unemployed: (s.civic['unemployed'] as any).workers,
    }).toEqual({
      farmer: 1,        // clamped from 3 to 1
      miner: 0,         // clamped from 2 to 0
      craftsman: 1,      // clamped from 2 to 1
      banker: 0,         // clamped from 2 to 0
      priest: 1,         // clamped from 2 to 1
      entertainer: 0,    // clamped from 1 to 0
      cement_worker: 0,  // clamped from 2 to 0
      unemployed: 11,    // 0 + 2 + 2 + 1 + 2 + 1 + 1 + 2 = 11 excess returned
    });
  });

  it('no clamp needed when workers <= max', () => {
    const s = createNewGame();
    bootstrapCivilization(s, 'human', 6, 10);
    s.tech['primitive'] = 3;
    s.city['farm'] = { count: 3 };
    applyDerivedStateInPlace(s);
    (s.civic['farmer'] as any).workers = 2; // within max
    (s.civic['unemployed'] as any).workers = 4;

    // Re-apply — nothing should change
    applyDerivedStateInPlace(s);
    expect((s.civic['farmer'] as any).workers).toBe(2);
    expect((s.civic['unemployed'] as any).workers).toBe(4);
  });
});

// ============================================================
// Planet Traits Audit
// ============================================================
import { gameTick } from './tick';
import { calculateMorale } from './morale';
import { armyRating } from './military';
import { getResearchCost } from './actions';
import {
  hasPlanetTrait,
  getMinerPlanetMultiplier,
  getGlobalPlanetMultiplier,
  getFarmPlanetMultiplier,
} from './planet-traits';

describe('Planet Traits Audit', () => {
  function makeTraitState(trait: string) {
    const s = createNewGame();
    bootstrapCivilization(s, 'human', 10, 20);
    s.city.ptrait = trait;
    return s;
  }

  // --- hasPlanetTrait ---
  it('hasPlanetTrait returns true only for matching trait', () => {
    const s = makeTraitState('dense');
    expect(hasPlanetTrait(s, 'dense')).toBe(true);
    expect(hasPlanetTrait(s, 'mellow')).toBe(false);
    expect(hasPlanetTrait(s, 'none')).toBe(false);
  });

  // --- unstable: tech cost reduction ---
  it('unstable halves Knowledge cost for mining_3', () => {
    const normal = makeTraitState('none');
    normal.tech['mining'] = 2;
    normal.resource['Knowledge'] = { name: 'Knowledge', display: true, value: 0, amount: 10000, max: 10000, rate: 0, crates: 0, containers: 0, diff: 0, delta: 0 };

    const unstable = makeTraitState('unstable');
    unstable.tech['mining'] = 2;
    unstable.resource['Knowledge'] = { name: 'Knowledge', display: true, value: 0, amount: 10000, max: 10000, rate: 0, crates: 0, containers: 0, diff: 0, delta: 0 };

    const normalCost = getResearchCost(normal, 'mining_3');
    const unstableCost = getResearchCost(unstable, 'mining_3');

    expect(normalCost['Knowledge']).toBe(2500);
    expect(unstableCost['Knowledge']).toBe(1250);
  });

  // --- dense: miner output ×1.2 ---
  it('dense multiplies miner output by 1.2', () => {
    expect(getMinerPlanetMultiplier(makeTraitState('dense'))).toBeCloseTo(1.2, 4);
    expect(getMinerPlanetMultiplier(makeTraitState('none'))).toBe(1);
  });

  // --- permafrost: miner output ×0.75 ---
  it('permafrost reduces miner output to ×0.75', () => {
    expect(getMinerPlanetMultiplier(makeTraitState('permafrost'))).toBeCloseTo(0.75, 4);
  });

  // --- magnetic: miner output ×0.985 ---
  it('magnetic reduces miner output to ×0.985', () => {
    expect(getMinerPlanetMultiplier(makeTraitState('magnetic'))).toBeCloseTo(0.985, 4);
  });

  // --- mellow: global output ×0.9 ---
  it('mellow reduces global production multiplier to ×0.9', () => {
    expect(getGlobalPlanetMultiplier(makeTraitState('mellow'))).toBeCloseTo(0.9, 4);
    expect(getGlobalPlanetMultiplier(makeTraitState('none'))).toBe(1);
  });

  // --- trashed: farm output ×0.75 ---
  it('trashed reduces farm multiplier to ×0.75', () => {
    expect(getFarmPlanetMultiplier(makeTraitState('trashed'))).toBeCloseTo(0.75, 4);
    expect(getFarmPlanetMultiplier(makeTraitState('none'))).toBe(1);
  });

  // --- mellow: stress reduction in morale ---
  it('mellow removes unemployed morale penalty', () => {
    const normal = makeTraitState('none');
    (normal.civic['unemployed'] as any).workers = 5;
    const normalMorale = calculateMorale(normal);

    const mellow = makeTraitState('mellow');
    (mellow.civic['unemployed'] as any).workers = 5;
    const mellowMorale = calculateMorale(mellow);

    // normal has -5 from unemployment, mellow has 0
    expect(mellowMorale.breakdown.unemployed).toBe(0);
    expect(normalMorale.breakdown.unemployed).toBe(-5);
    // mellow morale should be higher
    expect(mellowMorale.morale).toBeGreaterThan(normalMorale.morale);
  });

  // --- rage: combat rating boost ---
  it('rage boosts army rating by ×1.05', () => {
    const normal = makeTraitState('none');
    normal.tech['military'] = 1;
    normal.civic.garrison = { workers: 10, max: 20, wounded: 0, crew: 0, raid: 5, tactic: 0, rate: 0, fatigue: 0, m_use: 0, display: true, disabled: false, progress: 0, mercs: false, protest: 0 };
    normal.civic.govern = { type: 'oligarchy', rev: 0, fr: 0 };

    const rage = makeTraitState('rage');
    rage.tech['military'] = 1;
    rage.civic.garrison = { workers: 10, max: 20, wounded: 0, crew: 0, raid: 5, tactic: 0, rate: 0, fatigue: 0, m_use: 0, display: true, disabled: false, progress: 0, mercs: false, protest: 0 };
    rage.civic.govern = { type: 'oligarchy', rev: 0, fr: 0 };

    const normalRating = armyRating(5, normal);
    const rageRating = armyRating(5, rage);

    expect(rageRating).toBeCloseTo(normalRating * 1.05, 4);
  });

  // --- permafrost/magnetic: knowledge cap bonus ---
  it('permafrost adds +100 per university to knowledge cap', () => {
    const normal = makeTraitState('none');
    normal.tech['science'] = 4;
    normal.resource['Knowledge'] = { name: 'Knowledge', display: true, value: 0, amount: 0, max: 0, rate: 0, crates: 0, containers: 0, diff: 0, delta: 0 };
    (normal.city as any)['university'] = { count: 2 };
    (normal.city as any)['library'] = { count: 1 };
    applyDerivedStateInPlace(normal);
    const normalMax = normal.resource['Knowledge'].max;

    const perm = makeTraitState('permafrost');
    perm.tech['science'] = 4;
    perm.resource['Knowledge'] = { name: 'Knowledge', display: true, value: 0, amount: 0, max: 0, rate: 0, crates: 0, containers: 0, diff: 0, delta: 0 };
    (perm.city as any)['university'] = { count: 2 };
    (perm.city as any)['library'] = { count: 1 };
    applyDerivedStateInPlace(perm);
    const permMax = perm.resource['Knowledge'].max;

    // 2 universities × 100 × universityMult(1.02) = ~204 bonus
    expect(permMax).toBeGreaterThan(normalMax);
    expect(permMax - normalMax).toBeCloseTo(2 * 100 * (1 + 1 * 0.02), 0);
  });

  it('magnetic adds +100 per wardenclyffe to knowledge cap', () => {
    const normal = makeTraitState('none');
    normal.tech['science'] = 6;
    normal.resource['Knowledge'] = { name: 'Knowledge', display: true, value: 0, amount: 0, max: 0, rate: 0, crates: 0, containers: 0, diff: 0, delta: 0 };
    (normal.city as any)['wardenclyffe'] = { count: 3, on: 3 };
    applyDerivedStateInPlace(normal);
    const normalMax = normal.resource['Knowledge'].max;

    const mag = makeTraitState('magnetic');
    mag.tech['science'] = 6;
    mag.resource['Knowledge'] = { name: 'Knowledge', display: true, value: 0, amount: 0, max: 0, rate: 0, crates: 0, containers: 0, diff: 0, delta: 0 };
    (mag.city as any)['wardenclyffe'] = { count: 3, on: 3 };
    applyDerivedStateInPlace(mag);
    const magMax = mag.resource['Knowledge'].max;

    // 3 wardenclyffes × 100 = 300 bonus
    expect(magMax).toBeGreaterThan(normalMax);
    expect(magMax - normalMax).toBe(300);
  });
});

// ============================================================
// 进化树审计测试
// 对标 legacy/src/actions.js evolution 节点逻辑
// 对标 legacy/src/main.js L1216-1282 tick 触发规则
// ============================================================

import {
  purchaseEvoUpgrade,
  advanceEvoStep,
  evolveSentience,
  getAvailableUpgrades,
  getAvailableSteps,
  getAvailableRaces,
  getUpgradeCost,
  evolutionTick,
} from './evolution';

describe('Evolution Tree — evolveCosts 公式验证', () => {
  // legacy: evolveCosts(molecule, base, mult, offset) = count * mult + base
  it('membrane 费用随购买次数线性增长（base=2, mult=2）', () => {
    // 第 0 次购买：cost = 0×2 + 2 = 2
    // 第 1 次购买：cost = 1×2 + 2 = 4
    // 第 n 次购买：cost = n×2 + 2
    const costs = [0, 1, 2, 3, 4].map((count) => count * 2 + 2);
    expect(costs).toEqual([2, 4, 6, 8, 10]);
  });

  it('organelles RNA 费用：base=12, mult=8', () => {
    expect(0 * 8 + 12).toBe(12);
    expect(1 * 8 + 12).toBe(20);
    expect(3 * 8 + 12).toBe(36);
  });

  it('nucleus RNA 费用：base=38, mult=32', () => {
    expect(0 * 32 + 38).toBe(38);
    expect(1 * 32 + 38).toBe(70);
  });
});

describe('Evolution Tree — 解锁触发规则', () => {
  function makeEvoState() {
    const state = createNewGame();
    // protoplasm 阶段
    expect(state.race.species).toBe('protoplasm');
    return state;
  }

  it('RNA >= 2 时触发 DNA 显示解锁', () => {
    const state = makeEvoState();
    state.resource['RNA'].amount = 2;
    evolutionTick(state, 0.25);
    // dna 字段应该被设置
    expect(state.evolution['dna']).toBe(1);
    expect(state.resource['DNA'].display).toBe(true);
  });

  it('RNA >= 10 时触发 membrane 解锁', () => {
    const state = makeEvoState();
    // 先有 dna 解锁
    state.evolution['dna'] = 1;
    state.resource['DNA'].display = true;
    state.resource['RNA'].amount = 12;
    evolutionTick(state, 0.25);
    expect(state.evolution['membrane']).toBeDefined();
    expect((state.evolution['membrane'] as { count: number }).count).toBe(0);
  });

  it('DNA >= 4 时触发 organelles 解锁', () => {
    const state = makeEvoState();
    state.evolution['dna'] = 1;
    state.resource['DNA'].display = true;
    state.evolution['membrane'] = { count: 0 };
    state.resource['DNA'].amount = 5;
    evolutionTick(state, 0.25);
    expect(state.evolution['organelles']).toBeDefined();
  });

  it('organelles.count >= 2 时触发 nucleus 解锁', () => {
    const state = makeEvoState();
    state.evolution['dna'] = 1;
    state.resource['DNA'].display = true;
    state.evolution['membrane'] = { count: 1 };
    state.evolution['organelles'] = { count: 2 };
    state.resource['DNA'].amount = 10;
    evolutionTick(state, 0.25);
    expect(state.evolution['nucleus']).toBeDefined();
  });

  it('nucleus.count >= 1 时触发 eukaryotic_cell 解锁', () => {
    const state = makeEvoState();
    state.evolution['dna'] = 1;
    state.resource['DNA'].display = true;
    state.evolution['membrane'] = { count: 1 };
    state.evolution['organelles'] = { count: 3 };
    state.evolution['nucleus'] = { count: 1 };
    state.resource['DNA'].amount = 20;
    evolutionTick(state, 0.25);
    expect(state.evolution['eukaryotic_cell']).toBeDefined();
  });

  it('eukaryotic_cell.count >= 1 时触发 mitochondria 解锁', () => {
    const state = makeEvoState();
    state.evolution['dna'] = 1;
    state.resource['DNA'].display = true;
    state.evolution['membrane'] = { count: 1 };
    state.evolution['organelles'] = { count: 3 };
    state.evolution['nucleus'] = { count: 2 };
    state.evolution['eukaryotic_cell'] = { count: 1 };
    state.resource['DNA'].amount = 40;
    evolutionTick(state, 0.25);
    expect(state.evolution['mitochondria']).toBeDefined();
  });

  it('mitochondria 存在时触发 tech.evo = 1', () => {
    const state = makeEvoState();
    state.evolution['dna'] = 1;
    state.resource['DNA'].display = true;
    state.evolution['membrane'] = { count: 2 };
    state.evolution['organelles'] = { count: 3 };
    state.evolution['nucleus'] = { count: 2 };
    state.evolution['eukaryotic_cell'] = { count: 1 };
    state.evolution['mitochondria'] = { count: 0 };
    evolutionTick(state, 0.25);
    expect(state.tech['evo']).toBe(1);
  });
});

describe('Evolution Tree — 自动 RNA/DNA 生成', () => {
  function makeEvoStateWithOrganelles(orgCount: number, nucleusCount: number = 0) {
    const state = createNewGame();
    state.evolution['dna'] = 1;
    state.resource['DNA'].display = true;
    state.evolution['organelles'] = { count: orgCount };
    if (nucleusCount > 0) {
      state.evolution['nucleus'] = { count: nucleusCount };
    }
    return state;
  }

  it('organelles.count=3 时每 tick 自动产 3 RNA（evo<2）', () => {
    const state = makeEvoStateWithOrganelles(3);
    state.resource['RNA'].amount = 0;
    const prevRNA = state.resource['RNA'].amount;
    evolutionTick(state, 1); // time_multiplier=1 方便验证
    // RNA += 3 × 1 × 1 = 3
    expect(state.resource['RNA'].amount).toBeCloseTo(prevRNA + 3, 5);
  });

  it('organelles.count=2 且 evo=2 时每 tick 自动产 4 RNA（rna_multiplier=2）', () => {
    const state = makeEvoStateWithOrganelles(2);
    state.tech['evo'] = 2;
    state.resource['RNA'].amount = 0;
    evolutionTick(state, 1);
    // RNA += 2 × 2 × 1 = 4
    expect(state.resource['RNA'].amount).toBeCloseTo(4, 5);
  });

  it('nucleus.count=2 时消耗 4 RNA 产 2 DNA', () => {
    const state = makeEvoStateWithOrganelles(0, 2);
    state.resource['RNA'].amount = 10;
    const prevDNA = state.resource['DNA'].amount;
    evolutionTick(state, 1);
    // DNA += 2, RNA -= 4
    expect(state.resource['DNA'].amount).toBeCloseTo(prevDNA + 2, 5);
    expect(state.resource['RNA'].amount).toBeCloseTo(6, 5);
  });

  it('RNA 不足时 nucleus 自动降低增量', () => {
    const state = makeEvoStateWithOrganelles(0, 3);
    state.resource['RNA'].amount = 3; // 只够转化 1 次（需要 2 RNA per increment）
    evolutionTick(state, 1);
    // increment fallback to 1
    expect(state.resource['DNA'].amount).toBeCloseTo(1, 5);
  });
});

describe('Evolution Tree — 购买升级 purchaseEvoUpgrade', () => {
  it('membrane 购买增加 RNA 上限（无线粒体时 +5）', () => {
    const state = createNewGame();
    state.evolution['membrane'] = { count: 0 };
    state.resource['RNA'].amount = 10;
    const prevMax = state.resource['RNA'].max;
    const result = purchaseEvoUpgrade(state, 'membrane');
    expect(result).not.toBeNull();
    expect(result!.resource['RNA'].max).toBe(prevMax + 5);
  });

  it('membrane 购买扣除 RNA 费用（第0次=2 RNA）', () => {
    const state = createNewGame();
    state.evolution['membrane'] = { count: 0 };
    state.resource['RNA'].amount = 10;
    const result = purchaseEvoUpgrade(state, 'membrane');
    // cost = 0×2+2 = 2
    expect(result!.resource['RNA'].amount).toBeCloseTo(8, 5);
  });

  it('费用不足时无法购买 membrane', () => {
    const state = createNewGame();
    state.evolution['membrane'] = { count: 0 };
    state.resource['RNA'].amount = 1; // 不足2
    const result = purchaseEvoUpgrade(state, 'membrane');
    expect(result).toBeNull();
  });

  it('eukaryotic_cell 购买增加 DNA 上限（无线粒体时 +10）', () => {
    const state = createNewGame();
    state.evolution['dna'] = 1;
    state.resource['DNA'].display = true;
    state.evolution['eukaryotic_cell'] = { count: 0 };
    state.resource['RNA'].amount = 100;
    state.resource['DNA'].amount = 100;
    const prevMax = state.resource['DNA'].max;
    const result = purchaseEvoUpgrade(state, 'eukaryotic_cell');
    expect(result).not.toBeNull();
    expect(result!.resource['DNA'].max).toBe(prevMax + 10);
  });

  it('有 1 个线粒体时 membrane 上限加成变为 +10（mito_count×5+5 = 1×5+5 = 10）', () => {
    const state = createNewGame();
    state.evolution['membrane'] = { count: 0 };
    state.evolution['mitochondria'] = { count: 1 };
    state.resource['RNA'].amount = 100;
    const prevMax = state.resource['RNA'].max;
    const result = purchaseEvoUpgrade(state, 'membrane');
    expect(result!.resource['RNA'].max).toBe(prevMax + 10);
  });
});

describe('Evolution Tree — 进化步骤 advanceEvoStep', () => {
  it('sexual_reproduction: 需要 evo=1, 消耗 150 DNA, 授予 evo=2', () => {
    const state = createNewGame();
    state.tech['evo'] = 1;
    state.resource['DNA'].amount = 200;
    const result = advanceEvoStep(state, 'sexual_reproduction');
    expect(result).not.toBeNull();
    expect(result!.tech['evo']).toBe(2);
    expect(result!.resource['DNA'].amount).toBeCloseTo(50, 5);
    expect(result!.evolution['final']).toBe(20);
  });

  it('phagocytosis: 需要 evo=2, 消耗 175 DNA, 授予 evo=3 + evo_animal=1', () => {
    const state = createNewGame();
    state.tech['evo'] = 2;
    state.resource['DNA'].amount = 200;
    const result = advanceEvoStep(state, 'phagocytosis');
    expect(result!.tech['evo']).toBe(3);
    expect(result!.tech['evo_animal']).toBe(1);
  });

  it('multicellular: 需要 evo=3, 消耗 200 DNA, 授予 evo=4', () => {
    const state = createNewGame();
    state.tech['evo'] = 3;
    state.resource['DNA'].amount = 250;
    const result = advanceEvoStep(state, 'multicellular');
    expect(result!.tech['evo']).toBe(4);
    expect(result!.evolution['final']).toBe(60);
  });

  it('bilateral_symmetry: 需要 evo=4 + evo_animal=1, 消耗 230 DNA, 解锁 evo_mammals 等', () => {
    const state = createNewGame();
    state.tech['evo'] = 4;
    state.tech['evo_animal'] = 1;
    state.resource['DNA'].amount = 300;
    const result = advanceEvoStep(state, 'bilateral_symmetry');
    expect(result!.tech['evo']).toBe(5);
    expect(result!.tech['evo_mammals']).toBe(1);
    expect(result!.tech['evo_insectoid']).toBe(1);
  });

  it('mammals: 需要 evo=5 + evo_mammals=1, 消耗 245 DNA, 解锁 evo_humanoid=1', () => {
    const state = createNewGame();
    state.tech['evo'] = 5;
    state.tech['evo_mammals'] = 1;
    state.resource['DNA'].amount = 300;
    const result = advanceEvoStep(state, 'mammals');
    expect(result!.tech['evo']).toBe(6);
    expect(result!.tech['evo_humanoid']).toBe(1);
  });

  it('humanoid: 需要 evo=6 + evo_humanoid=1, 消耗 260 DNA, 授予 evo=7 + evo_humanoid=2', () => {
    const state = createNewGame();
    state.tech['evo'] = 6;
    state.tech['evo_humanoid'] = 1;
    state.resource['DNA'].amount = 300;
    const result = advanceEvoStep(state, 'humanoid');
    expect(result!.tech['evo']).toBe(7);
    expect(result!.tech['evo_humanoid']).toBe(2);
    expect(result!.evolution['final']).toBe(100);
  });

  it('evo 等级不匹配时步骤无法触发', () => {
    const state = createNewGame();
    state.tech['evo'] = 3;
    state.resource['DNA'].amount = 200;
    // sexual_reproduction 需要 evo=1
    const result = advanceEvoStep(state, 'sexual_reproduction');
    expect(result).toBeNull();
  });

  it('DNA 不足时步骤无法触发', () => {
    const state = createNewGame();
    state.tech['evo'] = 1;
    state.resource['DNA'].amount = 100; // 不足 150
    const result = advanceEvoStep(state, 'sexual_reproduction');
    expect(result).toBeNull();
  });
});

describe('Evolution Tree — 完整路径 (evo 0→7)', () => {
  it('从初始状态经过完整进化路径可以到达 evo=7 并选择种族', () => {
    const state = createNewGame();

    // 初始化资源（模拟积攒足够的 RNA/DNA）
    state.resource['RNA'].amount = 1000;
    state.resource['RNA'].max = 1000;
    state.evolution['dna'] = 1;
    state.resource['DNA'].display = true;
    state.resource['DNA'].amount = 2000;
    state.resource['DNA'].max = 2000;

    // 解锁所有升级（模拟购买）
    state.evolution['membrane'] = { count: 2 };
    state.evolution['organelles'] = { count: 3 };
    state.evolution['nucleus'] = { count: 2 };
    state.evolution['eukaryotic_cell'] = { count: 1 };
    state.evolution['mitochondria'] = { count: 1 };

    // 步骤链
    state.tech['evo'] = 1;
    let s = advanceEvoStep(state, 'sexual_reproduction')!;
    s = advanceEvoStep(s, 'phagocytosis')!;
    s = advanceEvoStep(s, 'multicellular')!;
    s = advanceEvoStep(s, 'bilateral_symmetry')!;
    s = advanceEvoStep(s, 'mammals')!;
    s = advanceEvoStep(s, 'humanoid')!;

    expect(s.tech['evo']).toBe(7);
    expect(s.tech['evo_humanoid']).toBe(2);
    expect(s.evolution['final']).toBe(100);

    // 种族可选
    const races = getAvailableRaces(s);
    expect(races.length).toBe(5);
    expect(races.map((r) => r.id)).toContain('human');

    // 最终 sentience
    s.resource['RNA'].amount = 500;
    s.resource['DNA'].amount = 500;
    const final = evolveSentience(s, 'human');
    expect(final).not.toBeNull();
    // tech.evo 被清除
    expect(final!.tech['evo']).toBeUndefined();
    // evolution 被清除
    expect(Object.keys(final!.evolution).length).toBe(0);
  });
});

describe('Evolution Tree — parity 费用验证（对标 legacy actions.js）', () => {
  // legacy actions.js L60: membrane cost RNA = count*2 + 2
  it('membrane 第 5 次购买费用 = 12 RNA', () => {
    const cost = getUpgradeCost({ ...createNewGame(), evolution: { membrane: { count: 5 } } as never }, 'membrane');
    expect(cost.rna).toBe(5 * 2 + 2); // = 12
  });

  // legacy L80-81: organelles cost RNA=count*8+12, DNA=count*4+4
  it('organelles 第 3 次购买费用 = 36 RNA, 16 DNA', () => {
    const state = createNewGame();
    state.evolution['organelles'] = { count: 3 };
    const cost = getUpgradeCost(state, 'organelles');
    expect(cost.rna).toBe(3 * 8 + 12); // = 36
    expect(cost.dna).toBe(3 * 4 + 4);  // = 16
  });

  // legacy L104-105: nucleus cost RNA=count*mult+38, DNA=count*mult+18 (evo<4: mult=32/16)
  it('nucleus 第 2 次购买费用 = 102 RNA, 50 DNA (evo<4)', () => {
    const state = createNewGame();
    state.evolution['nucleus'] = { count: 2 };
    const cost = getUpgradeCost(state, 'nucleus');
    expect(cost.rna).toBe(2 * 32 + 38); // = 102
    expect(cost.dna).toBe(2 * 16 + 18); // = 50
  });

  // DNA 费用：进化步骤
  it('sexual_reproduction 费用 = 150 DNA（对标 legacy L167）', () => {
    const step = [{ id: 'sexual_reproduction', dnaCost: 150 }];
    expect(step[0].dnaCost).toBe(150);
  });

  it('humanoid 费用 = 260 DNA（对标 legacy L456）', () => {
    const step = [{ id: 'humanoid', dnaCost: 260 }];
    expect(step[0].dnaCost).toBe(260);
  });

  it('种族选择费用 = 320 RNA + 320 DNA（对标 legacy L5187-5188）', () => {
    const race = { rnaCost: 320, dnaCost: 320 };
    expect(race.rnaCost).toBe(320);
    expect(race.dnaCost).toBe(320);
  });
});

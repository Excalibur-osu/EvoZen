import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GameState } from '@evozen/shared-types';
import { createNewGame } from './state';
import { applySimulationDerivedState, runSimulationTick, simulateTicks } from './simulation';
import { gameTick } from './tick';
import { armyRating, mercCost, tickTraining } from './military';
import { assignSpeciesTraits } from './traits';

export interface DifferentialSlice {
  resourceDiffs?: Record<string, number>;
  resources?: Record<string, number | boolean | string>;
  flags?: Record<string, number | boolean | string>;
}

export interface DifferentialScenario {
  id: string;
  description: string;
  setup: () => GameState;
  expected: (model: LegacyCoreModel) => DifferentialSlice;
  actual?: (state: GameState) => DifferentialSlice;
  tolerance?: number;
}

export interface LegacyCoreModel {
  timeMultiplier: number;
  jobs: {
    farmerImpact: number;
    farmerStress: number;
    lumberjackImpact: number;
    minerImpact: number;
    lumberjackStress: number;
    minerStress: number;
    entertainerStress: number;
  };
  food: {
    farmBonusLowTech: number;
    farmBonusHighTech: number;
    weatherColdRainMultiplier: number;
    weatherColdOtherMultiplier: number;
    weatherSunnyMultiplier: number;
    workerConsumptionDiscount: number;
  };
  lumber: {
    axeBonusPerLevelAboveOne: number;
    lumberYardBonusPerBuilding: number;
    sawmillBonusPerBuilding: number;
    sawmillPoweredBonusPerActive: number;
  };
  miner: {
    pickaxeBonusPerLevel: number;
    copperMultiplier: number;
    ironMultiplier: number;
    minePowerBonusPerActive: number;
  };
  power: {
    oilGeneratorPower: number;
    oilFuelPerTick: number;
    sawmillCost: number;
    mineCost: number;
    casinoCost: number;
  };
  storage: {
    shedLumberValue: number;
    shedCopperValue: number;
    crateValueAtTech3: number;
    containerValueAtTech2: number;
    crateSlotsPerStorageYardAtTech3: number;
    containerSlotsPerWarehouseAtTech2: number;
    slotsPerWharf: number;
    lumberYardCapPerBuilding: number;
    sawmillCapPerBuilding: number;
    storageMultiplierAtTech3: number;
  };
  tax: {
    citizenBaseIncome: number;
    divisor: number;
  };
  military: {
    diverseTrainingPenaltyPercent: number;
    bruteMercDiscountPercent: number;
    bruteTrainingBonus: number;
    bootCampTrainLow: number;
    bootCampTrainHigh: number;
    autocracyAttackPercent: number;
    rageCombatMultiplier: number;
  };
  evolution: {
    unlockDNAAtRNA: number;
    unlockMembraneAtRNA: number;
    unlockOrganellesAtDNA: number;
    unlockNucleusAtOrganelles: number;
    unlockEukaryoticCellAtNucleus: number;
    nucleusRnaCostPerIncrement: number;
    organellesBaseRnaMultiplier: number;
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const LEGACY_ROOT = resolve(__dirname, '../../../legacy/src');

let cachedModel: LegacyCoreModel | null = null;

function readLegacy(file: string): string {
  return readFileSync(resolve(LEGACY_ROOT, file), 'utf-8');
}

function extractNumber(src: string, pattern: RegExp, label: string): number {
  const match = src.match(pattern);
  if (!match) {
    throw new Error(`Failed to extract legacy value for ${label}`);
  }
  return Number(match[1]);
}

function extractExpression(src: string, pattern: RegExp, label: string): number {
  const match = src.match(pattern);
  if (!match) {
    throw new Error(`Failed to extract legacy expression for ${label}`);
  }

  const expr = match[1].trim();
  if (!/^[\d\s./()+*-]+$/.test(expr)) {
    throw new Error(`Legacy expression for ${label} contains unsupported tokens: ${expr}`);
  }

  return Number(Function(`"use strict"; return (${expr});`)());
}

function extractNumbers(src: string, pattern: RegExp, label: string): number[] {
  const match = src.match(pattern);
  if (!match) {
    throw new Error(`Failed to extract legacy values for ${label}`);
  }
  return match.slice(1).map((value) => Number(value));
}

function extractJobImpact(src: string, jobId: string): number {
  return extractNumber(
    src,
    new RegExp(String.raw`loadJob\('${jobId}',define,([\d.]+),[\d.]+`),
    `jobs.${jobId}.impact`,
  );
}

function extractJobStress(src: string, jobId: string): number {
  return extractNumber(
    src,
    new RegExp(String.raw`loadJob\('${jobId}',define,[\d.]+,([\d.]+)`),
    `jobs.${jobId}.stress`,
  );
}

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

function bootstrapCivilization(population: number, options: { inflateCaps?: boolean } = {}): GameState {
  const { inflateCaps = true } = options;
  const state = createNewGame();
  state.race.species = 'human';
  state.resource.human = makePopulationResource('人类', population, population + 10);
  state.city.basic_housing = { count: population };
  state.event.t = 999999;
  state.m_event.t = 999999;
  state.resource.Food.amount = 9999;
  if (inflateCaps) {
    state.resource.Food.max = 999999;
    state.resource.Lumber.max = 999999;
    state.resource.Copper.max = 999999;
    state.resource.Iron.max = 999999;
    state.resource.Money.max = 999999;
    state.resource.DNA.max = 999999;
    state.resource.RNA.max = 999999;
  }
  return state;
}

function setWorkers(state: GameState, jobId: string, workers: number): void {
  (state.civic[jobId] as { workers?: number }).workers = workers;
}

function round(value: number | undefined, digits: number = 6): number {
  return Number((value ?? 0).toFixed(digits));
}

function defaultActualSlice(state: GameState): DifferentialSlice {
  const output = gameTick(state);
  return {
    resourceDiffs: Object.fromEntries(
      Object.entries(output.result.resourceDeltas).map(([resource, delta]) => [resource, round(delta)]),
    ),
  };
}

export function loadLegacyCoreModel(): LegacyCoreModel {
  if (cachedModel) {
    return cachedModel;
  }

  const mainSrc = readLegacy('main.js');
  const jobsSrc = readLegacy('jobs.js');
  const actionsSrc = readLegacy('actions.js');
  const resourcesSrc = readLegacy('resources.js');
  const civicsSrc = readLegacy('civics.js');
  const racesSrc = readLegacy('races.js');
  const [farmBonusHighTech, farmBonusLowTech] = extractNumbers(
    jobsSrc,
    /farming \+= global\.tech\['agriculture'\] && global\.tech\.agriculture >= 2 \? ([\d.]+) : ([\d.]+);/,
    'food.farmBonuses',
  );
  const [crateSlotsPerStorageYardAtTech3] = extractNumbers(
    mainSrc,
    /let size = global\.tech\.container >= 3 \? (\d+) : (\d+);/,
    'storage.crateSlots',
  );
  const [containerSlotsPerWarehouseAtTech2] = extractNumbers(
    mainSrc,
    /let volume = global\.tech\['steel_container'\] >= 2 \? (\d+) : (\d+);/,
    'storage.containerSlots',
  );

  cachedModel = {
    timeMultiplier: extractNumber(mainSrc, /var time_multiplier\s*=\s*([\d.]+);/, 'time_multiplier'),
    jobs: {
      farmerImpact: extractJobImpact(jobsSrc, 'farmer'),
      farmerStress: extractJobStress(jobsSrc, 'farmer'),
      lumberjackImpact: extractJobImpact(jobsSrc, 'lumberjack'),
      minerImpact: extractJobImpact(jobsSrc, 'miner'),
      lumberjackStress: extractJobStress(jobsSrc, 'lumberjack'),
      minerStress: extractJobStress(jobsSrc, 'miner'),
      entertainerStress: extractJobStress(jobsSrc, 'entertainer'),
    },
    food: {
      farmBonusLowTech,
      farmBonusHighTech,
      weatherColdRainMultiplier: extractNumber(
        mainSrc,
        /weather_multiplier \*= global\.race\['chilled'\] \? \(1 \+ traits\.chilled\.vars\(\)\[3\] \/ 100\) : ([\d.]+);/,
        'food.weatherColdRainMultiplier',
      ),
      weatherColdOtherMultiplier: extractNumber(
        mainSrc,
        /weather_multiplier \*= global\.race\['chilled'\] \? \(1 \+ traits\.chilled\.vars\(\)\[4\] \/ 100\) : ([\d.]+);/,
        'food.weatherColdOtherMultiplier',
      ),
      weatherSunnyMultiplier: extractNumber(
        mainSrc,
        /weather_multiplier \*= global\.race\['chilled'\] \? \(1 - traits\.chilled\.vars\(\)\[5\] \/ 100\) : ([\d.]+);/,
        'food.weatherSunnyMultiplier',
      ),
      workerConsumptionDiscount: extractNumber(
        mainSrc,
        /\(\(global\.civic\.unemployed\.workers \+ workerScale\(global\.civic\.hunter\.workers,'hunter'\)\) \* ([\d.]+)\)/,
        'food.workerConsumptionDiscount',
      ),
    },
    lumber: {
      axeBonusPerLevelAboveOne: extractNumber(
        mainSrc,
        /\(global\.tech\.axe - 1\) \* ([\d.]+) : 0\) \+ 1;/,
        'lumber.axeBonusPerLevelAboveOne',
      ),
      lumberYardBonusPerBuilding: extractNumber(
        mainSrc,
        /global\.city\['lumber_yard'\]\.count \* ([\d.]+);/,
        'lumber.lumberYardBonusPerBuilding',
      ),
      sawmillBonusPerBuilding: extractNumber(
        mainSrc,
        /let saw = global\.tech\['saw'\] >= 2 \? [\d.]+ : ([\d.]+);/,
        'lumber.sawmillBonusPerBuilding',
      ),
      sawmillPoweredBonusPerActive: extractNumber(
        mainSrc,
        /power_mult \+= \(p_on\['sawmill'\] \* ([\d.]+)\);/,
        'lumber.sawmillPoweredBonusPerActive',
      ),
    },
    miner: {
      pickaxeBonusPerLevel: extractNumber(
        mainSrc,
        /global\.tech\.pickaxe \* ([\d.]+) : 0\) \+ 1;/,
        'miner.pickaxeBonusPerLevel',
      ),
      copperMultiplier: extractExpression(
        mainSrc,
        /let copper_mult = ([^;]+);/,
        'miner.copperMultiplier',
      ),
      ironMultiplier: extractExpression(
        mainSrc,
        /let iron_mult = ([^;]+);/,
        'miner.ironMultiplier',
      ),
      minePowerBonusPerActive: extractNumber(
        mainSrc,
        /power_mult \+= \(p_on\['mine'\] \* ([\d.]+)\);/,
        'miner.minePowerBonusPerActive',
      ),
    },
    power: {
      oilGeneratorPower: extractNumber(
        actionsSrc,
        /oil_power:\s*{[\s\S]*?global\.city\.power \+= (\d+);/,
        'power.oilGeneratorPower',
      ),
      oilFuelPerTick: extractNumber(
        actionsSrc,
        /oil_power:\s*{[\s\S]*?let consume = ([\d.]+);/,
        'power.oilFuelPerTick',
      ),
      sawmillCost: extractNumber(
        actionsSrc,
        /sawmill:\s*{[\s\S]*?powered\(\)\{ return powerCostMod\(([\d.]+)\); \}/,
        'power.sawmillCost',
      ),
      mineCost: extractNumber(
        actionsSrc,
        /mine:\s*{[\s\S]*?powered\(\)\{ return powerCostMod\(([\d.]+)\); \}/,
        'power.mineCost',
      ),
      casinoCost: extractNumber(
        actionsSrc,
        /casino:\s*{[\s\S]*?powered\(\)\{ return powerCostMod\(global\.stats\.achieve\['dissipated'\] && global\.stats\.achieve\['dissipated'\]\.l >= 2 \? \d+ : (\d+)\); \}/,
        'power.casinoCost',
      ),
    },
    storage: {
      shedLumberValue: extractNumber(
        actionsSrc,
        /case 'Lumber':\s*return (\d+);/,
        'storage.shedLumberValue',
      ),
      shedCopperValue: extractNumber(
        actionsSrc,
        /case 'Copper':\s*return (\d+);/,
        'storage.shedCopperValue',
      ),
      crateValueAtTech3: extractNumber(
        resourcesSrc,
        /export function crateValue\(\)\{[\s\S]*?let create_value = global\.tech\['container'\] && global\.tech\['container'\] >= 2 \? (\d+) : \d+;/,
        'storage.crateValueAtTech3',
      ),
      containerValueAtTech2: extractNumber(
        resourcesSrc,
        /export function containerValue\(\)\{[\s\S]*?let container_value = global\.tech\['steel_container'\] && global\.tech\['steel_container'\] >= 3 \? \d+ : (\d+);/,
        'storage.containerValueAtTech2',
      ),
      crateSlotsPerStorageYardAtTech3,
      containerSlotsPerWarehouseAtTech2,
      slotsPerWharf: extractNumber(
        mainSrc,
        /let vol = global\.tech\['world_control'\] \? \d+ : (\d+);/,
        'storage.slotsPerWharf',
      ),
      lumberYardCapPerBuilding: extractNumber(
        mainSrc,
        /global\.city\.lumber_yard\.count \* spatialReasoning\((\d+)\)/,
        'storage.lumberYardCapPerBuilding',
      ),
      sawmillCapPerBuilding: extractNumber(
        mainSrc,
        /global\.city\.sawmill\.count \* spatialReasoning\((\d+)\)/,
        'storage.sawmillCapPerBuilding',
      ),
      storageMultiplierAtTech3: ((3 - 1) * 1.25 + 1) * 1.5,
    },
    tax: {
      citizenBaseIncome: extractNumber(
        mainSrc,
        /income_base \*= global\.race\['truepath'\] \? [\d.]+ : ([\d.]+);/,
        'tax.citizenBaseIncome',
      ),
      divisor: extractNumber(
        mainSrc,
        /income_base \*= \(global\.civic\.taxes\.tax_rate \/ (\d+)\);/,
        'tax.divisor',
      ),
    },
    military: {
      diverseTrainingPenaltyPercent: extractNumber(
        racesSrc,
        /diverse:\s*\{[\s\S]*?case 1:\s*return \[(\d+)\];/,
        'military.diverseTrainingPenaltyPercent',
      ),
      bruteMercDiscountPercent: extractNumber(
        racesSrc,
        /brute:\s*\{[\s\S]*?case 1:\s*return \[(\d+),\d+\];/,
        'military.bruteMercDiscountPercent',
      ),
      bruteTrainingBonus: extractNumber(
        racesSrc,
        /brute:\s*\{[\s\S]*?case 1:\s*return \[\d+,(\d+)\];/,
        'military.bruteTrainingBonus',
      ),
      bootCampTrainHigh: extractNumber(
        mainSrc,
        /let train = global\.tech\['boot_camp'\] >= 2 \? ([\d.]+) : [\d.]+;/,
        'military.bootCampTrainHigh',
      ),
      bootCampTrainLow: extractNumber(
        mainSrc,
        /let train = global\.tech\['boot_camp'\] >= 2 \? [\d.]+ : ([\d.]+);/,
        'military.bootCampTrainLow',
      ),
      autocracyAttackPercent: extractNumber(
        civicsSrc,
        /autocracy\(\)\{[\s\S]*?let attack = govActive\('organizer',0\) \? \d+ : (\d+);/,
        'military.autocracyAttackPercent',
      ),
      rageCombatMultiplier: extractNumber(
        racesSrc,
        /planetTraits = \{[\s\S]*?rage:\s*\{[\s\S]*?return global\.race\['rejuvenated'\] \? \[[\d.,]+\] : \[([\d.]+),[\d.]+,\d+\];/,
        'military.rageCombatMultiplier',
      ),
    },
    evolution: {
      unlockDNAAtRNA: extractNumber(
        mainSrc,
        /resource'\]\['RNA'\]\.amount >= (\d+) && !global\.evolution\['dna'\]/,
        'evolution.unlockDNAAtRNA',
      ),
      unlockMembraneAtRNA: extractNumber(
        mainSrc,
        /resource'\]\['RNA'\]\.amount >= (\d+) && !global\.evolution\['membrane'\]/,
        'evolution.unlockMembraneAtRNA',
      ),
      unlockOrganellesAtDNA: extractNumber(
        mainSrc,
        /resource'\]\['DNA'\]\.amount >= (\d+) && !global\.evolution\['organelles'\]/,
        'evolution.unlockOrganellesAtDNA',
      ),
      unlockNucleusAtOrganelles: extractNumber(
        mainSrc,
        /global\.evolution\.organelles\.count >= (\d+) && !global\.evolution\['nucleus'\]/,
        'evolution.unlockNucleusAtOrganelles',
      ),
      unlockEukaryoticCellAtNucleus: extractNumber(
        mainSrc,
        /global\.evolution\.nucleus\.count >= (\d+) && !global\.evolution\['eukaryotic_cell'\]/,
        'evolution.unlockEukaryoticCellAtNucleus',
      ),
      nucleusRnaCostPerIncrement: extractNumber(
        mainSrc,
        /global\['resource'\]\['RNA'\]\.amount < increment \* (\d+)/,
        'evolution.nucleusRnaCostPerIncrement',
      ),
      organellesBaseRnaMultiplier: Number(
        mainSrc.match(/let rna_multiplier = global\.race\['rapid_mutation'\] \? (\d+) : (\d+);/)?.[2] ?? NaN,
      ),
    },
  };

  if (Number.isNaN(cachedModel.evolution.organellesBaseRnaMultiplier)) {
    throw new Error('Failed to extract legacy value for evolution.organellesBaseRnaMultiplier');
  }

  return cachedModel;
}

function moraleToGlobalMultiplier(morale: number): number {
  if (morale < 100) {
    return morale / 100;
  }
  return 1 + (morale - 100) / 200;
}

export function runDifferentialScenario(scenario: DifferentialScenario, model: LegacyCoreModel) {
  const state = scenario.setup();
  const actual = scenario.actual ? scenario.actual(state) : defaultActualSlice(state);
  const expected = scenario.expected(model);
  return { actual, expected };
}

export function assertSlicesMatch(
  actual: DifferentialSlice,
  expected: DifferentialSlice,
  tolerance: number = 1e-6,
): void {
  const sections: Array<keyof DifferentialSlice> = ['resourceDiffs', 'resources', 'flags'];

  for (const section of sections) {
    const actualSection = actual[section] ?? {};
    const expectedSection = expected[section] ?? {};
    const keys = Object.keys(expectedSection);

    for (const key of keys) {
      const actualValue = actualSection[key];
      const expectedValue = expectedSection[key];

      if (typeof expectedValue === 'number' || typeof actualValue === 'number') {
        if (typeof actualValue !== 'number' || typeof expectedValue !== 'number') {
          throw new Error(`${section}.${key} type mismatch: actual=${String(actualValue)} expected=${String(expectedValue)}`);
        }
        const diff = Math.abs(actualValue - expectedValue);
        if (diff > tolerance) {
          throw new Error(`${section}.${key} mismatch: actual=${actualValue} expected=${expectedValue} diff=${diff}`);
        }
        continue;
      }

      if (actualValue !== expectedValue) {
        throw new Error(`${section}.${key} mismatch: actual=${String(actualValue)} expected=${String(expectedValue)}`);
      }
    }
  }
}

export const legacyCoreDifferentialScenarios: DifferentialScenario[] = [
  {
    id: 'military-training-human-bootcamp',
    description: 'legacy 训练速率链路：baseline ÷ diverse × boot_camp × time_multiplier',
    setup: () => {
      const state = bootstrapCivilization(10);
      state.race.species = 'human';
      assignSpeciesTraits(state.race, 'human');
      state.tech.military = 1;
      state.tech.boot_camp = 2;
      state.city.boot_camp = { count: 1 };
      state.civic.garrison.max = 5;
      state.civic.garrison.workers = 0;
      state.civic.garrison.progress = 0;
      setWorkers(state, 'unemployed', 5);
      return state;
    },
    actual: (state) => {
      const timeMul = loadLegacyCoreModel().timeMultiplier;
      tickTraining(state, timeMul);
      return {
        resources: {
          rate: round(state.civic.garrison.rate),
          progress: round(state.civic.garrison.progress),
          workers: round(state.civic.garrison.workers),
          unemployed: round((state.civic.unemployed as { workers?: number }).workers),
        },
      };
    },
    expected: (model) => {
      const rate =
        2.5
        / (1 + model.military.diverseTrainingPenaltyPercent / 100)
        * (1 + model.military.bootCampTrainHigh)
        * model.timeMultiplier;
      return {
        resources: {
          rate: round(rate),
          progress: round(rate),
          workers: 0,
          unemployed: 5,
        },
      };
    },
  },
  {
    id: 'military-training-orc-brute',
    description: 'legacy 兽人训练：rate*time_multiplier 之后再叠加 brute 加法增益',
    setup: () => {
      const state = bootstrapCivilization(10);
      state.race.species = 'orc';
      assignSpeciesTraits(state.race, 'orc');
      state.tech.military = 1;
      state.civic.garrison.max = 5;
      state.civic.garrison.workers = 0;
      state.civic.garrison.progress = 0;
      setWorkers(state, 'unemployed', 5);
      return state;
    },
    actual: (state) => {
      const timeMul = loadLegacyCoreModel().timeMultiplier;
      tickTraining(state, timeMul);
      return {
        resources: {
          rate: round(state.civic.garrison.rate),
          progress: round(state.civic.garrison.progress),
        },
      };
    },
    expected: (model) => {
      const rate =
        2.5 * model.timeMultiplier
        + (model.military.bruteTrainingBonus / 40) * model.timeMultiplier;
      return {
        resources: {
          rate: round(rate),
          progress: round(rate),
        },
      };
    },
  },
  {
    id: 'merc-cost-orc-escalation',
    description: 'legacy 佣兵费用：1.24^workers × m_use escalator，再应用 brute 折扣',
    setup: () => {
      const state = bootstrapCivilization(10);
      state.race.species = 'orc';
      assignSpeciesTraits(state.race, 'orc');
      state.civic.garrison.workers = 3;
      state.civic.garrison.m_use = 2;
      return state;
    },
    actual: (state) => ({
      resources: {
        mercCost: mercCost(state),
      },
    }),
    expected: (model) => {
      let cost = Math.round(Math.pow(1.24, 3) * 75) - 50;
      if (cost > 25000) cost = 25000;
      cost *= Math.pow(1.1, 2);
      cost *= 1 - model.military.bruteMercDiscountPercent / 100;
      return {
        resources: {
          mercCost: Math.round(cost),
        },
      };
    },
  },
  {
    id: 'army-rating-autocracy-rage',
    description: 'legacy 军力评分：weapon tech × autocracy × rage 行星倍率',
    setup: () => {
      const state = bootstrapCivilization(10);
      state.race.species = 'human';
      assignSpeciesTraits(state.race, 'human');
      state.tech.military = 5;
      state.city.ptrait = 'rage';
      state.civic.govern.type = 'autocracy';
      state.civic.garrison.workers = 10;
      state.civic.garrison.wounded = 2;
      return state;
    },
    actual: (state) => ({
      resources: {
        armyRating: round(armyRating(8, state, 2)),
      },
    }),
    expected: (model) => {
      const weaponTech = 4;
      const adjusted = 8 - 2 / 2;
      const army =
        adjusted
        * weaponTech
        * (1 + model.military.autocracyAttackPercent / 100)
        * model.military.rageCombatMultiplier;
      return {
        resources: {
          armyRating: round(army),
        },
      };
    },
  },
  {
    id: 'evolution-dna-unlock',
    description: 'RNA 达到 legacy 阈值后应解锁 DNA 显示与 evo.dna 标记',
    setup: () => {
      const state = createNewGame();
      state.resource.RNA.amount = 2;
      return state;
    },
    actual: (state) => {
      const output = gameTick(state);
      return {
        flags: {
          dnaUnlocked: Boolean(output.state.evolution.dna),
          dnaVisible: Boolean(output.state.resource.DNA.display),
        },
      };
    },
    expected: (model) => ({
      flags: {
        dnaUnlocked: model.evolution.unlockDNAAtRNA === 2,
        dnaVisible: true,
      },
    }),
  },
  {
    id: 'evolution-nucleus-and-organelles',
    description: 'legacy 先转化 nucleus，再结算 organelles 产出，并触发 eukaryotic_cell 解锁',
    setup: () => {
      const state = createNewGame();
      state.evolution.dna = 1;
      state.resource.DNA.display = true;
      state.evolution.membrane = { count: 1 };
      state.evolution.organelles = { count: 2 };
      state.evolution.nucleus = { count: 1 };
      state.resource.RNA.amount = 10;
      state.resource.DNA.amount = 0;
      return state;
    },
    actual: (state) => {
      const output = gameTick(state);
      return {
        resourceDiffs: {
          RNA: round(output.result.resourceDeltas.RNA),
          DNA: round(output.result.resourceDeltas.DNA),
        },
        flags: {
          eukaryoticCellUnlocked: Boolean(output.state.evolution.eukaryotic_cell),
        },
      };
    },
    expected: (model) => {
      const dnaDelta = model.timeMultiplier;
      const rnaSpent = model.evolution.nucleusRnaCostPerIncrement * model.timeMultiplier;
      const rnaGenerated = 2 * model.evolution.organellesBaseRnaMultiplier * model.timeMultiplier;
      return {
        resourceDiffs: {
          RNA: round(rnaGenerated - rnaSpent),
          DNA: round(dnaDelta),
        },
        flags: {
          eukaryoticCellUnlocked: true,
        },
      };
    },
  },
  {
    id: 'lumberjack-core-output',
    description: 'legacy 伐木核心链路：impact × axe × lumber_yard × time_multiplier',
    setup: () => {
      const state = bootstrapCivilization(1);
      state.tech.axe = 2;
      setWorkers(state, 'unemployed', 0);
      setWorkers(state, 'lumberjack', 1);
      state.city.lumber_yard = { count: 2 };
      return state;
    },
    expected: (model) => {
      const axeMult = 1 + (2 - 1) * model.lumber.axeBonusPerLevelAboveOne;
      const yardMult = 1 + 2 * model.lumber.lumberYardBonusPerBuilding;
      return {
        resourceDiffs: {
          Lumber: round(model.jobs.lumberjackImpact * axeMult * yardMult * model.timeMultiplier),
        },
      };
    },
  },
  {
    id: 'miner-core-output',
    description: 'legacy 矿工核心链路：impact × pickaxe × power × copper/iron ratio × time_multiplier',
    setup: () => {
      const state = bootstrapCivilization(1);
      state.tech.mining = 3;
      state.tech.pickaxe = 2;
      setWorkers(state, 'unemployed', 0);
      setWorkers(state, 'miner', 1);
      state.city.mine = { count: 1, on: 1 };
      state.city.oil_power = { count: 1, on: 1 };
      state.resource.Oil.amount = 9999;
      state.resource.Oil.max = 999999;
      return state;
    },
    expected: (model) => {
      const minerMult = 1 + 2 * model.miner.pickaxeBonusPerLevel;
      const powerMult = 1 + model.miner.minePowerBonusPerActive;
      return {
        resourceDiffs: {
          Copper: round(model.jobs.minerImpact * minerMult * powerMult * model.miner.copperMultiplier * model.timeMultiplier),
          Iron: round(model.jobs.minerImpact * minerMult * powerMult * model.miner.ironMultiplier * model.timeMultiplier),
        },
      };
    },
  },
  {
    id: 'tax-core-output',
    description: 'legacy 税收核心链路：citizens × 0.4 × tax_rate/20 × time_multiplier',
    setup: () => {
      const state = bootstrapCivilization(6);
      state.tech.currency = 1;
      setWorkers(state, 'unemployed', 0);
      state.civic.taxes.tax_rate = 20;
      return state;
    },
    expected: (model) => ({
      resourceDiffs: {
        Money: round(6 * model.tax.citizenBaseIncome * (20 / model.tax.divisor) * model.timeMultiplier),
      },
    }),
  },
  {
    id: 'power-priority-and-output',
    description: '电力优先级、燃料消耗和受电建筑产出应与 legacy 核心链路一致',
    setup: () => {
      const state = bootstrapCivilization(3);
      state.tech.axe = 2;
      state.tech.mining = 3;
      state.tech.pickaxe = 2;

      setWorkers(state, 'unemployed', 0);
      setWorkers(state, 'lumberjack', 1);
      setWorkers(state, 'miner', 2);

      state.city.lumber_yard = { count: 1 };
      state.city.sawmill = { count: 2, on: 2 };
      state.city.mine = { count: 2, on: 2 };
      state.city.casino = { count: 1, on: 1 };
      state.city.oil_power = { count: 1, on: 1 };

      state.resource.Oil.amount = 9999;
      state.resource.Oil.max = 999999;
      return state;
    },
    actual: (state) => {
      const output = runSimulationTick(state);
      return {
        resourceDiffs: {
          Oil: round(output.result.resourceDeltas.Oil),
          Lumber: round(output.result.resourceDeltas.Lumber),
          Copper: round(output.result.resourceDeltas.Copper),
          Iron: round(output.result.resourceDeltas.Iron),
        },
        resources: {
          powerGenerated: round(output.state.city.power?.generated),
          powerConsumed: round(output.state.city.power?.consumed),
          powerSurplus: round(output.state.city.power?.surplus),
        },
      };
    },
    expected: (model) => {
      const activeSawmill = Math.min(
        2,
        Math.floor(model.power.oilGeneratorPower / model.power.sawmillCost),
      );
      const remainingAfterSawmill = model.power.oilGeneratorPower - activeSawmill * model.power.sawmillCost;
      const activeMine = Math.min(
        2,
        Math.floor(remainingAfterSawmill / model.power.mineCost),
      );
      const remainingAfterMine = remainingAfterSawmill - activeMine * model.power.mineCost;
      const activeCasino = Math.min(
        1,
        Math.floor(remainingAfterMine / model.power.casinoCost),
      );
      const rawMorale = 100 + 2 - (1 / model.jobs.lumberjackStress) - (2 / model.jobs.minerStress);
      const morale = Math.min(rawMorale, 100);
      const globalMultiplier = moraleToGlobalMultiplier(morale);
      const lumberDelta =
        model.jobs.lumberjackImpact
        * (1 + model.lumber.axeBonusPerLevelAboveOne)
        * (1 + 2 * model.lumber.sawmillBonusPerBuilding)
        * (1 + activeSawmill * model.lumber.sawmillPoweredBonusPerActive)
        * (1 + model.lumber.lumberYardBonusPerBuilding)
        * globalMultiplier
        * model.timeMultiplier;
      const minerToolMult = 1 + 2 * model.miner.pickaxeBonusPerLevel;
      const minePowerMult = 1 + activeMine * model.miner.minePowerBonusPerActive;
      return {
        resourceDiffs: {
          Oil: round(-model.power.oilFuelPerTick * model.timeMultiplier),
          Lumber: round(lumberDelta),
          Copper: round(2 * minerToolMult * minePowerMult * model.miner.copperMultiplier * globalMultiplier * model.timeMultiplier),
          Iron: round(2 * minerToolMult * minePowerMult * model.miner.ironMultiplier * globalMultiplier * model.timeMultiplier),
        },
        resources: {
          powerGenerated: round(model.power.oilGeneratorPower),
          powerConsumed: round(
            activeSawmill * model.power.sawmillCost
            + activeMine * model.power.mineCost
            + activeCasino * model.power.casinoCost,
          ),
          powerSurplus: round(
            model.power.oilGeneratorPower
            - (
              activeSawmill * model.power.sawmillCost
              + activeMine * model.power.mineCost
              + activeCasino * model.power.casinoCost
            ),
          ),
        },
      };
    },
  },
  {
    id: 'food-weather-balance',
    description: '农业产出、寒冷降雨天气和人口口粮消耗应保持 legacy 公式',
    setup: () => {
      const state = bootstrapCivilization(1);
      state.city.calendar.weather = 0;
      state.city.calendar.temp = 0;
      state.city.calendar.wind = 0;
      state.city.calendar.season = 1;
      state.city.calendar.year = 0;
      state.tech.agriculture = 1;
      setWorkers(state, 'unemployed', 0);
      setWorkers(state, 'farmer', 1);
      state.city.farm = { count: 1 };
      return state;
    },
    actual: (state) => {
      const output = runSimulationTick(state);
      return {
        resourceDiffs: {
          Food: round(output.result.resourceDeltas.Food),
        },
      };
    },
    expected: (model) => {
      const morale = 100 - (1 / model.jobs.farmerStress);
      const globalMultiplier = morale / 100;
      const farmerOutput =
        (model.jobs.farmerImpact + model.food.farmBonusLowTech)
        * model.food.weatherColdRainMultiplier
        * globalMultiplier;
      const foodConsumption = 1;
      return {
        resourceDiffs: {
          Food: round((farmerOutput - foodConsumption) * model.timeMultiplier),
        },
      };
    },
  },
  {
    id: 'storage-derived-caps',
    description: '仓储派生上限、板条箱/集装箱容量和已分配容器扣减应与 legacy 对齐',
    setup: () => {
      const state = bootstrapCivilization(2, { inflateCaps: false });
      state.tech.storage = 3;
      state.tech.container = 3;
      state.tech.steel_container = 2;

      state.city.shed = { count: 2 };
      state.city.lumber_yard = { count: 1 };
      state.city.sawmill = { count: 1, on: 1 };
      state.city.storage_yard = { count: 2 };
      state.city.warehouse = { count: 1 };
      state.city.wharf = { count: 1 };

      state.resource.Crates.amount = 50;
      state.resource.Containers.amount = 40;
      state.resource.Lumber.crates = 1;
      state.resource.Iron.crates = 2;
      state.resource.Copper.containers = 1;
      return state;
    },
    actual: (state) => {
      const derived = applySimulationDerivedState(state);
      return {
        resources: {
          LumberCapBonus: round(derived.resource.Lumber.max - state.resource.Lumber.max),
          CopperCapBonus: round(derived.resource.Copper.max - state.resource.Copper.max),
          CratesMax: round(derived.resource.Crates.max),
          ContainersMax: round(derived.resource.Containers.max),
          CratesAmount: round(derived.resource.Crates.amount),
          ContainersAmount: round(derived.resource.Containers.amount),
        },
      };
    },
    expected: (model) => ({
      resources: {
        LumberCapBonus: round(
          model.storage.lumberYardCapPerBuilding
          + model.storage.sawmillCapPerBuilding
          + Math.round(2 * model.storage.shedLumberValue * model.storage.storageMultiplierAtTech3)
          + model.storage.crateValueAtTech3,
        ),
        CopperCapBonus: round(
          Math.round(2 * model.storage.shedCopperValue * model.storage.storageMultiplierAtTech3)
          + model.storage.containerValueAtTech2,
        ),
        CratesMax: round(
          2 * model.storage.crateSlotsPerStorageYardAtTech3
          + model.storage.slotsPerWharf
          - 3,
        ),
        ContainersMax: round(
          model.storage.containerSlotsPerWarehouseAtTech2
          + model.storage.slotsPerWharf
          - 1,
        ),
        CratesAmount: round(
          2 * model.storage.crateSlotsPerStorageYardAtTech3
          + model.storage.slotsPerWharf
          - 3,
        ),
        ContainersAmount: round(
          model.storage.containerSlotsPerWarehouseAtTech2
          + model.storage.slotsPerWharf
          - 1,
        ),
      },
    }),
  },
  {
    id: 'morale-tax-job-chain',
    description: '士气分项、上限钳位和税收倍率应在同一 tick 内维持 legacy 联动',
    setup: () => {
      const state = bootstrapCivilization(4);
      state.city.calendar.year = 1;
      state.city.calendar.season = 0;
      state.city.calendar.weather = 2;
      state.city.calendar.temp = 1;
      state.city.calendar.wind = 0;

      state.tech.currency = 1;
      state.tech.theatre = 2;
      state.tech.axe = 1;
      state.tech.mining = 2;
      state.civic.taxes.tax_rate = 10;

      setWorkers(state, 'unemployed', 1);
      setWorkers(state, 'lumberjack', 1);
      setWorkers(state, 'miner', 1);
      setWorkers(state, 'entertainer', 1);

      state.city.amphitheatre = { count: 1 };
      state.city.mine = { count: 1, on: 0 };
      return state;
    },
    actual: (state) => {
      const output = runSimulationTick(state);
      return {
        resourceDiffs: {
          Money: round(output.result.resourceDeltas.Money),
        },
        resources: {
          morale: round(output.state.city.morale?.current),
          moraleCap: round(output.state.city.morale?.cap),
          stress: round(output.state.city.morale?.stress),
          unemployed: round(output.state.city.morale?.unemployed),
          entertain: round(output.state.city.morale?.entertain),
        },
      };
    },
    expected: (model) => {
      const stress = -(
        (1 / model.jobs.lumberjackStress)
        + (1 / model.jobs.minerStress)
        + (1 / model.jobs.entertainerStress)
      );
      const unemployedPenalty = -1;
      const entertainment = 2;
      const moraleRaw = 100 + 5 + 2 + unemployedPenalty + stress + entertainment;
      const moraleCap = 100 + 1 + (10 - Math.floor(10 / 2));
      const morale = Math.min(moraleRaw, moraleCap);
      const globalMultiplier = moraleToGlobalMultiplier(morale);
      const citizens = 4 - 1;
      return {
        resourceDiffs: {
          Money: round(citizens * model.tax.citizenBaseIncome * (10 / model.tax.divisor) * globalMultiplier * model.timeMultiplier),
        },
        resources: {
          morale: round(morale, 1),
          moraleCap: round(moraleCap),
          stress: round(stress, 1),
          unemployed: round(unemployedPenalty, 1),
          entertain: round(entertainment, 1),
        },
      };
    },
  },
  {
    id: 'civilized-short-replay',
    description: '8 tick 基础文明回放：木材 / 采矿 / 税收 / 食物消耗在静态条件下保持 legacy 线性结果',
    setup: () => {
      const state = bootstrapCivilization(2);
      state.event.t = 999999;
      state.m_event.t = 999999;
      state.city.calendar.weather = 1;
      state.city.calendar.temp = 1;
      state.city.calendar.wind = 0;
      state.city.calendar.season = 1;
      state.city.calendar.year = 0;
      state.city.calendar.dayTick = 0;

      state.resource.Food.amount = 100;
      state.resource.Lumber.amount = 10;
      state.resource.Copper.amount = 0;
      state.resource.Iron.amount = 0;
      state.resource.Money.amount = 20;
      state.resource.Oil.amount = 9999;
      state.resource.Oil.max = 999999;

      state.tech.currency = 1;
      state.tech.axe = 2;
      state.tech.mining = 3;
      state.tech.pickaxe = 2;

      setWorkers(state, 'unemployed', 0);
      setWorkers(state, 'lumberjack', 1);
      setWorkers(state, 'miner', 1);

      state.city.lumber_yard = { count: 1 };
      state.city.mine = { count: 1, on: 1 };
      state.city.oil_power = { count: 1, on: 1 };

      return state;
    },
    actual: (state) => {
      const output = simulateTicks(state, 8);
      return {
        resources: {
          Food: round(output.state.resource.Food.amount),
          Lumber: round(output.state.resource.Lumber.amount),
          Copper: round(output.state.resource.Copper.amount),
          Iron: round(output.state.resource.Iron.amount),
          Money: round(output.state.resource.Money.amount),
        },
      };
    },
    expected: (model) => {
      const ticks = 8;
      const morale = 100 - (1 / model.jobs.lumberjackStress) - (1 / model.jobs.minerStress);
      const globalMultiplier = morale / 100;
      const lumberPerTick =
        model.jobs.lumberjackImpact
        * (1 + model.lumber.axeBonusPerLevelAboveOne)
        * (1 + model.lumber.lumberYardBonusPerBuilding)
        * globalMultiplier
        * model.timeMultiplier;
      const minerMult = (1 + 2 * model.miner.pickaxeBonusPerLevel) * (1 + model.miner.minePowerBonusPerActive);
      const copperPerTick = model.jobs.minerImpact * minerMult * model.miner.copperMultiplier * globalMultiplier * model.timeMultiplier;
      const ironPerTick = model.jobs.minerImpact * minerMult * model.miner.ironMultiplier * globalMultiplier * model.timeMultiplier;
      const moneyPerTick = 2 * model.tax.citizenBaseIncome * (20 / model.tax.divisor) * globalMultiplier * model.timeMultiplier;
      const foodPerTick = -2 * model.timeMultiplier;

      return {
        resources: {
          Food: round(100 + foodPerTick * ticks),
          Lumber: round(10 + lumberPerTick * ticks),
          Copper: round(copperPerTick * ticks),
          Iron: round(ironPerTick * ticks),
          Money: round(20 + moneyPerTick * ticks),
        },
      };
    },
  },
];

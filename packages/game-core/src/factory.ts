import type { FactoryState, GameState } from '@evozen/shared-types';
import type { FactoryLineId } from './actions';
import { getAchievementLevel, getBanquetLuxuryMultiplier } from './achievements';
import { getInflationMultiplier } from './challenges';
import { getElementalBonus, getElementalType } from './complex-traits';
import { getFactoryOutputMultiplier } from './government';
import { getTraitVar } from './trait-ranks';
import { getToxicFactoryBonus } from './traits';

export interface FactoryModifier {
  label: string;
  multiplier: number;
}

export interface FactoryInputResult {
  resource: string;
  amountPerLine: number;
  consumption: number;
}

export interface FactoryLineResult {
  lineId: FactoryLineId;
  outputResource: string;
  requestedLines: number;
  allocatedLines: number;
  effectiveLines: number;
  assemblyLevel: number;
  efficiency: number;
  requestedBaseOutput: number;
  allocatedBaseOutput: number;
  materialBaseOutput: number;
  inputs: FactoryInputResult[];
  modifiers: FactoryModifier[];
  theoreticalOutput: number;
  actualOutput: number;
  truncatedOutput: number;
}

export interface FactoryTickResult {
  deltas: Record<string, number>;
  lines: FactoryLineResult[];
  activeFactories: number;
  maxFactories: number;
  efficiency: number;
  quantumLevel: number;
}

export interface FactoryTickOptions {
  poweredOn: number;
  timeMultiplier: number;
  productionMultiplier?: number;
  productionModifiers?: FactoryModifier[];
  extraPoweredLines?: number;
  extraMaxLines?: number;
  dischargeActive?: boolean;
  activeCitadels?: number;
}

interface FactoryRecipeInput {
  resource: string;
  amount: number;
}

const LINE_ORDER: FactoryLineId[] = ['Lux', 'Furs', 'Alloy', 'Polymer', 'Nano', 'Stanene'];
const LUX_DEMAND = [0.14, 0.21, 0.28, 0.35, 0.42];
const LUX_FURS = [2, 3, 4, 5, 6];
const FURS_MONEY = [10, 15, 20, 25, 30];
const FURS_POLYMER = [1.5, 2.25, 3, 3.75, 4.5];
const FURS_OUTPUT = [1, 1.5, 2, 2.5, 3];
const ALLOY_COPPER = [0.75, 1.12, 1.49, 1.86, 2.23];
const ALLOY_ALUMINIUM = [1, 1.5, 2, 2.5, 3];
const ALLOY_OUTPUT = [0.075, 0.112, 0.149, 0.186, 0.223];
const POLYMER_OIL = [0.18, 0.27, 0.36, 0.45, 0.54];
const POLYMER_OIL_KINDLING = [0.22, 0.33, 0.44, 0.55, 0.66];
const POLYMER_LUMBER = [15, 22, 29, 36, 43];
const POLYMER_OUTPUT = [0.125, 0.187, 0.249, 0.311, 0.373];
const NANO_COAL = [8, 12, 16, 20, 24];
const NANO_NEUTRONIUM = [0.05, 0.075, 0.1, 0.125, 0.15];
const NANO_OUTPUT = [0.2, 0.3, 0.4, 0.5, 0.6];
const STANENE_ALUMINIUM = [30, 45, 60, 75, 90];
const STANENE_NANO = [0.02, 0.03, 0.04, 0.05, 0.06];
const STANENE_OUTPUT = [0.6, 0.9, 1.2, 1.5, 1.8];

function raceRank(state: GameState, traitId: string): number {
  const value = state.race[traitId];
  return typeof value === 'number' && value > 0 ? value : value ? 1 : 0;
}

function population(state: GameState): number {
  return state.resource[state.race.species]?.amount ?? 0;
}

function highPopulationMultiplier(state: GameState): number {
  const rank = raceRank(state, 'high_pop');
  return rank ? getTraitVar('high_pop', 1, rank) / 100 : 1;
}

function artisanFactoryMultiplier(state: GameState): number {
  const rank = raceRank(state, 'artisan');
  if (!rank) return 1;
  return 1 + getTraitVar('artisan', 1, rank) / 100;
}

function elementalFactoryMultiplier(state: GameState): number {
  if (getElementalType(state) !== 'acid') return 1;
  const adjustedPopulation = population(state) * highPopulationMultiplier(state);
  return 1 + (getElementalBonus(state, 'industry') - 1) * adjustedPopulation / 100;
}

function commonFactoryModifiers(state: GameState): FactoryModifier[] {
  const modifiers: FactoryModifier[] = [
    { label: '剧毒特质', multiplier: getToxicFactoryBonus(state) },
    { label: '工匠大师制造', multiplier: artisanFactoryMultiplier(state) },
    { label: '政体制造效率', multiplier: getFactoryOutputMultiplier(state) },
    {
      label: '钢铁意志奖励',
      multiplier: getAchievementLevel(state, 'iron_will') >= 2 ? 1.1 : 1,
    },
    { label: '酸元素工业', multiplier: elementalFactoryMultiplier(state) },
  ];
  return modifiers.filter(({ multiplier }) => Math.abs(multiplier - 1) >= 1e-12);
}

function productionModifiers(options: FactoryTickOptions): FactoryModifier[] {
  if (options.productionModifiers) {
    return options.productionModifiers.filter(({ multiplier }) => Math.abs(multiplier - 1) >= 1e-12);
  }
  const multiplier = options.productionMultiplier ?? 1;
  return Math.abs(multiplier - 1) < 1e-12
    ? []
    : [{ label: '全局生产效率', multiplier }];
}

function linkedQuantumMultiplier(state: GameState): number {
  const rank = raceRank(state, 'linked');
  if (!rank) return 1;
  const perCitizen = getTraitVar('linked', 0, rank) / 100;
  const softcap = getTraitVar('linked', 1, rank) / 100;
  let factor = perCitizen * population(state);
  if (factor > softcap) {
    factor -= softcap;
    factor = factor / (factor + 200 - getTraitVar('linked', 1, rank));
    factor += softcap;
  }
  return 1 + factor;
}

export function calculateQuantumLevel(state: GameState, activeCitadels?: number): number {
  if ((state.tech['high_tech'] ?? 0) < 11) return 0;
  let knowledge = Math.max(0, state.resource.Knowledge?.max ?? 0);
  let increment = 250_000;
  let qbits = 0;
  while (knowledge > increment) {
    knowledge -= increment;
    increment *= 1.1;
    qbits++;
  }
  qbits += Number((knowledge / increment).toFixed(2));

  const citadels = activeCitadels
    ?? (state.interstellar['citadel'] as { on?: number } | undefined)?.on
    ?? 0;
  if ((state.tech['high_tech'] ?? 0) >= 15 && citadels > 0) {
    qbits *= 1 + citadels * 0.05;
  }
  const aiCores = state.prestige.AICore?.count ?? 0;
  if (getAchievementLevel(state, 'obsolete') >= 5 && aiCores > 0) {
    qbits *= 2 - 0.99 ** aiCores;
  }
  qbits *= linkedQuantumMultiplier(state);
  return Number(qbits.toFixed(3));
}

function quantumFactoryMultiplier(state: GameState, lineId: FactoryLineId, quantumLevel: number): number {
  if (!(state.tech['q_factory'] ?? 0)) return 1;
  const divisor = lineId === 'Furs' ? 8 : 2;
  return 1 + (quantumLevel - 1) / divisor;
}

function applyModifiers(base: number, modifiers: FactoryModifier[]): number {
  return modifiers.reduce((value, modifier) => value * modifier.multiplier, base);
}

function addDelta(deltas: Record<string, number>, resource: string, amount: number): void {
  if (Math.abs(amount) < 1e-12) return;
  deltas[resource] = (deltas[resource] ?? 0) + amount;
}

function consumeInputs(
  state: GameState,
  deltas: Record<string, number>,
  inputs: FactoryRecipeInput[],
  effectiveLines: number,
  efficiency: number,
  timeMultiplier: number,
): FactoryInputResult[] {
  return inputs.map(({ resource, amount }) => {
    const amountPerLine = amount * efficiency * timeMultiplier;
    const consumption = effectiveLines * amountPerLine;
    const target = state.resource[resource];
    if (target) target.amount = Math.max(0, target.amount - consumption);
    addDelta(deltas, resource, -consumption);
    return { resource, amountPerLine, consumption };
  });
}

function maxLinesByInputs(
  state: GameState,
  inputs: FactoryRecipeInput[],
  allocatedLines: number,
  efficiency: number,
  timeMultiplier: number,
): number {
  let maxLines = allocatedLines;
  for (const { resource, amount } of inputs) {
    const costPerLine = amount * efficiency * timeMultiplier;
    if (costPerLine <= 0) continue;
    const available = state.resource[resource]?.amount ?? 0;
    maxLines = Math.min(maxLines, Math.floor((available + 1e-12) / costPerLine));
  }
  return Math.max(0, maxLines);
}

function produceResource(
  state: GameState,
  deltas: Record<string, number>,
  resource: string,
  theoreticalOutput: number,
): { actualOutput: number; truncatedOutput: number } {
  const target = state.resource[resource];
  if (!target || theoreticalOutput <= 0) {
    return { actualOutput: 0, truncatedOutput: Math.max(0, theoreticalOutput) };
  }
  const availableCapacity = target.max >= 0
    ? Math.max(0, target.max - target.amount)
    : Infinity;
  const actualOutput = Math.min(theoreticalOutput, availableCapacity);
  target.amount += actualOutput;
  addDelta(deltas, resource, actualOutput);
  return { actualOutput, truncatedOutput: theoreticalOutput - actualOutput };
}

export function factoryTickDetailed(state: GameState, options: FactoryTickOptions): FactoryTickResult {
  const deltas: Record<string, number> = {};
  const lines: FactoryLineResult[] = [];
  const factory = state.city['factory'] as FactoryState | undefined;
  const empty = {
    deltas,
    lines,
    activeFactories: 0,
    maxFactories: 0,
    efficiency: 0,
    quantumLevel: 0,
  };
  if (!factory) return empty;

  const maxFactories = Math.max(0, (factory.on ?? factory.count ?? 0) + (options.extraMaxLines ?? 0));
  const activeFactories = Math.max(0, options.poweredOn + (options.extraPoweredLines ?? 0));
  const efficiency = maxFactories > 0 ? activeFactories / maxFactories : 0;
  const quantumLevel = calculateQuantumLevel(state, options.activeCitadels);
  if (efficiency <= 0) {
    return { ...empty, activeFactories, maxFactories, efficiency, quantumLevel };
  }

  const assemblyLevel = Math.min(Math.max(0, state.tech['factory'] ?? 0), 4);
  const commonModifiers = commonFactoryModifiers(state);
  const globalModifiers = productionModifiers(options);
  const dischargeModifiers = options.dischargeActive
    ? [{ label: '电磁放电', multiplier: 0.5 }]
    : [];
  let remainingLines = maxFactories;

  for (const lineId of LINE_ORDER) {
    const requestedLines = Math.max(0, factory[lineId] ?? 0);
    const allocatedLines = Math.min(requestedLines, remainingLines);
    remainingLines -= allocatedLines;
    if (factory[lineId] !== allocatedLines) factory[lineId] = allocatedLines;
    if (requestedLines <= 0) continue;

    let outputResource = lineId === 'Nano' ? 'Nano_Tube' : lineId;
    let outputRate = 0;
    let inputs: FactoryRecipeInput[] = [];
    let modifiers: FactoryModifier[] = [];
    let demandBase = 1;

    switch (lineId) {
      case 'Lux':
        outputResource = 'Money';
        outputRate = LUX_DEMAND[assemblyLevel];
        inputs = [{ resource: 'Furs', amount: LUX_FURS[assemblyLevel] }];
        demandBase = population(state);
        modifiers = [
          { label: '高人口需求折算', multiplier: highPopulationMultiplier(state) },
          { label: '剧毒特质', multiplier: getToxicFactoryBonus(state) },
          {
            label: '奢侈品政体定价',
            multiplier: state.civic.govern?.type === 'corpocracy'
              ? 2.5
              : state.civic.govern?.type === 'socialist' ? 0.8 : 1,
          },
          {
            label: '钢铁意志奖励',
            multiplier: getAchievementLevel(state, 'iron_will') >= 2 ? 1.1 : 1,
          },
          { label: '通胀需求', multiplier: getInflationMultiplier(state, 1250) },
          { label: '餐厅盛宴', multiplier: getBanquetLuxuryMultiplier(state) },
          ...dischargeModifiers,
          ...globalModifiers,
        ].filter(({ multiplier }) => Math.abs(multiplier - 1) >= 1e-12);
        break;
      case 'Furs':
        outputRate = FURS_OUTPUT[assemblyLevel];
        inputs = [
          { resource: 'Money', amount: FURS_MONEY[assemblyLevel] },
          { resource: 'Polymer', amount: FURS_POLYMER[assemblyLevel] },
        ];
        break;
      case 'Alloy':
        outputRate = ALLOY_OUTPUT[assemblyLevel];
        inputs = [
          { resource: 'Copper', amount: ALLOY_COPPER[assemblyLevel] },
          { resource: 'Aluminium', amount: ALLOY_ALUMINIUM[assemblyLevel] },
        ];
        break;
      case 'Polymer': {
        outputRate = POLYMER_OUTPUT[assemblyLevel];
        const kindling = Boolean(state.race['kindling_kindred'] || state.race['smoldering']);
        inputs = [
          {
            resource: 'Oil',
            amount: kindling ? POLYMER_OIL_KINDLING[assemblyLevel] : POLYMER_OIL[assemblyLevel],
          },
        ];
        if (!kindling) inputs.push({ resource: 'Lumber', amount: POLYMER_LUMBER[assemblyLevel] });
        break;
      }
      case 'Nano':
        outputRate = NANO_OUTPUT[assemblyLevel];
        inputs = [
          { resource: 'Coal', amount: NANO_COAL[assemblyLevel] },
          { resource: 'Neutronium', amount: NANO_NEUTRONIUM[assemblyLevel] },
        ];
        break;
      case 'Stanene':
        outputRate = STANENE_OUTPUT[assemblyLevel];
        inputs = [
          { resource: 'Aluminium', amount: STANENE_ALUMINIUM[assemblyLevel] },
          { resource: 'Nano_Tube', amount: STANENE_NANO[assemblyLevel] },
        ];
        break;
    }

    const effectiveLines = maxLinesByInputs(
      state,
      inputs,
      allocatedLines,
      efficiency,
      options.timeMultiplier,
    );
    const inputResults = consumeInputs(
      state,
      deltas,
      inputs,
      effectiveLines,
      efficiency,
      options.timeMultiplier,
    );
    const requestedBaseOutput = requestedLines * demandBase * outputRate * efficiency * options.timeMultiplier;
    const allocatedBaseOutput = allocatedLines * demandBase * outputRate * efficiency * options.timeMultiplier;
    const materialBaseOutput = effectiveLines * demandBase * outputRate * efficiency * options.timeMultiplier;

    if (lineId !== 'Lux') {
      modifiers = [...commonModifiers];
      if (lineId === 'Alloy' && (state.tech['alloy'] ?? 0) >= 1) {
        modifiers.push({ label: '合金科技', multiplier: 1.37 });
      }
      if (lineId === 'Alloy' && Number(state.race['metallurgist']) > 0) {
        modifiers.push({
          label: '冶金特质',
          multiplier: 1 + Number(state.race['metallurgist']) * 0.04,
        });
      }
      if (lineId === 'Polymer' && (state.tech['polymer'] ?? 0) >= 2) {
        modifiers.push({ label: '聚合物科技', multiplier: 1.42 });
      }
      modifiers.push(...globalModifiers, ...dischargeModifiers);
      const quantumMultiplier = quantumFactoryMultiplier(state, lineId, quantumLevel);
      if (Math.abs(quantumMultiplier - 1) >= 1e-12) {
        modifiers.push({ label: '量子制造', multiplier: quantumMultiplier });
      }
    }

    const theoreticalOutput = applyModifiers(materialBaseOutput, modifiers);
    const { actualOutput, truncatedOutput } = produceResource(
      state,
      deltas,
      outputResource,
      theoreticalOutput,
    );
    lines.push({
      lineId,
      outputResource,
      requestedLines,
      allocatedLines,
      effectiveLines,
      assemblyLevel,
      efficiency,
      requestedBaseOutput,
      allocatedBaseOutput,
      materialBaseOutput,
      inputs: inputResults,
      modifiers,
      theoreticalOutput,
      actualOutput,
      truncatedOutput,
    });
  }

  return { deltas, lines, activeFactories, maxFactories, efficiency, quantumLevel };
}

export function factoryTick(
  state: GameState,
  poweredOn: number,
  timeMultiplier: number,
  deltas: Record<string, number>,
  productionMultiplier: number,
  extraPoweredLines: number = 0,
  extraMaxLines: number = 0,
  dischargeActive: boolean = false,
): void {
  const result = factoryTickDetailed(state, {
    poweredOn,
    timeMultiplier,
    productionMultiplier,
    extraPoweredLines,
    extraMaxLines,
    dischargeActive,
  });
  for (const [resource, amount] of Object.entries(result.deltas)) {
    deltas[resource] = (deltas[resource] ?? 0) + amount;
  }
}

/**
 * Womling 外星矮人系统 — 对标 legacy/src/truepath.js womling_*
 *
 * 在 Eris 上发现的外星种族，可以雇佣他们做工。
 * 包含：village（村庄）、farm（农场）、mine（矿场）、lab（实验室）等。
 */

import type { GameState } from '@evozen/shared-types';
import { getAchievementLevel } from './achievements';
import { getPsychicProductionMultiplier } from './production-modifiers';
import { getWomlingRelation } from './tauceti';

export interface ServantsState {
  max: number;
  used: number;
  smax: number;
  sused: number;
  jobs: Record<string, number>;
  sjobs: Record<string, number>;
  force_scavenger: boolean;
}

export function createServantsState(state: GameState): ServantsState | null {
  const stats = state.stats as Record<string, unknown>;
  const matrix = Number(stats['matrix'] ?? 0);
  const retire = Number(stats['retire'] ?? 0);
  const eden = Number(stats['eden'] ?? 0);
  if (state.race['warlord'] || (matrix <= 0 && retire <= 0) || state.race['servants']) {
    return null;
  }

  const max = Math.min(matrix, 100) + Math.min(retire, 100) + Math.min(eden, 100);
  let smax = Math.min(Math.min(matrix, retire), 100);
  if (getAchievementLevel(state, 'pathfinder') >= 5) {
    smax += 2;
  }

  return {
    max,
    used: 0,
    smax,
    sused: 0,
    jobs: {},
    sjobs: {},
    force_scavenger: false,
  };
}

export function maybeGenerateServants(state: GameState): boolean {
  // legacy main.js: daily long-loop check with Math.rand(0,25) === 0.
  if (Math.floor(Math.random() * 26) !== 0) return false;
  const servants = createServantsState(state);
  if (!servants) return false;
  state.race['servants'] = servants;
  return true;
}

export function getServantsState(state: GameState): ServantsState | undefined {
  return state.race['servants'] as ServantsState | undefined;
}

export function canUseServants(state: GameState): boolean {
  return Boolean(getServantsState(state));
}

// ============================================================
// Womling tick — 产出资源
// ============================================================

export interface WomlingProductionModifier {
  label: string;
  multiplier: number;
}

export interface WomlingProductionLine {
  resource: string;
  miners: number;
  ratePerMiner: number;
  baseOutput: number;
  modifiers: WomlingProductionModifier[];
  output: number;
}

export interface WomlingTickOptions {
  supportedOn?: Record<string, number>;
  productionModifiers?: WomlingProductionModifier[];
  hungerMultiplier?: number;
}

export interface TauWomlingState {
  population: number;
  farmers: number;
  miners: number;
  injured: number;
  working: number;
  loyalty: number;
  morale: number;
  productivity: number;
}

export interface WomlingTickResult {
  state: TauWomlingState;
  lines: WomlingProductionLine[];
}

function overseerValue(state: GameState): number {
  const relation = getWomlingRelation(state);
  const upgraded = getAchievementLevel(state, 'overlord') >= 5;
  let value = relation === 'lord'
    ? (upgraded ? 12 : 10)
    : relation === 'god'
      ? (upgraded ? 6 : 5)
      : relation === 'friend'
        ? (upgraded ? 10 : 8)
        : 0;
  if (state.race['lone_survivor']) value *= 2;
  return value;
}

export function resolveTauWomlingState(
  state: GameState,
  supportedOn: Record<string, number> = {},
): TauWomlingState {
  const relation = getWomlingRelation(state);
  const overseer = state.tauceti['overseer'];
  if (!relation || !overseer || (state.tech['tau_red'] ?? 0) < 5) {
    return { population: 0, farmers: 0, miners: 0, injured: 0, working: 0, loyalty: 0, morale: 0, productivity: 0 };
  }

  let loyalty = relation === 'friend' ? 25 : relation === 'god' ? 75 : 0;
  let morale = relation === 'friend' ? 75 : relation === 'god' ? 40 : 30;
  const supportedOverseers = Math.max(0, supportedOn['overseer'] ?? 0);
  loyalty += supportedOverseers * overseerValue(state);

  const populationPerVillage = (state.tech['womling_pop'] ?? 0) >= 2 ? 6 : 5;
  let population = Math.max(0, supportedOn['womling_village'] ?? 0) * populationPerVillage;
  const farmers = Math.min(population, Math.max(0, supportedOn['womling_farm'] ?? 0) * 2);
  let cropPerFarmer = (state.tech['womling_pop'] ?? 0) >= 1 ? 8 : 6;
  if (state.tech['womling_gene']) cropPerFarmer += 2;
  population = Math.min(population, farmers * cropPerFarmer);

  const injured = Math.min(population, Math.max(0, Number(overseer.injured ?? 0)));
  const unemployed = Math.max(0, population - farmers - injured);
  const miners = Math.min(unemployed, Math.max(0, supportedOn['womling_mine'] ?? 0) * 6);

  loyalty = Math.max(0, Math.min(100, loyalty - miners));
  morale = Math.max(0, Math.min(100, morale - miners - farmers - injured));
  const productivity = Math.round((loyalty + morale) / 2);
  const working = farmers + miners;

  Object.assign(overseer, { pop: population, working, injured, morale, loyal: loyalty, prod: productivity });
  const farm = state.tauceti['womling_farm'];
  if (farm) farm.farmers = farmers;
  const mine = state.tauceti['womling_mine'];
  if (mine) mine.miners = miners;

  return { population, farmers, miners, injured, working, loyalty, morale, productivity };
}

export function womlingTick(
  state: GameState,
  timeMul: number,
  deltas: Record<string, number>,
  options: WomlingTickOptions = {},
): WomlingTickResult {
  const womlingState = resolveTauWomlingState(state, options.supportedOn);
  const lines: WomlingProductionLine[] = [];
  if (womlingState.miners <= 0 || womlingState.productivity <= 0) {
    return { state: womlingState, lines };
  }

  let miningBoost = 1 + Math.max(0, state.tech['womling_mining'] ?? 0) * 0.15;
  if (getAchievementLevel(state, 'overlord') >= 5) miningBoost *= 1.1;
  if (state.tech['womling_gene']) miningBoost *= 1.25;

  const rates: Record<string, number> = { Unobtainium: 0.0305 };
  if (state.tech['isolation']) {
    rates.Uranium = 0.047;
    rates.Titanium = 0.616;
    if (state.race['lone_survivor']) {
      rates.Copper = 1.191;
      rates.Iron = 1.377;
      rates.Aluminium = 1.544;
      rates.Neutronium = 0.382;
      rates.Iridium = 0.535;
    }
  }

  for (const [resource, ratePerMiner] of Object.entries(rates)) {
    const baseOutput = womlingState.miners * ratePerMiner * miningBoost * timeMul;
    const modifiers: WomlingProductionModifier[] = [
      { label: 'Womling 生产率', multiplier: womlingState.productivity / 100 },
      { label: '灵能生产增益', multiplier: getPsychicProductionMultiplier(state, resource) },
      ...(options.productionModifiers ?? []),
    ];
    if (['Iron', 'Iridium', 'Neutronium'].includes(resource)) {
      modifiers.push({ label: '饥饿修正', multiplier: options.hungerMultiplier ?? 1 });
    }
    let output = baseOutput;
    for (const modifier of modifiers) output *= modifier.multiplier;
    deltas[resource] = (deltas[resource] ?? 0) + output;
    lines.push({ resource, miners: womlingState.miners, ratePerMiner, baseOutput, modifiers, output });
  }
  return { state: womlingState, lines };
}

// ============================================================
// 雇佣条件
// ============================================================

export function canUseWomling(state: GameState): boolean {
  return getWomlingRelation(state) !== undefined;
}

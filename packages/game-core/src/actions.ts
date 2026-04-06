import type { GameState } from '@evozen/shared-types';
import { BASIC_STRUCTURES } from './structures';
import { BASIC_TECHS } from './tech';
import { BASE_JOBS } from './jobs';
import { getModifiedTechCosts } from './traits';
import { canEnqueue } from './queue';
import { getMaxTaxRate } from './government';
import { applyDerivedStateInPlace } from './derived-state';

const CRAFT_LINE_IDS = ['Plywood', 'Brick', 'Wrought_Iron', 'Sheet_Metal'] as const;

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

export function getBuildCost(state: GameState, structureId: string): Record<string, number> {
  const def = BASIC_STRUCTURES.find((structure) => structure.id === structureId);
  if (!def) return {};

  const count = (state.city[structureId] as { count?: number } | undefined)?.count ?? 0;
  const costs: Record<string, number> = {};
  for (const [resId, costFn] of Object.entries(def.costs)) {
    costs[resId] = costFn(state, count);
  }
  return costs;
}

export function canBuildStructure(state: GameState, structureId: string): boolean {
  const def = BASIC_STRUCTURES.find((structure) => structure.id === structureId);
  if (!def) return false;

  for (const [techId, lvl] of Object.entries(def.reqs)) {
    if ((state.tech[techId] ?? 0) < lvl) return false;
  }

  const costs = getBuildCost(state, structureId);
  for (const [resId, cost] of Object.entries(costs)) {
    if ((state.resource[resId]?.amount ?? 0) < cost) return false;
  }

  return true;
}

export function buildStructure(state: GameState, structureId: string): GameState | null {
  if (!canBuildStructure(state, structureId)) return null;

  const def = BASIC_STRUCTURES.find((structure) => structure.id === structureId);
  if (!def) return null;

  const next = cloneState(state);
  const costs = getBuildCost(next, structureId);
  for (const [resId, cost] of Object.entries(costs)) {
    next.resource[resId].amount -= cost;
  }

  if (!next.city[structureId]) {
    (next.city as Record<string, unknown>)[structureId] = { count: 0, on: 0 };
  }

  const building = next.city[structureId] as { count: number; on?: number };
  building.count++;
  if (building.on !== undefined) {
    building.on++;
  }

  applyDerivedStateInPlace(next);
  return next;
}

export function enqueueStructure(state: GameState, structureId: string): GameState | null {
  if (!canEnqueue(state)) return null;

  const def = BASIC_STRUCTURES.find((structure) => structure.id === structureId);
  if (!def) return null;

  const next = cloneState(state);
  const cost = getBuildCost(next, structureId);
  next.queue.queue = next.queue.queue || [];
  next.queue.queue.push({
    id: structureId,
    action: `city.${structureId}`,
    type: 'building',
    label: def.name,
    q: 1,
    qs: next.queue.queue.length,
    time: 0,
    t_max: 0,
    cost,
    progress: {},
  });

  return next;
}

export function dequeueStructure(state: GameState, index: number): GameState | null {
  const queue = state.queue.queue;
  if (!queue || index < 0 || index >= queue.length) return null;

  const next = cloneState(state);
  const item = next.queue.queue[index];
  if (item?.progress) {
    for (const [resId, amount] of Object.entries(item.progress)) {
      if (next.resource[resId]) {
        next.resource[resId].amount += amount;
      }
    }
  }

  next.queue.queue.splice(index, 1);
  return next;
}

export function isTechAvailable(state: GameState, techId: string): boolean {
  const def = BASIC_TECHS.find((tech) => tech.id === techId);
  if (!def) return false;

  const [grantKey, grantLvl] = def.grant;
  if ((state.tech[grantKey] ?? 0) >= grantLvl) return false;

  for (const [reqKey, reqLvl] of Object.entries(def.reqs)) {
    if ((state.tech[reqKey] ?? 0) < reqLvl) return false;
  }

  return true;
}

export function getResearchCost(state: GameState, techId: string): Record<string, number> {
  const def = BASIC_TECHS.find((tech) => tech.id === techId);
  if (!def) return {};
  return getModifiedTechCosts(state, def.costs, def.category, techId);
}

export function canResearchTech(state: GameState, techId: string): boolean {
  if (!isTechAvailable(state, techId)) return false;

  const costs = getResearchCost(state, techId);
  for (const [resId, cost] of Object.entries(costs)) {
    if ((state.resource[resId]?.amount ?? 0) < cost) return false;
  }

  return true;
}

export function researchTech(state: GameState, techId: string): GameState | null {
  if (!canResearchTech(state, techId)) return null;

  const def = BASIC_TECHS.find((tech) => tech.id === techId);
  if (!def) return null;

  const next = cloneState(state);
  const costs = getResearchCost(next, techId);
  for (const [resId, cost] of Object.entries(costs)) {
    next.resource[resId].amount -= cost;
  }

  const [grantKey, grantLvl] = def.grant;
  next.tech[grantKey] = grantLvl;
  applyDerivedStateInPlace(next);
  return next;
}

export function assignWorker(state: GameState, jobId: string): GameState | null {
  const jobDef = BASE_JOBS.find((job) => job.id === jobId);
  if (!jobDef || jobId === 'unemployed') return null;

  const next = cloneState(state);
  const job = next.civic[jobId] as { workers?: number; max?: number } | undefined;
  const unemployed = next.civic['unemployed'] as { workers?: number } | undefined;
  if (!job || !unemployed || (unemployed.workers ?? 0) <= 0) return null;
  if ((job.max ?? -1) >= 0 && (job.workers ?? 0) >= (job.max ?? 0)) return null;

  job.workers = (job.workers ?? 0) + 1;
  unemployed.workers = (unemployed.workers ?? 0) - 1;
  return next;
}

export function removeWorker(state: GameState, jobId: string): GameState | null {
  if (jobId === 'unemployed') return null;

  const next = cloneState(state);
  const job = next.civic[jobId] as { workers?: number } | undefined;
  const unemployed = next.civic['unemployed'] as { workers?: number } | undefined;
  if (!job || !unemployed || (job.workers ?? 0) <= 0) return null;

  job.workers = (job.workers ?? 0) - 1;
  unemployed.workers = (unemployed.workers ?? 0) + 1;

  if (jobId === 'craftsman') {
    const foundry = next.city['foundry'] as Record<string, number> | undefined;
    if (foundry) {
      let totalAssigned = 0;
      for (const craftId of CRAFT_LINE_IDS) {
        totalAssigned += foundry[craftId] ?? 0;
      }

      while (totalAssigned > (job.workers ?? 0)) {
        for (let i = CRAFT_LINE_IDS.length - 1; i >= 0; i--) {
          const craftId = CRAFT_LINE_IDS[i];
          if ((foundry[craftId] ?? 0) > 0) {
            foundry[craftId] = (foundry[craftId] ?? 0) - 1;
            totalAssigned--;
            break;
          }
        }
      }
    }
  }

  return next;
}

export function setTaxRate(state: GameState, rate: number): GameState {
  const next = cloneState(state);
  const maxRate = getMaxTaxRate(next);
  const clamped = Math.max(0, Math.min(maxRate, Math.round(rate)));
  next.civic.taxes.tax_rate = clamped;
  return next;
}

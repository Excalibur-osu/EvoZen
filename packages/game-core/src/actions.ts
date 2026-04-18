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

function ensureSpaceStructure(state: GameState, id: string): void {
  if (!state.space[id]) {
    state.space[id] = { count: 0 };
  }
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
    if (cost <= 0) continue;
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
    if (cost <= 0) continue;
    if (!next.resource[resId]) return null;
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

  if (def.condition && !def.condition(state)) return false;

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
    if (cost <= 0) continue;
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
    if (cost <= 0) continue;
    if (!next.resource[resId]) return null;
    next.resource[resId].amount -= cost;
  }

  const [grantKey, grantLvl] = def.grant;
  next.tech[grantKey] = grantLvl;

  // 太空入口骨架：研究关键科技时预注册对应的太空结构槽位，
  // 后续补建筑/产线时无需再迁移旧存档。
  switch (techId) {
    case 'rocketry':
      // legacy 中 space:2 由 test_launch 给予；当前用火箭学作为最小桥接入口
      next.tech['space'] = Math.max(next.tech['space'] ?? 0, 2);
      break;
    case 'astrophysics':
      ensureSpaceStructure(next, 'propellant_depot');
      break;
    case 'rover':
      // legacy 中月球前哨阶段会推进到 space:3，并建立 luna 入口
      next.tech['space'] = Math.max(next.tech['space'] ?? 0, 3);
      next.tech['luna'] = Math.max(next.tech['luna'] ?? 0, 1);
      ensureSpaceStructure(next, 'moon_base');
      break;
    case 'probes':
      // legacy 中月球任务/火星任务会推进到 space:4，并建立 mars 入口
      next.tech['space'] = Math.max(next.tech['space'] ?? 0, 4);
      next.tech['mars'] = Math.max(next.tech['mars'] ?? 0, 1);
      ensureSpaceStructure(next, 'spaceport');
      break;
    case 'observatory':
      ensureSpaceStructure(next, 'observatory');
      break;
    case 'colonization':
      ensureSpaceStructure(next, 'mars_base');
      break;
    case 'red_tower':
      ensureSpaceStructure(next, 'red_tower');
      break;
    case 'space_manufacturing':
      ensureSpaceStructure(next, 'red_factory');
      break;
  }

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

export function assignSmelter(state: GameState, category: 'fuel' | 'output', type: string): GameState | null {
  const next = cloneState(state);
  const smelter = next.city.smelter;
  if (!smelter) return null;

  if (category === 'fuel') {
    const totalFuelOptions = (smelter.Wood ?? 0) + (smelter.Coal ?? 0) + (smelter.Oil ?? 0) + (smelter.Inferno ?? 0);
    // Can't assign more fuel options than built smelters
    if (totalFuelOptions >= smelter.count) return null;
    (smelter as Record<string, any>)[type] = ((smelter as Record<string, any>)[type] ?? 0) + 1;
  } else if (category === 'output') {
    const totalOutputs = (smelter.Iron ?? 0) + (smelter.Steel ?? 0) + (smelter.Iridium ?? 0);
    const totalFuelOptions = (smelter.Wood ?? 0) + (smelter.Coal ?? 0) + (smelter.Oil ?? 0) + (smelter.Inferno ?? 0);
    // Can't assign more output options than assigned fuel options
    if (totalOutputs >= totalFuelOptions) return null;
    (smelter as Record<string, any>)[type] = ((smelter as Record<string, any>)[type] ?? 0) + 1;
  }

  return next;
}

export function removeSmelter(state: GameState, category: 'fuel' | 'output', type: string): GameState | null {
  const next = cloneState(state);
  const smelter = next.city.smelter;
  if (!smelter) return null;

  if ((smelter as Record<string, any>)[type] > 0) {
    (smelter as Record<string, any>)[type]--;

    // Auto-balance outputs if reducing fuels makes total fuels < total outputs
    if (category === 'fuel') {
      const totalFuelOptions = (smelter.Wood ?? 0) + (smelter.Coal ?? 0) + (smelter.Oil ?? 0) + (smelter.Inferno ?? 0);
      let totalOutputs = (smelter.Iron ?? 0) + (smelter.Steel ?? 0) + (smelter.Iridium ?? 0);
      
      while (totalOutputs > totalFuelOptions) {
        if ((smelter.Iron ?? 0) > 0) smelter.Iron--;
        else if ((smelter.Steel ?? 0) > 0) smelter.Steel--;
        else if ((smelter.Iridium ?? 0) > 0) smelter.Iridium--;
        totalOutputs--;
      }
    }
    return next;
  }

  return null;
}


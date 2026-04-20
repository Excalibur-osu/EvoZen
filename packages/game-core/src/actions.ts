import type {
  GameState,
  SmelterAllocationId,
  SmelterFuelId,
  SmelterOutputId,
  SmelterState,
} from '@evozen/shared-types';
import { BASIC_STRUCTURES } from './structures';
import { BASIC_TECHS } from './tech';
import { BASE_JOBS } from './jobs';
import { getModifiedTechCosts } from './traits';
import { canEnqueue } from './queue';
import { getMaxTaxRate } from './government';
import { applyDerivedStateInPlace } from './derived-state';
import {
  SPACE_STRUCTURES,
  canBuildSpaceStructure,
  getSpaceBuildCost,
} from './space';

const CRAFT_LINE_IDS = ['Plywood', 'Brick', 'Wrought_Iron', 'Sheet_Metal', 'Mythril'] as const;

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

// ============================================================
// 太空建筑建造
// ============================================================

/**
 * 建造一座太空建筑。
 *
 * 初始化规则（对标 legacy space.js 的 struct()）：
 *   - 所有建筑：{ count, on }
 *   - 支援供给者（support.amount > 0）：追加 { support, s_max }
 *
 * 建成后 on 始终递增（与 city 建筑一致）。通电/燃料等实际"有效 on" 由
 * powerTick 与 resolveSpaceSupport 每 tick 重算，不直接修改 on。
 */
export function buildSpaceStructure(state: GameState, structureId: string): GameState | null {
  if (!canBuildSpaceStructure(state, structureId)) return null;

  const def = SPACE_STRUCTURES.find((structure) => structure.id === structureId);
  if (!def) return null;

  const next = cloneState(state);
  const costs = getSpaceBuildCost(next, structureId);
  for (const [resId, cost] of Object.entries(costs)) {
    if (cost <= 0) continue;
    if (!next.resource[resId]) return null;
    next.resource[resId].amount -= cost;
  }

  ensureSpaceStructure(next, structureId);
  const building = next.space[structureId] as {
    count: number;
    on?: number;
    support?: number;
    s_max?: number;
  };
  building.count++;

  // 有电力/支援/燃料需求的建筑一律维护 on 字段；其他保持 satellite 一类的"纯 count"形态。
  const needsOnTracking =
    (def.powerCost ?? 0) > 0 ||
    def.support !== undefined ||
    def.supportFuel !== undefined;
  if (needsOnTracking) {
    building.on = (building.on ?? 0) + 1;
    // 支援供给者：初始化 support / s_max，供 UI 与解算读取
    if (def.support && def.support.amount > 0) {
      building.support = building.support ?? 0;
      building.s_max = building.s_max ?? 0;
    }
  } else if (building.on !== undefined) {
    // 兼容历史：若已有 on 字段则继续自增
    building.on++;
  }

  if (structureId === 'spaceport') {
    next.tech['mars'] = Math.max(next.tech['mars'] ?? 0, 1);
  }
  if (structureId === 'red_factory') {
    const factory = next.city['factory'] as { Alloy?: number } | undefined;
    if (factory) {
      factory.Alloy = (factory.Alloy ?? 0) + 1;
    }
    next.settings.showIndustry = true;
  }
  // 对标 legacy/src/space.js L2197-2198：建造首座 space_station 时 asteroid 推进到 3
  if (structureId === 'space_station') {
    if ((next.tech['asteroid'] ?? 0) < 3) {
      next.tech['asteroid'] = 3;
    }
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
      // 对齐到更接近 legacy 的阶段入口：
      // rocketry 只建立 space:1，真正推进到 space:2 由 test_launch 完成。
      next.tech['space'] = Math.max(next.tech['space'] ?? 0, 1);
      break;
    case 'astrophysics':
      ensureSpaceStructure(next, 'propellant_depot');
      break;
    case 'rover':
      // legacy 中真正推进到 space:3 / luna:1 的是 moon_mission。
      // rover 只解锁任务前置，不再直接抬阶段。
      break;
    case 'probes':
      // legacy 中 probes 只建立火星支线入口与 spaceport 槽位，
      // 真正推进到 space:4 的是 red_mission，mars:1 的来源是首座 spaceport。
      ensureSpaceStructure(next, 'spaceport');
      break;
    case 'observatory':
      ensureSpaceStructure(next, 'observatory');
      break;
    case 'colonization':
      ensureSpaceStructure(next, 'biodome');
      break;
    case 'red_tower':
      ensureSpaceStructure(next, 'red_tower');
      break;
    case 'space_manufacturing':
      ensureSpaceStructure(next, 'red_factory');
      break;
    case 'vr_center':
      ensureSpaceStructure(next, 'vr_center');
      break;
    case 'exotic_lab':
      ensureSpaceStructure(next, 'exotic_lab');
      break;
    case 'space_marines':
      // space_barracks 不走 power/support 池，但需要 on 字段来追踪油耗裁剪。
      // ensureSpaceStructure 只创建 { count: 0 }，不含 on；必须手动初始化 on: 0，
      // 后续 buildSpaceStructure 的 "else if (building.on !== undefined)" 分支会自增。
      if (!next.space['space_barracks']) {
        next.space['space_barracks'] = { count: 0, on: 0 };
      }
      break;
    case 'ancient_theology':
      ensureSpaceStructure(next, 'ziggurat');
      break;
    case 'study':
      // legacy tech.js L8479: global.tech['ancient_study'] = 1;
      next.tech['ancient_study'] = 1;
      break;

    // ===== 太阳能 / 戴森 =====
    case 'dyson_swarm':
      // solar:3 → 解锁虫群控制站与虫群卫星
      ensureSpaceStructure(next, 'swarm_control');
      ensureSpaceStructure(next, 'swarm_satellite');
      break;
    case 'swarm_plant':
      // solar:4 → 解锁地狱行星虫群工厂
      ensureSpaceStructure(next, 'swarm_plant');
      break;

    // ===== 气态巨行星 =====
    case 'atmospheric_mining':
      // gas_giant:1 → 解锁采集站与储存站
      ensureSpaceStructure(next, 'gas_mining');
      ensureSpaceStructure(next, 'gas_storage');
      break;

    // ===== 小行星带 =====
    case 'zero_g_mining':
      // asteroid:2 → 解锁太空站、铱矿船、铁矿船
      ensureSpaceStructure(next, 'space_station');
      ensureSpaceStructure(next, 'iridium_ship');
      ensureSpaceStructure(next, 'iron_ship');
      break;
    case 'elerium_mining':
      // asteroid:5 → 解锁超铀采矿船
      ensureSpaceStructure(next, 'elerium_ship');
      break;

    // ===== 超铀 / 矮行星 =====
    case 'elerium_reactor':
      // elerium:2 → 解锁超铀反应堆
      ensureSpaceStructure(next, 'e_reactor');
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

function incrementSmelterAllocation(smelter: SmelterState, key: SmelterAllocationId): void {
  smelter[key] = (smelter[key] ?? 0) + 1;
}

function decrementSmelterAllocation(smelter: SmelterState, key: SmelterAllocationId): void {
  smelter[key] = Math.max(0, (smelter[key] ?? 0) - 1);
}

export function assignSmelter(state: GameState, category: 'fuel', type: SmelterFuelId): GameState | null;
export function assignSmelter(state: GameState, category: 'output', type: SmelterOutputId): GameState | null;
export function assignSmelter(
  state: GameState,
  category: 'fuel' | 'output',
  type: SmelterFuelId | SmelterOutputId,
): GameState | null {
  const next = cloneState(state);
  const smelter = next.city.smelter;
  if (!smelter) return null;

  if (category === 'fuel') {
    const totalFuelOptions = (smelter.Wood ?? 0) + (smelter.Coal ?? 0) + (smelter.Oil ?? 0) + (smelter.Inferno ?? 0);
    // Can't assign more fuel options than built smelters
    if (totalFuelOptions >= smelter.count) return null;
    incrementSmelterAllocation(smelter, type);
  } else if (category === 'output') {
    const totalOutputs = (smelter.Iron ?? 0) + (smelter.Steel ?? 0) + (smelter.Iridium ?? 0);
    const totalFuelOptions = (smelter.Wood ?? 0) + (smelter.Coal ?? 0) + (smelter.Oil ?? 0) + (smelter.Inferno ?? 0);
    // Can't assign more output options than assigned fuel options
    if (totalOutputs >= totalFuelOptions) return null;
    incrementSmelterAllocation(smelter, type);
  }

  return next;
}

export function removeSmelter(state: GameState, category: 'fuel', type: SmelterFuelId): GameState | null;
export function removeSmelter(state: GameState, category: 'output', type: SmelterOutputId): GameState | null;
export function removeSmelter(
  state: GameState,
  category: 'fuel' | 'output',
  type: SmelterFuelId | SmelterOutputId,
): GameState | null {
  const next = cloneState(state);
  const smelter = next.city.smelter;
  if (!smelter) return null;

  if ((smelter[type] ?? 0) > 0) {
    decrementSmelterAllocation(smelter, type);

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


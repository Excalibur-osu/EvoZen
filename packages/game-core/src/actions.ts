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
import { applyMaterialSubstitution } from './material-substitution';
import {
  SPACE_STRUCTURES,
  canBuildSpaceStructure,
  getSpaceBuildCost,
} from './space';
import {
  INTERSTELLAR_STRUCTURES,
  canBuildInterstellarStructure,
  getInterstellarBuildCost,
} from './interstellar';
import { markChallengeTask } from './achievement-triggers';

const CRAFT_LINE_IDS = ['Plywood', 'Brick', 'Wrought_Iron', 'Sheet_Metal', 'Mythril'] as const;
export type FactoryLineId = 'Lux' | 'Furs' | 'Alloy' | 'Polymer' | 'Nano' | 'Stanene';
export type MiningDroidTargetId = 'adam' | 'uran' | 'coal' | 'alum';

function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function ensureSpaceStructure(state: GameState, id: string): void {
  if (!state.space[id]) {
    state.space[id] = { count: 0 };
  }
}

function ensureInterstellarStructure(state: GameState, id: string): void {
  if (!state.interstellar[id]) {
    state.interstellar[id] = { count: 0 };
  }
}

/**
 * 计算 trait 对建筑成本的乘数
 * - wasteful (humanoid genus)：所有合成材料 +10%
 * - heavy (rhinotaur)：所有建筑 +10%
 * - large (giant genus)：所有建筑递增 +0.5%
 * - small (small genus)：所有建筑递增 -1%
 * - bloated (shoggoth)：所有建筑 +15%
 * - deconstructor (nano)：所有建筑 +100%
 * - hooved (centaur)：所有 +10%（footwear）
 */
function getRaceCostMul(state: GameState, resId: string): number {
  let mul = 1;
  const r = state.race as Record<string, unknown>;
  if (r['wasteful'] && ['Plywood', 'Brick', 'Wrought_Iron', 'Sheet_Metal'].includes(resId)) {
    const rank = (r['wasteful'] as number) || 1;
    const v = rank === 0.1 ? 16 : rank === 0.25 ? 14 : rank === 0.5 ? 12 : rank === 1 ? 10 : rank === 2 ? 6 : rank === 3 ? 4 : 2;
    mul *= 1 + v / 100;
  }
  if (r['heavy']) mul *= 1.1;
  if (r['bloated']) {
    const rank = (r['bloated'] as number) || 1;
    const v = rank === 0.1 ? 30 : rank === 0.25 ? 25 : rank === 0.5 ? 20 : rank === 1 ? 15 : rank === 2 ? 10 : rank === 3 ? 6 : 4;
    mul *= 1 + v / 100;
  }
  if (r['deconstructor']) {
    const rank = (r['deconstructor'] as number) || 1;
    const v = rank === 0.1 ? 25 : rank === 0.25 ? 40 : rank === 0.5 ? 60 : rank === 1 ? 100 : rank === 2 ? 125 : rank === 3 ? 140 : 150;
    mul *= 1 + v / 100;
  }
  if (r['hooved']) {
    const rank = (r['hooved'] as number) || 1;
    const v = rank === 0.1 ? 140 : rank === 0.25 ? 130 : rank === 0.5 ? 120 : rank === 1 ? 100 : rank === 2 ? 80 : rank === 3 ? 70 : 60;
    mul *= v / 100;
  }
  return mul;
}

/** Tunneler 矿场成本折扣（在 mining 建筑成本计算时调用）*/
export function getTunnelerCostDiscount(state: GameState, structureId: string): number {
  if (!state.race['tunneler']) return 1;
  if (!['mine', 'coal_mine'].includes(structureId)) return 1;
  const rank = (state.race['tunneler'] as number) || 1;
  const v = rank === 0.1 ? 0.001 : rank === 0.25 ? 0.002 : rank === 0.5 ? 0.005 : rank === 1 ? 0.01 : rank === 2 ? 0.015 : rank === 3 ? 0.018 : 0.02;
  // 每件矿场成本 -X%（最高 -2%）
  return 1 - v;
}

export function getBuildCost(state: GameState, structureId: string): Record<string, number> {
  const def = BASIC_STRUCTURES.find((structure) => structure.id === structureId);
  if (!def) return {};

  const count = (state.city[structureId] as { count?: number } | undefined)?.count ?? 0;
  let costs: Record<string, number> = {};
  for (const [resId, costFn] of Object.entries(def.costs)) {
    const baseCost = costFn(state, count);
    costs[resId] = Math.ceil(baseCost * getRaceCostMul(state, resId));
  }
  // 材料替换：kindling_kindred / iron_wood / smoldering 等
  costs = applyMaterialSubstitution(state, costs);
  // tunneler 矿场折扣
  const tunnelerDiscount = getTunnelerCostDiscount(state, structureId);
  if (tunnelerDiscount !== 1) {
    for (const k of Object.keys(costs)) {
      costs[k] = Math.ceil(costs[k] * tunnelerDiscount);
    }
  }
  return costs;
}

export function canBuildStructure(state: GameState, structureId: string): boolean {
  const def = BASIC_STRUCTURES.find((structure) => structure.id === structureId);
  if (!def) return false;

  for (const [techId, lvl] of Object.entries(def.reqs)) {
    if ((state.tech[techId] ?? 0) < lvl) return false;
  }
  if (def.condition && !def.condition(state)) return false;

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

export function manualGather(state: GameState, resourceId: string): GameState | null {
  const resource = state.resource[resourceId];
  if (!resource) return null;
  if (resource.max > 0 && resource.amount >= resource.max) return null;

  const next = cloneState(state);
  const target = next.resource[resourceId];
  if (!target) return null;

  const nextAmount = target.amount + 1;
  target.amount = target.max > 0 ? Math.min(nextAmount, target.max) : nextAmount;
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
  if (structureId === 'world_collider') {
    const collider = next.space['world_collider'] as { count: number } | undefined;
    if (collider && collider.count >= 1859) {
      next.tech['science'] = Math.max(next.tech['science'] ?? 0, 11);
      if (!next.space['world_controller']) {
        next.space['world_controller'] = { count: 0, on: 0 };
      }
      const controller = next.space['world_controller'] as { count: number; on?: number };
      if (controller.count < 1) {
        controller.count = 1;
        controller.on = Math.max(controller.on ?? 0, 1);
      }
      if (next.race['banana']) {
        markChallengeTask(next, 'banana', 'b2');
      }
    }
  }

  applyDerivedStateInPlace(next);
  return next;
}

export function buildInterstellarStructure(state: GameState, structureId: string): GameState | null {
  if (!canBuildInterstellarStructure(state, structureId)) return null;

  const def = INTERSTELLAR_STRUCTURES.find((structure) => structure.id === structureId);
  if (!def) return null;

  const next = cloneState(state);
  const costs = getInterstellarBuildCost(next, structureId);
  for (const [resId, cost] of Object.entries(costs)) {
    if (cost <= 0) continue;
    if (!next.resource[resId]) return null;
    next.resource[resId].amount -= cost;
  }

  ensureInterstellarStructure(next, structureId);
  const building = next.interstellar[structureId] as {
    count: number;
    on?: number;
    support?: number;
    s_max?: number;
    adam?: number;
    uran?: number;
    coal?: number;
    alum?: number;
  };
  building.count++;

  const needsOnTracking =
    (def.powerCost ?? 0) > 0 ||
    def.support !== undefined ||
    def.supportFuel !== undefined;
  if (needsOnTracking) {
    building.on = (building.on ?? 0) + 1;
    if (structureId === 'starport' && def.support && def.support.amount > 0) {
      building.support = building.support ?? 0;
      building.s_max = building.s_max ?? 0;
    }
  } else if (building.on !== undefined) {
    building.on++;
  }

  if (structureId === 'starport') {
    next.tech['alpha'] = Math.max(next.tech['alpha'] ?? 0, 2);
    ensureInterstellarStructure(next, 'mining_droid');
  }
  if (structureId === 'mining_droid') {
    building.adam = (building.adam ?? 0) + 1;
    building.uran = building.uran ?? 0;
    building.coal = building.coal ?? 0;
    building.alum = building.alum ?? 0;
    next.tech['droids'] = Math.max(next.tech['droids'] ?? 0, 1);
  }

  applyDerivedStateInPlace(next);
  return next;
}

export function assignFactoryLine(state: GameState, lineId: FactoryLineId): GameState | null {
  const next = cloneState(state);
  const factory = next.city['factory'] as Record<FactoryLineId | 'count' | 'on', number> | undefined;
  if (!factory) return null;

  const totalAssigned =
    (factory.Lux ?? 0)
    + (factory.Furs ?? 0)
    + (factory.Alloy ?? 0)
    + (factory.Polymer ?? 0)
    + (factory.Nano ?? 0)
    + (factory.Stanene ?? 0);
  const redFactoryLines = (next.space['red_factory'] as { count?: number } | undefined)?.count ?? 0;
  const maxLines = (factory.count ?? 0) + redFactoryLines;
  if (totalAssigned >= maxLines) return null;

  factory[lineId] = (factory[lineId] ?? 0) + 1;
  return next;
}

export function removeFactoryLine(state: GameState, lineId: FactoryLineId): GameState | null {
  const next = cloneState(state);
  const factory = next.city['factory'] as Record<FactoryLineId | 'count' | 'on', number> | undefined;
  if (!factory) return null;
  if ((factory[lineId] ?? 0) <= 0) return null;

  factory[lineId] = (factory[lineId] ?? 0) - 1;
  return next;
}

export function assignMiningDroid(state: GameState, targetId: MiningDroidTargetId): GameState | null {
  const next = cloneState(state);
  const droid = next.interstellar['mining_droid'] as Record<MiningDroidTargetId | 'count' | 'on', number> | undefined;
  if (!droid) return null;

  const totalAssigned =
    (droid.adam ?? 0) + (droid.uran ?? 0) + (droid.coal ?? 0) + (droid.alum ?? 0);
  const maxDroids = droid.on ?? droid.count ?? 0;
  if (totalAssigned >= maxDroids) return null;

  droid[targetId] = (droid[targetId] ?? 0) + 1;
  return next;
}

export function removeMiningDroid(state: GameState, targetId: MiningDroidTargetId): GameState | null {
  const next = cloneState(state);
  const droid = next.interstellar['mining_droid'] as Record<MiningDroidTargetId | 'count' | 'on', number> | undefined;
  if (!droid) return null;
  if ((droid[targetId] ?? 0) <= 0) return null;

  droid[targetId] = (droid[targetId] ?? 0) - 1;
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
    case 'fanaticism':
      // legacy tech.js L8392: choosing this branch also seeds the fanaticism tech line.
      next.tech['fanaticism'] = Math.max(next.tech['fanaticism'] ?? 0, 1);
      break;
    case 'alt_fanaticism':
      // legacy tech.js L8420: alt branch grants fanaticism directly and advances theology when needed.
      if ((next.tech['theology'] ?? 0) === 2) {
        next.tech['theology'] = 3;
      }
      break;
    case 'anthropology':
      // legacy tech.js L8686: choosing this branch also seeds the anthropology tech line.
      next.tech['anthropology'] = Math.max(next.tech['anthropology'] ?? 0, 1);
      break;
    case 'alt_anthropology':
      // legacy tech.js L8711: alt branch grants anthropology directly and advances theology when needed.
      if ((next.tech['theology'] ?? 0) === 2) {
        next.tech['theology'] = 3;
      }
      break;
    case 'deify':
      // legacy tech.js L8547: deify seeds the ancient_deify branch.
      next.tech['ancient_deify'] = Math.max(next.tech['ancient_deify'] ?? 0, 1);
      break;
    case 'isolation_protocol':
      // legacy tech.js L13764: selecting isolation writes the branch key used by Tau Ceti follow-up techs.
      next.tech['isolation'] = Math.max(next.tech['isolation'] ?? 0, 1);
      break;
    case 'focus_cure':
      // legacy tech.js L13787: focus cure advances disease and seeds the cure research branch.
      next.tech['focus_cure'] = Math.max(next.tech['focus_cure'] ?? 0, 1);
      break;
    case 'matter_replicator':
      // legacy tech.js L4872: standard replicator starts by copying Stone.
      next.race['replicator'] = { res: 'Stone', pow: 1 };
      break;
    case 'replicator_tp':
      // legacy tech.js L14349: lone-survivor truepath replicator starts on Unobtainium.
      next.race['replicator'] = { res: 'Unobtainium', pow: 1 };
      break;
    case 'terraforming':
    case 'terraforming_tp':
      ensureSpaceStructure(next, 'terraformer');
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
    case 'world_collider':
      ensureSpaceStructure(next, 'world_collider');
      if (!next.space['world_controller']) {
        next.space['world_controller'] = { count: 0, on: 0 };
      }
      break;
    case 'warp_drive':
      ensureInterstellarStructure(next, 'starport');
      break;
    case 'habitat':
      ensureInterstellarStructure(next, 'habitat');
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


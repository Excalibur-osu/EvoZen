/**
 * 游戏主循环 / Tick 逻辑
 * 完整资源产出、消耗、建筑加成
 *
 * 严格对标 legacy/src/main.js 原版公式。
 * 所有产出/消耗值在最终应用前统一乘以 time_multiplier = 0.25
 * （原版 main.js L1213）。
 */

import type {
  GameState,
  GameTickResult,
  GameMessage,
  ResourceBreakdownEntry,
  ResourceBreakdownState,
} from '@evozen/shared-types';
import { craftingTickDetailed } from './crafting';
import { factoryTickDetailed } from './factory';
import { tradeTick } from './trade';
import {
  getTaxMultiplier,
  getKnowledgeMultiplier,
  getBankerImpactMultiplier,
  getCasinoIncomeMultiplier,
  getTourismIncomeMultiplier,
  tickGovernmentCooldown,
} from './government';
import { BASIC_STRUCTURES } from './structures';
import { RESOURCE_VALUES } from './resources';
import {
  getProfessorTraitBonus,
  getTaxIncomeTraitMultiplier,
  getHungerMultiplier,
  getWeakWorkerMultiplier,
  getToughMiningMultiplier,
  getIntelligentGlobalBonus,
  getSuctionGripBonus,
  getCalmGlobalBonus,
  getLogicalKnowledgePerCitizen,
  getTrackerHuntBonus,
  getHivemindMultiplier,
  getIronAllergyPenalty,
  getPyrophobiaSmelterPenalty,
  getPompousProfessorPenalty,
  getTruthfulBankerPenalty,
  getSpiritualTempleBonus,
  getGluttonyFoodMultiplier,
  getRavenousFoodMultiplier,
  getHighMetabolismFoodMultiplier,
  getSlaverBonus,
} from './traits';
import { cancelRituals, getRitualMultiplier } from './magic';
import { calculateMorale, randomizeWeather } from './morale';
import { powerTick } from './power';
import { tickTraining, tickHealing, armyRating, garrisonSize } from './military';
import { tickEvents } from './events';
import { resolveSpyActionTick } from './espionage';
import { applyDerivedStateInPlace } from './derived-state';
import {
  hasPlanetTrait,
  getGlobalPlanetMultiplier,
  getMinerPlanetMultiplier,
  getFarmPlanetMultiplier,
  magneticVars,
  permafrostVars,
  rageVars,
} from './planet-traits';
import { evolutionTick } from './evolution';
import { arpaTick } from './arpa';
import { geneSequenceTick } from './genetics';
import {
  addInflationPoints,
  advanceEmfieldChallenge,
  applyInflationToCosts,
  getDecayChallengeDeltas,
  getDischargePoweredBonus,
} from './challenges';
import { fortressTick, portalProductionTick } from './portal';
import { mechBuildTick, mechStationPatrolTick } from './mech';
import { syndicateTick, siegeTick } from './syndicate';
import { maybeGenerateServants, womlingTick } from './womling';
import { checkAchievements } from './achievement-triggers';
import {
  advanceBanquetStrength,
  getAchievementLevel,
  getBanquetBirthMultiplier,
  getBanquetFoodConsumptionMultiplier,
  getBanquetHuntingMultiplier,
  getBanquetLevel,
  resetBanquetStrength,
} from './achievements';
import { complexTraitTick, getSelenophobiaMultiplier } from './complex-traits';
import { petTick } from './pet';
import { magicTick } from './magic';
import { edenicTick, edenicProductionTick } from './edenic';
import { syncSeasonalEventState } from './seasonal-events';
import { truepathProductionTick } from './truepath';
import { govActive, runGovernorTasks } from './governor';
import {
  getSatelliteScientistImpactMultiplier,
  getObservatoryKnowledgeCapBonus,
  SPACE_BARRACKS_FOOD_PER_TICK,
  SPACE_BARRACKS_OIL_PER_TICK,
  SPACE_STRUCTURES,
} from './space';
import { resolveInterstellarSupport } from './interstellar';
import { resolveSpaceSupport } from './space-support';
import {
  getCasinoIncomePerActive,
  getTourismFoodDemand,
  getTourismIncome,
} from './commerce';

/**
 * 原版全局时间缩放因子
 * legacy/src/main.js L1213: var time_multiplier = 0.25;
 * 所有 modRes() 调用都乘以此值。
 */
const TIME_MULTIPLIER = 0.25;
const MOON_STRUCTURE_IDS = new Set(
  SPACE_STRUCTURES.filter((structure) => structure.region === 'spc_moon').map((structure) => structure.id),
);
const ORBIT_DECAY_HIDDEN_JOBS = new Set(['forager', 'farmer', 'lumberjack', 'quarry_worker']);
const ORBIT_DECAY_SHIPS = [
  'bolognium_ship',
  'scout_ship',
  'corvette_ship',
  'frigate_ship',
  'cruiser_ship',
  'dreadnought',
  'freighter',
  'super_freighter',
  'armed_miner',
  'scavenger',
];

function clearStructureState(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  const structure = value as { count?: number; on?: number };
  if (typeof structure.count === 'number') {
    structure.count = 0;
  }
  if (typeof structure.on === 'number') {
    structure.on = 0;
  }
}

function applyOrbitDecayedSideEffects(state: GameState): void {
  if (state.race.universe === 'magic') {
    if (state.city['pylon']) {
      const cityPylon = state.city['pylon'] as { count?: number };
      state.space['pylon'] = {
        ...(state.space['pylon'] ?? { count: 0 }),
        count: Math.ceil((cityPylon.count ?? 0) / 2),
      };
    }
    cancelRituals(state);
  }

  for (const [id, value] of Object.entries(state.city)) {
    if (id === 'calendar' || id === 'market' || id === 'trade_routes' || id === 'morale' || id === 'power') continue;
    clearStructureState(value);
  }

  const zen = state.resource['Zen'];
  if (zen?.display) {
    zen.display = false;
  }
  const slave = state.resource['Slave'];
  if (slave?.display) {
    slave.display = false;
    slave.amount = 0;
  }

  if (state.race['deconstructor'] && state.city['nanite_factory']) {
    const naniteFactory = state.city['nanite_factory'] as Record<string, unknown>;
    for (const [key, value] of Object.entries(naniteFactory)) {
      if (key === 'count' || key === 'on') continue;
      if (typeof value === 'number') {
        naniteFactory[key] = 0;
      }
    }
  }

  state.space['red_university'] = state.space['red_university'] ?? { count: 0 };
  for (const id of MOON_STRUCTURE_IDS) {
    clearStructureState(state.space[id]);
  }

  for (const value of Object.values(state.resource)) {
    if (typeof value.trade === 'number') {
      value.trade = 0;
    }
  }

  for (const [jobId, value] of Object.entries(state.civic)) {
    if (!value || typeof value !== 'object') continue;
    const job = value as { workers?: number; assigned?: number; display?: boolean };
    if (jobId !== 'colonist') {
      if (typeof job.workers === 'number') job.workers = 0;
      if (typeof job.assigned === 'number') job.assigned = 0;
    }
    if (ORBIT_DECAY_HIDDEN_JOBS.has(jobId)) {
      job.display = false;
    }
  }
  state.civic.d_job = (state.civic['hunter'] as { display?: boolean } | undefined)?.display ? 'hunter' : 'unemployed';

  const galaxy = state['galaxy'] as Record<string, { on?: number }> | undefined;
  if (galaxy) {
    for (const ship of ORBIT_DECAY_SHIPS) {
      if (galaxy[ship] && typeof galaxy[ship].on === 'number') {
        galaxy[ship].on = 0;
      }
    }
  }
  if (state.portal['transport'] && typeof state.portal['transport'].on === 'number') {
    state.portal['transport'].on = 0;
  }
}

function getFarmBiomeMultiplier(state: GameState): number {
  switch (state.city.biome) {
    case 'grassland':
      return 1.2;
    case 'savanna':
      return 1.1;
    case 'ashland':
      return 0.62;
    case 'volcanic':
      return 0.9;
    case 'hellscape':
      return 0.25;
    default:
      return 1;
  }
}

function getLumberBiomeMultiplier(state: GameState): number {
  switch (state.city.biome) {
    case 'forest':
      return 1.2;
    case 'savanna':
      return 0.8;
    case 'desert':
      return 0.75;
    case 'swamp':
      return 1.1;
    case 'taiga':
      return 1.1;
    default:
      return 1;
  }
}

function getStoneBiomeMultiplier(state: GameState): number {
  switch (state.city.biome) {
    case 'desert':
      return 1.2;
    case 'swamp':
      return 0.88;
    default:
      return 1;
  }
}

function getCopperBiomeMultiplier(state: GameState): number {
  switch (state.city.biome) {
    case 'volcanic':
      return 1.12;
    case 'ashland':
      return 1.1;
    default:
      return 1;
  }
}

function getIronBiomeMultiplier(state: GameState): number {
  switch (state.city.biome) {
    case 'volcanic':
      return 1.08;
    case 'ashland':
      return 1.1;
    default:
      return 1;
  }
}

function getOilBiomeMultiplier(state: GameState): number {
  switch (state.city.biome) {
    case 'desert':
      return 1.1;
    case 'tundra':
      return 0.9;
    case 'taiga':
      return 0.92;
    default:
      return 1;
  }
}

/**
 * 执行单个游戏 tick
 * 纯函数：接收当前状态 → 返回新状态 + 事件
 */
export function gameTick(state: GameState): { state: GameState; result: GameTickResult } {
  const messages: GameMessage[] = [];
  let asteroidEleriumDiscovered = false;
  const deltas: Record<string, number> = {};
  const settledDeltas: Record<string, number> = {};
  const eventDeltas: Record<string, number> = {};
  const deferredSettledDeltas: Record<string, number> = {};
  const initialResourceAmounts = Object.fromEntries(
    Object.entries(state.resource).map(([resId, resource]) => [resId, resource.amount]),
  );
  const breakdownEntries: Record<string, ResourceBreakdownEntry[]> = {};
  const lastBreakdownSnapshot: Record<string, number> = {};
  const addBreakdownEntry = (
    resId: string,
    label: string,
    amount: number,
    kind: ResourceBreakdownEntry['kind'],
    section?: string,
    detail?: string,
  ) => {
    if (!Number.isFinite(amount) || Math.abs(amount) < 1e-9) return;
    (breakdownEntries[resId] ??= []).push({ label, amount, kind, section, detail });
  };
  const applyBreakdownFactors = (
    resId: string,
    section: string,
    baseAmount: number,
    factors: Array<{ label: string; multiplier: number; detail?: string }>,
  ): number => {
    let amount = baseAmount;
    for (const factor of factors) {
      if (!Number.isFinite(factor.multiplier)) continue;
      const next = amount * factor.multiplier;
      addBreakdownEntry(
        resId,
        factor.label,
        next - amount,
        'modifier',
        section,
        factor.detail ?? `x${Number(factor.multiplier.toFixed(4))}`,
      );
      amount = next;
    }
    return amount;
  };
  const captureDeltaSection = (
    label: string,
    kindForAmount: (amount: number) => ResourceBreakdownEntry['kind'] = (amount) => amount >= 0 ? 'source' : 'consume',
    detail?: string,
  ) => {
    const ids = new Set([...Object.keys(deltas), ...Object.keys(lastBreakdownSnapshot)]);
    for (const resId of ids) {
      const current = deltas[resId] ?? 0;
      const previous = lastBreakdownSnapshot[resId] ?? 0;
      const amount = current - previous;
      if (Math.abs(amount) >= 1e-9) {
        addBreakdownEntry(resId, label, amount, kindForAmount(amount), label, detail);
      }
      lastBreakdownSnapshot[resId] = current;
    }
  };
  const snapshotResourceAmounts = (resourceState: GameState['resource']): Record<string, number> =>
    Object.fromEntries(Object.entries(resourceState).map(([resId, resource]) => [resId, resource.amount]));
  const captureDeferredSettledResourceMutations = (
    before: Record<string, number>,
    resourceState: GameState['resource'],
    labelForResource: (resId: string, amount: number) => string,
    section: string,
  ) => {
    const ids = new Set([...Object.keys(before), ...Object.keys(resourceState)]);
    for (const resId of ids) {
      const amount = (resourceState[resId]?.amount ?? 0) - (before[resId] ?? 0);
      if (!Number.isFinite(amount) || Math.abs(amount) < 1e-9) continue;
      deferredSettledDeltas[resId] = (deferredSettledDeltas[resId] ?? 0) + amount;
      addBreakdownEntry(
        resId,
        labelForResource(resId, amount),
        amount,
        amount >= 0 ? 'source' : 'consume',
        section,
      );
    }
  };
  const flushDeferredSettledDeltas = () => {
    for (const [resId, amount] of Object.entries(deferredSettledDeltas)) {
      deltas[resId] = (deltas[resId] ?? 0) + amount;
      settledDeltas[resId] = (settledDeltas[resId] ?? 0) + amount;
      lastBreakdownSnapshot[resId] = deltas[resId];
    }
  };
  const markCurrentDeltasSettled = () => {
    for (const [resId, delta] of Object.entries(deltas)) {
      settledDeltas[resId] = delta;
    }
  };
  const settlePendingDeltas = (resourceState: GameState['resource']) => {
    for (const [resId, finalDelta] of Object.entries(deltas)) {
      const pending = finalDelta - (settledDeltas[resId] ?? 0);
      if (Math.abs(pending) < 1e-9) continue;
      const res = resourceState[resId];
      if (!res) continue;
      res.amount += pending;
      if (res.max > 0 && res.amount > res.max) res.amount = res.max;
      if (res.amount < 0) res.amount = 0;
      settledDeltas[resId] = finalDelta;
    }
  };
  const buildBreakdowns = (resourceState: GameState['resource']): Record<string, ResourceBreakdownState> => {
    const result: Record<string, ResourceBreakdownState> = {};
    const ids = new Set([...Object.keys(resourceState), ...Object.keys(deltas), ...Object.keys(breakdownEntries)]);
    for (const resId of ids) {
      const entries = breakdownEntries[resId] ?? [];
      const net = deltas[resId] ?? 0;
      const res = resourceState[resId];
      let effectiveNet = net;
      let truncated = 0;
      const hasLedgerActivity = entries.length > 0
        || Object.prototype.hasOwnProperty.call(deltas, resId);
      if (res && hasLedgerActivity) {
        effectiveNet = res.amount - (initialResourceAmounts[resId] ?? 0);
        truncated = net - effectiveNet;
        if (Math.abs(effectiveNet) < 1e-9) effectiveNet = 0;
        if (Math.abs(truncated) < 1e-9) truncated = 0;
      }
      result[resId] = {
        entries,
        grossSource: entries.filter((entry) => entry.amount > 0).reduce((sum, entry) => sum + entry.amount, 0),
        grossConsume: entries.filter((entry) => entry.amount < 0).reduce((sum, entry) => sum + entry.amount, 0),
        net,
        effectiveNet,
        truncated,
      };
    }
    return result;
  };

  // 进化阶段：执行 evo tick（RNA/DNA 自动产出 + 解锁触发）
  if (state.race.species === 'protoplasm') {
    const newEvoState: GameState = JSON.parse(JSON.stringify(state));
    const initialRNA = state.resource['RNA']?.amount ?? 0;
    const initialDNA = state.resource['DNA']?.amount ?? 0;

    evolutionTick(newEvoState, TIME_MULTIPLIER);

    const finalRNA = newEvoState.resource['RNA']?.amount ?? 0;
    const finalDNA = newEvoState.resource['DNA']?.amount ?? 0;

    if (newEvoState.resource['RNA']) {
      deltas['RNA'] = finalRNA - initialRNA;
      newEvoState.resource['RNA'].diff = finalRNA - initialRNA;
      addBreakdownEntry('RNA', '进化自动生成', deltas['RNA'], 'source', '进化');
    }
    if (newEvoState.resource['DNA']) {
      deltas['DNA'] = finalDNA - initialDNA;
      newEvoState.resource['DNA'].diff = finalDNA - initialDNA;
      addBreakdownEntry('DNA', '进化自动生成', deltas['DNA'], 'source', '进化');
    }
    const resourceBreakdowns = buildBreakdowns(newEvoState.resource);
    for (const [resId, breakdown] of Object.entries(resourceBreakdowns)) {
      if (newEvoState.resource[resId]) newEvoState.resource[resId].breakdown = breakdown;
    }

    return {
      state: newEvoState,
      result: { resourceDeltas: deltas, resourceBreakdowns, messages },
    };
  }

  // ============================================================
  // 辅助读取
  // ============================================================
  const pop = getPopulation(state);
  const structCount = (id: string) =>
    (state.city[id] as { count: number } | undefined)?.count ?? 0;
  const workers = (id: string) =>
    (state.civic[id] as { workers: number } | undefined)?.workers ?? 0;
  const techLevel = (id: string) => state.tech[id] ?? 0;
  const explosiveLevel = techLevel('explosives');
  const emfieldTick = advanceEmfieldChallenge(state);
  const dischargeActive = emfieldTick?.active ?? false;

  // ============================================================
  // 0a. 电力网格
  // ============================================================
  // 在资源产出计算前执行电力分配，确定用电建筑实际开启数
  const powerResult = powerTick(state);
  // 合入燃料消耗 delta
  for (const [resId, delta] of Object.entries(powerResult.fuelDeltas)) {
    deltas[resId] = (deltas[resId] ?? 0) + delta;
  }
  captureDeltaSection('电力燃料', (amount) => amount >= 0 ? 'source' : 'consume');
  // 用电建筑实际开启数（含 city + space）
  const poweredOn = powerResult.activeConsumers;

  // ============================================================
  // 0b. 铀灰副产品（Uranium Ash from Coal Power）
  // ============================================================
  // 对标 legacy/src/main.js L1916-1930:
  // 触发条件：uranium >= 3 且有激活的燃煤发电站
  // ash = p_on['coal_power'] * 0.35 / 65 * (geology['Uranium']+1)
  // modRes('Uranium', ash * time_multiplier)
  if ((state.tech['uranium'] ?? 0) >= 3) {
    const coalPowerOn = powerResult.activeGenerators['coal_power'] ?? 0;
    if (coalPowerOn > 0) {
      const coalPerUnit = 0.35; // legacy coal_power.p_fuel().a
      let ash = coalPowerOn * coalPerUnit / 65;
      const geoUranium = (state.city.geology as Record<string, number> | undefined)?.['Uranium'] ?? 0;
      if (geoUranium > 0) {
        ash *= geoUranium + 1;
      }
      deltas['Uranium'] = (deltas['Uranium'] ?? 0) + ash;
    }
  }
  captureDeltaSection('电力副产物');

  // 太空支援池解算（当前仅 moon 池）。
  // 对标 legacy/src/main.js L2256-2381 的 "Moon Bases, Spaceports, Etc" 块：
  // 在电力分配之后，燃料预扣 + 支援分配 → 得到 support_on 与燃料 delta。
  const spaceSupport = resolveSpaceSupport(state, poweredOn);
  // fuelDrain 是 pre-TIME_MULTIPLIER 的"每 tick 总量"，与 power 的 fuelDeltas 语义一致；
  // tick.ts 在后面对所有 deltas 统一乘 TIME_MULTIPLIER。
  for (const [resId, drain] of Object.entries(spaceSupport.fuelDrain)) {
    deltas[resId] = (deltas[resId] ?? 0) - drain;
  }
  const interstellarSupport = resolveInterstellarSupport(state, poweredOn);
  for (const [resId, drain] of Object.entries(interstellarSupport.fuelDrain)) {
    deltas[resId] = (deltas[resId] ?? 0) - drain;
  }
  captureDeltaSection('支援燃料', (amount) => amount >= 0 ? 'source' : 'consume');
  const habitatPowered = interstellarSupport.supplierEffectiveOn['habitat'] ?? 0;
  const miningDroidSupported = interstellarSupport.supportOn['mining_droid'] ?? 0;
  const miningDroid = state.interstellar['mining_droid'] as
    | { count?: number; on?: number; adam?: number; uran?: number; coal?: number; alum?: number }
    | undefined;
  if (miningDroidSupported > 0 && miningDroid) {
    const requestedMiningDroids = miningDroid.on ?? miningDroid.count ?? 0;
    const supportEff = requestedMiningDroids > 0 ? miningDroidSupported / requestedMiningDroids : 0;
    
    let remaining = requestedMiningDroids;
    const alloc = { adam: 0, uran: 0, coal: 0, alum: 0 };
    for (const res of ['adam', 'uran', 'coal', 'alum'] as const) {
      alloc[res] = miningDroid[res] ?? 0;
      remaining -= alloc[res];
      if (remaining < 0) {
        alloc[res] += remaining;
        miningDroid[res] = alloc[res];
        remaining = 0;
      }
    }

    let processingBonus = 0;
    const processingSupported = interstellarSupport.supportOn['processing'] ?? 0;
    if (processingSupported > 0) {
      processingBonus = getDischargePoweredBonus(
        processingSupported,
        0.12,
        dischargeActive,
      );
    }

    if (alloc.adam > 0) {
      const adamantiteDroids = alloc.adam * supportEff;
      deltas['Adamantite'] = (deltas['Adamantite'] ?? 0) + adamantiteDroids * 0.075 * (1 + processingBonus);
    }
    if (alloc.uran > 0) {
      const uraniumDroids = alloc.uran * supportEff;
      deltas['Uranium'] = (deltas['Uranium'] ?? 0) + uraniumDroids * 0.12;
    }
    if (alloc.coal > 0) {
      const coalDroids = alloc.coal * supportEff;
      deltas['Coal'] = (deltas['Coal'] ?? 0) + coalDroids * 3.75;
    }
    if (alloc.alum > 0) {
      const alumDroids = alloc.alum * supportEff;
      deltas['Aluminium'] = (deltas['Aluminium'] ?? 0) + alumDroids * 2.75;
    }
  }
  captureDeltaSection('星际采矿机器人');

  // 月球采矿产出（对标 legacy prod.js L62-92 + main.js L6796-6884）：
  // - iridium_mine: 每座获得支援的建筑产出 0.035 Iridium/tick
  // - helium_mine: 每座获得支援的建筑产出 0.18 Helium_3/tick
  // EvoZen 当前不施加 geology / govRelationFactor / hunger 修饰；后续 sprint 再补。
  const iridiumSupported = spaceSupport.supportOn['iridium_mine'] ?? 0;
  if (iridiumSupported > 0) {
    deltas['Iridium'] = (deltas['Iridium'] ?? 0) + iridiumSupported * 0.035;
  }
  const heliumSupported = spaceSupport.supportOn['helium_mine'] ?? 0;
  if (heliumSupported > 0) {
    deltas['Helium_3'] = (deltas['Helium_3'] ?? 0) + heliumSupported * 0.18;
  }
  captureDeltaSection('月球支援采矿');
  const observatorySupported = spaceSupport.supportOn['observatory'] ?? 0;
  const livingQuartersSupported = spaceSupport.supportOn['living_quarters'] ?? 0;
  const vrCenterSupported = spaceSupport.supportOn['vr_center'] ?? 0;
  const fabricationSupported = spaceSupport.supportOn['fabrication'] ?? 0;
  const biodomeSupported = spaceSupport.supportOn['biodome'] ?? 0;
  const exoticLabSupported = spaceSupport.supportOn['exotic_lab'] ?? 0;
  const colonistWorkers = workers('colonist');
  const effectiveColonistWorkers = Math.min(colonistWorkers, livingQuartersSupported);
  const redFactoryPowered = powerResult.activeConsumers['red_factory'] ?? 0;
  const redFactoryMaxLines =
    (state.space['red_factory'] as { on?: number; count?: number } | undefined)?.on
    ?? (state.space['red_factory'] as { count?: number } | undefined)?.count
    ?? 0;

  // 火星地表产出（对标 legacy prod.js L93-122 + main.js L6481-6498）：
  //   red_mine 每座获得支援的建筑按 colonist.workers 缩放：
  //   support_on['red_mine'] * colonist.workers * (0.25 Copper + 0.02 Titanium)
  const redMineSupported = spaceSupport.supportOn['red_mine'] ?? 0;
  if (redMineSupported > 0 && effectiveColonistWorkers > 0) {
    deltas['Copper'] =
      (deltas['Copper'] ?? 0) + redMineSupported * effectiveColonistWorkers * 0.25;
    deltas['Titanium'] =
      (deltas['Titanium'] ?? 0) + redMineSupported * effectiveColonistWorkers * 0.02;
  }
  captureDeltaSection('火星支援采矿');

  // ============================================================
  // 0. 士气 & 全局乘数
  // ============================================================
  // 对标 legacy/src/main.js L1286-3290:
  // morale 决定 global_multiplier，影响所有工人产出
  // 计算所有通电的赌场（包括 city.casino 和 space.spc_casino）
  const cityCasinoOn = poweredOn['casino'] ?? 0;
  const spcCasinoOn = (state.space['spc_casino'] as { on?: number } | undefined)?.on ?? 0;
  const moraleResult = calculateMorale(state, {
    activeCasinos: cityCasinoOn + spcCasinoOn,
    supportedVrCenters: vrCenterSupported,
  });
  const prodMult = moraleResult.globalMultiplier;

  // ============================================================
  // 0b. 饥饿乘数（hunger multiplier）
  // ============================================================
  // 对标 legacy main.js L4022-4025:
  // hunger = fed ? 1 : 0.5
  // if angry && !fed: hunger = 0.25
  // 应用于所有非食物的工人产出（不含税收）。
  const hungerMult = getHungerMultiplier(state);
  // mellow 行星特性：全局产出 ×0.9
  const planetGlobalMult = getGlobalPlanetMultiplier(state);
  let effectiveProdMult = prodMult * hungerMult * planetGlobalMult;
  // 注：occupyUnifyMult 在下方 0c 块计算，最终 effectiveProdMult 将在所有产出计算处乘以 occupyUnifyMult。

  // ============================================================
  // 0c. 占领 / 世界统一 全局乘数
  // ============================================================
  // 对标 legacy main.js L942-972：
  //   - world_control（unification）解锁：global_multiplier *= 1 + (25 / 100)
  //     federation 政体时改为 govEffect.federation()[2]，其余固定 +25%
  //   - 否则：每个被 occ/anx/buy 的外邦政府 += 5%（federation: 5 + govEffect.federation()[0]）
  let occupyUnifyMult = 1;
  if ((state.tech['world_control'] ?? 0) >= 1) {
    // Unification 科技解锁：固定 +25% 全局产出，federation 时用 govEffect
    // 对标 legacy main.js L948-960
    const unifyBonus = state.civic?.govern?.type === 'federation' ? 30 : 25;
    occupyUnifyMult = 1 + (unifyBonus / 100);
  } else {
    // 占领/兼并/购买外邦政府时的产出加成
    // 对标 legacy main.js L963-972
    const foreign = state.civic?.foreign as
      | Record<string, { occ?: boolean; anx?: boolean; buy?: boolean }>
      | undefined;
    if (foreign) {
      let occupy = 0;
      for (let i = 0; i < 3; i++) {
        const gov = foreign[`gov${i}`];
        if (gov && (gov.occ || gov.anx || gov.buy)) {
          // federation: 5 + govEffect.federation()[0]（legacy 约为 8）；其他: 5
          occupy += state.civic?.govern?.type === 'federation' ? 8 : 5;
        }
      }
      if (occupy > 0) {
        occupyUnifyMult = 1 + (occupy / 100);
      }
    }
  }
  // 将占领/统一乘数应用到全局产出乘数
  // 对标 legacy main.js L960 / L971：global_multiplier *= 1 + (bonus/100)
  effectiveProdMult *= occupyUnifyMult;

  // ============================================================
  // 1. 食物
  // ============================================================

  // 猎人产出 — 基础 0.5/人, 军事科技加成
  const hunters = workers('hunter');
  let hunterRate = 0.5;
  if (techLevel('military') >= 1) hunterRate += 0.1;
  const hunterFood = hunters * hunterRate;
  // 猎人副产品：毛皮 — 原版 main.js L4036-4058
  // furs = hunters * weaponTechModifer() / 20
  // weaponTechModifer() = military tech level，初始=1
  const militaryTech = techLevel('military') >= 1 ? techLevel('military') : 1;
  const hunterFurs = hunters * militaryTech / 20;
  // rage 行星特性：狩猎产出 ×1.02
  const rageHuntMult = hasPlanetTrait(state, 'rage') ? rageVars()[1] : 1;
  const biodomeBaseFood = state.race.universe === 'evil' ? 0.1 : 0.25;
  let biodomeFood = biodomeSupported * effectiveColonistWorkers * biodomeBaseFood;
  if (state.race['cataclysm'] || state.race['orbit_decayed']) {
    biodomeFood += biodomeSupported * 2;
  }

  // 农民产出 — 对标 legacy/src/jobs.js L797-822 farmerValue() 及 legacy/src/main.js L3567-3574
  const totalFarmers = workers('farmer');
  const farmsCount = structCount('farm');

  let farmers = totalFarmers;
  let farmhands = 0;
  if (farmers > farmsCount) {
    farmhands = farmers - farmsCount;
    farmers = farmsCount;
  }

  const getFarmerValue = (hasFarm: boolean) => {
    let farming = 0.82; // impact
    if (hasFarm && farmsCount > 0) {
      farming += techLevel('agriculture') >= 2 ? 1.15 : 0.65;
    }
    const hoeLevel = techLevel('hoe');
    if (hoeLevel > 0) {
      farming *= 1 + hoeLevel / 3;
    }
    farming *= getFarmBiomeMultiplier(state);
    if (techLevel('agriculture') >= 7) {
      farming *= 1.1;
    }
    return farming;
  };

  const farmerFoodBase = farmers * getFarmerValue(true) + farmhands * getFarmerValue(false);

  // 磨坊建筑加成（原版 main.js L3587-3591）
  // agriculture >= 5 → 5%/座, 否则 3%/座（非电力化磨坊）
  const mills = structCount('mill');
  const millBonus = techLevel('agriculture') >= 5 ? 0.05 : 0.03;
  const millFoodMult = 1 + mills * millBonus;
  // trashed 行星特性：农业产出 ×0.75
  const farmPlanetMult = getFarmPlanetMultiplier(state);

  // 食物消耗 — 原版 main.js L3711:
  // consume = (pop + soldiers - (unemployed + hunters) * 0.5) * food_consume_mod
  const unemployed = workers('unemployed');
  const soldiers = state.civic.garrison?.workers ?? 0;
  const foodConsumption = pop + soldiers - (unemployed + hunters) * 0.5;
  const touristCenters = (state.city['tourist_center'] as { count?: number; on?: number } | undefined)?.on
    ?? structCount('tourist_center');
  const tourismFoodDemand = getTourismFoodDemand(touristCenters);

  // 天气对农业的影响 — 原版 main.js L3532-3544
  // temp=0(冷)+rain: ×0.7, temp=0(冷)+非rain: ×0.85, sunny: ×1.1
  let weatherFoodMult = 1;
  const cal = state.city.calendar;
  if (cal) {
    if (cal.temp === 0) {
      weatherFoodMult *= cal.weather === 0 ? 0.7 : 0.85;
    }
    if (cal.weather === 2) {
      weatherFoodMult *= 1.1;
    }
  }

  // Trait 影响食物：tracker (+hunt), suction_grip, calm, ritual:farmer/hunting
  // 同时食物消耗会被 gluttony / ravenous / high_metabolism 放大
  const suctionGripMult = getSuctionGripBonus(state);
  const calmGlobalMult = getCalmGlobalBonus(state);
  const slaverMult = getSlaverBonus(state);
  const farmerRitualMult = getRitualMultiplier(state, 'farmer');
  const huntingRitualMult = getRitualMultiplier(state, 'hunting');
  const trackerHuntMult = getTrackerHuntBonus(state);
  const banquetHuntingMult = getBanquetHuntingMultiplier(state);
  const gluttonyFoodMult = getGluttonyFoodMultiplier(state);
  const ravenousFoodMult = getRavenousFoodMultiplier(state);
  const metabolismFoodMult = getHighMetabolismFoodMultiplier(state);
  const foodConsumptionMul = gluttonyFoodMult * ravenousFoodMult * metabolismFoodMult;
  const banquetActive = getBanquetLevel(state) >= 1
    && ((state.city['banquet'] as { on?: number } | undefined)?.on ?? 0) > 0;
  const banquetFoodMultiplier = getBanquetFoodConsumptionMultiplier(state);
  let effectiveFoodConsumption = foodConsumption * foodConsumptionMul;
  if (banquetActive) effectiveFoodConsumption = Math.max(100, effectiveFoodConsumption);

  // 付不起餐馆的额外口粮时，本 tick 不收取额外部分，并在克隆后的状态中清空强度。
  const banquetFoodShortage = banquetFoodMultiplier > 1
    && effectiveFoodConsumption * banquetFoodMultiplier >= (state.resource['Food']?.amount ?? 0);
  if (!banquetFoodShortage) effectiveFoodConsumption *= banquetFoodMultiplier;

  addBreakdownEntry('Food', '猎人基础产出', hunterFood, 'source', '食物生产');
  const hunterFoodOutput = applyBreakdownFactors('Food', '食物生产', hunterFood, [
    { label: '狂暴行星狩猎', multiplier: rageHuntMult },
    { label: '追踪者特质', multiplier: trackerHuntMult },
    { label: '狩猎仪式', multiplier: huntingRitualMult },
    { label: '餐厅狩猎加成', multiplier: banquetHuntingMult },
    { label: '士气效率', multiplier: prodMult },
    { label: '行星全局修正', multiplier: planetGlobalMult },
    { label: '吸盘特质', multiplier: suctionGripMult },
    { label: '平静特质', multiplier: calmGlobalMult },
    { label: '农耕仪式', multiplier: farmerRitualMult },
    { label: '奴役修正', multiplier: slaverMult },
  ]);

  addBreakdownEntry('Food', '农民与农场基础产出', farmerFoodBase, 'source', '食物生产');
  const farmerFoodOutput = applyBreakdownFactors('Food', '食物生产', farmerFoodBase, [
    { label: '磨坊建筑', multiplier: millFoodMult },
    { label: '农业行星特性', multiplier: farmPlanetMult },
    { label: '天气修正', multiplier: weatherFoodMult },
    { label: '士气效率', multiplier: prodMult },
    { label: '行星全局修正', multiplier: planetGlobalMult },
    { label: '吸盘特质', multiplier: suctionGripMult },
    { label: '平静特质', multiplier: calmGlobalMult },
    { label: '农耕仪式', multiplier: farmerRitualMult },
    { label: '奴役修正', multiplier: slaverMult },
  ]);

  addBreakdownEntry('Food', '生物圈产出', biodomeFood, 'source', '食物生产');
  const biodomeFoodOutput = applyBreakdownFactors('Food', '食物生产', biodomeFood, [
    { label: '士气效率', multiplier: prodMult },
  ]);

  addBreakdownEntry('Food', '基础人口口粮', -foodConsumption, 'consume', '食物消耗');
  let accountedFoodConsumption = foodConsumption;
  for (const factor of [
    { label: '贪食特质', multiplier: gluttonyFoodMult },
    { label: '贪婪特质', multiplier: ravenousFoodMult },
    { label: '高代谢特质', multiplier: metabolismFoodMult },
  ]) {
    const next = accountedFoodConsumption * factor.multiplier;
    addBreakdownEntry(
      'Food',
      factor.label,
      -(next - accountedFoodConsumption),
      'modifier',
      '食物消耗',
      `x${Number(factor.multiplier.toFixed(4))}`,
    );
    accountedFoodConsumption = next;
  }
  const banquetMinimumConsumption = banquetActive
    ? Math.max(100, accountedFoodConsumption)
    : accountedFoodConsumption;
  addBreakdownEntry(
    'Food',
    '餐厅最低供餐',
    -(banquetMinimumConsumption - accountedFoodConsumption),
    'modifier',
    '食物消耗',
  );
  addBreakdownEntry(
    'Food',
    banquetFoodShortage ? '餐厅额外口粮停用' : '餐厅额外口粮',
    -(effectiveFoodConsumption - banquetMinimumConsumption),
    'modifier',
    '食物消耗',
    banquetFoodShortage ? '库存不足' : `x${Number(banquetFoodMultiplier.toFixed(4))}`,
  );
  addBreakdownEntry('Food', '旅游中心需求', -tourismFoodDemand, 'consume', '食物消耗');

  deltas['Food'] = hunterFoodOutput + farmerFoodOutput + biodomeFoodOutput
    - effectiveFoodConsumption - tourismFoodDemand;
  lastBreakdownSnapshot['Food'] = deltas['Food'];

  // ============================================================
  // 2. 毛皮（猎人副产品）
  // ============================================================
  deltas['Furs'] = hunterFurs * rageHuntMult;
  captureDeltaSection('猎人副产物');

  // ============================================================
  // 3. 木材 — 伐木工
  // ============================================================
  // 原版 main.js L5540-5559:
  // lumber_base = workers * impact(1.0)
  // axe bonus: (axe > 1 ? (axe-1) * 0.35 : 0) + 1  ← 只有 axe level 2+ 才有
  // lumber_yard: +2%/座
  const lumberjacks = workers('lumberjack');
  const lumberBiomeMult = getLumberBiomeMultiplier(state);
  // 石斧科技加成 — 原版 main.js L5559: axe > 1 才有加成
  const axeLevel = techLevel('axe');
  const axeMult = axeLevel > 1 ? 1 + (axeLevel - 1) * 0.35 : 1;
  // 伐木场加成 +2%/座（原版 main.js L5575-5576）
  const lumberYards = structCount('lumber_yard');
  const sawmills = structCount('sawmill');
  const activeSawmills = poweredOn['sawmill'] ?? 0;
  const sawmillBonus = techLevel('saw') >= 2 ? 0.08 : 0.05;
  // legacy 这里是分段相乘，不是把 lumber_yard 与 sawmill 直接加到同一个线性项里
  const lumberYardMult = 1 + lumberYards * 0.02;
  const sawmillBuildingMult = 1 + sawmills * sawmillBonus;
  const sawmillPowerMult = activeSawmills > 0
    ? 1 + getDischargePoweredBonus(activeSawmills, 0.04, dischargeActive)
    : 1;
  // Trait: weak (-X%), suction_grip (+X%), calm (+X%), hivemind, intelligent, ritual:lumberjack
  const weakWorkerMult = getWeakWorkerMultiplier(state);
  const intelligentGlobalMult = getIntelligentGlobalBonus(state);
  const lumberHivemindMult = getHivemindMultiplier(state, lumberjacks);
  const lumberRitualMult = getRitualMultiplier(state, 'lumberjack');
  addBreakdownEntry('Lumber', '伐木工基础产出', lumberjacks, 'source', '伐木工');
  deltas['Lumber'] = applyBreakdownFactors('Lumber', '伐木工', lumberjacks, [
    { label: '生物群系', multiplier: lumberBiomeMult },
    { label: '斧具科技', multiplier: axeMult },
    { label: '伐木场建筑', multiplier: lumberYardMult },
    { label: '锯木厂建筑', multiplier: sawmillBuildingMult },
    { label: '锯木厂供电', multiplier: sawmillPowerMult },
    { label: '士气效率', multiplier: prodMult },
    { label: '饥饿修正', multiplier: hungerMult },
    { label: '行星全局修正', multiplier: planetGlobalMult },
    { label: '占领/统一政策', multiplier: occupyUnifyMult },
    { label: '虚弱特质', multiplier: weakWorkerMult },
    { label: '吸盘特质', multiplier: suctionGripMult },
    { label: '平静特质', multiplier: calmGlobalMult },
    { label: '聪慧特质', multiplier: intelligentGlobalMult },
    { label: '蜂群特质', multiplier: lumberHivemindMult },
    { label: '伐木仪式', multiplier: lumberRitualMult },
    { label: '奴役修正', multiplier: slaverMult },
  ]);
  lastBreakdownSnapshot['Lumber'] = deltas['Lumber'];

  // ============================================================
  // 4. 石头 — 石工
  // ============================================================
  // 原版 main.js L5663-5677: impact = 1.0（不是 0.8）
  const quarryWorkers = workers('quarry_worker');
  const stoneBiomeMult = getStoneBiomeMultiplier(state);
  // hammer 科技加成 — 原版 jobs.js L119: 每级 hammer +40%
  const hammerLevel = techLevel('hammer');
  const hammerMult = hammerLevel > 0 ? 1 + hammerLevel * 0.4 : 1;
  // 炸药科技加成 — 原版 main.js: explosives >= 2 时采石场/铝精炼基础产量 + (tech * 25%)
  const quarryExplosiveMult = explosiveLevel >= 2 ? 1 + explosiveLevel * 0.25 : 1;
  // 采石场加成 +2%/座（原版 main.js L5744-5745）
  const quarries = structCount('rock_quarry');
  const activeQuarries = poweredOn['rock_quarry'] ?? 0;
  const stoneMult = 1 + quarries * 0.02;
  let quarryPowerMult = 1;
  if (activeQuarries > 0) {
    quarryPowerMult += getDischargePoweredBonus(activeQuarries, 0.04, dischargeActive);
  }
  const stoneHivemindMult = getHivemindMultiplier(state, quarryWorkers);
  const stoneRitualMult = getRitualMultiplier(state, 'miner');
  addBreakdownEntry('Stone', '采石工基础产出', quarryWorkers, 'source', '采石工');
  deltas['Stone'] = applyBreakdownFactors('Stone', '采石工', quarryWorkers, [
    { label: '生物群系', multiplier: stoneBiomeMult },
    { label: '锤具科技', multiplier: hammerMult },
    { label: '炸药科技', multiplier: quarryExplosiveMult },
    { label: '采石场建筑', multiplier: stoneMult },
    { label: '采石场供电', multiplier: quarryPowerMult },
    { label: '士气效率', multiplier: prodMult },
    { label: '饥饿修正', multiplier: hungerMult },
    { label: '行星全局修正', multiplier: planetGlobalMult },
    { label: '占领/统一政策', multiplier: occupyUnifyMult },
    { label: '虚弱特质', multiplier: weakWorkerMult },
    { label: '吸盘特质', multiplier: suctionGripMult },
    { label: '平静特质', multiplier: calmGlobalMult },
    { label: '聪慧特质', multiplier: intelligentGlobalMult },
    { label: '蜂群特质', multiplier: stoneHivemindMult },
    { label: '采矿仪式', multiplier: stoneRitualMult },
    { label: '奴役修正', multiplier: slaverMult },
  ]);
  lastBreakdownSnapshot['Stone'] = deltas['Stone'];

  // ============================================================
  // 4.5 铝 — 采石副产物 (Aluminium)
  // ============================================================
  // 原版 main.js L5834-5904: 采石产生的铝副产品
  const refineries = structCount('metal_refinery');
  if (refineries > 0) {
    const alumRatio = 0.08;
    const aluminiumGeologyMult = 1 + (state.city.geology?.['Aluminium'] ?? 0);
    const refineryBuildingMult = 1 + refineries * 0.06;
    let refineryMult = refineryBuildingMult;
    // 如果研发了 alumina >= 2，通电的精炼厂额外 +6%/座
    if (techLevel('alumina') >= 2) {
      const activeRefineries = poweredOn['metal_refinery'] ?? 0;
      refineryMult += getDischargePoweredBonus(activeRefineries, 0.06, dischargeActive);
    }
    const refineryPowerMult = refineryMult / refineryBuildingMult;
    const aluminiumBase = quarryWorkers * alumRatio;
    addBreakdownEntry('Aluminium', '采石铝副产物基础', aluminiumBase, 'source', '铝副产物');
    const aluminiumDelta = applyBreakdownFactors('Aluminium', '铝副产物', aluminiumBase, [
      { label: '生物群系', multiplier: stoneBiomeMult },
      { label: '锤具科技', multiplier: hammerMult },
      { label: '炸药科技', multiplier: quarryExplosiveMult },
      { label: '铝地质特征', multiplier: aluminiumGeologyMult },
      { label: '采石场建筑', multiplier: stoneMult },
      { label: '采石场供电', multiplier: quarryPowerMult },
      { label: '士气效率', multiplier: prodMult },
      { label: '饥饿修正', multiplier: hungerMult },
      { label: '行星全局修正', multiplier: planetGlobalMult },
      { label: '占领/统一政策', multiplier: occupyUnifyMult },
      { label: '金属精炼厂建筑', multiplier: refineryBuildingMult },
      { label: '金属精炼厂供电', multiplier: refineryPowerMult },
    ]);
    deltas['Aluminium'] = (deltas['Aluminium'] ?? 0) + aluminiumDelta;
  }
  lastBreakdownSnapshot['Aluminium'] = deltas['Aluminium'] ?? 0;

  // ============================================================
  // 5. 铜 / 铁 — 矿工
  // ============================================================
  // 原版 main.js L6117-6119: miner_base = workers * impact(1.0)
  // 铜系数 main.js L6158: copper_mult = 1/7
  // 铁系数 main.js L6225: iron_mult  = 1/4
  const actualMiners = workers('miner');
  const pickaxeLevel = techLevel('pickaxe');
  const minerToolMult = 1 + pickaxeLevel * 0.15;
  const minerExplosiveMult = explosiveLevel >= 2 ? 0.95 + explosiveLevel * 0.15 : 1;
  // 矿井通电加成：+5%/座
  const activeMines = poweredOn['mine'] ?? 0;
  const minePowerMult = 1 + getDischargePoweredBonus(activeMines, 0.05, dischargeActive);
  // dense/permafrost/magnetic 行星特性：影响矿工产出
  const minerPlanetMult = getMinerPlanetMultiplier(state);
  const copperGeologyMult = 1 + (state.city.geology?.['Copper'] ?? 0);
  const ironGeologyMult = 1 + (state.city.geology?.['Iron'] ?? 0);
  const copperBiomeMult = getCopperBiomeMultiplier(state);
  const ironBiomeMult = getIronBiomeMultiplier(state);
  const toughMiningMult = getToughMiningMultiplier(state);
  const minerHivemindMult = getHivemindMultiplier(state, actualMiners);
  const miningRitualMult = getRitualMultiplier(state, 'miner');
  const copperBase = actualMiners * (1 / 7);
  addBreakdownEntry('Copper', '矿工铜基础产出', copperBase, 'source', '矿工');
  const copperMinerDelta = applyBreakdownFactors('Copper', '矿工', copperBase, [
    { label: '镐具科技', multiplier: minerToolMult },
    { label: '炸药科技', multiplier: minerExplosiveMult },
    { label: '矿井供电', multiplier: minePowerMult },
    { label: '铜地质特征', multiplier: copperGeologyMult },
    { label: '生物群系', multiplier: copperBiomeMult },
    { label: '矿业行星特征', multiplier: minerPlanetMult },
    { label: '士气效率', multiplier: prodMult },
    { label: '饥饿修正', multiplier: hungerMult },
    { label: '行星全局修正', multiplier: planetGlobalMult },
    { label: '占领/统一政策', multiplier: occupyUnifyMult },
    { label: '虚弱特质', multiplier: weakWorkerMult },
    { label: '强韧特质', multiplier: toughMiningMult },
    { label: '吸盘特质', multiplier: suctionGripMult },
    { label: '平静特质', multiplier: calmGlobalMult },
    { label: '聪慧特质', multiplier: intelligentGlobalMult },
    { label: '蜂群特质', multiplier: minerHivemindMult },
    { label: '采矿仪式', multiplier: miningRitualMult },
    { label: '奴役修正', multiplier: slaverMult },
  ]);
  deltas['Copper'] = (deltas['Copper'] ?? 0) + copperMinerDelta;
  lastBreakdownSnapshot['Copper'] = deltas['Copper'];

  if (techLevel('mining') >= 3) {
    const ironBase = actualMiners * 0.25;
    addBreakdownEntry('Iron', '矿工铁基础产出', ironBase, 'source', '矿工');
    const ironMinerDelta = applyBreakdownFactors('Iron', '矿工', ironBase, [
      { label: '镐具科技', multiplier: minerToolMult },
      { label: '炸药科技', multiplier: minerExplosiveMult },
      { label: '矿井供电', multiplier: minePowerMult },
      { label: '铁地质特征', multiplier: ironGeologyMult },
      { label: '生物群系', multiplier: ironBiomeMult },
      { label: '矿业行星特征', multiplier: minerPlanetMult },
      { label: '士气效率', multiplier: prodMult },
      { label: '饥饿修正', multiplier: hungerMult },
      { label: '行星全局修正', multiplier: planetGlobalMult },
      { label: '占领/统一政策', multiplier: occupyUnifyMult },
      { label: '虚弱特质', multiplier: weakWorkerMult },
      { label: '强韧特质', multiplier: toughMiningMult },
      { label: '吸盘特质', multiplier: suctionGripMult },
      { label: '平静特质', multiplier: calmGlobalMult },
      { label: '聪慧特质', multiplier: intelligentGlobalMult },
      { label: '蜂群特质', multiplier: minerHivemindMult },
      { label: '采矿仪式', multiplier: miningRitualMult },
      { label: '奴役修正', multiplier: slaverMult },
      { label: '铁过敏特质', multiplier: getIronAllergyPenalty(state) },
    ]);
    deltas['Iron'] = (deltas['Iron'] ?? 0) + ironMinerDelta;
  }
  lastBreakdownSnapshot['Iron'] = deltas['Iron'] ?? 0;

  // ============================================================
  // 6. 煤炭 — 煤矿工人
  // ============================================================
  const actualCoalMiners = workers('coal_miner');
  const coalToolMult = 1 + pickaxeLevel * 0.12;
  const activeCoalMines = poweredOn['coal_mine'] ?? 0;
  const coalPowerMult = 1 + getDischargePoweredBonus(activeCoalMines, 0.05, dischargeActive);
  const coalGeologyMult = 1 + (state.city.geology?.['Coal'] ?? 0);
  const coalHivemindMult = getHivemindMultiplier(state, actualCoalMiners);
  const coalBase = actualCoalMiners * 0.2;
  addBreakdownEntry('Coal', '煤矿工基础产出', coalBase, 'source', '煤矿工');
  const coalMinerDelta = applyBreakdownFactors('Coal', '煤矿工', coalBase, [
    { label: '镐具科技', multiplier: coalToolMult },
    { label: '炸药科技', multiplier: minerExplosiveMult },
    { label: '煤矿供电', multiplier: coalPowerMult },
    { label: '煤地质特征', multiplier: coalGeologyMult },
    { label: '士气效率', multiplier: prodMult },
    { label: '饥饿修正', multiplier: hungerMult },
    { label: '行星全局修正', multiplier: planetGlobalMult },
    { label: '占领/统一政策', multiplier: occupyUnifyMult },
    { label: '虚弱特质', multiplier: weakWorkerMult },
    { label: '强韧特质', multiplier: toughMiningMult },
    { label: '吸盘特质', multiplier: suctionGripMult },
    { label: '平静特质', multiplier: calmGlobalMult },
    { label: '聪慧特质', multiplier: intelligentGlobalMult },
    { label: '蜂群特质', multiplier: coalHivemindMult },
    { label: '采矿仪式', multiplier: miningRitualMult },
    { label: '奴役修正', multiplier: slaverMult },
  ]);
  deltas['Coal'] = (deltas['Coal'] ?? 0) + coalMinerDelta;
  lastBreakdownSnapshot['Coal'] = deltas['Coal'];

  // 铀 — 煤矿副产物
  // 对标 legacy main.js L6595: uranium = coal_delta / 115
  if (techLevel('uranium') >= 1 && coalMinerDelta > 0) {
    let uraniumDelta = coalMinerDelta / 115;
    const geologyBonus = state.city.geology?.['Uranium'] ?? 0;
    if (geologyBonus) {
      uraniumDelta *= geologyBonus + 1;
    }
    deltas['Uranium'] = (deltas['Uranium'] ?? 0) + uraniumDelta;
  }
  captureDeltaSection('铀副产物');

  // ============================================================
  // 7. 水泥 — 水泥工人（消耗石头）
  // ============================================================
  const cementWorkers = workers('cement_worker');
  if (cementWorkers > 0) {
    const stonePerCement = 3;
    // 实际可用的石头限制水泥产出
    const availableStone = (state.resource['Stone']?.amount ?? 0) + (deltas['Stone'] ?? 0);
    const maxByStone = Math.max(0, Math.floor(availableStone / stonePerCement));
    const effectiveCement = Math.min(cementWorkers, maxByStone);
    const cementLevel = techLevel('cement');
    const cementTechMult = cementLevel >= 7 ? 1.45 : (cementLevel >= 4 ? 1.2 : 1);
    const activeCementPlants = poweredOn['cement_plant'] ?? 0;
    const cementPowerRate = cementLevel >= 6 ? 0.08 : 0.05;
    const cementPowerMult = 1 + getDischargePoweredBonus(
      activeCementPlants,
      cementPowerRate,
      dischargeActive,
    );
    const cementBase = cementWorkers * 0.4;
    const stoneSupplyMult = cementWorkers > 0 ? effectiveCement / cementWorkers : 1;
    addBreakdownEntry('Cement', '水泥工基础产出', cementBase, 'source', '水泥生产');
    const cementDelta = applyBreakdownFactors('Cement', '水泥生产', cementBase, [
      { label: '石料供应限制', multiplier: stoneSupplyMult },
      { label: '水泥科技', multiplier: cementTechMult },
      { label: '水泥厂供电', multiplier: cementPowerMult },
      { label: '士气效率', multiplier: prodMult },
      { label: '饥饿修正', multiplier: hungerMult },
      { label: '行星全局修正', multiplier: planetGlobalMult },
      { label: '占领/统一政策', multiplier: occupyUnifyMult },
    ]);
    deltas['Cement'] = (deltas['Cement'] ?? 0) + cementDelta;
    const stoneConsumed = effectiveCement * stonePerCement;
    deltas['Stone'] = (deltas['Stone'] ?? 0) - stoneConsumed;
    addBreakdownEntry('Stone', '水泥生产石料', -stoneConsumed, 'consume', '水泥生产');
  }
  lastBreakdownSnapshot['Cement'] = deltas['Cement'] ?? 0;
  lastBreakdownSnapshot['Stone'] = deltas['Stone'] ?? 0;

  // ============================================================
  // 8. 知识 — 日晷基础 + 教授 + 科学家
  // ============================================================
  // 日晷基础产出 — 原版 main.js L4157:
  // let sundial_base = global.tech['primitive'] && global.tech['primitive'] >= 3 ? 1 : 0;
  // delta += sundial_base * global_multiplier;
  // 日晷产出独立于饥饿因子，研究日晷后即自动提供知识
  const sundialBase = techLevel('primitive') >= 3 ? 1 : 0;
  // magnetic 行星特性：日晷知识 +1
  const sundialPlanet = hasPlanetTrait(state, 'magnetic') ? magneticVars()[0] : 0;

  const professors = workers('professor');
  const scientists = workers('scientist');
  const libraries = structCount('library');
  // 教授基础产出 — 原版 main.js L9313:
  // professor.impact = 0.5 + (library_count * 0.01)
  const professorBase = professors * 0.5;
  const professorTraitBonus = professors * getProfessorTraitBonus(state);
  const professorLibraryBonus = professors * libraries * 0.01;
  const professorTempleMult = techLevel('anthropology') >= 3
    ? 1 + structCount('temple') * 0.05
    : 1;
  // 神权政体惩罚——原版 main.js L4183-4184:
  // if (govern.type === 'theocracy') professors_base *= 1 - (govEffect.theocracy()[1] / 100)
  const profGovMult = getKnowledgeMultiplier(state, 'professor');
  // 科学家产出 — impact = 1.0
  const activeWardenclyffes = poweredOn['wardenclyffe'] ?? 0;
  const wardenclyffeScientistMult = techLevel('science') >= 6 && activeWardenclyffes > 0
    ? 1 + professors * activeWardenclyffes * 0.01
    : 1;
  // 卫星加成——原版 main.js L4197-4199:
  // if (global.space['satellite']) scientist_base *= 1 + (satellite.count * 0.01)
  const satelliteScientistMult = getSatelliteScientistImpactMultiplier(state);
  // cataclysm 分支下，月球观测站还会放大科学家产出。
  const observatoryScientistMult = state.race['cataclysm'] && observatorySupported > 0
    ? 1 + observatorySupported * 0.25
    : 1;
  // 神权政体惩罚——原版 main.js L4200-4201:
  // if (govern.type === 'theocracy') scientist_base *= 1 - (govEffect.theocracy()[2] / 100)
  const sciGovMult = getKnowledgeMultiplier(state, 'scientist');
  // 图书馆全局加成 — 原版 main.js L4261
  // legacy: delta = (prof+sci)*hunger*global_mult + sundial*global_mult, 然后 delta *= library_mult
  // library_mult 作用于**包含日晷的整体 delta**，不仅仅是 prof+sci
  const libraryMult = 1 + libraries * 0.05;
  // Trait: pompous (-prof), ritual:science, logical (citizen knowledge)
  const pompousProfessorMult = getPompousProfessorPenalty(state);
  const scienceRitualMult = getRitualMultiplier(state, 'science');

  addBreakdownEntry('Knowledge', '教授基础产出', professorBase, 'source', '知识生产');
  addBreakdownEntry('Knowledge', '好学特质', professorTraitBonus, 'modifier', '知识生产');
  addBreakdownEntry('Knowledge', '图书馆教授影响', professorLibraryBonus, 'modifier', '知识生产');
  const professorKnowledge = applyBreakdownFactors(
    'Knowledge',
    '知识生产',
    professorBase + professorTraitBonus + professorLibraryBonus,
    [
      { label: '神殿人类学加成', multiplier: professorTempleMult },
      { label: '教授政体修正', multiplier: profGovMult },
      { label: '自大特质', multiplier: pompousProfessorMult },
      { label: '科学仪式', multiplier: scienceRitualMult },
      { label: '士气效率', multiplier: prodMult },
      { label: '饥饿修正', multiplier: hungerMult },
      { label: '行星全局修正', multiplier: planetGlobalMult },
      { label: '占领/统一政策', multiplier: occupyUnifyMult },
    ],
  );

  addBreakdownEntry('Knowledge', '科学家基础产出', scientists, 'source', '知识生产');
  const scientistKnowledge = applyBreakdownFactors('Knowledge', '知识生产', scientists, [
    { label: '沃登克里弗供电', multiplier: wardenclyffeScientistMult },
    { label: '卫星建筑', multiplier: satelliteScientistMult },
    { label: '观测站支援', multiplier: observatoryScientistMult },
    { label: '科学家政体修正', multiplier: sciGovMult },
    { label: '士气效率', multiplier: prodMult },
    { label: '饥饿修正', multiplier: hungerMult },
    { label: '行星全局修正', multiplier: planetGlobalMult },
    { label: '占领/统一政策', multiplier: occupyUnifyMult },
  ]);

  addBreakdownEntry('Knowledge', '日晷基础产出', sundialBase, 'source', '知识生产');
  addBreakdownEntry('Knowledge', '磁性行星日晷', sundialPlanet, 'modifier', '知识生产');
  const sundialKnowledge = applyBreakdownFactors(
    'Knowledge',
    '知识生产',
    sundialBase + sundialPlanet,
    [
      { label: '士气效率', multiplier: prodMult },
      { label: '行星全局修正', multiplier: planetGlobalMult },
    ],
  );

  const logicalKnowledgeBase = getLogicalKnowledgePerCitizen(state) * pop;
  addBreakdownEntry('Knowledge', '逻辑特质市民产出', logicalKnowledgeBase, 'source', '知识生产');
  const logicalKnowledge = applyBreakdownFactors('Knowledge', '知识生产', logicalKnowledgeBase, [
    { label: '士气效率', multiplier: prodMult },
  ]);

  const knowledgeBeforeLibraries = professorKnowledge + scientistKnowledge + sundialKnowledge + logicalKnowledge;
  deltas['Knowledge'] = applyBreakdownFactors('Knowledge', '知识生产', knowledgeBeforeLibraries, [
    { label: '图书馆建筑', multiplier: libraryMult },
  ]);
  lastBreakdownSnapshot['Knowledge'] = deltas['Knowledge'];

  // ============================================================
  // 8a. 信仰（Faith）— 牧师产出
  // ============================================================
  // 对标 legacy/src/main.js: priest impact = 0.5
  // 神权政体惩罚知识但信仰 +10%
  const priests = workers('priest');
  if (priests > 0 && state.resource['Faith']) {
    // 牧师输出 0.5 信仰/tick（乘 prodMult）
    let faithRate = priests * 0.5 * effectiveProdMult;
    if (state.civic.govern?.type === 'theocracy') faithRate *= 1.1;
    faithRate *= getSpiritualTempleBonus(state);
    deltas['Faith'] = (deltas['Faith'] ?? 0) + faithRate;
  }
  captureDeltaSection('信仰生产');

  // ============================================================
  // 9. 金币 — 税收 + 银行家
  // ============================================================
  // 原版 main.js L7586-7626:
  // citizens = pop + soldiers - unemployed（简化：无士兵）
  // income_base = citizens * 0.4（非 truepath）
  // banking >= 2 时: income_base *= 1 + (bankers * impact)
  // income_base *= tax_rate / 20
  // 政体加成（civics.js govEffect）：getTaxMultiplier() 返回政体税收乘数
  if (techLevel('currency') >= 1) {
    const taxRate = state.civic.taxes?.tax_rate ?? 20;
    const bankers = workers('banker');
    // 原版 L7587: citizens = pop + soldiers - unemployed
    const citizens = pop + soldiers - unemployed;
    const taxIncomeBase = citizens * 0.4;  // 原版 L7592, non-truepath
    let bankerIncomeMult = 1;
    // 银行家加成只在“已喂饱 fed”时生效 — 原版 L7601
    if ((state.resource['Food']?.amount ?? 0) > 0 && techLevel('banking') >= 2 && bankers > 0) {
      let bankerImpact = 0.1;  // 基础 impact
      if (techLevel('banking') >= 10) {
        bankerImpact += 0.02 * techLevel('stock_exchange');
      }
      bankerImpact *= getBankerImpactMultiplier(state);
      bankerImpact *= getTruthfulBankerPenalty(state); // seraph: -X% banker
      bankerIncomeMult = 1 + bankers * bankerImpact;
    }
    const taxTraitMult = getTaxIncomeTraitMultiplier(state);
    const taxRateMult = taxRate / 20;
    const taxGovernmentMult = getTaxMultiplier(state);

    // anthropology:4 开始，每座神庙使税收 +2.5%
    let templeTaxMult = 1;
    if (techLevel('anthropology') >= 4) {
      templeTaxMult += structCount('temple') * 0.025 * getSpiritualTempleBonus(state);
    }

    addBreakdownEntry('Money', '市民基础税收', taxIncomeBase, 'source', '税收与商业');
    const taxIncome = applyBreakdownFactors('Money', '税收与商业', taxIncomeBase, [
      { label: '银行家岗位', multiplier: bankerIncomeMult },
      { label: '贪婪特质', multiplier: taxTraitMult },
      { label: '税率政策', multiplier: taxRateMult },
      { label: '税收政体修正', multiplier: taxGovernmentMult },
      { label: '神殿建筑', multiplier: templeTaxMult },
      { label: '士气效率', multiplier: prodMult },
      { label: '饥饿修正', multiplier: hungerMult },
      { label: '行星全局修正', multiplier: planetGlobalMult },
    ]);
    let commercialIncome = 0;

    // 赌场收入 — 对标 legacy main.js L7674-7684
    // 计算所有通电的赌场（包括 city.casino 和 space.spc_casino）
    const cityCasinoOn = poweredOn['casino'] ?? 0;
    const spcCasinoOn = (state.space['spc_casino'] as { on?: number } | undefined)?.on ?? 0;
    const activeCasinos = cityCasinoOn + spcCasinoOn;
    if (techLevel('gambling') >= 1 && activeCasinos > 0) {
      const casinoIncomeBase = activeCasinos * getCasinoIncomePerActive(state);
      addBreakdownEntry('Money', '赌场基础收入', casinoIncomeBase, 'source', '税收与商业');
      commercialIncome += applyBreakdownFactors('Money', '税收与商业', casinoIncomeBase, [
        { label: '赌场政体/成就修正', multiplier: getCasinoIncomeMultiplier(state) },
        { label: '士气效率', multiplier: prodMult },
        { label: '饥饿修正', multiplier: hungerMult },
        { label: '行星全局修正', multiplier: planetGlobalMult },
      ]);
    }

    // 旅游收入 — 对标 legacy main.js L7687-7728（当前阶段只保留已实装的贡献项）
    if (touristCenters > 0) {
      const tourismIncomeBase = getTourismIncome(state, touristCenters);
      addBreakdownEntry('Money', '旅游中心基础收入', tourismIncomeBase, 'source', '税收与商业');
      commercialIncome += applyBreakdownFactors('Money', '税收与商业', tourismIncomeBase, [
        { label: '旅游政体/餐厅修正', multiplier: getTourismIncomeMultiplier(state) },
        { label: '士气效率', multiplier: prodMult },
        { label: '饥饿修正', multiplier: hungerMult },
        { label: '行星全局修正', multiplier: planetGlobalMult },
      ]);
    }
    deltas['Money'] = taxIncome + commercialIncome;
    lastBreakdownSnapshot['Money'] = deltas['Money'];
  }

  // ============================================================
  // 9a. 冶金系统 (Metallurgy) — 对标 legacy main.js L4842-5146
  // ============================================================
  const smelterState = state.city.smelter;
  const smelterWoodFuelResource = state.race['evil']
    ? state.race['soul_eater'] && state.race.species !== 'wendigo' && !state.race['artificial']
      ? 'Food'
      : 'Furs'
    : 'Lumber';
  if (smelterState && smelterState.count > 0) {
    let woodFuel = smelterState.Wood ?? 0;
    let coalFuel = smelterState.Coal ?? 0;
    let oilFuel = smelterState.Oil ?? 0;
    const substitutesCoalForWood = Boolean(
      (state.race['kindling_kindred'] || state.race['smoldering']) && !state.race['evil'],
    );
    if (substitutesCoalForWood) {
      coalFuel += woodFuel;
      woodFuel = 0;
    }

    const woodFuelResourceId = smelterWoodFuelResource;

    const assignedIronSmelters = smelterState.Iron ?? 0;
    const redirectedSteelSmelters = Object.prototype.hasOwnProperty.call(state.race, 'steelen')
      ? smelterState.Steel ?? 0
      : 0;
    let requestedIronSmelters = assignedIronSmelters + redirectedSteelSmelters;
    const requestedSteelSmelters = redirectedSteelSmelters > 0 ? 0 : smelterState.Steel ?? 0;
    const requestedIridiumSmelters = smelterState.Iridium ?? 0;
    let ironSmelter = requestedIronSmelters;
    let steelSmelter = requestedSteelSmelters;
    let iridiumSmelter = requestedIridiumSmelters;

    const availableWoodFuel = (state.resource[woodFuelResourceId]?.amount ?? 0) / TIME_MULTIPLIER;
    const availableCoal = (state.resource['Coal']?.amount ?? 0) / TIME_MULTIPLIER;
    const availableOil = (state.resource['Oil']?.amount ?? 0) / TIME_MULTIPLIER;

    // 对标 legacy industry.js L150-181 smelterFuelConfig()
    // l_cost=3, c_cost=0.25(kindling_kindred/smoldering: 0.15), o_cost=0.35(forge种族: 0)
    const woodFuelCost = woodFuelResourceId === 'Furs' ? 1 : 3;
    const coalCost = state.race['kindling_kindred'] || state.race['smoldering'] ? 0.15 : 0.25;
    const oilCost = state.race['forge'] ? 0 : 0.35;

    // 处理实际能够工作的燃料槽
    const maxWoodOperable = Math.max(0, Math.floor(availableWoodFuel / woodFuelCost));
    if (maxWoodOperable < woodFuel) {
      woodFuel = maxWoodOperable;
    }
    const maxCoalOperable = Math.max(0, Math.floor(availableCoal / coalCost));
    if (maxCoalOperable < coalFuel) {
      coalFuel = maxCoalOperable;
    }
    const maxOilOperable = oilCost > 0
      ? Math.max(0, Math.floor(availableOil / oilCost))
      : oilFuel;
    if (maxOilOperable < oilFuel) {
      oilFuel = maxOilOperable;
    }

    const totalFuel = woodFuel + coalFuel + oilFuel;

    // 当配置产出 > 实际提供的燃料数时做自动降级
    // 对标 legacy main.js L4993-5004: 先降钢，再降铁，最后降铱
    let overage = ironSmelter + steelSmelter + iridiumSmelter - totalFuel;
    let implicitIronSmelters = 0;
    if (overage > 0) {
      const disableSteel = Math.min(overage, steelSmelter);
      steelSmelter -= disableSteel;
      overage -= disableSteel;

      const disableIron = Math.min(overage, ironSmelter);
      ironSmelter -= disableIron;
      overage -= disableIron;

      const disableIridium = Math.min(overage, iridiumSmelter);
      iridiumSmelter -= disableIridium;
    } else if (overage < 0) {
      // 原版默认会将多余的所有燃料强行塞入产铁
      implicitIronSmelters = Math.abs(overage);
      requestedIronSmelters += implicitIronSmelters;
      ironSmelter += implicitIronSmelters;
    }

    // 扣除燃料
    const woodFuelConsumed = woodFuel * woodFuelCost;
    const coalFuelConsumed = coalFuel * coalCost;
    const oilFuelConsumed = oilFuel * oilCost;
    deltas[woodFuelResourceId] = (deltas[woodFuelResourceId] ?? 0) - woodFuelConsumed;
    deltas['Coal'] = (deltas['Coal'] ?? 0) - coalFuelConsumed;
    deltas['Oil'] = (deltas['Oil'] ?? 0) - oilFuelConsumed;
    const woodFuelName = state.resource[woodFuelResourceId]?.name ?? woodFuelResourceId;
    addBreakdownEntry(
      woodFuelResourceId,
      `冶炼厂${woodFuelName}燃料`,
      -woodFuelConsumed,
      'consume',
      '冶金系统',
    );
    addBreakdownEntry('Coal', '冶炼厂煤炭燃料', -coalFuelConsumed, 'consume', '冶金系统');
    addBreakdownEntry('Oil', '冶炼厂石油燃料', -oilFuelConsumed, 'consume', '冶金系统');

    // 煤燃料产生铀灰，不受全局生产乘数影响。
    if (coalFuelConsumed > 0 && techLevel('uranium') >= 3) {
      const uraniumAshBase = coalFuelConsumed / 65;
      addBreakdownEntry('Uranium', '冶炼厂煤灰基础', uraniumAshBase, 'source', '冶金系统');
      const uraniumAsh = applyBreakdownFactors('Uranium', '冶金系统', uraniumAshBase, [
        { label: '铀地质特征', multiplier: 1 + (state.city.geology?.['Uranium'] ?? 0) },
      ]);
      deltas['Uranium'] = (deltas['Uranium'] ?? 0) + uraniumAsh;
    }

    // 产出铁 (不受全员效率影响，定额产出)
    // 对标 legacy main.js L5007-5022
    const ironBlast = techLevel('smelting') >= 3 ? 1.2 : 1;
    const ironAdvanced = techLevel('smelting') >= 7 ? 1.25 : 1;
    // oil_bonus: 每个石油燃料槽加成铁/铱产量
    const oilBonus = oilFuel > 0 ? 1 + (oilFuel / 200) : 1;  // legacy L5019-5022
    // 熔炉 trait 加成：pyrophobia 减产、iron_allergy 减铁
    const smelterTraitMult = getPyrophobiaSmelterPenalty(state);
    addBreakdownEntry('Iron', '熔炉炼铁分配', assignedIronSmelters, 'source', '冶金系统');
    addBreakdownEntry('Iron', '无钢挑战转炼铁', redirectedSteelSmelters, 'source', '冶金系统');
    addBreakdownEntry('Iron', '未分配燃料转炼铁', implicitIronSmelters, 'source', '冶金系统');
    const ironOutput = applyBreakdownFactors('Iron', '冶金系统', requestedIronSmelters, [
      {
        label: '可用燃料限制',
        multiplier: requestedIronSmelters > 0 ? ironSmelter / requestedIronSmelters : 1,
      },
      { label: '高炉科技', multiplier: ironBlast },
      { label: '先进冶炼科技', multiplier: ironAdvanced },
      { label: '石油燃料加成', multiplier: oilBonus },
      { label: '畏热症特质', multiplier: smelterTraitMult },
      { label: '铁过敏特质', multiplier: getIronAllergyPenalty(state) },
    ]);
    deltas['Iron'] = (deltas['Iron'] ?? 0) + ironOutput;

    // 产出铱 — 对标 legacy main.js L5008-5021
    // iridium_smelter *= 0.05（基础铱效率），同样应用 smelting>=7 和 oil_bonus 修正
    // legacy L5008: iridium_smelter *= 0.05
    // legacy L5017: iridium_smelter *= 1.25 (smelting>=7)
    // legacy L5021: iridium_smelter *= 1 + (oil_bonus/200)
    if (requestedIridiumSmelters > 0 && (state.resource['Iridium']?.display ?? false)) {
      const iridiumBase = requestedIridiumSmelters * 0.05;
      addBreakdownEntry('Iridium', '熔炉炼铱基础', iridiumBase, 'source', '冶金系统');
      const iridiumOutput = applyBreakdownFactors('Iridium', '冶金系统', iridiumBase, [
        {
          label: '可用燃料限制',
          multiplier: requestedIridiumSmelters > 0 ? iridiumSmelter / requestedIridiumSmelters : 1,
        },
        { label: '先进冶炼科技', multiplier: ironAdvanced },
        { label: '石油燃料加成', multiplier: oilBonus },
        { label: '畏热症特质', multiplier: smelterTraitMult },
      ]);
      deltas['Iridium'] = (deltas['Iridium'] ?? 0) + iridiumOutput;
    }

    // 产出钢
    if (techLevel('smelting') >= 2 && requestedSteelSmelters > 0) {
      const fuelLimitedSteelSmelters = steelSmelter;
      const availIron = Math.max(0, (state.resource['Iron']?.amount ?? 0) / TIME_MULTIPLIER);
      const availCoal = Math.max(
        0,
        (state.resource['Coal']?.amount ?? 0) / TIME_MULTIPLIER - coalFuelConsumed,
      );
      steelSmelter = Math.min(
        fuelLimitedSteelSmelters,
        Math.floor(availIron / 2),
        Math.floor(availCoal / 0.25),
      );
      const ironConsume = steelSmelter * 2;
      const coalConsume = steelSmelter * 0.25;

      deltas['Iron'] = (deltas['Iron'] ?? 0) - ironConsume;
      deltas['Coal'] = (deltas['Coal'] ?? 0) - coalConsume;
      addBreakdownEntry('Iron', '炼钢消耗铁', -ironConsume, 'consume', '冶金系统');
      addBreakdownEntry('Coal', '炼钢消耗煤', -coalConsume, 'consume', '冶金系统');

      let steelTechMult = 1;
      for (let i = 4; i <= 6; i++) {
        if (techLevel('smelting') >= i) steelTechMult *= 1.2;
      }
      if (techLevel('smelting') >= 7) steelTechMult *= 1.25;

      // 原版：钢的合成受全局效率 (effectiveProdMult) 加成
      const steelenBonus = 1 + getAchievementLevel(state, 'steelen') * 0.02;
      const lamentisBonus = getAchievementLevel(state, 'lamentis') >= 2 ? 1.1 : 1;
      addBreakdownEntry('Steel', '熔炉炼钢分配', requestedSteelSmelters, 'source', '冶金系统');
      const steelOutput = applyBreakdownFactors('Steel', '冶金系统', requestedSteelSmelters, [
        {
          label: '可用燃料限制',
          multiplier: requestedSteelSmelters > 0
            ? fuelLimitedSteelSmelters / requestedSteelSmelters
            : 1,
        },
        {
          label: '铁/煤原料限制',
          multiplier: fuelLimitedSteelSmelters > 0
            ? steelSmelter / fuelLimitedSteelSmelters
            : 1,
        },
        { label: '炼钢科技', multiplier: steelTechMult },
        { label: '石油燃料加成', multiplier: oilBonus },
        { label: '士气效率', multiplier: prodMult },
        { label: '饥饿修正', multiplier: hungerMult },
        { label: '行星全局修正', multiplier: planetGlobalMult },
        { label: '占领/统一政策', multiplier: occupyUnifyMult },
        { label: '畏热症特质', multiplier: smelterTraitMult },
        { label: '无钢成就加成', multiplier: steelenBonus },
        { label: '拉门提斯成就加成', multiplier: lamentisBonus },
      ]);
      deltas['Steel'] = (deltas['Steel'] ?? 0) + steelOutput;

      // 钛副产物
      if (techLevel('titanium') >= 1) {
        const titaniumDivisor = techLevel('titanium') >= 3 ? 10 : 25;
        addBreakdownEntry('Titanium', '炼钢钛副产物基础', steelOutput, 'source', '冶金系统');
        const titaniumOutput = applyBreakdownFactors('Titanium', '冶金系统', steelOutput, [
          { label: '钛提炼科技', multiplier: 1 / titaniumDivisor, detail: `1/${titaniumDivisor}` },
        ]);
        deltas['Titanium'] = (deltas['Titanium'] ?? 0) + titaniumOutput;
      }
    }
  }
  for (const resId of new Set([
    smelterWoodFuelResource,
    'Lumber',
    'Coal',
    'Oil',
    'Uranium',
    'Iron',
    'Iridium',
    'Steel',
    'Titanium',
  ])) {
    lastBreakdownSnapshot[resId] = deltas[resId] ?? 0;
  }

  // ============================================================
  // 9b. 石油产出 — 对标 legacy main.js L6720-6760
  // ============================================================
  const oilWells = structCount('oil_well');
  if (oilWells > 0 && techLevel('oil') >= 1) {
    const oilLevel = techLevel('oil');
    const drillingTechMult = oilLevel >= 4 ? 1.2 : 1;
    const refiningTechMult = oilLevel >= 7
      ? 2
      : oilLevel >= 6
        ? 1.75
        : oilLevel >= 5
          ? 1.25
          : 1;
    const oilGeologyMult = 1 + (state.city.geology?.['Oil'] ?? 0);
    const oilBiomeMult = getOilBiomeMultiplier(state);
    const dirtyJobsMult = 1 + govActive(state, 'dirty_jobs', 2) / 100;
    const oilWellBase = oilWells * 0.4;
    addBreakdownEntry('Oil', '油井基础产出', oilWellBase, 'source', '石油井');
    const oilWellOutput = applyBreakdownFactors('Oil', '石油井', oilWellBase, [
      { label: '钻井科技', multiplier: drillingTechMult },
      { label: '石油提炼科技', multiplier: refiningTechMult },
      { label: '石油地质特征', multiplier: oilGeologyMult },
      { label: '生物群系', multiplier: oilBiomeMult },
      { label: '苦活担当总督', multiplier: dirtyJobsMult },
      { label: '士气效率', multiplier: prodMult },
      { label: '饥饿修正', multiplier: hungerMult },
      { label: '行星全局修正', multiplier: planetGlobalMult },
      { label: '占领/统一政策', multiplier: occupyUnifyMult },
    ]);
    deltas['Oil'] = (deltas['Oil'] ?? 0) + oilWellOutput;
  }
  lastBreakdownSnapshot['Oil'] = deltas['Oil'] ?? 0;

  // ============================================================
  // 9c. 深空建筑产出分段 — 对标 legacy/src/prod.js
  // ============================================================
  // gas_mining (He3 采集船) — prod.js L340-375
  const gasShipCount = poweredOn['gas_mining'] ?? 0;
  if (gasShipCount > 0) {
    const gasBase = gasShipCount * 0.5;
    addBreakdownEntry('Helium_3', '气体采集站基础产出', gasBase, 'source', '气态巨行星采集');
    const gasOutput = applyBreakdownFactors('Helium_3', '气态巨行星采集', gasBase, [
      { label: '氦-3 吸引科技', multiplier: techLevel('helium') >= 1 ? 1.3 : 1 },
      { label: '放电挑战', multiplier: dischargeActive ? 0.5 : 1 },
      { label: '士气效率', multiplier: prodMult },
      { label: '饥饿修正', multiplier: hungerMult },
      { label: '行星全局修正', multiplier: planetGlobalMult },
      { label: '占领/统一政策', multiplier: occupyUnifyMult },
    ]);
    deltas['Helium_3'] = (deltas['Helium_3'] ?? 0) + gasOutput;
  }
  lastBreakdownSnapshot['Helium_3'] = deltas['Helium_3'] ?? 0;

  // oil_extractor (气态卫星石油) — prod.js L395-425
  const oilExtractorCount = poweredOn['oil_extractor'] ?? 0;
  if (oilExtractorCount > 0) {
    const oilLevel = techLevel('oil');
    const drillingTechMult = oilLevel >= 4 ? 1.2 : 1;
    const refiningTechMult = oilLevel >= 7
      ? 2
      : oilLevel >= 6
        ? 1.75
        : oilLevel >= 5
          ? 1.25
          : 1;
    const miningDrones = (state.space['drone'] as { count?: number } | undefined)?.count ?? 0;
    const droneRate = getAchievementLevel(state, 'iron_will') >= 3 ? 0.12 : 0.06;
    const droneMult = 1 + miningDrones * droneRate;
    const extractorBase = oilExtractorCount * 0.4;
    addBreakdownEntry('Oil', '石油提取器基础产出', extractorBase, 'source', '气态巨行星石油');
    const extractorOutput = applyBreakdownFactors('Oil', '气态巨行星石油', extractorBase, [
      { label: '钻井科技', multiplier: drillingTechMult },
      { label: '石油提炼科技', multiplier: refiningTechMult },
      { label: '采矿无人机', multiplier: droneMult },
      { label: '士气效率', multiplier: prodMult },
      { label: '饥饿修正', multiplier: hungerMult },
      { label: '行星全局修正', multiplier: planetGlobalMult },
      { label: '占领/统一政策', multiplier: occupyUnifyMult },
    ]);
    deltas['Oil'] = (deltas['Oil'] ?? 0) + extractorOutput;
  }
  lastBreakdownSnapshot['Oil'] = deltas['Oil'] ?? 0;

  const eleriumShipSupported = spaceSupport.supportOn['elerium_ship'] ?? 0;
  const iridiumShipSupported = spaceSupport.supportOn['iridium_ship'] ?? 0;
  const ironShipSupported = spaceSupport.supportOn['iron_ship'] ?? 0;
  const asteroidTech = techLevel('asteroid');

  // Elerium 随机发现事件 — 对标 legacy main.js L10875-10895
  // asteroid=3 时，实际获得支援的铁/铱采矿船共同提供发现概率。
  const beltMiningActivity = ironShipSupported + iridiumShipSupported;
  if (asteroidTech === 3 && beltMiningActivity > 0 && Math.random() * 250 <= beltMiningActivity) {
    asteroidEleriumDiscovered = true;
    messages.push({
      text: '⚛️ 矿船在小行星带发现了超铀元素！',
      type: 'info',
      category: 'progress',
    });
  }

  // elerium_ship — 对标 legacy prod.js L168-171
  if (eleriumShipSupported > 0) {
    const eleriumTechMult = asteroidTech >= 7 ? 1.8 : asteroidTech >= 6 ? 1.5 : 1;
    const eleriumBase = eleriumShipSupported * 0.005;
    addBreakdownEntry('Elerium', '超铀采矿船基础产出', eleriumBase, 'source', '超铀采矿船');
    const eleriumOutput = applyBreakdownFactors('Elerium', '超铀采矿船', eleriumBase, [
      { label: '小行星采矿科技', multiplier: eleriumTechMult },
      { label: '放电挑战', multiplier: dischargeActive ? 0.75 : 1 },
      { label: '士气效率', multiplier: prodMult },
      { label: '饥饿修正', multiplier: hungerMult },
      { label: '行星全局修正', multiplier: planetGlobalMult },
      { label: '占领/统一政策', multiplier: occupyUnifyMult },
    ]);
    deltas['Elerium'] = (deltas['Elerium'] ?? 0) + eleriumOutput;
  }
  lastBreakdownSnapshot['Elerium'] = deltas['Elerium'] ?? 0;

  // iridium_ship — 对标 legacy prod.js L172-175
  if (iridiumShipSupported > 0) {
    const iridiumTechMult = asteroidTech >= 7 ? 0.1 / 0.055 : asteroidTech >= 6 ? 0.08 / 0.055 : 1;
    const iridiumBase = iridiumShipSupported * 0.055;
    addBreakdownEntry('Iridium', '铱矿采矿船基础产出', iridiumBase, 'source', '铱矿采矿船');
    const iridiumOutput = applyBreakdownFactors('Iridium', '铱矿采矿船', iridiumBase, [
      { label: '小行星采矿科技', multiplier: iridiumTechMult },
      { label: '士气效率', multiplier: prodMult },
      { label: '饥饿修正', multiplier: hungerMult },
      { label: '行星全局修正', multiplier: planetGlobalMult },
      { label: '占领/统一政策', multiplier: occupyUnifyMult },
    ]);
    deltas['Iridium'] = (deltas['Iridium'] ?? 0) + iridiumOutput;
  }
  lastBreakdownSnapshot['Iridium'] = deltas['Iridium'] ?? 0;

  // iron_ship — 对标 legacy prod.js L176-179
  if (ironShipSupported > 0) {
    const ironTechMult = asteroidTech >= 7 ? 2 : asteroidTech >= 6 ? 1.5 : 1;
    const ironShipBase = ironShipSupported * 2;
    addBreakdownEntry('Iron', '铁矿采矿船基础产出', ironShipBase, 'source', '铁矿采矿船');
    const ironShipOutput = applyBreakdownFactors('Iron', '铁矿采矿船', ironShipBase, [
      { label: '小行星采矿科技', multiplier: ironTechMult },
      { label: '士气效率', multiplier: prodMult },
      { label: '饥饿修正', multiplier: hungerMult },
      { label: '行星全局修正', multiplier: planetGlobalMult },
      { label: '占领/统一政策', multiplier: occupyUnifyMult },
    ]);
    deltas['Iron'] = (deltas['Iron'] ?? 0) + ironShipOutput;
  }
  lastBreakdownSnapshot['Iron'] = deltas['Iron'] ?? 0;

  // space_barracks Oil 消耗 — 对标 legacy main.js L2393-2403
  // 每座 on 消耗 2 Oil/tick
  let effectiveSpaceBarracksOn: number | null = null;
  if (!state.race['fasting']) {
    const spaceBarracks = state.space['space_barracks'] as { count?: number; on?: number } | undefined;
    if (spaceBarracks && (spaceBarracks.on ?? 0) > 0) {
      const oilCost = SPACE_BARRACKS_OIL_PER_TICK;
      const requestedOn = spaceBarracks.on ?? 0;
      const reservedOil = Math.max(0, -(powerResult.fuelDeltas['Oil'] ?? 0))
        + Math.max(0, spaceSupport.fuelDrain['Oil'] ?? 0)
        + Math.max(0, interstellarSupport.fuelDrain['Oil'] ?? 0);
      const availableOil = Math.max(
        0,
        (state.resource['Oil']?.amount ?? 0) - reservedOil * TIME_MULTIPLIER,
      );
      const maxAffordable = Math.max(
        0,
        Math.floor(availableOil / (oilCost * TIME_MULTIPLIER)),
      );
      effectiveSpaceBarracksOn = Math.min(requestedOn, maxAffordable);
      const oilConsume = effectiveSpaceBarracksOn * oilCost;
      deltas['Oil'] = (deltas['Oil'] ?? 0) - oilConsume;
      addBreakdownEntry(
        'Oil',
        '太空军营燃料',
        -oilConsume,
        'consume',
        '太空军营燃料',
        `开启 ${effectiveSpaceBarracksOn}/${requestedOn}`,
      );
    }
  }
  lastBreakdownSnapshot['Oil'] = deltas['Oil'] ?? 0;

  if (!state.race['fasting']) {
    const stationOn = spaceSupport.supplierEffectiveOn['space_station'] ?? 0;
    const stationFood = stationOn * (state.race['cataclysm'] ? 1 : 10);
    const barracksFood = state.race['cataclysm']
      ? 0
      : (effectiveSpaceBarracksOn ?? 0) * SPACE_BARRACKS_FOOD_PER_TICK;
    if (stationFood > 0) {
      deltas['Food'] = (deltas['Food'] ?? 0) - stationFood;
      addBreakdownEntry('Food', '太空站口粮', -stationFood, 'consume', '深空口粮');
    }
    if (barracksFood > 0) {
      deltas['Food'] = (deltas['Food'] ?? 0) - barracksFood;
      addBreakdownEntry(
        'Food',
        '太空军营口粮',
        -barracksFood,
        'consume',
        '深空口粮',
        `开启 ${effectiveSpaceBarracksOn}`,
      );
    }
  }
  lastBreakdownSnapshot['Food'] = deltas['Food'] ?? 0;

  // ============================================================
  // 10a. 工匠合成产线（自动消耗原料、产出合成品）
  // ============================================================
  const craftAvailableResources = Object.fromEntries(
    Object.entries(state.resource).map(([resId, resource]) => {
      let available = resource.amount + (deltas[resId] ?? 0) * TIME_MULTIPLIER;
      available = Math.max(0, available);
      if (resource.max > 0) available = Math.min(resource.max, available);
      return [resId, available];
    }),
  );
  const craftResult = craftingTickDetailed(
    state,
    fabricationSupported,
    effectiveColonistWorkers,
    { poweredOn, availableResources: craftAvailableResources },
  );
  for (const line of craftResult.lines) {
    const craftName = state.resource[line.craftId]?.name ?? line.craftId;
    const section = `工匠合成：${craftName}`;
    addBreakdownEntry(
      line.craftId,
      `工匠基础产出：${craftName}`,
      line.assignedBaseOutput,
      'source',
      section,
      `${line.effectiveWorkers}/${line.assignedWorkers} 名工匠，速度 x${line.speed}`,
    );
    addBreakdownEntry(
      line.craftId,
      '原料供应限制',
      line.materialBaseOutput - line.assignedBaseOutput,
      'modifier',
      section,
      `${line.effectiveWorkers}/${line.assignedWorkers} 名有效工匠`,
    );
    addBreakdownEntry(
      line.craftId,
      '高人口工匠效率',
      line.scaledBaseOutput - line.materialBaseOutput,
      'modifier',
      section,
    );
    for (const factor of line.additions) {
      addBreakdownEntry(
        line.craftId,
        factor.label,
        line.scaledBaseOutput * factor.bonus,
        'modifier',
        section,
        `${factor.bonus >= 0 ? '+' : ''}${Number((factor.bonus * 100).toFixed(2))}%`,
      );
    }
    let accountedOutput = line.scaledBaseOutput
      * (1 + line.additions.reduce((sum, factor) => sum + factor.bonus, 0));
    for (const factor of line.multipliers) {
      const next = accountedOutput * factor.multiplier;
      addBreakdownEntry(
        line.craftId,
        factor.label,
        next - accountedOutput,
        'modifier',
        section,
        `x${Number(factor.multiplier.toFixed(4))}`,
      );
      accountedOutput = next;
    }

    for (const input of line.inputs) {
      const inputName = state.resource[input.resource]?.name ?? input.resource;
      addBreakdownEntry(
        input.resource,
        `工匠基础原料：${craftName}`,
        -input.baseConsumption,
        'consume',
        section,
        `${input.baseRecipeAmount} ${inputName}/单位`,
      );
      addBreakdownEntry(
        input.resource,
        `种族配方修正：${craftName}`,
        -(input.adjustedConsumption - input.baseConsumption),
        'modifier',
        section,
        `${input.baseRecipeAmount} -> ${input.adjustedRecipeAmount}`,
      );
      addBreakdownEntry(
        input.resource,
        `机智特质原料折扣：${craftName}`,
        -(input.consumption - input.adjustedConsumption),
        'modifier',
        section,
      );
    }
  }
  for (const [resId, delta] of Object.entries(craftResult.deltas)) {
    deltas[resId] = (deltas[resId] ?? 0) + delta;
    lastBreakdownSnapshot[resId] = deltas[resId];
  }

  // ============================================================
  // 10b. 贸易路线自动执行
  // ============================================================
  const tradeDeltas = tradeTick(state);
  for (const [resId, delta] of Object.entries(tradeDeltas)) {
    deltas[resId] = (deltas[resId] ?? 0) + delta;
  }
  captureDeltaSection('自动贸易');

  for (const [resId, delta] of Object.entries(getDecayChallengeDeltas(state))) {
    deltas[resId] = (deltas[resId] ?? 0) + delta;
  }
  captureDeltaSection('衰变挑战');

  // 对标 legacy/src/main.js L2406-2410：每座 powered red_factory 额外消耗 1 Helium_3/tick。
  if (redFactoryPowered > 0) {
    deltas['Helium_3'] = (deltas['Helium_3'] ?? 0) - redFactoryPowered;
  }
  captureDeltaSection('红色工厂燃料');

  // ============================================================
  // 10. 应用 time_multiplier 并写入状态
  // ============================================================
  // 原版 main.js L1213: var time_multiplier = 0.25;
  // 所有 modRes() 调用均乘以此值。
  for (const resId of Object.keys(deltas)) {
    deltas[resId] *= TIME_MULTIPLIER;
  }
  captureDeltaSection('时间缩放', () => 'modifier', `x${TIME_MULTIPLIER}`);

  const newState: GameState = JSON.parse(JSON.stringify(state));
  if (asteroidEleriumDiscovered) {
    newState.tech['asteroid'] = 4;
    if (!newState.resource['Elerium']) {
      newState.resource['Elerium'] = {
        name: '超铀',
        amount: 0,
        max: 100,
        display: true,
        diff: 0,
        value: 0,
        rate: 0,
        crates: 0,
        delta: 0,
      };
    } else {
      newState.resource['Elerium'].display = true;
    }
  }
  if (effectiveSpaceBarracksOn !== null) {
    const spaceBarracks = newState.space['space_barracks'] as { on?: number } | undefined;
    if (spaceBarracks) spaceBarracks.on = effectiveSpaceBarracksOn;
  }
  if (banquetFoodShortage) resetBanquetStrength(newState);
  if (emfieldTick) {
    newState.race['emfield'] = emfieldTick.emfield;
    newState.race['discharge'] = emfieldTick.discharge;
  }

  for (const [resId, delta] of Object.entries(deltas)) {
    const res = newState.resource[resId];
    if (!res) continue;

    res.diff = delta;
    res.amount += delta;

    // 钳位
    if (res.max > 0 && res.amount > res.max) {
      res.amount = res.max;
    }
    if (res.amount < 0) {
      res.amount = 0;

      // 食物耗尽警告
      if (resId === 'Food') {
        messages.push({
          text: '⚠️ 食物耗尽！市民正在挨饿。',
          type: 'danger',
          category: 'progress',
        });
      }
    }
  }

  markCurrentDeltasSettled();

  // 没有 delta 的资源 diff 归零
  for (const [resId, res] of Object.entries(newState.resource)) {
    if (!Object.prototype.hasOwnProperty.call(deltas, resId)) {
      res.diff = 0;
    }
  }

  // ============================================================
  // 10c. 建造队列处理
  // ============================================================
  const foodProductionDelta = deltas['Food'] ?? 0;
  if (newState.queue?.queue && newState.queue.queue.length > 0) {
    const item = newState.queue.queue[0];
    const queueResourceSnapshot = snapshotResourceAmounts(newState.resource);
    const def = BASIC_STRUCTURES.find(d => d.id === item.id);
    if (def) {
      const structObj = newState.city[item.id] as { count?: number } | undefined;
      const currCount = structObj?.count ?? 0;
      
      let finished = true;
      const queueCosts = applyInflationToCosts(
        newState,
        Object.fromEntries(Object.entries(def.costs).map(([resId, costFunc]) => [resId, costFunc(newState, currCount)])),
      );
      for (const [resId, reqAmount] of Object.entries(queueCosts)) {
        item.progress = item.progress || {};
        const current = item.progress[resId] || 0;
        
        if (current < reqAmount) {
          finished = false;
          const missing = reqAmount - current;
          const available = newState.resource[resId]?.amount ?? 0;
          const take = Math.min(missing, available);
          
          if (take > 0) {
            newState.resource[resId].amount -= take;
            item.progress[resId] = current + take;
            // 此时不减去 diff，因为 diff 是显示用的产量速度
          }
        }
      }

      if (finished) {
        if (!newState.city[item.id]) {
          newState.city[item.id] = { count: 0, on: 0 };
        }
        const building = newState.city[item.id] as { count: number; on?: number; strength?: number };
        building.count++;
        if (item.id === 'banquet') {
          building.on = 1;
          building.strength ??= 0;
        } else if (building.on !== undefined) {
          building.on++;
        }
        addInflationPoints(newState, 1);

        messages.push({
          text: `✔️ 建造完成：${item.label}`,
          type: 'success',
          category: 'progress'
        });

        newState.queue.queue.shift();
      }
    } else {
      // 防止无效项卡死队列
      newState.queue.queue.shift();
    }
    captureDeferredSettledResourceMutations(
      queueResourceSnapshot,
      newState.resource,
      () => `建造队列：${item.label}`,
      '建造队列',
    );
  }

  // ============================================================
  // 10.5 人口自然增长 (Pop Spawn)
  // ============================================================
  const populationResourceSnapshot = snapshotResourceAmounts(newState.resource);
  tickPopulationGrowth(newState, TIME_MULTIPLIER, messages);

  // ============================================================
  // 11. 饥荒致死（Starvation Death）
  // ============================================================
  // 对标 legacy/src/main.js L3791-3865:
  // 触发条件：食物被截断为 0（modRes 返回 false），即 Food.amount==0 且 deltas['Food'] < 0
  // 在非 fasting 种族下，以 Math.rand(0,10)===0 的 1/11 概率（≈9.09%）减少 1 人口
  // 相当于：每 11 个 fast-tick（≈2.75s）平均死亡一次
  // NOTE: fasting / anthropophagite / slow_digestion 等特质 Phase 1 未实装，使用基础逻辑
  if (newState.resource['Food']?.amount === 0 && foodProductionDelta < 0) {
    if (getPopulation(newState) > 1) {
      // 1/11 概率 — 对标 legacy Math.rand(0,10) === 0
      if (Math.floor(Math.random() * 11) === 0) {
        removeOneCitizen(newState);
        messages.push({
          text: '💀 一名市民因饥饿而死亡！',
          type: 'danger',
          category: 'progress',
        });
      }
    }
  }
  captureDeferredSettledResourceMutations(
    populationResourceSnapshot,
    newState.resource,
    (resId, amount) => amount >= 0
      ? `人口增长：${newState.resource[resId]?.name ?? resId}`
      : `人口损失：${newState.resource[resId]?.name ?? resId}`,
    '人口变化',
  );

  // ============================================================
  // 11.5 市场价格波动收敛 (Market Price Fluctuation)
  // ============================================================
  if ((newState.tech['currency'] ?? 0) >= 2) {
    const fluxVal = 4; // 'risktaker' gov trait not implemented yet, so 4
    for (const [resId, baseResourceValue] of Object.entries(RESOURCE_VALUES)) {
      const targetRes = newState.resource[resId];
      if (!targetRes || !targetRes.display || targetRes.value === undefined) {
        continue;
      }

      if (Math.floor(Math.random() * fluxVal) !== 0) {
        continue;
      }

      let baseVal = newState.race['truepath'] ? baseResourceValue * 2 : baseResourceValue;
      if (resId === 'Copper' && (newState.tech['high_tech'] ?? 0) >= 2) {
        baseVal *= 2;
      }
      if (resId === 'Titanium') {
        if ((newState.tech['titanium'] ?? 0) > 0) {
          baseVal *= newState.resource['Alloy']?.display ? 1 : 2.5;
        } else {
          baseVal *= 5;
        }
      }

      const max = baseVal * 3;
      const min = baseVal / 2;
      const variance = (Math.floor(Math.random() * 200) - 100) / 100;
      let nextValue = targetRes.value + variance;
      if (nextValue < min) {
        nextValue = baseVal;
      } else if (nextValue > max) {
        nextValue = max - baseVal;
      }
      targetRes.value = nextValue;
    }
  }

  // ============================================================
  // 12. 日历推进
  // ============================================================
  // 原版 Evolve：fast loop = 250ms, long loop = 250 × 20 = 5000ms
  // 日历推进在 long loop 中执行，即每 20 个 fast tick 推进 1 天
  // 这里用 dayTick 计数器模拟 long loop 比例
  let dayAdvanced = false;
  if (newState.city.calendar) {
    newState.city.calendar.dayTick = (newState.city.calendar.dayTick ?? 0) + 1;
    if (newState.city.calendar.dayTick >= 20) {
      newState.city.calendar.dayTick = 0;
      dayAdvanced = true;
      newState.city.calendar.day++;
      newState.stats.days = (newState.stats.days ?? 0) + 1;

      const orbitDecayDay = Number(newState.race['orbit_decay'] ?? 0);
      if (orbitDecayDay > 0 && !newState.race['orbit_decayed'] && (newState.stats.days ?? 0) >= orbitDecayDay) {
        newState.race['orbit_decayed'] = true;
        applyOrbitDecayedSideEffects(newState);
        messages.push({
          text: '轨道衰退已经抵达临界点，母星生态崩溃，文明被迫转入太空生存。',
          type: 'info',
          category: 'progress',
        });
      }

      // 每天随机化天气 — 对标 legacy main.js L1222-1265
      randomizeWeather(newState);

      // 月相推进 — 对标 legacy main.js: moon 每天 +1, 到 28 归零
      newState.city.calendar.moon = ((newState.city.calendar.moon ?? 0) + 1) % 28;

      if (maybeGenerateServants(newState)) {
        const servants = newState.race['servants'] as { max?: number; smax?: number };
        const totalServants = (servants.max ?? 0) + (servants.smax ?? 0);
        messages.push({
          text: `有 ${totalServants} 名 Womling 仆从抵达，其中 ${servants.smax ?? 0} 名熟练仆从可用。`,
          type: 'info',
          category: 'events',
        });
      }

      if (newState.city.calendar.day > newState.city.calendar.orbit) {
        newState.city.calendar.day = 1;
        newState.city.calendar.year++;

        // 新年消息
        if (newState.city.calendar.year % 10 === 0) {
          messages.push({
            text: `🎆 进入第 ${newState.city.calendar.year} 年！`,
            type: 'info',
            category: 'calendar',
          });
        }
      }

      // 季节计算（与原版一致：一年分 4 段，按天数判断所处季节）
      const seasonLength = Math.round(newState.city.calendar.orbit / 4);
      let daysLeft = newState.city.calendar.day;
      let season = 0;
      while (daysLeft > seasonLength) {
        daysLeft -= seasonLength;
        season++;
      }
      newState.city.calendar.season = Math.min(season, 3);
    }
  }

  // 统计（days 已在日历推进内更新）

  // ============================================================
  // 12a. 派生状态同步
  // 让排队建造完成后的上限、岗位、显示状态在当前 tick 就保持一致
  // ============================================================
  const derivedResourceSnapshot = snapshotResourceAmounts(newState.resource);
  applyDerivedStateInPlace(newState);
  captureDeferredSettledResourceMutations(
    derivedResourceSnapshot,
    newState.resource,
    (resId) => `库存容量调整：${newState.resource[resId]?.name ?? resId}`,
    '库存容量',
  );
  if (observatorySupported > 0 && newState.resource['Knowledge']) {
    newState.resource['Knowledge'].max += getObservatoryKnowledgeCapBonus(newState, observatorySupported);

    if (newState.race['cataclysm']) {
      const professor = newState.civic['professor'] as { max?: number } | undefined;
      if (professor) {
        professor.max = (professor.max ?? 0) + observatorySupported;
      }
    } else {
      const universities =
        (newState.city['university'] as { count?: number } | undefined)?.count ?? 0;
      if (universities > 0) {
        let universityBase = (newState.tech['science'] ?? 0) >= 8 ? 700 : 500;
        if (hasPlanetTrait(newState, 'permafrost')) {
          universityBase += permafrostVars()[1];
        }
        newState.resource['Knowledge'].max += universities * universityBase * observatorySupported * 0.05;
      }
    }
  }
  const activeBiolabs = powerResult.activeConsumers['biolab'] ?? 0;
  if (activeBiolabs > 0 && newState.resource['Knowledge']) {
    newState.resource['Knowledge'].max += activeBiolabs * 3000;
  }
  const activeWorldControllers = powerResult.activeConsumers['world_controller'] ?? 0;
  if (activeWorldControllers > 0 && newState.resource['Knowledge']) {
    let worldControllerBoost = 0.25;
    if ((newState.tech['science'] ?? 0) >= 19) {
      worldControllerBoost += 0.15;
    }
    const bonus = Math.round(newState.resource['Knowledge'].max * worldControllerBoost * activeWorldControllers);
    newState.resource['Knowledge'].max += bonus;
    newState.tech['wsc'] = 1;
  } else if ((newState.tech['wsc'] ?? 0) !== 0) {
    newState.tech['wsc'] = 0;
  }
  if (exoticLabSupported > 0 && newState.resource['Knowledge']) {
    let exoticScience = 500;
    if (newState.race['cataclysm'] && observatorySupported > 0) {
      exoticScience *= 1 + observatorySupported * 0.25;
    }
    newState.resource['Knowledge'].max += exoticLabSupported * effectiveColonistWorkers * exoticScience;

    if (newState.race['cataclysm'] || newState.race['orbit_decayed']) {
      const scientist = newState.civic['scientist'] as { max?: number } | undefined;
      if (scientist) {
        scientist.max = (scientist.max ?? 0) + exoticLabSupported;
      }
    }
  }

  // 对标 legacy/src/main.js L8888-8892：
  //   - living_quarters 增加 species.max 与 colonist.max
  //   - citizens() 基础值在 cataclysm/orbit_decayed 为 2，否则为 1
  //   - biodome 会为每座 living_quarters 额外增加 0.05/0.1 人口上限
  const colonist = newState.civic['colonist'] as { max?: number; workers?: number } | undefined;
  if (colonist) {
    colonist.max = livingQuartersSupported;
    if ((colonist.workers ?? 0) > colonist.max) {
      const excess = (colonist.workers ?? 0) - colonist.max;
      colonist.workers = colonist.max;
      const unemployed = newState.civic['unemployed'] as { workers?: number } | undefined;
      if (unemployed) {
        unemployed.workers = (unemployed.workers ?? 0) + excess;
      }
    }
  }

  if (livingQuartersSupported > 0) {
    const speciesId = newState.race.species;
    const popRes = newState.resource[speciesId];
    const citizensPerQuarterBase =
      newState.race['cataclysm'] || newState.race['orbit_decayed'] ? 2 : 1;
    const biodomeBonusPerQuarter =
      biodomeSupported > 0
        ? biodomeSupported * ((newState.tech['mars'] ?? 0) >= 6 ? 0.1 : 0.05)
        : 0;
    const citizensPerQuarter = citizensPerQuarterBase + biodomeBonusPerQuarter;
    if (popRes) {
      popRes.max += Math.round(livingQuartersSupported * citizensPerQuarter);
    }
  }
  if (habitatPowered > 0) {
    const speciesId = newState.race.species;
    const popRes = newState.resource[speciesId];
    if (popRes) {
      popRes.max += habitatPowered;
    }
  }

  // 对标 legacy/src/main.js L9769-9770：fabrication 每座获得支援使 craftsman.max +1。
  // craftsman.max 已在 applyDerivedStateInPlace 中被重置为 foundries 数，故此处 += 安全。
  if (fabricationSupported > 0) {
    const craftsman = newState.civic['craftsman'] as { max?: number } | undefined;
    if (craftsman) {
      craftsman.max = (craftsman.max ?? 0) + fabricationSupported;
    }
  }

  // ============================================================
  // 12b. 存储士气数据 — 供 UI 展示
  // ============================================================
  newState.city.morale = moraleResult.breakdown;

  // ============================================================
  // 12c. 存储电力数据 — 供 UI 展示
  // ============================================================
  newState.city.power = {
    generated: powerResult.totalGenerated,
    consumed: powerResult.totalConsumed,
    surplus: powerResult.totalGenerated - powerResult.totalConsumed,
    activeGenerators: powerResult.activeGenerators,
    activeConsumers: powerResult.activeConsumers,
  };
  if ((newState.tech['ascension'] ?? 0) >= 7) {
    newState.tech['ascension'] = (powerResult.activeConsumers['ascension_trigger'] ?? 0) > 0 ? 8 : 7;
  }

  // ============================================================
  // 13. 政体切换冷却推进
  // ============================================================
  tickGovernmentCooldown(newState);

  // ============================================================
  // 13a. 随机事件系统
  // ============================================================
  const randomEventResourceSnapshot = snapshotResourceAmounts(newState.resource);
  const eventMessages = tickEvents(newState);
  captureDeferredSettledResourceMutations(
    randomEventResourceSnapshot,
    newState.resource,
    (resId, amount) => amount >= 0
      ? `随机事件奖励：${newState.resource[resId]?.name ?? resId}`
      : `随机事件损失：${newState.resource[resId]?.name ?? resId}`,
    '随机事件',
  );
  for (const msg of eventMessages) {
    messages.push(msg);
  }

  // ============================================================
  // 14. 军事系统 tick
  // 对标 legacy main.js L8008-8057
  // ============================================================
  if (newState.civic.garrison && newState.civic.garrison.display) {
    // 14a. 士兵训练
    tickTraining(newState, TIME_MULTIPLIER);

    // 14b. 伤兵治愈
    tickHealing(newState, TIME_MULTIPLIER);

    // 14c. 士兵狩猎产出皮毛
    // 对标 legacy main.js L3622: hunting = armyRating(garrisonSize(),'hunting') / 3
    const gSize = garrisonSize(newState);
    if (gSize > 0 && newState.resource.Furs) {
      const hunting = armyRating(gSize, newState) / 3 * getBanquetHuntingMultiplier(newState);
      const fursProd = hunting * TIME_MULTIPLIER;
      if (fursProd > 0) {
        newState.resource.Furs.amount = Math.min(
          newState.resource.Furs.amount + fursProd,
          newState.resource.Furs.max >= 0 ? newState.resource.Furs.max : Infinity
        );
        deltas['Furs'] = (deltas['Furs'] ?? 0) + fursProd;
      }
    }
    captureDeltaSection('军队狩猎');
    markCurrentDeltasSettled();

    // 14d. 厌战衰减
    if (newState.civic.garrison.protest > 0) {
      newState.civic.garrison.protest = Math.max(0, newState.civic.garrison.protest - 0.5 * TIME_MULTIPLIER);
    }
    if (newState.civic.garrison.fatigue > 0) {
      newState.civic.garrison.fatigue = Math.max(0, newState.civic.garrison.fatigue - 0.25 * TIME_MULTIPLIER);
    }
  }

  // ============================================================
  // 14e. 间谍外交通信 tick
  // ============================================================
  const spyResourceSnapshot = snapshotResourceAmounts(newState.resource);
  [0, 1, 2, 3, 4].forEach(govIndex => {
    if (newState.civic.foreign[`gov${govIndex}` as keyof typeof newState.civic.foreign]) {
      const spyMessages = resolveSpyActionTick(newState, govIndex, TIME_MULTIPLIER);
      for (const msg of spyMessages) {
        messages.push(msg);
      }
    }
  });
  captureDeferredSettledResourceMutations(
    spyResourceSnapshot,
    newState.resource,
    (resId, amount) => amount >= 0
      ? `间谍行动收益：${newState.resource[resId]?.name ?? resId}`
      : `间谍行动支出：${newState.resource[resId]?.name ?? resId}`,
    '间谍行动',
  );

  // ============================================================
  // 15. 工厂产线 tick
  // 对标 legacy/src/industry.js f_rate表，工厂 powered = on
  // ============================================================
  const factoryResult = factoryTickDetailed(newState, {
    poweredOn: powerResult.activeConsumers['factory'] ?? 0,
    timeMultiplier: TIME_MULTIPLIER,
    productionModifiers: [
      { label: '士气效率', multiplier: prodMult },
      { label: '饥饿修正', multiplier: hungerMult },
      { label: '行星全局修正', multiplier: planetGlobalMult },
      { label: '占领/统一政策', multiplier: occupyUnifyMult },
    ],
    extraPoweredLines: redFactoryPowered,
    extraMaxLines: redFactoryMaxLines,
    dischargeActive,
    activeCitadels: powerResult.activeConsumers['citadel'] ?? 0,
  });
  for (const [resId, amount] of Object.entries(factoryResult.deltas)) {
    deltas[resId] = (deltas[resId] ?? 0) + amount;
  }
  const factoryTouchedResources = new Set<string>();
  for (const line of factoryResult.lines) {
    const outputName = newState.resource[line.outputResource]?.name ?? line.outputResource;
    const section = `工厂产线：${outputName}`;
    addBreakdownEntry(
      line.outputResource,
      `产线基础产出：${outputName}`,
      line.requestedBaseOutput,
      'source',
      section,
      `${line.requestedLines} 条分配，装配等级 ${line.assemblyLevel}，供电效率 ${Number((line.efficiency * 100).toFixed(2))}%`,
    );
    addBreakdownEntry(
      line.outputResource,
      '可用产线限制',
      line.allocatedBaseOutput - line.requestedBaseOutput,
      'modifier',
      section,
      `${line.allocatedLines}/${line.requestedLines} 条有效分配`,
    );
    addBreakdownEntry(
      line.outputResource,
      '原料供应限制',
      line.materialBaseOutput - line.allocatedBaseOutput,
      'modifier',
      section,
      `${line.effectiveLines}/${line.allocatedLines} 条实际生产`,
    );
    let runningOutput = line.materialBaseOutput;
    for (const modifier of line.modifiers) {
      const nextOutput = runningOutput * modifier.multiplier;
      addBreakdownEntry(
        line.outputResource,
        modifier.label,
        nextOutput - runningOutput,
        'modifier',
        section,
        `x${Number(modifier.multiplier.toFixed(4))}`,
      );
      runningOutput = nextOutput;
    }
    addBreakdownEntry(
      line.outputResource,
      '产物存储上限',
      line.actualOutput - line.theoreticalOutput,
      'modifier',
      section,
      `实际 ${Number(line.actualOutput.toFixed(6))}`,
    );
    factoryTouchedResources.add(line.outputResource);
    for (const input of line.inputs) {
      addBreakdownEntry(
        input.resource,
        `工厂原料：${outputName}`,
        -input.consumption,
        'consume',
        section,
        `${Number(input.amountPerLine.toFixed(6))}/产线`,
      );
      factoryTouchedResources.add(input.resource);
    }
  }
  for (const resId of factoryTouchedResources) {
    lastBreakdownSnapshot[resId] = deltas[resId] ?? 0;
  }
  markCurrentDeltasSettled();

  // ============================================================
  // 15a. Portal 要塞入侵 tick + 建筑产出
  // ============================================================
  if ((newState.tech['portal'] ?? 0) >= 2) {
    const patrolResult = fortressTick(newState, TIME_MULTIPLIER, { runPatrols: dayAdvanced });
    if (patrolResult.gems > 0) eventDeltas['Soul_Gem'] = patrolResult.gems;
    messages.push(...patrolResult.messages);
    portalProductionTick(newState, TIME_MULTIPLIER, deltas);
    captureDeltaSection('Portal 建筑');
    const mechResourceSnapshot = snapshotResourceAmounts(newState.resource);
    mechBuildTick(newState, TIME_MULTIPLIER);
    // Mech Station 巡逻（asphodel mech_station 通电时启用）
    const edenObj = newState.eden as Record<string, { on?: number }>;
    if ((edenObj['mech_station']?.on ?? 0) > 0) {
      mechStationPatrolTick(newState, TIME_MULTIPLIER);
    }
    captureDeferredSettledResourceMutations(
      mechResourceSnapshot,
      newState.resource,
      (resId) => `机甲巡逻：${newState.resource[resId]?.name ?? resId}`,
      '机甲巡逻',
    );
  }

  // ============================================================
  // 15b. 魔法宇宙 tick（Mana 再生 + 炼金转化）
  // ============================================================
  const magicResourceSnapshot = snapshotResourceAmounts(newState.resource);
  magicTick(newState, TIME_MULTIPLIER);
  captureDeferredSettledResourceMutations(
    magicResourceSnapshot,
    newState.resource,
    (resId) => resId === 'Mana' ? '法力恢复' : `炼金转化：${newState.resource[resId]?.name ?? resId}`,
    '魔法宇宙',
  );

  // ============================================================
  // 15b1. Truepath 建筑产出 + 辛迪加海盗骚扰
  // ============================================================
  if (newState.race['truepath']) {
    truepathProductionTick(newState, TIME_MULTIPLIER, deltas);
    captureDeltaSection('Truepath 建筑');
    const syndicateResourceSnapshot = snapshotResourceAmounts(newState.resource);
    syndicateTick(newState, TIME_MULTIPLIER);
    captureDeferredSettledResourceMutations(
      syndicateResourceSnapshot,
      newState.resource,
      (resId, amount) => amount >= 0
        ? `辛迪加事件收益：${newState.resource[resId]?.name ?? resId}`
        : `辛迪加骚扰损失：${newState.resource[resId]?.name ?? resId}`,
      '辛迪加事件',
    );
    womlingTick(newState, TIME_MULTIPLIER, deltas);
    captureDeltaSection('Womling');
  }

  // ============================================================
  // 15c. Edenic tick（神圣腐化进度）+ 建筑产出
  // ============================================================
  if ((newState.tech['edenic'] ?? 0) >= 1) {
    edenicTick(newState, TIME_MULTIPLIER, powerResult.activeConsumers);
    edenicProductionTick(newState, TIME_MULTIPLIER, deltas, powerResult.activeConsumers);
    captureDeltaSection('Edenic 建筑');
    siegeTick(newState, TIME_MULTIPLIER);
  }

  // ============================================================
  // 15d. 总督自动化任务
  // ============================================================
  if (newState.race['governor']) {
    const governorResourceSnapshot = snapshotResourceAmounts(newState.resource);
    runGovernorTasks(newState);
    captureDeferredSettledResourceMutations(
      governorResourceSnapshot,
      newState.resource,
      (resId, amount) => amount >= 0
        ? `总督自动化：${newState.resource[resId]?.name ?? resId}`
        : `总督自动支出：${newState.resource[resId]?.name ?? resId}`,
      '总督自动化',
    );
  }

  if (dayAdvanced) advanceBanquetStrength(newState);

  syncSeasonalEventState(newState);

  // ============================================================
  // 15e. 成就自动检查（每 tick 简化版；高频检查不会显著影响性能）
  // ============================================================
  checkAchievements(newState);

  // ============================================================
  // 15f. 复杂 trait 持续效果（unstable 死亡 / wish 冷却等）
  // ============================================================
  const complexTraitResourceSnapshot = snapshotResourceAmounts(newState.resource);
  complexTraitTick(newState, TIME_MULTIPLIER);
  captureDeferredSettledResourceMutations(
    complexTraitResourceSnapshot,
    newState.resource,
    (resId, amount) => amount < 0
      ? `trait 损耗：${newState.resource[resId]?.name ?? resId}`
      : `trait 产出：${newState.resource[resId]?.name ?? resId}`,
    '复杂 trait',
  );

  // ============================================================
  // 15f1. Pet 宠物 tick
  // ============================================================
  petTick(newState, TIME_MULTIPLIER);

  // ============================================================
  // 15g. 应用全局 trait 乘数到所有产出 delta（selenophobia 月相、pillar、shapeshifter）
  // ============================================================
  const seleno = getSelenophobiaMultiplier(newState);
  const pillarBonus = ((newState.race as Record<string, unknown>)['_pillar_bonus'] as number) ?? 1;
  const globalTraitMul = seleno * pillarBonus;
  if (globalTraitMul !== 1) {
    const beforeTraitDeltas: Record<string, number> = {};
    for (const resId of Object.keys(deltas)) {
      beforeTraitDeltas[resId] = deltas[resId];
    }
    for (const resId of Object.keys(deltas)) {
      if (deltas[resId] > 0) {
        deltas[resId] *= globalTraitMul;
      }
    }
    for (const resId of Object.keys(deltas)) {
      const amount = deltas[resId] - (beforeTraitDeltas[resId] ?? 0);
      if (Math.abs(amount) >= 1e-9) {
        addBreakdownEntry(resId, '全局 trait 修正', amount, 'modifier', '全局 trait', `x${globalTraitMul.toFixed(3)}`);
        lastBreakdownSnapshot[resId] = deltas[resId];
      }
    }
  }
  for (const [resId, delta] of Object.entries(eventDeltas)) {
    deltas[resId] = (deltas[resId] ?? 0) + delta;
    settledDeltas[resId] = (settledDeltas[resId] ?? 0) + delta;
    addBreakdownEntry(resId, '事件掉落', delta, 'source', 'Portal 巡逻');
    lastBreakdownSnapshot[resId] = deltas[resId];
  }

  // ============================================================
  // 16. ARPA 长线研究 tick
  // ============================================================
  const arpaResourceSnapshot = snapshotResourceAmounts(newState.resource);
  const arpaDone = arpaTick(newState, TIME_MULTIPLIER);
  captureDeferredSettledResourceMutations(
    arpaResourceSnapshot,
    newState.resource,
    (resId) => `ARPA 项目投入：${newState.resource[resId]?.name ?? resId}`,
    'ARPA',
  );
  for (const projId of arpaDone) {
    const names: Record<string, string> = {
      launch_facility: '发射设施',
      monument: '纪念碑',
      stock_exchange: '证券交易所',
    };
    messages.push({
      text: `🏛️ ARPA 完成：${names[projId] ?? projId}！`,
      type: 'special',
      category: 'progress',
    });
  }

  const geneResourceSnapshot = snapshotResourceAmounts(newState.resource);
  const geneResult = geneSequenceTick(
    newState,
    powerResult.activeConsumers['biolab'] ?? 0,
    TIME_MULTIPLIER,
  );
  captureDeferredSettledResourceMutations(
    geneResourceSnapshot,
    newState.resource,
    (resId, amount) => amount < 0
      ? '基因序列研究'
      : `基因治疗奖励：${newState.resource[resId]?.name ?? resId}`,
    '基因工程',
  );
  if (geneResult.completed === 'genome') {
    messages.push({
      text: '基因组测序已经完成。',
      type: 'success',
      category: 'progress',
    });
  } else if (geneResult.completed === 'mutation') {
    const prestigeName = geneResult.prestigeType === 'AntiPlasmid' ? '反质粒' : '质粒';
    messages.push({
      text: `基因疗法完成：获得 ${geneResult.traitName} 特质、${geneResult.genes} 基因和 ${geneResult.prestige} ${prestigeName}。`,
      type: 'success',
      category: 'progress',
    });
  }

  flushDeferredSettledDeltas();
  settlePendingDeltas(newState.resource);

  // 14-16 阶段仍可能继续改写 deltas；在返回前统一回填最终 diff。
  for (const [resId, delta] of Object.entries(deltas)) {
    if (newState.resource[resId]) {
      newState.resource[resId].diff = delta;
    }
  }
  const resourceBreakdowns = buildBreakdowns(newState.resource);
  for (const [resId, breakdown] of Object.entries(resourceBreakdowns)) {
    if (newState.resource[resId]) {
      newState.resource[resId].breakdown = breakdown;
    }
  }

  return {
    state: newState,
    result: {
      resourceDeltas: deltas,
      resourceBreakdowns,
      messages,
    },
  };
}

// ============================================================
// 辅助函数
// ============================================================

function getPopulation(state: GameState): number {
  const species = state.race.species;
  return state.resource[species]?.amount ?? 0;
}

function removeOneCitizen(state: GameState): void {
  const species = state.race.species;
  const popRes = state.resource[species];
  if (!popRes || popRes.amount <= 1) return;

  popRes.amount = Math.max(1, popRes.amount - 1);

  const jobPriority = [
    'unemployed',
    'banker',
    'entertainer',
    'professor',
    'scientist',
    'priest',
    'craftsman',
    'cement_worker',
    'miner',
    'coal_miner',
    'colonist',
    'lumberjack',
    'quarry_worker',
    'garrison',
    'hunter',
    'farmer',
  ];

  for (const jobId of jobPriority) {
    const job = state.civic[jobId] as { workers?: number } | undefined;
    if ((job?.workers ?? 0) > 0) {
      job!.workers = (job!.workers ?? 0) - 1;
      if (jobId === 'garrison') {
        const garrison = state.civic.garrison;
        garrison.wounded = Math.min(garrison.wounded, garrison.workers);
        const available = Math.max(0, garrison.workers - garrison.crew);
        garrison.raid = Math.min(garrison.raid, available);
      }
      return;
    }
  }
}

/**
 * 原版人口自然增长 (Birth Rate)
 * 处理自然人口随进度条增涨并填充空闲住房的逻辑。
 */
function tickPopulationGrowth(state: GameState, timeMultiplier: number, messages: GameMessage[]): void {
  const species = state.race.species;
  const popRes = state.resource[species];
  if (!popRes) return;

  const currentPop = popRes.amount;
  const maxPop = popRes.max;

  // 已达人口上限，停止生长
  if (currentPop >= maxPop) return;

  // 饥饿判定: 需要有食物储备才增加人口
  // 按照原版逻辑，有 fasting 等特质时允许无食物繁衍，这里先简化接入
  const food = state.resource['Food'];
  if (food && food.amount <= 0 && !state.race['fasting']) return;

  // 基础繁殖下限概率由 reproduction 科技决定
  let lowerBound = Number(state.tech['reproduction'] ?? 0);
  let upperBound = currentPop;

  // 繁衍科技 >= 2 且有医院，增加 lowerBound
  if (Number(state.tech['reproduction'] ?? 0) >= 2) {
    const hospitalCount = (state.city['hospital'] as { count?: number })?.count ?? 0;
    lowerBound += hospitalCount;
  }

  // TODO: 后续可接入各种族特质加成 (fast_growth, spores, promiscuous)

  // 概率衰减曲线: 随着运行逐渐降低实际命中概率
  lowerBound *= getBanquetBirthMultiplier(state);
  upperBound *= (3 - Math.pow(2, timeMultiplier));
  
  // 原版采用 Math.rand(0, upperBound) = Math.floor(Math.random() * upperBound)
  // 范围 [0, upperBound)
  const randVal = Math.floor(Math.random() * upperBound);
  
  if (randVal <= lowerBound) {
    popRes.amount += 1;
    
    // 分配到默认岗位（原版 L3972: global.civic[global.civic.d_job].workers++）
    const defaultJob = typeof state.civic.d_job === 'string' ? state.civic.d_job : 'unemployed';
    const jobSlot = state.civic[defaultJob] as { workers?: number } | undefined;
    if (jobSlot) {
      jobSlot.workers = (jobSlot.workers ?? 0) + 1;
    }

    messages.push({
      text: `一位新市民加入了你的部落！人口: ${popRes.amount}`,
      type: 'success',
      category: 'progress'
    });
  }
}

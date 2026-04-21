/**
 * 游戏主循环 / Tick 逻辑
 * 完整资源产出、消耗、建筑加成
 *
 * 严格对标 legacy/src/main.js 原版公式。
 * 所有产出/消耗值在最终应用前统一乘以 time_multiplier = 0.25
 * （原版 main.js L1213）。
 */

import type { GameState, GameTickResult, GameMessage } from '@evozen/shared-types';
import { craftingTickWithSupport } from './crafting';
import { tradeTick } from './trade';
import {
  getTaxMultiplier,
  getKnowledgeMultiplier,
  getBankerImpactMultiplier,
  getCasinoIncomeMultiplier,
  getTourismIncomeMultiplier,
  getFactoryOutputMultiplier,
  tickGovernmentCooldown,
} from './government';
import { BASIC_STRUCTURES } from './structures';
import { RESOURCE_VALUES } from './resources';
import { getProfessorTraitBonus, getTaxIncomeTraitMultiplier, getHungerMultiplier } from './traits';
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
import {
  getSatelliteScientistImpactMultiplier,
  getObservatoryKnowledgeCapBonus,
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

/**
 * 执行单个游戏 tick
 * 纯函数：接收当前状态 → 返回新状态 + 事件
 */
export function gameTick(state: GameState): { state: GameState; result: GameTickResult } {
  const messages: GameMessage[] = [];
  const deltas: Record<string, number> = {};

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
    }
    if (newEvoState.resource['DNA']) {
      deltas['DNA'] = finalDNA - initialDNA;
      newEvoState.resource['DNA'].diff = finalDNA - initialDNA;
    }

    return {
      state: newEvoState,
      result: { resourceDeltas: deltas, messages },
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

  // ============================================================
  // 0a. 电力网格
  // ============================================================
  // 在资源产出计算前执行电力分配，确定用电建筑实际开启数
  const powerResult = powerTick(state);
  // 合入燃料消耗 delta
  for (const [resId, delta] of Object.entries(powerResult.fuelDeltas)) {
    deltas[resId] = (deltas[resId] ?? 0) + delta;
  }
  // 用电建筑实际开启数（含 city + space）
  const poweredOn = powerResult.activeConsumers;

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
  const habitatPowered = interstellarSupport.supplierEffectiveOn['habitat'] ?? 0;
  const miningDroidSupported = interstellarSupport.supportOn['mining_droid'] ?? 0;
  const miningDroid = state.interstellar['mining_droid'] as
    | { count?: number; on?: number; adam?: number }
    | undefined;
  if (miningDroidSupported > 0 && miningDroid) {
    const requestedMiningDroids = miningDroid.on ?? miningDroid.count ?? 0;
    const supportEff = requestedMiningDroids > 0 ? miningDroidSupported / requestedMiningDroids : 0;
    const adamantiteDroids = (miningDroid.adam ?? 0) * supportEff;
    if (adamantiteDroids > 0) {
      let processingBonus = 0;
      const processingSupported = interstellarSupport.supportOn['processing'] ?? 0;
      if (processingSupported > 0) {
        processingBonus = processingSupported * 0.12;
      }
      deltas['Adamantite'] = (deltas['Adamantite'] ?? 0) + adamantiteDroids * 0.075 * (1 + processingBonus);
    }
  }

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

  // ============================================================
  // 0. 士气 & 全局乘数
  // ============================================================
  // 对标 legacy/src/main.js L1286-3290:
  // morale 决定 global_multiplier，影响所有工人产出
  const moraleResult = calculateMorale(state, {
    activeCasinos: poweredOn['casino'] ?? 0,
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
  const effectiveProdMult = prodMult * hungerMult * planetGlobalMult;

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
  let foodMult = 1 + mills * millBonus;
  
  // trashed 行星特性：农业产出 ×0.75
  foodMult *= getFarmPlanetMultiplier(state);
  const farmerFood = farmerFoodBase * foodMult;

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

  deltas['Food'] =
    (hunterFood * rageHuntMult + farmerFood * weatherFoodMult) * prodMult * planetGlobalMult
    + biodomeFood * prodMult
    - foodConsumption
    - tourismFoodDemand;

  // ============================================================
  // 2. 毛皮（猎人副产品）
  // ============================================================
  deltas['Furs'] = hunterFurs * rageHuntMult;

  // ============================================================
  // 3. 木材 — 伐木工
  // ============================================================
  // 原版 main.js L5540-5559:
  // lumber_base = workers * impact(1.0)
  // axe bonus: (axe > 1 ? (axe-1) * 0.35 : 0) + 1  ← 只有 axe level 2+ 才有
  // lumber_yard: +2%/座
  const lumberjacks = workers('lumberjack');
  let lumberBase = 1;  // impact = 1.0
  // 石斧科技加成 — 原版 main.js L5559: axe > 1 才有加成
  const axeLevel = techLevel('axe');
  if (axeLevel > 1) {
    lumberBase *= 1 + (axeLevel - 1) * 0.35;
  }
  // 伐木场加成 +2%/座（原版 main.js L5575-5576）
  const lumberYards = structCount('lumber_yard');
  const sawmills = structCount('sawmill');
  const activeSawmills = poweredOn['sawmill'] ?? 0;
  const sawmillBonus = techLevel('saw') >= 2 ? 0.08 : 0.05;
  // legacy 这里是分段相乘，不是把 lumber_yard 与 sawmill 直接加到同一个线性项里
  let lumberMult = (1 + lumberYards * 0.02) * (1 + sawmills * sawmillBonus);
  if (activeSawmills > 0) {
    lumberMult *= 1 + activeSawmills * 0.04;
  }
  deltas['Lumber'] = lumberjacks * lumberBase * lumberMult * effectiveProdMult;

  // ============================================================
  // 4. 石头 — 石工
  // ============================================================
  // 原版 main.js L5663-5677: impact = 1.0（不是 0.8）
  const quarryWorkers = workers('quarry_worker');
  let stoneBase = 1.0;  // quarry_worker.impact = 1.0
  // hammer 科技加成 — 原版 jobs.js L119: 每级 hammer +40%
  const hammerLevel = techLevel('hammer');
  if (hammerLevel > 0) {
    stoneBase *= 1 + hammerLevel * 0.4;
  }
  // 炸药科技加成 — 原版 main.js: explosives >= 2 时采石场/铝精炼基础产量 + (tech * 25%)
  const quarryExplosiveMult = explosiveLevel >= 2 ? 1 + explosiveLevel * 0.25 : 1;
  stoneBase *= quarryExplosiveMult;
  // 采石场加成 +2%/座（原版 main.js L5744-5745）
  const quarries = structCount('rock_quarry');
  const activeQuarries = poweredOn['rock_quarry'] ?? 0;
  let stoneMult = 1 + quarries * 0.02;
  let quarryPowerMult = 1;
  if (activeQuarries > 0) {
    quarryPowerMult += activeQuarries * 0.04;
  }
  deltas['Stone'] = quarryWorkers * stoneBase * stoneMult * quarryPowerMult * effectiveProdMult;

  // ============================================================
  // 4.5 铝 — 采石副产物 (Aluminium)
  // ============================================================
  // 原版 main.js L5834-5904: 采石产生的铝副产品
  const refineries = structCount('metal_refinery');
  if (refineries > 0) {
    const alumRatio = 0.08;
    let alumBase = quarryWorkers * stoneBase * alumRatio;
    
    // 行星地质特征加成
    if (state.city.geology?.['Aluminium']) {
      alumBase *= 1 + state.city.geology['Aluminium'];
    }

    let alumDelta = alumBase * stoneMult * quarryPowerMult * effectiveProdMult;

    // 金属精炼厂加成: +6%/座
    let refineryMult = 1 + refineries * 0.06;
    // 如果研发了 alumina >= 2，通电的精炼厂额外 +6%/座
    if (techLevel('alumina') >= 2) {
      const activeRefineries = poweredOn['metal_refinery'] ?? 0;
      refineryMult += activeRefineries * 0.06;
    }
    alumDelta *= refineryMult;
    deltas['Aluminium'] = alumDelta;
  }

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
  const minePowerMult = activeMines > 0 ? 1 + activeMines * 0.05 : 1;
  // dense/permafrost/magnetic 行星特性：影响矿工产出
  const minerPlanetMult = getMinerPlanetMultiplier(state);
  const copperGeologyMult = 1 + (state.city.geology?.['Copper'] ?? 0);
  const ironGeologyMult = 1 + (state.city.geology?.['Iron'] ?? 0);
  deltas['Copper'] = actualMiners * (1 / 7) * minerToolMult * minerExplosiveMult * minePowerMult * copperGeologyMult * minerPlanetMult * effectiveProdMult;

  if (techLevel('mining') >= 3) {
    deltas['Iron'] = actualMiners * 0.25 * minerToolMult * minerExplosiveMult * minePowerMult * ironGeologyMult * minerPlanetMult * effectiveProdMult;
  }

  // ============================================================
  // 6. 煤炭 — 煤矿工人
  // ============================================================
  const actualCoalMiners = workers('coal_miner');
  const coalToolMult = 1 + pickaxeLevel * 0.12;
  const activeCoalMines = poweredOn['coal_mine'] ?? 0;
  const coalPowerMult = activeCoalMines > 0 ? 1 + activeCoalMines * 0.05 : 1;
  const coalGeologyMult = 1 + (state.city.geology?.['Coal'] ?? 0);
  deltas['Coal'] = actualCoalMiners * 0.2 * coalToolMult * minerExplosiveMult * coalPowerMult * coalGeologyMult * effectiveProdMult;

  // 铀 — 煤矿副产物
  // 对标 legacy main.js L6595: uranium = coal_delta / 115
  if (techLevel('uranium') >= 1 && deltas['Coal'] > 0) {
    let uraniumDelta = deltas['Coal'] / 115;
    const geologyBonus = state.city.geology?.['Uranium'] ?? 0;
    if (geologyBonus) {
      uraniumDelta *= geologyBonus + 1;
    }
    deltas['Uranium'] = uraniumDelta;
  }

  // ============================================================
  // 7. 水泥 — 水泥工人（消耗石头）
  // ============================================================
  const cementWorkers = workers('cement_worker');
  if (cementWorkers > 0) {
    const stonePerCement = 3;
    // 实际可用的石头限制水泥产出
    const availableStone = (state.resource['Stone']?.amount ?? 0) + (deltas['Stone'] ?? 0);
    const maxByStone = Math.floor(availableStone / stonePerCement);
    const effectiveCement = Math.min(cementWorkers, maxByStone);
    const cementLevel = techLevel('cement');
    const cementTechMult = cementLevel >= 7 ? 1.45 : (cementLevel >= 4 ? 1.2 : 1);
    const activeCementPlants = poweredOn['cement_plant'] ?? 0;
    const cementPowerRate = cementLevel >= 6 ? 0.08 : 0.05;
    const cementPowerMult = activeCementPlants > 0 ? 1 + activeCementPlants * cementPowerRate : 1;
    deltas['Cement'] = effectiveCement * 0.4 * cementTechMult * cementPowerMult * effectiveProdMult;
    deltas['Stone'] = (deltas['Stone'] ?? 0) - effectiveCement * stonePerCement;
  }

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
  let profImpact = 0.5 + getProfessorTraitBonus(state) + libraries * 0.01;
  if (techLevel('anthropology') >= 3) {
    profImpact *= 1 + structCount('temple') * 0.05;
  }
  // 神权政体惩罚——原版 main.js L4183-4184:
  // if (govern.type === 'theocracy') professors_base *= 1 - (govEffect.theocracy()[1] / 100)
  const profGovMult = getKnowledgeMultiplier(state, 'professor');
  const professorsBase = professors * profImpact * profGovMult;
  // 科学家产出 — impact = 1.0
  let sciImpact = 1.0;
  const activeWardenclyffes = poweredOn['wardenclyffe'] ?? 0;
  if (techLevel('science') >= 6 && activeWardenclyffes > 0) {
    sciImpact *= 1 + professors * activeWardenclyffes * 0.01;
  }
  // 卫星加成——原版 main.js L4197-4199:
  // if (global.space['satellite']) scientist_base *= 1 + (satellite.count * 0.01)
  sciImpact *= getSatelliteScientistImpactMultiplier(state);
  // cataclysm 分支下，月球观测站还会放大科学家产出。
  if (state.race['cataclysm'] && observatorySupported > 0) {
    sciImpact *= 1 + observatorySupported * 0.25;
  }
  // 神权政体惩罚——原版 main.js L4200-4201:
  // if (govern.type === 'theocracy') scientist_base *= 1 - (govEffect.theocracy()[2] / 100)
  const sciGovMult = getKnowledgeMultiplier(state, 'scientist');
  const scientistBase = scientists * sciImpact * sciGovMult;
  // 图书馆全局加成 — 原版 main.js L4259
  const libraryMult = 1 + libraries * 0.05;
  // 教授+科学家受饥饿影响；日晷不受（原版 L4228-4229）
  const workerKnowledge = (professorsBase + scientistBase) * libraryMult;
  // legacy 先把教授/科学家与日晷相加，再只对前者套用 library multiplier；
  // 日晷知识不受图书馆加成影响。
  const sundialKnowledge = sundialBase + sundialPlanet;
  deltas['Knowledge'] = workerKnowledge * effectiveProdMult + sundialKnowledge * prodMult * planetGlobalMult;

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
    deltas['Faith'] = (deltas['Faith'] ?? 0) + faithRate;
  }

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
    const taxMoneyMult = prodMult * hungerMult * planetGlobalMult;
    // 原版 L7587: citizens = pop + soldiers - unemployed
    const citizens = pop + soldiers - unemployed;
    let incomeBase = citizens * 0.4;  // 原版 L7592, non-truepath
    // 银行家加成只在“已喂饱 fed”时生效 — 原版 L7601
    if ((state.resource['Food']?.amount ?? 0) > 0 && techLevel('banking') >= 2 && bankers > 0) {
      let bankerImpact = 0.1;  // 基础 impact
      if (techLevel('banking') >= 10) {
        bankerImpact += 0.02 * techLevel('stock_exchange');
      }
      bankerImpact *= getBankerImpactMultiplier(state);
      incomeBase *= 1 + bankers * bankerImpact;
    }
    incomeBase *= getTaxIncomeTraitMultiplier(state);
    incomeBase *= taxRate / 20;  // 原版 L7626
    incomeBase *= getTaxMultiplier(state);

    // anthropology:4 开始，每座神庙使税收 +2.5%
    let templeTaxMult = 1;
    if (techLevel('anthropology') >= 4) {
      templeTaxMult += structCount('temple') * 0.025;
    }

    deltas['Money'] = incomeBase * templeTaxMult * taxMoneyMult;

    // 赌场收入 — 对标 legacy main.js L7674-7684
    const activeCasinos = poweredOn['casino'] ?? 0;
    if (techLevel('gambling') >= 1 && activeCasinos > 0) {
      deltas['Money'] += activeCasinos
        * getCasinoIncomePerActive(state)
        * getCasinoIncomeMultiplier(state)
        * taxMoneyMult;
    }

    // 旅游收入 — 对标 legacy main.js L7687-7728（当前阶段只保留已实装的贡献项）
    if (touristCenters > 0) {
      deltas['Money'] += getTourismIncome(state, touristCenters)
        * getTourismIncomeMultiplier(state)
        * taxMoneyMult;
    }
  }

  // ============================================================
  // 9a. 冶金系统 (Metallurgy) — 对标 legacy main.js L4842-5146
  // ============================================================
  const smelterState = state.city.smelter;
  if (smelterState && smelterState.count > 0) {
    let woodFuel = smelterState.Wood ?? 0;
    let coalFuel = smelterState.Coal ?? 0;
    let oilFuel = smelterState.Oil ?? 0;

    let ironSmelter = smelterState.Iron ?? 0;
    let steelSmelter = smelterState.Steel ?? 0;
    const iridiumSmelter = smelterState.Iridium ?? 0;

    const availableLumber = (state.resource['Lumber']?.amount ?? 0) / TIME_MULTIPLIER;
    const availableCoal = (state.resource['Coal']?.amount ?? 0) / TIME_MULTIPLIER;
    const availableOil = (state.resource['Oil']?.amount ?? 0) / TIME_MULTIPLIER;

    const lumberCost = 3;
    const coalCost = 1;
    const oilCost = 1;

    // 处理实际能够工作的燃料槽
    const maxWoodOperable = Math.max(0, Math.floor(availableLumber / lumberCost));
    if (maxWoodOperable < woodFuel) {
      woodFuel = maxWoodOperable;
    }
    const maxCoalOperable = Math.max(0, Math.floor(availableCoal / coalCost));
    if (maxCoalOperable < coalFuel) {
      coalFuel = maxCoalOperable;
    }
    const maxOilOperable = Math.max(0, Math.floor(availableOil / oilCost));
    if (maxOilOperable < oilFuel) {
      oilFuel = maxOilOperable;
    }

    const totalFuel = woodFuel + coalFuel + oilFuel;

    // 当配置产出 > 实际提供的燃料数时做自动降级
    // 对标 legacy main.js L4993-5004: 先降钢，再降铁，最后降铱
    let overage = ironSmelter + steelSmelter + iridiumSmelter - totalFuel;
    if (overage > 0) {
      const disableSteel = Math.min(overage, steelSmelter);
      steelSmelter -= disableSteel;
      overage -= disableSteel;

      const disableIron = Math.min(overage, ironSmelter);
      ironSmelter -= disableIron;

      // 极端情况：iridium 也不够
    } else if (overage < 0) {
      // 原版默认会将多余的所有燃料强行塞入产铁
      ironSmelter += Math.abs(overage);
    }

    // 扣除燃料
    deltas['Lumber'] = (deltas['Lumber'] ?? 0) - woodFuel * lumberCost;
    deltas['Coal'] = (deltas['Coal'] ?? 0) - coalFuel * coalCost;
    deltas['Oil'] = (deltas['Oil'] ?? 0) - oilFuel * oilCost;

    // 产出铁 (不受全员效率影响，定额产出)
    const ironBlast = techLevel('smelting') >= 3 ? 1.2 : 1;
    const ironAdvanced = techLevel('smelting') >= 7 ? 1.25 : 1;
    deltas['Iron'] = (deltas['Iron'] ?? 0) + ironSmelter * ironBlast * ironAdvanced;

    // 产出钢
    if (techLevel('smelting') >= 2 && steelSmelter > 0) {
      let ironConsume = steelSmelter * 2;
      let coalConsume = steelSmelter * 0.25;

      const availIron = (state.resource['Iron']?.amount ?? 0) / TIME_MULTIPLIER;
      const availCoal = (state.resource['Coal']?.amount ?? 0) / TIME_MULTIPLIER;

      // 验证库存，削减无效配额
      while ((ironConsume > availIron && ironConsume > 0) || (coalConsume > availCoal && coalConsume > 0)) {
        ironConsume -= 2;
        coalConsume -= 0.25;
        steelSmelter--;
      }

      deltas['Iron'] = (deltas['Iron'] ?? 0) - ironConsume;
      deltas['Coal'] = (deltas['Coal'] ?? 0) - coalConsume;

      let steelBase = 1;
      for (let i = 4; i <= 6; i++) {
        if (techLevel('smelting') >= i) steelBase *= 1.2;
      }
      if (techLevel('smelting') >= 7) steelBase *= 1.25;

      // 原版：钢的合成受全局效率 (effectiveProdMult) 加成
      const steelOutput = steelSmelter * steelBase * effectiveProdMult;
      deltas['Steel'] = (deltas['Steel'] ?? 0) + steelOutput;

      // 钛副产物
      if (techLevel('titanium') >= 1) {
        const titaniumDivisor = techLevel('titanium') >= 3 ? 10 : 25;
        deltas['Titanium'] = (deltas['Titanium'] ?? 0) + steelOutput / titaniumDivisor;
      }
    }
  }

  // ============================================================
  // 9b. 石油产出 — 对标 legacy main.js L6720-6760
  // ============================================================
  const oilWells = structCount('oil_well');
  if (oilWells > 0 && techLevel('oil') >= 1) {
    let oilPerWell = techLevel('oil') >= 4 ? 0.48 : 0.4;
    if (techLevel('oil') >= 7) {
      oilPerWell *= 2;
    } else if (techLevel('oil') >= 5) {
      oilPerWell *= techLevel('oil') >= 6 ? 1.75 : 1.25;
    }
    oilPerWell *= 1 + (state.city.geology?.['Oil'] ?? 0);
    deltas['Oil'] = (deltas['Oil'] ?? 0) + oilWells * oilPerWell * effectiveProdMult;
  }

  const metalRefineries = structCount('metal_refinery');
  if (metalRefineries > 0 && actualMiners > 0) {
    let refineryBonus = metalRefineries * 6;
    const activeRefineries = poweredOn['metal_refinery'] ?? 0;
    if (techLevel('alumina') >= 2 && activeRefineries > 0) {
      refineryBonus += activeRefineries * 6;
    }

    const aluminiumGeologyMult = 1 + (state.city.geology?.['Aluminium'] ?? 0);
    const aluminiumBase =
      actualMiners
      * minerToolMult
      * minerExplosiveMult
      * minePowerMult
      * 0.088
      * aluminiumGeologyMult
      * minerPlanetMult;

    deltas['Aluminium'] =
      (deltas['Aluminium'] ?? 0)
      + aluminiumBase * (1 + refineryBonus / 100) * effectiveProdMult;
  }

  // ============================================================
  // 9c. 深空建筑产出分段 — 对标 legacy/src/prod.js
  // ============================================================
  // gas_mining (He3 采集船) — prod.js L340-375
  const gasShipCount = (state.space['gas_mining'] as { on?: number } | undefined)?.on ?? 0;
  if (gasShipCount > 0) {
    const gasTech = techLevel('helium');
    let gasRate = 0.5;
    if (gasTech >= 4) gasRate = 0.65;
    if (gasTech >= 5) gasRate = 0.85;
    deltas['Helium_3'] = (deltas['Helium_3'] ?? 0) + gasShipCount * gasRate;
  }

  // oil_extractor (气态卫星石油) — prod.js L395-425
  const oilExtractorCount = (state.space['oil_extractor'] as { on?: number } | undefined)?.on ?? 0;
  if (oilExtractorCount > 0) {
    const gasMoonTech = techLevel('gas_moon');
    let extractRate = 0.18;
    if (gasMoonTech >= 3) extractRate = 0.24;
    if (gasMoonTech >= 5) extractRate = 0.312;
    deltas['Oil'] = (deltas['Oil'] ?? 0) + oilExtractorCount * extractRate;
  }

  // space_station (小行星带) belt_mining — prod.js L430-460
  const stationCount = (state.space['space_station'] as { on?: number } | undefined)?.on ?? 0;
  if (stationCount > 0) {
    const asteroidTech = techLevel('asteroid');
    let beltRate = 0.12;
    if (asteroidTech >= 5) beltRate = 0.18;
    if (asteroidTech >= 6) beltRate = 0.28;
    const beltMining = stationCount * beltRate;
    deltas['Iron'] = (deltas['Iron'] ?? 0) + beltMining;

    // Elerium 随机发现事件 — 对标 legacy main.js L10875-10895
    // 当 asteroid=3 且矿船活跃时，以概率 beltMining/250 触发 asteroid:4
    if (asteroidTech === 3 && beltMining > 0) {
      if (Math.random() * 250 <= beltMining) {
        const next = state as GameState;
        next.tech['asteroid'] = 4;
        if (!next.resource['Elerium']) {
          next.resource['Elerium'] = { name: 'Elerium', amount: 0, max: 100, display: true, diff: 0, value: 0, rate: 0, crates: 0, delta: 0 };
        } else {
          next.resource['Elerium'].display = true;
        }
        messages.push({
          text: '⚛️ 矿船在小行星带发现了超铀元素——Elerium！',
          type: 'info',
          category: 'progress',
        });
      }
    }
  }

  // ============================================================
  // 10a. 工匠合成产线（自动消耗原料、产出合成品）
  // ============================================================
  const craftDeltas = craftingTickWithSupport(
    state,
    fabricationSupported,
    effectiveColonistWorkers,
  );
  for (const [resId, delta] of Object.entries(craftDeltas)) {
    deltas[resId] = (deltas[resId] ?? 0) + delta;
  }

  // ============================================================
  // 10b. 贸易路线自动执行
  // ============================================================
  const tradeDeltas = tradeTick(state);
  for (const [resId, delta] of Object.entries(tradeDeltas)) {
    deltas[resId] = (deltas[resId] ?? 0) + delta;
  }

  // 对标 legacy/src/main.js L2406-2410：每座 powered red_factory 额外消耗 1 Helium_3/tick。
  if (redFactoryPowered > 0) {
    deltas['Helium_3'] = (deltas['Helium_3'] ?? 0) - redFactoryPowered;
  }

  // ============================================================
  // 10. 应用 time_multiplier 并写入状态
  // ============================================================
  // 原版 main.js L1213: var time_multiplier = 0.25;
  // 所有 modRes() 调用均乘以此值。
  for (const resId of Object.keys(deltas)) {
    deltas[resId] *= TIME_MULTIPLIER;
  }

  const newState: GameState = JSON.parse(JSON.stringify(state));

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

  // 没有 delta 的资源 diff 归零
  for (const [resId, res] of Object.entries(newState.resource)) {
    if (!Object.prototype.hasOwnProperty.call(deltas, resId)) {
      res.diff = 0;
    }
  }

  // ============================================================
  // 10c. 建造队列处理
  // ============================================================
  if (newState.queue?.queue && newState.queue.queue.length > 0) {
    const item = newState.queue.queue[0];
    const def = BASIC_STRUCTURES.find(d => d.id === item.id);
    if (def) {
      const structObj = newState.city[item.id] as { count?: number } | undefined;
      const currCount = structObj?.count ?? 0;
      
      let finished = true;
      for (const [resId, costFunc] of Object.entries(def.costs)) {
        const reqAmount = costFunc(newState, currCount);
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
        const building = newState.city[item.id] as { count: number; on?: number };
        building.count++;
        if (building.on !== undefined) {
          building.on++;
        }

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
  }

  // ============================================================
  // 10.5 人口自然增长 (Pop Spawn)
  // ============================================================
  tickPopulationGrowth(newState, TIME_MULTIPLIER, messages);

  // ============================================================
  // 11. 饥荒效果：食物 0 且负产出时人口减少
  // ============================================================
  if (newState.resource['Food']?.amount === 0 && (deltas['Food'] ?? 0) < 0) {
    if (getPopulation(newState) > 1) {
      // 每 tick 0.5% 概率死亡
      if (Math.random() < 0.005) {
        removeOneCitizen(newState);
        messages.push({
          text: '💀 一名市民因饥饿而死亡！',
          type: 'danger',
          category: 'progress',
        });
      }
    }
  }

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
  if (newState.city.calendar) {
    newState.city.calendar.dayTick = (newState.city.calendar.dayTick ?? 0) + 1;
    if (newState.city.calendar.dayTick >= 20) {
      newState.city.calendar.dayTick = 0;
      newState.city.calendar.day++;
      newState.stats.days = (newState.stats.days ?? 0) + 1;

      // 每天随机化天气 — 对标 legacy main.js L1222-1265
      randomizeWeather(newState);

      // 月相推进 — 对标 legacy main.js: moon 每天 +1, 到 28 归零
      newState.city.calendar.moon = ((newState.city.calendar.moon ?? 0) + 1) % 28;

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
  applyDerivedStateInPlace(newState);
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

  // ============================================================
  // 13. 政体切换冷却推进
  // ============================================================
  tickGovernmentCooldown(newState);

  // ============================================================
  // 13a. 随机事件系统
  // ============================================================
  const eventMessages = tickEvents(newState);
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
      const hunting = armyRating(gSize, newState) / 3;
      const fursProd = hunting * TIME_MULTIPLIER;
      if (fursProd > 0) {
        newState.resource.Furs.amount = Math.min(
          newState.resource.Furs.amount + fursProd,
          newState.resource.Furs.max >= 0 ? newState.resource.Furs.max : Infinity
        );
        deltas['Furs'] = (deltas['Furs'] ?? 0) + fursProd;
      }
    }

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
  [0, 1, 2, 3, 4].forEach(govIndex => {
    if (newState.civic.foreign[`gov${govIndex}` as keyof typeof newState.civic.foreign]) {
      const spyMessages = resolveSpyActionTick(newState, govIndex, TIME_MULTIPLIER);
      for (const msg of spyMessages) {
        messages.push(msg);
      }
    }
  });

  // ============================================================
  // 15. 工厂产线 tick
  // 对标 legacy/src/industry.js f_rate表，工厂 powered = on
  // ============================================================
  factoryTick(
    newState,
    powerResult.activeConsumers['factory'] ?? 0,
    TIME_MULTIPLIER,
    deltas,
    effectiveProdMult,
    redFactoryPowered,
    redFactoryMaxLines,
  );

  // ============================================================
  // 16. ARPA 长线研究 tick
  // ============================================================
  const arpaDone = arpaTick(newState, TIME_MULTIPLIER);
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

  // 14-16 阶段仍可能继续改写 deltas；在返回前统一回填最终 diff。
  for (const [resId, delta] of Object.entries(deltas)) {
    if (newState.resource[resId]) {
      newState.resource[resId].diff = delta;
    }
  }

  return {
    state: newState,
    result: {
      resourceDeltas: deltas,
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
    'hunter',
    'farmer',
    'lumberjack',
    'quarry_worker',
    'miner',
    'coal_miner',
    'colonist',
    'craftsman',
    'cement_worker',
    'banker',
    'entertainer',
    'professor',
    'scientist',
    'priest',
    'garrison',
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

// ============================================================
// 工厂产线 tick
// 对标 legacy/src/industry.js L117-147 f_rate 表，下标 0 (无 assembly 科技)
// ============================================================

export function factoryTick(
  state: GameState,
  poweredOn: number,
  timeMul: number,
  deltas: Record<string, number>,
  prodMultiplier: number,
  extraPoweredLines: number = 0,
  extraMaxLines: number = 0,
): void {
  const factory = state.city['factory'] as {
    count: number;
    on: number;
    Lux?: number;
    Furs?: number;
    Alloy: number;
    Polymer: number;
    Nano?: number;
    Stanene?: number;
  } | undefined;
  if (!factory) return;

  const maxFactories = Math.max(0, (factory.on ?? factory.count ?? 0) + extraMaxLines);
  const activeFactories = Math.max(0, poweredOn + extraPoweredLines);
  const eff = maxFactories > 0 ? activeFactories / maxFactories : 0;
  if (eff <= 0) return;

  let remainingLines = maxFactories;
  const allocate = (requested: number | undefined): number => {
    const lines = Math.max(0, Math.min(requested ?? 0, remainingLines));
    remainingLines -= lines;
    return lines;
  };

  const allocLux = allocate(factory.Lux);
  const allocFurs = allocate(factory.Furs);
  const allocAlloy = allocate(factory.Alloy);
  const allocPolymer = allocate(factory.Polymer);
  const allocNano = allocate(factory.Nano);
  const allocStanene = allocate(factory.Stanene);

  const assembly = Math.min(state.tech['factory'] ?? 0, 4);
  const outputMultiplier = getFactoryOutputMultiplier(state);
  const luxDemandMultiplier = state.civic.govern?.type === 'corpocracy'
    ? 2.5
    : (state.civic.govern?.type === 'socialist' ? 0.8 : 1);
  let pendingMoneyGain = 0;

  if (allocLux > 0) {
    const furPerLine = [2, 3, 4, 5, 6][assembly] * eff * timeMul;
    let workDone = allocLux;
    let furCost = workDone * furPerLine;
    while (workDone > 0 && furCost > (state.resource['Furs']?.amount ?? 0)) {
      workDone--;
      furCost = workDone * furPerLine;
    }

    if (workDone > 0) {
      if (state.resource['Furs']) {
        state.resource['Furs'].amount -= furCost;
      }
      deltas['Furs'] = (deltas['Furs'] ?? 0) - furCost;

      const demand = (getPopulation(state) * [0.14, 0.21, 0.28, 0.35, 0.42][assembly] * eff)
        * luxDemandMultiplier;
      pendingMoneyGain += workDone * demand * prodMultiplier * timeMul;
    }
  }

  if (allocFurs > 0 && state.resource['Furs']) {
    const moneyPerLine = [10, 15, 20, 25, 30][assembly] * eff * timeMul;
    const polymerPerLine = [1.5, 2.25, 3, 3.75, 4.5][assembly] * eff * timeMul;
    let workDone = allocFurs;
    let moneyCost = workDone * moneyPerLine;
    let polymerCost = workDone * polymerPerLine;

    while (workDone > 0 && polymerCost > (state.resource['Polymer']?.amount ?? 0)) {
      workDone--;
      moneyCost = workDone * moneyPerLine;
      polymerCost = workDone * polymerPerLine;
    }
    while (workDone > 0 && moneyCost > (state.resource['Money']?.amount ?? 0)) {
      workDone--;
      moneyCost = workDone * moneyPerLine;
      polymerCost = workDone * polymerPerLine;
    }

    if (workDone > 0) {
      if (state.resource['Money']) state.resource['Money'].amount -= moneyCost;
      if (state.resource['Polymer']) state.resource['Polymer'].amount -= polymerCost;
      deltas['Money'] = (deltas['Money'] ?? 0) - moneyCost;
      deltas['Polymer'] = (deltas['Polymer'] ?? 0) - polymerCost;

      const fursOutput = workDone * [1, 1.5, 2, 2.5, 3][assembly] * outputMultiplier * prodMultiplier * timeMul;
      const furs = state.resource['Furs'];
      const maxFurs = furs.max >= 0 ? furs.max : Infinity;
      const actual = Math.min(fursOutput, maxFurs - furs.amount);
      if (actual > 0) {
        furs.amount += actual;
        deltas['Furs'] = (deltas['Furs'] ?? 0) + actual;
      }
    }
  }

  // ----------------------------------------------------------
  // 合金 (Alloy) 产线
  // 对标 f_rate.Alloy: copper[0]=0.75, aluminium[0]=1.0, output[0]=0.075
  // 每条产线每 tick 消耗铜 0.75 + 铝 1.0，产出合金 0.075
  // ----------------------------------------------------------
  if (allocAlloy > 0 && state.resource['Alloy']) {
    const copperPerLine = [0.75, 1.12, 1.49, 1.86, 2.23][assembly] * eff * timeMul;
    const aluminiumPerLine = [1, 1.5, 2, 2.5, 3][assembly] * eff * timeMul;
    let workDone = allocAlloy;
    let copperCost = workDone * copperPerLine;
    let aluminiumCost = workDone * aluminiumPerLine;

    while (workDone > 0 && copperCost > (state.resource['Copper']?.amount ?? 0)) {
      workDone--;
      copperCost = workDone * copperPerLine;
      aluminiumCost = workDone * aluminiumPerLine;
    }
    while (workDone > 0 && aluminiumCost > (state.resource['Aluminium']?.amount ?? 0)) {
      workDone--;
      copperCost = workDone * copperPerLine;
      aluminiumCost = workDone * aluminiumPerLine;
    }

    if (workDone > 0) {
      if (state.resource['Copper']) state.resource['Copper'].amount -= copperCost;
      if (state.resource['Aluminium']) state.resource['Aluminium'].amount -= aluminiumCost;
      deltas['Copper'] = (deltas['Copper'] ?? 0) - copperCost;
      deltas['Aluminium'] = (deltas['Aluminium'] ?? 0) - aluminiumCost;

      let alloyOutput = workDone * [0.075, 0.112, 0.149, 0.186, 0.223][assembly] * outputMultiplier * prodMultiplier * timeMul;
      if ((state.tech['alloy'] ?? 0) >= 1) {
        alloyOutput *= 1.37;
      }

      const alloy = state.resource['Alloy'];
      const maxAlloy = alloy.max >= 0 ? alloy.max : Infinity;
      const actual = Math.min(alloyOutput, maxAlloy - alloy.amount);
      if (actual > 0) {
        alloy.amount += actual;
        deltas['Alloy'] = (deltas['Alloy'] ?? 0) + actual;
      }
    }
  }

  // ----------------------------------------------------------
  // 聚合物 (Polymer) 产线
  // 对标 f_rate.Polymer: oil[0]=0.18, lumber[0]=15, output[0]=0.125
  // 每条产线每 tick 消耗石油 0.18 + 木材 15，产出聚合物 0.125
  // ----------------------------------------------------------
  if (allocPolymer > 0 && state.resource['Polymer']) {
    const oilTable = state.race['kindling_kindred'] || state.race['smoldering']
      ? [0.22, 0.33, 0.44, 0.55, 0.66]
      : [0.18, 0.27, 0.36, 0.45, 0.54];
    const lumberTable = state.race['kindling_kindred'] || state.race['smoldering']
      ? [0, 0, 0, 0, 0]
      : [15, 22, 29, 36, 43];
    const oilPerLine = oilTable[assembly] * eff * timeMul;
    const lumberPerLine = lumberTable[assembly] * eff * timeMul;
    let workDone = allocPolymer;
    let oilCost = workDone * oilPerLine;
    let lumberCost = workDone * lumberPerLine;

    while (workDone > 0 && lumberCost > (state.resource['Lumber']?.amount ?? 0)) {
      workDone--;
      oilCost = workDone * oilPerLine;
      lumberCost = workDone * lumberPerLine;
    }
    while (workDone > 0 && oilCost > (state.resource['Oil']?.amount ?? 0)) {
      workDone--;
      oilCost = workDone * oilPerLine;
      lumberCost = workDone * lumberPerLine;
    }

    if (workDone > 0) {
      if (state.resource['Oil']) state.resource['Oil'].amount -= oilCost;
      if (state.resource['Lumber']) state.resource['Lumber'].amount -= lumberCost;
      deltas['Oil'] = (deltas['Oil'] ?? 0) - oilCost;
      deltas['Lumber'] = (deltas['Lumber'] ?? 0) - lumberCost;

      let polymerOutput = workDone * [0.125, 0.187, 0.249, 0.311, 0.373][assembly] * outputMultiplier * prodMultiplier * timeMul;
      if ((state.tech['polymer'] ?? 0) >= 2) {
        polymerOutput *= 1.42;
      }

      const polymer = state.resource['Polymer'];
      const maxPolymer = polymer.max >= 0 ? polymer.max : Infinity;
      const actual = Math.min(polymerOutput, maxPolymer - polymer.amount);
      if (actual > 0) {
        polymer.amount += actual;
        deltas['Polymer'] = (deltas['Polymer'] ?? 0) + actual;
      }
    }
  }

  // ----------------------------------------------------------
  // 纳米管 (Nano_Tube) 产线
  // 对标 f_rate.Nano_Tube: coal[0]=8, neutronium[0]=0.05, output[0]=0.2
  // ----------------------------------------------------------
  if (allocNano > 0 && state.resource['Nano_Tube']) {
    const coalPerLine = [8, 12, 16, 20, 24][assembly] * eff * timeMul;
    const neutroniumPerLine = [0.05, 0.075, 0.1, 0.125, 0.15][assembly] * eff * timeMul;
    let workDone = allocNano;
    let coalCost = workDone * coalPerLine;
    let neutroniumCost = workDone * neutroniumPerLine;

    while (workDone > 0 && neutroniumCost > (state.resource['Neutronium']?.amount ?? 0)) {
      workDone--;
      coalCost = workDone * coalPerLine;
      neutroniumCost = workDone * neutroniumPerLine;
    }
    while (workDone > 0 && coalCost > (state.resource['Coal']?.amount ?? 0)) {
      workDone--;
      coalCost = workDone * coalPerLine;
      neutroniumCost = workDone * neutroniumPerLine;
    }

    if (workDone > 0) {
      if (state.resource['Coal']) state.resource['Coal'].amount -= coalCost;
      if (state.resource['Neutronium']) state.resource['Neutronium'].amount -= neutroniumCost;
      deltas['Coal'] = (deltas['Coal'] ?? 0) - coalCost;
      deltas['Neutronium'] = (deltas['Neutronium'] ?? 0) - neutroniumCost;

      const output = workDone
        * [0.2, 0.3, 0.4, 0.5, 0.6][assembly]
        * outputMultiplier
        * prodMultiplier
        * timeMul;
      const nano = state.resource['Nano_Tube'];
      const maxNano = nano.max >= 0 ? nano.max : Infinity;
      const actual = Math.min(output, maxNano - nano.amount);
      if (actual > 0) {
        nano.amount += actual;
        deltas['Nano_Tube'] = (deltas['Nano_Tube'] ?? 0) + actual;
      }
    }
  }

  // ----------------------------------------------------------
  // 锡烯 (Stanene) 产线
  // 对标 f_rate.Stanene: aluminium[0]=30, nano[0]=0.02, output[0]=0.6
  // ----------------------------------------------------------
  if (allocStanene > 0 && state.resource['Stanene']) {
    const aluminiumPerLine = [30, 45, 60, 75, 90][assembly] * eff * timeMul;
    const nanoPerLine = [0.02, 0.03, 0.04, 0.05, 0.06][assembly] * eff * timeMul;
    let workDone = allocStanene;
    let aluminiumCost = workDone * aluminiumPerLine;
    let nanoCost = workDone * nanoPerLine;

    while (workDone > 0 && aluminiumCost > (state.resource['Aluminium']?.amount ?? 0)) {
      workDone--;
      aluminiumCost = workDone * aluminiumPerLine;
      nanoCost = workDone * nanoPerLine;
    }
    while (workDone > 0 && nanoCost > (state.resource['Nano_Tube']?.amount ?? 0)) {
      workDone--;
      aluminiumCost = workDone * aluminiumPerLine;
      nanoCost = workDone * nanoPerLine;
    }

    if (workDone > 0) {
      if (state.resource['Aluminium']) state.resource['Aluminium'].amount -= aluminiumCost;
      if (state.resource['Nano_Tube']) state.resource['Nano_Tube'].amount -= nanoCost;
      deltas['Aluminium'] = (deltas['Aluminium'] ?? 0) - aluminiumCost;
      deltas['Nano_Tube'] = (deltas['Nano_Tube'] ?? 0) - nanoCost;

      const output = workDone
        * [0.6, 0.9, 1.2, 1.5, 1.8][assembly]
        * outputMultiplier
        * prodMultiplier
        * timeMul;
      const stanene = state.resource['Stanene'];
      const maxStanene = stanene.max >= 0 ? stanene.max : Infinity;
      const actual = Math.min(output, maxStanene - stanene.amount);
      if (actual > 0) {
        stanene.amount += actual;
        deltas['Stanene'] = (deltas['Stanene'] ?? 0) + actual;
      }
    }
  }

  if (pendingMoneyGain > 0 && state.resource['Money']) {
    const money = state.resource['Money'];
    const maxMoney = money.max >= 0 ? money.max : Infinity;
    const actual = Math.min(pendingMoneyGain, maxMoney - money.amount);
    if (actual > 0) {
      money.amount += actual;
      deltas['Money'] = (deltas['Money'] ?? 0) + actual;
    }
  }
}

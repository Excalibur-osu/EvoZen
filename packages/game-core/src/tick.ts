/**
 * 游戏主循环 / Tick 逻辑
 * 完整资源产出、消耗、建筑加成
 *
 * 严格对标 legacy/src/main.js 原版公式。
 * 所有产出/消耗值在最终应用前统一乘以 time_multiplier = 0.25
 * （原版 main.js L1213）。
 */

import type { GameState, GameTickResult, GameMessage } from '@evozen/shared-types';
import { craftingTick } from './crafting';
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
import { applyDerivedStateInPlace } from './derived-state';
import {
  hasPlanetTrait,
  getGlobalPlanetMultiplier,
  getMinerPlanetMultiplier,
  getFarmPlanetMultiplier,
  magneticVars,
  rageVars,
} from './planet-traits';
import { evolutionTick } from './evolution';
import { arpaTick } from './arpa';
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
  // 用电建筑实际开启数
  const poweredOn = powerResult.activeConsumers;

  // ============================================================
  // 0. 士气 & 全局乘数
  // ============================================================
  // 对标 legacy/src/main.js L1286-3290:
  // morale 决定 global_multiplier，影响所有工人产出
  const moraleResult = calculateMorale(state, {
    activeCasinos: poweredOn['casino'] ?? 0,
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

  // 农民产出 — 对标 legacy/src/jobs.js L797-822 farmerValue()
  // farmerValue(farm=true) = impact + (agriculture >= 2 ? 1.15 : 0.65)
  // impact = 0.82
  const farmers = workers('farmer');
  let farmerBase = 0.82;  // impact
  // 有农场时的额外加成（原版 jobs.js L799-800）
  if (farmers > 0 && structCount('farm') > 0) {
    farmerBase += techLevel('agriculture') >= 2 ? 1.15 : 0.65;
  }
  // 锄头科技加成 — 原版 jobs.js L806: hoe 每级 +33%
  const hoeLevel = techLevel('hoe');
  if (hoeLevel > 0) {
    farmerBase *= 1 + hoeLevel / 3;
  }
  // 磨坊建筑加成（原版 main.js L3587-3591）
  // agriculture >= 5 → 5%/座, 否则 3%/座（非电力化磨坊）
  const mills = structCount('mill');
  const millBonus = techLevel('agriculture') >= 5 ? 0.05 : 0.03;
  let foodMult = 1 + mills * millBonus;
  if (techLevel('agriculture') >= 7) {
    foodMult *= 1.1;
  }
  // trashed 行星特性：农业产出 ×0.75
  foodMult *= getFarmPlanetMultiplier(state);
  const farmerFood = farmers * farmerBase * foodMult;

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
  let lumberMult = 1 + lumberYards * 0.02 + sawmills * sawmillBonus;
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
  if (activeQuarries > 0) {
    stoneMult *= 1 + activeQuarries * 0.04;
  }
  deltas['Stone'] = quarryWorkers * stoneBase * stoneMult * effectiveProdMult;

  // ============================================================
  // 5. 铜 / 铁 — 矿工
  // ============================================================
  // 原版 main.js L6117-6119: miner_base = workers * impact(1.0)
  // 铜系数 main.js L6158: copper_mult = 1/7
  // 铁系数 main.js L6225: iron_mult  = 1/4
  const activeMines = poweredOn['mine'] ?? 0;
  const actualMiners = Math.min(workers('miner'), activeMines);
  const pickaxeLevel = techLevel('pickaxe');
  const minerToolMult = 1 + pickaxeLevel * 0.15;
  const minerExplosiveMult = explosiveLevel >= 2 ? 0.95 + explosiveLevel * 0.15 : 1;
  // 矿井通电加成：+5%/座
  const minePowerMult = activeMines > 0 ? 1 + activeMines * 0.05 : 1;
  // dense/permafrost/magnetic 行星特性：影响矿工产出
  const minerPlanetMult = getMinerPlanetMultiplier(state);
  const copperGeologyMult = 1 + (state.city.geology?.['Copper'] ?? 0);
  const ironGeologyMult = 1 + (state.city.geology?.['Iron'] ?? 0);
  deltas['Copper'] = actualMiners * (1 / 7) * minerToolMult * minerExplosiveMult * minePowerMult * copperGeologyMult * minerPlanetMult * effectiveProdMult;  // ≈0.143

  if (techLevel('mining') >= 3) {
    deltas['Iron'] = actualMiners * 0.25 * minerToolMult * minerExplosiveMult * minePowerMult * ironGeologyMult * minerPlanetMult * effectiveProdMult;  // 1/4
  }

  // ============================================================
  // 6. 煤炭 — 煤矿工人
  // ============================================================
  const coalMineActive = poweredOn['coal_mine'] ?? workers('coal_miner');
  const actualCoalMiners = Math.min(workers('coal_miner'), coalMineActive);
  const coalToolMult = 1 + pickaxeLevel * 0.12;
  const coalPowerMult = coalMineActive > 0 ? 1 + coalMineActive * 0.05 : 1;
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
  const wardenclyffes = structCount('wardenclyffe');
  if (techLevel('science') >= 6 && wardenclyffes > 0) {
    sciImpact *= 1 + professors * wardenclyffes * 0.01;
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
  const smelters = structCount('smelter');
  if (smelters > 0) {
    // 原版 L5007: iron_smelter *= smelting >= 3 ? 1.2 : 1
    // 原版 L5015-5018: smelting >= 7: iron *= 1.25
    const ironBlast = techLevel('smelting') >= 3 ? 1.2 : 1;
    const ironAdvanced = techLevel('smelting') >= 7 ? 1.25 : 1;

    if (techLevel('smelting') >= 2) {
      // ---- 钢铁生产模式 ----
      // 原版 L5068-5069: iron_consume = steel_smelter * 2, coal_consume = steel_smelter * 0.25
      const ironCost = 2;
      const coalCost = 0.25;
      const availableIron = state.resource['Iron']?.amount ?? 0;
      const availableCoal = state.resource['Coal']?.amount ?? 0;
      const maxByIron = Math.floor(availableIron / ironCost);
      const maxByCoal = Math.floor(availableCoal / coalCost);
      const effectiveSmelters = Math.min(smelters, Math.min(maxByIron, maxByCoal));

      // 原版 L5081-5096: steel_base = 1, smelting 4/5/6 各 ×1.2, smelting 7 ×1.25
      let steelBase = 1;
      for (let i = 4; i <= 6; i++) {
        if (techLevel('smelting') >= i) steelBase *= 1.2;
      }
      if (techLevel('smelting') >= 7) steelBase *= 1.25;

      // 原版 L5117: smelter_output = steel_smelter * steel_base
      const steelOutput = effectiveSmelters * steelBase;
      deltas['Steel'] = (deltas['Steel'] ?? 0) + steelOutput;
      deltas['Iron'] = (deltas['Iron'] ?? 0) - effectiveSmelters * ironCost;
      deltas['Coal'] = (deltas['Coal'] ?? 0) - effectiveSmelters * coalCost;

      // 钛副产物 — 原版 L5130-5144
      if (techLevel('titanium') >= 1) {
        const titaniumDivisor = techLevel('titanium') >= 3 ? 10 : 25;
        deltas['Titanium'] = (deltas['Titanium'] ?? 0) + steelOutput / titaniumDivisor;
      }
    } else {
      // ---- 初期铁生产模式 ----
      // 原版 L4929: consume_wood = smelter.Wood * l_cost (l_cost=3)
      const lumberCost = 3;
      const availableLumber = state.resource['Lumber']?.amount ?? 0;
      const effectiveSmelters = Math.min(smelters, Math.floor(availableLumber / lumberCost));
      // 原版 L4932+L5007: iron_smelter = count × (smelting≥3 ? 1.2 : 1) × (smelting≥7 ? 1.25 : 1)
      deltas['Iron'] = (deltas['Iron'] ?? 0) + effectiveSmelters * ironBlast * ironAdvanced;
      deltas['Lumber'] = (deltas['Lumber'] ?? 0) - effectiveSmelters * lumberCost;
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
  // 10a. 工匠合成产线（自动消耗原料、产出合成品）
  // ============================================================
  const craftDeltas = craftingTick(state);
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
    if (!deltas.hasOwnProperty(resId)) {
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
  const activeBiolabs = powerResult.activeConsumers['biolab'] ?? 0;
  if (activeBiolabs > 0 && newState.resource['Knowledge']) {
    newState.resource['Knowledge'].max += activeBiolabs * 3000;
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
  // 15. 工厂产线 tick
  // 对标 legacy/src/industry.js f_rate表，工厂 powered = on
  // ============================================================
  factoryTick(newState, powerResult.activeConsumers['factory'] ?? 0, TIME_MULTIPLIER, deltas, effectiveProdMult);

  // ============================================================
  // 16. ARPA 长线研究 tick
  // ============================================================
  const arpaDone = arpaTick(newState, TIME_MULTIPLIER);
  for (const projId of arpaDone) {
    const names: Record<string, string> = { monument: '纪念碑', stock_exchange: '证券交易所' };
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
    const defaultJob = (state.civic as any).d_job ?? 'unemployed';
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
): void {
  const factory = state.city['factory'] as {
    count: number;
    on: number;
    Lux?: number;
    Furs?: number;
    Alloy: number;
    Polymer: number;
  } | undefined;
  if (!factory) return;

  const maxFactories = Math.max(0, factory.on ?? factory.count ?? 0);
  const eff = maxFactories > 0 ? poweredOn / maxFactories : 0;
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

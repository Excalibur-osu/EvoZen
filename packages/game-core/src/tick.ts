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
import { getTaxMultiplier, getKnowledgeMultiplier, tickGovernmentCooldown } from './government';
import { BASIC_STRUCTURES } from './structures';
import { getProfessorTraitBonus, getTaxIncomeTraitMultiplier } from './traits';
import { calculateMorale, randomizeWeather } from './morale';
import { powerTick } from './power';
import { tickTraining, tickHealing, armyRating, garrisonSize } from './military';
import { tickEvents } from './events';
import { applyDerivedStateInPlace } from './derived-state';

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

  // 如果还在进化阶段，不做常规 tick
  if (state.race.species === 'protoplasm') {
    return {
      state,
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
  // 0. 士气 & 全局乘数
  // ============================================================
  // 对标 legacy/src/main.js L1286-3290:
  // morale 决定 global_multiplier，影响所有工人产出
  const moraleResult = calculateMorale(state);
  const prodMult = moraleResult.globalMultiplier;

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
  const farmerFood = farmers * farmerBase * foodMult;

  // 食物消耗 — 原版 main.js L3711:
  // consume = (pop + soldiers - (unemployed + hunters) * 0.5)
  // 简化版（暂无士兵系统），food_consume_mod = 1（标准人类）
  const unemployed = workers('unemployed');
  const foodConsumption = pop - (unemployed + hunters) * 0.5;

  deltas['Food'] = (hunterFood + farmerFood) * prodMult - foodConsumption;

  // ============================================================
  // 2. 毛皮（猎人副产品）
  // ============================================================
  deltas['Furs'] = hunterFurs;

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
  const sawmillBonus = techLevel('saw') >= 2 ? 0.08 : 0.05;
  let lumberMult = 1 + lumberYards * 0.02 + sawmills * sawmillBonus;
  deltas['Lumber'] = lumberjacks * lumberBase * lumberMult * prodMult;

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
  // 回收工具升级（reclaimer:2 = shovel +5%, reclaimer:3 = iron_shovel +10%）
  // 对标 legacy tech.js shovel/iron_shovel 实际属于 reclaimer 系列
  const reclaimerLevel = techLevel('reclaimer');
  const shovelMult = reclaimerLevel >= 3 ? 1.10 : (reclaimerLevel >= 2 ? 1.05 : 1);
  stoneBase *= shovelMult;
  // 采石场加成 +2%/座（原版 main.js L5744-5745）
  const quarries = structCount('rock_quarry');
  let stoneMult = 1 + quarries * 0.02;
  deltas['Stone'] = quarryWorkers * stoneBase * stoneMult * prodMult;

  // ============================================================
  // 5. 铜 / 铁 — 矿工
  // ============================================================
  // 原版 main.js L6117-6119: miner_base = workers * impact(1.0)
  // 铜系数 main.js L6158: copper_mult = 1/7
  // 铁系数 main.js L6225: iron_mult  = 1/4
  const miners = poweredOn['mine'] ?? workers('miner');
  const actualMiners = Math.min(workers('miner'), miners);
  const pickaxeLevel = techLevel('pickaxe');
  const minerToolMult = 1 + pickaxeLevel * 0.15;
  const minerExplosiveMult = explosiveLevel >= 2 ? 0.95 + explosiveLevel * 0.15 : 1;
  // 回收工具加成（shovelMult 已在上方声明）
  // 探矿仪 dowsing:2 额外 +8% 矿工产量
  const dowsingLevel = techLevel('dowsing');
  const dowsingMult = dowsingLevel >= 2 ? 1.08 : 1;
  deltas['Copper'] = actualMiners * (1 / 7) * minerToolMult * minerExplosiveMult * shovelMult * dowsingMult * prodMult;  // ≈0.143

  if (techLevel('mining') >= 3) {
    deltas['Iron'] = actualMiners * 0.25 * minerToolMult * minerExplosiveMult * shovelMult * dowsingMult * prodMult;  // 1/4
  }

  // ============================================================
  // 6. 煤炭 — 煤矿工人
  // ============================================================
  const coalMineActive = poweredOn['coal_mine'] ?? workers('coal_miner');
  const actualCoalMiners = Math.min(workers('coal_miner'), coalMineActive);
  const coalToolMult = 1 + pickaxeLevel * 0.12;
  deltas['Coal'] = actualCoalMiners * 0.2 * coalToolMult * minerExplosiveMult * shovelMult * dowsingMult * prodMult;

  // ============================================================
  // 7. 水泥 — 水泥工人（消耗石头）
  // ============================================================
  const cementWorkers = workers('cement_worker');
  if (cementWorkers > 0) {
    const stonePerCement = 3;
    // 实际可用的石头限制水泥产出
    const availableStone = state.resource['Stone']?.amount ?? 0;
    const maxByStone = Math.floor(availableStone / stonePerCement);
    const effectiveCement = Math.min(cementWorkers, maxByStone);
    const cementLevel = techLevel('cement');
    const cementTechMult = cementLevel >= 7 ? 1.45 : (cementLevel >= 4 ? 1.2 : 1);
    deltas['Cement'] = effectiveCement * 0.4 * cementTechMult * prodMult;
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
  // 教授+科学家受饥饿影响，日晷不受（原版 L4228-4229）
  let knowledgeDelta = (professorsBase + scientistBase) + sundialBase;
  // 图书馆全局加成 — 原版 main.js L4259:
  // library_mult = 1 + (library_count * 0.05)
  // 注意：原版 L4261 是 delta *= library_mult，即日晷也受此加成
  const libraryMult = 1 + libraries * 0.05;
  knowledgeDelta *= libraryMult;
  deltas['Knowledge'] = knowledgeDelta * prodMult;

  // ============================================================
  // 8a. 信仰（Faith）— 牧师产出
  // ============================================================
  // 对标 legacy/src/main.js: priest impact = 0.5
  // 神权政体惩罚知识但信仰 +10%
  const priests = workers('priest');
  if (priests > 0 && state.resource['Faith']) {
    // 牧师输出 0.5 信仰/tick（乘 prodMult）
    let faithRate = priests * 0.5 * prodMult;
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
  const taxRate = state.civic.taxes?.tax_rate ?? 20;
  const bankers = workers('banker');
  const citizens = pop - unemployed;  // 原版 L7587
  let incomeBase = citizens * 0.4;  // 原版 L7592, non-truepath
  // 银行家加成（需要 banking:2）— 原版 L7601-7615
  if (techLevel('banking') >= 2 && bankers > 0) {
    let bankerImpact = 0.1;  // 基础 impact
    if (techLevel('banking') >= 10) {
      bankerImpact += 0.02 * techLevel('stock_exchange');
    }
    if (state.civic.govern?.type === 'republic') {
      bankerImpact *= 1.25;
    }
    incomeBase *= 1 + bankers * bankerImpact;
  }
  incomeBase *= getTaxIncomeTraitMultiplier(state);
  incomeBase *= taxRate / 20;  // 原版 L7626
  // 政体税收加成（civics.js govEffect.autocracy/oligarchy）
  incomeBase *= getTaxMultiplier(state);
  deltas['Money'] = incomeBase;

  // ============================================================
  // 9a. 冶金系统 (Metallurgy)
  // ============================================================
  const smelters = structCount('smelter');
  if (smelters > 0) {
    const blastFurnaceMult = techLevel('smelting') >= 3 ? 1.2 : 1;
    const bessemerMult = techLevel('smelting') >= 4 ? 1.2 : 1;
    const oxygenConverterMult = techLevel('smelting') >= 5 ? 1.2 : 1;
    // 根据 tech.ts，'steel' 科技赋予 'smelting: 2'
    if (techLevel('smelting') >= 2) {
      // 生产钢 (消耗 铁和煤)
      const ironCost = 2;
      const coalCost = 2;
      const availableIron = state.resource['Iron']?.amount ?? 0;
      const availableCoal = state.resource['Coal']?.amount ?? 0;
      const maxByIron = Math.floor(availableIron / ironCost);
      const maxByCoal = Math.floor(availableCoal / coalCost);
      const effectiveSmelters = Math.min(smelters, Math.min(maxByIron, maxByCoal));
      deltas['Steel'] = (deltas['Steel'] ?? 0)
        + effectiveSmelters * 0.5 * blastFurnaceMult * bessemerMult * oxygenConverterMult;
      deltas['Iron'] = (deltas['Iron'] ?? 0) - effectiveSmelters * ironCost;
      deltas['Coal'] = (deltas['Coal'] ?? 0) - effectiveSmelters * coalCost;

      // 钛副产物 (titanium tech >= 1) — 对标 legacy main.js L5130-5144
      // 原版: smelter_output / divisor, divisor = titanium >= 3 ? 10 : 25
      if (techLevel('titanium') >= 1) {
        const steelOutput = effectiveSmelters * 0.5 * blastFurnaceMult * bessemerMult * oxygenConverterMult;
        const titaniumDivisor = techLevel('titanium') >= 3 ? 10 : 25;
        deltas['Titanium'] = (deltas['Titanium'] ?? 0) + steelOutput / titaniumDivisor;
      }
    } else {
      // 初期仅生产铁 (消耗木材)
      const lumberCost = 5;
      const availableLumber = state.resource['Lumber']?.amount ?? 0;
      const effectiveSmelters = Math.min(smelters, Math.floor(availableLumber / lumberCost));
      deltas['Iron'] = (deltas['Iron'] ?? 0) + effectiveSmelters * 2.0 * blastFurnaceMult;
      deltas['Lumber'] = (deltas['Lumber'] ?? 0) - effectiveSmelters * lumberCost;
    }
  }

  // ============================================================
  // 9b. 石油产出 — 对标 legacy main.js L6720-6760
  // ============================================================
  // 每座油井产出 0.4 Oil/tick (oil tech >= 4 时 0.48，暂设 0.4)
  const oilWells = structCount('oil_well');
  if (oilWells > 0 && techLevel('oil') >= 1) {
    const oilPerWell = 0.4;
    deltas['Oil'] = (deltas['Oil'] ?? 0) + oilWells * oilPerWell;
  }

  const metalRefineries = structCount('metal_refinery');
  const maxRefineries = poweredOn['metal_refinery'] ?? metalRefineries;
  const activeRefineries = Math.min(metalRefineries, maxRefineries);
  if (activeRefineries > 0) {
    // 生产铝 (消耗 石头)
    const stoneCost = 5;
    const availableStone = (state.resource['Stone']?.amount ?? 0) + (deltas['Stone'] ?? 0);
    const effectiveRefineries = Math.min(activeRefineries, Math.floor(Math.max(0, availableStone) / stoneCost));
    deltas['Aluminium'] = (deltas['Aluminium'] ?? 0) + effectiveRefineries * 1.0 * quarryExplosiveMult;
    deltas['Stone'] = (deltas['Stone'] ?? 0) - effectiveRefineries * stoneCost;
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
          newState.city[item.id] = { count: 0 };
        }
        (newState.city[item.id] as { count: number }).count++;

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
  factoryTick(newState, powerResult.activeConsumers['factory'] ?? 0, TIME_MULTIPLIER, deltas);

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

// ============================================================
// 工厂产线 tick
// 对标 legacy/src/industry.js L117-147 f_rate 表，下标 0 (无 assembly 科技)
// ============================================================

export function factoryTick(
  state: GameState,
  poweredOn: number,
  timeMul: number,
  deltas: Record<string, number>
): void {
  const factory = state.city['factory'] as { count: number; on: number; Alloy: number; Polymer: number } | undefined;
  if (!factory || poweredOn <= 0) return;

  // 工厂 powered 市已用于分配，确保分配不超过通电数
  const allocAlloy = Math.min(factory.Alloy, poweredOn);
  const remainAfterAlloy = poweredOn - allocAlloy;
  const allocPolymer = Math.min(factory.Polymer, remainAfterAlloy);

  // ----------------------------------------------------------
  // 合金 (Alloy) 产线
  // 对标 f_rate.Alloy: copper[0]=0.75, aluminium[0]=1.0, output[0]=0.075
  // 每条产线每 tick 消耗铜 0.75 + 铝 1.0，产出合金 0.075
  // ----------------------------------------------------------
  if (allocAlloy > 0 && state.resource['Alloy']) {
    const copperCost = allocAlloy * 0.75 * timeMul;
    const aluminiumCost = allocAlloy * 1.0 * timeMul;
    const alloyOutput = allocAlloy * 0.075 * timeMul;

    // 扭读钳造保证资源足够
    const availCopper = (state.resource['Copper']?.amount ?? 0);
    const availAluminium = (state.resource['Aluminium']?.amount ?? 0);

    if (availCopper >= copperCost && availAluminium >= aluminiumCost) {
      if (state.resource['Copper']) state.resource['Copper'].amount -= copperCost;
      if (state.resource['Aluminium']) state.resource['Aluminium'].amount -= aluminiumCost;
      deltas['Copper'] = (deltas['Copper'] ?? 0) - copperCost;
      deltas['Aluminium'] = (deltas['Aluminium'] ?? 0) - aluminiumCost;

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
    const oilCost = allocPolymer * 0.18 * timeMul;
    const lumberCost = allocPolymer * 15 * timeMul;
    const polymerOutput = allocPolymer * 0.125 * timeMul;

    const availOil = (state.resource['Oil']?.amount ?? 0);
    const availLumber = (state.resource['Lumber']?.amount ?? 0);

    if (availOil >= oilCost && availLumber >= lumberCost) {
      if (state.resource['Oil']) state.resource['Oil'].amount -= oilCost;
      if (state.resource['Lumber']) state.resource['Lumber'].amount -= lumberCost;
      deltas['Oil'] = (deltas['Oil'] ?? 0) - oilCost;
      deltas['Lumber'] = (deltas['Lumber'] ?? 0) - lumberCost;

      const polymer = state.resource['Polymer'];
      const maxPolymer = polymer.max >= 0 ? polymer.max : Infinity;
      const actual = Math.min(polymerOutput, maxPolymer - polymer.amount);
      if (actual > 0) {
        polymer.amount += actual;
        deltas['Polymer'] = (deltas['Polymer'] ?? 0) + actual;
      }
    }
  }
}

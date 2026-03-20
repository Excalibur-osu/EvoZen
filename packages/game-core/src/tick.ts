/**
 * 游戏主循环 / Tick 逻辑
 * 完整资源产出、消耗、建筑加成
 */

import type { GameState, GameTickResult, GameMessage } from '@evozen/shared-types';

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

  // ============================================================
  // 1. 食物
  // ============================================================
  // 猎人产出 — 基础 0.5/人, 军事科技加成
  const hunters = workers('hunter');
  let hunterRate = 0.5;
  if (techLevel('military') >= 1) hunterRate += 0.1;
  const hunterFood = hunters * hunterRate;
  // 猎人副产品：毛皮
  const hunterFurs = hunters * 0.15;

  // 农民产出 — 基础 0.82, 灌溉(agriculture>=2) +40%, 磨坊加成
  const farmers = workers('farmer');
  let farmerBase = 0.82;
  if (techLevel('agriculture') >= 2) farmerBase += 0.36;  // 灌溉 +40%
  if (techLevel('agriculture') >= 4) farmerBase += 0.12;  // 磨坊科技
  // 磨坊建筑 +5%/座
  const mills = structCount('mill');
  let foodMult = 1 + mills * 0.05;
  const farmerFood = farmers * farmerBase * foodMult;

  // 食物消耗 — 每市民 0.25/tick, 失业人口消耗减半, 猎人在野外生存也减半
  const unemployed = workers('unemployed');
  const employed = pop - unemployed;
  const standardEaters = employed - hunters;
  const foodConsumption = standardEaters * 0.25 + (unemployed + hunters) * 0.125;

  deltas['Food'] = hunterFood + farmerFood - foodConsumption;

  // ============================================================
  // 2. 毛皮（猎人副产品）
  // ============================================================
  deltas['Furs'] = hunterFurs;

  // ============================================================
  // 3. 木材 — 伐木工
  // ============================================================
  const lumberjacks = workers('lumberjack');
  let lumberBase = 1;
  // 石斧科技加成
  if (techLevel('axe') >= 1) lumberBase += 0.35;
  // 伐木场加成 +2%/座
  const lumberYards = structCount('lumber_yard');
  let lumberMult = 1 + lumberYards * 0.02;
  deltas['Lumber'] = lumberjacks * lumberBase * lumberMult;

  // ============================================================
  // 4. 石头 — 石工
  // ============================================================
  const quarryWorkers = workers('quarry_worker');
  let stoneBase = 0.8;
  // 采石场加成 +2%/座
  const quarries = structCount('rock_quarry');
  let stoneMult = 1 + quarries * 0.02;
  deltas['Stone'] = quarryWorkers * stoneBase * stoneMult;

  // ============================================================
  // 5. 铜 / 铁 — 矿工
  // ============================================================
  const miners = workers('miner');
  deltas['Copper'] = miners * 0.3;

  if (techLevel('mining') >= 3) {
    deltas['Iron'] = miners * 0.15;
  }

  // ============================================================
  // 6. 煤炭 — 煤矿工人
  // ============================================================
  const coalMiners = workers('coal_miner');
  deltas['Coal'] = coalMiners * 0.2;

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
    deltas['Cement'] = effectiveCement * 0.4;
    deltas['Stone'] = (deltas['Stone'] ?? 0) - effectiveCement * stonePerCement;
  }

  // ============================================================
  // 8. 知识 — 教授 + 科学家
  // ============================================================
  const professors = workers('professor');
  const scientists = workers('scientist');
  // 教授 0.5/人, 图书馆加成 +5%/座
  const libraries = structCount('library');
  const universities = structCount('university');
  let knowledgeMult = 1 + libraries * 0.05 + universities * 0.08;
  deltas['Knowledge'] = (professors * 0.5 + scientists * 1.0) * knowledgeMult;

  // ============================================================
  // 9. 金币 — 税收 + 银行家
  // ============================================================
  const taxRate = state.civic.taxes?.tax_rate ?? 20;
  const bankers = workers('banker');
  const taxIncome = pop * (taxRate / 100) * 0.5;
  // 银行家增加金币产量 10%/人
  const bankBonus = 1 + bankers * 0.1;
  deltas['Money'] = taxIncome * bankBonus;

  // ============================================================
  // 10. 应用变化
  // ============================================================
  const newState = structuredClone(state);

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
  // 11. 饥荒效果：食物 0 且负产出时人口减少
  // ============================================================
  if (newState.resource['Food']?.amount === 0 && (deltas['Food'] ?? 0) < 0) {
    const species = newState.race.species;
    const popRes = newState.resource[species];
    if (popRes && popRes.amount > 1) {
      // 每 tick 0.5% 概率死亡
      if (Math.random() < 0.005) {
        popRes.amount = Math.max(1, popRes.amount - 1);
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
  if (newState.city.calendar) {
    newState.city.calendar.day++;
    if (newState.city.calendar.day >= newState.city.calendar.orbit) {
      newState.city.calendar.day = 0;
      newState.city.calendar.year++;
      // 季节随年变
      newState.city.calendar.season = newState.city.calendar.year % 4;

      // 新年消息
      if (newState.city.calendar.year % 10 === 0) {
        messages.push({
          text: `🎆 进入第 ${newState.city.calendar.year} 年！`,
          type: 'info',
          category: 'calendar',
        });
      }
    }
  }

  // 统计
  newState.stats.days = (newState.stats.days ?? 0) + 1;

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

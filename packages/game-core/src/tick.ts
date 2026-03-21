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
  // 磨坊建筑加成（原版 main.js L3587-3591）
  // agriculture >= 5 → 5%/座, 否则 3%/座（非电力化磨坊）
  const mills = structCount('mill');
  const millBonus = techLevel('agriculture') >= 5 ? 0.05 : 0.03;
  let foodMult = 1 + mills * millBonus;
  const farmerFood = farmers * farmerBase * foodMult;

  // 食物消耗 — 原版 main.js L3711:
  // consume = (pop + soldiers - (unemployed + hunters) * 0.5)
  // 简化版（暂无士兵系统），food_consume_mod = 1（标准人类）
  const unemployed = workers('unemployed');
  const foodConsumption = pop - (unemployed + hunters) * 0.5;

  deltas['Food'] = hunterFood + farmerFood - foodConsumption;

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
  let lumberMult = 1 + lumberYards * 0.02;
  deltas['Lumber'] = lumberjacks * lumberBase * lumberMult;

  // ============================================================
  // 4. 石头 — 石工
  // ============================================================
  // 原版 main.js L5663-5677: impact = 1.0（不是 0.8）
  const quarryWorkers = workers('quarry_worker');
  let stoneBase = 1.0;  // quarry_worker.impact = 1.0
  // 采石场加成 +2%/座（原版 main.js L5744-5745）
  const quarries = structCount('rock_quarry');
  let stoneMult = 1 + quarries * 0.02;
  deltas['Stone'] = quarryWorkers * stoneBase * stoneMult;

  // ============================================================
  // 5. 铜 / 铁 — 矿工
  // ============================================================
  // 原版 main.js L6117-6119: miner_base = workers * impact(1.0)
  // 铜系数 main.js L6158: copper_mult = 1/7
  // 铁系数 main.js L6225: iron_mult  = 1/4
  const miners = workers('miner');
  deltas['Copper'] = miners * (1 / 7);  // ≈0.143

  if (techLevel('mining') >= 3) {
    deltas['Iron'] = miners * 0.25;  // 1/4
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
  const profImpact = 0.5 + libraries * 0.01;
  const professorsBase = professors * profImpact;
  // 科学家产出 — impact = 1.0
  const scientistBase = scientists * 1.0;
  // 教授+科学家受饥饿影响，日晷不受（原版 L4228-4229）
  let knowledgeDelta = (professorsBase + scientistBase) + sundialBase;
  // 图书馆全局加成 — 原版 main.js L4259:
  // library_mult = 1 + (library_count * 0.05)
  // 注意：原版 L4261 是 delta *= library_mult，即日晷也受此加成
  const libraryMult = 1 + libraries * 0.05;
  knowledgeDelta *= libraryMult;
  deltas['Knowledge'] = knowledgeDelta;

  // ============================================================
  // 9. 金币 — 税收 + 银行家
  // ============================================================
  // 原版 main.js L7586-7626:
  // citizens = pop + soldiers - unemployed（简化：无士兵）
  // income_base = citizens * 0.4（非 truepath）
  // banking >= 2 时: income_base *= 1 + (bankers * impact)
  // income_base *= tax_rate / 20
  const taxRate = state.civic.taxes?.tax_rate ?? 20;
  const bankers = workers('banker');
  const citizens = pop - unemployed;  // 原版 L7587
  let incomeBase = citizens * 0.4;  // 原版 L7592, non-truepath
  // 银行家加成（需要 banking:2）— 原版 L7601-7615
  if (techLevel('banking') >= 2 && bankers > 0) {
    const bankerImpact = 0.1;  // 基础 impact
    incomeBase *= 1 + bankers * bankerImpact;
  }
  incomeBase *= taxRate / 20;  // 原版 L7626
  deltas['Money'] = incomeBase;

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
  // 原版 Evolve：fast loop = 250ms, long loop = 250 × 20 = 5000ms
  // 日历推进在 long loop 中执行，即每 20 个 fast tick 推进 1 天
  // 这里用 dayTick 计数器模拟 long loop 比例
  if (newState.city.calendar) {
    newState.city.calendar.dayTick = (newState.city.calendar.dayTick ?? 0) + 1;
    if (newState.city.calendar.dayTick >= 20) {
      newState.city.calendar.dayTick = 0;
      newState.city.calendar.day++;
      newState.stats.days = (newState.stats.days ?? 0) + 1;

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

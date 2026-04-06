/**
 * 士气系统 (Morale System)
 *
 * 严格对标 legacy/src/main.js L1286-3290 的士气/压力/全局乘数计算。
 *
 * 士气决定"全局生产力乘数 (global_multiplier)"：
 *   morale < 100 → global_multiplier = morale / 100（惩罚）
 *   morale ≥ 100 → global_multiplier = 1 + (morale - 100) / 200（奖励）
 *
 * 士气 = 100
 *   + 季节加成（春 +5, 冬 -5）
 *   + 天气效果（-5 ~ +2）
 *   + 娱乐（艺人 × 戏剧等级 × 民主加成）
 *   - 压力（各岗位工人数 / 岗位 stress 容忍度）
 *   - 失业惩罚（每失业 1 人 → -1）
 *
 * 士气上限 = 125 + 剧场数 + 低税率奖励
 *
 * 纯函数模块，零 UI 依赖。
 */

import type { GameState, MoraleState } from '@evozen/shared-types';
import { BASE_JOBS } from './jobs';
import { hasPlanetTrait, mellowVars, denseVars } from './planet-traits';

// ============================================================
// 结果类型
// ============================================================

export interface MoraleResult {
  /** 最终有效士气 */
  morale: number;
  /** 士气上限 */
  moraleCap: number;
  /** 全局生产力乘数 */
  globalMultiplier: number;
  /** 分项数据，用于 UI 展示 */
  breakdown: MoraleState;
}

// ============================================================
// 主计算函数
// ============================================================

/**
 * 计算当前士气、压力、和全局乘数
 *
 * @param state - 当前游戏状态
 * @returns MoraleResult
 */
export function calculateMorale(state: GameState): MoraleResult {
  let morale = 100;

  // ----------------------------------------------------------
  // 1. 季节加成 — 对标 legacy main.js L1317-1337
  // season: 0=春, 1=夏, 2=秋, 3=冬
  // ----------------------------------------------------------
  let seasonBonus = 0;
  const season = state.city.calendar?.season ?? 0;
  const year = state.city.calendar?.year ?? 0;

  if (season === 0 && year > 0) {
    // 春季 +5（第 0 年不加）
    seasonBonus = 5;
  } else if (season === 3) {
    // 冬季 -5
    seasonBonus = -5;
  }
  morale += seasonBonus;

  // ----------------------------------------------------------
  // 2. 天气效果 — 对标 legacy main.js L1397-1438
  // weather: 0=雨/暴风雨, 1=多云, 2=晴
  // temp: 0=冷, 1=温和, 2=热
  // wind: 0=无风, 1=有风
  // ----------------------------------------------------------
  let weatherBonus = 0;
  const weather = state.city.calendar?.weather ?? 2;
  const temp = state.city.calendar?.temp ?? 1;
  const wind = state.city.calendar?.wind ?? 0;

  if (weather === 0) {
    // 雨/暴风雨
    if (temp > 0) {
      if (wind === 1) {
        // 雷暴: -5
        weatherBonus = -5;
      } else {
        // 普通雨: -2
        weatherBonus = -2;
      }
    }
  } else if (weather === 2) {
    // 晴天
    if ((wind === 0 && temp < 2) || (wind === 1 && temp === 2)) {
      // 晴朗宜人: +2
      weatherBonus = 2;
    }
  }
  // 多云 (weather === 1): 无效果
  morale += weatherBonus;

  // ----------------------------------------------------------
  // 3. 失业惩罚 — 对标 legacy main.js L1469-1473
  // 每个失业人口 → 士气 -1
  // ----------------------------------------------------------
  const unemployed = (state.civic['unemployed'] as { workers: number } | undefined)?.workers ?? 0;
  let unemployedPenalty = 0;
  // mellow 行星特性：失业不产生士气惩罚
  // 对标 legacy main.js L1470-1477
  if (!hasPlanetTrait(state, 'mellow')) {
    unemployedPenalty = -unemployed;
    morale += unemployedPenalty;
  }

  // ----------------------------------------------------------
  // 4. 压力 — 对标 legacy main.js L2968-3004
  // 每个工作岗位的压力 = workers / stress_level
  // stress_level 是岗位定义中的 stress 字段（容忍度，越高压力越低）
  // hunter 使用固定 divisor = 5
  // ----------------------------------------------------------
  let stress = 0;

  // 猎人压力（使用固定 divisor = 5）
  const hunters = (state.civic['hunter'] as { workers: number } | undefined)?.workers ?? 0;
  stress -= hunters / 5;

  // 其他岗位
  for (const jobDef of BASE_JOBS) {
    if (jobDef.id === 'unemployed' || jobDef.id === 'hunter') continue;
    const jobState = state.civic[jobDef.id] as { workers: number; display?: boolean } | undefined;
    if (!jobState || !jobState.display || jobState.workers <= 0) continue;

    let stressLevel = jobDef.stress || 5; // 默认 5
    // mellow 行星特性：每个岗位 stress 容忍度 +2
    // 对标 legacy main.js L2981-2983
    if (hasPlanetTrait(state, 'mellow')) {
      stressLevel += mellowVars()[1];
    }
    // dense 行星特性：矿工压力 +1
    // 对标 legacy main.js L2988-2990
    if (hasPlanetTrait(state, 'dense') && jobDef.id === 'miner') {
      stressLevel -= denseVars()[1];
    }
    stress -= jobState.workers / stressLevel;
  }

  // 独裁政体：压力容忍度 +25%（即压力减少 25%）
  // 对标 legacy main.js L3120-3121: autocracy → stress tolerance boost
  if (state.civic.govern?.type === 'autocracy') {
    stress *= 0.75; // 压力减 25%
  }

  // mellow 行星特性：猎人和士兵压力除数 ×1.5
  // 对标 legacy main.js L1476, L1509-1510
  if (hasPlanetTrait(state, 'mellow')) {
    // 猎人压力已用固定 divisor=5，mellow 使其变为 5*1.5=7.5
    // 差额补偿：原始 -hunters/5，mellow 下应为 -hunters/7.5
    const hunterWorkers = (state.civic['hunter'] as { workers: number } | undefined)?.workers ?? 0;
    if (hunterWorkers > 0) {
      stress += hunterWorkers / 5 - hunterWorkers / (5 * mellowVars()[0]);
    }
  }

  morale += stress;

  // ----------------------------------------------------------
  // 5. 娱乐 — 对标 legacy main.js L3020-3041
  // entertainment = entertainers × theatre_tech_level
  // 民主政体下 ×1.2（govEffect.democracy()[0] = 20）
  // ----------------------------------------------------------
  let entertainment = 0;
  const theatreLevel = state.tech['theatre'] ?? 0;
  if (theatreLevel >= 1) {
    const entertainers = (state.civic['entertainer'] as { workers: number } | undefined)?.workers ?? 0;
    entertainment = entertainers * theatreLevel;

    // 民主政体加成
    if (state.civic.govern?.type === 'democracy') {
      entertainment *= 1.2; // +20%
    }
  }
  morale += entertainment;

  // ----------------------------------------------------------
  // 6. 士气上限 — 对标 legacy main.js L3164-3211
  // moraleCap = 125 + amphitheatre_count + low_tax_bonus
  // ----------------------------------------------------------
  let moraleCap = 125;

  // 圆形剧场提高上限 — 对标 legacy main.js L3172-3174
  const amphitheatres = (state.city['amphitheatre'] as { count: number } | undefined)?.count ?? 0;
  moraleCap += amphitheatres;

  // 低税率奖励 — 对标 legacy main.js L3210-3211
  // 税率 < 20 时：moraleCap += 10 - floor(tax_rate / 2)
  const taxRate = state.civic.taxes?.tax_rate ?? 20;
  if (taxRate < 20) {
    moraleCap += 10 - Math.floor(taxRate / 2);
  }

  // ----------------------------------------------------------
  // 7. 钳位 — 对标 legacy main.js L3264-3272
  // morale 下限 = 50，上限 = moraleCap
  // ----------------------------------------------------------
  if (morale < 50) {
    morale = 50;
  } else if (morale > moraleCap) {
    morale = moraleCap;
  }

  // ----------------------------------------------------------
  // 8. 全局乘数 — 对标 legacy main.js L3274-3289
  // morale < 100 → multiplier = morale / 100
  // morale ≥ 100 → multiplier = 1 + (morale - 100) / 200
  // ----------------------------------------------------------
  let globalMultiplier: number;
  if (morale < 100) {
    globalMultiplier = morale / 100;
  } else {
    globalMultiplier = 1 + (morale - 100) / 200;
  }

  const breakdown: MoraleState = {
    current: +morale.toFixed(1),
    cap: moraleCap,
    stress: +stress.toFixed(1),
    entertain: +entertainment.toFixed(1),
    season: seasonBonus,
    weather: weatherBonus,
    unemployed: unemployedPenalty,
  };

  return {
    morale: +morale.toFixed(1),
    moraleCap,
    globalMultiplier: +globalMultiplier.toFixed(4),
    breakdown,
  };
}

// ============================================================
// 天气随机化 — 对标 legacy main.js L1222-1265
// ============================================================

/**
 * 每天随机生成天气
 * 原版在每天推进时随机化 weather/temp/wind
 *
 * weather: 0=雨, 1=多云, 2=晴（概率大致 30/30/40）
 * temp: 依季节变化（春夏偏温暖，冬偏寒冷）
 * wind: 0/1 均匀随机
 */
export function randomizeWeather(state: GameState): void {
  const cal = state.city.calendar;
  if (!cal) return;

  // 天气类型随机
  const weatherRoll = Math.random();
  if (weatherRoll < 0.3) {
    cal.weather = 0; // 雨/暴风雨
  } else if (weatherRoll < 0.6) {
    cal.weather = 1; // 多云
  } else {
    cal.weather = 2; // 晴
  }

  // 温度依季节
  const tempRoll = Math.random();
  if (cal.season === 3) {
    // 冬季偏冷
    cal.temp = tempRoll < 0.6 ? 0 : (tempRoll < 0.9 ? 1 : 2);
  } else if (cal.season === 1) {
    // 夏季偏热
    cal.temp = tempRoll < 0.1 ? 0 : (tempRoll < 0.4 ? 1 : 2);
  } else {
    // 春/秋温和
    cal.temp = tempRoll < 0.2 ? 0 : (tempRoll < 0.7 ? 1 : 2);
  }

  // 风 50/50
  cal.wind = Math.random() < 0.5 ? 1 : 0;
}

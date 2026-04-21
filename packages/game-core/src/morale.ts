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
 *   + VR 中心（每座获得支援的 vr_center +1，joyless 不生效）
 *   - 压力（各岗位工人数 / 岗位 stress 容忍度）
 *   - 失业惩罚（每失业 1 人 → -1）
 *
 * 士气上限 = 125 + 剧场数 + VR 中心 + 低税率奖励
 *
 * 纯函数模块，零 UI 依赖。
 */

import type { GameState, MoraleState } from '@evozen/shared-types';
import { BASE_JOBS } from './jobs';
import { hasPlanetTrait, mellowVars, denseVars } from './planet-traits';
import { getMonumentMoraleBonus } from './arpa';
import {
  getAutocracyStressMultiplier,
  getDemocracyEntertainmentMultiplier,
  getGovernmentMoraleOffset,
} from './government';

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

export interface MoraleOptions {
  activeCasinos?: number;
  supportedVrCenters?: number;
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
export function calculateMorale(state: GameState, options: MoraleOptions = {}): MoraleResult {
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

  // 独裁政体：压力容忍度受高科技档位影响
  // 对标 legacy civics.js L186-191 + main.js L3120-3121
  if (state.civic.govern?.type === 'autocracy') {
    stress *= getAutocracyStressMultiplier(state);
  }
  // 社会主义：压力惩罚 +10%
  // 对标 legacy main.js L3123-3124
  if (state.civic.govern?.type === 'socialist') {
    stress *= 1.1;
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

  // 驻军压力 — 对标 legacy main.js L1507-1518
  // army_stress = garrison.max / divisor(2)
  if (state.civic.garrison) {
    let armyDivisor = 2;
    if (hasPlanetTrait(state, 'mellow')) {
      armyDivisor *= mellowVars()[0];
    }
    const armyStress = state.civic.garrison.max / armyDivisor;
    stress -= armyStress;
    morale -= armyStress;
  }

  // ----------------------------------------------------------
  // 5. 娱乐 — 对标 legacy main.js L3020-3041
  // entertainment = entertainers × theatre_tech_level
  // 民主政体下倍率受 high_tech 档位影响（20% / 25% / 30%）
  // ----------------------------------------------------------
  let entertainment = 0;
  const theatreLevel = state.tech['theatre'] ?? 0;
  if (theatreLevel >= 1) {
    const entertainers = (state.civic['entertainer'] as { workers: number } | undefined)?.workers ?? 0;
    entertainment = entertainers * theatreLevel;

    // 民主政体加成
    if (state.civic.govern?.type === 'democracy') {
      entertainment *= getDemocracyEntertainmentMultiplier(state);
    }
  }
  morale += entertainment;

  // VR 中心士气加成 — 对标 legacy main.js L3064-3071
  // 当前未接入 gaslighter 政体修正，先保留基础值 +1/座。
  let vr = 0;
  if ((options.supportedVrCenters ?? 0) > 0 && !state.race['joyless']) {
    vr = (options.supportedVrCenters ?? 0) * 1;
    morale += vr;
  }

  // 政体直接调整基础士气
  // 对标 legacy main.js L1378-1382
  morale += getGovernmentMoraleOffset(state);

  // ----------------------------------------------------------
  // 6. 士气上限 — 对标 legacy main.js L3164-3211
  // moraleCap = 125 + amphitheatre_count + low_tax_bonus
  // ----------------------------------------------------------
  let moraleCap = 100;

  // 圆形剧场提高上限 — 对标 legacy main.js L3172-3174
  const amphitheatres = (state.city['amphitheatre'] as { count: number } | undefined)?.count ?? 0;
  moraleCap += amphitheatres;

  // 赌场提高士气上限 — 对标 legacy main.js L3167
  moraleCap += options.activeCasinos ?? 0;

  // VR 中心提高士气上限 — 对标 legacy main.js L3176-3177
  moraleCap += (options.supportedVrCenters ?? 0) * 2;

  // 纪念碑士气上限加成 — 对标 legacy arpa.js L172-175: +2 per monument
  moraleCap += getMonumentMoraleBonus(state);

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
    vr: +vr.toFixed(1),
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
// 天气随机化 — 对标 legacy main.js L11816-11953
// ============================================================

function randInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

function clampWeatherTemp(temp: number): number {
  if (temp < 0) return 0;
  if (temp > 2) return 2;
  return temp;
}

/**
 * 每天按 legacy 公式尝试刷新天气。
 *
 * 注意：
 * - 仅 1/6 概率真正刷新天气；否则沿用上一天状态。
 * - `stormy` / `rainbow` / `darkness` / `rejuvenated` 等依赖未实装特质的分支暂不接入。
 */
export function randomizeWeather(state: GameState): void {
  const cal = state.city.calendar;
  if (!cal) return;

  // legacy: Math.rand(0,5) === 0
  if (randInt(6) !== 0) {
    return;
  }

  let tempRoll = randInt(4);
  let skyRoll = randInt(5);
  let windRoll = randInt(4);

  const biome = state.city.biome;
  const hasPermafrost = state.city.ptrait === 'permafrost';

  switch (biome) {
    case 'oceanic':
    case 'swamp':
      if (randInt(3) === 0 && skyRoll > 0) {
        skyRoll -= 1;
      }
      break;
    case 'tundra':
    case 'taiga':
      if (cal.season === 3) {
        tempRoll = 0;
      } else if (randInt(3) === 0 && tempRoll > 0) {
        tempRoll -= 1;
      }
      break;
    case 'desert':
      if (randInt(3) === 0 && skyRoll < 4) {
        skyRoll += 1;
      }
      break;
    case 'ashland':
      if (randInt(3) === 0) {
        if (skyRoll < 1) {
          skyRoll += 1;
        } else if (skyRoll > 2) {
          skyRoll -= 1;
        }
      }
    // legacy 在 ashland 后故意 fall through 到 volcanic
    case 'volcanic':
      if (cal.season === 1) {
        tempRoll = 2;
      } else if (randInt(3) === 0 && tempRoll < 2 && !hasPermafrost) {
        tempRoll += 1;
      }
      break;
    default:
      break;
  }

  switch (cal.season) {
    case 0:
      if (randInt(4) === 0 && skyRoll > 0) {
        skyRoll -= 1;
      }
      break;
    case 1:
      if (randInt(4) === 0 && tempRoll < 2) {
        tempRoll += 1;
      }
      break;
    case 2:
      if (randInt(4) === 0 && windRoll > 0) {
        windRoll -= 1;
      }
      break;
    case 3:
      if (randInt(4) === 0 && tempRoll > 0) {
        tempRoll -= 1;
      }
      break;
    default:
      break;
  }

  if (skyRoll === 0) {
    cal.weather = 0;
  } else if (skyRoll <= 2) {
    cal.weather = 1;
  } else {
    cal.weather = 2;
  }

  if (tempRoll === 0) {
    let nextTemp = clampWeatherTemp(cal.temp - 1);
    if (cal.season === 1 && nextTemp === 0) {
      nextTemp = 1;
    }
    if (nextTemp === 0 && biome === 'hellscape' && !hasPermafrost) {
      nextTemp = 1;
    }
    if (nextTemp === 0 && biome === 'eden' && cal.season !== 3) {
      nextTemp = 1;
    }
    cal.temp = nextTemp;
  } else if (tempRoll === 2) {
    let nextTemp = clampWeatherTemp(cal.temp + 1);
    if (cal.season === 3 && nextTemp === 2) {
      nextTemp = 1;
    }
    if (nextTemp === 2 && biome === 'eden' && cal.season !== 1) {
      nextTemp = 1;
    }
    cal.temp = nextTemp;
  }

  cal.wind = windRoll === 0 ? 1 : 0;
}

/**
 * 转生系统 (Resets)
 *
 * 对标：legacy/src/resets.js
 *
 * 设计差异：
 *   - 原版在转生末尾调用 window.location.reload()，此处改为返回新 GameState
 *   - unlockAchieve / calcPrestige 的真实实现留给 achieve.ts / prestige.ts（待完成）
 *   - 本模块提供纯逻辑层：判断条件、计算收益、重置状态
 */

import type { GameState } from '@evozen/shared-types';
import { checkResetAchievements } from './achievement-triggers';
import { applyUniverse, UNIVERSES, type UniverseType } from './bigbang';

// ============================================================
// 转生类型枚举
// ============================================================

export type ResetType =
  | 'mad'          // Mutual Assured Destruction（MAD / warhead）
  | 'bioseed'      // 生物播种（bioseed）
  | 'cataclysm'   // 灾变（cataclysm_end）
  | 'blackhole'   // 黑洞（big_bang）
  | 'vacuum'      // 真空坍塌（vacuumCollapse）
  | 'ascend'      // 飞升（ascend）
  | 'descend'     // 堕落/恶魔融合（descension）
  | 'apotheosis'  // 神化（apotheosis）
  | 'terraform'   // 地球化（terraform）
  | 'aiApoc'      // AI 末日（aiApocalypse）
  | 'matrix'      // 矩阵（matrix）
  | 'retire'      // 退休（retirement）
  | 'eden';       // 伊甸园（gardenOfEden）

// ============================================================
// 声望收益接口（对标 legacy calcPrestige 返回值）
// ============================================================

export interface PrestigeGains {
  plasmid: number;
  phage: number;
  dark: number;
  harmony: number;
  artifact: number;
  supercoiled: number;
  pdebt: number;
}

// ============================================================
// resetCommon：重置城市/科技/状态（对标 resets.js L1264-1287）
// ============================================================

interface ResetCommonArgs {
  orbit: number;
  biome: string;
  ptrait: string[];
  geology: Record<string, number> | false;
}

function resetCommon(state: GameState, args: ResetCommonArgs): void {
  // 保留天文轨道、生物群落、行星特质（地质可选）
  const freshCity = {
    calendar: {
      day: 0,
      year: 0,
      weather: 2,
      temp: 1,
      moon: 0,
      wind: 0,
      orbit: args.orbit,
    },
    biome: args.biome,
    ptrait: args.ptrait,
    geology: args.geology || {},
  };
  state.city = freshCity as unknown as GameState['city'];

  // 科技全重置，只保留 theology:1（原版起点）
  state.tech = { theology: 1 };

  // 清空太空/星际/其他进度
  state.space = {} as GameState['space'];
  state.interstellar = {} as GameState['interstellar'];
  state.resource = {} as GameState['resource'];

  state.new = true;
}

// ============================================================
// 工具：从 state 安全读取数值
// ============================================================

function getOrbit(state: GameState): number {
  return (state.city as Record<string, unknown> & { calendar?: { orbit?: number } })
    ?.calendar?.orbit ?? 365;
}

function getBiome(state: GameState): string {
  return (state.city as unknown as { biome?: string })?.biome ?? 'grassland';
}

function getPtrait(state: GameState): string[] {
  return (state.city as unknown as { ptrait?: string[] })?.ptrait ?? [];
}

function getGeology(state: GameState): Record<string, number> {
  return (state.city as unknown as { geology?: Record<string, number> })?.geology ?? {};
}

// ============================================================
// 声望计算（对标 legacy/src/functions.js L1493-1755）
// ============================================================

/** 各转生类型的基础参数常量（对标 getResetConstants L1493-1572）*/
interface ResetConstants {
  pop_divisor: number;
  k_inc: number;
  k_mult: number;
  phage_mult: number;
  plasmid_cap: number;
}

function getResetConstants(type: ResetType): ResetConstants {
  const defaults: ResetConstants = {
    pop_divisor: 999,
    k_inc: 1_000_000,
    k_mult: 100,
    phage_mult: 0,
    plasmid_cap: 150,
  };
  switch (type) {
    case 'mad':
      return { pop_divisor: 3, k_inc: 100_000, k_mult: 1.1,   phage_mult: 0,   plasmid_cap: 150 };
    case 'cataclysm':
    case 'bioseed':
      return { pop_divisor: 3, k_inc: 50_000,  k_mult: 1.015, phage_mult: 1,   plasmid_cap: 400 };
    case 'aiApoc':
      return { pop_divisor: 2.5, k_inc: 45_000, k_mult: 1.014, phage_mult: 2,  plasmid_cap: 600 };
    case 'vacuum':
    case 'blackhole':
      return { pop_divisor: 2.2, k_inc: 40_000, k_mult: 1.012, phage_mult: 2.5, plasmid_cap: 800 };
    case 'ascend':
    case 'terraform':
      return { pop_divisor: 1.15, k_inc: 30_000, k_mult: 1.008, phage_mult: 4, plasmid_cap: 2000 };
    case 'matrix':
      return { pop_divisor: 1.5,  k_inc: 32_000, k_mult: 1.01,  phage_mult: 3.2, plasmid_cap: 1800 };
    case 'retire':
      return { pop_divisor: 1.15, k_inc: 32_000, k_mult: 1.006, phage_mult: 3.2, plasmid_cap: 1800 };
    case 'eden':
      return { pop_divisor: 1,    k_inc: 18_000, k_mult: 1.004, phage_mult: 2.5, plasmid_cap: 1800 };
    case 'descend':
    case 'apotheosis':
      return { pop_divisor: 1.15, k_inc: 30_000, k_mult: 1.008, phage_mult: 4, plasmid_cap: 2000 };
    default:
      return defaults;
  }
}

/**
 * 飞升等级（对标 legacy achieve.js alevel() L542-555）
 *
 * 原版 alevel() = 当前 run 携带的挑战基因数量 + 1（1-5）。
 * 等级决定 plasmid_cap 倒数第二参数以及 challenge_multiplier 套用。
 */
function getAscendLevel(state: GameState): number {
  let a_level = 1;
  const race = state.race as Record<string, unknown>;
  if (race['no_plasmid'])    a_level++;
  if (race['no_trade'])      a_level++;
  if (race['no_craft'])      a_level++;
  if (race['no_crispr'])     a_level++;
  if (race['weak_mastery'])  a_level++;
  if (race['nerfed'])        a_level++;
  if (race['badgenes'])      a_level++;
  return Math.min(5, a_level);
}

/**
 * 计算声望收益（对标 legacy/src/functions.js calcPrestige L1574-1755）
 *
 * 核心流程：
 *   1. 人口 pop = 当前市民数（高人口种族除以 10）
 *   2. Plasmid = round(pop / pop_divisor)，再按 Knowledge 加成，受 plasmid_cap 软上限限制
 *   3. Phage = floor(log2(plasmid) * E * phage_mult)
 *   4. 特殊类型：blackhole → Dark，ascend → Harmony，descend → Artifact，apotheosis → Supercoiled
 *   5. 减去 pdebt（质疑债务）
 */
export function calcPrestigeGains(state: GameState, type: ResetType): PrestigeGains {
  const gains: PrestigeGains = {
    plasmid:    0,
    phage:      0,
    dark:       0,
    harmony:    0,
    artifact:   0,
    supercoiled: 0,
    pdebt:      0,
  };

  const rc = getResetConstants(type);
  let { pop_divisor, plasmid_cap } = rc;
  const { k_mult, phage_mult } = rc;
  let k_inc = rc.k_inc;

  // --- 人口计算 ---
  const isSynth = (state.race as Record<string, unknown>)['type'] === 'synthetic';
  // MAD 合成种族减少人口效率
  if (type === 'mad' && isSynth) {
    pop_divisor = 5;
    k_inc = 125_000;
    plasmid_cap = 100;
  }

  const speciesResource = state.resource[state.race.species] as { amount?: number } | undefined;
  const isHighPop = Boolean(state.race['high_pop']);
  // high_pop.vars()[0] 在 rank=1 时 = 4（legacy races.js L723）
  // 严格实现需读取种族 trait rank，此处简化取 rank=1 默认值
  const HIGH_POP_DIVISOR = 4;
  let pop = speciesResource?.amount ?? 0;
  if (isHighPop) {
    pop = Math.round(pop / HIGH_POP_DIVISOR);
  }
  // 加上驻扎兵力（从 civic.garrison 读取，不含占领区额外驻军）
  const civic = state.civic as Record<string, Record<string, number>> | undefined;
  let garrisoned = civic?.['garrison']?.['workers'] ?? 0;
  if (isHighPop) garrisoned = Math.round(garrisoned / HIGH_POP_DIVISOR);
  pop += garrisoned;

  // --- Plasmid 计算 ---
  const knowTotal = (state.stats as Record<string, number> | undefined)?.['know'] ?? 0;
  let new_plasmid = Math.round(pop / pop_divisor);
  let k_base = knowTotal;
  while (k_base > k_inc) {
    new_plasmid++;
    k_base -= k_inc;
    k_inc *= k_mult;
  }

  // Cataclysm / lone_survivor 基础加成
  if (state.race['cataclysm']) {
    new_plasmid += 300;
  } else if (state.race['lone_survivor']) {
    new_plasmid += 800;
  }

  // challenge_multiplier：对标 legacy functions.js challenge_multiplier() L1442-1490
  // 包括：宇宙类型加成 + truepath加成 + alevel 挑战等级加成（后者最重要，最高 45% 加成）
  const universe = state.race.universe ?? 'standard';
  let cm = 1;
  if (universe === 'micro')      cm *= 0.25;
  if (universe === 'antimatter') cm *= 1.1;
  if (universe === 'heavy' && type !== 'mad') cm *= 1.05;   // heavy 对 mad 无加成
  if (state.race['truepath'])    cm *= 1.1;
  // alevel 挑战等级加成（对标 L1479-1490）
  const aLvl = getAscendLevel(state);
  switch (aLvl) {
    case 2: cm *= 1.05; break;
    case 3: cm *= 1.12; break;
    case 4: cm *= 1.25; break;
    case 5: cm *= 1.45; break;
    default: break; // level 1：无加成
  }
  new_plasmid = Math.round(new_plasmid * cm);

  // Plasmid 上限软压缩（对标 L1648-1653）
  const adjustedCap = Math.floor(plasmid_cap * (1 + (aLvl - (state.race['truepath'] ? 0 : 1)) / 8));
  if (new_plasmid > adjustedCap) {
    const overflow = new_plasmid - adjustedCap;
    new_plasmid = adjustedCap + Math.floor(overflow / (overflow + adjustedCap) * adjustedCap);
  }
  gains.plasmid = new_plasmid;

  // --- Phage 计算（对标 L1658）---
  if (gains.plasmid > 0 && phage_mult > 0) {
    gains.phage = Math.round(
      Math.floor(Math.log2(gains.plasmid) * Math.E * phage_mult) * cm
    );
  }

  // --- Dark（黑洞 / 真空坍塌）---
  if (type === 'blackhole') {
    const stellar = (state.interstellar as Record<string, Record<string, number>> | undefined)?.['stellar_engine'];
    const exotic = stellar?.['exotic'] ?? 0;
    const mass   = stellar?.['mass']   ?? 8;
    let new_dark = +(Math.log(1 + exotic * 40)).toFixed(3);
    new_dark    += +(Math.log2(Math.max(8, mass) - 7) / 2.5).toFixed(3);
    gains.dark   = +(new_dark * cm).toFixed(3);
  } else if (type === 'vacuum') {
    const manaGen = (state.resource['Mana'] as unknown as Record<string, number> | undefined)?.['gen'] ?? 0;
    const new_dark = +(Math.log2(Math.max(1, manaGen)) / 5).toFixed(3);
    gains.dark   = +(new_dark * cm).toFixed(3);
  }

  // --- Harmony / Artifact / Supercoiled（ascend 系）---
  if (['ascend', 'descend', 'terraform', 'apotheosis'].includes(type)) {
    const pr_gain = Math.min(5, aLvl);

    if (type === 'ascend' || type === 'terraform') {
      let h = pr_gain;
      if (universe === 'micro')      h *= 0.25;
      else if (universe === 'heavy') h *= 1.2;
      else if (universe === 'antimatter') h *= 1.1;
      gains.harmony = parseFloat(h.toFixed(2));
    } else if (type === 'descend') {
      let artifact = universe === 'micro' ? 1 : pr_gain;
      const spire = (state.portal as Record<string, Record<string, number>> | undefined)?.['spire']?.['count'] ?? 0;
      if (spire > 50)  artifact++;
      if (spire > 100) artifact++;
      gains.artifact = artifact;
    } else if (type === 'apotheosis') {
      // 神化：固定 Plasmid = (256>>4)^4 - 65535 = 1，Supercoiled = alevel^(2 or 3)
      // 对标 legacy L1726: (256>>4)^4 - 65535 = 16^4 - 65535 = 65536 - 65535 = 1
      gains.plasmid = 1;
      if (universe === 'micro') {
        gains.supercoiled = pr_gain ** 2;
      } else {
        gains.supercoiled = pr_gain ** 3;
      }
      if (state.race['warlord']) {
        gains.artifact    = 5;
        gains.supercoiled = 64;
      }
    }
  }

  // --- AICore（退休）---
  if (type === 'aiApoc') {
    gains.artifact = universe === 'micro' ? 2 : 5; // reuse artifact field for cores
  }

  // --- pdebt（质疑债务）---
  const pdebt = (state.stats as Record<string, number> | undefined)?.['pdebt'] ?? 0;
  if (pdebt > 0) {
    gains.plasmid -= pdebt;
    if (gains.plasmid < 0) {
      gains.pdebt   = Math.abs(gains.plasmid);
      gains.plasmid = 0;
    } else {
      gains.pdebt = 0;
    }
  }

  return gains;
}

// ============================================================
// 转生函数
// ============================================================

/**
 * MAD（核战自毁）转生
 * 对标 legacy/src/resets.js L7-84
 * 条件：mad.armed=false 且非 cataclysm
 * 奖励：Plasmid（或 AntiPlasmid）
 * 保留：轨道、生物群落、行星特质、地质
 */
export function resetMAD(state: GameState): GameState | null {
  const civic = state.civic as Record<string, Record<string, unknown>> | undefined;
  if (civic?.['mad']?.['armed']) return null;
  if (state.race['cataclysm']) return null;

  const newState: GameState = JSON.parse(JSON.stringify(state));

  const gains = calcPrestigeGains(newState, 'mad');
  applyPlasmid(newState, gains.plasmid);
  newState.stats = incrementStat(newState.stats, 'mad');

  const god = newState.race.species;
  const oldGod = newState.race.gods;
  const srace = newState.race['srace'] as string | false ?? false;
  const corruption = getCorruption(newState);
  const orbit = getOrbit(newState);
  const biome = getBiome(newState);
  const ptrait = getPtrait(newState);
  const geo = getGeology(newState);

  newState.race = {
    species: 'protoplasm',
    gods: god,
    old_gods: oldGod,
    rapid_mutation: 1,
    ancient_ruins: 1,
    universe: newState.race.universe,
    seeded: false,
    ascended: newState.race['ascended'] ?? false,
  };
  if (corruption > 0) newState.race['corruption'] = corruption;
  if (srace) newState.race['srace'] = srace;

  resetCommon(newState, { orbit, biome, ptrait, geology: geo });
  return newState;
}

/**
 * Bioseed（生物播种）转生
 * 对标 legacy/src/resets.js L87-224
 * 奖励：Phage + Plasmid
 * 携带：探测器数量 +1，geck 数量
 */
export function resetBioseed(state: GameState): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));

  const gains = calcPrestigeGains(newState, 'bioseed');
  applyPlasmid(newState, gains.plasmid);
  applyPhage(newState, gains.phage);
  newState.stats = incrementStat(newState.stats, 'bioseed');

  const god = newState.race.species;
  const oldGod = newState.race.gods;
  const orbit = getOrbit(newState);
  const biome = getBiome(newState);
  const ptrait = getPtrait(newState);
  const srace = newState.race['srace'] as string | false ?? false;
  const corruption = getCorruption(newState);

  const starDock = newState.starDock as Record<string, Record<string, number>> | undefined;
  let probes = (starDock?.['probes']?.['count'] ?? 0) + 1;
  const gecks = starDock?.['geck']?.['count'] ?? 0;
  const explorerL = getAchieveLevel(newState, 'explorer');
  probes += explorerL;

  newState.race = {
    species: 'protoplasm',
    gods: god,
    old_gods: oldGod,
    universe: newState.race.universe,
    seeded: true,
    probes,
    geck: gecks,
    seed: Math.floor(Math.random() * 10000),
    ascended: false,
  };
  if (corruption > 0) newState.race['corruption'] = corruption;
  if (srace) newState.race['srace'] = srace;

  resetCommon(newState, { orbit, biome, ptrait, geology: false });
  return newState;
}

/**
 * Cataclysm 结束转生
 * 对标 legacy/src/resets.js L227-317
 * 条件：ptrait includes 'unstable' 且已研究 quaked
 * 特殊：保留种族 species 不重置，置 start_cataclysm=1
 */
export function resetCataclysm(state: GameState): GameState | null {
  const ptrait = getPtrait(state);
  if (!ptrait.includes('unstable')) return null;
  if (!state.tech['quaked']) return null;

  const newState: GameState = JSON.parse(JSON.stringify(state));

  const gains = calcPrestigeGains(newState, 'cataclysm');
  applyPlasmid(newState, gains.plasmid);
  applyPhage(newState, gains.phage);
  newState.stats = incrementStat(newState.stats, 'cataclysm');

  const orbit = getOrbit(newState);
  const biome = getBiome(newState);
  const geo = getGeology(newState);
  const srace = newState.race['srace'] as string | false ?? false;
  const corruption = getCorruption(newState);
  const mainType = newState.race['maintype'] as string | false ?? false;

  newState.race = {
    species: newState.race.species,   // 保留种族
    gods: newState.race.gods,
    old_gods: newState.race['old_gods'],
    universe: newState.race.universe,
    seeded: false,
    ascended: newState.race['ascended'] ?? false,
  };
  if (corruption > 0) newState.race['corruption'] = corruption;
  if (srace) newState.race['srace'] = srace;
  if (mainType) newState.race['maintype'] = mainType;

  // 标记下一次为 cataclysm 模式
  if (newState.race.universe === 'antimatter') {
    newState.race['weak_mastery'] = 1;
  } else {
    newState.race['no_plasmid'] = 1;
  }
  for (const g of ['crispr', 'trade', 'craft']) {
    newState.race[`no_${g}`] = 1;
  }
  newState.race['start_cataclysm'] = 1;
  newState.race['cataclysm'] = 1;

  resetCommon(newState, { orbit, biome, ptrait, geology: geo });
  return newState;
}

/**
 * 黑洞（big_bang）转生
 * 对标 legacy/src/resets.js L320-429
 * 奖励：Phage + Plasmid + Dark
 * 目标宇宙：bigbang
 */
export function resetBlackhole(state: GameState, targetUniverse?: string): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));

  const gains = calcPrestigeGains(newState, 'blackhole');
  applyPlasmid(newState, gains.plasmid);
  applyPhage(newState, gains.phage);
  applyDark(newState, gains.dark);
  newState.stats = incrementStat(newState.stats, 'blackhole');
  newState.stats = incrementStat(newState.stats, 'universes');

  const god = newState.race.species;
  const oldGod = newState.race.gods;
  const orbit = getOrbit(newState);
  const biome = getBiome(newState);
  const ptrait = getPtrait(newState);
  const srace = newState.race['srace'] as string | false ?? false;
  const corruption = getCorruption(newState);

  // 默认进入 bigbang 重启同一宇宙；玩家可指定切换到 magic / heavy / micro / antimatter / evil
  const newUniverse = targetUniverse ?? 'bigbang';

  newState.race = {
    species: 'protoplasm',
    gods: god,
    old_gods: oldGod,
    universe: newUniverse,
    seeded: true,
    bigbang: true,
    probes: 4,
    seed: Math.floor(Math.random() * 10000),
    ascended: false,
  };
  if (corruption > 0) newState.race['corruption'] = corruption;
  if (srace) newState.race['srace'] = srace;

  // 应用宇宙类型特殊效果（如 magic 自动启用 Mana）
  if (newUniverse !== 'bigbang' && (UNIVERSES as Record<string, unknown>)[newUniverse]) {
    applyUniverse(newState, newUniverse as UniverseType);
  }

  resetCommon(newState, { orbit, biome, ptrait, geology: false });
  return newState;
}

/**
 * 飞升（ascend）转生
 * 对标 legacy/src/resets.js L532-630
 * 奖励：Phage + Plasmid + Harmony
 * 特殊：地质 +0.02（ascended 玩家积累收益）
 */
export function resetAscend(state: GameState): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));

  const gains = calcPrestigeGains(newState, 'ascend');
  applyPlasmid(newState, gains.plasmid);
  applyPhage(newState, gains.phage);
  applyHarmony(newState, gains.harmony);
  newState.stats = incrementStat(newState.stats, 'ascend');

  const god = newState.race.species;
  const oldGod = newState.race.gods;
  const orbit = getOrbit(newState);
  const biome = getBiome(newState);
  const ptrait = getPtrait(newState);
  const srace = newState.race['srace'] as string | false ?? false;
  const corruption = getCorruption(newState);

  // 地质 +0.02（飞升奖励）
  const geo = getGeology(newState);
  for (const g of Object.keys(geo)) {
    geo[g] = +((geo[g] + 0.02).toFixed(2));
  }

  newState.race = {
    species: 'protoplasm',
    gods: god,
    old_gods: oldGod,
    universe: newState.race.universe,
    seeded: false,
    seed: Math.floor(Math.random() * 10000),
    ascended: true,
  };
  if (corruption > 0) newState.race['corruption'] = corruption;
  if (srace) newState.race['srace'] = srace;

  resetCommon(newState, { orbit, biome, ptrait, geology: geo });
  return newState;
}

/**
 * 堕落/恶魔融合（descension）转生
 * 对标 legacy/src/resets.js L633-745
 * 奖励：Artifact
 * 特殊：corruption = 5（开始带有腐化）
 */
export function resetDescend(state: GameState): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));

  const gains = calcPrestigeGains(newState, 'descend');
  applyArtifact(newState, gains.artifact);
  newState.stats = incrementStat(newState.stats, 'descend');

  const god = newState.race.species;
  const oldGod = newState.race.gods;
  const orbit = getOrbit(newState);
  const biome = getBiome(newState);
  const ptrait = getPtrait(newState);
  const geo = getGeology(newState);
  const srace = newState.race['srace'] as string | false ?? false;

  newState.race = {
    species: 'protoplasm',
    gods: god,
    old_gods: oldGod,
    universe: newState.race.universe,
    seeded: false,
    seed: Math.floor(Math.random() * 10000),
    corruption: 5,
    ascended: newState.race['ascended'] ?? false,
  };
  if (srace) newState.race['srace'] = srace;

  resetCommon(newState, { orbit, biome, ptrait, geology: geo });
  return newState;
}

/**
 * 神化（apotheosis）转生
 * 对标 legacy/src/resets.js L748-844
 * 奖励：Supercoiled + Plasmid（+ Artifact if warlord）
 */
export function resetApotheosis(state: GameState): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));

  const gains = calcPrestigeGains(newState, 'apotheosis');
  applyPlasmid(newState, gains.plasmid);
  applySupercoiled(newState, gains.supercoiled);
  if (newState.race['warlord']) applyArtifact(newState, gains.artifact);
  newState.stats = incrementStat(newState.stats, 'apotheosis');

  const god = newState.race.species;
  const oldGod = newState.race.gods;
  const orbit = getOrbit(newState);
  const biome = getBiome(newState);
  const ptrait = getPtrait(newState);
  const geo = getGeology(newState);
  const srace = newState.race['srace'] as string | false ?? false;
  const corruption = getCorruption(newState);

  newState.race = {
    species: 'protoplasm',
    gods: god,
    old_gods: oldGod,
    universe: newState.race.universe,
    seeded: false,
    seed: Math.floor(Math.random() * 10000),
    ascended: newState.race['ascended'] ?? false,
  };
  if (corruption > 0) newState.race['corruption'] = corruption;
  if (srace) newState.race['srace'] = srace;

  resetCommon(newState, { orbit, biome, ptrait, geology: geo });
  return newState;
}

/**
 * 退休（retirement）转生
 * 对标 legacy/src/resets.js L1095-1177
 * 触发：truepath 宇宙点燃气态巨星（m_ignite >= 2）且 m_brain 已完成
 * 奖励：Plasmid + Phage + AICore
 */
export function resetRetire(state: GameState): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));

  const gains = calcPrestigeGains(newState, 'retire');
  applyPlasmid(newState, gains.plasmid);
  applyPhage(newState, gains.phage);
  applyAICore(newState, gains.artifact); // AICore gains 用 artifact 字段携带，待 calcPrestigeGains 实现后修正
  newState.stats = incrementStat(newState.stats, 'retire');

  const god = newState.race.species;
  const oldGod = newState.race.gods;
  const orbit = getOrbit(newState);
  const biome = getBiome(newState);
  const ptrait = getPtrait(newState);
  const geo = getGeology(newState);
  const srace = newState.race['srace'] as string | false ?? false;
  const corruption = getCorruption(newState);

  newState.race = {
    species: 'protoplasm',
    gods: god,
    old_gods: oldGod,
    universe: newState.race.universe,
    seeded: false,
    seed: Math.floor(Math.random() * 10000),
    ascended: newState.race['ascended'] ?? false,
  };
  if (corruption > 0) newState.race['corruption'] = corruption;
  if (srace) newState.race['srace'] = srace;

  resetCommon(newState, { orbit, biome, ptrait, geology: geo });
  return newState;
}

// ============================================================
// 可用性检查（供 UI 使用）
// ============================================================

/** 检查各转生是否满足触发条件 */
export function canReset(state: GameState, type: ResetType): boolean {
  switch (type) {
    case 'mad': {
      const civic = state.civic as Record<string, Record<string, unknown>> | undefined;
      return !civic?.['mad']?.['armed'] && !state.race['cataclysm'];
    }
    case 'bioseed':
      return Boolean(state.tech['genesis'] && (state.tech['genesis'] as number) >= 7);
    case 'cataclysm': {
      const ptrait = getPtrait(state);
      return ptrait.includes('unstable') && Boolean(state.tech['quaked']);
    }
    case 'blackhole':
      return Boolean(state.tech['blackhole'] && (state.tech['blackhole'] as number) >= 5);
    case 'vacuum':
      // legacy vacuumCollapse L432: tech.syphon >= 80（60 是 effect 显示倒计时阈值，80 才触发）
      return Boolean(state.tech['syphon'] && (state.tech['syphon'] as number) >= 80)
        && state.race.universe === 'magic';
    case 'ascend':
      return Boolean(state.tech['ascension'] && (state.tech['ascension'] as number) >= 1);
    case 'descend':
      return Boolean(state.tech['daemons'] && (state.tech['daemons'] as number) >= 5);
    case 'apotheosis':
      return Boolean(state.tech['apotheosis'] && (state.tech['apotheosis'] as number) >= 1);
    case 'terraform':
      return Boolean(state.tech['terraform'] && (state.tech['terraform'] as number) >= 5);
    case 'aiApoc':
      return Boolean(state.tech['ai_core'] && (state.tech['ai_core'] as number) >= 5);
    case 'matrix':
      return Boolean(state.tech['matrix'] && (state.tech['matrix'] as number) >= 3);
    case 'retire':
      // legacy truepath.js L3924: 触发条件 m_brain 完成 + m_ignite >= 2
      return Boolean(state.tech['m_brain']) &&
        Boolean(state.tech['m_ignite'] && (state.tech['m_ignite'] as number) >= 2);
    case 'eden':
      return Boolean(state.tech['eden'] && (state.tech['eden'] as number) >= 1);
    default:
      return false;
  }
}

// ============================================================
// 通用入口（统一调度）
// ============================================================

export function triggerReset(state: GameState, type: ResetType): GameState | null {
  if (!canReset(state, type)) return null;
  // 先触发成就（在 state 重置前读取当前种族 / tech）
  checkResetAchievements(state, type);

  switch (type) {
    case 'mad':       return resetMAD(state);
    case 'bioseed':   return resetBioseed(state);
    case 'cataclysm': return resetCataclysm(state);
    case 'blackhole': return resetBlackhole(state);
    case 'vacuum':    return resetBlackhole(state);
    case 'ascend':    return resetAscend(state);
    case 'descend':   return resetDescend(state);
    case 'apotheosis':return resetApotheosis(state);
    case 'retire':    return resetRetire(state);
    case 'terraform': return resetTerraform(state);
    case 'aiApoc':    return resetAiApocalypse(state);
    case 'matrix':    return resetMatrix(state);
    case 'eden':      return resetGardenOfEden(state);
    default:          return null;
  }
}

// ============================================================
// 扩展转生：terraform / aiApoc / matrix / eden
// ============================================================

/**
 * Terraform（地球化）转生 — 对标 legacy/src/resets.js terraform L844-931
 * 触发：拥有 terraform 科技 ≥ 5，选择新行星
 * 奖励：Phage + Plasmid + Harmony
 * 保留：geo（不重置），所有地质 +0.02
 */
export function resetTerraform(state: GameState): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));

  const gains = calcPrestigeGains(newState, 'terraform');
  applyPlasmid(newState, gains.plasmid);
  applyPhage(newState, gains.phage);
  applyHarmony(newState, gains.harmony);
  newState.stats = incrementStat(newState.stats, 'terraform');

  const god = newState.race.species;
  const oldGod = newState.race.gods;
  const orbit = getOrbit(newState);
  const biome = getBiome(newState);
  const ptrait = getPtrait(newState);
  const srace = newState.race['srace'] as string | false ?? false;
  const corruption = getCorruption(newState);

  // 地质 +0.02
  const geo = getGeology(newState);
  for (const g of Object.keys(geo)) {
    geo[g] = +((geo[g] + 0.02).toFixed(2));
  }

  newState.race = {
    species: 'protoplasm',
    gods: god,
    old_gods: oldGod,
    universe: newState.race.universe,
    seeded: false,
    seed: Math.floor(Math.random() * 10000),
    ascended: newState.race['ascended'] ?? false,
    rejuvenated: true,
  };
  if (corruption > 0) newState.race['corruption'] = corruption;
  if (srace) newState.race['srace'] = srace;

  resetCommon(newState, { orbit, biome, ptrait, geology: geo });
  return newState;
}

/**
 * AI Apocalypse（AI 末日）转生 — 对标 legacy/src/resets.js aiApocalypse L934-1043
 * 触发：ai_core 科技 ≥ 5（titan AI 核心已建造并通电）
 * 奖励：Phage + Plasmid + AICore
 * 携带：种族变更为 synth
 */
export function resetAiApocalypse(state: GameState): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));

  const gains = calcPrestigeGains(newState, 'aiApoc');
  applyPlasmid(newState, gains.plasmid);
  applyPhage(newState, gains.phage);
  applyAICore(newState, gains.artifact);
  newState.stats = incrementStat(newState.stats, 'aiApoc');

  const god = newState.race.species;
  const oldGod = newState.race.gods;
  const orbit = getOrbit(newState);
  const biome = getBiome(newState);
  const ptrait = getPtrait(newState);
  const geo = getGeology(newState);

  // AI 末日：保存原种族 ID 为 srace，自身变为 synth
  newState.race = {
    species: 'protoplasm',
    gods: god,
    old_gods: oldGod,
    universe: newState.race.universe,
    seeded: false,
    seed: Math.floor(Math.random() * 10000),
    ascended: newState.race['ascended'] ?? false,
    srace: god,  // 用 srace 记录原种族，便于 synth 复制
  };

  resetCommon(newState, { orbit, biome, ptrait, geology: geo });
  return newState;
}

/**
 * Matrix（矩阵）转生 — 对标 legacy/src/resets.js matrix L1046-1093
 * 触发：完成 matrix 科技（eris 上完成 matrix 项目）
 * 奖励：Phage + Plasmid
 */
export function resetMatrix(state: GameState): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));

  const gains = calcPrestigeGains(newState, 'matrix');
  applyPlasmid(newState, gains.plasmid);
  applyPhage(newState, gains.phage);
  newState.stats = incrementStat(newState.stats, 'matrix');

  const god = newState.race.species;
  const oldGod = newState.race.gods;
  const orbit = getOrbit(newState);
  const biome = getBiome(newState);
  const ptrait = getPtrait(newState);
  const geo = getGeology(newState);
  const srace = newState.race['srace'] as string | false ?? false;
  const corruption = getCorruption(newState);

  newState.race = {
    species: 'protoplasm',
    gods: god,
    old_gods: oldGod,
    universe: newState.race.universe,
    seeded: false,
    seed: Math.floor(Math.random() * 10000),
    ascended: newState.race['ascended'] ?? false,
    matrix: true,
  };
  if (corruption > 0) newState.race['corruption'] = corruption;
  if (srace) newState.race['srace'] = srace;

  resetCommon(newState, { orbit, biome, ptrait, geology: geo });
  return newState;
}

/**
 * Garden of Eden（伊甸园）转生 — 对标 legacy/src/resets.js gardenOfEden L1180-1262
 * 触发：完成 eden 科技 ≥ 1（apotheosis 已激活）
 * 奖励：Plasmid + Phage + Harmony（小于 ascend，专属 eden 路径）
 */
export function resetGardenOfEden(state: GameState): GameState {
  const newState: GameState = JSON.parse(JSON.stringify(state));

  const gains = calcPrestigeGains(newState, 'eden');
  applyPlasmid(newState, gains.plasmid);
  applyPhage(newState, gains.phage);
  applyHarmony(newState, gains.harmony);
  newState.stats = incrementStat(newState.stats, 'eden');

  const god = newState.race.species;
  const oldGod = newState.race.gods;
  const orbit = getOrbit(newState);
  const biome = getBiome(newState);
  const ptrait = getPtrait(newState);
  const geo = getGeology(newState);
  const srace = newState.race['srace'] as string | false ?? false;
  const corruption = getCorruption(newState);

  newState.race = {
    species: 'protoplasm',
    gods: god,
    old_gods: oldGod,
    universe: newState.race.universe,
    seeded: false,
    seed: Math.floor(Math.random() * 10000),
    ascended: true,
    edenic: true,
  };
  if (corruption > 0) newState.race['corruption'] = corruption;
  if (srace) newState.race['srace'] = srace;

  resetCommon(newState, { orbit, biome, ptrait, geology: geo });
  return newState;
}

// ============================================================
// 内部工具函数
// ============================================================

function getCorruption(state: GameState): number {
  const c = state.race['corruption'] as number | undefined;
  return c && c > 1 ? c - 1 : 0;
}

function getAchieveLevel(state: GameState, id: string): number {
  const achieve = state.stats?.['achieve'] as Record<string, { l?: number }> | undefined;
  return achieve?.[id]?.l ?? 0;
}

function incrementStat(stats: GameState['stats'], key: string): GameState['stats'] {
  const s = stats as Record<string, unknown>;
  s[key] = ((s[key] as number) ?? 0) + 1;
  return stats;
}

function applyPlasmid(state: GameState, amount: number): void {
  if (amount <= 0) return;
  if (state.race.universe === 'antimatter') {
    addPrestige(state, 'AntiPlasmid', amount);
    incrementStatBy(state.stats, 'antiplasmid', amount);
  } else {
    addPrestige(state, 'Plasmid', amount);
    incrementStatBy(state.stats, 'plasmid', amount);
  }
}

function applyPhage(state: GameState, amount: number): void {
  if (amount <= 0) return;
  addPrestige(state, 'Phage', amount);
  incrementStatBy(state.stats, 'phage', amount);
}

function applyDark(state: GameState, amount: number): void {
  if (amount <= 0) return;
  const prestige = state.prestige as Record<string, { count: number }> | undefined;
  if (prestige?.['Dark']) {
    prestige['Dark'].count = +((prestige['Dark'].count + amount).toFixed(3));
  }
  incrementStatByFixed(state.stats, 'dark', amount);
}

function applyHarmony(state: GameState, amount: number): void {
  if (amount <= 0) return;
  const prestige = state.prestige as Record<string, { count: number }> | undefined;
  if (prestige?.['Harmony']) {
    prestige['Harmony'].count = parseFloat((prestige['Harmony'].count + amount).toFixed(2));
  }
  incrementStatByFixed(state.stats, 'harmony', amount);
}

function applyArtifact(state: GameState, amount: number): void {
  if (amount <= 0) return;
  addPrestige(state, 'Artifact', amount);
  incrementStatBy(state.stats, 'artifact', amount);
}

function applySupercoiled(state: GameState, amount: number): void {
  if (amount <= 0) return;
  addPrestige(state, 'Supercoiled', amount);
  incrementStatBy(state.stats, 'supercoiled', amount);
}

/** AICore（AI 核心）声望，retirement 奖励 */
function applyAICore(state: GameState, amount: number): void {
  if (amount <= 0) return;
  addPrestige(state, 'AICore', amount);
  incrementStatBy(state.stats, 'cores', amount);
}

function addPrestige(state: GameState, key: string, amount: number): void {
  const prestige = state.prestige as Record<string, { count: number }> | undefined;
  if (prestige?.[key]) {
    prestige[key].count += amount;
  }
}

function incrementStatBy(stats: GameState['stats'], key: string, amount: number): void {
  const s = stats as Record<string, unknown>;
  s[key] = ((s[key] as number) ?? 0) + amount;
}

function incrementStatByFixed(stats: GameState['stats'], key: string, amount: number): void {
  const s = stats as Record<string, unknown>;
  s[key] = +((((s[key] as number) ?? 0) + amount).toFixed(3));
}

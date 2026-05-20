/**
 * 魔法宇宙系统 (Magic Universe)
 *
 * 对标 legacy:
 *   - tech.js L11269-11468 (rituals, alchemy, crafting_ritual, conjuring 等魔法科技)
 *   - industry.js L1319-1349 (setupRituals, cancelRituals)
 *   - seasons.js L299-403 (astrologySign, astroVal)
 *   - races.js (witch_hunter, blood_thirst 等魔法相关 trait)
 *
 * 包含：
 *   1. 仪式（Rituals）— 用 Mana 增益各类岗位产出
 *   2. 炼金（Alchemy）— 用 Mana + Crystal 转化为其他资源
 *   3. 占星（Astrology）— 根据当前日期取黄道宫，提供加成
 *   4. 血脉（Blood / ARPA 项目）— 血祭仪式
 *   5. 法术（Conjuring）— 召唤食物/木材
 *   6. 尖塔系统已在 portal.ts 中实装
 */

import type { GameState } from '@evozen/shared-types';

// ============================================================
// 仪式（Rituals）
// ============================================================

export const RITUAL_TYPES = [
  'farmer', 'miner', 'lumberjack', 'science',
  'factory', 'army', 'hunting', 'crafting',
] as const;

export type RitualType = typeof RITUAL_TYPES[number];

export interface RitualCastingState {
  farmer: number;
  miner: number;
  lumberjack: number;
  science: number;
  factory: number;
  army: number;
  hunting: number;
  crafting: number;
  total: number;
}

/** 初始化仪式系统（对标 setupRituals L1320-1333）*/
export function setupRituals(state: GameState): void {
  if (!state.race['casting']) {
    state.race['casting'] = {
      farmer: 0, miner: 0, lumberjack: 0, science: 0,
      factory: 0, army: 0, hunting: 0, crafting: 0,
      total: 0,
    } as RitualCastingState;
  }
}

/** 取消所有仪式（cancelRituals L1342-1348）*/
export function cancelRituals(state: GameState): void {
  if (state.race['casting']) {
    const casting = state.race['casting'] as RitualCastingState;
    for (const key of RITUAL_TYPES) {
      casting[key] = 0;
    }
    casting.total = 0;
  }
}

/** 设置某仪式的强度（消耗 Mana） */
export function setRitualPower(state: GameState, ritual: RitualType, power: number): boolean {
  if (!state.race['casting']) setupRituals(state);
  const casting = state.race['casting'] as RitualCastingState;
  const oldVal = casting[ritual];
  const delta = power - oldVal;
  if (delta > 0) {
    const mana = state.resource['Mana'];
    if (!mana || mana.amount < delta) return false;
    mana.amount -= delta;
  } else if (delta < 0) {
    const mana = state.resource['Mana'];
    if (mana) mana.amount = Math.min(mana.max, mana.amount + Math.abs(delta));
  }
  casting[ritual] = power;
  casting.total = RITUAL_TYPES.reduce((s, r) => s + casting[r], 0);
  return true;
}

/** 计算仪式对某岗位类型的产出加成系数（默认 1）*/
export function getRitualMultiplier(state: GameState, ritual: RitualType): number {
  const casting = state.race['casting'] as RitualCastingState | undefined;
  if (!casting) return 1;
  // 对标 industry.js: 每点 mana × 0.5% 加成（简化版）
  return 1 + casting[ritual] * 0.005;
}

// ============================================================
// 炼金（Alchemy）
// ============================================================

export const ALCHEMY_RESOURCES = [
  'Food', 'Lumber', 'Stone', 'Furs',
  'Copper', 'Iron', 'Aluminium', 'Cement',
  'Coal', 'Oil', 'Uranium', 'Steel',
  'Titanium', 'Alloy', 'Polymer', 'Iridium',
  'Helium_3', 'Deuterium', 'Neutronium', 'Adamantite',
  'Infernite', 'Elerium', 'Nano_Tube', 'Graphene',
  'Stanene', 'Bolognium', 'Vitreloy', 'Orichalcum',
] as const;

export type AlchemyResource = typeof ALCHEMY_RESOURCES[number];

/** 初始化炼金状态（解锁炼金后） */
export function setupAlchemy(state: GameState): void {
  if (!state.race['alchemy']) {
    const alchemy: Record<string, number> = {};
    for (const r of ALCHEMY_RESOURCES) alchemy[r] = 0;
    state.race['alchemy'] = alchemy;
  }
}

/** 设置某资源的炼金转化量 */
export function setAlchemyTarget(state: GameState, resource: AlchemyResource, amount: number): boolean {
  if (!state.race['alchemy']) setupAlchemy(state);
  const alchemy = state.race['alchemy'] as Record<string, number>;
  const old = alchemy[resource] ?? 0;
  const delta = amount - old;

  // 每个炼金目标每秒消耗 1 Mana + 1 Crystal
  if (delta > 0) {
    const mana = state.resource['Mana'];
    const crystal = state.resource['Crystal'];
    if (!mana || mana.amount < delta || !crystal || crystal.amount < delta) return false;
    mana.amount -= delta;
    crystal.amount -= delta;
  }
  alchemy[resource] = amount;
  return true;
}

/** 炼金 tick — 将分配的 Mana 转化为目标资源 */
export function alchemyTick(state: GameState, timeMul: number = 1): void {
  const alchemy = state.race['alchemy'] as Record<string, number> | undefined;
  if (!alchemy) return;
  for (const [resId, amount] of Object.entries(alchemy)) {
    if (amount <= 0) continue;
    const res = state.resource[resId];
    if (!res) continue;
    // 每分配 1 Mana 产生 5 单位目标资源（基础值，受 alchemy 科技加成）
    const alchemyLevel = state.tech['alchemy'] ?? 1;
    const production = amount * (3 + alchemyLevel * 2) * timeMul;
    res.amount = res.max < 0 ? res.amount + production : Math.min(res.max, res.amount + production);
  }
}

// ============================================================
// 占星（Astrology）
// ============================================================

export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer'
  | 'leo' | 'virgo' | 'libra' | 'scorpio'
  | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

/** 根据当前日期取黄道宫 — 对标 astrologySign L338-379 */
export function getAstrologySign(date: Date = new Date()): ZodiacSign {
  const m = date.getMonth(); // 0-11
  const d = date.getDate();   // 1-31

  if ((m === 0 && d >= 20) || (m === 1 && d <= 18)) return 'aquarius';
  if ((m === 1 && d >= 19) || (m === 2 && d <= 20)) return 'pisces';
  if ((m === 2 && d >= 21) || (m === 3 && d <= 19)) return 'aries';
  if ((m === 3 && d >= 20) || (m === 4 && d <= 20)) return 'taurus';
  if ((m === 4 && d >= 21) || (m === 5 && d <= 21)) return 'gemini';
  if ((m === 5 && d >= 22) || (m === 6 && d <= 22)) return 'cancer';
  if ((m === 6 && d >= 23) || (m === 7 && d <= 22)) return 'leo';
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 'virgo';
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 'libra';
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return 'scorpio';
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return 'sagittarius';
  return 'capricorn';
}

/** 黄道宫加成数值 — 对标 astroVal L299-336 */
export function getAstrologyValue(state: GameState, sign?: ZodiacSign): number[] {
  const z = sign ?? getAstrologySign();
  const boosted = !!state.race['wish'];
  const astrologerTrait = state.race['astrologer'] as number | undefined;
  const unfavored = !!state.race['unfavored'];

  // astrologer 加成（每等级 +2%/3%/5%/10% 黄道效果）
  let multiplier = 1;
  if (astrologerTrait) {
    multiplier += unfavored ? -0.1 : 0.1; // rank=1: vars[0]=10
  }
  if (unfavored) {
    multiplier *= -1; // 反转效果
  }

  switch (z) {
    case 'aries':       return [Math.round((boosted ? 12 : 10) * multiplier)]; // Combat
    case 'taurus':      return [+((boosted ? 3 : 2) * multiplier).toFixed(2)]; // Unification
    case 'gemini':      return [Math.round((boosted ? 30 : 20) * multiplier)]; // Knowledge
    case 'cancer':      return [Math.round((boosted ? 8 : 5) * multiplier)]; // Healing
    case 'leo':         return [(boosted ? 5 : 4) * multiplier]; // Power
    case 'virgo':       return [Math.round((boosted ? 20 : 15) * multiplier)]; // Food
    case 'libra':       return [Math.round((boosted ? 40 : 25) * multiplier)]; // Pop growth
    case 'scorpio':     return boosted ? [Math.round(20 * multiplier), 2] : [Math.round(12 * multiplier), 1]; // Spies
    case 'sagittarius': return [(boosted ? 6 : 5) * multiplier]; // Entertainer
    case 'capricorn':   return [Math.round((boosted ? 20 : 10) * multiplier)]; // Trade
    case 'aquarius':    return [Math.round((boosted ? 30 : 20) * multiplier)]; // Tourism
    case 'pisces':      return boosted
      ? [Math.round(79 * multiplier), Math.round(45 * multiplier)]
      : [Math.round(49 * multiplier), Math.round(25 * multiplier)];
    default: return [0];
  }
}

// ============================================================
// 血脉（Blood）— ARPA 血祭项目
// ============================================================

export interface BloodPactState {
  pact: number;           // 当前订立的血脉契约
  blood_thirst: number;   // 嗜血程度
  attract: number;        // 吸引恶魔程度
  /** 自定义自我修正参数 */
  [k: string]: unknown;
}

/** 解锁血脉系统 — 对标 tech_blood_pact L5270 */
export function unlockBloodPact(state: GameState): void {
  if (!state.blood || Object.keys(state.blood).length === 0) {
    state.blood = {
      pact: 0,
      blood_thirst: 0,
      attract: 0,
    };
  }
}

/** 进行一次血祭，消耗血液资源生效 */
export function performBloodSacrifice(state: GameState, type: 'pact' | 'blood_thirst' | 'attract', amount: number): boolean {
  if (!state.blood) unlockBloodPact(state);
  const blood = state.resource['Blood_Stone'];
  if (!blood || blood.amount < amount) return false;
  blood.amount -= amount;
  state.blood[type] = (state.blood[type] ?? 0) + amount;
  return true;
}

// ============================================================
// 法术（Conjuring）— 召唤
// ============================================================

/** 召唤食物 — 对标 tech_conjuring */
export function conjureFood(state: GameState): boolean {
  if (!state.tech['conjuring']) return false;
  const mana = state.resource['Mana'];
  const crystal = state.resource['Crystal'];
  if (!mana || mana.amount < 2 || !crystal || crystal.amount < 5) return false;
  mana.amount -= 2;
  crystal.amount -= 5;
  const food = state.resource['Food'];
  if (food) {
    const amount = 25 * (state.tech['conjuring'] >= 2 ? 2 : 1);
    food.amount = Math.min(food.max, food.amount + amount);
  }
  return true;
}

// ============================================================
// 神龛（Shrine）— Unicorn magnificent trait
// ============================================================

export interface ShrineState {
  morale: number;
  metal: number;
  know: number;
  tax: number;
  biome: number;
}

/**
 * 建造神龛（每月 1 座，按天气 + 温度获得 5 类加成中的一种）
 * 对标 legacy: 天气与温度组合决定 morale / metal / know / tax / biome 5 种 boon
 *
 * 天气编码：weather 0=rain, 1=cloudy, 2=sunny
 * 温度编码：temp 0=cold, 1=mild, 2=hot
 */
export function buildShrine(state: GameState): boolean {
  if (!state.race['magnificent']) return false;
  const moon = state.city.calendar?.moon ?? 0;
  // 仅在新月时（moon=0）可建造
  if (moon !== 0) return false;

  const stone = state.resource['Stone'];
  const cement = state.resource['Cement'];
  if (!stone || stone.amount < 50000 || !cement || cement.amount < 25000) return false;
  stone.amount -= 50000;
  cement.amount -= 25000;

  const shrine = (state.city['shrine'] ??= { count: 0 }) as { count: number; morale?: number; metal?: number; know?: number; tax?: number; biome?: number; [key: string]: number | undefined };
  shrine.count++;

  // 5 类加成按天气/温度组合确定（对标 legacy）：
  // - 雨天 (weather=0)：morale +1
  // - 阴天 (weather=1)：know +1
  // - 晴天冷 (weather=2, temp=0)：metal +1
  // - 晴天暖 (weather=2, temp=1)：tax +1
  // - 晴天热 (weather=2, temp=2)：biome +1 (农业加成)
  const weather = state.city.calendar?.weather ?? 2;
  const temp = state.city.calendar?.temp ?? 1;
  let granted: 'morale' | 'metal' | 'know' | 'tax' | 'biome' = 'morale';
  if (weather === 0) granted = 'morale';
  else if (weather === 1) granted = 'know';
  else if (weather === 2 && temp === 0) granted = 'metal';
  else if (weather === 2 && temp === 1) granted = 'tax';
  else if (weather === 2 && temp === 2) granted = 'biome';
  shrine[granted] = (shrine[granted] ?? 0) + 1;
  return true;
}

/** 获取神龛各类加成的当前级别 */
export function getShrineBonus(state: GameState, type: keyof ShrineState): number {
  const shrine = state.city['shrine'] as Record<string, number | undefined> | undefined;
  if (!shrine) return 0;
  return shrine[type] ?? 0;
}

// ============================================================
// 入口工具
// ============================================================

/** 判断当前是否运行在魔法宇宙 */
export function isMagicUniverse(state: GameState): boolean {
  return state.race.universe === 'magic';
}

/** 魔法宇宙 tick — 在主 tick 中调用 */
export function magicTick(state: GameState, timeMul: number = 1): void {
  if (!isMagicUniverse(state)) return;

  // Mana 缓慢恢复（每秒 +0.1 / 受 mana_nexus 加成）
  const mana = state.resource['Mana'];
  if (mana) {
    const nexus = (state.tech['magic'] ?? 0) >= 5 ? 1.5 : 1;
    const regen = 0.1 * nexus * timeMul;
    mana.amount = Math.min(mana.max, mana.amount + regen);
  }

  // 炼金转化
  alchemyTick(state, timeMul);
}

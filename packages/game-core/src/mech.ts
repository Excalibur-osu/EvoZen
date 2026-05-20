/**
 * Mech（机甲）系统 — 对标 legacy/src/portal.js mech 系统 / edenic.js mech_station
 *
 * 玩家通过 mechbay 建造机甲，派遣进入 hellpit / spire / eden 战斗。
 * 每台机甲消耗资源生产 + 维护，提供战斗评分。
 *
 * 简化版（保留核心数值，省略复杂的部件 mod 系统）。
 */

import type { GameState } from '@evozen/shared-types';

// ============================================================
// Mech 类型与等级
// ============================================================

export type MechSize = 'small' | 'medium' | 'large' | 'titan' | 'collector';
export type MechChassis = 'wheel' | 'tread' | 'hover' | 'spider' | 'biped' | 'quad';
export type MechWeapon = 'plasma' | 'laser' | 'kinetic' | 'shotgun' | 'missile' | 'flame' | 'sonic';
export type MechEquipment = 'shields' | 'sonar' | 'grappling' | 'special' | 'gyro' | 'flare' | 'ablative';

export interface MechDef {
  size: MechSize;
  chassis: MechChassis;
  weapon: MechWeapon;
  equip: MechEquipment[];
  /** 是否已完成生产 */
  built: boolean;
}

export interface MechState {
  /** 机甲库存（已完成） */
  mechs: MechDef[];
  /** 正在生产的机甲 */
  building?: { def: MechDef; progress: number; total: number };
  /** 巡逻模式 0-5（适用于 eden mech_station） */
  patrol_mode?: number;
}

// ============================================================
// 成本与战力
// ============================================================

const MECH_BASE_COST: Record<MechSize, Record<string, number>> = {
  small:     { Money: 1_000_000, Soul_Gem: 1,    Adamantite: 25_000 },
  medium:    { Money: 5_000_000, Soul_Gem: 5,    Adamantite: 100_000 },
  large:     { Money: 25_000_000, Soul_Gem: 25,  Adamantite: 500_000 },
  titan:     { Money: 100_000_000, Soul_Gem: 100, Adamantite: 2_500_000, Quantium: 10_000 },
  collector: { Money: 50_000_000, Soul_Gem: 50,  Adamantite: 1_000_000 },
};

const MECH_BASE_POWER: Record<MechSize, number> = {
  small: 50, medium: 200, large: 800, titan: 5_000, collector: 100,
};

// ============================================================
// 适配表（对标 legacy/src/portal.js validWeapons/validEquipment）
// ============================================================

/**
 * Chassis 与 Weapon 的适配性
 * 不适配时战力 ×0.75（仍可装备但效率打折）
 */
const CHASSIS_WEAPON_MATRIX: Record<MechChassis, Set<MechWeapon>> = {
  wheel:  new Set<MechWeapon>(['kinetic', 'shotgun', 'missile']),
  tread:  new Set<MechWeapon>(['kinetic', 'missile', 'flame']),
  hover:  new Set<MechWeapon>(['laser', 'plasma', 'sonic']),
  spider: new Set<MechWeapon>(['laser', 'sonic', 'kinetic']),
  biped:  new Set<MechWeapon>(['plasma', 'laser', 'kinetic', 'shotgun', 'missile', 'flame', 'sonic']),  // biped 通用
  quad:   new Set<MechWeapon>(['plasma', 'missile', 'flame']),
};

/**
 * Chassis 在不同地形的适应性（影响在 Spire/Hellpit 战斗时的实际战力）
 * 例：hover 在熔岩 +25%，但 wheel 在岩石地形 +20%
 * 这里返回 chassis 在"通用地形"（不指定）的基础乘数
 */
function chassisTerrainBase(c: MechChassis): number {
  return { wheel: 1.0, tread: 1.1, hover: 1.05, spider: 1.15, biped: 1.0, quad: 1.2 }[c];
}

/**
 * Equipment 对评分的具体贡献
 * 各装备提供不同百分比加成或抗性（合并到总战力中）
 */
function equipmentBonus(e: MechEquipment): number {
  return {
    shields: 0.08,     // +8% 战力（更多生存）
    sonar: 0.04,       // +4%（增加侦察）
    grappling: 0.05,   // +5%（机动性）
    special: 0.10,     // +10%（特殊能力）
    gyro: 0.05,        // +5%（稳定性）
    flare: 0.03,       // +3%（视野）
    ablative: 0.07,    // +7%（消融装甲）
  }[e];
}

/**
 * 武器基础战力倍率（已对照 legacy 数值，等离子 / 导弹最强）
 */
function weaponBase(w: MechWeapon): number {
  return { plasma: 1.4, laser: 1.2, kinetic: 1.0, shotgun: 1.1, missile: 1.35, flame: 1.15, sonic: 1.05 }[w];
}

/** 计算机甲战力评分（结合 size + chassis + weapon + equipment + 适配）*/
export function mechRating(def: MechDef): number {
  let power = MECH_BASE_POWER[def.size];

  // chassis 基础地形适应
  power *= chassisTerrainBase(def.chassis);

  // weapon 基础
  let weaponMul = weaponBase(def.weapon);

  // 适配性检查：chassis 不接受该 weapon 时，weapon 战力 × 0.75
  if (!CHASSIS_WEAPON_MATRIX[def.chassis].has(def.weapon)) {
    weaponMul *= 0.75;
  }
  power *= weaponMul;

  // 装备各自加成
  let equipMul = 1;
  for (const e of def.equip) {
    equipMul += equipmentBonus(e);
  }
  power *= equipMul;

  return Math.round(power);
}

/** 检查 chassis 是否接受某 weapon（UI 用） */
export function isChassisCompatible(c: MechChassis, w: MechWeapon): boolean {
  return CHASSIS_WEAPON_MATRIX[c].has(w);
}

/** 计算机甲在特定地形（spire/hellpit/eden）的战力（地形 buff/debuff）*/
export function mechRatingInTerrain(def: MechDef, terrain: 'spire' | 'hellpit' | 'asphodel' | 'elysium'): number {
  let rating = mechRating(def);

  // 地形适配
  const terrainBonus: Record<typeof terrain, Partial<Record<MechChassis, number>>> = {
    spire:    { hover: 1.25, biped: 1.15, spider: 1.10 },                      // 高塔环境，悬浮/双足占优
    hellpit:  { tread: 1.2, quad: 1.2, wheel: 1.1, biped: 1.0 },                // 地狱坑洼地形
    asphodel: { biped: 1.15, spider: 1.10, hover: 1.05 },                      // 阿斯福德尔平原
    elysium:  { quad: 1.2, biped: 1.15, spider: 1.10 },                        // 极乐草甸
  };
  rating *= terrainBonus[terrain][def.chassis] ?? 1;

  return Math.round(rating);
}

/** 计算机甲成本 */
export function mechCost(size: MechSize): Record<string, number> {
  return { ...MECH_BASE_COST[size] };
}

/** 机甲大小占用 mechbay 空间 */
const MECH_SIZE_OCCUPY: Record<MechSize, number> = {
  small: 1, medium: 2, large: 4, titan: 8, collector: 2,
};

export function mechSize(size: MechSize): number {
  return MECH_SIZE_OCCUPY[size];
}

// ============================================================
// 当前机甲库存与容量
// ============================================================

/** 获取当前 mechbay 中机甲数量与总容量 */
export function getMechBayCapacity(state: GameState): { used: number; max: number } {
  const portal = state.portal as Record<string, Record<string, number>>;
  const baysOn = portal['mechbay']?.['on'] ?? 0;
  const max = baysOn * 10; // 每个 mechbay 容纳 10 单位

  const mechState = (state.portal as Record<string, unknown>)['mechs'] as MechState | undefined;
  if (!mechState) return { used: 0, max };

  const used = mechState.mechs.reduce((s, m) => s + mechSize(m.size), 0);
  return { used, max };
}

/** 初始化机甲库存 */
export function initMechState(state: GameState): void {
  if (!(state.portal as Record<string, unknown>)['mechs']) {
    (state.portal as Record<string, unknown>)['mechs'] = { mechs: [], patrol_mode: 0 } as MechState;
  }
}

/** 开始建造一台机甲（检查资源 + 容量） */
export function startMechBuild(state: GameState, def: Omit<MechDef, 'built'>): boolean {
  initMechState(state);
  const mechState = (state.portal as Record<string, unknown>)['mechs'] as MechState;
  if (mechState.building) return false; // 一次只能造一台

  const cap = getMechBayCapacity(state);
  if (cap.used + mechSize(def.size) > cap.max) return false;

  const cost = mechCost(def.size);
  for (const [res, amt] of Object.entries(cost)) {
    if ((state.resource[res]?.amount ?? 0) < amt) return false;
  }

  // 扣费
  for (const [res, amt] of Object.entries(cost)) {
    if (state.resource[res]) state.resource[res].amount -= amt;
  }

  mechState.building = {
    def: { ...def, built: false },
    progress: 0,
    total: 100, // 每 1% 一个 tick
  };
  return true;
}

/** 机甲生产 tick（每 tick 推进 1% 进度，受 assault_forge 加速） */
export function mechBuildTick(state: GameState, timeMul: number): void {
  const mechState = (state.portal as Record<string, unknown>)['mechs'] as MechState | undefined;
  if (!mechState?.building) return;

  const portal = state.portal as Record<string, Record<string, number>>;
  const forgeOn = portal['assault_forge']?.['on'] ?? 0;
  const rate = (1 + forgeOn * 0.5) * timeMul;

  mechState.building.progress += rate;
  if (mechState.building.progress >= mechState.building.total) {
    mechState.building.def.built = true;
    mechState.mechs.push(mechState.building.def);
    mechState.building = undefined;
  }
}

/** 机甲战斗总评分（用于 spire / hellpit / eden 战斗结算） */
export function totalMechRating(state: GameState): number {
  const mechState = (state.portal as Record<string, unknown>)['mechs'] as MechState | undefined;
  if (!mechState?.mechs) return 0;
  return mechState.mechs.reduce((s, m) => s + mechRating(m), 0);
}

// ============================================================
// Mech Station 巡逻模式（edenic mech_station / 地狱 demon_station）
// 0=不巡逻，5=狂暴；越激进损失越多，但收益越大
// ============================================================

export interface MechStationPatrolResult {
  asphodelGain: number;
  omniscienceGain: number;
  mechsLost: number;
  effectiveMechs: number;
}

/** 单 tick 巡逻结算（在 Asphodel mech_station / 或 Hell demon_station 中调用） */
export function mechStationPatrolTick(state: GameState, timeMul: number): MechStationPatrolResult {
  const mechState = (state.portal as Record<string, unknown>)['mechs'] as MechState | undefined;
  if (!mechState?.mechs?.length) {
    return { asphodelGain: 0, omniscienceGain: 0, mechsLost: 0, effectiveMechs: 0 };
  }

  const mode = mechState.patrol_mode ?? 0;
  if (mode === 0) {
    return { asphodelGain: 0, omniscienceGain: 0, mechsLost: 0, effectiveMechs: 0 };
  }

  // mode 1-5 对应不同收益和损失系数
  const modeData: Array<{ gainMul: number; lossPerSec: number }> = [
    { gainMul: 0, lossPerSec: 0 },        // 0=待命
    { gainMul: 0.2, lossPerSec: 0.0005 }, // 1=守卫
    { gainMul: 0.5, lossPerSec: 0.002 },  // 2=巡逻
    { gainMul: 1.0, lossPerSec: 0.005 },  // 3=深入
    { gainMul: 1.5, lossPerSec: 0.012 },  // 4=突击
    { gainMul: 2.5, lossPerSec: 0.025 },  // 5=狂暴
  ];
  const m = modeData[Math.min(5, Math.max(0, mode))];
  const effective = mechState.mechs.length;
  const totalRating = totalMechRating(state);

  // 收益：阿斯福德尔粉末 + Omniscience
  const asphodelGain = totalRating * m.gainMul * 0.001 * timeMul;
  const omniscienceGain = totalRating * m.gainMul * 0.0005 * timeMul;
  if (state.resource['Asphodel_Powder']) {
    state.resource['Asphodel_Powder'].amount = Math.min(
      state.resource['Asphodel_Powder'].max < 0 ? Number.MAX_SAFE_INTEGER : state.resource['Asphodel_Powder'].max,
      state.resource['Asphodel_Powder'].amount + asphodelGain,
    );
  }
  if (state.resource['Omniscience']) {
    state.resource['Omniscience'].amount = Math.min(
      state.resource['Omniscience'].max < 0 ? Number.MAX_SAFE_INTEGER : state.resource['Omniscience'].max,
      state.resource['Omniscience'].amount + omniscienceGain,
    );
  }

  // 损失：每秒按概率损失机甲
  let mechsLost = 0;
  const lossExpect = effective * m.lossPerSec * timeMul;
  if (lossExpect > 0 && Math.random() < lossExpect) {
    mechsLost = Math.max(1, Math.floor(lossExpect + 0.5));
    mechState.mechs.splice(0, mechsLost);
  }

  return { asphodelGain, omniscienceGain, mechsLost, effectiveMechs: effective };
}

/** 设置巡逻模式 */
export function setPatrolMode(state: GameState, mode: number): void {
  const mechState = (state.portal as Record<string, unknown>)['mechs'] as MechState | undefined;
  if (!mechState) return;
  mechState.patrol_mode = Math.min(5, Math.max(0, mode));
}

/** 获取当前巡逻模式 */
export function getPatrolMode(state: GameState): number {
  const mechState = (state.portal as Record<string, unknown>)['mechs'] as MechState | undefined;
  return mechState?.patrol_mode ?? 0;
}

/** 机甲损失（战斗失败时随机损坏一部分） */
export function damageMechs(state: GameState, ratio: number): number {
  const mechState = (state.portal as Record<string, unknown>)['mechs'] as MechState | undefined;
  if (!mechState?.mechs) return 0;
  const lossCount = Math.floor(mechState.mechs.length * ratio);
  for (let i = 0; i < lossCount; i++) {
    mechState.mechs.shift();
  }
  return lossCount;
}

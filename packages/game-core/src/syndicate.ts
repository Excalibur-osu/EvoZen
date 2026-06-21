/**
 * Syndicate（海盗辛迪加）+ Edenic Siege（围攻）战斗结算系统
 *
 * 对标：
 *   - legacy/src/space.js piracy() — 太空海盗骚扰
 *   - legacy/src/truepath.js syndicate 字段 — 外太阳系压力
 *   - legacy/src/edenic.js siege_fortress — 围攻进度
 *
 * 简化版（保留核心数值）。
 */

import type { GameState } from '@evozen/shared-types';
import { armyRating, garrisonSize } from './military';
import { totalMechRating } from './mech';
import type { GalaxyRegion } from './galaxy';

// ============================================================
// Syndicate 海盗骚扰
// ============================================================

/**
 * 计算某外太空区域的当前海盗压力
 * 区域基础压力 - 我方反海盗设施（SAM、munitions_depot 等）
 */
export function calcSyndicatePressure(state: GameState, region: 'titan' | 'enceladus' | 'triton' | 'kuiper' | 'eris'): number {
  if (!state.race['truepath']) return 0;
  const space = state.space as Record<string, { on?: number }>;
  const sam = (space['sam']?.on ?? 0) * 100;
  const munitions = (space['munitions_depot']?.on ?? 0) * 50;
  const patrolShip = (space['patrol_ship']?.on ?? 0) * 75;
  const fob = (space['fob']?.on ?? 0) * 200;

  const basePressure: Record<typeof region, number> = {
    titan: 100, enceladus: 200, triton: 600, kuiper: 800, eris: 1500,
  };
  return Math.max(0, basePressure[region] - sam - munitions - patrolShip - fob);
}

/**
 * 海盗骚扰 tick：当压力过高时，按比例削减该区域建筑通电数
 */
export function syndicateTick(state: GameState, timeMul: number): void {
  if (!state.race['truepath']) return;
  const regions: Array<'titan' | 'enceladus' | 'triton' | 'kuiper' | 'eris'> = ['titan', 'enceladus', 'triton', 'kuiper', 'eris'];

  for (const region of regions) {
    const pressure = calcSyndicatePressure(state, region);
    if (pressure <= 0) continue;

    // 每 100 压力每秒 1% 几率破坏一个建筑通电状态
    const chance = pressure / 10_000 * timeMul;
    if (Math.random() < chance) {
      // 随机选一个该区域建筑下电（简化版：直接 -1 on）
      const space = state.space as Record<string, { on?: number; count?: number }>;
      const buildings = Object.keys(space).filter((k) => k.startsWith(`${region}_`) || k.includes(region));
      if (buildings.length > 0) {
        const target = buildings[Math.floor(Math.random() * buildings.length)];
        if (space[target]?.on && space[target].on! > 0) {
          space[target].on! -= 1;
        }
      }
    }
  }
}

// ============================================================
// Edenic 围攻战斗
// ============================================================

/**
 * 推进围攻进度（在 elysium siege_fortress 通电时持续推进）
 */
export function siegeTick(state: GameState, timeMul: number): void {
  if ((state.tech['elysium'] ?? 0) < 2) return;
  const eden = state.eden as Record<string, Record<string, number>>;
  const siegeOn = eden['siege_fortress']?.['on'] ?? 0;
  if (siegeOn <= 0) return;

  // 玩家攻击力（机甲 + 部队）
  const garrison = state.civic.garrison;
  const playerAttack = totalMechRating(state) + (garrison ? armyRating(garrisonSize(state), state) : 0);

  // 敌方要塞防御
  const enemyDefense = 100_000;

  if (!eden['siege_progress']) eden['siege_progress'] = { count: 0 };
  const progress = eden['siege_progress'];

  // 每 tick 推进 = (玩家攻击 / 敌防) × siege_on 数 × timeMul
  const advance = Math.max(0, playerAttack / enemyDefense) * siegeOn * timeMul;
  progress.count = (progress.count ?? 0) + advance;

  // 完成围攻：当进度 ≥ 100，解锁 ruined_fortress
  if (progress.count >= 100) {
    state.tech['elysium'] = Math.max(state.tech['elysium'] ?? 0, 5);
    progress.count = 0;
  }
}

// ============================================================
// 太空海盗（非 Truepath 通用版）
// ============================================================

/**
 * 通用 piracy 函数 — 对标 legacy/src/space.js piracy()
 * 用于 belt / dwarf / red 等区域，简化为常量
 */
export function piracy(state: GameState, region: string): number {
  // 检查防御舰 / patrol_ship / probe
  const space = state.space as Record<string, { on?: number; count?: number }>;
  const protectors = (space['mass_driver']?.on ?? 0) + (space['neutron_battery']?.on ?? 0) + (space['planet_killer']?.on ?? 0);

  const basePiracy: Record<string, number> = {
    spc_belt: 250, spc_dwarf: 400, spc_red: 50, spc_gas: 600, spc_gas_moon: 800,
  };
  const base = basePiracy[region] ?? 0;
  return Math.max(0, base - protectors * 50);
}

type GalaxyStructureState = { count?: number; on?: number };
type GalaxyDefenseState = Partial<Record<GalaxyRegion, Partial<Record<GalaxyShipId, number>>>>;
type GalaxyState = Record<string, GalaxyStructureState | GalaxyDefenseState | unknown> & {
  defense?: GalaxyDefenseState;
};

type GalaxyShipId =
  | 'scout_ship'
  | 'corvette_ship'
  | 'frigate_ship'
  | 'cruiser_ship'
  | 'dreadnought';

const GALAXY_SHIP_RATING: Record<GalaxyShipId, { normal: number; banana: number; wish: number; bananaWish: number }> = {
  scout_ship: { normal: 10, banana: 7, wish: 5, bananaWish: 1 },
  corvette_ship: { normal: 30, banana: 21, wish: 10, bananaWish: 4 },
  frigate_ship: { normal: 80, banana: 56, wish: 20, bananaWish: 14 },
  cruiser_ship: { normal: 250, banana: 175, wish: 50, bananaWish: 25 },
  dreadnought: { normal: 1800, banana: 1260, wish: 200, bananaWish: 140 },
};

const GALAXY_PIRATE_BASE: Record<GalaxyRegion, { base: number; instinct: number; pillage: number }> = {
  gxy_stargate: { base: 0, instinct: 0, pillage: 0.5 },
  gxy_gateway: { base: 0, instinct: 0, pillage: 1 },
  gxy_gorddon: { base: 800, instinct: 720, pillage: 0.75 },
  gxy_alien1: { base: 1000, instinct: 900, pillage: 0.75 },
  gxy_alien2: { base: 2500, instinct: 2250, pillage: 1 },
  gxy_chthonian: { base: 7500, instinct: 7000, pillage: 1 },
};

function galaxyState(state: GameState): GalaxyState {
  return ((state as unknown as { galaxy?: GalaxyState }).galaxy ?? {}) as GalaxyState;
}

function galaxyOn(state: GameState, id: string): number {
  const struct = galaxyState(state)[id] as GalaxyStructureState | undefined;
  return struct?.on ?? struct?.count ?? 0;
}

function shipRating(state: GameState, ship: GalaxyShipId): number {
  const rating = GALAXY_SHIP_RATING[ship];
  const isBanana = Boolean(state.race['banana']);
  let value = isBanana ? rating.banana : rating.normal;
  if (state.race['wish'] && (state.race as { wishStats?: { ship?: unknown } }).wishStats?.ship) {
    value += isBanana ? rating.bananaWish : rating.wish;
  }
  return value;
}

function assignedShipCount(state: GameState, region: GalaxyRegion, ship: GalaxyShipId): number {
  return galaxyState(state).defense?.[region]?.[ship] ?? 0;
}

function gatewayArmadaRating(state: GameState, region: GalaxyRegion): number {
  let rating = 0;
  for (const ship of Object.keys(GALAXY_SHIP_RATING) as GalaxyShipId[]) {
    rating += assignedShipCount(state, region, ship) * shipRating(state, ship);
  }
  return rating;
}

function baseGalaxyPirate(state: GameState, region: GalaxyRegion): number {
  if (region === 'gxy_stargate' || region === 'gxy_gateway') {
    const piracyLevel = state.race['instinct'] ? (state.tech['piracy'] ?? 0) * 0.9 : (state.tech['piracy'] ?? 0);
    return 0.1 * piracyLevel;
  }
  const def = GALAXY_PIRATE_BASE[region];
  return state.race['instinct'] ? def.instinct : def.base;
}

function galaxyArmadaRating(state: GameState, region: GalaxyRegion): number {
  let armada = gatewayArmadaRating(state, region);

  if (region === 'gxy_gateway') {
    armada += galaxyOn(state, 'starbase') * 25;
  } else if (region === 'gxy_stargate') {
    armada += galaxyOn(state, 'defense_platform') * 20;
  } else if (region === 'gxy_alien2') {
    armada += galaxyOn(state, 'foothold') * 50;
    armada += galaxyOn(state, 'armed_miner') * (state.race['banana'] ? 4 : 5);
  } else if (region === 'gxy_chthonian') {
    const wishShip = state.race['wish'] && (state.race as { wishStats?: { ship?: unknown } }).wishStats?.ship;
    armada += galaxyOn(state, 'minelayer') * ((state.race['banana'] ? 35 : 50) + (wishShip ? (state.race['banana'] ? 15 : 25) : 0));
    armada += galaxyOn(state, 'raider') * ((state.race['banana'] ? 9 : 12) + (wishShip ? (state.race['banana'] ? 3 : 6) : 0));
  }

  return armada;
}

/**
 * Legacy-compatible galaxy piracy multiplier.
 * Returns 1 when galaxy piracy is inactive; lower values mean stronger piracy penalties.
 */
export function galaxyPiracy(state: GameState, region: GalaxyRegion, rating = false, raw = false): number {
  if (!state.tech['piracy'] || state.race['truepath']) return 1;

  const pirate = baseGalaxyPirate(state, region);
  const armada = galaxyArmadaRating(state, region);
  if (raw) return armada;
  if (pirate <= 0) return 1;

  const patrol = Math.min(armada, pirate);
  const pillage = GALAXY_PIRATE_BASE[region].pillage;
  const local = ((1 - (pirate - patrol) / pirate) * pillage) + (1 - pillage);
  return region === 'gxy_stargate' || rating
    ? local
    : local * galaxyPiracy(state, 'gxy_stargate');
}

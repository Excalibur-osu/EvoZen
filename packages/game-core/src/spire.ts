/**
 * Spire 尖塔 100 层战斗系统 — 对标 legacy/src/portal.js spire 机制
 *
 * 每层有特定敌人评分，玩家用机甲战力对决。
 * 顶层（100 层）触发 apotheosis 神化解锁。
 *
 * 简化版（保留核心数值平衡）。
 */

import type { GameState } from '@evozen/shared-types';
import { totalMechRating, damageMechs, type MechWeapon } from './mech';

// ============================================================
// 100 层敌人详细表
// ============================================================

export type SpireEnemyType =
  | 'imp' | 'fiend' | 'cerberus' | 'horror' | 'liche'
  | 'baphomet' | 'demonlord' | 'dragon' | 'archfiend' | 'voidlord';

export interface SpireEnemyDef {
  type: SpireEnemyType;
  name: string;
  /** 武器弱点（×1.5 伤害） */
  weakTo: MechWeapon[];
  /** 武器抗性（×0.5 伤害） */
  resistant: MechWeapon[];
  /** 战力基数（乘以 floor^1.8 后再缩放） */
  ratingMul: number;
  /** 是否是 boss（每 10 层） */
  isBoss?: boolean;
}

/** 10 类敌人定义 */
export const SPIRE_ENEMIES: Record<SpireEnemyType, SpireEnemyDef> = {
  imp:        { type: 'imp',        name: '小恶魔',   weakTo: ['kinetic', 'flame'],   resistant: ['sonic'], ratingMul: 1.0 },
  fiend:      { type: 'fiend',      name: '邪魔',     weakTo: ['plasma', 'laser'],    resistant: ['kinetic'], ratingMul: 1.1 },
  cerberus:   { type: 'cerberus',   name: '地狱犬',   weakTo: ['flame', 'shotgun'],   resistant: ['sonic'], ratingMul: 1.15 },
  horror:     { type: 'horror',     name: '恐怖怪',   weakTo: ['laser', 'sonic'],     resistant: ['flame'], ratingMul: 1.2 },
  liche:      { type: 'liche',      name: '巫妖',     weakTo: ['plasma', 'flame'],    resistant: ['kinetic', 'shotgun'], ratingMul: 1.3 },
  baphomet:   { type: 'baphomet',   name: '巴风特',   weakTo: ['plasma'],             resistant: ['flame'], ratingMul: 1.5, isBoss: true },
  demonlord:  { type: 'demonlord',  name: '魔王',     weakTo: ['plasma', 'missile'],  resistant: ['kinetic'], ratingMul: 1.8, isBoss: true },
  dragon:     { type: 'dragon',     name: '巨龙',     weakTo: ['missile'],            resistant: ['flame'], ratingMul: 2.0, isBoss: true },
  archfiend:  { type: 'archfiend',  name: '魔尊',     weakTo: ['laser', 'sonic'],     resistant: ['flame', 'plasma'], ratingMul: 2.5, isBoss: true },
  voidlord:   { type: 'voidlord',   name: '虚空主',   weakTo: ['plasma', 'sonic'],    resistant: ['kinetic', 'shotgun'], ratingMul: 3.5, isBoss: true },
};

/** 根据层数确定该层的敌人类型 */
export function getFloorEnemy(floor: number): SpireEnemyDef {
  // 第 100 层：voidlord
  if (floor === 100) return SPIRE_ENEMIES.voidlord;
  // 第 90 层：archfiend
  if (floor === 90) return SPIRE_ENEMIES.archfiend;
  // 第 70/80：demonlord/dragon
  if (floor === 70) return SPIRE_ENEMIES.dragon;
  if (floor === 80) return SPIRE_ENEMIES.demonlord;
  // 第 50/60：baphomet
  if (floor === 50 || floor === 60) return SPIRE_ENEMIES.baphomet;
  // 其它 10 倍数：liche
  if (floor % 10 === 0) return SPIRE_ENEMIES.liche;

  // 普通层：按区间分配
  if (floor < 20) return SPIRE_ENEMIES.imp;
  if (floor < 40) return SPIRE_ENEMIES.fiend;
  if (floor < 60) return SPIRE_ENEMIES.cerberus;
  if (floor < 80) return SPIRE_ENEMIES.horror;
  return SPIRE_ENEMIES.liche;
}

// ============================================================
// 每层敌人评分（基础公式 + Boss 层强度倍增）
// ============================================================

/** 获取某层的敌人战斗评分 */
export function getSpireFloorRating(floor: number): number {
  // 基础：第 N 层 = N^1.8 × 100，再乘敌人类型 ratingMul
  const enemy = getFloorEnemy(floor);
  const rating = Math.pow(floor, 1.8) * 100 * enemy.ratingMul;
  return Math.round(rating);
}

/**
 * 计算玩家机甲对当前层敌人的有效战力（考虑武器弱点/抗性）
 */
export function getEffectivePlayerRating(state: GameState, floor: number): number {
  const enemy = getFloorEnemy(floor);
  const mechState = (state.portal as Record<string, unknown>)['mechs'] as { mechs?: Array<{ weapon: MechWeapon }> } | undefined;
  if (!mechState?.mechs?.length) return 0;

  let total = 0;
  for (const m of mechState.mechs) {
    const def = m as { weapon: MechWeapon };
    const base = totalMechRating(state) / mechState.mechs.length;
    let mul = 1;
    if (enemy.weakTo.includes(def.weapon)) mul = 1.5;
    if (enemy.resistant.includes(def.weapon)) mul = 0.5;
    total += base * mul;
  }
  return Math.round(total);
}

/** 获取该层奖励（资源/声望） */
export function getSpireFloorReward(floor: number): Record<string, number> {
  const reward: Record<string, number> = {
    Money: floor * 50_000,
    Soul_Gem: Math.floor(floor / 10),
  };
  if (floor % 10 === 0) {
    reward['Adamantite'] = floor * 10_000;
  }
  if (floor === 100) {
    reward['Harmony'] = 5;
    reward['Supercoiled'] = 1;
  }
  return reward;
}

/** 尝试攀登一层（消耗资源 + 战斗结算 + 派发奖励） */
export interface SpireAscendResult {
  success: boolean;
  newLevel: number;
  enemyRating: number;
  playerRating: number;
  mechsLost: number;
  rewards?: Record<string, number>;
  message: string;
}

export function attemptSpireFloor(state: GameState): SpireAscendResult {
  const portal = state.portal as Record<string, Record<string, number>>;
  const spire = portal['spire'] ?? { level: 0, progress: 0 };
  const currentLevel = spire['level'] ?? 0;
  const nextFloor = currentLevel + 1;

  if (nextFloor > 100) {
    return {
      success: false,
      newLevel: currentLevel,
      enemyRating: 0,
      playerRating: 0,
      mechsLost: 0,
      message: '尖塔已征服至顶层！',
    };
  }

  // 入场费用
  const cost = 30_000_000 * Math.pow(1.25, currentLevel);
  if ((state.resource['Money']?.amount ?? 0) < cost) {
    return {
      success: false,
      newLevel: currentLevel,
      enemyRating: 0,
      playerRating: 0,
      mechsLost: 0,
      message: `资金不足（需要 ${Math.round(cost).toLocaleString()} Money）`,
    };
  }

  const enemyRating = getSpireFloorRating(nextFloor);
  const playerRating = getEffectivePlayerRating(state, nextFloor);

  // 扣费
  state.resource['Money'].amount -= cost;

  // 战斗结算
  if (playerRating >= enemyRating) {
    // 胜利：升级 + 奖励 + 少量机甲损失
    portal['spire'] = portal['spire'] ?? { level: 0, progress: 0 };
    portal['spire']['level'] = nextFloor;
    portal['spire']['progress'] = 0;

    const lossRatio = nextFloor % 10 === 0 ? 0.15 : 0.05;
    const mechsLost = damageMechs(state, lossRatio);

    const rewards = getSpireFloorReward(nextFloor);
    for (const [res, amt] of Object.entries(rewards)) {
      if (state.resource[res]) {
        state.resource[res].amount = state.resource[res].max < 0
          ? state.resource[res].amount + amt
          : Math.min(state.resource[res].max, state.resource[res].amount + amt);
      } else if (state.prestige && (state.prestige as Record<string, { count: number }>)[res]) {
        (state.prestige as Record<string, { count: number }>)[res].count += amt;
      }
    }

    // 第 100 层：触发 apotheosis 解锁
    if (nextFloor === 100) {
      state.tech['apotheosis'] = 1;
    }

    return {
      success: true,
      newLevel: nextFloor,
      enemyRating,
      playerRating,
      mechsLost,
      rewards,
      message: `征服第 ${nextFloor} 层！${nextFloor === 100 ? '神化已解锁！' : ''}`,
    };
  } else {
    // 失败：大量机甲损失
    const mechsLost = damageMechs(state, 0.3);
    return {
      success: false,
      newLevel: currentLevel,
      enemyRating,
      playerRating,
      mechsLost,
      message: `战力不足！敌方 ${enemyRating} 你方 ${playerRating}，损失 ${mechsLost} 台机甲。`,
    };
  }
}

/** 查询当前层信息 */
export function getCurrentSpireInfo(state: GameState): {
  level: number;
  nextFloor: number;
  nextEnemyRating: number;
  playerRating: number;
  cost: number;
} {
  const portal = state.portal as Record<string, Record<string, number>>;
  const level = portal['spire']?.['level'] ?? 0;
  const nextFloor = level + 1;
  return {
    level,
    nextFloor,
    nextEnemyRating: nextFloor <= 100 ? getSpireFloorRating(nextFloor) : 0,
    playerRating: totalMechRating(state),
    cost: 30_000_000 * Math.pow(1.25, level),
  };
}

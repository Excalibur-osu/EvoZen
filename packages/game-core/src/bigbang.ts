/**
 * Big Bang / 新宇宙系统
 * 对标 legacy/src/resets.js big_bang() + 6 种宇宙类型加成
 *
 * 在 blackhole 转生进入新宇宙时调用，按用户选择的宇宙类型应用特殊 trait。
 */

import type { GameState } from '@evozen/shared-types';

// ============================================================
// 6 种宇宙类型
// ============================================================

export type UniverseType =
  | 'standard'   // 标准宇宙
  | 'heavy'      // 重力宇宙
  | 'antimatter' // 反物质宇宙
  | 'evil'       // 邪恶宇宙
  | 'micro'      // 微观宇宙
  | 'magic';     // 魔法宇宙

export interface UniverseDefinition {
  id: UniverseType;
  name: string;
  desc: string;
  /** 该宇宙类型在 blackhole 转生时应用的特殊 trait/race 标志 */
  applyEffects: (state: GameState) => void;
  /** 该宇宙类型的 prestige 类型（plasmid / antiplasmid） */
  prestigeType: 'Plasmid' | 'AntiPlasmid';
}

export const UNIVERSES: Record<UniverseType, UniverseDefinition> = {
  standard: {
    id: 'standard',
    name: '标准宇宙',
    desc: '常规物理法则的宇宙。',
    applyEffects: () => { /* 无特殊效果 */ },
    prestigeType: 'Plasmid',
  },
  heavy: {
    id: 'heavy',
    name: '重力宇宙',
    desc: '重力增加，所有建筑成本 +20%，但质粒收益 +5%。',
    applyEffects: (state) => {
      state.race['heavy_universe'] = 1;
    },
    prestigeType: 'Plasmid',
  },
  antimatter: {
    id: 'antimatter',
    name: '反物质宇宙',
    desc: '获得反质粒而非质粒，挑战难度增加 10%。',
    applyEffects: (state) => {
      state.race['antimatter_universe'] = 1;
    },
    prestigeType: 'AntiPlasmid',
  },
  evil: {
    id: 'evil',
    name: '邪恶宇宙',
    desc: '种族 trait 翻转：positive ↔ negative。',
    applyEffects: (state) => {
      state.race['evil_universe'] = 1;
    },
    prestigeType: 'Plasmid',
  },
  micro: {
    id: 'micro',
    name: '微观宇宙',
    desc: '所有数值缩小 75%，但成就有独立分支。',
    applyEffects: (state) => {
      state.race['micro_universe'] = 1;
    },
    prestigeType: 'Plasmid',
  },
  magic: {
    id: 'magic',
    name: '魔法宇宙',
    desc: '解锁魔力、仪式、炼金等魔法系统。',
    applyEffects: (state) => {
      state.race['magic_universe'] = 1;
      // 自动启用 Mana 资源
      if (state.resource['Mana']) {
        state.resource['Mana'].display = true;
        if (state.resource['Mana'].max === 0) {
          state.resource['Mana'].max = 100;
        }
      }
    },
    prestigeType: 'Plasmid',
  },
};

// ============================================================
// 应用宇宙类型
// ============================================================

/** 当 blackhole 转生进入新宇宙时调用 */
export function applyUniverse(state: GameState, universeId: UniverseType): void {
  const def = UNIVERSES[universeId];
  if (!def) return;
  state.race.universe = universeId;
  def.applyEffects(state);
}

/** 获取当前宇宙的 prestige 类型 */
export function getCurrentPrestigeType(state: GameState): 'Plasmid' | 'AntiPlasmid' {
  const u = (state.race.universe ?? 'standard') as UniverseType;
  return UNIVERSES[u]?.prestigeType ?? 'Plasmid';
}

/** 获取当前宇宙的难度乘数（用于挑战分数） */
export function getUniverseDifficultyMul(state: GameState): number {
  const u = (state.race.universe ?? 'standard') as UniverseType;
  switch (u) {
    case 'heavy': return 1.05;
    case 'antimatter': return 1.1;
    case 'micro': return 0.25;
    case 'magic': return 1.15;
    default: return 1;
  }
}

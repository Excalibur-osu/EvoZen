/**
 * 自定义种族系统
 * 对标 legacy/src/races.js customRace() / hybrid
 */

import type { GameState } from '@evozen/shared-types';
import { TRAITS } from './trait-data';
import { GENUS_DEFS, type GenusId } from './races';

export interface CustomRaceConfig {
  /** 种族名（玩家定义） */
  name: string;
  /** 描述 */
  desc: string;
  /** 起源世界 */
  home: string;
  /** 单位名（"市民"/"机器人"等） */
  entity: string;
  /** 所属 genus */
  genus: GenusId;
  /** 选中的 trait IDs */
  traits: string[];
  /** 狂热信仰 trait（必须在 traits 列表中） */
  fanaticism: string;
  /** 各 trait 的等级（rank） */
  ranks?: Record<string, number>;
  /** 各星球的解锁名称（red/hell/gas 等） */
  red?: string;
  hell?: string;
  gas?: string;
  gas_moon?: string;
  dwarf?: string;
}

// ============================================================
// 自定义种族存储
// ============================================================

/** 保存自定义种族配置到 state.custom.race0（普通）或 race1（混血） */
export function saveCustomRace(state: GameState, config: CustomRaceConfig, hybrid: boolean = false): void {
  if (!(state as Record<string, unknown>)['custom']) (state as Record<string, unknown>)['custom'] = {};
  const slot = hybrid ? 'race1' : 'race0';
  ((state as Record<string, Record<string, CustomRaceConfig>>)['custom'])[slot] = config;
}

/** 加载自定义种族配置 */
export function loadCustomRace(state: GameState, hybrid: boolean = false): CustomRaceConfig | null {
  const custom = (state as Record<string, unknown>)['custom'] as Record<string, CustomRaceConfig> | undefined;
  if (!custom) return null;
  const slot = hybrid ? 'race1' : 'race0';
  return custom[slot] ?? null;
}

/** 删除自定义种族 */
export function clearCustomRace(state: GameState, hybrid: boolean = false): void {
  const custom = (state as Record<string, unknown>)['custom'] as Record<string, CustomRaceConfig> | undefined;
  if (!custom) return;
  const slot = hybrid ? 'race1' : 'race0';
  delete custom[slot];
}

// ============================================================
// 平衡分计算（对标 legacy customRace val 总和）
// 自定义种族应保持 val 总和接近 0（平衡）
// ============================================================

export function calcCustomRaceBalance(traits: string[]): number {
  let total = 0;
  for (const t of traits) {
    const def = TRAITS[t];
    if (def) total += def.val;
  }
  return total;
}

/** 验证自定义种族是否合法 */
export function validateCustomRace(config: CustomRaceConfig): { valid: boolean; reason?: string } {
  if (!config.name || config.name.length < 2) return { valid: false, reason: '名字太短' };
  if (!config.traits || config.traits.length === 0) return { valid: false, reason: '至少需要一个 trait' };
  if (config.traits.length > 7) return { valid: false, reason: '最多 7 个 trait' };
  if (!config.fanaticism || !config.traits.includes(config.fanaticism)) return { valid: false, reason: '狂热信仰必须在 traits 中' };
  if (!GENUS_DEFS[config.genus]) return { valid: false, reason: '无效的属类' };

  const balance = calcCustomRaceBalance(config.traits);
  if (balance > 5) return { valid: false, reason: `平衡分过高（${balance} > 5）— 多选些负面 trait` };

  return { valid: true };
}

/**
 * 将自定义种族应用为 RACES['custom']
 * 在选择种族 / 转生时调用
 */
export function applyCustomRace(state: GameState, hybrid: boolean = false): boolean {
  const config = loadCustomRace(state, hybrid);
  if (!config) return false;

  const speciesId = hybrid ? 'hybrid' : 'custom';
  state.race.species = speciesId;

  // 应用 genus 默认 trait
  const genus = GENUS_DEFS[config.genus];
  if (genus) {
    for (const [t, lvl] of Object.entries(genus.traits)) {
      state.race[t] = lvl;
    }
  }

  // 应用自定义 trait
  for (const t of config.traits) {
    state.race[t] = config.ranks?.[t] ?? 1;
  }
  return true;
}

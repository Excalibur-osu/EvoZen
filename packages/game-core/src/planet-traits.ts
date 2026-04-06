/**
 * 行星特性系统
 * 对标 legacy/src/races.js planetTraits (L7952-8045)
 *
 * Phase 1A 只实现对文明时代有实际效果的 7 个特性。
 * 其余特性（toxic/ozone/stormy/flare/elliptical/retrograde/kamikaze）
 * 仅注册定义，不接入 tick/derived-state。
 */

import type { GameState } from '@evozen/shared-types';

// ============================================================
// 特性定义
// ============================================================

export interface PlanetTraitDef {
  id: string;
  label: string;
  desc: string;
  /** Phase 1A 是否有实际游戏效果 */
  activePhase1: boolean;
}

export const PLANET_TRAITS: Record<string, PlanetTraitDef> = {
  none:       { id: 'none',       label: '无',     desc: '普通星球，无特殊效果。', activePhase1: false },
  unstable:   { id: 'unstable',   label: '不稳定', desc: '地质活跃的行星，科研成本降低。', activePhase1: true },
  dense:      { id: 'dense',      label: '高密度', desc: '地壳致密，矿产丰富但开采压力更大。', activePhase1: true },
  mellow:     { id: 'mellow',     label: '温和',   desc: '气候宜人，压力减轻但生产力稍低。', activePhase1: true },
  rage:       { id: 'rage',       label: '狂暴',   desc: '暴烈的行星，战斗力增强但伤亡更高。', activePhase1: true },
  magnetic:   { id: 'magnetic',   label: '磁场',   desc: '强磁场，科研有利但矿工效率略低。', activePhase1: true },
  trashed:    { id: 'trashed',    label: '污染',   desc: '环境污染严重，农业产出下降。', activePhase1: true },
  permafrost: { id: 'permafrost', label: '永冻',   desc: '永久冻土，矿工效率降低但学术基础更好。', activePhase1: true },
  toxic:      { id: 'toxic',      label: '有毒',   desc: '有毒大气，影响突变和出生率。', activePhase1: false },
  ozone:      { id: 'ozone',      label: '臭氧层', desc: '臭氧层稀薄，紫外线惩罚。', activePhase1: false },
  stormy:     { id: 'stormy',     label: '风暴',   desc: '频繁的风暴天气。', activePhase1: false },
  flare:      { id: 'flare',      label: '耀斑',   desc: '恒星耀斑频繁。', activePhase1: false },
  elliptical: { id: 'elliptical', label: '椭圆轨道', desc: '椭圆形公转轨道。', activePhase1: false },
  retrograde: { id: 'retrograde', label: '逆行',   desc: '行星逆向自转。', activePhase1: false },
  kamikaze:   { id: 'kamikaze',   label: '神风',   desc: '轨道不断衰减。', activePhase1: false },
};

// ============================================================
// 查询函数
// ============================================================

/** 当前行星是否具有指定特性 */
export function hasPlanetTrait(state: GameState, trait: string): boolean {
  return state.city.ptrait === trait;
}

/** 获取当前行星特性的定义，若不存在则返回 none */
export function getPlanetTrait(state: GameState): PlanetTraitDef {
  return PLANET_TRAITS[state.city.ptrait] ?? PLANET_TRAITS['none'];
}

// ============================================================
// 效果数值（对标 legacy planetTraits.*.vars()）
// ============================================================

/** dense: [矿工产出×1.2, 压力+1, 太空燃料×1.2] */
export function denseVars(): [number, number, number] {
  return [1.2, 1, 1.2];
}

/** mellow: [失业/士兵压力除数1.5, 岗位压力减免2, 全局产出×0.9] */
export function mellowVars(): [number, number, number] {
  return [1.5, 2, 0.9];
}

/** rage: [战斗力×1.05, 狩猎×1.02, 额外死亡+1] */
export function rageVars(): [number, number, number] {
  return [1.05, 1.02, 1];
}

/** magnetic: [日晷知识+1, 沃登塔知识+100, 矿工产出×0.985] */
export function magneticVars(): [number, number, number] {
  return [1, 100, 0.985];
}

/** trashed: [农业产出×0.75, 拾荒者加成×1] (拾荒者加成 Phase 1A 不实装) */
export function trashedVars(): [number, number] {
  return [0.75, 1];
}

/** permafrost: [矿工产出×0.75, 大学知识基础+100] */
export function permafrostVars(): [number, number] {
  return [0.75, 100];
}

// ============================================================
// 聚合：获取矿工产出乘数
// ============================================================

export function getMinerPlanetMultiplier(state: GameState): number {
  let mult = 1;
  if (hasPlanetTrait(state, 'dense')) mult *= denseVars()[0];
  if (hasPlanetTrait(state, 'permafrost')) mult *= permafrostVars()[0];
  if (hasPlanetTrait(state, 'magnetic')) mult *= magneticVars()[2];
  return mult;
}

// ============================================================
// 聚合：获取全局产出乘数
// ============================================================

export function getGlobalPlanetMultiplier(state: GameState): number {
  let mult = 1;
  if (hasPlanetTrait(state, 'mellow')) mult *= mellowVars()[2];
  return mult;
}

// ============================================================
// 聚合：获取农业产出乘数
// ============================================================

export function getFarmPlanetMultiplier(state: GameState): number {
  let mult = 1;
  if (hasPlanetTrait(state, 'trashed')) mult *= trashedVars()[0];
  return mult;
}

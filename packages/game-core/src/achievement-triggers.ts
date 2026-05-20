/**
 * 成就自动解锁触发器
 * 对标 legacy/src/main.js 中分散的 unlockAchieve 调用
 *
 * 每 tick 调用 checkAchievements(state) 集中检查 ~30+ 关键成就。
 */

import type { GameState } from '@evozen/shared-types';
import { unlockAchievement, unlockFeat } from './achievements';

/**
 * 主成就触发器 — 每 tick 调用一次
 */
export function checkAchievements(state: GameState): void {
  // ----- 物种灭绝（每个种族对应一个 extinct_X 成就，在转生时触发） -----
  // 由 resets.ts 在转生时调用 unlockAchievement('extinct_X')

  // ----- 通用解锁条件 -----

  // colonist: 进入太空殖民
  if ((state.tech['space'] ?? 0) >= 5) {
    unlockAchievement(state, 'colonist');
  }

  // explorer: 发现 5+ 个不同星球（简化：拥有 space:3+ 即认为完成）
  if ((state.tech['space'] ?? 0) >= 7) {
    unlockAchievement(state, 'explorer');
  }

  // landfill: 仓储满满
  const crates = state.resource['Crates'];
  if (crates && crates.amount >= crates.max && crates.max >= 1000) {
    unlockAchievement(state, 'landfill');
  }

  // miners_dream: 4+ 个地质矿物为正
  const geo = (state.city as { geology?: Record<string, number> }).geology;
  if (geo) {
    const goodRocks = Object.values(geo).filter((v) => v > 0).length;
    if (goodRocks >= 4) {
      unlockAchievement(state, 'miners_dream');
    }
  }

  // shaken: ptrait includes unstable + 触发过 quake
  if (state.tech['quaked']) {
    unlockAchievement(state, 'shaken');
  }

  // trade: 750 贸易路线总值（简化：trade_post >= 50 即触发）
  const tradePost = (state.city['trade_post'] as { count?: number })?.count ?? 0;
  if (tradePost >= 50) {
    unlockAchievement(state, 'trade');
  }

  // world_domination: 占领或兼并所有 3 个邦国
  const foreign = state.civic.foreign;
  if (foreign) {
    const allOwned =
      (foreign.gov0.occ || foreign.gov0.anx || foreign.gov0.buy) &&
      (foreign.gov1.occ || foreign.gov1.anx || foreign.gov1.buy) &&
      (foreign.gov2.occ || foreign.gov2.anx || foreign.gov2.buy);
    if (allOwned) {
      unlockAchievement(state, 'world_domination');
    }
  }

  // anarchist: 政体切换为无政府主义
  if (state.civic.govern?.type === 'anarchy') {
    unlockAchievement(state, 'anarchist');
  }

  // illuminati: 拥有 spy >= 10 总数
  if (foreign) {
    const totalSpies = (foreign.gov0.spy ?? 0) + (foreign.gov1.spy ?? 0) + (foreign.gov2.spy ?? 0);
    if (totalSpies >= 10) {
      unlockAchievement(state, 'illuminati');
    }
  }

  // pacifist: 完成游戏（达到 ascend）而无战争（attacks === 0）
  if ((state.tech['ascension'] ?? 0) >= 1 && (state.stats.attacks ?? 0) === 0) {
    unlockAchievement(state, 'pacifist');
  }

  // warmonger: 大量战役 (attacks >= 100)
  if ((state.stats.attacks ?? 0) >= 100) {
    unlockAchievement(state, 'warmonger');
  }

  // mass_starvation: 大量市民饿死 (died >= 1000)
  if ((state.stats.died ?? 0) >= 1000) {
    unlockAchievement(state, 'mass_starvation');
  }

  // paradise: 拥有伊甸 + 高士气
  if ((state.city.morale?.current ?? 0) >= 200) {
    unlockAchievement(state, 'paradise');
  }

  // scrooge: 银行家政府 + 1B Money
  if ((state.resource['Money']?.amount ?? 0) >= 1_000_000_000) {
    unlockAchievement(state, 'scrooge');
  }

  // godwin: 完成神化转生（在 resets.ts 中触发，这里冗余检查）
  if ((state.tech['apotheosis'] ?? 0) >= 1) {
    unlockAchievement(state, 'godwin');
  }

  // ----- biome / genus / universe 类型成就（在转生 / 选择种族时触发） -----
  // 这些由 resets.ts / evolution.ts 在相应时机调用

  // ----- challenge 成就（在挑战完成转生时触发，由 resets.ts 调用） -----

  // ----- 特定 trait 触发的成就 -----
  if (state.race['cataclysm'] && (state.tech['quaked'] ?? 0) >= 1) {
    unlockAchievement(state, 'red_dead');
  }

  if (state.race['warlord']) {
    unlockAchievement(state, 'corrupted');
  }

  // ----- 累积 feats（基于成就总数） -----
  const achieve = state.stats?.['achieve'] as Record<string, { l?: number }> | undefined;
  if (achieve) {
    const count = Object.values(achieve).filter((a) => (a.l ?? 0) > 0).length;
    if (count >= 10) unlockFeat(state, 'novice');
    if (count >= 25) unlockFeat(state, 'journeyman');
    if (count >= 50) unlockFeat(state, 'adept');
    if (count >= 75) unlockFeat(state, 'master');
    if (count >= 100) unlockFeat(state, 'grandmaster');
    if (count >= 150) unlockFeat(state, 'god');
  }

  // ----- 节日 feats -----
  const date = new Date();
  if (date.getDay() === 5 && date.getDate() === 13) {
    unlockFeat(state, 'friday');
  }
  if (date.getMonth() === 1 && date.getDate() === 14) {
    unlockFeat(state, 'valentine');
  }
  if (date.getMonth() === 2 && date.getDate() === 17) {
    unlockFeat(state, 'leprechaun');
  }
  if (date.getMonth() === 9 && date.getDate() === 31) {
    unlockFeat(state, 'halloween');
  }
  if (date.getMonth() === 11 && date.getDate() === 25) {
    unlockFeat(state, 'xmas');
  }
  if (date.getMonth() === 3 && date.getDate() === 1) {
    unlockFeat(state, 'fool');
  }
}

/** 转生时触发的成就（在 resets.ts 中调用） */
export function checkResetAchievements(state: GameState, resetType: string): void {
  switch (resetType) {
    case 'mad':
      unlockAchievement(state, 'apocalypse');
      break;
    case 'ascend':
      unlockAchievement(state, 'ascended');
      break;
    case 'bioseed':
      unlockAchievement(state, 'seeder');
      break;
    case 'blackhole':
      unlockAchievement(state, 'blackhole');
      break;
    case 'cataclysm':
      unlockAchievement(state, 'red_dead');
      break;
    case 'descend':
      unlockAchievement(state, 'pandemonium');
      break;
    case 'apotheosis':
      unlockAchievement(state, 'godwin');
      break;
    case 'aiApoc':
      unlockAchievement(state, 'obsolete');
      break;
    case 'matrix':
      unlockAchievement(state, 'bluepill');
      break;
    case 'retire':
      unlockAchievement(state, 'retired');
      break;
    case 'eden':
      unlockAchievement(state, 'paradise');
      break;
  }

  // genus + species 灭绝
  const species = state.race.species;
  if (species && species !== 'protoplasm') {
    unlockAchievement(state, `extinct_${species}`);
  }

  // mass_extinction: 完成 60+ 不同物种的灭绝
  const achieve = state.stats?.['achieve'] as Record<string, { l?: number }> | undefined;
  if (achieve) {
    const extinctCount = Object.keys(achieve).filter((k) => k.startsWith('extinct_')).length;
    if (extinctCount >= 60) {
      unlockAchievement(state, 'mass_extinction');
    }
  }
}

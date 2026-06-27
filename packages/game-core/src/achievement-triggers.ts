/**
 * 成就自动解锁触发器
 * 对标 legacy/src/main.js 中分散的 unlockAchieve 调用
 *
 * 每 tick 调用 checkAchievements(state) 集中检查 ~30+ 关键成就。
 */

import type { GameState } from '@evozen/shared-types';
import {
  getChallengeLevel,
  getAchievementLevel,
  getUniverseAffix,
  unlockAchievement,
  unlockFeat,
  type AchievementRecord,
} from './achievements';
import { getRaceMainType } from './races';
import { galaxyPiracy } from './syndicate';

type ChallengeTaskId = 'b1' | 'b2' | 'b3' | 'b4' | 'b5';
type ChallengeTaskStats = Record<ChallengeTaskId, Partial<Record<keyof AchievementRecord, boolean>>>;
type DeathTourResetType = 'ct' | 'bh' | 'di' | 'ai' | 'vc' | 'md';
type DeathTourStats = Record<DeathTourResetType, Partial<Record<keyof AchievementRecord, number>>>;
type WomlingTier = 'friend' | 'lord' | 'god';
type WomlingStats = Record<WomlingTier, Partial<Record<keyof AchievementRecord, number>>>;
type SpireStats = Record<string, Record<string, number>>;
const GENUS_ACHIEVEMENTS = new Set([
  'humanoid',
  'carnivore',
  'herbivore',
  'small',
  'giant',
  'reptilian',
  'avian',
  'insectoid',
  'plant',
  'fungi',
  'aquatic',
  'fey',
  'heat',
  'polar',
  'sand',
  'demonic',
  'angelic',
  'synthetic',
  'eldritch',
]);
const ATMO_ACHIEVEMENTS = new Set([
  'toxic',
  'mellow',
  'rage',
  'stormy',
  'ozone',
  'magnetic',
  'trashed',
  'elliptical',
  'flare',
  'dense',
  'unstable',
  'permafrost',
  'retrograde',
  'kamikaze',
]);
const GROSS_EXCLUDED_SPECIES = new Set(['custom', 'hybrid', 'sludge', 'ultra_sludge']);
const DEATH_TOUR_RESET_TYPES: DeathTourResetType[] = ['ct', 'bh', 'di', 'ai', 'vc', 'md'];
const RESET_DEATH_TOUR_TYPE: Record<string, DeathTourResetType | undefined> = {
  mad: 'md',
  cataclysm: 'ct',
  blackhole: 'bh',
  vacuum: 'vc',
  descend: 'di',
  aiApoc: 'ai',
};
const WOMLING_RESET_TYPES = new Set(['matrix', 'retire', 'eden']);

function isGrossEligibleRun(state: GameState): boolean {
  return Boolean(state.race['ooze']) &&
    !GROSS_EXCLUDED_SPECIES.has(state.race.species) &&
    (Boolean(state.race['gross_enabled']) || (state.tech['high_tech'] ?? 0) <= 0);
}

function getPlanetTraitList(state: GameState): string[] {
  const ptraits = (state.city as unknown as { ptrait?: string[] | string }).ptrait;
  return Array.isArray(ptraits) ? ptraits : typeof ptraits === 'string' ? [ptraits] : [];
}

function unlockPlanetAndGenusAchievements(state: GameState): void {
  const biome = (state.city as { biome?: string }).biome;
  if (biome) {
    unlockAchievement(state, `biome_${biome}`);
  }
  for (const trait of getPlanetTraitList(state)) {
    if (ATMO_ACHIEVEMENTS.has(trait)) {
      unlockAchievement(state, `atmo_${trait}`);
    }
  }
  const genus = getRaceMainType(state);
  if (genus && GENUS_ACHIEVEMENTS.has(genus)) {
    unlockAchievement(state, `genus_${genus}`);
  }
}

function getSpeciesGenus(state: GameState): string | undefined {
  return getRaceMainType(state);
}

function isHellscapeNonDemonic(state: GameState): boolean {
  return state.city.biome === 'hellscape' && getSpeciesGenus(state) !== 'demonic';
}

function hasBadGeology(state: GameState, minCount: number): boolean {
  const geo = (state.city as { geology?: Record<string, number> }).geology;
  if (!geo) return false;
  return Object.values(geo).filter((value) => value < 0).length >= minCount;
}

function unlockJunkerResetFeats(state: GameState): void {
  if (state.race['junker'] && state.race.species === 'junker') {
    unlockFeat(state, 'the_misery');
  }
}

function hasZeroSpaceport(state: GameState): boolean {
  const spaceport = state.space['spaceport'] as { count?: number } | undefined;
  return Boolean(spaceport) && (spaceport?.count ?? 0) === 0;
}

function ensureDeathTourStats(state: GameState): DeathTourStats {
  const stats = state.stats as Record<string, unknown>;
  const current = (stats['death_tour'] ??= {}) as Partial<DeathTourStats>;
  for (const type of DEATH_TOUR_RESET_TYPES) {
    current[type] ??= { l: 0, h: 0, a: 0, e: 0, m: 0, mg: 0 };
  }
  return current as DeathTourStats;
}

function updateGrandDeathTour(state: GameState, resetType: string): void {
  if (state.race.species !== 'ultra_sludge') return;
  const tourType = RESET_DEATH_TOUR_TYPE[resetType];
  if (!tourType) return;

  const affix = getUniverseAffix(state.race.universe as string | undefined);
  const challengeRank = getChallengeLevel(state);
  const deathTour = ensureDeathTourStats(state);
  const previous = deathTour[tourType][affix] ?? 0;
  if (previous < challengeRank) {
    deathTour[tourType][affix] = challengeRank;
  }

  let featRank = 5;
  for (const type of DEATH_TOUR_RESET_TYPES) {
    let bestUniverseRank = 0;
    for (const [key, value] of Object.entries(deathTour[type])) {
      if (key !== 'm' && (value ?? 0) > bestUniverseRank) {
        bestUniverseRank = value ?? 0;
      }
    }
    if (featRank > bestUniverseRank) {
      featRank = bestUniverseRank;
    }
  }
  if (featRank > 0) {
    unlockFeat(state, 'grand_death_tour', false, featRank);
  }
}

function ensureWomlingStats(state: GameState): WomlingStats {
  const stats = state.stats as Record<string, unknown>;
  const current = (stats['womling'] ??= {}) as Partial<WomlingStats>;
  current.friend ??= { l: 0, h: 0, a: 0, e: 0, m: 0, mg: 0 };
  current.lord ??= { l: 0, h: 0, a: 0, e: 0, m: 0, mg: 0 };
  current.god ??= { l: 0, h: 0, a: 0, e: 0, m: 0, mg: 0 };
  return current as WomlingStats;
}

function getWomlingTier(state: GameState): WomlingTier | undefined {
  if (state.race['womling_friend']) return 'friend';
  if (state.race['womling_lord']) return 'lord';
  if (state.race['womling_god']) return 'god';
  return undefined;
}

function updateWomlingResetStats(state: GameState, resetType: string): void {
  if (!WOMLING_RESET_TYPES.has(resetType)) return;

  const tier = getWomlingTier(state);
  if (!tier) return;

  const affix = getUniverseAffix(state.race.universe as string | undefined);
  const womling = ensureWomlingStats(state);
  if (affix !== 'm') {
    womling[tier].l = (womling[tier].l ?? 0) + 1;
  }
  if (affix !== 'l') {
    womling[tier][affix] = (womling[tier][affix] ?? 0) + 1;
  }

  const allStandard = (['friend', 'lord', 'god'] as WomlingTier[]).every((key) => (womling[key].l ?? 0) > 0);
  const allCurrentUniverse = (['friend', 'lord', 'god'] as WomlingTier[]).every((key) => (womling[key][affix] ?? 0) > 0);
  if (allStandard || allCurrentUniverse) {
    unlockAchievement(state, 'overlord', affix === 'm');
  }
}

function ensureSpireStats(state: GameState): SpireStats {
  const stats = state.stats as Record<string, unknown>;
  return (stats['spire'] ??= {}) as SpireStats;
}

function updateSpireResetStats(state: GameState, resetType: string): void {
  if (resetType !== 'descend') return;

  const affix = getUniverseAffix(state.race.universe as string | undefined);
  const spire = ensureSpireStats(state);
  spire[affix] ??= {};
  spire[affix].lord = (spire[affix].lord ?? 0) + 1;
  spire[affix].dlstr = state.tech['dl_reset'] ? 0 : (spire[affix].dlstr ?? 0) + 1;
}

function countAchievementsByPrefix(
  achievements: Record<string, AchievementRecord>,
  prefix: string,
  rank: number,
  affix?: keyof AchievementRecord
): number {
  return Object.entries(achievements)
    .filter(([id, record]) => id.startsWith(prefix) && (affix ? (record[affix] ?? 0) : record.l) >= rank)
    .length;
}

function setAggregateAchievementRank(
  achievements: Record<string, AchievementRecord>,
  id: string,
  rank: number,
  affix?: keyof AchievementRecord
): void {
  achievements[id] ??= { l: 0 };
  if (!affix || affix === 'l') {
    if (achievements[id].l < rank) achievements[id].l = rank;
    return;
  }
  if ((achievements[id][affix] ?? 0) < rank) {
    achievements[id][affix] = rank;
  }
}

function updateAggregateAchievements(state: GameState): void {
  const achieve = state.stats?.['achieve'] as Record<string, AchievementRecord> | undefined;
  if (!achieve) return;

  const currentRank = getChallengeLevel(state);
  const affix = getUniverseAffix(state.race.universe as string | undefined);
  for (let rank = currentRank; rank >= 1; rank--) {
    if (countAchievementsByPrefix(achieve, 'extinct_', rank) >= 25) {
      setAggregateAchievementRank(achieve, 'mass_extinction', rank);
    }
    if (countAchievementsByPrefix(achieve, 'genus_', rank) >= 9) {
      setAggregateAchievementRank(achieve, 'creator', rank);
    }
    if (countAchievementsByPrefix(achieve, 'biome_', rank) >= 6) {
      setAggregateAchievementRank(achieve, 'explorer', rank);
    }
    if (state.race.universe === 'evil' && countAchievementsByPrefix(achieve, 'extinct_', rank, affix) >= 12) {
      setAggregateAchievementRank(achieve, 'vigilante', rank, affix);
    }
    if (state.race.universe === 'heavy' && countAchievementsByPrefix(achieve, 'genus_', rank, affix) >= 8) {
      setAggregateAchievementRank(achieve, 'heavyweight', rank, affix);
    }
  }
}

/**
 * 主成就触发器 — 每 tick 调用一次
 */
export function checkAchievements(state: GameState): void {
  updateAggregateAchievements(state);

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

  if (state.race['inflation'] && (state.resource['Money']?.amount ?? 0) >= 250_000_000_000) {
    unlockAchievement(state, 'wheelbarrow');
  }

  checkBananaChallengeTasks(state);
  checkEndlessHungerChallengeTasks(state);

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

function ensureTaskStats(state: GameState, key: 'banana' | 'endless_hunger'): ChallengeTaskStats {
  const stats = state.stats as Record<string, unknown>;
  const current = (stats[key] ??= {}) as Partial<ChallengeTaskStats>;
  for (const task of ['b1', 'b2', 'b3', 'b4', 'b5'] as ChallengeTaskId[]) {
    current[task] ??= {};
  }
  return current as ChallengeTaskStats;
}

export function markChallengeTask(state: GameState, key: 'banana' | 'endless_hunger', task: ChallengeTaskId): void {
  const affix = getUniverseAffix(state.race.universe as string | undefined);
  const taskStats = ensureTaskStats(state, key);
  taskStats[task][affix] = true;
  if (affix !== 'm' && affix !== 'l') {
    taskStats[task].l = true;
  }
  updateTaskAchievement(state, key);
}

function updateTaskAchievement(state: GameState, key: 'banana' | 'endless_hunger'): void {
  const stats = (state.stats as Record<string, unknown>)[key] as ChallengeTaskStats | undefined;
  if (!stats) return;

  const affix = getUniverseAffix(state.race.universe as string | undefined);
  const tasks = ['b1', 'b2', 'b3', 'b4', 'b5'] as ChallengeTaskId[];
  const standardRank = tasks.filter((task) => stats[task]?.l).length;
  if (standardRank > 0) {
    unlockAchievement(state, key, false, standardRank);
  }

  if (affix !== 'l') {
    const universeRank = tasks.filter((task) => stats[task]?.[affix]).length;
    if (universeRank > 0) {
      unlockAchievement(state, key, false, universeRank);
    }
  }
}

function checkBananaChallengeTasks(state: GameState): void {
  if (!state.race['banana']) return;

  if ((state.tech['monuments'] ?? 0) >= 50) {
    markChallengeTask(state, 'banana', 'b5');
  }

  const stellar = state.interstellar['stellar_engine'] as { mass?: number; exotic?: number } | undefined;
  if ((stellar?.mass ?? 0) >= 12 && (stellar?.exotic ?? 0) === 0) {
    markChallengeTask(state, 'banana', 'b3');
  }

  const routes = state.city.trade_routes ?? [];
  const exporting = routes.filter((route) => route.action === 'sell' && route.qty >= 500);
  const importing = routes
    .filter((route) => route.action === 'buy')
    .reduce((sum, route) => sum + route.qty, 0);
  if (exporting.length > 0) {
    markChallengeTask(state, 'banana', 'b4');
    if (importing >= 500) {
      unlockFeat(state, 'banana');
    }
  }
}

function checkEndlessHungerChallengeTasks(state: GameState): void {
  if (!state.race['fasting']) return;

  if ((state.tech['piracy'] ?? 0) > 0 && (state.tech['chthonian'] ?? 0) >= 2) {
    const chthonianPiracy = galaxyPiracy(state, 'gxy_chthonian');
    const stargatePiracy = galaxyPiracy(state, 'gxy_stargate');
    if (chthonianPiracy === stargatePiracy) {
      markChallengeTask(state, 'endless_hunger', 'b2');
    }
  }

  if ((state.tech['stock_exchange'] ?? 0) >= 80) {
    markChallengeTask(state, 'endless_hunger', 'b3');
  }

  const species = state.race.species;
  if ((state.resource[species]?.amount ?? 0) >= 1200) {
    markChallengeTask(state, 'endless_hunger', 'b4');
  }

  updateTaskAchievement(state, 'endless_hunger');
}

/** 转生时触发的成就（在 resets.ts 中调用） */
export function checkResetAchievements(state: GameState, resetType: string): void {
  switch (resetType) {
    case 'mad':
      unlockAchievement(state, 'apocalypse');
      unlockAchievement(state, 'squished', true);
      if (isHellscapeNonDemonic(state)) {
        unlockFeat(state, 'take_no_advice');
      }
      if (state.race['truepath']) {
        unlockAchievement(state, 'ashanddust');
      }
      break;
    case 'ascend':
      unlockAchievement(state, 'ascended');
      if (!state.race['modified'] && (state.race.species === 'synth' || state.race.species === 'nano') && state.race['emfield']) {
        unlockFeat(state, 'digital_ascension');
      }
      if (state.race['decay']) {
        unlockAchievement(state, 'dissipated');
      }
      if (state.race['steelen']) {
        unlockFeat(state, 'steelem');
      }
      break;
    case 'bioseed':
      unlockAchievement(state, 'seeder');
      unlockPlanetAndGenusAchievements(state);
      if (state.race['cataclysm']) {
        unlockAchievement(state, 'iron_will', false, 5);
      }
      if (state.race['truepath']) {
        unlockAchievement(state, 'exodus');
      }
      if (state.race['junker'] && state.race.species === 'junker') {
        unlockFeat(state, 'organ_harvester');
      }
      if (isHellscapeNonDemonic(state)) {
        unlockFeat(state, 'ill_advised');
      }
      if (state.race['gravity_well']) {
        unlockAchievement(state, 'escape_velocity');
      }
      if (getPlanetTraitList(state).includes('dense') && state.race.universe === 'heavy') {
        unlockAchievement(state, 'double_density');
      }
      if (state.race['steelen']) {
        unlockAchievement(state, 'steelen');
      }
      if (hasBadGeology(state, 3)) {
        unlockFeat(state, 'rocky_road');
      }
      if (state.race.universe === 'micro') {
        if (state.race['small'] || state.race['compact']) {
          unlockAchievement(state, 'macro', true);
        } else {
          unlockAchievement(state, 'marble', true);
        }
      }
      break;
    case 'blackhole':
      unlockAchievement(state, 'blackhole');
      unlockAchievement(state, 'squished', true);
      switch (state.race.universe) {
        case 'heavy':
          unlockAchievement(state, 'heavy');
          break;
        case 'antimatter':
          unlockAchievement(state, 'canceled');
          break;
        case 'evil':
          unlockAchievement(state, 'eviltwin');
          break;
        case 'micro':
          unlockAchievement(state, 'microbang', true);
          break;
        case 'standard':
          unlockAchievement(state, 'whitehole');
          break;
      }
      if (state.race['decay']) {
        unlockAchievement(state, 'dissipated');
      }
      if (state.race['steelen']) {
        unlockFeat(state, 'steelem');
      }
      if (hasZeroSpaceport(state)) {
        unlockAchievement(state, 'red_dead');
      }
      if (state.race.universe === 'evil' && getSpeciesGenus(state) === 'angelic') {
        unlockFeat(state, 'nephilim');
      }
      unlockJunkerResetFeats(state);
      break;
    case 'vacuum':
      unlockAchievement(state, 'pw_apocalypse');
      if (hasZeroSpaceport(state)) {
        unlockAchievement(state, 'red_dead');
      }
      if (!state.race['modified'] && state.race.species === 'balorg') {
        unlockAchievement(state, 'pass');
      }
      unlockJunkerResetFeats(state);
      if (state.race['decay']) {
        unlockAchievement(state, 'dissipated');
      }
      if (state.race['steelen']) {
        unlockFeat(state, 'steelem');
      }
      break;
    case 'cataclysm':
      unlockAchievement(state, 'squished', true);
      if (isHellscapeNonDemonic(state)) {
        unlockFeat(state, 'take_no_advice');
      }
      unlockAchievement(state, 'red_dead');
      if (state.race['cataclysm']) {
        unlockAchievement(state, 'failed_history');
      }
      break;
    case 'descend':
      unlockAchievement(state, 'pandemonium');
      unlockAchievement(state, 'squished', true);
      if (state.race['witch_hunter'] && (state.tech['forbidden'] ?? 0) >= 5 && state.race.universe === 'magic') {
        unlockAchievement(state, 'nightmare');
      } else {
        unlockAchievement(state, 'corrupted');
      }
      if (state.race['fasting'] && (state.tech['dish_reset'] ?? 0) > 0 && (state.stats['starved'] ?? 0) === 0) {
        unlockFeat(state, 'immortal');
      }
      if (getSpeciesGenus(state) === 'angelic') {
        unlockFeat(state, 'twisted');
      }
      unlockJunkerResetFeats(state);
      if (!state.race['modified'] && state.race['junker'] && state.race.species === 'junker') {
        unlockFeat(state, 'garbage_pie');
      }
      if (state.race['cataclysm']) {
        unlockFeat(state, 'finish_line');
      }
      if (state.race['ooze'] && state.race.species === 'sludge') {
        unlockFeat(state, 'slime_lord');
      }
      break;
    case 'apotheosis':
      unlockAchievement(state, 'godwin');
      break;
    case 'aiApoc':
      unlockAchievement(state, 'squished', true);
      unlockJunkerResetFeats(state);
      unlockAchievement(state, 'obsolete');
      break;
    case 'matrix':
      unlockPlanetAndGenusAchievements(state);
      unlockAchievement(state, 'bluepill');
      break;
    case 'retire':
      unlockPlanetAndGenusAchievements(state);
      unlockAchievement(state, 'retired');
      break;
    case 'eden':
      unlockPlanetAndGenusAchievements(state);
      unlockAchievement(state, 'paradise');
      unlockAchievement(state, 'adam_eve');
      break;
    case 'terraform': {
      unlockPlanetAndGenusAchievements(state);
      unlockAchievement(state, 'lamentis');
      break;
    }
  }

  if (isGrossEligibleRun(state)) {
    unlockAchievement(state, 'gross');
  }
  updateGrandDeathTour(state, resetType);
  updateWomlingResetStats(state, resetType);
  updateSpireResetStats(state, resetType);

  updatePathfinderAchievement(state);
  updateBananaAchievement(state);
  updateWarlordAchievement(state);

  // genus + species 灭绝
  const species = state.race.species;
  if (species && species !== 'protoplasm') {
    unlockAchievement(state, `extinct_${species}`);
  }

  updateAggregateAchievements(state);
}

function updatePathfinderAchievement(state: GameState): void {
  const pathfinderParts = ['ashanddust', 'exodus', 'obsolete', 'bluepill', 'retired'];
  const rank = pathfinderParts.filter((id) => getAchievementLevel(state, id) >= 5).length;
  if (rank > 0) {
    unlockAchievement(state, 'pathfinder', false, rank);
  }
}

function updateBananaAchievement(state: GameState): void {
  const bananaStats = (state.stats as Record<string, unknown>)['banana'] as Partial<ChallengeTaskStats> | undefined;
  if (!bananaStats) return;

  const rank = (['b1', 'b2', 'b3', 'b4', 'b5'] as ChallengeTaskId[]).filter((key) => bananaStats[key]?.l).length;
  if (rank > 0) {
    unlockAchievement(state, 'banana', false, rank);
  }
}

function updateWarlordAchievement(state: GameState): void {
  if (!state.race['warlord']) return;
  const warlordStats = (state.stats as Record<string, unknown>)['warlord'] as Record<string, boolean> | undefined;
  if (!warlordStats) return;

  const rank = Object.values(warlordStats).filter(Boolean).length;
  if (rank > 0) {
    unlockAchievement(state, 'what_is_best', false, rank);
  }
}

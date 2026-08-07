import type { GameState } from '@evozen/shared-types';
import { getChallengeLevel, unlockFeat } from './achievements';
import { getTraitVar } from './trait-ranks';

export interface WishStats {
  minor: number;
  major: number;
  plas: number;
  tax: number;
  bad: number;
  fame: number;
  troop: number;
  prof: number;
  potato: number;
  priest: number;
  temple: boolean;
  zigg: boolean;
  astro: boolean;
  casino: boolean;
  ship: boolean;
  gov: boolean;
  strong: boolean;
}

export type WishWonder = 'lighthouse' | 'pyramid' | 'statue' | 'gardens';

export type GreatnessWishResult =
  | { type: 'feat'; unlocked: boolean }
  | { type: 'wonder'; wonder: WishWonder }
  | { type: 'no_wonder' };

function createWishStats(): WishStats {
  return {
    minor: 0,
    major: 0,
    plas: 0,
    tax: 0,
    bad: 0,
    fame: 0,
    troop: 0,
    prof: 0,
    potato: 0,
    priest: 0,
    temple: false,
    zigg: false,
    astro: false,
    casino: false,
    ship: false,
    gov: false,
    strong: false,
  };
}

export function initializeWishStats(state: GameState): WishStats {
  const current = state.race['wishStats'];
  if (!current || typeof current !== 'object') {
    const created = createWishStats();
    state.race['wishStats'] = created;
    return created;
  }
  const defaults = createWishStats();
  const stats = current as Partial<WishStats>;
  for (const [key, value] of Object.entries(defaults)) {
    if (stats[key as keyof WishStats] === undefined) {
      (stats as Record<string, unknown>)[key] = value;
    }
  }
  return stats as WishStats;
}

export function getWishStats(state: GameState): WishStats | null {
  if (!state.race['wish'] || (state.tech['wish'] ?? 0) < 1) return null;
  return initializeWishStats(state);
}

function wishCooldown(state: GameState): number {
  const rank = Number(state.race['wish'] ?? 1);
  return getTraitVar('wish', 0, rank) || 1440;
}

export function isMajorWishReady(state: GameState): boolean {
  const stats = getWishStats(state);
  return Boolean(stats && (state.tech['wish'] ?? 0) >= 2 && stats.major <= 0);
}

function currentFeatRank(state: GameState): number {
  return Number((state.stats['feat'] as Record<string, number> | undefined)?.['wish'] ?? 0);
}

function availableWonders(state: GameState): WishWonder[] {
  const wonders: WishWonder[] = [];
  if (state.race['lone_survivor']) return wonders;

  const hasCity = !state.race['cataclysm'] && !state.race['orbit_decay'] && !state.race['warlord'];
  const hasMars = Boolean(state.tech['mars']) && !state.race['warlord'];
  if (!state.city['wonder_lighthouse'] && hasCity) wonders.push('lighthouse');
  if (!state.city['wonder_pyramid'] && hasCity) wonders.push('pyramid');
  if (!state.space['wonder_statue'] && hasMars) wonders.push('statue');

  if (state.race['warlord']) {
    if (!state.portal['wonder_gardens']) wonders.push('gardens');
  } else if (state.race['truepath']) {
    if (!state.space['wonder_gardens'] && (state.tech['titan'] ?? 0) >= 2) wonders.push('gardens');
  } else if (!state.interstellar['wonder_gardens'] && (state.tech['alpha'] ?? 0) >= 2) {
    wonders.push('gardens');
  }
  return wonders;
}

function grantWonder(state: GameState, wonder: WishWonder): void {
  switch (wonder) {
    case 'lighthouse':
      state.city['wonder_lighthouse'] = { count: 1 };
      break;
    case 'pyramid':
      state.city['wonder_pyramid'] = { count: 1 };
      break;
    case 'statue':
      state.space['wonder_statue'] = { count: 1 };
      break;
    case 'gardens': {
      const region = state.race['warlord'] ? state.portal : state.race['truepath'] ? state.space : state.interstellar;
      region['wonder_gardens'] = { count: 1 };
      break;
    }
  }
}

/** 原版高级愿望“追求伟大”：随机赐予一个可用奇观，或解锁 wish 功绩。 */
export function castGreatnessWish(state: GameState, rng: () => number = Math.random): GreatnessWishResult | null {
  if (!isMajorWishReady(state)) return null;
  const stats = initializeWishStats(state);
  stats.major = wishCooldown(state);

  const featEligible = !state.race['lone_survivor']
    && !state.race['warlord']
    && currentFeatRank(state) < getChallengeLevel(state);
  const outcomes: Array<'wonder' | 'feat'> = ['wonder'];
  if (featEligible) outcomes.push('feat');
  const outcomeIndex = Math.min(outcomes.length - 1, Math.floor(Math.max(0, rng()) * outcomes.length));
  if (outcomes[outcomeIndex] === 'feat') {
    return { type: 'feat', unlocked: unlockFeat(state, 'wish', state.race.universe === 'micro') };
  }

  const wonders = availableWonders(state);
  if (wonders.length === 0) return { type: 'no_wonder' };
  const wonderIndex = Math.min(wonders.length - 1, Math.floor(Math.max(0, rng()) * wonders.length));
  const wonder = wonders[wonderIndex];
  grantWonder(state, wonder);
  return { type: 'wonder', wonder };
}

export function tickWishCooldowns(state: GameState, amount: number): void {
  const stats = getWishStats(state);
  if (!stats || amount <= 0) return;
  stats.minor = Math.max(0, stats.minor - amount);
  stats.major = Math.max(0, stats.major - amount);
  stats.bad = Math.max(0, stats.bad - amount);
}

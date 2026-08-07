import type { GameState, ResourceState } from '@evozen/shared-types';

export type SeasonalEventId = 'launch_day' | 'summer' | 'firework';

export function isSeasonalEventActive(state: GameState, event: SeasonalEventId, date: Date = new Date()): boolean {
  if (state.settings.boring) return false;
  const month = date.getMonth();
  const day = date.getDate();
  if (event === 'launch_day') return month === 4 && day === 6;
  if (event === 'summer') return month === 5 && day >= 20 && day <= 22;
  return month === 6 && day >= 1 && day <= 4;
}

export function getSolsticeThermiteGoal(state: GameState): number {
  return Math.min(1_000_000, 100_000 + (state.stats.reset ?? 0) * 9_000);
}

export function getFireworkRegion(state: GameState): 'city' | 'space' {
  return state.race['cataclysm'] || state.race['orbit_decayed'] ? 'space' : 'city';
}

export function syncSeasonalEventState(state: GameState, date: Date = new Date()): void {
  const foundry = state.city['foundry'] as Record<string, number> | undefined;
  if (isSeasonalEventActive(state, 'summer', date)) {
    if (foundry) foundry['Thermite'] ??= 0;
    state.resource['Thermite'] ??= {
      name: '铝热剂', display: true, value: 0, amount: 0, max: -1,
      rate: 0, crates: 0, containers: 0, diff: 0, delta: 0,
    } satisfies ResourceState;
    state.resource['Thermite'].display = true;
  } else {
    if (foundry) delete foundry['Thermite'];
    if (state.resource['Thermite']) state.resource['Thermite'].display = false;
  }

  if (isSeasonalEventActive(state, 'firework', date)) {
    const bucket = getFireworkRegion(state) === 'space' ? state.space : state.city;
    bucket['firework'] ??= { count: 0, on: 0 };
  } else {
    delete state.city['firework'];
    delete state.space['firework'];
  }
}

export function canBuildSeasonalFirework(state: GameState, date: Date = new Date()): boolean {
  if (!isSeasonalEventActive(state, 'firework', date)) return false;
  if ((state.tech['mining'] ?? 0) < 3 || (!(state.tech['cement'] ?? 0) && !state.race['flier'])) return false;
  const bucket = getFireworkRegion(state) === 'space' ? state.space : state.city;
  if (((bucket['firework'] as { count?: number } | undefined)?.count ?? 0) > 0) return false;
  return (state.resource['Money']?.amount ?? 0) >= 50_000
    && (state.resource['Iron']?.amount ?? 0) >= 7_500
    && (state.resource['Cement']?.amount ?? 0) >= 10_000;
}

export function buildSeasonalFirework(state: GameState, date: Date = new Date()): GameState | null {
  if (!canBuildSeasonalFirework(state, date)) return null;
  const next = structuredClone(state);
  syncSeasonalEventState(next, date);
  next.resource['Money'].amount -= 50_000;
  next.resource['Iron'].amount -= 7_500;
  next.resource['Cement'].amount -= 10_000;
  const bucket = getFireworkRegion(next) === 'space' ? next.space : next.city;
  bucket['firework'] = { count: 1, on: 0 };
  return next;
}

export function setSeasonalFireworkActive(state: GameState, active: boolean, date: Date = new Date()): GameState | null {
  if (!isSeasonalEventActive(state, 'firework', date)) return null;
  const next = structuredClone(state);
  const bucket = getFireworkRegion(next) === 'space' ? next.space : next.city;
  const firework = bucket['firework'] as { count?: number; on?: number } | undefined;
  if (!firework || (firework.count ?? 0) < 1) return null;
  firework.on = active ? 1 : 0;
  return next;
}

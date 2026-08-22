import type { GameState } from '@evozen/shared-types';
import { getAchievementLevel } from './achievements';
import { applyPillarStorageBonus } from './pillars';
import { getTraitVar } from './trait-ranks';

export const TAUCETI_REPOSITORY_STANDARD_VALUES = {
  Lumber: 30_000,
  Stone: 30_000,
  Furs: 17_000,
  Copper: 15_200,
  Iron: 14_000,
  Aluminium: 12_800,
  Cement: 11_200,
  Coal: 4_800,
  Steel: 2_400,
  Titanium: 1_600,
  Crystal: 10,
  Alloy: 1_800,
  Polymer: 1_500,
  Iridium: 1_750,
  Chrysotile: 30_000,
  Nano_Tube: 1_200,
  Neutronium: 640,
  Adamantite: 720,
  Unobtainium: 1_000,
} as const;

export const TAUCETI_REPOSITORY_ISOLATION_VALUES = {
  Oil: 680,
  Helium_3: 575,
  Uranium: 125,
  Water: 15,
} as const;

export type TaucetiRepositoryResourceId =
  | keyof typeof TAUCETI_REPOSITORY_STANDARD_VALUES
  | keyof typeof TAUCETI_REPOSITORY_ISOLATION_VALUES;

export const TAUCETI_REPOSITORY_STANDARD_RESOURCES = Object.keys(
  TAUCETI_REPOSITORY_STANDARD_VALUES,
) as (keyof typeof TAUCETI_REPOSITORY_STANDARD_VALUES)[];

export const TAUCETI_REPOSITORY_ISOLATION_RESOURCES = Object.keys(
  TAUCETI_REPOSITORY_ISOLATION_VALUES,
) as (keyof typeof TAUCETI_REPOSITORY_ISOLATION_VALUES)[];

export const TAUCETI_REPOSITORY_CONTAINER_CAPACITY = 250;

export const TRUEPATH_STOREHOUSE_VALUES = {
  Lumber: 3_000,
  Stone: 3_000,
  Furs: 1_700,
  Copper: 1_520,
  Iron: 1_400,
  Aluminium: 1_280,
  Cement: 1_120,
  Coal: 480,
  Steel: 240,
  Titanium: 160,
  Alloy: 180,
  Polymer: 150,
  Iridium: 175,
  Chrysotile: 3_000,
  Nano_Tube: 120,
  Neutronium: 64,
  Adamantite: 72,
} as const;

export const TRUEPATH_STOREHOUSE_RESOURCES = Object.keys(
  TRUEPATH_STOREHOUSE_VALUES,
) as (keyof typeof TRUEPATH_STOREHOUSE_VALUES)[];

const TRUEPATH_STOREHOUSE_HEAVY_RESOURCES = new Set([
  'Copper', 'Iron', 'Steel', 'Titanium', 'Iridium', 'Neutronium', 'Adamantite',
]);

function raceRank(state: GameState, traitId: string): number {
  const value = state.race[traitId];
  return typeof value === 'number' && value > 0 ? value : value ? 1 : 0;
}

export function getTaucetiRepositoryResources(state: GameState): TaucetiRepositoryResourceId[] {
  return state.tech['isolation']
    ? [...TAUCETI_REPOSITORY_STANDARD_RESOURCES, ...TAUCETI_REPOSITORY_ISOLATION_RESOURCES]
    : [...TAUCETI_REPOSITORY_STANDARD_RESOURCES];
}

/** 对标 legacy truepath.js tpStorageMultiplier('repository')。 */
export function getTaucetiRepositoryStorageMultiplier(state: GameState): number {
  let multiplier = 1;
  const packRatRank = raceRank(state, 'pack_rat');
  if (packRatRank > 0) {
    multiplier *= 1 + getTraitVar('pack_rat', 1, packRatRank) / 100;
  }
  multiplier *= 1 + getAchievementLevel(state, 'blackhole') * 0.05;
  if ((state.tech['world_control'] ?? 0) >= 1) multiplier *= 3;
  if ((state.tech['isolation'] ?? 0) >= 1) {
    multiplier *= 3;
    multiplier *= 1 + (state.tech['tp_depot'] ?? 0) / 20;
  }
  return multiplier;
}

export function getTaucetiRepositoryBaseValue(
  state: GameState,
  resourceId: string,
): number {
  if (resourceId in TAUCETI_REPOSITORY_STANDARD_VALUES) {
    return TAUCETI_REPOSITORY_STANDARD_VALUES[
      resourceId as keyof typeof TAUCETI_REPOSITORY_STANDARD_VALUES
    ];
  }
  if (state.tech['isolation'] && resourceId in TAUCETI_REPOSITORY_ISOLATION_VALUES) {
    return TAUCETI_REPOSITORY_ISOLATION_VALUES[
      resourceId as keyof typeof TAUCETI_REPOSITORY_ISOLATION_VALUES
    ];
  }
  return 0;
}

export function getTaucetiRepositoryStorageBonus(
  state: GameState,
  resourceId: string,
  count: number = state.tauceti['repository']?.count ?? 0,
): number {
  const resource = state.resource[resourceId];
  const baseValue = getTaucetiRepositoryBaseValue(state, resourceId);
  if (!resource?.display || baseValue <= 0 || count <= 0) return 0;
  return count * applyPillarStorageBonus(
    state,
    baseValue * getTaucetiRepositoryStorageMultiplier(state),
  );
}

export function getTaucetiRepositoryContainerCapacityBonus(state: GameState): number {
  if (!state.tech['isolation']) return 0;
  return Math.max(0, state.tauceti['repository']?.count ?? 0)
    * TAUCETI_REPOSITORY_CONTAINER_CAPACITY;
}

export function getTruepathStorehouseStorageMultiplier(
  state: GameState,
  heavy: boolean,
): number {
  let multiplier = getTaucetiRepositoryStorageMultiplier(state);
  const titanSpaceport = state.space['titan_spaceport'] as { count?: number; on?: number } | undefined;
  const activeSpaceports = state.city.power
    ? state.city.power.activeConsumers?.['titan_spaceport'] ?? 0
    : titanSpaceport?.on ?? titanSpaceport?.count ?? 0;
  if (activeSpaceports > 0) multiplier *= 1 + activeSpaceports * 0.25;
  if (heavy && (state.tech['shelving'] ?? 0) >= 1) multiplier *= 2;
  if ((state.tech['shelving'] ?? 0) >= 3) multiplier *= 1.5;
  return multiplier;
}

export function getTruepathStorehouseStorageBonus(
  state: GameState,
  resourceId: string,
  count: number = state.space['storehouse']?.count ?? 0,
): number {
  const baseValue = TRUEPATH_STOREHOUSE_VALUES[
    resourceId as keyof typeof TRUEPATH_STOREHOUSE_VALUES
  ] ?? 0;
  if (!state.resource[resourceId]?.display || count <= 0 || baseValue <= 0) return 0;
  return count * applyPillarStorageBonus(
    state,
    baseValue * getTruepathStorehouseStorageMultiplier(
      state,
      TRUEPATH_STOREHOUSE_HEAVY_RESOURCES.has(resourceId),
    ),
  );
}

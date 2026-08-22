import type { GameState } from '@evozen/shared-types';
import { getAchievementLevel } from './achievements';
import { getTraitVar } from './trait-ranks';

function raceRank(state: GameState, traitId: string): number {
  const value = state.race[traitId];
  return typeof value === 'number' && value > 0 ? value : value ? 1 : 0;
}

/** 对标 legacy production('psychic_boost', resource)。 */
export function getPsychicProductionMultiplier(state: GameState, resource: string): number {
  if (!(state.tech['psychic'] ?? 0) || !state.race['psychic']) return 1;
  const powers = state.race['psychicPowers'] as {
    boost?: { r?: string };
    boostTime?: number;
    channel?: { boost?: number };
  } | undefined;
  if (!powers?.boost || powers.boost.r !== resource || powers.boostTime === undefined) return 1;

  const strengthPercent = getTraitVar('psychic', 3, raceRank(state, 'psychic'));
  let bonus = powers.boostTime > 0 ? strengthPercent / 100 : 0;
  if ((state.tech['psychic'] ?? 0) >= 4 && powers.channel) {
    const nightmare = getAchievementLevel(state, 'nightmare', 'mg');
    bonus += Number((strengthPercent / 50000 * nightmare * (powers.channel.boost ?? 0)).toFixed(3));
  }
  return 1 + bonus;
}

const TEAMSTER_LOAD_JOBS = [
  'hunter',
  'forager',
  'farmer',
  'lumberjack',
  'quarry_worker',
  'crystal_miner',
  'scavenger',
  'miner',
  'coal_miner',
  'craftsman',
  'cement_worker',
  'space_miner',
  'hell_surveyor',
  'pit_miner',
] as const;

export interface TeamsterLoadOverrides {
  factory?: number;
  redFactory?: number;
  iridiumMine?: number;
  heliumMine?: number;
  redMine?: number;
  outpost?: number;
}

function structureOn(state: GameState, id: string): number {
  const regions = [state.city, state.space, state.interstellar, state.portal, state.tauceti];
  for (const region of regions) {
    const structure = region[id] as { count?: number; on?: number } | undefined;
    if (structure) return Math.max(0, structure.on ?? structure.count ?? 0);
  }
  return 0;
}

/** 对标 legacy main.js 的重力井运输负载汇总。 */
export function calculateTeamsterLoad(
  state: GameState,
  overrides: TeamsterLoadOverrides = {},
): number {
  if (!state.race['gravity_well']) return 0;

  const servants = state.race['servants'] as {
    jobs?: Record<string, number>;
    sused?: number;
  } | undefined;
  let load = 0;
  for (const jobId of TEAMSTER_LOAD_JOBS) {
    const job = state.civic[jobId] as { workers?: number } | undefined;
    load += Math.max(0, job?.workers ?? 0);
    load += Math.max(0, servants?.jobs?.[jobId] ?? 0);
  }

  const oilWells = (state.city['oil_well'] as { count?: number } | undefined)?.count ?? 0;
  if ((state.tech['teamster'] ?? 0) < 3) load += Math.max(0, oilWells) * 2;

  const active = (override: number | undefined, id: string) =>
    Math.max(0, override ?? structureOn(state, id));
  load += active(overrides.factory, 'factory') * 2;
  load += active(overrides.redFactory, 'red_factory') * 2;
  load += active(overrides.iridiumMine, 'iridium_mine') * 2;
  load += active(overrides.heliumMine, 'helium_mine');
  load += active(overrides.redMine, 'red_mine') * 3;
  load += active(overrides.outpost, 'outpost') * 3;
  load += Math.max(0, servants?.sused ?? 0);

  return load;
}

/** 对标 legacy jobs.js teamsterCap()。 */
export function getTeamsterCapacity(state: GameState, load = Number(state.race['teamster']) || 0): number {
  if (!state.race['gravity_well'] || load <= 0) return 0;
  const transport = Math.max(0, state.tech['transport'] ?? 0);
  let capacity = transport > 0 ? Math.round(load / transport * 1.5) : Infinity;
  if ((state.tech['railway'] ?? 0) > 0) capacity -= state.tech['railway'] * 2;
  return Math.max(0, capacity);
}

/** 对标 legacy teamster(1)，仅在存在运输负载时施加重力井裁剪。 */
export function getTeamsterProductionMultiplier(state: GameState): number {
  const load = Math.max(0, Number(state.race['teamster']) || 0);
  if (!state.race['gravity_well'] || load <= 0) return 1;
  const capacity = Math.max(1, getTeamsterCapacity(state, load));
  if (!Number.isFinite(capacity)) return 0;
  const workers = Math.min(
    capacity,
    Math.max(0, (state.civic['teamster'] as { workers?: number } | undefined)?.workers ?? 0),
  );
  return workers / capacity;
}

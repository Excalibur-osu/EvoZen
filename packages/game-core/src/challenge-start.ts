import type { GameState } from '@evozen/shared-types';
import { getAchievementLevel } from './achievements';

export type ChallengeMode =
  | 'standard'
  | 'cataclysm'
  | 'lone_survivor'
  | 'truepath'
  | 'warlord'
  | 'banana'
  | 'junker'
  | 'fasting';

export interface ChallengeStartOptions {
  mode?: ChallengeMode;
  noPlasmid?: boolean;
  weakMastery?: boolean;
  noTrade?: boolean;
  noCraft?: boolean;
  noCrispr?: boolean;
  nerfed?: boolean;
  badGenes?: boolean;
  joyless?: boolean;
  steelen?: boolean;
  decay?: boolean;
  emfield?: boolean;
  inflation?: boolean;
  orbitDecay?: boolean;
  gravityWell?: boolean;
  witchHunter?: boolean;
  sludge?: boolean;
  ultraSludge?: boolean;
}

export const STANDARD_CHALLENGE_FLAGS = [
  'noPlasmid',
  'weakMastery',
  'noTrade',
  'noCraft',
  'noCrispr',
] as const;

export const SPECIAL_CHALLENGE_FLAGS = [
  'joyless',
  'steelen',
  'decay',
  'emfield',
  'inflation',
  'orbitDecay',
  'gravityWell',
  'witchHunter',
  'sludge',
  'ultraSludge',
] as const;

export type StandardChallengeFlag = (typeof STANDARD_CHALLENGE_FLAGS)[number];
export type SpecialChallengeFlag = (typeof SPECIAL_CHALLENGE_FLAGS)[number];
export type SelectableChallengeFlag = StandardChallengeFlag | SpecialChallengeFlag;

/** 原版只要求已购买一级挑战基因；更高等级改变精通，不解锁额外场景。 */
export const BASIC_CHALLENGE_UNLOCK_LEVEL: Record<SelectableChallengeFlag, number> = {
  noPlasmid: 1,
  weakMastery: 1,
  noTrade: 1,
  noCraft: 1,
  noCrispr: 1,
  joyless: 1,
  steelen: 1,
  decay: 1,
  emfield: 1,
  inflation: 1,
  orbitDecay: 1,
  gravityWell: 1,
  witchHunter: 1,
  sludge: 1,
  ultraSludge: 1,
};

export const SCENARIO_CHALLENGE_UNLOCK_LEVEL: Record<Exclude<ChallengeMode, 'standard'>, number> = {
  cataclysm: 1,
  banana: 1,
  truepath: 1,
  junker: 1,
  fasting: 1,
  lone_survivor: 1,
  warlord: 1,
};

export const SPECIAL_CHALLENGE_RACE_FLAG: Record<SpecialChallengeFlag, string> = {
  joyless: 'joyless',
  steelen: 'steelen',
  decay: 'decay',
  emfield: 'emfield',
  inflation: 'inflation',
  orbitDecay: 'orbit_decay',
  gravityWell: 'gravity_well',
  witchHunter: 'witch_hunter',
  sludge: 'sludge',
  ultraSludge: 'ultra_sludge',
};

function hasAchievement(state: GameState, id: string, affix?: 'h' | 'mg' | 'e'): boolean {
  return getAchievementLevel(state, id, affix) > 0;
}

export function canUseScenarioMode(state: GameState, mode: ChallengeMode): boolean {
  switch (mode) {
    case 'standard':
      return true;
    case 'cataclysm':
      return hasAchievement(state, 'shaken');
    case 'banana':
      return hasAchievement(state, 'whitehole') || hasAchievement(state, 'ascended');
    case 'truepath':
      return hasAchievement(state, 'ascended') || hasAchievement(state, 'corrupted');
    case 'lone_survivor':
      return hasAchievement(state, 'retired');
    case 'warlord':
      return state.race.universe === 'evil' && hasAchievement(state, 'godslayer', 'e');
    case 'fasting':
      return hasAchievement(state, 'corrupted');
    case 'junker':
      return true;
  }
}

export function canUseSpecialChallenge(state: GameState, flag: SpecialChallengeFlag): boolean {
  switch (flag) {
    case 'joyless':
    case 'steelen':
      return true;
    case 'decay':
      return hasAchievement(state, 'whitehole');
    case 'emfield':
      return hasAchievement(state, 'ascended');
    case 'inflation':
      return hasAchievement(state, 'scrooge');
    case 'orbitDecay':
      return hasAchievement(state, 'whitehole') || hasAchievement(state, 'ascended');
    case 'gravityWell':
      return state.race.universe === 'heavy' && hasAchievement(state, 'seeder', 'h');
    case 'witchHunter':
      return state.race.universe === 'magic' && hasAchievement(state, 'ascended', 'mg');
    case 'sludge':
      return (hasAchievement(state, 'ascended') || hasAchievement(state, 'corrupted'))
        && hasAchievement(state, 'extinct_junker');
    case 'ultraSludge':
      return hasAchievement(state, 'godslayer') && hasAchievement(state, 'extinct_sludge');
  }
}

export function normalizeChallengeStartOptions(
  state: GameState,
  challenges?: ChallengeStartOptions,
): ChallengeStartOptions | undefined {
  if (!challenges || Number(state.genes['challenge'] ?? 0) < 1) return undefined;

  const requestedMode = challenges.mode ?? 'standard';
  const mode = requestedMode !== 'standard' && !canUseScenarioMode(state, requestedMode)
    ? 'standard'
    : requestedMode;
  const normalized: ChallengeStartOptions = { mode };
  if (mode !== 'standard') return normalized;

  for (const flag of STANDARD_CHALLENGE_FLAGS) {
    if (challenges[flag]) normalized[flag] = true;
  }
  if (state.race.universe === 'antimatter') {
    delete normalized.noPlasmid;
  } else {
    delete normalized.weakMastery;
  }

  for (const flag of SPECIAL_CHALLENGE_FLAGS) {
    if (challenges[flag] && canUseSpecialChallenge(state, flag)) normalized[flag] = true;
  }
  if (normalized.ultraSludge) delete normalized.sludge;

  return normalized;
}

export function applyChallengeStartOptions(
  state: GameState,
  challenges?: ChallengeStartOptions,
): void {
  const mode = challenges?.mode ?? 'standard';
  const scenarioFlags: ChallengeMode[] = [
    'cataclysm',
    'lone_survivor',
    'truepath',
    'warlord',
    'banana',
    'junker',
    'fasting',
  ];
  const challengeFlags = [
    'no_plasmid',
    'weak_mastery',
    'no_trade',
    'no_craft',
    'no_crispr',
    'nerfed',
    'badgenes',
    'orbit_decayed',
    ...Object.values(SPECIAL_CHALLENGE_RACE_FLAG),
  ];
  for (const flag of [...scenarioFlags, ...challengeFlags]) delete state.race[flag];
  if (!challenges) return;

  if (mode !== 'standard') state.race[mode] = 1;
  if (mode === 'warlord') state.race.universe = 'evil';

  if (mode === 'truepath' || mode === 'lone_survivor') {
    state.race['nerfed'] = 1;
    state.race['badgenes'] = 1;
    state.race['no_trade'] = 1;
    state.race['no_craft'] = 1;
    return;
  }

  if (mode !== 'standard') {
    if (state.race.universe === 'antimatter') state.race['weak_mastery'] = 1;
    else state.race['no_plasmid'] = 1;
    state.race['no_crispr'] = 1;
    state.race['no_trade'] = 1;
    state.race['no_craft'] = 1;
    return;
  }

  if (challenges.noPlasmid) state.race['no_plasmid'] = 1;
  if (challenges.weakMastery) state.race['weak_mastery'] = 1;
  if (challenges.noTrade) state.race['no_trade'] = 1;
  if (challenges.noCraft) state.race['no_craft'] = 1;
  if (challenges.noCrispr) state.race['no_crispr'] = 1;
  for (const flag of SPECIAL_CHALLENGE_FLAGS) {
    if (challenges[flag]) state.race[SPECIAL_CHALLENGE_RACE_FLAG[flag]] = flag === 'orbitDecay' ? 5000 : 1;
  }
}

export function resolveChallengeStartSpecies(
  speciesId: string,
  challenges?: ChallengeStartOptions,
): string {
  if (challenges?.mode === 'warlord') return 'hellspawn';
  if (challenges?.mode === 'junker') return 'junker';
  if (challenges?.mode === 'standard' || !challenges?.mode) {
    if (challenges?.ultraSludge) return 'ultra_sludge';
    if (challenges?.sludge) return 'sludge';
  }
  return speciesId;
}

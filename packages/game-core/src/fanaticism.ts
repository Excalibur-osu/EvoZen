import type { GameState } from '@evozen/shared-types';
import { unlockAchievement } from './achievements';
import { loadCustomRace } from './custom-race';
import { RACES, upgradeTraitRank, type RaceId } from './races';
import { TRAITS } from './trait-data';

const MINOR_TRAITS = Object.entries(TRAITS)
  .filter(([, trait]) => trait.type === 'minor')
  .map(([id]) => id);

const WARLORD_FANATIC_TRAITS: Record<string, string> = {
  kindling_kindred: 'iron_wood',
  spiritual: 'unified',
  blood_thirst: 'apex_predator',
};

function awardRandomMinorTrait(state: GameState, ranks: number, rng: () => number): string | null {
  let pool = MINOR_TRAITS.filter((trait) => !state.race[trait]);
  if (pool.length === 0) pool = [...MINOR_TRAITS];
  if (pool.length === 0) return null;

  const roll = Math.min(0.9999999999999999, Math.max(0, rng()));
  const trait = pool[Math.floor(roll * pool.length)];
  state.race[trait] = Number(state.race[trait] ?? 0) + ranks;
  return trait;
}

function getFanaticTrait(state: GameState, godId: string): string | null {
  if (godId === 'custom' || godId === 'hybrid') {
    return loadCustomRace(state, godId === 'hybrid')?.fanaticism ?? null;
  }
  return RACES[godId as RaceId]?.fanaticism ?? null;
}

function addAbsorbedRace(state: GameState, godId: string): void {
  const absorbed = Array.isArray(state.race['absorbed'])
    ? state.race['absorbed'] as string[]
    : [];
  if (!absorbed.includes(godId)) absorbed.push(godId);
  state.race['absorbed'] = absorbed;
}

/** Apply the primary trait inherited from a previous deity at the research action boundary. */
export function applyFanaticism(
  state: GameState,
  godId: string | undefined,
  rng: () => number = Math.random,
): string | null {
  if (!godId || godId === 'none') return null;

  const warlord = Boolean(state.race['warlord']);
  let trait = getFanaticTrait(state, godId);
  let appliedTrait: string | null;

  if (warlord && (godId === 'custom' || godId === 'hybrid' || godId === 'nano')) {
    appliedTrait = awardRandomMinorTrait(state, 5, rng);
  } else if (!trait || trait === 'none' || (trait === 'smart' && state.race['dumb'])) {
    appliedTrait = awardRandomMinorTrait(state, 5, rng);
  } else {
    if (warlord) trait = WARLORD_FANATIC_TRAITS[trait] ?? trait;

    const currentRank = Number(state.race[trait] ?? 0);
    if (currentRank > 0) {
      const nextRank = upgradeTraitRank(currentRank);
      if (nextRank === currentRank) {
        appliedTrait = awardRandomMinorTrait(state, 5, rng);
      } else {
        state.race[trait] = nextRank;
        appliedTrait = trait;
      }
    } else {
      state.race[trait] = warlord ? 0.5 : 1;
      appliedTrait = trait;
    }
  }

  if (warlord) addAbsorbedRace(state, godId);

  const sourceTrait = getFanaticTrait(state, godId);
  if (sourceTrait === 'infectious' && state.race.species === 'human') {
    unlockAchievement(state, 'infested');
  }
  if (sourceTrait === 'blood_thirst' && state.race.species === 'entish') {
    unlockAchievement(state, 'madagascar_tree');
  }

  return appliedTrait;
}

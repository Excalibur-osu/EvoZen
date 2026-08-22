import type { GameState } from '@evozen/shared-types';
import { getAchievementLevel, unlockAchievement } from './achievements';
import { getElementalBonus, getElementalType } from './complex-traits';
import { hasPlanetTrait, toxicVars } from './planet-traits';
import { TRAITS } from './trait-data';
import { getTraitVar } from './trait-ranks';

export type GeneSequenceLabSource =
  | 'biolab'
  | 'exotic_lab'
  | 'twisted_lab'
  | 'infectious_disease_lab'
  | 'none';

export interface GeneSequenceLabOptions {
  activeBiolabs?: number;
  exoticLabsSupported?: number;
  activeTwistedLabs?: number;
  infectiousDiseaseLabsSupported?: number;
}

export interface GeneSequenceLabResult {
  labs: number;
  baseLabs: number;
  source: GeneSequenceLabSource;
  loneSurvivorBonus: number;
  toxicBonus: number;
  frostMultiplier: number;
}

export interface GeneSequenceState {
  max: number;
  progress: number;
  time: number;
  on: boolean;
  boost: boolean;
  auto: boolean;
  labs: number;
  source?: GeneSequenceLabSource;
  loneSurvivorBonus?: number;
}

export interface GeneSequenceTickResult {
  completed: 'genome' | 'mutation' | null;
  trait?: string;
  traitName?: string;
  genes?: number;
  prestige?: number;
  prestigeType?: 'Plasmid' | 'AntiPlasmid';
  knowledgeCost: number;
}

const MINOR_TRAITS = Object.entries(TRAITS)
  .filter(([, trait]) => trait.type === 'minor')
  .map(([id]) => id);

function createGeneSequenceState(state: GameState): GeneSequenceState {
  return {
    max: 50_000,
    progress: 0,
    time: 50_000,
    on: !state.race['cataclysm'] && !state.race['orbit_decayed'],
    boost: false,
    auto: false,
    labs: 0,
    source: 'none',
    loneSurvivorBonus: 0,
  };
}

export function getGeneSequenceState(state: GameState): GeneSequenceState | null {
  if ((state.tech['genetics'] ?? 0) < 2) return null;
  const arpa = (state.arpa ??= { m_type: 'Obelisk' }) as Record<string, unknown>;
  arpa['m_type'] ??= 'Obelisk';
  if (!arpa['sequence']) arpa['sequence'] = createGeneSequenceState(state);
  return arpa['sequence'] as GeneSequenceState;
}

export function setGeneSequenceActive(state: GameState, active: boolean): boolean {
  const sequence = getGeneSequenceState(state);
  if (!sequence) return false;
  sequence.on = active;
  return true;
}

function nextSequenceMaximum(state: GameState, mutation: number): number {
  let maximum = 50_000 * (1 + mutation ** 2);
  const adaptableRank = Number(state.race['adaptable'] ?? 0);
  if (adaptableRank > 0) {
    maximum = Math.floor(maximum * (1 - getTraitVar('adaptable', 0, adaptableRank) / 100));
  }
  return maximum;
}

function addStat(state: GameState, id: 'plasmid' | 'antiplasmid', amount: number): void {
  const stats = state.stats as Record<string, unknown>;
  stats[id] = Number(stats[id] ?? 0) + amount;
}

function highPopAdjust(state: GameState, value: number): number {
  const rank = Number(state.race['high_pop'] ?? 0);
  return rank > 0 ? value * getTraitVar('high_pop', 1, rank) / 100 : value;
}

/** 对标 legacy arpa.js sequenceLabs() 的路线选择和实验室修饰。 */
export function resolveGeneSequenceLabs(
  state: GameState,
  options: GeneSequenceLabOptions = {},
): GeneSequenceLabResult {
  let source: GeneSequenceLabSource;
  let baseLabs: number;

  if (state.tech['isolation']) {
    source = 'infectious_disease_lab';
    baseLabs = Math.max(0, options.infectiousDiseaseLabsSupported ?? 0) * 5;
  } else if (state.race['cataclysm'] || state.race['orbit_decayed']) {
    source = 'exotic_lab';
    baseLabs = Math.max(0, options.exoticLabsSupported ?? 0);
  } else if (state.race['warlord']) {
    source = 'twisted_lab';
    baseLabs = Math.max(0, options.activeTwistedLabs ?? 0);
  } else {
    source = 'biolab';
    baseLabs = Math.max(0, options.activeBiolabs ?? 0);
  }

  const loneSurvivorBonus = state.race['lone_survivor'] ? 2 : 0;
  let adjustedLabs = baseLabs + loneSurvivorBonus;
  const toxicBonus = adjustedLabs > 0 && hasPlanetTrait(state, 'toxic') ? toxicVars(state)[0] : 0;
  adjustedLabs += toxicBonus;

  let frostMultiplier = 1;
  if (adjustedLabs > 0 && getElementalType(state) === 'frost') {
    const population = state.resource[state.race.species]?.amount ?? 0;
    const bioscienceRate = getElementalBonus(state, 'bioscience') - 1;
    frostMultiplier += highPopAdjust(state, population * bioscienceRate / 100);
    adjustedLabs *= frostMultiplier;
  }

  return {
    labs: Math.max(0, Math.round(adjustedLabs)),
    baseLabs,
    source,
    loneSurvivorBonus,
    toxicBonus,
    frostMultiplier,
  };
}

export const GENE_SEQUENCE_SOURCE_NAMES: Record<GeneSequenceLabSource, string> = {
  biolab: '生物实验室',
  exotic_lab: '异星实验室',
  twisted_lab: '扭曲实验室',
  infectious_disease_lab: '传染病实验室',
  none: '有效实验室',
};

export function getGeneSequenceLabLabel(sequence: GeneSequenceState): string {
  const source = GENE_SEQUENCE_SOURCE_NAMES[sequence.source ?? 'none'];
  return (sequence.loneSurvivorBonus ?? 0) > 0 ? `${source} + 孤独幸存者` : source;
}

function awardMinorTrait(state: GameState, rng: () => number): string {
  let pool = MINOR_TRAITS.filter((trait) => !state.race[trait]);
  if (pool.length === 0) pool = [...MINOR_TRAITS];
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, rng()) * pool.length));
  const trait = pool[index];
  state.race[trait] = Number(state.race[trait] ?? 0) + 1;
  return trait;
}

/** 对标 legacy main.js 的基因组测序/基因治疗循环。 */
export function geneSequenceTick(
  state: GameState,
  labOptions: GeneSequenceLabOptions | number,
  timeMultiplier: number,
  rng: () => number = Math.random,
): GeneSequenceTickResult {
  const result: GeneSequenceTickResult = { completed: null, knowledgeCost: 0 };
  const sequence = getGeneSequenceState(state);
  if (!sequence) return result;

  const options = typeof labOptions === 'number' ? { activeBiolabs: labOptions } : labOptions;
  const labResult = resolveGeneSequenceLabs(state, options);
  sequence.labs = labResult.labs;
  sequence.source = labResult.source;
  sequence.loneSurvivorBonus = labResult.loneSurvivorBonus;
  if (!sequence.on) return result;
  if (sequence.labs <= 0 || sequence.time <= 0) return result;

  const mutation = Number(state.race['mutation'] ?? 0);
  const costRate = (50 + mutation * 10) * (sequence.boost ? 4 : 1);
  const knowledgeCost = costRate * timeMultiplier;
  const knowledge = state.resource['Knowledge'];
  if (!knowledge || knowledge.amount < knowledgeCost) return result;

  knowledge.amount -= knowledgeCost;
  result.knowledgeCost = knowledgeCost;
  const progress = sequence.labs * (sequence.boost ? 2 : 1) * timeMultiplier;
  sequence.time = Math.max(0, sequence.time - progress);
  sequence.progress = sequence.max - sequence.time;
  if (sequence.time > 0) return result;

  sequence.max = nextSequenceMaximum(state, mutation);
  sequence.progress = 0;
  sequence.time = sequence.max;

  if ((state.tech['genetics'] ?? 0) === 2) {
    state.tech['genetics'] = 3;
    result.completed = 'genome';
    return result;
  }

  const nextMutation = mutation + 1;
  state.race['mutation'] = nextMutation;
  const trait = awardMinorTrait(state, rng);
  const synthesis = Number(state.genes['synthesis'] ?? 0);
  let genes = 2 ** (nextMutation - 1) * (1 + synthesis);
  const creator = getAchievementLevel(state, 'creator');
  if (creator > 0) genes = Math.round(genes * (1 + creator * 0.5));

  const geneResource = state.resource['Genes'];
  if (geneResource) {
    geneResource.amount += genes;
    geneResource.display = true;
  }

  let prestige = state.genes['plasma'] ? nextMutation : 1;
  if (state.genes['plasma'] && prestige > 3) {
    prestige = state.genes['plasma'] >= 2 ? Math.min(5, prestige) : 3;
  }
  const antimatter = state.race.universe === 'antimatter';
  const prestigeType = antimatter ? 'AntiPlasmid' : 'Plasmid';
  const prestigeResource = state.prestige[prestigeType] ??= { count: 0 };
  prestigeResource.count += prestige;
  addStat(state, antimatter ? 'antiplasmid' : 'plasmid', prestige);
  if (antimatter) unlockAchievement(state, 'cross');

  result.completed = 'mutation';
  result.trait = trait;
  result.traitName = TRAITS[trait]?.name ?? GENE_MINOR_TRAIT_NAMES[trait] ?? trait;
  result.genes = genes;
  result.prestige = prestige;
  result.prestigeType = prestigeType;
  return result;
}

export const GENE_MINOR_TRAIT_NAMES: Record<string, string> = {
  tactical: '战术',
  analytical: '分析',
  promiscuous: '繁殖',
  resilient: '坚韧',
  cunning: '狡黠',
  hardy: '耐劳',
  ambidextrous: '双手并用',
  industrious: '勤勉',
  content: '满足',
  fibroblast: '愈合',
  metallurgist: '冶金',
  gambler: '赌徒',
  persuasive: '说服',
};

import type { GameState } from '@evozen/shared-types';
import { getTempleMultiplier } from './government';
import { govActive } from './governor';
import { getTraitVar } from './trait-ranks';

export interface PlasmidProductionBonus {
  combined: number;
  standard: number;
  anti: number;
}

function raceRank(state: GameState, traitId: string): number {
  const value = state.race[traitId];
  return typeof value === 'number' && value > 0 ? value : value ? 1 : 0;
}

function highPopAdjust(state: GameState, value: number): number {
  const rank = raceRank(state, 'high_pop');
  return rank ? value * getTraitVar('high_pop', 1, rank) / 100 : value;
}

function workerScale(state: GameState, workers: number, job: 'professor' | 'priest'): number {
  let scaled = Math.max(0, workers);
  if (job === 'professor') scaled *= 1 + govActive(state, 'teacher', 1) / 100;
  if (state.race['lone_survivor']) scaled *= job === 'professor' ? 125 : 45;
  return scaled;
}

function faithTempleCount(state: GameState): number {
  let count = Math.max(0, (state.city['temple'] as { count?: number } | undefined)?.count ?? 0);
  const canAddVirtualTemple = !state.race['cataclysm']
    && !state.race['orbit_decayed']
    && !state.race['lone_survivor']
    && !state.race['warlord'];
  if (canAddVirtualTemple) {
    const wishStats = state.race['wishStats'] as { temple?: boolean } | undefined;
    if (state.race['wish'] && wishStats?.temple) count += 1;
    if ((state.genes['ancients'] ?? 0) >= 6) count += 1;
  }
  return count;
}

/** 对标 legacy templePlasmidBonus()，不包含当前项目尚无状态来源的 seraph fathom。 */
export function getTemplePlasmidBonus(state: GameState): number {
  if (state.race['no_plasmid'] || state.race.universe === 'antimatter') return 0;
  const temples = faithTempleCount(state);
  if (temples <= 0) return 0;

  let perTemple = (state.tech['anthropology'] ?? 0) >= 1 ? 0.08 : 0.05;
  if ((state.tech['fanaticism'] ?? 0) >= 2) {
    const professors = (state.civic['professor'] as { workers?: number } | undefined)?.workers ?? 0;
    perTemple += workerScale(state, professors, 'professor') * highPopAdjust(state, 0.002);
  }
  const ancients = state.genes['ancients'] ?? 0;
  const priest = state.civic['priest'] as { workers?: number; display?: boolean } | undefined;
  if (ancients >= 2 && priest?.display) {
    const priestRate = ancients >= 5 ? 0.0015 : ancients >= 3 ? 0.00125 : 0.001;
    perTemple += highPopAdjust(state, priestRate) * workerScale(state, priest.workers ?? 0, 'priest');
  }

  const spiritualRank = raceRank(state, 'spiritual');
  if (spiritualRank) perTemple *= 1 + getTraitVar('spiritual', 0, spiritualRank) / 100;
  const blasphemousRank = raceRank(state, 'blasphemous');
  if (blasphemousRank) perTemple *= 1 - getTraitVar('blasphemous', 0, blasphemousRank) / 100;
  perTemple *= getTempleMultiplier(state);
  const oozeRank = raceRank(state, 'ooze');
  if (oozeRank) perTemple *= 1 - getTraitVar('ooze', 1, oozeRank) / 100;
  if (state.race['orbit_decayed'] && state.race['truepath']) perTemple *= 0.1;
  return temples * perTemple;
}

function decayedCount(state: GameState, count: number): number {
  const decayedAt = Number(state.race['decayed']) || 0;
  if (!decayedAt) return count;
  const fortify = Math.max(0, Number(state.race['gene_fortify']) || 0);
  return count - Math.round(((state.stats.days ?? 0) - decayedAt) / (300 + fortify * 6));
}

function logarithmicPlasmidBonus(count: number, phage: number): number {
  const cap = 250 + Math.max(0, phage);
  if (count > cap) {
    const capped = Number((Math.log(cap + 50) - 3.91202).toFixed(5)) / 2.888;
    return capped + Math.log2(count + 1 - cap) / 250;
  }
  if (count < 0) return 0;
  return Number((Math.log(count + 50) - 3.91202).toFixed(5)) / 2.888;
}

/** 对标 legacy plasmidBonus()，返回最终组合值及 standard/anti 分量。 */
export function getPlasmidProductionBonus(state: GameState): PlasmidProductionBonus {
  const universe = state.race.universe ?? 'standard';
  const bleed = Math.max(0, state.genes['bleed'] ?? 0);
  const phage = state.prestige.Phage?.count ?? 0;
  let standard = 0;
  let anti = 0;
  const poweredOutpostBoost = Boolean(
    state.tech['outpost_boost']
    && state.race['truepath']
    && (state.city.power?.activeConsumers?.['alien_outpost'] ?? 0) > 0,
  );

  if (universe !== 'antimatter' || bleed > 0) {
    const wishStats = state.race['wishStats'] as { plas?: number } | undefined;
    const activeCap = Math.max(0, Number(state.race['p_mutation']) || 0)
      + (state.race['wish'] ? Math.max(0, wishStats?.plas ?? 0) : 0);
    let plasmids = state.race['no_plasmid']
      ? Math.min(activeCap, state.prestige.Plasmid.count)
      : state.prestige.Plasmid.count;
    if (universe === 'antimatter' && bleed > 0) plasmids *= 0.025;
    plasmids = decayedCount(state, plasmids);
    standard = logarithmicPlasmidBonus(plasmids, phage);
    if (poweredOutpostBoost) standard *= 2;
    standard *= 1 + getTemplePlasmidBonus(state);
  }

  if (universe === 'antimatter' || bleed >= 2) {
    let antiPlasmids = state.prestige.AntiPlasmid?.count ?? 0;
    if (universe !== 'antimatter' && bleed >= 2) antiPlasmids *= 0.25;
    antiPlasmids = decayedCount(state, antiPlasmids);
    anti = logarithmicPlasmidBonus(antiPlasmids, phage) / 3;
    if (poweredOutpostBoost) anti *= 2;
  }

  if (state.race['nerfed']) {
    const divisor = universe === 'antimatter' ? 2 : 5;
    standard /= divisor;
    anti /= divisor;
  }

  return {
    combined: (1 + standard) * (1 + anti) - 1,
    standard,
    anti,
  };
}

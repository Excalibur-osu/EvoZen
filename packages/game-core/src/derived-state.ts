import type { GameState } from '@evozen/shared-types';
import { BASE_JOBS } from './jobs';
import {
  getStorageBonus,
  getStorageMultiplier,
  getTotalAssignedContainers,
  getTotalAssignedCrates,
  SHED_BASE_VALUES,
} from './storage';
import { getLibraryKnowledgeCapMultiplier } from './traits';
import { getMaxTradeRoutes } from './trade';
import { getBankVault, getCasinoVault } from './commerce';
import { hasPlanetTrait, magneticVars, permafrostVars } from './planet-traits';

export function applyDerivedStateInPlace(state: GameState): void {
  if (state.race.species === 'protoplasm') return;

  const s = state;
  const species = s.race.species;

  const getStructCount = (id: string): number =>
    (s.city[id] as { count: number } | undefined)?.count ?? 0;

  const setJobMax = (jobId: string, max: number): void => {
    const job = s.civic[jobId] as { max: number } | undefined;
    if (job) job.max = max;
  };

  let popCap = 0;
  const basicHousing = getStructCount('basic_housing');
  const cottages = getStructCount('cottage');
  const farms = getStructCount('farm');
  popCap += basicHousing;
  popCap += cottages * 2;
  if ((s.tech['farm'] ?? 0) >= 1) {
    popCap += farms;
  }
  if (s.resource[species]) {
    s.resource[species].max = popCap;
  }

  let foodMax = 250;
  const silos = getStructCount('silo');
  const smokehouses = getStructCount('smokehouse');
  foodMax += farms * 50;
  foodMax += silos * 500;
  foodMax += smokehouses * 100;
  s.resource['Food'].max = foodMax;

  const sheds = getStructCount('shed');
  const storageMult = getStorageMultiplier(s);

  let lumberMax = 200;
  const lumberYards = getStructCount('lumber_yard');
  const sawmills = getStructCount('sawmill');
  lumberMax += lumberYards * 100;
  lumberMax += sawmills * 200;
  lumberMax += Math.round(sheds * (SHED_BASE_VALUES['Lumber'] ?? 0) * storageMult);
  lumberMax += getStorageBonus(s, 'Lumber');
  s.resource['Lumber'].max = lumberMax;

  let stoneMax = 200;
  const quarries = getStructCount('rock_quarry');
  stoneMax += quarries * 100;
  stoneMax += Math.round(sheds * (SHED_BASE_VALUES['Stone'] ?? 0) * storageMult);
  stoneMax += getStorageBonus(s, 'Stone');
  s.resource['Stone'].max = stoneMax;

  let copperMax = 100;
  copperMax += Math.round(sheds * (SHED_BASE_VALUES['Copper'] ?? 0) * storageMult);
  copperMax += getStorageBonus(s, 'Copper');
  s.resource['Copper'].max = copperMax;

  let ironMax = 100;
  ironMax += Math.round(sheds * (SHED_BASE_VALUES['Iron'] ?? 0) * storageMult);
  ironMax += getStorageBonus(s, 'Iron');
  s.resource['Iron'].max = ironMax;

  let cementMax = 100;
  cementMax += Math.round(sheds * (SHED_BASE_VALUES['Cement'] ?? 0) * storageMult);
  cementMax += getStorageBonus(s, 'Cement');
  s.resource['Cement'].max = cementMax;

  let coalMax = 50;
  coalMax += Math.round(sheds * (SHED_BASE_VALUES['Coal'] ?? 0) * storageMult);
  coalMax += getStorageBonus(s, 'Coal');
  s.resource['Coal'].max = coalMax;

  let fursMax = 100;
  fursMax += Math.round(sheds * (SHED_BASE_VALUES['Furs'] ?? 0) * storageMult);
  fursMax += getStorageBonus(s, 'Furs');
  s.resource['Furs'].max = fursMax;

  let steelMax = 50;
  if ((s.tech['storage'] ?? 0) >= 3) {
    steelMax += Math.round(sheds * (SHED_BASE_VALUES['Steel'] ?? 0) * storageMult);
  }
  steelMax += getStorageBonus(s, 'Steel');
  s.resource['Steel'].max = steelMax;

  let aluminiumMax = 50;
  aluminiumMax += Math.round(sheds * (SHED_BASE_VALUES['Aluminium'] ?? 0) * storageMult);
  aluminiumMax += getStorageBonus(s, 'Aluminium');
  s.resource['Aluminium'].max = aluminiumMax;

  const oilWells = getStructCount('oil_well');
  const oilDepots = getStructCount('oil_depot');
  let oilMax = 0;
  oilMax += oilWells * 500;
  oilMax += oilDepots * 1000;
  s.resource['Oil'].max = oilMax;
  if ((s.tech['oil'] ?? 0) >= 1) {
    s.resource['Oil'].display = true;
  }

  let titaniumMax = 50;
  if ((s.tech['storage'] ?? 0) >= 4) {
    titaniumMax += Math.round(sheds * (SHED_BASE_VALUES['Titanium'] ?? 0) * storageMult);
  }
  titaniumMax += getStorageBonus(s, 'Titanium');
  s.resource['Titanium'].max = titaniumMax;
  if ((s.tech['high_tech'] ?? 0) >= 3) {
    s.resource['Titanium'].display = true;
  }
  if ((s.tech['uranium'] ?? 0) >= 1) {
    s.resource['Uranium'].display = true;
  }

  const hunterWorkers = (s.civic['hunter'] as { workers?: number } | undefined)?.workers ?? 0;
  if (hunterWorkers > 0 || getStructCount('garrison') > 0) {
    s.resource['Furs'].display = true;
  }

  let knowledgeMax = 100;
  const libraries = getStructCount('library');
  const universities = getStructCount('university');
  const wardenclyffes = getStructCount('wardenclyffe');
  const wardenclyffeOn = Math.min(
    wardenclyffes,
    (s.city['wardenclyffe'] as { on?: number } | undefined)?.on ?? wardenclyffes,
  );
  const scientists = (s.civic['scientist'] as { workers?: number } | undefined)?.workers ?? 0;
  const universityBase = (s.tech['science'] ?? 0) >= 8 ? 700 : 500;
  const universityMult = (s.tech['science'] ?? 0) >= 4 ? 1 + libraries * 0.02 : 1;
  const journalMult = (s.tech['science'] ?? 0) >= 5 ? 1 + scientists * 0.12 : 1;
  let libraryShelving = 125 * getLibraryKnowledgeCapMultiplier(s);
  if ((s.tech['science'] ?? 0) >= 8) {
    libraryShelving *= 1.4;
  }
  libraryShelving *= journalMult;
  if ((s.tech['anthropology'] ?? 0) >= 2) {
    libraryShelving *= 1 + getStructCount('temple') * 0.05;
  }
  knowledgeMax += Math.round(libraries * libraryShelving);
  // permafrost 行星特性：大学知识基础 +100
  // 对标 legacy actions.js L3668: base += permafrost.vars()[1]
  const universityPlanetBonus = hasPlanetTrait(s, 'permafrost') ? permafrostVars()[1] : 0;
  knowledgeMax += universities * (universityBase + universityPlanetBonus) * universityMult;
  // magnetic 行星特性：沃登克里夫知识上限 +100/座
  // 对标 legacy actions.js L3867: gain += magnetic.vars()[1]
  const wardenclyffePlanetBonus = hasPlanetTrait(s, 'magnetic') ? magneticVars()[1] : 0;
  const wardenclyffeBase = 1000 + wardenclyffePlanetBonus;
  const wardenclyffePoweredBonus = (s.tech['science'] ?? 0) >= 7 ? 1500 : 1000;
  knowledgeMax += wardenclyffes * wardenclyffeBase;
  knowledgeMax += wardenclyffeOn * wardenclyffePoweredBonus;
  s.resource['Knowledge'].max = knowledgeMax;

  let moneyMax = 1000;
  const banks = getStructCount('bank');
  const casinos = getStructCount('casino');
  moneyMax += banks * getBankVault(s);
  moneyMax += casinos * getCasinoVault(s);
  s.resource['Money'].max = moneyMax;

  setJobMax('farmer', farms);
  setJobMax('lumberjack', -1);
  setJobMax('quarry_worker', -1);
  setJobMax('miner', getStructCount('mine'));
  setJobMax('coal_miner', getStructCount('coal_mine'));
  setJobMax('cement_worker', getStructCount('cement_plant') * 2);
  setJobMax('banker', banks);
  setJobMax('professor', universities);
  setJobMax('scientist', wardenclyffes);

  if ((s.tech['primitive'] ?? 0) >= 1) {
    s.resource['Food'].display = true;
  }
  if ((s.tech['primitive'] ?? 0) >= 2) {
    s.resource['Stone'].display = true;
  }
  if ((s.tech['mining'] ?? 0) >= 3) {
    s.resource['Iron'].display = true;
  }
  if ((s.tech['mining'] ?? 0) >= 4) {
    s.resource['Coal'].display = true;
  }
  if ((s.tech['cement'] ?? 0) >= 1) {
    s.resource['Cement'].display = true;
  }
  if ((s.tech['currency'] ?? 0) >= 1) {
    s.resource['Money'].display = true;
  }
  if ((s.tech['primitive'] ?? 0) >= 3) {
    s.resource['Knowledge'].display = true;
  }
  if ((s.tech['mining'] ?? 0) >= 2) {
    s.resource['Copper'].display = true;
  }
  if ((s.tech['smelting'] ?? 0) >= 2) {
    s.resource['Steel'].display = true;
  }
  if ((s.tech['alumina'] ?? 0) >= 1) {
    s.resource['Aluminium'].display = true;
  }

  const foundries = getStructCount('foundry');
  setJobMax('craftsman', foundries);

  const amphitheatres = getStructCount('amphitheatre');
  const casinoCount = getStructCount('casino');
  setJobMax('entertainer', amphitheatres + casinoCount);

  const temples = getStructCount('temple');
  setJobMax('priest', temples);

  // ── 岗位展示解锁 (early game UI sync) ──────────────────────────────
  const isHunterBase = s.race['carnivore'] || s.race['soul_eater'] || s.race['unfathomable'];
  const isForagerBase = s.race['forager'];

  if (s.civic['unemployed']) {
    (s.civic['unemployed'] as { display: boolean }).display = 
      !isHunterBase && !isForagerBase && !!(s.resource[species] && s.resource[species].amount > 0);
  }
  if ((s.tech['primitive'] ?? 0) >= 1) {
    if (s.civic['hunter']) {
      (s.civic['hunter'] as { display: boolean }).display = !!isHunterBase;
    }
  }
  if ((s.tech['agriculture'] ?? 0) >= 1) {
    if (s.civic['farmer']) (s.civic['farmer'] as { display: boolean }).display = true;
  }

  // ── 岗位 worker clamp ──────────────────────────────
  // 当建筑被拆除 → job.max 下降 → 可能 workers > max
  // 多余的工人必须退回到 unemployed，否则出现幽灵工人（无建筑却产出资源）
  const clampableJobs = [
    'farmer', 'miner', 'coal_miner', 'cement_worker',
    'banker', 'professor', 'scientist', 'craftsman',
    'entertainer', 'priest',
  ];
  const unemployed = s.civic['unemployed'] as { workers: number } | undefined;
  for (const jobId of clampableJobs) {
    const job = s.civic[jobId] as { workers: number; max: number } | undefined;
    if (!job || job.max < 0) continue; // max=-1 means unlimited
    if (job.workers > job.max) {
      const excess = job.workers - job.max;
      job.workers = job.max;
      if (unemployed) {
        unemployed.workers += excess;
      }
    }
  }

  const shrines = getStructCount('shrine');
  let faithMax = 100;
  faithMax += shrines * 25;
  faithMax += temples * 50;
  if (s.resource['Faith']) {
    s.resource['Faith'].max = faithMax;
    if ((s.tech['theology'] ?? 0) >= 1) {
      s.resource['Faith'].display = true;
    }
  }

  const storageYards = getStructCount('storage_yard');
  const warehouses = getStructCount('warehouse');
  const wharves = getStructCount('wharf');
  const crateCapacity = (s.tech['container'] ?? 0) >= 3 ? 20 : 10;
  const containerCapacity = (s.tech['steel_container'] ?? 0) >= 2 ? 20 : 10;
  if (s.resource['Crates']) {
    s.resource['Crates'].max = Math.max(0, storageYards * crateCapacity + wharves * 10 - getTotalAssignedCrates(s));
    if (s.resource['Crates'].amount > s.resource['Crates'].max) {
      s.resource['Crates'].amount = s.resource['Crates'].max;
    }
  }
  if (s.resource['Containers']) {
    s.resource['Containers'].max = Math.max(0, warehouses * containerCapacity + wharves * 10 - getTotalAssignedContainers(s));
    if (s.resource['Containers'].amount > s.resource['Containers'].max) {
      s.resource['Containers'].amount = s.resource['Containers'].max;
    }
  }

  if ((s.tech['container'] ?? 0) >= 1) {
    s.resource['Crates'].display = true;
    s.settings.showStorage = true;
  }
  if ((s.tech['steel_container'] ?? 0) >= 1) {
    s.resource['Containers'].display = true;
  }

  if ((s.tech['foundry'] ?? 0) >= 1) {
    s.resource['Plywood'].display = true;
    s.resource['Brick'].display = true;
    s.resource['Wrought_Iron'].display = true;
    if ((s.tech['alumina'] ?? 0) >= 1) {
      s.resource['Sheet_Metal'].display = true;
    }

    if (!s.city['foundry']) {
      (s.city as Record<string, unknown>)['foundry'] = {
        count: 0, on: 0, Plywood: 0, Brick: 0, Wrought_Iron: 0, Sheet_Metal: 0,
      };
    } else if ((s.city['foundry'] as { Sheet_Metal?: number }).Sheet_Metal === undefined) {
      (s.city['foundry'] as { Sheet_Metal?: number }).Sheet_Metal = 0;
    }
  }

  if ((s.tech['trade'] ?? 0) >= 1) {
    s.settings.showMarket = true;
    const maxRoutes = getMaxTradeRoutes(s);
    if (!(s.city as { trade_routes?: unknown }).trade_routes) {
      (s.city as { trade_routes?: Array<{ resource: string; action: string; qty: number }> }).trade_routes = [];
    }

    const routes =
      (s.city as { trade_routes?: Array<{ resource: string; action: string; qty: number }> }).trade_routes ?? [];

    while (routes.length < maxRoutes) {
      routes.push({ resource: 'Food', action: 'none', qty: 1 });
    }
    if (routes.length > maxRoutes) {
      routes.length = maxRoutes;
    }
  }

  const garrisons = getStructCount('garrison');
  const soldiersPerGarrison = (s.tech['military'] ?? 0) >= 5 ? 3 : 2;
  s.civic.garrison.max = garrisons * soldiersPerGarrison;
  if (s.civic.garrison.workers > s.civic.garrison.max) {
    s.civic.garrison.workers = s.civic.garrison.max;
  }
  if (s.civic.garrison.wounded > s.civic.garrison.workers) {
    s.civic.garrison.wounded = s.civic.garrison.workers;
  }
  const availableRaiders = Math.max(0, s.civic.garrison.workers - s.civic.garrison.crew);
  if (s.civic.garrison.raid > availableRaiders) {
    s.civic.garrison.raid = availableRaiders;
  }
  if (garrisons > 0) {
    s.civic.garrison.display = true;
    s.settings.showMil = true;
  }

  for (const job of BASE_JOBS) {
    if (job.id === 'unemployed' || job.id === 'hunter') continue;
    if (!job.requiredTech) continue;

    let unlocked = true;
    for (const [techId, lvl] of Object.entries(job.requiredTech)) {
      if ((s.tech[techId] ?? 0) < lvl) {
        unlocked = false;
        break;
      }
    }

    const civicJob = s.civic[job.id] as { display?: boolean } | undefined;
    if (civicJob && unlocked) {
      civicJob.display = true;
    }
  }

  const hasAnyJob = BASE_JOBS.some((job) => {
    if (job.id === 'unemployed' || job.id === 'hunter') return false;
    return (s.civic[job.id] as { display?: boolean } | undefined)?.display === true;
  });
  if (hasAnyJob) {
    s.settings.showCivic = true;
  }

  const visibleResCount = Object.values(s.resource).filter((res) => res.display).length;
  if (visibleResCount >= 6) {
    s.settings.showResources = true;
  }
}

export function applyDerivedState(state: GameState): GameState {
  const next = JSON.parse(JSON.stringify(state)) as GameState;
  applyDerivedStateInPlace(next);
  return next;
}

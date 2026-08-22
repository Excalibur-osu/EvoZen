import type { GameState, TradeRoute } from '@evozen/shared-types';
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
import { getBankVault, getCasinoVault, getInterstellarExchangeVault } from './commerce';
import { getAchievementLevel } from './achievements';
import { hasPlanetTrait, magneticVars, permafrostVars } from './planet-traits';
import { getTraitVar } from './trait-ranks';
import { getTruepathFleetCrew } from './truepath-ships';
import {
  getPitMinerCapacity,
  getTaucetiAlienOutpostProfessorCapacity,
  getTaucetiColonyCitizens,
  getTaucetiFactoryCementWorkerCapacity,
  getTaucetiFactoryCraftsmanCapacity,
  resolveTaucetiSupport,
} from './tauceti';
import { applyPillarStorageBonus, getPillarProductionMultiplier } from './pillars';
import {
  getSatelliteKnowledgeCapBonus,
  getSatelliteWardenclyffeMultiplier,
  getPropellantDepotOilCapBonus,
  getPropellantDepotHeliumCapBonus,
  getMoonBaseIridiumCapBonus,
  getHeliumMineHeliumCapBonus,
  getGarageCount,
  getGarageStorageBonus,
  GARAGE_CONTAINERS_PER_BUILDING,
  getGasStorageOilCapBonus,
  getGasStorageHeliumCapBonus,
  getGasStorageUraniumCapBonus,
  getEleriumContainCapBonus,
} from './space';
import {
  getTaucetiRepositoryContainerCapacityBonus,
  getTaucetiRepositoryResources,
  getTaucetiRepositoryStorageBonus,
  TRUEPATH_STOREHOUSE_RESOURCES,
  getTruepathStorehouseStorageBonus,
} from './truepath-storage';

function getStorageYardCrateCapacity(state: GameState): number {
  let capacity = (state.tech['container'] ?? 0) >= 3 ? 20 : 10;
  if (getAchievementLevel(state, 'pathfinder') >= 1) capacity += 10;
  if ((state.tech['world_control'] ?? 0) >= 1) capacity += 10;
  if ((state.tech['particles'] ?? 0) >= 2) capacity *= 2;
  return capacity;
}

function getWarehouseContainerCapacity(state: GameState): number {
  let capacity = (state.tech['steel_container'] ?? 0) >= 2 ? 20 : 10;
  if (getAchievementLevel(state, 'pathfinder') >= 2) capacity += 10;
  if ((state.tech['world_control'] ?? 0) >= 1) capacity += 10;
  if ((state.tech['particles'] ?? 0) >= 2) capacity *= 2;
  return capacity;
}

function getWharfStorageCapacity(state: GameState): number {
  let capacity = (state.tech['world_control'] ?? 0) >= 1 ? 15 : 10;
  if ((state.tech['particles'] ?? 0) >= 2) capacity *= 2;
  return capacity;
}

export function applyDerivedStateInPlace(state: GameState): void {
  if (state.race.species === 'protoplasm') return;

  const s = state;
  const species = s.race.species;
  const spatialStorage = (value: number): number => applyPillarStorageBonus(s, value);

  // 自动 display：已有数量的资源标记 display=true。
  // 不根据 max 解锁，否则文明开局会把所有默认容量资源直接亮出来。
  for (const [id, res] of Object.entries(s.resource)) {
    if (res && !res.display && (res.amount ?? 0) > 0) {
      if (id !== 'RNA' && id !== 'DNA') {  // 进化阶段资源由 evolution 模块控制
        res.display = true;
      }
    }
  }

  const getStructCount = (id: string): number =>
    (s.city[id] as { count: number } | undefined)?.count ?? 0;
  const getSpaceCount = (id: string): number =>
    (s.space[id] as { count?: number } | undefined)?.count ?? 0;
  const getInterstellarCount = (id: string): number =>
    (s.interstellar[id] as { count?: number } | undefined)?.count ?? 0;
  const tauSupport = resolveTaucetiSupport(s, s.city.power?.activeConsumers ?? {});
  const supportedTauColonies = tauSupport.supportOn['colony'] ?? 0;
  const supportedMiningPits = tauSupport.supportOn['mining_pit'] ?? 0;

  const setJobMax = (jobId: string, max: number): void => {
    const job = s.civic[jobId] as { max: number } | undefined;
    if (job) job.max = max;
  };

  let popCap = 0;
  const basicHousing = getStructCount('basic_housing');
  const cottages = getStructCount('cottage');
  const apartments = getStructCount('apartment');
  const farms = getStructCount('farm');
  const lodges = getStructCount('lodge');
  popCap += basicHousing;
  popCap += cottages * 2;
  popCap += apartments * 4;
  popCap += lodges;
  popCap += supportedTauColonies * getTaucetiColonyCitizens(s);
  if ((s.tech['farm'] ?? 0) >= 1) {
    popCap += farms;
  }
  if (s.resource[species]) {
    s.resource[species].max = popCap;
  }

  let foodMax = 250;
  const silos = getStructCount('silo');
  const smokehouses = getStructCount('smokehouse');
  foodMax += farms * spatialStorage(50);
  foodMax += silos * spatialStorage(500);
  foodMax += smokehouses * spatialStorage(100);
  if (s.tech['isolation'] && s.race['artifical']) {
    const activeTauFarms = s.city.power?.activeConsumers?.['tau_farm'] ?? 0;
    foodMax += activeTauFarms * spatialStorage(350);
  }
  foodMax += getStorageBonus(s, 'Food');
  s.resource['Food'].max = foodMax;

  const sheds = getStructCount('shed');
  const storageMult = getStorageMultiplier(s);

  let lumberMax = 200;
  const lumberYards = getStructCount('lumber_yard');
  const sawmills = getStructCount('sawmill');
  lumberMax += lumberYards * spatialStorage(100);
  lumberMax += sawmills * spatialStorage(200);
  lumberMax += sheds * spatialStorage((SHED_BASE_VALUES['Lumber'] ?? 0) * storageMult);
  lumberMax += getStorageBonus(s, 'Lumber');
  s.resource['Lumber'].max = lumberMax;

  let stoneMax = 200;
  const quarries = getStructCount('rock_quarry');
  stoneMax += quarries * spatialStorage(100);
  stoneMax += sheds * spatialStorage((SHED_BASE_VALUES['Stone'] ?? 0) * storageMult);
  stoneMax += getStorageBonus(s, 'Stone');
  s.resource['Stone'].max = stoneMax;

  let copperMax = 100;
  copperMax += sheds * spatialStorage((SHED_BASE_VALUES['Copper'] ?? 0) * storageMult);
  copperMax += getStorageBonus(s, 'Copper');
  s.resource['Copper'].max = copperMax;

  let ironMax = 100;
  ironMax += sheds * spatialStorage((SHED_BASE_VALUES['Iron'] ?? 0) * storageMult);
  ironMax += getStorageBonus(s, 'Iron');
  s.resource['Iron'].max = ironMax;

  let cementMax = 100;
  cementMax += sheds * spatialStorage((SHED_BASE_VALUES['Cement'] ?? 0) * storageMult);
  cementMax += getStorageBonus(s, 'Cement');
  s.resource['Cement'].max = cementMax;

  let coalMax = 50;
  coalMax += sheds * spatialStorage((SHED_BASE_VALUES['Coal'] ?? 0) * storageMult);
  coalMax += getStorageBonus(s, 'Coal');
  s.resource['Coal'].max = coalMax;

  let fursMax = 100;
  fursMax += sheds * spatialStorage((SHED_BASE_VALUES['Furs'] ?? 0) * storageMult);
  fursMax += getStorageBonus(s, 'Furs');
  s.resource['Furs'].max = fursMax;

  let steelMax = 50;
  if ((s.tech['storage'] ?? 0) >= 3) {
    steelMax += sheds * spatialStorage((SHED_BASE_VALUES['Steel'] ?? 0) * storageMult);
  }
  steelMax += getStorageBonus(s, 'Steel');
  s.resource['Steel'].max = steelMax;

  let aluminiumMax = 50;
  aluminiumMax += sheds * spatialStorage((SHED_BASE_VALUES['Aluminium'] ?? 0) * storageMult);
  aluminiumMax += getStorageBonus(s, 'Aluminium');
  s.resource['Aluminium'].max = aluminiumMax;

  const oilWells = getStructCount('oil_well');
  const oilDepots = getStructCount('oil_depot');
  let oilMax = 0;
  oilMax += oilWells * spatialStorage(500);
  oilMax += oilDepots * spatialStorage(1000);
  // 对标 legacy space.js L159：推进剂储备站 Oil.max +1250/座
  oilMax += getPropellantDepotOilCapBonus(s);
  s.resource['Oil'].max = oilMax;
  if ((s.tech['oil'] ?? 0) >= 1) {
    s.resource['Oil'].display = true;
  }
  // 对标 legacy space.js L160-162 + L373：
  // 对标 legacy actions.js L3114-3122 + space.js L160-162 + L373：
  //   Helium_3.max = oil_depot * 400 (需 display) + propellant_depot * 1000 (需 display) + helium_mine * 100
  // derived-state 会被重复调用，必须直接赋值而非 +=。
  if (s.resource['Helium_3']) {
    const heliumMineBonus = getHeliumMineHeliumCapBonus(s);
    const oilDepotHeliumBonus = s.resource['Helium_3'].display ? oilDepots * spatialStorage(400) : 0;
    s.resource['Helium_3'].max = oilDepotHeliumBonus + getPropellantDepotHeliumCapBonus(s) + heliumMineBonus;
    // 建成首座 helium_mine 后解锁 Helium_3（legacy space.js L392）
    if (heliumMineBonus > 0) {
      s.resource['Helium_3'].display = true;
    }
  }

  // 对标 legacy 资源容量基线与 oil_depot 加成。
  if (s.resource['Uranium']) {
    s.resource['Uranium'].max = 10 + ((s.tech['uranium'] ?? 0) >= 2 ? oilDepots * spatialStorage(250) : 0);
  }

  // 对标 legacy space.js L262：moon_base 每座 Iridium.max +500（baseline 0）
  if (s.resource['Iridium']) {
    const iridiumBonus = getMoonBaseIridiumCapBonus(s);
    s.resource['Iridium'].max = iridiumBonus + getStorageBonus(s, 'Iridium');
    // 建成首座 moon_base 后解锁 Iridium（legacy space.js L344 同时在 iridium_mine 建造时触发；
    // 此处归一到 moon_base.max 写入后立即开启 display，简化链路）
    if (iridiumBonus > 0) {
      s.resource['Iridium'].display = true;
    }
  }
  if (s.resource['Mythril'] && getSpaceCount('iridium_mine') > 0) {
    s.resource['Mythril'].display = true;
  }

  // 对标 legacy main.js L9195-9209：gas_storage 容量上限
  if (s.resource['Oil']) {
    s.resource['Oil'].max += getGasStorageOilCapBonus(s);
  }
  if (s.resource['Helium_3']) {
    s.resource['Helium_3'].max += getGasStorageHeliumCapBonus(s);
  }
  if (s.resource['Uranium']) {
    s.resource['Uranium'].max += getGasStorageUraniumCapBonus(s);
  }

  // 对标 legacy main.js L9746-9749：elerium_contain 容量上限
  if (s.resource['Elerium']) {
    s.resource['Elerium'].max = getEleriumContainCapBonus(s);
  }

  let titaniumMax = 50;
  if ((s.tech['storage'] ?? 0) >= 4) {
    titaniumMax += sheds * spatialStorage((SHED_BASE_VALUES['Titanium'] ?? 0) * storageMult);
  }
  titaniumMax += getStorageBonus(s, 'Titanium');
  s.resource['Titanium'].max = titaniumMax;
  if ((s.tech['high_tech'] ?? 0) >= 3) {
    s.resource['Titanium'].display = true;
  }
  if ((s.tech['uranium'] ?? 0) >= 1) {
    s.resource['Uranium'].display = true;
  }

  // 原版 main.js 的资源容量表会在每次循环从固定基线重建。这里覆盖 repository
  // 涉及、但此前仍依赖 -1/静态占位的高级资源，避免重复 derived 调用累加。
  s.resource['Crystal'].max = 10
    + (s.resource['Crystal'].display ? sheds * spatialStorage((SHED_BASE_VALUES['Crystal'] ?? 0) * storageMult) : 0)
    + getStorageBonus(s, 'Crystal');
  s.resource['Alloy'].max = 50 + getStorageBonus(s, 'Alloy');
  s.resource['Polymer'].max = 50 + getStorageBonus(s, 'Polymer');
  s.resource['Chrysotile'].max = 200
    + (s.resource['Chrysotile'].display ? sheds * spatialStorage((SHED_BASE_VALUES['Chrysotile'] ?? 0) * storageMult) : 0)
    + getStorageBonus(s, 'Chrysotile');
  s.resource['Nano_Tube'].max = 0;
  s.resource['Neutronium'].max = getSpaceCount('outpost') * spatialStorage(500)
    + getInterstellarCount('cargo_yard') * spatialStorage(200);
  s.resource['Adamantite'].max = getStorageBonus(s, 'Adamantite');
  s.resource['Unobtainium'].max = 0;
  const titanSpaceport = s.space['titan_spaceport'] as { count?: number; on?: number } | undefined;
  const activeTitanSpaceports = s.city.power
    ? s.city.power.activeConsumers?.['titan_spaceport'] ?? 0
    : titanSpaceport?.on ?? titanSpaceport?.count ?? 0;
  s.resource['Water'].max = activeTitanSpaceports * spatialStorage(250);

  // 对标 legacy gatewayStorage()/gateway_depot：网关仓库是 repository 前的重要高级容量来源。
  const gatewayDepots = s.galaxy['gateway_depot']?.count ?? 0;
  let gatewayStorageMultiplier = 1;
  if (s.race['pack_rat']) gatewayStorageMultiplier *= 1.05;
  gatewayStorageMultiplier *= 1 + getAchievementLevel(s, 'blackhole') * 0.05;
  if ((s.tech['world_control'] ?? 0) >= 1) gatewayStorageMultiplier *= 2;
  const gatewayStorageValues: Record<string, number> = {
    Uranium: 3_000,
    Nano_Tube: 250_000,
    Neutronium: 9_001,
  };
  for (const [resourceId, baseValue] of Object.entries(gatewayStorageValues)) {
    if (s.resource[resourceId]?.display && gatewayDepots > 0) {
      s.resource[resourceId].max += gatewayDepots * spatialStorage(baseValue * gatewayStorageMultiplier);
    }
  }

  // garage 资源加成在 display 解锁同步后统一写入，见下方。
  const garageCount = getGarageCount(s);

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
  // 对标 legacy main.js L9315-9331：沃登克里夫贡献的 caps['Knowledge'] 在加入总和前会被
  // satellite 倍率整体缩放；必须先算 wardenclyffe 小计，再乘 satellite 修饰，最后并入 knowledgeMax。
  let wardenclyffeKnowledge = wardenclyffes * wardenclyffeBase + wardenclyffeOn * wardenclyffePoweredBonus;
  wardenclyffeKnowledge *= getSatelliteWardenclyffeMultiplier(s);
  knowledgeMax += wardenclyffeKnowledge;
  // 对标 legacy main.js L9363-9370：satellite 直接向 caps['Knowledge'] 贡献 750/座（非 cataclysm/orbit_decayed 情形）
  knowledgeMax += getSatelliteKnowledgeCapBonus(s);
  s.resource['Knowledge'].max = knowledgeMax;

  let moneyMax = 1000;
  const banks = getStructCount('bank');
  const casinos = getStructCount('casino');
  moneyMax += banks * spatialStorage(getBankVault(s));
  moneyMax += casinos * spatialStorage(getCasinoVault(s));
  const exchange = s.interstellar['exchange'] as
    | { count?: number; support_on?: number }
    | undefined;
  const activeExchanges = Math.min(exchange?.count ?? 0, exchange?.support_on ?? 0);
  moneyMax += spatialStorage(getInterstellarExchangeVault(s, activeExchanges));
  if (s.tech['isolation'] && supportedTauColonies > 0) {
    moneyMax += supportedTauColonies * spatialStorage(getBankVault(s) * 25);
  }
  s.resource['Money'].max = moneyMax;

  setJobMax('farmer', -1);
  setJobMax('lumberjack', -1);
  setJobMax('quarry_worker', -1);
  setJobMax('miner', getStructCount('mine'));
  setJobMax('coal_miner', getStructCount('coal_mine'));
  setJobMax('teamster', -1);
  setJobMax(
    'cement_worker',
    getStructCount('cement_plant') * 2
      + getTaucetiFactoryCementWorkerCapacity(s, tauSupport.supportOn),
  );
  setJobMax('banker', banks);
  setJobMax('professor', universities + getTaucetiAlienOutpostProfessorCapacity(s));
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
  if ((s.tech['nano'] ?? 0) >= 1) {
    s.resource['Nano_Tube'].display = true;
  }
  if ((s.tech['stanene'] ?? 0) >= 1) {
    s.resource['Stanene'].display = true;
  }
  if ((s.tech['aerogel'] ?? 0) >= 1) {
    s.resource['Aerogel'].display = true;
  }
  if ((s.tech['nanoweave'] ?? 0) >= 1) {
    s.resource['Nanoweave'].display = true;
  }
  if ((s.tech['scarletite'] ?? 0) >= 1) {
    s.resource['Scarletite'].display = true;
  }
  if ((s.tech['quantium'] ?? 0) >= 1) {
    s.resource['Quantium'].display = true;
  }
  if (s.tech['isolation'] || (s.tauceti['womling_mine']?.count ?? 0) > 0) {
    s.resource['Unobtainium'].display = true;
  }
  const tauHomeOpen = (s.tech['tau_home'] ?? 0) >= 2;
  const advancedTauMining = (s.tech['tauceti'] ?? 0) >= 4;
  if (s.resource['Materials']) {
    s.resource['Materials'].max = advancedTauMining ? 0 : supportedMiningPits * 1_000_000;
    s.resource['Materials'].display = tauHomeOpen && !advancedTauMining;
  }
  if (tauHomeOpen && advancedTauMining && (s.tauceti['mining_pit']?.count ?? 0) > 0) {
    for (const resource of ['Bolognium', 'Stone', 'Adamantite']) s.resource[resource].display = true;
    if (s.race['smoldering']) s.resource['Chrysotile'].display = true;
    if (s.tech['isolation']) {
      s.resource['Copper'].display = true;
      s.resource['Coal'].display = true;
      if (s.race['lone_survivor']) {
        s.resource['Iron'].display = true;
        s.resource['Aluminium'].display = true;
      }
    }
  }
  if ((s.space['crashed_ship'] as { count?: number } | undefined)?.count === 100) {
    s.resource['Cipher'].display = true;
  }
  if (getInterstellarCount('mining_droid') > 0) {
    s.resource['Adamantite'].display = true;
  }

  // 对标 legacy main.js garage/repository 分支：只有已显示资源才获得对应容量。
  for (const resourceId of Object.keys(s.resource)) {
    const garageBonus = getGarageStorageBonus(s, resourceId);
    if (garageBonus > 0) s.resource[resourceId].max += garageBonus;
  }
  for (const resourceId of TRUEPATH_STOREHOUSE_RESOURCES) {
    const storehouseBonus = getTruepathStorehouseStorageBonus(s, resourceId);
    if (storehouseBonus > 0) s.resource[resourceId].max += storehouseBonus;
  }
  for (const resourceId of getTaucetiRepositoryResources(s)) {
    const repositoryBonus = getTaucetiRepositoryStorageBonus(s, resourceId);
    if (repositoryBonus > 0) s.resource[resourceId].max += repositoryBonus;
  }

  const foundries = getStructCount('foundry');
  setJobMax(
    'craftsman',
    foundries + getTaucetiFactoryCraftsmanCapacity(s, tauSupport.supportOn),
  );
  setJobMax('pit_miner', getPitMinerCapacity(s, s.city.power?.activeConsumers ?? {}));
  const pitMinerJob = s.civic['pit_miner'] as { display?: boolean } | undefined;
  if (pitMinerJob) pitMinerJob.display = tauHomeOpen;
  const teamsterJob = s.civic['teamster'] as { stress?: number } | undefined;
  if (teamsterJob) teamsterJob.stress = (s.tech['teamster'] ?? 0) >= 1 ? 6 : 4;

  const amphitheatres = getStructCount('amphitheatre');
  const casinoCount = getStructCount('casino');
  const joyless = Object.prototype.hasOwnProperty.call(s.race, 'joyless');
  setJobMax('entertainer', joyless ? 0 : amphitheatres + casinoCount);
  const entertainerJob = s.civic['entertainer'] as { display?: boolean } | undefined;
  if (joyless && entertainerJob) entertainerJob.display = false;

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
    'farmer', 'miner', 'coal_miner', 'cement_worker', 'banker',
    'professor', 'scientist', 'craftsman', 'entertainer', 'priest', 'pit_miner',
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
  const crateCapacity = getStorageYardCrateCapacity(s);
  const containerCapacity = getWarehouseContainerCapacity(s);
  const wharfCapacity = getWharfStorageCapacity(s);
  const cargoYards = getInterstellarCount('cargo_yard');
  const gatewayDepotContainerCapacity = gatewayDepots * ((s.tech['world_control'] ?? 0) >= 1 ? 150 : 100);
  const repositoryContainerCapacity = getTaucetiRepositoryContainerCapacityBonus(s);
  if (s.resource['Crates']) {
    const tauStorage = supportedTauColonies * (s.tech['isolation'] ? 900 : 250);
    s.resource['Crates'].max = Math.max(
      0,
      storageYards * crateCapacity
        + wharves * wharfCapacity
        + cargoYards * 50
        + gatewayDepotContainerCapacity
        + tauStorage
        + repositoryContainerCapacity
        - getTotalAssignedCrates(s),
    );
    if (s.resource['Crates'].amount > s.resource['Crates'].max) {
      s.resource['Crates'].amount = s.resource['Crates'].max;
    }
  }
  if (s.resource['Containers']) {
    // 对标 legacy/src/space.js L924-934：garage 每座 +20 集装箱（baseline containers 值）。
    const garageContainers = garageCount * GARAGE_CONTAINERS_PER_BUILDING;
    const tauStorage = supportedTauColonies * (s.tech['isolation'] ? 900 : 250);
    s.resource['Containers'].max = Math.max(
      0,
      warehouses * containerCapacity
        + wharves * wharfCapacity
        + garageContainers
        + cargoYards * 50
        + gatewayDepotContainerCapacity
        + tauStorage
        + repositoryContainerCapacity
        - getTotalAssignedContainers(s),
    );
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
        count: 0, on: 0, Plywood: 0, Brick: 0, Wrought_Iron: 0, Sheet_Metal: 0, Mythril: 0,
      };
    } else if ((s.city['foundry'] as { Sheet_Metal?: number }).Sheet_Metal === undefined) {
      (s.city['foundry'] as { Sheet_Metal?: number }).Sheet_Metal = 0;
    }
    if ((s.city['foundry'] as { Mythril?: number }).Mythril === undefined) {
      (s.city['foundry'] as { Mythril?: number }).Mythril = 0;
    }
  }

  if (getSpaceCount('living_quarters') > 0 && s.civic['colonist']) {
    (s.civic['colonist'] as { display?: boolean }).display = true;
  }

  if ((s.tech['trade'] ?? 0) >= 1) {
    s.settings.showMarket = true;
    const maxRoutes = getMaxTradeRoutes(s);
    if (!s.city.trade_routes) {
      s.city.trade_routes = [];
    }

    const routes: TradeRoute[] = s.city.trade_routes;

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

  // 对标 legacy main.js L8730-8732：space_barracks 每座 on 贡献额外驻军上限。
  const spaceBarracksOn = (s.space['space_barracks'] as { on?: number } | undefined)?.on ?? 0;
  if (spaceBarracksOn > 0) {
    const soldiersPerBarracks = (s.tech['marines'] ?? 0) >= 2 ? 4 : 2;
    s.civic.garrison.max += spaceBarracksOn * soldiersPerBarracks;
  }

  // 对标 legacy main.js L8885-8887 / truepath.js fob.soldiers()。
  const activeFob = s.city.power?.activeConsumers?.['fob'] ?? 0;
  if (activeFob > 0) {
    const rankValue = s.race['high_pop'];
    const highPopRank = typeof rankValue === 'number' && rankValue > 0 ? rankValue : rankValue ? 1 : 0;
    const baseFobSoldiers = s.race['grenadier'] ? 6 : 10;
    const scaledFobSoldiers = highPopRank > 0
      ? baseFobSoldiers * getTraitVar('high_pop', 0, highPopRank)
      : baseFobSoldiers;
    s.civic.garrison.max += activeFob * scaledFobSoldiers;
  }

  // Truepath 舰船离港后持续占用军方船员，抵达 Tau 后仍不释放。
  s.civic.garrison.crew = getTruepathFleetCrew(s);

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

    let unlocked = !(joyless && job.id === 'entertainer');
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

  // tp_depot: +5 贸易路线 / rank（在 trade.ts getMaxTradeRoutes 中应用）— 此处仅启用 settings
  // railway 路线按当前挑战分支与装运站/GPS 数量计算 — 同上
  // 这两项在 trade 模块查询时实时读取 arpa.rank，无需 derived-state 修改

  // roid_eject: 累积质量影响 Dark Energy 产出（小行星弹射器，需要 blackhole 阶段）
  // 实际产出在 stellar_engine / interstellar 中处理（接入点已存在）

  // ============================================================
  // Ancient Pillar 跨种族加成
  // ============================================================

  (s.race as Record<string, unknown>)['_pillar_bonus'] = getPillarProductionMultiplier(s);

  // ============================================================
  // 自动 display：基于科技/建筑解锁
  // ============================================================
  if ((s.tech['magic'] ?? 0) >= 1 && s.resource['Mana']) {
    s.resource['Mana'].display = true;
    if (s.resource['Mana'].max === 0) s.resource['Mana'].max = 100;  // 解锁后基础 100
  }
  if ((s.tech['magic'] ?? 0) >= 1 && s.resource['Crystal']) {
    s.resource['Crystal'].display = true;
  }
  if ((s.tech['portal'] ?? 0) >= 2 && s.resource['Soul_Gem']) {
    s.resource['Soul_Gem'].display = true;
    s.resource['Soul_Gem'].max = -1;  // 无上限
  }
  if ((s.tech['hell_pit'] ?? 0) >= 5 && s.resource['Asphodel_Powder']) {
    s.resource['Asphodel_Powder'].display = true;
    s.resource['Asphodel_Powder'].max = 10000;
  }
  if ((s.tech['hell_gate'] ?? 0) >= 4 && s.resource['Infernite']) {
    s.resource['Infernite'].display = true;
    s.resource['Infernite'].max = 100000;
  }
  if ((s.tech['edenic'] ?? 0) >= 1 && s.resource['Ectoplasm']) {
    s.resource['Ectoplasm'].display = true;
    s.resource['Ectoplasm'].max = 100000;
  }
}

export function applyDerivedState(state: GameState): GameState {
  const next = JSON.parse(JSON.stringify(state)) as GameState;
  applyDerivedStateInPlace(next);
  return next;
}

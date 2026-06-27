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
import { getBankVault, getCasinoVault } from './commerce';
import { getAchievementLevel } from './achievements';
import { hasPlanetTrait, magneticVars, permafrostVars } from './planet-traits';
import {
  getSatelliteKnowledgeCapBonus,
  getSatelliteWardenclyffeMultiplier,
  getPropellantDepotOilCapBonus,
  getPropellantDepotHeliumCapBonus,
  getMoonBaseIridiumCapBonus,
  getHeliumMineHeliumCapBonus,
  getGarageCount,
  GARAGE_STORAGE_PER_BUILDING,
  GARAGE_CONTAINERS_PER_BUILDING,
  getGasStorageOilCapBonus,
  getGasStorageHeliumCapBonus,
  getGasStorageUraniumCapBonus,
  getEleriumContainCapBonus,
} from './space';

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
    const oilDepotHeliumBonus = s.resource['Helium_3'].display ? oilDepots * 400 : 0;
    s.resource['Helium_3'].max = oilDepotHeliumBonus + getPropellantDepotHeliumCapBonus(s) + heliumMineBonus;
    // 建成首座 helium_mine 后解锁 Helium_3（legacy space.js L392）
    if (heliumMineBonus > 0) {
      s.resource['Helium_3'].display = true;
    }
  }

  // 对标 legacy actions.js L3118-3135：
  //   Uranium.max = baseline 250 + oil_depot * 250（需 uranium >= 2）
  if (s.resource['Uranium']) {
    s.resource['Uranium'].max = 250 + ((s.tech['uranium'] ?? 0) >= 2 ? oilDepots * 250 : 0);
  }

  // 对标 legacy space.js L262：moon_base 每座 Iridium.max +500（baseline 0）
  if (s.resource['Iridium']) {
    const iridiumBonus = getMoonBaseIridiumCapBonus(s);
    s.resource['Iridium'].max = iridiumBonus;
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
    s.resource['Elerium'].max += getEleriumContainCapBonus(s);
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

  // 对标 legacy/src/space.js L874-943 garage effect（baseline：non-cataclysm，multiplier=1）：
  //   Copper +6500, Iron +5500, Cement +6000, Steel +4500, Titanium +3500 per garage
  //   Containers +20/座（在下方 Containers max 一段合并）。
  //   Alloy / Nano_Tube / Neutronium / Infernite 待对应管理/资源接入后再补。
  const garageCount = getGarageCount(s);
  if (garageCount > 0) {
    for (const [resId, perBuilding] of Object.entries(GARAGE_STORAGE_PER_BUILDING)) {
      const res = s.resource[resId];
      if (!res) continue;
      res.max += garageCount * perBuilding;
    }
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
  moneyMax += banks * getBankVault(s);
  moneyMax += casinos * getCasinoVault(s);
  s.resource['Money'].max = moneyMax;

  setJobMax('farmer', -1);
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
  if ((s.tech['nano'] ?? 0) >= 1) {
    s.resource['Nano_Tube'].display = true;
  }
  if ((s.tech['stanene'] ?? 0) >= 1) {
    s.resource['Stanene'].display = true;
  }
  if (getInterstellarCount('mining_droid') > 0) {
    s.resource['Adamantite'].display = true;
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
    'farmer', 'miner', 'coal_miner', 'cement_worker', 'banker',
    'professor', 'scientist', 'craftsman', 'entertainer', 'priest',
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
  if (s.resource['Crates']) {
    s.resource['Crates'].max = Math.max(0, storageYards * crateCapacity + wharves * wharfCapacity - getTotalAssignedCrates(s));
    if (s.resource['Crates'].amount > s.resource['Crates'].max) {
      s.resource['Crates'].amount = s.resource['Crates'].max;
    }
  }
  if (s.resource['Containers']) {
    // 对标 legacy/src/space.js L924-934：garage 每座 +20 集装箱（baseline containers 值）。
    const garageContainers = garageCount * GARAGE_CONTAINERS_PER_BUILDING;
    s.resource['Containers'].max = Math.max(
      0,
      warehouses * containerCapacity + wharves * wharfCapacity + garageContainers - getTotalAssignedContainers(s),
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

  // ============================================================
  // ARPA 完成效果（持续加成）
  // ============================================================

  const arpa = s.arpa as Record<string, { rank?: number } | unknown> | undefined;

  // stock_exchange: 银行容量 +10% / rank
  if (arpa) {
    const seRank = ((arpa['stock_exchange'] as { rank?: number } | undefined)?.rank) ?? 0;
    if (seRank > 0 && s.resource['Money']) {
      s.resource['Money'].max = Math.floor(s.resource['Money'].max * (1 + seRank * 0.1));
    }
  }

  // tp_depot: +5 贸易路线 / rank（在 trade.ts getMaxTradeRoutes 中应用）— 此处仅启用 settings
  // railway: +2 贸易路线 / rank — 同上
  // 这两项在 trade 模块查询时实时读取 arpa.rank，无需 derived-state 修改

  // roid_eject: 累积质量影响 Dark Energy 产出（小行星弹射器，需要 blackhole 阶段）
  // 实际产出在 stellar_engine / interstellar 中处理（接入点已存在）

  // ============================================================
  // Ancient Pillar 调谐加成（Harmony 调谐过的柱子持续提供全球加成）
  // ============================================================

  const portal = s.portal as Record<string, Record<string, number>> | undefined;
  const tunedPillars = portal?.['ancient_pillars']?.['tuned'] ?? 0;
  if (tunedPillars > 0) {
    // 每柱 +5% 全球产出，存在 race._pillar_bonus 供 tick.ts 读取
    (s.race as Record<string, unknown>)['_pillar_bonus'] = 1 + 0.05 * tunedPillars;
  } else {
    (s.race as Record<string, unknown>)['_pillar_bonus'] = 1;
  }

  // ============================================================
  // 自动 display：基于科技/建筑解锁
  // ============================================================
  if ((s.tech['magic'] ?? 0) >= 1 && s.resource['Mana']) {
    s.resource['Mana'].display = true;
    if (s.resource['Mana'].max === 0) s.resource['Mana'].max = 100;  // 解锁后基础 100
  }
  if ((s.tech['magic'] ?? 0) >= 1 && s.resource['Crystal']) {
    s.resource['Crystal'].display = true;
    if (s.resource['Crystal'].max === 0) s.resource['Crystal'].max = 500;
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

/**
 * @evozen/game-core
 * 纯逻辑模块，不含任何 DOM / UI 依赖
 */

export { createNewGame, defaultSettings } from './state';
export { seededRandom, mathRand } from './random';
export {
  getBuildCost,
  canBuildStructure,
  buildStructure,
  enqueueStructure,
  dequeueStructure,
  isTechAvailable,
  getResearchCost,
  canResearchTech,
  researchTech,
  assignWorker,
  removeWorker,
  setTaxRate,
  assignSmelter,
  removeSmelter,
} from './actions';
export { RESOURCE_VALUES, TRADE_RATIOS, CRAFT_COSTS, type CraftRecipe } from './resources';
export { BASE_JOBS, type JobDefinition } from './jobs';
export { BASIC_TECHS, type TechDefinition } from './tech';
export { BASIC_STRUCTURES, type StructureDefinition, type CostFunction } from './structures';
export {
  SPECIES_TRAITS,
  SPECIES_TRAIT_DESCRIPTORS,
  assignSpeciesTraits,
  getSpeciesTraitDescriptors,
  getProfessorTraitBonus,
  getLibraryKnowledgeCapMultiplier,
  getTradeBuyPriceMultiplier,
  getTradeSellPriceMultiplier,
  getTaxIncomeTraitMultiplier,
  getCraftingSpeedMultiplier,
  getScienceKnowledgeCostMultiplier,
  getModifiedTechCosts,
  getTrainingSpeedDivisor,
  getBruteTrainingBonus,
  getMercCostMultiplier,
  getHungerMultiplier,
  type SupportedSpeciesId,
  type SpeciesTraitId,
  type SpeciesTraitDescriptor,
} from './traits';
export { gameTick, factoryTick } from './tick';
export { saveGame, loadGame, exportSave, importSave } from './save';
export * from './commerce';
export * from './espionage';
export {
  manualCraft,
  craftingTick,
  assignCraftsman,
  removeCraftsman,
  CRAFTABLE_IDS,
  type CraftableId,
  type FoundryState,
} from './crafting';
export {
  buyResource,
  sellResource,
  getBuyPrice,
  getSellPrice,
  getManualTradeLimit,
  tradeTick,
  getMaxTradeRoutes,
  getTradeRouteQtyLimit,
  setTradeRoute,
  TRADABLE_RESOURCES,
  type TradeRoute,
  type TradableResourceId,
} from './trade';
export {
  GOVERNMENT_DEFS,
  changeGovernment,
  getGovernmentChangeCooldown,
  getTaxMultiplier,
  getProductionMultiplier,
  getMaxTaxRate,
  getTempleMultiplier,
  getKnowledgeMultiplier,
  getBankerImpactMultiplier,
  getCasinoIncomeMultiplier,
  getTourismIncomeMultiplier,
  getFactoryOutputMultiplier,
  type GovernmentType,
  type GovernmentDef,
} from './government';
export {
  getQueueMax,
  canEnqueue,
  isQueueUnlocked,
  toggleQueueMode
} from './queue';
export {
  buildCrate,
  buildContainer,
  assignCrate,
  unassignCrate,
  assignContainer,
  unassignContainer,
  getTotalAssignedCrates,
  getTotalAssignedContainers,
  getStorageBonus,
  getStorageMultiplier,
  SHED_BASE_VALUES,
  BASE_CRATE_VALUE as CRATE_VALUE,
  CONTAINER_VALUE,
  getCrateValue,
  getContainerValue,
  CRATE_COST_PLYWOOD,
  CONTAINER_COST_STEEL,
  STORABLE_RESOURCES,
  type StorableResourceId,
} from './storage';
export {
  calculateMorale,
  randomizeWeather,
  type MoraleResult,
} from './morale';
export {
  powerTick,
  isPoweredBuilding,
  type PowerTickResult,
} from './power';
export {
  weaponTechModifier,
  armyRating,
  armorCalc,
  tickTraining,
  tickHealing,
  mercCost,
  hireMerc,
  warCampaign,
  garrisonSize,
  TACTIC_NAMES,
  type WarResult,
} from './military';
export {
  tickEvents,
  EVENTS,
  type EventDefinition,
} from './events';
export {
  applyDerivedState,
  applyDerivedStateInPlace,
} from './derived-state';
export {
  applySimulationDerivedState,
  applySimulationDerivedStateInPlace,
  handlePopulationGrowth,
  runSimulationTick,
  simulateTicks,
  createDeterministicRandom,
  type SimulationTickOptions,
  type SimulationRunResult,
} from './simulation';
export {
  PLANET_TRAITS,
  hasPlanetTrait,
  getPlanetTrait,
  getMinerPlanetMultiplier,
  getGlobalPlanetMultiplier,
  getFarmPlanetMultiplier,
  type PlanetTraitDef,
} from './planet-traits';
export {
  EVO_UPGRADES,
  EVO_STEPS,
  EVO_RACES,
  evolutionTick,
  purchaseEvoUpgrade,
  advanceEvoStep,
  evolveSentience,
  getAvailableUpgrades,
  getAvailableSteps,
  getAvailableRaces,
  getUpgradeCount,
  getUpgradeCost,
  type EvoUpgrade,
  type EvoStep,
  type EvoRace,
} from './evolution';
export {
  ARPA_PROJECTS,
  MONUMENT_NAMES,
  arpaCost,
  arpaTick,
  isArpaAvailable,
  startArpaProject,
  stopArpaProject,
  setMonumentType,
  getArpaProjectState,
  getMonumentType,
  getAvailableArpaProjects,
  getMonumentMoraleBonus,
  type ArpaProjectDef,
  type ArpaProjectState,
  type ArpaState,
  type MonumentType,
} from './arpa';

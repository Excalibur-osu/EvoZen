/**
 * @evozen/game-core
 * 纯逻辑模块，不含任何 DOM / UI 依赖
 */

export { createNewGame, defaultSettings } from './state';
export { seededRandom, mathRand } from './random';
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
  type SupportedSpeciesId,
  type SpeciesTraitId,
  type SpeciesTraitDescriptor,
} from './traits';
export { gameTick } from './tick';
export { saveGame, loadGame, exportSave, importSave } from './save';
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
  getTaxMultiplier,
  getProductionMultiplier,
  getMaxTaxRate,
  getTempleMultiplier,
  getKnowledgeMultiplier,
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

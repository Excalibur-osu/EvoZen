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
  tradeTick,
  getMaxTradeRoutes,
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
  type GovernmentType,
  type GovernmentDef,
} from './government';

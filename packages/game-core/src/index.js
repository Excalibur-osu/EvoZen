/**
 * @evozen/game-core
 * 纯逻辑模块，不含任何 DOM / UI 依赖
 */
export { createNewGame, defaultSettings } from './state';
export { seededRandom, mathRand } from './random';
export { RESOURCE_VALUES, TRADE_RATIOS, CRAFT_COSTS } from './resources';
export { BASE_JOBS } from './jobs';
export { BASIC_TECHS } from './tech';
export { BASIC_STRUCTURES } from './structures';
export { gameTick } from './tick';
export { saveGame, loadGame, exportSave, importSave } from './save';

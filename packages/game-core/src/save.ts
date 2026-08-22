/**
 * 存档系统
 * 本地存档 / 读档 / 导入 / 导出 + 字段迁移
 */

import type { GameState, GrapheneFactoryState, SaveData } from '@evozen/shared-types';
import { createNewGame } from './state';
import { SAVE_VERSION } from './version';
import { initializeTruepathShipyard } from './truepath-ships';
import { checkTaucetiJumpGateCompletion, TAUCETI_JUMP_GATE_SEGMENTS } from './tauceti-progression';

const SAVE_KEY = 'evozen_save';
const BACKUP_KEY = 'evozen_backup';

function createSaveData(state: GameState): SaveData {
  state.version = SAVE_VERSION;
  return {
    gameState: state,
    timestamp: Date.now(),
    version: SAVE_VERSION,
  };
}

/**
 * 存档字段迁移：旧存档读取时补全 Phase 2/3 新增的字段
 * 包括：portal/eden/tauceti/blood/genes 顶级容器，以及新增资源。
 */
function migrateState(state: GameState): GameState {
  const fresh = createNewGame();

  // 1. 顶级容器（旧版没有这些）
  if (!state.portal) state.portal = {};
  if (!state.galaxy) state.galaxy = {};
  if (!state.eden) state.eden = {};
  if (!state.tauceti) state.tauceti = {};
  if (!state.pillars) state.pillars = {};
  if (!state.blood) state.blood = {};
  if (!state.genes) state.genes = {};

  // 2. 资源补全（新增的 Mana / Soul_Gem / Demonic_Essence / Asphodel_Powder 等）
  for (const [resId, resState] of Object.entries(fresh.resource)) {
    if (!state.resource[resId]) {
      state.resource[resId] = resState;
    }
  }
  // Nano Tube / Adamantite were previously marked max=-1 as unlimited placeholders.
  // They are finite raw resources in legacy and are rebuilt from real storage sources.
  for (const resourceId of ['Nano_Tube', 'Adamantite']) {
    if (state.resource[resourceId] && state.resource[resourceId].max < 0) {
      state.resource[resourceId].max = fresh.resource[resourceId].max;
    }
  }

  // 3. settings 字段补全
  for (const [key, val] of Object.entries(fresh.settings)) {
    if (state.settings[key] === undefined) {
      (state.settings as Record<string, unknown>)[key] = val;
    }
  }

  // 4. prestige 声望资源补全
  const prestige = (state.prestige ??= { Plasmid: { count: 0 } }) as Record<string, { count?: number }>;
  for (const [key, val] of Object.entries(fresh.prestige) as [string, { count?: number }][]) {
    if (!prestige[key]) {
      prestige[key] = { count: val.count ?? 0 };
    } else if (prestige[key].count === undefined) {
      prestige[key].count = val.count ?? 0;
    }
  }

  // 5. stats.achieve / feat 容器
  const stats = state.stats as Record<string, unknown>;
  if (!stats['achieve']) stats['achieve'] = {};
  if (!stats['feat']) stats['feat'] = {};
  if (!stats['synth']) stats['synth'] = {};

  // 6. 旧 Truepath 存档只记录 count；为已实现产出的建筑补全运行数与石墨烯产线。
  const truepathProductionBuildings = [
    'electrolysis',
    'titan_quarters',
    'titan_mine',
    'g_factory',
    'water_freighter',
    'titan_spaceport',
    'zero_g_lab',
    'orichalcum_mine',
    'elerium_mine',
    'uranium_mine',
    'neutronium_mine',
    'fob',
    'lander',
  ];
  for (const id of truepathProductionBuildings) {
    const building = state.space[id] as { count?: number; on?: number } | undefined;
    // 旧实现建造时只增加 count，且没有关闭/开启入口，因此 on=0 也是迁移目标。
    if (building && (building.on === undefined || (building.on === 0 && (building.count ?? 0) > 0))) {
      building.on = building.count ?? 0;
    }
  }
  if (state.space['crashed_ship']) {
    const wreck = state.space['crashed_ship'];
    wreck.count = Math.max(0, Math.min(100, wreck.count ?? 0));
    if (wreck.count >= 100 && state.resource['Cipher']) state.resource['Cipher'].display = true;
  }
  if (state.space['shipyard']) initializeTruepathShipyard(state);
  if ((state.tech['titan'] ?? 0) >= 5) {
    state.space['storehouse'] ??= { count: 0 };
    delete state.space['storehouse'].on;
  }
  const grapheneFactory = state.space['g_factory'] as Partial<GrapheneFactoryState> | undefined;
  if (grapheneFactory) {
    const hadAllocations = grapheneFactory.Lumber !== undefined
      || grapheneFactory.Coal !== undefined
      || grapheneFactory.Oil !== undefined;
    grapheneFactory.Lumber ??= 0;
    grapheneFactory.Coal ??= 0;
    grapheneFactory.Oil ??= 0;
    if (!hadAllocations && (grapheneFactory.on ?? 0) > 0) {
      if (state.race['kindling_kindred'] || state.race['smoldering']) {
        grapheneFactory.Oil = grapheneFactory.on;
      } else {
        grapheneFactory.Lumber = grapheneFactory.on;
      }
    }
  }

  // 7. vitreloy_plant 过去没有 powerCost，旧存档不会写入 on。
  const vitreloyPlant = state.galaxy['vitreloy_plant'];
  if (vitreloyPlant && (vitreloyPlant.on === undefined || (vitreloyPlant.on === 0 && vitreloyPlant.count > 0))) {
    vitreloyPlant.on = vitreloyPlant.count;
  }

  // 8. 高级工匠合成产线加入后，为旧 foundry 补零值分配槽。
  const foundry = state.city['foundry'] as Record<string, number> | undefined;
  if (foundry) {
    foundry.Aerogel ??= 0;
    foundry.Nanoweave ??= 0;
    foundry.Scarletite ??= 0;
    foundry.Quantium ??= 0;
  }

  // 9. 传送门用电建筑过去没有运行数入口；补全后才能参与电网与特殊合成产能。
  for (const id of ['guard_post', 'arcology', 'hell_forge', 'incinerator', 'twisted_lab']) {
    const building = state.portal[id];
    if (building && (building.on === undefined || (building.on === 0 && building.count > 0))) {
      building.on = building.count;
    }
  }

  // 10. 重力井运输工人加入基础岗位后，为旧存档补完整岗位状态。
  if (!state.civic['teamster']) {
    state.civic['teamster'] = fresh.civic['teamster'];
  }
  if (!state.civic['pit_miner']) {
    state.civic['pit_miner'] = fresh.civic['pit_miner'];
  }

  // 11. Tau Ceti 传染病实验室改用 legacy 正式 ID，并补齐已实现建筑的运行状态。
  const oldDiseaseLab = state.tauceti['tau_infectious_disease_lab'];
  if (oldDiseaseLab && !state.tauceti['infectious_disease_lab']) {
    state.tauceti['infectious_disease_lab'] = oldDiseaseLab;
  }
  for (const id of [
    'orbital_station',
    'colony',
    'mining_pit',
    'fusion_generator',
    'tau_farm',
    'tau_factory',
    'infectious_disease_lab',
    'orbital_platform',
    'overseer',
    'womling_village',
    'womling_farm',
    'womling_mine',
  ]) {
    const building = state.tauceti[id];
    if (building && (building.on === undefined || (building.on === 0 && building.count > 0))) {
      building.on = building.count;
    }
  }
  if ((state.tech['tau_home'] ?? 0) >= 1) {
    state.tauceti['colony'] ??= { count: 0, on: 0 };
    state.tauceti['mining_pit'] ??= { count: 0, on: 0 };
  }
  if ((state.tech['tau_home'] ?? 0) >= 4) {
    const outpost = state.tauceti['alien_outpost'] ??= { count: 1, on: 0 };
    outpost.count = Math.max(1, outpost.count);
    outpost.on ??= 0;
  }
  if ((state.tech['tau_home'] ?? 0) >= 5) {
    state.tauceti['repository'] ??= { count: 0 };
    delete state.tauceti['repository'].on;
  }
  if ((state.tech['tau_home'] ?? 0) >= 6) {
    state.tauceti['fusion_generator'] ??= { count: 0, on: 0 };
  }
  if ((state.tech['tau_home'] ?? 0) >= 7) {
    state.tauceti['tau_farm'] ??= { count: 0, on: 0 };
  }
  if ((state.tech['tau_home'] ?? 0) >= 8) {
    state.tauceti['tau_factory'] ??= { count: 0, on: 0 };
  }
  if (!state.race['lone_survivor'] && (state.tech['tauceti'] ?? 0) >= 3) {
    const completed = (state.tech['tauceti'] ?? 0) >= 4;
    const minimum = completed ? TAUCETI_JUMP_GATE_SEGMENTS : 0;
    const tauGate = state.tauceti['jump_gate'] ??= { count: minimum };
    const homeGate = state.space['jump_gate'] ??= { count: minimum };
    tauGate.count = Math.max(minimum, Math.min(TAUCETI_JUMP_GATE_SEGMENTS, tauGate.count));
    homeGate.count = Math.max(minimum, Math.min(TAUCETI_JUMP_GATE_SEGMENTS, homeGate.count));
    delete tauGate.on;
    delete homeGate.on;
    checkTaucetiJumpGateCompletion(state);
  }
  const diseaseLab = state.tauceti['infectious_disease_lab'] as
    | (typeof state.tauceti[string] & { cure?: number })
    | undefined;
  if (diseaseLab) diseaseLab.cure ??= 0;

  const hasWomlingRelation = Boolean(
    state.race['womling_friend'] || state.race['womling_god'] || state.race['womling_lord'],
  );
  if (hasWomlingRelation) {
    state.tauceti['overseer'] ??= {
      count: 0, on: 0, pop: 0, working: 0, injured: 0, morale: 0, loyal: 0, prod: 0,
    };
    state.tauceti['womling_village'] ??= { count: 1, on: 1 };
    state.tauceti['womling_farm'] ??= { count: 1, on: 1, farmers: 0 };
    state.tauceti['womling_mine'] ??= { count: 0, on: 0, miners: 0 };
  }
  const overseer = state.tauceti['overseer'];
  if (overseer) {
    overseer.pop ??= 0;
    overseer.working ??= 0;
    overseer.injured ??= 0;
    overseer.morale ??= 0;
    overseer.loyal ??= 0;
    overseer.prod ??= 0;
  }
  if (state.tauceti['womling_farm']) state.tauceti['womling_farm'].farmers ??= 0;
  if (state.tauceti['womling_mine']) state.tauceti['womling_mine'].miners ??= 0;

  // 所有迁移成功后，将旧存档标记为当前统一版本。
  state.version = SAVE_VERSION;

  return state;
}

/**
 * 将游戏状态保存到 localStorage
 */
export function saveGame(state: GameState): boolean {
  try {
    const data = createSaveData(state);
    const json = JSON.stringify(data);
    const compressed = btoa(encodeURIComponent(json));
    localStorage.setItem(SAVE_KEY, compressed);
    return true;
  } catch (e) {
    console.error('存档失败:', e);
    return false;
  }
}

/**
 * 从 localStorage 读取游戏状态
 */
export function loadGame(): GameState | null {
  try {
    const compressed = localStorage.getItem(SAVE_KEY);
    if (!compressed) return null;

    const json = decodeURIComponent(atob(compressed));
    const data: SaveData = JSON.parse(json);
    return migrateState(data.gameState);
  } catch (e) {
    console.error('读档失败:', e);
    return null;
  }
}

/**
 * 导出存档为字符串（用于复制粘贴）
 */
export function exportSave(state: GameState): string {
  const data = createSaveData(state);
  const json = JSON.stringify(data, null, 2);
  return json;
}

/**
 * 从字符串导入存档
 */
export function importSave(rawJson: string): GameState | null {
  try {
    const data: SaveData = JSON.parse(rawJson);

    if (!data.gameState || !data.version) {
      console.error('无效的存档数据');
      return null;
    }

    return migrateState(data.gameState);
  } catch (e) {
    console.error('导入存档失败:', e);
    return null;
  }
}

/**
 * 创建备份存档
 */
export function backupSave(state: GameState): boolean {
  try {
    const data = createSaveData(state);
    const json = JSON.stringify(data);
    const compressed = btoa(encodeURIComponent(json));
    localStorage.setItem(BACKUP_KEY, compressed);
    return true;
  } catch (e) {
    console.error('备份失败:', e);
    return false;
  }
}

/**
 * 读取备份存档
 */
export function loadBackup(): GameState | null {
  try {
    const compressed = localStorage.getItem(BACKUP_KEY);
    if (!compressed) return null;

    const json = decodeURIComponent(atob(compressed));
    const data: SaveData = JSON.parse(json);
    return migrateState(data.gameState);
  } catch (e) {
    console.error('读取备份失败:', e);
    return null;
  }
}

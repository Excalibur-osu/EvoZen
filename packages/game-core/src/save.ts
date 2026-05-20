/**
 * 存档系统
 * 本地存档 / 读档 / 导入 / 导出 + 字段迁移
 */

import type { GameState, SaveData } from '@evozen/shared-types';
import { createNewGame } from './state';

const SAVE_KEY = 'evozen_save';
const BACKUP_KEY = 'evozen_backup';

/**
 * 存档字段迁移：旧存档读取时补全 Phase 2/3 新增的字段
 * 包括：portal/eden/tauceti/blood/genes 顶级容器，以及新增资源。
 */
function migrateState(state: GameState): GameState {
  const fresh = createNewGame();

  // 1. 顶级容器（旧版没有这些）
  if (!state.portal) state.portal = {};
  if (!state.eden) state.eden = {};
  if (!state.tauceti) state.tauceti = {};
  if (!state.blood) state.blood = {};
  if (!state.genes) state.genes = {};

  // 2. 资源补全（新增的 Mana / Soul_Gem / Demonic_Essence / Asphodel_Powder 等）
  for (const [resId, resState] of Object.entries(fresh.resource)) {
    if (!state.resource[resId]) {
      state.resource[resId] = resState;
    }
  }

  // 3. settings 字段补全
  for (const [key, val] of Object.entries(fresh.settings)) {
    if (state.settings[key] === undefined) {
      (state.settings as Record<string, unknown>)[key] = val;
    }
  }

  // 4. stats.achieve / feat 容器
  const stats = state.stats as Record<string, unknown>;
  if (!stats['achieve']) stats['achieve'] = {};
  if (!stats['feat']) stats['feat'] = {};

  return state;
}

/**
 * 将游戏状态保存到 localStorage
 */
export function saveGame(state: GameState): boolean {
  try {
    const data: SaveData = {
      gameState: state,
      timestamp: Date.now(),
      version: state.version,
    };
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
  const data: SaveData = {
    gameState: state,
    timestamp: Date.now(),
    version: state.version,
  };
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
    const data: SaveData = {
      gameState: state,
      timestamp: Date.now(),
      version: state.version,
    };
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

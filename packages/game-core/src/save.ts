/**
 * 存档系统
 * 本地存档 / 读档 / 导入 / 导出
 */

import type { GameState, SaveData } from '@evozen/shared-types';

const SAVE_KEY = 'evozen_save';
const BACKUP_KEY = 'evozen_backup';

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
    return data.gameState;
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

    return data.gameState;
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
    return data.gameState;
  } catch (e) {
    console.error('读取备份失败:', e);
    return null;
  }
}

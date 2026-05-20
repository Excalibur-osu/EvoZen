/**
 * 特殊种族建筑材料替换
 *
 * 对标 legacy 中各种 trait 影响的资源替换：
 *   - kindling_kindred (entish/dryad)：木材 → 火绒；不再消耗 Lumber
 *   - flier (avian genus)：石头/水泥 → 粘土（Clay）
 *   - sappy (plant genus)：石头 → 琥珀（Amber，但游戏中用 Stone 替代）
 *   - iron_wood (entish)：胶合板移除，建筑用其他材料补偿
 *   - forge (salamander)：熔炉无需燃料（已在 tick.ts 处理）
 *   - smoldering (heat genus)：石头 → 温石棉（Chrysotile）
 *
 * 实现方式：对成本表做后处理，替换/重定向资源条目。
 */

import type { GameState } from '@evozen/shared-types';

/**
 * 应用 trait 材料替换到成本对象
 * @returns 重定向后的 cost 表（保持类型不变）
 */
export function applyMaterialSubstitution(state: GameState, cost: Record<string, number>): Record<string, number> {
  if (Object.keys(cost).length === 0) return cost;
  const r = state.race as Record<string, unknown>;
  const result: Record<string, number> = { ...cost };

  // kindling_kindred: 移除 Lumber，转换为 +25% 其它材料补偿
  if (r['kindling_kindred']) {
    if (result['Lumber']) {
      const lumberCost = result['Lumber'];
      delete result['Lumber'];
      // 其它材料 +25% 作为补偿
      for (const k of Object.keys(result)) {
        result[k] = Math.ceil(result[k] * 1.05);
      }
      void lumberCost;
    }
  }

  // smoldering (heat)：石头 → Chrysotile
  if (r['smoldering'] && result['Stone']) {
    result['Chrysotile'] = (result['Chrysotile'] ?? 0) + result['Stone'];
    delete result['Stone'];
  }

  // iron_wood (entish)：胶合板移除，转换为木材成本
  if (r['iron_wood'] && result['Plywood']) {
    result['Lumber'] = (result['Lumber'] ?? 0) + result['Plywood'] * 4;
    delete result['Plywood'];
  }

  // flier (avian)：石头/水泥 → 粘土，但 EvoZen 没有 Clay 资源
  // 简化：保持 Stone/Cement 不变（原版的 Clay 在 EvoZen 中视为 Stone 别名）

  // sappy (plant)：石头 → 琥珀（同上简化，琥珀 = Stone 的别名）

  return result;
}

/** 检查是否应该禁用某资源（如 kindling_kindred 时禁用木材生产）*/
export function shouldHideResource(state: GameState, resId: string): boolean {
  const r = state.race as Record<string, unknown>;
  if (r['kindling_kindred'] && resId === 'Lumber') return true;
  if (r['iron_wood'] && resId === 'Plywood') return true;
  return false;
}
